import { PrismaClient } from '@prisma/client';
import { openai, chatCompletion } from './llm';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Agent 配置接口
export interface AgentConfig {
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  maxPositionSize: number;       // 单票最大仓位 (%)
  maxPositions: number;          // 最大持股数量
  stopLossPct: number;           // 止损线 (%)
  takeProfitPct?: number;        // 止盈线 (%)
  preferredIndicators: string[]; // 偏好指标
  holdingPeriod: 'short' | 'medium' | 'long';
}

// 交易决策
export interface TradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  target?: string;               // 股票代码
  name?: string;                 // 股票名称
  volume?: number;               // 数量
  price?: number;                // 价格
  thinkingChain: {
    marketAnalysis: string;
    stockSelection: string;
    riskAssessment: string;
    finalDecision: string;
  };
  confidence: number;            // 置信度 0-1
}

// 市场上下文
export interface MarketContext {
  tradeDate: string;
  marketOverview?: string;
  hotSectors?: string[];
}

export class BaseTraderAgent {
  protected id: string;
  protected name: string;
  protected config: AgentConfig;
  protected systemPrompt: string;

  constructor(
    id: string,
    name: string,
    config: AgentConfig,
    systemPrompt: string
  ) {
    this.id = id;
    this.name = name;
    this.config = config;
    this.systemPrompt = systemPrompt;
  }

  /**
   * 每日决策入口
   */
  async makeDailyDecision(context: MarketContext): Promise<TradeDecision[]> {
    console.log(`[${this.name}] Starting daily decision for ${context.tradeDate}`);

    const decisions: TradeDecision[] = [];

    try {
      // 1. 分析市场状态
      const marketAnalysis = await this.analyzeMarket(context);
      
      // 2. 检查现有持仓（止损/止盈）
      const positionDecisions = await this.checkPositions(context);
      decisions.push(...positionDecisions);

      // 3. 寻找新机会（如果需要建仓）
      const currentPositions = await this.getCurrentPositionCount();
      if (currentPositions < this.config.maxPositions) {
        const newOpportunities = await this.findOpportunities(context, marketAnalysis);
        decisions.push(...newOpportunities);
      }

      // 4. 过滤和优化决策
      const finalDecisions = await this.optimizeDecisions(decisions);

      console.log(`[${this.name}] Generated ${finalDecisions.length} decisions`);
      
      return finalDecisions;

    } catch (error) {
      console.error(`[${this.name}] Decision failed:`, error);
      return [];
    }
  }

