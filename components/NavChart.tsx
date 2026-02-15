'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface NavChartProps {
  data: Record<string, Array<{ date: string; nav: number; totalValue: number }>>;
}

const AGENT_COLORS: Record<string, string> = {
  buffett: '#10b981', // green
  soros: '#f59e0b',   // yellow
  simons: '#3b82f6',  // blue
};

const AGENT_NAMES: Record<string, string> = {
  buffett: '巴菲特',
  soros: '索罗斯',
  simons: '西蒙斯',
};

export function NavChart({ data }: NavChartProps) {
  // 将数据转换为图表需要的格式
  const agentIds = Object.keys(data);
  
  if (agentIds.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500">暂无净值数据</p>
          <p className="text-gray-600 text-sm mt-2">运行每日交易后将显示图表</p>
        </div>
      </div>
    );
  }

  // 合并所有 agent 的数据
  const dates = data[agentIds[0]]?.map((d) => d.date) || [];
  const chartData = dates.map((date, index) => {
    const point: Record<string, any> = { date };
    agentIds.forEach((agentId) => {
      const agentData = data[agentId];
      if (agentData && agentData[index]) {
        point[agentId] = agentData[index].nav;
      }
    });
    return point;
  });

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            domain={['auto', 'auto']}
            tickFormatter={(value) => value.toFixed(3)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [value.toFixed(4), '净值']}
            labelFormatter={(label) => `日期: ${label}`}
          />
          <Legend />
          {agentIds.map((agentId) => (
            <Line
              key={agentId}
              type="monotone"
              dataKey={agentId}
              name={AGENT_NAMES[agentId] || agentId}
              stroke={AGENT_COLORS[agentId] || '#8884d8'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
