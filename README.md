# SharkFin Lab 🦈

AI智能交易员擂台赛 - 从 Docker 迁移到 Supabase + Vercel 无服务器架构

## 架构变化

| 组件 | 旧架构 (Docker) | 新架构 (Serverless) |
|------|-----------------|---------------------|
| 数据库 | PostgreSQL in Docker | Supabase (托管 PostgreSQL) |
| 前端 | Next.js dev server | Vercel (生产部署 + CDN) |
| API | Express.js | Next.js App Router API Routes |
| 定时任务 | Docker cron | Vercel Cron Jobs |
| 数据获取 | Python scripts | Supabase Edge Functions |

## 快速开始

### 1. 克隆项目并安装依赖

```bash
cd sharkfinlab
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```bash
cp .env.example .env.local
```

必需配置：
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名 key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色 key
- `DATABASE_URL` 和 `DIRECT_URL` - 数据库连接字符串
- `MOONSHOT_API_KEY` 或 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY` - LLM API key

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送 schema 到数据库
npm run db:push

# 初始化 Agent 数据
npx ts-node scripts/seed.ts
```

### 4. 运行开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 5. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

## 项目结构

```
sharkfinlab/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API Routes
│   │   ├── agents/        # Agent API
│   │   ├── market/        # 市场数据 API
│   │   ├── trades/        # 交易记录 API
│   │   ├── data/query/    # Data Agent API
│   │   └── cron/daily/    # 定时任务 API
│   ├── page.tsx           # Dashboard
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # 工具库
│   ├── supabase.ts       # Supabase client
│   ├── prisma.ts         # Prisma client
│   ├── llm.ts            # LLM clients
│   ├── data-agent.ts     # Data Agent
│   └── agents/           # Trading agents
│       ├── base-agent.ts
│       ├── buffett-agent.ts
│       ├── soros-agent.ts
│       └── simons-agent.ts
├── prisma/               # Prisma schema
├── supabase/             # Edge Functions
└── vercel.json           # Vercel 配置
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/agents` | GET | 获取所有 Agent |
| `/api/agents` | POST | 触发 Agent 交易 |
| `/api/market` | GET | 获取市场行情 |
| `/api/trades` | GET | 获取交易记录 |
| `/api/trades` | POST | 创建交易记录 |
| `/api/data/query` | POST | Data Agent 查询 |
| `/api/cron/daily` | GET | 每日定时任务 |

## 定时任务

Vercel Cron 配置 (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 15 * * 1-5"
    }
  ]
}
```

定时在**工作日 15:00 UTC+8 (股市收盘后)** 运行每日交易。

## Data Agent 查询示例

```bash
curl -X POST https://your-app.vercel.app/api/data/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "RSI小于30的超卖股票",
    "conversationId": "user-123"
  }'
```

## Agent 策略

### 巴菲特 (价值投资)
- ROE > 15%, 负债率 < 60%
- 长期持有, 集中投资
- 止损线: 15%

### 索罗斯 (趋势交易)
- 突破均线 + MACD金叉 + 成交量放大
- 追涨杀跌
- 止损线: 8%

### 西蒙斯 (量化交易)
- RSI超卖 + KDJ金叉 + MACD背离
- 多因子模型
- 止损线: 10%

## 迁移说明

从旧版 Docker 架构迁移：

1. **数据导出**
   ```bash
   # 在旧项目中
   pg_dump -h localhost -U alpha alpha_arena > backup.sql
   ```

2. **导入到 Supabase**
   - 使用 Supabase Dashboard 的 SQL Editor
   - 或使用 `psql` 连接导入

3. **更新环境变量**
   - 将本地数据库 URL 替换为 Supabase 连接字符串

4. **部署**
   - 推送到 GitHub
   - Vercel 自动部署

## License

MIT
