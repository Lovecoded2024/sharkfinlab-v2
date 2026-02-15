import { NextResponse } from 'next/server';
import { getAllAgents } from '@/lib/agents';
import { prisma } from '@/lib/prisma';

// 这个路由会被 Vercel Cron Job 调用
// 配置在 vercel.json 中

export async function GET() {
  try {
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];

    console.log(`[Daily Cron] Starting daily trading session at ${new Date().toISOString()}`);

    // 记录任务开始
    await prisma.jobLog.create({
      data: {
        jobName: 'daily-trading',
        jobType: 'trade',
        status: 'running',
        startTime: new Date(),
        params: { date: today },
      },
    });

    const results = [];

    // 为每个 agent 执行交易决策
    const agents = getAllAgents();
    for (const agent of agents) {
      try {
        const marketContext = {
          tradeDate: today,
          marketOverview: '',
        };

        // 生成决策
        const decisions = await agent.makeDailyDecision(marketContext);
        
        // 执行交易
        await agent.executeDecisions(decisions, today);

        results.push({
          agentId: agent.getId(),
          agentName: agent.getName(),
          decisions: decisions.length,
          success: true,
        });

        console.log(`[Daily Cron] ${agent.getName()} executed ${decisions.length} decisions`);
      } catch (error) {
        console.error(`[Daily Cron] Error for ${agent.getName()}:`, error);
        results.push({
          agentId: agent.getId(),
          agentName: agent.getName(),
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    // 更新净值记录
    await updateDailyNav(today);

    const duration = Date.now() - startTime;

    // 记录任务完成
    await prisma.jobLog.create({
      data: {
        jobName: 'daily-trading',
        jobType: 'trade',
        status: 'success',
        startTime: new Date(startTime),
        endTime: new Date(),
        durationMs: duration,
        result: { results },
      },
    });

    return NextResponse.json({
      success: true,
      date: today,
      duration,
      results,
    });
  } catch (error) {
    console.error('[Daily Cron] Fatal error:', error);
    
    await prisma.jobLog.create({
      data: {
        jobName: 'daily-trading',
        jobType: 'trade',
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: 'Daily trading failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 更新每日净值
async function updateDailyNav(tradeDate: string) {
  const accounts = await prisma.agentAccount.findMany();
  
  for (const account of accounts) {
    // 获取持仓市值
    const positions = await prisma.agentPosition.findMany({
      where: { agentId: account.agentId },
    });
    
    const marketValue = positions.reduce(
      (sum, pos) => sum + Number(pos.marketValue),
      0
    );
    
    const totalValue = Number(account.currentCash) + marketValue;
    const nav = totalValue / 1000000; // 初始净值 1
    const cumulativeReturn = ((totalValue - Number(account.initialCapital)) / Number(account.initialCapital)) * 100;
    
    // 获取昨日净值计算日收益
    const yesterdayNav = await prisma.dailyNav.findFirst({
      where: { agentId: account.agentId },
      orderBy: { tradeDate: 'desc' },
    });
    
    const dailyReturn = yesterdayNav 
      ? ((nav - Number(yesterdayNav.nav)) / Number(yesterdayNav.nav)) * 100
      : 0;

    await prisma.dailyNav.create({
      data: {
        agentId: account.agentId,
        tradeDate: new Date(tradeDate),
        nav,
        totalValue,
        cash: account.currentCash,
        marketValue,
        dailyReturn,
        cumulativeReturn,
        positionCount: positions.filter(p => p.volume > 0).length,
        positionRatio: marketValue / totalValue,
      },
    });

    // 更新账户总价值和收益
    await prisma.agentAccount.update({
      where: { agentId: account.agentId },
      data: {
        totalValue,
        totalReturn: cumulativeReturn,
      },
    });
  }
}
