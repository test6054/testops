import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 扫描批次工作台页级名册匹配态，与后端 ScanBatchWorkbenchRosterMatchStatus 逐值一致 */
export enum ScanBatchWorkbenchRosterMatchStatusCode {
  AWAITING_REGISTRATION = 'AWAITING_REGISTRATION',
  AWAITING_OCR = 'AWAITING_OCR',
  ROSTER_BOUND = 'ROSTER_BOUND',
  AUTO_MATCHED = 'AUTO_MATCHED',
  PENDING_CONFIRM = 'PENDING_CONFIRM',
  NO_MATCH = 'NO_MATCH',
}

export const ALL_SCAN_BATCH_WORKBENCH_ROSTER_MATCH_STATUS_CODES: readonly ScanBatchWorkbenchRosterMatchStatusCode[] = [
  ScanBatchWorkbenchRosterMatchStatusCode.AWAITING_REGISTRATION,
  ScanBatchWorkbenchRosterMatchStatusCode.AWAITING_OCR,
  ScanBatchWorkbenchRosterMatchStatusCode.ROSTER_BOUND,
  ScanBatchWorkbenchRosterMatchStatusCode.AUTO_MATCHED,
  ScanBatchWorkbenchRosterMatchStatusCode.PENDING_CONFIRM,
  ScanBatchWorkbenchRosterMatchStatusCode.NO_MATCH,
]

export const ScanBatchWorkbenchRosterMatchStatusDescription: Record<ScanBatchWorkbenchRosterMatchStatusCode, string> = {
  [ScanBatchWorkbenchRosterMatchStatusCode.AWAITING_REGISTRATION]: '待登记',
  [ScanBatchWorkbenchRosterMatchStatusCode.AWAITING_OCR]: '待识别',
  [ScanBatchWorkbenchRosterMatchStatusCode.ROSTER_BOUND]: '已绑定名册',
  [ScanBatchWorkbenchRosterMatchStatusCode.AUTO_MATCHED]: '自动匹配成功',
  [ScanBatchWorkbenchRosterMatchStatusCode.PENDING_CONFIRM]: '待人工确认',
  [ScanBatchWorkbenchRosterMatchStatusCode.NO_MATCH]: '无匹配',
}

export const ScanBatchWorkbenchRosterMatchStatusTone: Record<ScanBatchWorkbenchRosterMatchStatusCode, BadgeTone> = {
  [ScanBatchWorkbenchRosterMatchStatusCode.AWAITING_REGISTRATION]: 'gray',
  [ScanBatchWorkbenchRosterMatchStatusCode.AWAITING_OCR]: 'blue',
  [ScanBatchWorkbenchRosterMatchStatusCode.ROSTER_BOUND]: 'green',
  [ScanBatchWorkbenchRosterMatchStatusCode.AUTO_MATCHED]: 'purple',
  [ScanBatchWorkbenchRosterMatchStatusCode.PENDING_CONFIRM]: 'orange',
  [ScanBatchWorkbenchRosterMatchStatusCode.NO_MATCH]: 'red',
}

