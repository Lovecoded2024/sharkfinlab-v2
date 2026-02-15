# Supabase 初始化步骤

## 1. 登录 Supabase Dashboard

访问: https://supabase.com/dashboard/project/jngriqpksalsmtpsfiba

## 2. 执行 SQL 初始化

进入 **SQL Editor** → **New Query**，粘贴 `supabase/init.sql` 的内容并执行。

或者按以下顺序执行：

### Step 1: 创建表结构

```sql
-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent 账户表
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
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 交易记录表
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
    decision_reason TEXT,
    thinking_chain JSONB,
    confidence DECIMAL(4,3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 每日净值表
CREATE TABLE IF NOT EXISTS daily_nav (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    trade_date DATE NOT NULL,
    nav DECIMAL(12,6) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    cash DECIMAL(15,2) NOT NULL,
    market_value DECIMAL(15,2) DEFAULT 0,
    daily_return DECIMAL(8,4),
    cumulative_return DECIMAL(8,4),
    position_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, trade_date)
);

-- 股票基础信息表
CREATE TABLE IF NOT EXISTS stock_basic (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) UNIQUE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    area VARCHAR(50),
    industry VARCHAR(50),
    market VARCHAR(20),
    exchange VARCHAR(10),
    list_date DATE,
    is_st BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 日线行情表
CREATE TABLE IF NOT EXISTS daily_quotes (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    open DECIMAL(12,4),
    high DECIMAL(12,4),
    low DECIMAL(12,4),
    close DECIMAL(12,4),
    pct_chg DECIMAL(8,4),
    vol BIGINT,
    amount DECIMAL(20,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ts_code, trade_date)
);

-- 持仓表
CREATE TABLE IF NOT EXISTS agent_positions (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL,
    ts_code VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    volume INTEGER DEFAULT 0,
    avg_cost DECIMAL(12,4) DEFAULT 0,
    current_price DECIMAL(12,4) DEFAULT 0,
    market_value DECIMAL(15,2) DEFAULT 0,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0,
    UNIQUE(agent_id, ts_code)
);
```

### Step 2: 初始化 Agent 数据

```sql
INSERT INTO agent_accounts (agent_id, agent_name, agent_type, description, config, system_prompt) VALUES
('buffett', '巴菲特', 'value', '价值投资大师，寻找护城河深、ROE>15%、低估值的优质企业', 
 '{"risk_profile": "conservative", "max_position_size": 30, "max_positions": 10, "stop_loss_pct": 15}',
 '你是一位价值投资大师，信奉"以合理的价格买入优秀的企业"。寻找有护城河的公司（ROE > 15%），低估值，财务稳健。'),

('soros', '索罗斯', 'trend', '趋势交易大师，追涨杀跌，捕捉市场主要趋势',
 '{"risk_profile": "aggressive", "max_position_size": 50, "max_positions": 5, "stop_loss_pct": 8}',
 '你是一位趋势交易大师，擅长捕捉市场的主要趋势。趋势是你的朋友，顺势而为。严格止损：亏损 8% 坚决离场。'),

('simons', '西蒙斯', 'quant', '量化交易大师，依靠数据和模型做决策',
 '{"risk_profile": "moderate", "max_position_size": 10, "max_positions": 20, "stop_loss_pct": 10}',
 '你是一位量化交易员，依靠数据和模型做决策。多因子模型，分散投资，严格纪律。')
ON CONFLICT (agent_id) DO NOTHING;

-- 初始化今日净值
INSERT INTO daily_nav (agent_id, trade_date, nav, total_value, cash, market_value, daily_return, cumulative_return)
SELECT agent_id, CURRENT_DATE, 1.0, initial_capital, initial_capital, 0, 0, 0
FROM agent_accounts
ON CONFLICT (agent_id, trade_date) DO NOTHING;
```

## 3. 设置环境变量

在 Vercel 或本地 `.env.local` 中设置:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jngriqpksalsmtpsfiba.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ3JpcXBrc2Fsc210cHNmaWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODc1MDIsImV4cCI6MjA4NjU2MzUwMn0.tTc6EcR-b-WUlxQs1ejxT01wVFfdavBdPdoSNDf0Xzc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ3JpcXBrc2Fsc210cHNmaWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk4NzUwMiwiZXhwIjoyMDg2NTYzNTAyfQ.d1yvo9Qntfpne00Y4mI8UIFbdQq7ocNok60QSS7P1E0

# 数据库密码需要你自己设置
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.jngriqpksalsmtpsfiba.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.jngriqpksalsmtpsfiba.supabase.co:5432/postgres"
```

## 4. 获取数据库密码

在 Supabase Dashboard:
1. 进入 **Database** → **Connection Pooling**
2. 或者进入 **Settings** → **Database**
3. 找到密码 (如果你忘了可以重置)

## 5. 测试连接

```bash
cd sharkfinlab
npm install
node scripts/check-supabase.js
```

## 6. Prisma 初始化

```bash
# 安装 Prisma
npm install -g prisma

# 生成客户端
npx prisma generate

# 推送 schema (如果还没创建表)
npx prisma db push
```

## 7. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000
