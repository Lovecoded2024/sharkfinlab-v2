import { buffettAgent } from './buffett-agent';
import { sorosAgent } from './soros-agent';
import { simonsAgent } from './simons-agent';
import { BaseTraderAgent, MarketContext } from './base-agent';

// 导出所有 agent
export const agents: Map<string, BaseTraderAgent> = new Map<string, BaseTraderAgent>([
  ['buffett', buffettAgent],
  ['soros', sorosAgent],
  ['simons', simonsAgent],
]);

export function getAgent(id: string): BaseTraderAgent | undefined {
  return agents.get(id);
}

export function getAllAgents(): BaseTraderAgent[] {
  return Array.from(agents.values());
}

export { buffettAgent, sorosAgent, simonsAgent };
export * from './base-agent';
