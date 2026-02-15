'use client';

interface RecentTradesProps {
  trades: Array<{
    id: number;
    agentId: string;
    agentName: string | null;
    tradeDate: string;
    tsCode: string;
    name: string | null;
    tradeType: string;
    volume: number;
    price: number;
    amount: number;
    realizedPnl: number | null;
    pnlPct: number | null;
  }>;
}

const AGENT_ICONS: Record<string, string> = {
  buffett: '👴',
  soros: '🎯',
  simons: '📊',
};

export function RecentTrades({ trades }: RecentTradesProps) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">暂无交易记录</p>
        <p className="text-gray-600 text-sm mt-2">Agent 开始交易后将显示记录</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-semibold">交易记录</span>
        <span className="text-gray-400 text-sm">最近 {trades.length} 笔</span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {trades.map((trade) => (
          <div
            key={trade.id}
            className="p-3 bg-gray-900 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    trade.agentId === 'buffett'
                      ? 'bg-green-500/20 text-green-400'
                      : trade.agentId === 'soros'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {AGENT_ICONS[trade.agentId] || trade.agentName?.[0]}
                </div>
                <span className="text-sm">{trade.agentName}</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  trade.tradeType === 'BUY'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-green-500/20 text-green-400'
                }`}
              >
                {trade.tradeType === 'BUY' ? '买入' : '卖出'}
              </span>
            </div>
            <div className="text-gray-400 text-sm">
              {trade.name} ({trade.tsCode})
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-500 text-xs">
                ¥{trade.price.toFixed(2)} × {trade.volume.toLocaleString()}
              </span>
              <span className="font-mono">
                ¥{(trade.amount / 10000).toFixed(2)}万
              </span>
            </div>
            {trade.realizedPnl !== null && (
              <div
                className={`text-xs mt-1 ${
                  trade.realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                盈亏: {trade.realizedPnl >= 0 ? '+' : ''}
                ¥{trade.realizedPnl.toFixed(0)} (
                {trade.pnlPct ? trade.pnlPct.toFixed(2) : '0'}%)
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
