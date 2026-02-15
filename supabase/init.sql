#!/bin/bash
# Supabase 数据库 Schema 初始化脚本
# 在 Supabase SQL Editor 中执行

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 股票基础信息表
CREATE TABLE IF NOT EXISTS stock_basic (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    area VARCHAR(50),
    industry VARCHAR(50),
    fullname VARCHAR(200),
    enname VARCHAR(200),
    cnspell VARCHAR(100),
    market VARCHAR(20),
    exchange VARCHAR(10),
    curr_type VARCHAR(10),
    list_status VARCHAR(10),
    list_date DATE,
    delist_date DATE,
    is_hs VARCHAR(10),
    is_st BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 日线行情表
CREATE TABLE IF NOT EXISTS daily_quotes (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    open DECIMAL(12,4),
    high DECIMAL(12,4),
    low DECIMAL(12,4),
    close DECIMAL(12,4),
    pre_close DECIMAL(12,4),
    change DECIMAL(12,4),
    pct_chg DECIMAL(8,4),
    vol BIGINT,
    amount DECIMAL(20,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ts_code, trade_date)
);

CREATE INDEX idx_daily_quotes_ts_code ON daily_quotes(ts_code);
CREATE INDEX idx_daily_quotes_trade_date ON daily_quotes(trade_date);

-- 3. 财务指标表
CREATE TABLE IF NOT EXISTS financial_indicators (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    ann_date DATE,
    end_date DATE NOT NULL,
    eps DECIMAL(12,4),
    dt_eps DECIMAL(12,4),
    total_revenue DECIMAL(20,4),
    revenue DECIMAL(20,4),
    total_profit DECIMAL(20,4),
    net_profit DECIMAL(20,4),
    total_hldr_eqy_exc_min_int DECIMAL(20,4),
    diluted_roe DECIMAL(8,4),
    diluted_roe_dt DECIMAL(8,4),
    grossprofit_margin DECIMAL(8,4),
    netprofit_margin DECIMAL(8,4),
    debt_to_assets DECIMAL(8,4),
    current_ratio DECIMAL(8,4),
    quick_ratio DECIMAL(8,4),
    inventory_turnover DECIMAL(8,4),
    ar_turnover DECIMAL(8,4),
    assets_turnover DECIMAL(8,4),
    roe DECIMAL(8,4),
    roe_waa DECIMAL(8,4),
    roe_dt DECIMAL(8,4),
    roe_avg DECIMAL(8,4),
    op_yoy DECIMAL(8,4),
    ebt_yoy DECIMAL(8,4),
    tr_yoy DECIMAL(8,4),
    or_yoy DECIMAL(8,4),
    equity_yoy DECIMAL(8,4),
    update_flag VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ts_code, end_date, update_flag)
);

CREATE INDEX idx_financial_ts_code ON financial_indicators(ts_code);
CREATE INDEX idx_financial_end_date ON financial_indicators(end_date);

-- 4. 技术指标表
CREATE TABLE IF NOT EXISTS technical_indicators (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    ma5 DECIMAL(12,4),
    ma10 DECIMAL(12,4),
    ma20 DECIMAL(12,4),
    ma30 DECIMAL(12,4),
    ma60 DECIMAL(12,4),
    ma120 DECIMAL(12,4),
    ma250 DECIMAL(12,4),
    rsi_6 DECIMAL(8,4),
    rsi_12 DECIMAL(8,4),
    rsi_14 DECIMAL(8,4),
    rsi_24 DECIMAL(8,4),
    macd_dif DECIMAL(12,4),
    macd_dea DECIMAL(12,4),
    macd_bar DECIMAL(12,4),
    bb_upper DECIMAL(12,4),
    bb_middle DECIMAL(12,4),
    bb_lower DECIMAL(12,4),
    kdj_k DECIMAL(8,4),
    kdj_d DECIMAL(8,4),
    kdj_j DECIMAL(8,4),
    vol_ma5 BIGINT,
    vol_ma10 BIGINT,
    vol_ma20 BIGINT,
    atr_14 DECIMAL(12,4),
    cci_14 DECIMAL(12,4),
    obv DECIMAL(20,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ts_code, trade_date)
);

CREATE INDEX idx_technical_ts_code ON technical_indicators(ts_code);
CREATE INDEX idx_technical_trade_date ON technical_indicators(trade_date);

-- 5. Agent 账户表
CREATE TABLE IF NOT EXISTS agent_accounts (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) UNIQUE NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    agent_type VARCHAR(50),
    description TEXT,
    config JSONB,
    system_prompt TEXT,
    initial_capital DECIMAL(15,2) DEFAULT 1000000,
    current_cash DECIMAL(15,2) DEFAULT 1000000,
    total_value DECIMAL(15,2) DEFAULT 1000000,
    total_return DECIMAL(8,4) DEFAULT 0,
    annual_return DECIMAL(8,4),
    sharpe_ratio DECIMAL(8,4),
    max_drawdown DECIMAL(8,4),
    volatility DECIMAL(8,4),
    win_rate DECIMAL(8,4),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Agent 持仓表
