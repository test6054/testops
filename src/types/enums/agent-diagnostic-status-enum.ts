/** 本地扫描 Agent 诊断状态（Agent 协议） */
export enum AgentDiagnosticStatusCode {
  OK = 'OK',
  WARNING = 'WARNING',
}

export const ALL_AGENT_DIAGNOSTIC_STATUS_CODES: readonly AgentDiagnosticStatusCode[] = [
  AgentDiagnosticStatusCode.OK,
  AgentDiagnosticStatusCode.WARNING,
]

export const AgentDiagnosticStatusDescription: Record<AgentDiagnosticStatusCode, string> = {
  [AgentDiagnosticStatusCode.OK]: '正常',
  [AgentDiagnosticStatusCode.WARNING]: '警告',
}
