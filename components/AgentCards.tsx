'use client';

interface Agent {
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
}

interface AgentCardsProps {
  agents: Agent[];
}

const AGENT_ICONS: Record<string, string> = {
  buffett: '👴',
  soros: '🎯',
  simons: '📊',
};

const AGENT_COLORS: Record<string, string> = {
  buffett: 'from-green-500/20 to-green-600/20 border-green-500/30',
  soros: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  simons: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
};

export function AgentCards({ agents }: AgentCardsProps) {
  if (agents.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-800 rounded-xl border border-gray-700">
        <p className="text-gray-500">暂无 Agent 数据</p>
        <p className="text-gray-600 text-sm mt-2">初始化数据库后将显示</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className={`bg-gradient-to-br ${AGENT_COLORS[agent.id]} rounded-xl p-5 border`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-gray-800/50">
                {AGENT_ICONS[agent.id]}
              </div>
              <div>
                <h3 className="font-semibold">{agent.name}</h3>
                <p className="text-gray-400 text-xs">{agent.type}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold">
                ¥{(agent.totalValue / 10000).toFixed(2)}万
              </div>
              <div
                className={
                  agent.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'
                }
              >
                {agent.totalReturn >= 0 ? '+' : ''}
                {agent.totalReturn.toFixed(2)}%
              </div>
            </div>
          </div>

          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
            {agent.description}
          </p>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-gray-500">持仓</div>
              <div className="font-mono">{agent.positionCount}只</div>
            </div>
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-gray-500">现金</div>
              <div className="font-mono">
                ¥{(agent.currentCash / 10000).toFixed(1)}万
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-gray-500">夏普</div>
              <div className="font-mono">
                {agent.sharpeRatio?.toFixed(2) || '-'}
              </div>
            </div>
          </div>

          {agent.latestNav?.dailyReturn !== null && (
            <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
              <span className="text-gray-500"></span>
              <span
                className={
                  (agent.latestNav?.dailyReturn || 0) >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }
              >
                日收益: {(agent.latestNav?.dailyReturn || 0) >= 0 ? '+' : ''}
                {(agent.latestNav?.dailyReturn || 0).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
