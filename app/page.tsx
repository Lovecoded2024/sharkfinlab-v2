import { Dashboard } from '@/components/Dashboard';
import { prisma } from '@/lib/prisma';

async function getMarketData() {
  try {
    // 获取最新交易日期
    const latestQuote = await prisma.dailyQuote.findFirst({
      orderBy: { tradeDate: 'desc' },
      select: { tradeDate: true },
    });

    if (!latestQuote) {
      return [
        { code: '000001.SH', name: '上证指数', value: 3050.25, change: 15.3, changePct: 0.5 },
        { code: '399001.SZ', name: '深证成指', value: 9850.12, change: 45.8, changePct: 0.47 },
        { code: '399006.SZ', name: '创业板指', value: 1980.56, change: 12.4, changePct: 0.63 },
      ];
    }

    const indexCodes = ['000001.SH', '399001.SZ', '399006.SZ'];
    const indexNames: Record<string, string> = {
      '000001.SH': '上证指数',
      '399001.SZ': '深证成指',
      '399006.SZ': '创业板指',
    };

    const indices = await prisma.dailyQuote.findMany({
      where: {
        tsCode: { in: indexCodes },
        tradeDate: latestQuote.tradeDate,
      },
    });

    return indices.map((item) => ({
      code: item.tsCode,
      name: indexNames[item.tsCode] || item.tsCode,
      value: Number(item.close),
      change: Number(item.change),
      changePct: Number(item.pctChg),
    }));
  } catch (e) {
    console.error('Error fetching market data:', e);
    return [];
  }
}

async function getAgents() {
  try {
    const accounts = await prisma.agentAccount.findMany({
      orderBy: { totalValue: 'desc' },
    });

    return Promise.all(
      accounts.map(async (account) => {
        const latestNav = await prisma.dailyNav.findFirst({
          where: { agentId: account.agentId },
          orderBy: { tradeDate: 'desc' },
        });

        const positionCount = await prisma.agentPosition.count({
          where: {
            agentId: account.agentId,
            volume: { gt: 0 },
          },
        });

        return {
          id: account.agentId,
          name: account.agentName,
          type: account.agentType,
          description: account.description,
          initialCapital: Number(account.initialCapital),
          currentCash: Number(account.currentCash),
          totalValue: Number(account.totalValue),
          totalReturn: Number(account.totalReturn),
          sharpeRatio: account.sharpeRatio ? Number(account.sharpeRatio) : null,
          maxDrawdown: account.maxDrawdown ? Number(account.maxDrawdown) : null,
          winRate: account.winRate ? Number(account.winRate) : null,
          status: account.status,
          positionCount,
          latestNav: latestNav ? {
            date: latestNav.tradeDate.toISOString().split('T')[0],
            nav: Number(latestNav.nav),
            dailyReturn: latestNav.dailyReturn ? Number(latestNav.dailyReturn) : null,
            cumulativeReturn: latestNav.cumulativeReturn ? Number(latestNav.cumulativeReturn) : null,
          } : null,
        };
      })
    );
  } catch (e) {
    console.error('Error fetching agents:', e);
    return [];
  }
}

async function getTrades() {
  try {
    const trades = await prisma.tradeRecord.findMany({
      take: 20,
      orderBy: { tradeDate: 'desc' },
      include: {
        agent: {
          select: { agentName: true },
        },
      },
    });

    return trades.map((trade) => ({
      id: trade.id,
      agentId: trade.agentId,
      agentName: trade.agent?.agentName,
      tradeDate: trade.tradeDate.toISOString().split('T')[0],
      tsCode: trade.tsCode,
      name: trade.name,
      tradeType: trade.tradeType,
      volume: trade.volume,
      price: Number(trade.price),
      amount: Number(trade.amount),
      realizedPnl: trade.realizedPnl ? Number(trade.realizedPnl) : null,
      pnlPct: trade.pnlPct ? Number(trade.pnlPct) : null,
    }));
  } catch (e) {
    console.error('Error fetching trades:', e);
    return [];
  }
}

async function getNavHistory() {
  try {
    const agents = await prisma.agentAccount.findMany();
    const navHistory: Record<string, any[]> = {};

    for (const agent of agents) {
      const navs = await prisma.dailyNav.findMany({
        where: { agentId: agent.agentId },
        orderBy: { tradeDate: 'asc' },
        take: 30,
      });

      navHistory[agent.agentId] = navs.map((n) => ({
        date: n.tradeDate.toISOString().split('T')[0],
        nav: Number(n.nav),
        totalValue: Number(n.totalValue),
      }));
    }

    return navHistory;
  } catch (e) {
    console.error('Error fetching nav history:', e);
    return {};
  }
}

export default async function Home() {
  const [marketIndices, agents, trades, navHistory] = await Promise.all([
    getMarketData(),
    getAgents(),
    getTrades(),
    getNavHistory(),
  ]);

  return (
    <Dashboard
      marketIndices={marketIndices}
      agents={agents}
      trades={trades}
      navHistory={navHistory}
    />
  );
}
