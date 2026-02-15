import { BaseTraderAgent, TradeDecision, MarketContext } from './base-agent';
import { prisma } from '../prisma';

/**
 * Soros Agent - 趋势交易大师
 * 追涨杀跌，捕捉市场主要趋势
 */
export class SorosAgent extends BaseTraderAgent {
  constructor() {
    super(
      'soros',
      '索罗斯',
      {
        riskProfile: 'aggressive',
        maxPositionSize: 50,
        maxPositions: 5,
        stopLossPct: 8,
        takeProfitPct: 20,
        holdingPeriod: 'short',
        preferredIndicators: ['ma', 'rsi', 'macd', 'volume'],
      },
      `你是一位趋势交易大师，擅长捕捉市场的主要趋势。

核心理念：
1. 趋势是你的朋友，顺势而为
2. 追涨杀跌，突破关键阻力位时入场
3. 严格止损：亏损 8% 坚决离场
4. 趋势确认后果断加仓

技术指标：
- 股价突破 MA20 且成交量放大
- MACD 金叉
- RSI 在 50-80 之间（强势但不超买）
- 突破前期高点`
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

      // 获取趋势股票（突破均线 + MACD金叉）
      const candidates = await prisma.$queryRaw<Array<{
        ts_code: string;
        name: string;
        close: number;
        ma20: number;
        macd_dif: number;
        macd_dea: number;
        rsi_14: number;
        vol: number;
        vol_ma20: number;
        pct_chg: number;
      }>>`
        SELECT 
          s.ts_code,
          s.name,
          d.close,
          t.ma20,
          t.macd_dif,
          t.macd_dea,
          t.rsi_14,
          d.vol,
          t.vol_ma20,
          d.pct_chg
        FROM stock_basic s
        JOIN daily_quotes d ON s.ts_code = d.ts_code
        JOIN technical_indicators t ON s.ts_code = t.ts_code AND d.trade_date = t.trade_date
        WHERE d.trade_date = ${latestQuote.tradeDate}
        AND d.close > t.ma20 * 1.02
        AND t.macd_dif > t.macd_dea
        AND t.macd_dif > 0
        AND t.rsi_14 BETWEEN 50 AND 80
        AND d.vol > t.vol_ma20 * 1.2
        AND d.pct_chg > 2
        AND d.close > 0
        ORDER BY d.pct_chg DESC
        LIMIT 20
      `;

      for (const stock of candidates) {
        // 评分系统
        let score = 0;
        
        // 突破MA20
        if (stock.close > stock.ma20 * 1.05) score += 0.3;
        else score += 0.2;
        
        // MACD金叉且向上
        const macdDiff = stock.macd_dif - stock.macd_dea;
        if (macdDiff > 0.1) score += 0.3;
        else score += 0.2;
        
        // RSI适中
        if (stock.rsi_14 >= 60 && stock.rsi_14 <= 70) score += 0.2;
        else score += 0.1;
        
        // 成交量放大
        const volRatio = stock.vol / Number(stock.vol_ma20);
        if (volRatio > 2) score += 0.2;
        else if (volRatio > 1.5) score += 0.15;
        else score += 0.1;

        if (score >= 0.5) {
          const volume = Math.floor((1000000 * 0.5) / stock.close / 100) * 100;
          
          decisions.push({
            action: 'BUY',
            target: stock.ts_code,
            name: stock.name,
            volume: Math.min(volume, 20000),
            price: stock.close,
            thinkingChain: {
              marketAnalysis: marketAnalysis.slice(0, 200),
              stockSelection: `${stock.name}(${stock.ts_code}) - 涨${stock.pct_chg}%`,
              riskAssessment: `趋势确认，成交量放大${volRatio.toFixed(1)}倍，RSI=${stock.rsi_14.toFixed(1)}`,
              finalDecision: `评分${score.toFixed(2)}，突破趋势，建议追涨`,
            },
            confidence: score,
          });
        }
      }

    } catch (error) {
      console.error('Soros findOpportunities error:', error);
    }

    return decisions;
  }
}

export const sorosAgent = new SorosAgent();
