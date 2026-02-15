import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

// 连接到 Docker 数据库 (源)
const sourcePrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://alpha:arena123@localhost:5432/alpha_arena',
    },
  },
});

// 连接到 Supabase (目标)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
  console.log('开始数据迁移...');

  try {
    // 1. 迁移股票基础信息
    console.log('迁移 stock_basic...');
    const stocks = await sourcePrisma.$queryRaw`SELECT * FROM stock_basic`;
    const { error: stockError } = await supabase
      .from('stock_basic')
      .upsert(stocks as any);
    if (stockError) console.error('stock_basic 迁移错误:', stockError);

    // 2. 迁移 Agent 账户
    console.log('迁移 agent_accounts...');
    const agents = await sourcePrisma.$queryRaw`SELECT * FROM agent_accounts`;
    const { error: agentError } = await supabase
      .from('agent_accounts')
      .upsert(agents as any);
    if (agentError) console.error('agent_accounts 迁移错误:', agentError);

    // 3. 迁移交易记录 (分批)
    console.log('迁移 trade_records...');
    const trades = await sourcePrisma.$queryRaw`SELECT * FROM trade_records ORDER BY id LIMIT 1000`;
    const { error: tradeError } = await supabase
      .from('trade_records')
      .upsert(trades as any);
    if (tradeError) console.error('trade_records 迁移错误:', tradeError);

    // 4. 迁移持仓
    console.log('迁移 agent_positions...');
    const positions = await sourcePrisma.$queryRaw`SELECT * FROM agent_positions`;
    const { error: posError } = await supabase
      .from('agent_positions')
      .upsert(positions as any);
    if (posError) console.error('agent_positions 迁移错误:', posError);

    // 5. 迁移每日净值
    console.log('迁移 daily_nav...');
    const navs = await sourcePrisma.$queryRaw`SELECT * FROM daily_nav`;
    const { error: navError } = await supabase
      .from('daily_nav')
      .upsert(navs as any);
    if (navError) console.error('daily_nav 迁移错误:', navError);

    console.log('数据迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    await sourcePrisma.$disconnect();
  }
}

migrateData();
