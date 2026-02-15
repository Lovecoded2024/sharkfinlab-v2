'use client';

interface MarketOverviewProps {
  indices: Array<{
    code: string;
    name: string;
    value: number;
    change: number;
    changePct: number;
  }>;
}

export function MarketOverview({ indices }: MarketOverviewProps) {
  if (indices.length === 0) {
    return (
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="text-gray-400 text-sm">暂无市场数据</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex space-x-8 overflow-x-auto">
          {indices.map((index) => (
            <div
              key={index.code}
              className="flex items-center space-x-3 min-w-fit"
            >
              <span className="text-gray-400 text-sm">{index.name}</span>
              <span className="font-mono text-lg font-bold">
                {index.value.toLocaleString('zh-CN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={
                  index.changePct >= 0 ? 'text-green-400' : 'text-red-400'
                }
              >
                {index.changePct >= 0 ? '▲' : '▼'}{' '}
                {Math.abs(index.changePct).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
