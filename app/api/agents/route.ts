import { NextRequest, NextResponse } from 'next/server';
import { getAllAgents, getAgent } from '@/lib/agents';
import { prisma } from '@/lib/prisma';

// GET /api/agents - 获取所有 agent 列表
export async function GET() {
  try {
    // 从数据库获取 agent 账户信息
    const accounts = await prisma.agentAccount.findMany({
      orderBy: { totalValue: 'desc' },
    });

    // 获取每个 agent 的最新净值
    const agentsWithNav = await Promise.all(
      accounts.map(async (account) => {
        const latestNav = await prisma.dailyNav.findFirst({
          where: { agentId: account.agentId },
          orderBy: { tradeDate: 'desc' },
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
          latestNav: latestNav ? {
            date: latestNav.tradeDate.toISOString().split('T')[0],
            nav: Number(latestNav.nav),
            dailyReturn: latestNav.dailyReturn ? Number(latestNav.dailyReturn) : null,
            cumulativeReturn: latestNav.cumulativeReturn ? Number(latestNav.cumulativeReturn) : null,
          } : null,
        };
      })
    );

    return NextResponse.json(agentsWithNav);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents - 触发 agent 交易决策
export async function POST(request: NextRequest) {
  try {
    const { agentId, action, tradeDate } = await request.json();

    if (action === 'trade') {
      const agent = getAgent(agentId);
      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }

      // 获取市场上下文
      const today = tradeDate || new Date().toISOString().split('T')[0];
      const marketContext = {
        tradeDate: today,
        marketOverview: '',
      };

      // 执行决策
      const decisions = await agent.makeDailyDecision(marketContext);
      
      // 执行交易
      await agent.executeDecisions(decisions, today);

      return NextResponse.json({
        success: true,
        agentId,
        decisions: decisions.map(d => ({
          action: d.action,
          target: d.target,
          name: d.name,
          volume: d.volume,
          confidence: d.confidence,
        })),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error triggering agent:', error);
    return NextResponse.json(
      { error: 'Failed to trigger agent' },
      { status: 500 }
    );
  }
}
