import { BaseTraderAgent, TradeDecision, MarketContext } from './base-agent';
import { prisma } from '../prisma';

/**
 * Simons Agent - 量化交易大师
 * 依靠数据和模型做决策，多因子模型
 */
export class SimonsAgent extends BaseTraderAgent {
  constructor() {
    super(
      'simons',
      '西蒙斯',
      {
        riskProfile: 'moderate',
        maxPositionSize: 10,
        maxPositions: 20,
        stopLossPct: 10,
        takeProfitPct: 15,
        holdingPeriod: 'medium',
        preferredIndicators: ['rsi', 'macd', 'kdj', 'vol_ma'],
      },
      `你是一位量化交易员，依靠数据和模型做决策。

多因子模型：
1. RSI 反转信号（RSI < 30 超卖反弹）
2. MACD 底背离
3. KDJ 金叉
4. 成交量异动（放量突破）

策略特点：
- 分散投资，每只票仓位不超过10%
- 严格纪律，机器信号优先
- 高频交易，快速进出
- 统计套利，追求正期望`
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

      // 量化选股：多因子模型
      const candidates = await prisma.$queryRaw<Array<{
        ts_code: string;
        name: string;
        close: number;
        rsi_14: number;
        macd_dif: number;
        macd_dea: number;
        macd_bar: number;
        kdj_k: number;
        kdj_d: number;
        kdj_j: number;
        vol: number;
        vol_ma5: number;
        bb_lower: number;
        bb_upper: number;
      }>>`
        SELECT 
          s.ts_code,
          s.name,
          d.close,
          t.rsi_14,
          t.macd_dif,
          t.macd_dea,
          t.macd_bar,
          t.kdj_k,
          t.kdj_d,
          t.kdj_j,
          d.vol,
          t.vol_ma5,
          t.bb_lower,
          t.bb_upper
        FROM stock_basic s
        JOIN daily_quotes d ON s.ts_code = d.ts_code
        JOIN technical_indicators t ON s.ts_code = t.ts_code AND d.trade_date = t.trade_date
        WHERE d.trade_date = ${latestQuote.tradeDate}
        AND (
          (t.rsi_14 < 35 AND t.rsi_14 > 20)
          OR (t.kdj_k > t.kdj_d AND t.kdj_k < 50)
          OR (t.macd_bar > 0 AND t.macd_bar < 0.5)
        )
        AND d.vol > t.vol_ma5 * 1.1
        AND d.close > 0
        AND d.close > t.bb_lower * 0.98
        ORDER BY t.rsi_14 ASC
        LIMIT 30
      `;

      for (const stock of candidates) {
        // 多因子评分
        let score = 0;
        const factors: string[] = [];
        
        // RSI 超卖反弹
        if (stock.rsi_14 < 30) {
          score += 0.35;
          factors.push('RSI超卖');
        } else if (stock.rsi_14 < 35) {
          score += 0.25;
          factors.push('RSI偏弱');
        }
        
        // MACD 金叉或即将金叉
        if (stock.macd_dif > stock.macd_dea) {
          score += 0.25;
          factors.push('MACD金叉');
        } else if (stock.macd_dif > stock.macd_dea - 0.1) {
          score += 0.15;
          factors.push('MACD即将金叉');
        }
        
        // KDJ 金叉
        if (stock.kdj_k > stock.kdj_d && stock.kdj_j < 50) {
          score += 0.25;
          factors.push('KDJ金叉');
        }
        
        // 成交量放大
        const volRatio = stock.vol / Number(stock.vol_ma5);
        if (volRatio > 1.5) {
          score += 0.15;
          factors.push('放量');
        }

        if (score >= 0.5) {
          const volume = Math.floor((1000000 * 0.1) / stock.close / 100) * 100;
          
          decisions.push({
            action: 'BUY',
            target: stock.ts_code,
            name: stock.name,
            volume: Math.min(volume, 5000),
            price: stock.close,
            thinkingChain: {
              marketAnalysis: marketAnalysis.slice(0, 200),
              stockSelection: `${stock.name}(${stock.ts_code})`,
              riskAssessment: `量化信号: ${factors.join(', ')}, RSI=${stock.rsi_14.toFixed(1)}`,
              finalDecision: `评分${score.toFixed(2)}，多因子共振，量化买入`,
            },
            confidence: score,
          });
        }
      }

    } catch (error) {
      console.error('Simons findOpportunities error:', error);
    }

    return decisions;
  }
}

export const simonsAgent = new SimonsAgent();