CREATE TABLE IF NOT EXISTS agent_positions (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    ts_code VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    volume INTEGER NOT NULL DEFAULT 0,
    available_volume INTEGER DEFAULT 0,
    avg_cost DECIMAL(12,4) DEFAULT 0,
    current_price DECIMAL(12,4) DEFAULT 0,
    market_value DECIMAL(15,2) DEFAULT 0,
    total_pnl DECIMAL(15,2) DEFAULT 0,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0,
    realized_pnl DECIMAL(15,2) DEFAULT 0,
    pnl_pct DECIMAL(8,4) DEFAULT 0,
    buy_count INTEGER DEFAULT 0,
    sell_count INTEGER DEFAULT 0,
    first_buy_date DATE,
    last_trade_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, ts_code)
);

CREATE INDEX idx_position_agent ON agent_positions(agent_id);
CREATE INDEX idx_position_stock ON agent_positions(ts_code);

-- 7. 交易记录表
CREATE TABLE IF NOT EXISTS trade_records (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    trade_date DATE NOT NULL,
    ts_code VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    trade_type VARCHAR(10) NOT NULL,
    volume INTEGER NOT NULL,
    price DECIMAL(12,4) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    commission DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    transfer_fee DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(15,2),
    realized_pnl DECIMAL(15,2),
    pnl_pct DECIMAL(8,4),
    decision_reason TEXT,
    thinking_chain JSONB,
    confidence DECIMAL(4,3),
    status VARCHAR(20) DEFAULT 'filled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trade_agent ON trade_records(agent_id);
CREATE INDEX idx_trade_date ON trade_records(trade_date);
CREATE INDEX idx_trade_stock ON trade_records(ts_code);

-- 8. 每日净值记录
CREATE TABLE IF NOT EXISTS daily_nav (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    trade_date DATE NOT NULL,
    nav DECIMAL(12,6) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    cash DECIMAL(15,2) NOT NULL,
    market_value DECIMAL(15,2) DEFAULT 0,
    daily_return DECIMAL(8,4),
    daily_pnl DECIMAL(15,2),
    cumulative_return DECIMAL(8,4),
    position_count INTEGER DEFAULT 0,
    position_ratio DECIMAL(8,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, trade_date)
);

CREATE INDEX idx_nav_agent ON daily_nav(agent_id);
CREATE INDEX idx_nav_date ON daily_nav(trade_date);

-- 9. 任务执行日志表
CREATE TABLE IF NOT EXISTS job_logs (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(50),
    status VARCHAR(20),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_ms INTEGER,
    params JSONB,
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. 数据更新记录表
CREATE TABLE IF NOT EXISTS data_update_logs (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(50) NOT NULL,
    trade_date DATE,
    start_date DATE,
    end_date DATE,
    record_count INTEGER,
    status VARCHAR(20),
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化 Agent 数据
INSERT INTO agent_accounts (agent_id, agent_name, agent_type, description, config, system_prompt) VALUES
('buffett', '巴菲特', 'value', '价值投资大师，寻找护城河深、ROE>15%、低估值的优质企业', 
 '{"risk_profile": "conservative", "max_position_size": 30, "max_positions": 10, "stop_loss_pct": 15, "holding_period": "long", "preferred_indicators": ["pe", "pb", "roe", "debt_ratio"]}',
 '你是一位价值投资大师，信奉"以合理的价格买入优秀的企业"。寻找有护城河的公司（ROE > 15%，连续5年），低估值（PE < 20，PB < 3），财务稳健（负债率 < 60%）。长期持有，集中投资。'),

('soros', '索罗斯', 'trend', '趋势交易大师，追涨杀跌，捕捉市场主要趋势',
 '{"risk_profile": "aggressive", "max_position_size": 50, "max_positions": 5, "stop_loss_pct": 8, "holding_period": "short", "preferred_indicators": ["ma", "rsi", "macd", "volume"]}',
 '你是一位趋势交易大师，擅长捕捉市场的主要趋势。趋势是你的朋友，顺势而为。追涨杀跌，突破关键阻力位时入场。严格止损：亏损 8% 坚决离场。'),

('simons', '西蒙斯', 'quant', '量化交易大师，依靠数据和模型做决策',
 '{"risk_profile": "moderate", "max_position_size": 10, "max_positions": 20, "stop_loss_pct": 10, "holding_period": "medium", "preferred_indicators": ["rsi", "macd", "kdj", "vol_ma"]}',
 '你是一位量化交易员，依靠数据和模型做决策。多因子模型：RSI + MACD + 成交量共振信号。分散投资，严格纪律。')
ON CONFLICT (agent_id) DO NOTHING;

-- 初始化今日净值
INSERT INTO daily_nav (agent_id, trade_date, nav, total_value, cash, market_value, daily_return, cumulative_return, position_count, position_ratio)
SELECT 
    agent_id,
    CURRENT_DATE,
    1.0,
    initial_capital,
    initial_capital,
    0,
    0,
    0,
    0,
    0
FROM agent_accounts
ON CONFLICT (agent_id, trade_date) DO NOTHING;

SELECT '数据库初始化完成！' as message;
