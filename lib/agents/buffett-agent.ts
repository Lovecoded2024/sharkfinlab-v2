import { BaseTraderAgent, TradeDecision, MarketContext } from './base-agent';
import { prisma } from '../prisma';

/**
 * Buffett Agent - 价值投资大师
 * 寻找护城河深、ROE>15%、低估值的优质企业
 */
export class BuffettAgent extends BaseTraderAgent {
  constructor() {
    super(
      'buffett',
      '巴菲特',
      {
        riskProfile: 'conservative',
        maxPositionSize: 30,
        maxPositions: 10,
        stopLossPct: 15,
        takeProfitPct: 50,
        holdingPeriod: 'long',
        preferredIndicators: ['pe', 'pb', 'roe', 'debt_ratio'],
      },
      `你是一位价值投资大师，信奉"以合理的价格买入优秀的企业"。

选股标准：
1. 护城河：ROE > 15%，连续5年
2. 估值合理：PE < 20，PB < 3
3. 财务稳健：负债率 < 60%
4. 盈利能力：毛利率 > 30%，净利率 > 10%

交易策略：
- 长期持有，集中投资
- 深度研究后再买入
- 忽略短期波动
- 市场恐慌时贪婪买入`
    );
  }

  protected async findOpportunities(
    context: MarketContext,
    marketAnalysis: string
  ): Promise<TradeDecision[]> {
    const decisions: TradeDecision[] = [];

    try {
      // 获取最新交易日期
      const latestQuote = await prisma.dailyQuote.findFirst({
        orderBy: { tradeDate: 'desc' },
        select: { tradeDate: true },
      });

      if (!latestQuote) return decisions;

      // 获取最新财务指标和股价
      const candidates = await prisma.$queryRaw<Array<{
        ts_code: string;
        name: string;
        close: number;
        roe: number;
        debt_to_assets: number;
        grossprofit_margin: number;
        netprofit_margin: number;
      }>>`
        SELECT 
          s.ts_code,
          s.name,
          d.close,
          f.roe,
          f.debt_to_assets,
          f.grossprofit_margin,
          f.netprofit_margin
        FROM stock_basic s
        JOIN daily_quotes d ON s.ts_code = d.ts_code
        JOIN financial_indicators f ON s.ts_code = f.ts_code
        WHERE d.trade_date = ${latestQuote.tradeDate}
        AND f.end_date = (
          SELECT MAX(end_date) FROM financial_indicators WHERE ts_code = s.ts_code
        )
        AND f.roe > 15
        AND f.debt_to_assets < 0.6
        AND f.grossprofit_margin > 0.3
        AND f.netprofit_margin > 0.1
        AND d.close > 0
        ORDER BY f.roe DESC
        LIMIT 20
      `;

      for (const stock of candidates) {
        // 使用 LLM 分析是否值得买入
        const prompt = `
${this.systemPrompt}

当前市场分析：
${marketAnalysis}

候选股票：
- 代码: ${stock.ts_code}
- 名称: ${stock.name}
- 当前价格: ${stock.close}
- ROE: ${(stock.roe * 100).toFixed(2)}%
- 负债率: ${(stock.debt_to_assets * 100).toFixed(2)}%
- 毛利率: ${(stock.grossprofit_margin * 100).toFixed(2)}%
- 净利率: ${(stock.netprofit_margin * 100).toFixed(2)}%

请判断是否值得买入，以JSON格式返回：
{
  "shouldBuy": true/false,
  "reasoning": "分析理由",
  "confidence": 0-1
}`;

        // 简化：直接根据指标评分
        let score = 0;
        if (stock.roe > 0.2) score += 0.4;
        else if (stock.roe > 0.15) score += 0.3;
        
        if (stock.debt_to_assets < 0.4) score += 0.2;
        else if (stock.debt_to_assets < 0.6) score += 0.1;
        
        if (stock.grossprofit_margin > 0.4) score += 0.2;
        else if (stock.grossprofit_margin > 0.3) score += 0.1;

        if (score >= 0.5) {
          const volume = Math.floor((1000000 * 0.3) / stock.close / 100) * 100;
          
          decisions.push({
            action: 'BUY',
            target: stock.ts_code,
            name: stock.name,
            volume: Math.min(volume, 10000), // 限制单笔数量
            price: stock.close,
            thinkingChain: {
              marketAnalysis: marketAnalysis.slice(0, 200),
              stockSelection: `${stock.name}(${stock.ts_code}) - ROE:${(stock.roe*100).toFixed(1)}%, 负债率:${(stock.debt_to_assets*100).toFixed(1)}%`,
              riskAssessment: `财务指标优秀，估值合理，适合价值投资`,
              finalDecision: `评分${score.toFixed(2)}，符合价值投资标准，建议买入`,
            },
            confidence: score,
          });
        }
      }

    } catch (error) {
      console.error('Buffett findOpportunities error:', error);
    }

    return decisions;
  }
}

export const buffettAgent = new BuffettAgent();
