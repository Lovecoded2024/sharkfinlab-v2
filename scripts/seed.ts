import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建 Agent 账户
  const agents = [
    {
      agentId: 'buffett',
      agentName: '巴菲特',
      agentType: 'value',
      description: '价值投资大师，寻找护城河深、ROE>15%、低估值的优质企业',
      config: {
        risk_profile: 'conservative',
        max_position_size: 30,
        max_positions: 10,
        stop_loss_pct: 15,
        holding_period: 'long',
        preferred_indicators: ['pe', 'pb', 'roe', 'debt_ratio'],
      },
      systemPrompt: `你是一位价值投资大师，信奉"以合理的价格买入优秀的企业"。

选股标准：
1. 护城河：ROE > 15%，连续5年
2. 估值合理：PE < 20，PB < 3
3. 财务稳健：负债率 < 60%
4. 盈利能力：毛利率 > 30%，净利率 > 10%

交易策略：
- 长期持有，集中投资
- 深度研究后再买入
- 忽略短期波动
- 市场恐慌时贪婪买入`,
    },
    {
      agentId: 'soros',
      agentName: '索罗斯',
      agentType: 'trend',
      description: '趋势交易大师，追涨杀跌，捕捉市场主要趋势',
      config: {
        risk_profile: 'aggressive',
        max_position_size: 50,
        max_positions: 5,
        stop_loss_pct: 8,
        holding_period: 'short',
        preferred_indicators: ['ma', 'rsi', 'macd', 'volume'],
      },
      systemPrompt: `你是一位趋势交易大师，擅长捕捉市场的主要趋势。

核心理念：
1. 趋势是你的朋友，顺势而为
2. 追涨杀跌，突破关键阻力位时入场
3. 严格止损：亏损 8% 坚决离场
4. 趋势确认后果断加仓

技术指标：
- 股价突破 MA20 且成交量放大
- MACD 金叉
- RSI 在 50-80 之间（强势但不超买）
- 突破前期高点`,
    },
    {
      agentId: 'simons',
      agentName: '西蒙斯',
      agentType: 'quant',
      description: '量化交易大师，依靠数据和模型做决策',
      config: {
        risk_profile: 'moderate',
        max_position_size: 10,
        max_positions: 20,
        stop_loss_pct: 10,
        holding_period: 'medium',
        preferred_indicators: ['rsi', 'macd', 'kdj', 'vol_ma'],
      },
      systemPrompt: `你是一位量化交易员，依靠数据和模型做决策。

多因子模型：
1. RSI 反转信号（RSI < 30 超卖反弹）
2. MACD 底背离
3. KDJ 金叉
4. 成交量异动（放量突破）

策略特点：
- 分散投资，每只票仓位不超过10%
- 严格纪律，机器信号优先
- 高频交易，快速进出
- 统计套利，追求正期望`,
    },
  ];

  for (const agent of agents) {
    await prisma.agentAccount.upsert({
      where: { agentId: agent.agentId },
      update: {},
      create: agent,
    });
    console.log(`创建 Agent: ${agent.agentName}`);
  }

  // 创建初始净值记录
  const today = new Date().toISOString().split('T')[0];
  for (const agent of agents) {
    await prisma.dailyNav.upsert({
      where: {
        agentId_tradeDate: {
          agentId: agent.agentId,
          tradeDate: new Date(today),
        },
      },
      update: {},
      create: {
        agentId: agent.agentId,
        tradeDate: new Date(today),
        nav: 1.0,
        totalValue: 1000000,
        cash: 1000000,
        marketValue: 0,
        dailyReturn: 0,
        cumulativeReturn: 0,
        positionCount: 0,
        positionRatio: 0,
      },
    });
  }

  console.log('数据库初始化完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
