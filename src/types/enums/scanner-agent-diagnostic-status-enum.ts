/** 扫描 Agent 诊断状态（服务端设备视图） */
export enum ScannerAgentDiagnosticStatusCode {
  OK = 'OK',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  AGENT_OFFLINE = 'AGENT_OFFLINE',
}

export const ALL_SCANNER_AGENT_DIAGNOSTIC_STATUS_CODES: readonly ScannerAgentDiagnosticStatusCode[] = [
  ScannerAgentDiagnosticStatusCode.OK,
  ScannerAgentDiagnosticStatusCode.WARNING,
  ScannerAgentDiagnosticStatusCode.ERROR,
  ScannerAgentDiagnosticStatusCode.AGENT_OFFLINE,
]

export const ScannerAgentDiagnosticStatusDescription: Record<ScannerAgentDiagnosticStatusCode, string> = {
  [ScannerAgentDiagnosticStatusCode.OK]: '正常',
  [ScannerAgentDiagnosticStatusCode.WARNING]: '警告',
  [ScannerAgentDiagnosticStatusCode.ERROR]: '错误',
  [ScannerAgentDiagnosticStatusCode.AGENT_OFFLINE]: 'Agent 离线',
}
