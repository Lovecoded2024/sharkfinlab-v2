import { NavChart } from './NavChart';
import { AgentCards } from './AgentCards';
import { RecentTrades } from './RecentTrades';
import { MarketOverview } from './MarketOverview';

interface DashboardProps {
  marketIndices: Array<{
    code: string;
    name: string;
    value: number;
    change: number;
    changePct: number;
  }>;
  agents: Array<{
    id: string;
    name: string;
    type: string | null;
    description: string | null;
    initialCapital: number;
    currentCash: number;
    totalValue: number;
    totalReturn: number;
    sharpeRatio: number | null;
    maxDrawdown: number | null;
    winRate: number | null;
    status: string;
    positionCount: number;
    latestNav: {
      date: string;
      nav: number;
      dailyReturn: number | null;
      cumulativeReturn: number | null;
    } | null;
  }>;
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
  navHistory: Record<string, any[]>;
}

export function Dashboard({ marketIndices, agents, trades, navHistory }: DashboardProps) {
  return (
    <>
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-2xl">
                🦈
              </div>
              <div>
                <h1 className="text-xl font-bold">SharkFin Lab</h1>
                <p className="text-xs text-gray-400">AI智能交易员擂台赛</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">
                {new Date().toLocaleDateString('zh-CN')}
              </span>
              <a
                href="/api/cron/daily"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
              >
                运行每日交易
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Market Overview */}
      <MarketOverview indices={marketIndices} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Area */}
          <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">全部账户权益走势</h2>
              <span className="text-sm text-gray-400">初始资金: ¥1,000,000</span>
            </div>
            <NavChart data={navHistory} />
          </div>

          {/* Trade List */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <RecentTrades trades={trades} />
          </div>
        </div>

        {/* Agent Cards */}
        <div className="mt-6">
          <AgentCards agents={agents} />
        </div>
      </main>
    </>
  );
}
