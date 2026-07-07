/** 扫描派单状态 */
export enum ScanDispatchTicketStatusCode {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUSPENDED = 'SUSPENDED',
  DONE = 'DONE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const ALL_SCAN_DISPATCH_TICKET_STATUS_CODES: readonly ScanDispatchTicketStatusCode[] = [
  ScanDispatchTicketStatusCode.PENDING,
  ScanDispatchTicketStatusCode.PROCESSING,
  ScanDispatchTicketStatusCode.SUSPENDED,
  ScanDispatchTicketStatusCode.DONE,
  ScanDispatchTicketStatusCode.EXPIRED,
  ScanDispatchTicketStatusCode.CANCELLED,
]
export const ScanDispatchTicketStatusDescription: Record<ScanDispatchTicketStatusCode, string> = {
  [ScanDispatchTicketStatusCode.PENDING]: '待处理',
  [ScanDispatchTicketStatusCode.PROCESSING]: '处理中',
  [ScanDispatchTicketStatusCode.SUSPENDED]: '已挂起',
  [ScanDispatchTicketStatusCode.DONE]: '已完成',
  [ScanDispatchTicketStatusCode.EXPIRED]: '已过期',
  [ScanDispatchTicketStatusCode.CANCELLED]: '已取消',
}
