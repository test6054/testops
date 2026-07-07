/** 本地扫描 Agent 更新包状态 */
export enum AgentUpdateStatusCode {
  NONE = 'NONE',
  AVAILABLE = 'AVAILABLE',
  DOWNLOADING = 'DOWNLOADING',
  DOWNLOADED = 'DOWNLOADED',
  INSTALLING = 'INSTALLING',
  INSTALLED = 'INSTALLED',
  FAILED = 'FAILED',
}

export const ALL_AGENT_UPDATE_STATUS_CODES: readonly AgentUpdateStatusCode[] = [
  AgentUpdateStatusCode.NONE,
  AgentUpdateStatusCode.AVAILABLE,
  AgentUpdateStatusCode.DOWNLOADING,
  AgentUpdateStatusCode.DOWNLOADED,
  AgentUpdateStatusCode.INSTALLING,
  AgentUpdateStatusCode.INSTALLED,
  AgentUpdateStatusCode.FAILED,
]

export const AgentUpdateStatusDescription: Record<AgentUpdateStatusCode, string> = {
  [AgentUpdateStatusCode.NONE]: '无更新',
  [AgentUpdateStatusCode.AVAILABLE]: '可下载',
  [AgentUpdateStatusCode.DOWNLOADING]: '下载中',
  [AgentUpdateStatusCode.DOWNLOADED]: '已下载',
  [AgentUpdateStatusCode.INSTALLING]: '安装中',
  [AgentUpdateStatusCode.INSTALLED]: '已安装',
  [AgentUpdateStatusCode.FAILED]: '更新失败',
}

