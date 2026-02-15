import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// 客户端组件用的 client
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 服务端用的 admin client (有更高权限)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// 类型定义
export type StockBasic = {
  ts_code: string;
  symbol: string;
  name: string;
  area?: string;
  industry?: string;
  market?: string;
  exchange?: string;
};

export type DailyQuote = {
  ts_code: string;
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  pre_close: number;
  change: number;
  pct_chg: number;
  vol: number;
  amount: number;
};

export type AgentAccount = {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  initial_capital: number;
  current_cash: number;
  total_value: number;
  total_return: number;
  status: string;
};

export type TradeRecord = {
  id: number;
  agent_id: string;
  trade_date: string;
  ts_code: string;
  name: string;
  trade_type: 'BUY' | 'SELL';
  volume: number;
  price: number;
  amount: number;
  realized_pnl?: number;
};