  /**
   * 分析市场状态
   */
  protected async analyzeMarket(context: MarketContext): Promise<string> {
    // 从数据库获取市场概况
    const latestDate = await prisma.dailyQuote.findFirst({
      orderBy: { tradeDate: 'desc' },
      select: { tradeDate: true },
    });

    if (!latestDate) return '无法获取市场数据';

    // 获取主要指数数据
    const indexCodes = ['000001.SH', '399001.SZ', '399006.SZ'];
    const indices = await prisma.dailyQuote.findMany({
      where: {
        tsCode: { in: indexCodes },
        tradeDate: latestDate.tradeDate,
      },
    });

    const marketSummary = indices.map(i => 
      `${i.tsCode}: ${i.close} (${i.pctChg}%)
    ).join('\n');

    return `今日市场概况：\n${marketSummary}`;
  }

  /**
   * 检查现有持仓（止损/止盈）
   */
  protected async checkPositions(context: MarketContext): Promise<TradeDecision[]> {
    const decisions: TradeDecision[] = [];

    try {
      const positions = await prisma.agentPosition.findMany({
        where: {
          agentId: this.id,
          volume: { gt: 0 },
        },
      });

      for (const pos of positions) {
        const pnlPct = Number(pos.pnlPct);

        // 止损检查
        if (pnlPct < -this.config.stopLossPct) {
          decisions.push({
            action: 'SELL',
            target: pos.tsCode,
            name: pos.name || undefined,
            volume: pos.availableVolume,
            price: Number(pos.currentPrice),
            thinkingChain: {
              marketAnalysis: '持仓亏损超过止损线',
              stockSelection: `${pos.name}(${pos.tsCode})`,
              riskAssessment: `当前亏损 ${pnlPct.toFixed(2)}%，触发 ${this.config.stopLossPct}% 止损`,
              finalDecision: '执行止损卖出',
            },
            confidence: 0.9,
          });
        }
        // 止盈检查
        else if (this.config.takeProfitPct && pnlPct > this.config.takeProfitPct) {
          decisions.push({
            action: 'SELL',
            target: pos.tsCode,
            name: pos.name || undefined,
            volume: Math.floor(pos.availableVolume / 2 / 100) * 100, // 卖出一半
            price: Number(pos.currentPrice),
            thinkingChain: {
              marketAnalysis: '持仓盈利超过止盈线',
              stockSelection: `${pos.name}(${pos.tsCode})`,
              riskAssessment: `当前盈利 ${pnlPct.toFixed(2)}%，达到 ${this.config.takeProfitPct}% 止盈目标`,
              finalDecision: '执行部分止盈',
            },
            confidence: 0.8,
          });
        }
      }

    } catch (error) {
      console.error('Position check failed:', error);
    }

    return decisions;
  }

  /**
   * 寻找新机会（子类实现）
   */
  protected async findOpportunities(
    context: MarketContext,
    marketAnalysis: string
  ): Promise<TradeDecision[]> {
    // 默认实现：返回空数组，子类应该重写此方法
    return [];
  }

  /**
   * 获取当前持仓数量
   */
  protected async getCurrentPositionCount(): Promise<number> {
    const count = await prisma.agentPosition.count({
      where: {
        agentId: this.id,
        volume: { gt: 0 },
      },
    });
    return count;
  }

  /**
   * 优化决策（过滤、排序、限制）
   */
  protected async optimizeDecisions(decisions: TradeDecision[]): Promise<TradeDecision[]> {
    // 1. 过滤 HOLD 决策
    let filtered = decisions.filter(d => d.action !== 'HOLD');

    // 2. 按置信度排序
    filtered.sort((a, b) => b.confidence - a.confidence);

    // 3. 限制买入数量
    const buyCount = filtered.filter(d => d.action === 'BUY').length;
    const currentPositions = await this.getCurrentPositionCount();
    const maxNewBuys = Math.max(0, this.config.maxPositions - currentPositions);

    if (buyCount > maxNewBuys) {
      const buys = filtered.filter(d => d.action === 'BUY').slice(0, maxNewBuys);
      const sells = filtered.filter(d => d.action === 'SELL');
      filtered = [...sells, ...buys];
    }

    return filtered;
  }

  /**
   * 执行决策
   */
  async executeDecisions(decisions: TradeDecision[], tradeDate: string): Promise<void> {
    for (const decision of decisions) {
      if (decision.action === 'HOLD') continue;

      try {
        await this.executeTrade(decision, tradeDate);
        console.log(`[${this.name}] Executed ${decision.action} ${decision.target}`);
      } catch (error) {
        console.error(`[${this.name}] Execution error:`, error);
      }
    }
  }

  /**
   * 执行单笔交易
   */
  private async executeTrade(decision: TradeDecision, tradeDate: string): Promise<void> {
    const { action, target, name, volume, price, thinkingChain, confidence } = decision;
    
    if (!target || !volume || !price) return;

    const amount = price * volume;
    const commission = amount * 0.00025; // 佣金 0.025%
    const tax = action === 'SELL' ? amount * 0.001 : 0; // 印花税 0.1%
    const totalCost = amount + commission + tax;

    // 获取当前持仓
    const position = await prisma.agentPosition.findUnique({
      where: {
        agentId_tsCode: {
          agentId: this.id,
          tsCode: target,
        },
      },
    });

    // 获取账户
    const account = await prisma.agentAccount.findUnique({
      where: { agentId: this.id },
    });

    if (!account) throw new Error('Account not found');

    await prisma.$transaction(async (tx) => {
      // 创建交易记录
      await tx.tradeRecord.create({
        data: {
          agentId: this.id,
          tradeDate: new Date(tradeDate),
          tsCode: target,
          name: name || target,
          tradeType: action,
          volume,
          price: new Decimal(price),
          amount: new Decimal(amount),
          commission: new Decimal(commission),
          tax: new Decimal(tax),
          transferFee: new Decimal(0),
          totalCost: new Decimal(totalCost),
          decisionReason: thinkingChain.finalDecision,
          thinkingChain: thinkingChain as any,
          confidence: new Decimal(confidence),
        },
      });

      if (action === 'BUY') {
        // 更新现金
        await tx.agentAccount.update({
          where: { agentId: this.id },
          data: {
            currentCash: {
              decrement: totalCost,
            },
          },
        });

        // 更新或创建持仓
        if (position) {
          const newVolume = position.volume + volume;
          const newAvgCost = (Number(position.avgCost) * position.volume + amount) / newVolume;
          await tx.agentPosition.update({
            where: { id: position.id },
            data: {
              volume: newVolume,
              avgCost: new Decimal(newAvgCost),
              buyCount: { increment: 1 },
              lastTradeDate: new Date(tradeDate),
            },
          });
        } else {
          await tx.agentPosition.create({
            data: {
              agentId: this.id,
              tsCode: target,
              name: name || target,
              volume,
              availableVolume: 0, // T+1
              avgCost: new Decimal(price),
              currentPrice: new Decimal(price),
              firstBuyDate: new Date(tradeDate),
              lastTradeDate: new Date(tradeDate),
              buyCount: 1,
            },
          });
        }
      } else {
        // SELL
        const realizedPnl = (price - Number(position?.avgCost || 0)) * volume;
        
        // 更新现金
        await tx.agentAccount.update({
          where: { agentId: this.id },
          data: {
            currentCash: {
              increment: amount - commission - tax,
            },
          },
        });

        // 更新持仓
        if (position) {
          const newVolume = Math.max(0, position.volume - volume);
          await tx.agentPosition.update({
            where: { id: position.id },
            data: {
              volume: newVolume,
              realizedPnl: {
                increment: realizedPnl,
              },
              sellCount: { increment: 1 },
              lastTradeDate: new Date(tradeDate),
            },
          });
        }

        // 更新交易记录的实现盈亏
        await tx.tradeRecord.updateMany({
          where: {
            agentId: this.id,
            tsCode: target,
            tradeDate: new Date(tradeDate),
          },
          data: {
            realizedPnl: new Decimal(realizedPnl),
            pnlPct: new Decimal((realizedPnl / (Number(position?.avgCost || 1) * volume)) * 100),
          },
        });
      }
    });
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }
}
