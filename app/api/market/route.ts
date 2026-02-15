import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/market - 获取市场行情数据
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'indices';

    if (type === 'indices') {
      // 获取主要指数数据
      const indexCodes = ['000001.SH', '399001.SZ', '399006.SZ'];
      const indexNames: Record<string, string> = {
        '000001.SH': '上证指数',
        '399001.SZ': '深证成指',
        '399006.SZ': '创业板指',
      };

      // 获取最新交易日期
      const latestQuote = await prisma.dailyQuote.findFirst({
        orderBy: { tradeDate: 'desc' },
        select: { tradeDate: true },
      });

      if (!latestQuote) {
        // 返回模拟数据
        return NextResponse.json([
          { code: '000001.SH', name: '上证指数', value: 3050.25, change: 15.3, changePct: 0.5 },
          { code: '399001.SZ', name: '深证成指', value: 9850.12, change: 45.8, changePct: 0.47 },
          { code: '399006.SZ', name: '创业板指', value: 1980.56, change: 12.4, changePct: 0.63 },
        ]);
      }

      // 从 Supabase 获取指数数据
      const { data: indices, error } = await supabaseAdmin
        .from('daily_quotes')
        .select('ts_code, close, change, pct_chg')
        .in('ts_code', indexCodes)
        .eq('trade_date', latestQuote.tradeDate.toISOString().split('T')[0]);

      if (error || !indices) {
        throw error;
      }

      const formattedIndices = indices.map((item: any) => ({
        code: item.ts_code,
        name: indexNames[item.ts_code] || item.ts_code,
        value: Number(item.close),
        change: Number(item.change),
        changePct: Number(item.pct_chg),
      }));

      return NextResponse.json(formattedIndices);
    }

    if (type === 'hot') {
      // 获取热门股票（涨幅最大的）
      const latestQuote = await prisma.dailyQuote.findFirst({
        orderBy: { tradeDate: 'desc' },
        select: { tradeDate: true },
      });

      if (!latestQuote) {
        return NextResponse.json([]);
      }

      const hotStocks = await prisma.dailyQuote.findMany({
        where: {
          tradeDate: latestQuote.tradeDate,
          pctChg: { gt: 5 },
        },
        orderBy: { pctChg: 'desc' },
        take: 10,
        include: {
          stock: {
            select: { name: true, industry: true },
          },
        },
      });

      return NextResponse.json(
        hotStocks.map((s) => ({
          tsCode: s.tsCode,
          name: s.stock?.name,
          close: Number(s.close),
          pctChg: Number(s.pctChg),
          industry: s.stock?.industry,
        }))
      );
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
