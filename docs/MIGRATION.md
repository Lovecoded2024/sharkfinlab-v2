# 从 Docker PostgreSQL 迁移到 Supabase

## 数据导出

在旧的 Docker 环境中执行：

```bash
# 进入 Alpha Arena 目录
cd projects/alpha-arena

# 导出数据
docker exec alpha-arena-db pg_dump -U alpha alpha_arena > migration/alpha_arena_backup.sql

# 导出 Schema 和数据分开
docker exec alpha-arena-db pg_dump -U alpha --schema-only alpha_arena > migration/schema.sql
docker exec alpha-arena-db pg_dump -U alpha --data-only alpha_arena > migration/data.sql
```

## Supabase 项目设置

1. **创建 Supabase 项目**
   - 访问 https://supabase.com
   - 创建新项目
   - 记下 Project URL 和 API keys

2. **配置连接**
   - 在 Dashboard -> Database -> Connection Pooling 获取 `DATABASE_URL`
   - 在 Dashboard -> Database -> Connection String 获取 `DIRECT_URL`

3. **导入 Schema**
   - 使用 Supabase SQL Editor
   - 或者使用 psql:
   ```bash
   psql -h db.xxx.supabase.co -p 5432 -U postgres -d postgres -f migration/schema.sql
   ```

4. **导入数据**
   ```bash
   psql -h db.xxx.supabase.co -p 5432 -U postgres -d postgres -f migration/data.sql
   ```

## 环境变量配置

复制 `.env.example` 并填写：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database (从 Supabase Dashboard 获取)
DATABASE_URL="postgresql://postgres:[password]@db.[ref].supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"

# LLM (选其一)
MOONSHOT_API_KEY=sk-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Prisma 配置

Prisma schema 已配置好，直接执行：

```bash
# 生成客户端
npm run db:generate

# 如果需要调整 schema
npm run db:push
```

## 数据验证

```bash
# 连接到 Supabase 验证数据
psql -h db.xxx.supabase.co -p 5432 -U postgres -d postgres

# 检查表
\dt

# 检查 Agent 数据
SELECT * FROM agent_accounts;

# 检查交易记录
SELECT COUNT(*) FROM trade_records;
```

## Edge Function 部署

部署市场数据更新 Edge Function：

```bash
# 安装 Supabase CLI
npm i -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref your-project-ref

# 部署 Edge Function
supabase functions deploy update-market

# 设置环境变量
supabase secrets set TUSHARE_TOKEN=your-token
```

## 验证迁移

1. 启动本地开发服务器
   ```bash
   npm run dev
   ```

2. 访问 http://localhost:3000

3. 检查：
   - Dashboard 显示正常
   - Agent 列表正确
   - 交易记录加载正常
   - 净值曲线显示正确

## 生产部署

推送到 GitHub，Vercel 自动部署：

```bash
git add .
git commit -m "Migrate to Supabase + Vercel"
git push origin main
```

## 回滚方案

如需回滚到 Docker 版本：

```bash
cd projects/alpha-arena
docker-compose up -d
```

数据已通过备份保留，可以随时切换回 Docker 架构。
