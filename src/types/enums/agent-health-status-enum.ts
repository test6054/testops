/** 本地扫描 Agent 健康状态 */
export enum AgentHealthStatusCode {
  RUNNING = 'RUNNING',
}

export const ALL_AGENT_HEALTH_STATUS_CODES: readonly AgentHealthStatusCode[] = [
  AgentHealthStatusCode.RUNNING,
]

export const AgentHealthStatusDescription: Record<AgentHealthStatusCode, string> = {
  [AgentHealthStatusCode.RUNNING]: '运行中',
}

