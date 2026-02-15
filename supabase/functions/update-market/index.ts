// Supabase Edge Function: 每日市场数据更新
// 部署命令: supabase functions deploy update-market

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TushareResponse {
  code: number;
  msg: string;
  data: {
    fields: string[];
    items: any[][];
  };
}

// Tushare API 调用
async function callTushare(apiName: string, params: Record<string, any>, token: string): Promise<any[]> {
  const response = await fetch('https://api.tushare.pro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_name: apiName,
      token,
      params,
      fields: '',
    }),
  });

  const result: TushareResponse = await response.json();
  
  if (result.code !== 0) {
    throw new Error(`Tushare API error: ${result.msg}`);
  }

  const { fields, items } = result.data;
  return items.map((item) => {
    const obj: Record<string, any> = {};
    fields.forEach((field, index) => {
      obj[field] = item[index];
    });
    return obj;
  });
}

// 获取最新交易日
async function getLatestTradeDate(token: string): Promise<string> {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const result = await callTushare('trade_cal', {
    exchange: 'SSE',
    start_date: '20240101',
    end_date: today,
  }, token);
  
  const tradeDays = result.filter((d) => d.is_open === 1);
  return tradeDays[tradeDays.length - 1]?.cal_date || today;
}

// 更新日线行情
async function updateDailyQuotes(supabase: any, token: string, tradeDate: string) {
  console.log(`Fetching daily quotes for ${tradeDate}...`);
  
  const quotes = await callTushare('daily', {
    trade_date: tradeDate,
  }, token);

  console.log(`Fetched ${quotes.length} quotes`);

  // 批量插入
  const batchSize = 1000;
  for (let i = 0; i < quotes.length; i += batchSize) {
    const batch = quotes.slice(i, i + batchSize).map((q) => ({
      ts_code: q.ts_code,
      trade_date: `${q.trade_date.slice(0, 4)}-${q.trade_date.slice(4, 6)}-${q.trade_date.slice(6, 8)}`,
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      pre_close: q.pre_close,
      change: q.change,
      pct_chg: q.pct_chg,
      vol: q.vol,
      amount: q.amount,
    }));

    const { error } = await supabase
      .from('daily_quotes')
      .upsert(batch, { onConflict: 'ts_code,trade_date' });

    if (error) {
      console.error(`Error inserting batch ${i}:`, error);
    }
  }

  return quotes.length;
}

// 更新技术指标
async function updateTechnicalIndicators(supabase: any, token: string, tradeDate: string) {
  console.log(`Fetching technical indicators for ${tradeDate}...`);
  
  try {
    const indicators = await callTushare('daily_basic', {
      trade_date: tradeDate,
    }, token);

    console.log(`Fetched ${indicators.length} indicators`);

    // 这里简化处理，实际需要根据技术指标计算
    // 可以后续使用 talib 或其他库计算
    
    return indicators.length;
  } catch (error) {
    console.error('Error fetching technical indicators:', error);
    return 0;
  }
}

// 更新股票基础信息
async function updateStockBasic(supabase: any, token: string) {
  console.log('Fetching stock basic info...');
  
  const stocks = await callTushare('stock_basic', {
    exchange: '',
    list_status: 'L',
  }, token);

  console.log(`Fetched ${stocks.length} stocks`);

  const formatted = stocks.map((s) => ({
    ts_code: s.ts_code,
    symbol: s.symbol,
    name: s.name,
    area: s.area,
    industry: s.industry,
    fullname: s.fullname,
    enname: s.enname,
    cnspell: s.cnspell,
    market: s.market,
    exchange: s.exchange,
    curr_type: s.curr_type,
    list_status: s.list_status,
    list_date: s.list_date ? `${s.list_date.slice(0, 4)}-${s.list_date.slice(4, 6)}-${s.list_date.slice(6, 8)}` : null,
    delist_date: s.delist_date ? `${s.delist_date.slice(0, 4)}-${s.delist_date.slice(4, 6)}-${s.delist_date.slice(6, 8)}` : null,
    is_hs: s.is_hs,
    is_st: s.name.includes('ST'),
  }));

  const { error } = await supabase
    .from('stock_basic')
    .upsert(formatted, { onConflict: 'ts_code' });

  if (error) {
    console.error('Error upserting stocks:', error);
    throw error;
  }

  return stocks.length;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tushareToken = Deno.env.get('TUSHARE_TOKEN')!;

    if (!tushareToken) {
      throw new Error('TUSHARE_TOKEN not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 获取最新交易日
    const tradeDate = await getLatestTradeDate(tushareToken);
    console.log(`Latest trade date: ${tradeDate}`);

    // 执行更新
    const [stockCount, quoteCount] = await Promise.all([
      updateStockBasic(supabase, tushareToken),
      updateDailyQuotes(supabase, tushareToken, tradeDate),
    ]);

    // 记录更新日志
    await supabase.from('data_update_logs').insert({
      data_type: 'daily_update',
      trade_date: `${tradeDate.slice(0, 4)}-${tradeDate.slice(4, 6)}-${tradeDate.slice(6, 8)}`,
      record_count: quoteCount,
      status: 'success',
    });

    return new Response(
      JSON.stringify({
        success: true,
        tradeDate,
        stocks: stockCount,
        quotes: quoteCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
