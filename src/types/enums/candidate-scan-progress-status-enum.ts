/** 考生名册扫描进度状态 */

export enum CandidateScanProgressStatusCode {

  NOT_SCANNED = 'NOT_SCANNED',

  SCANNED_UNBOUND = 'SCANNED_UNBOUND',

  BOUND = 'BOUND',

  CONFLICT = 'CONFLICT',

  DISCARDED = 'DISCARDED',

  ABSENT = 'ABSENT',

  ATTENTION_OPEN = 'ATTENTION_OPEN',

  INCOMPLETE_SCAN = 'INCOMPLETE_SCAN',

}



export const ALL_CANDIDATE_SCAN_PROGRESS_STATUS_CODES: readonly CandidateScanProgressStatusCode[] = [

  CandidateScanProgressStatusCode.NOT_SCANNED,

  CandidateScanProgressStatusCode.SCANNED_UNBOUND,

  CandidateScanProgressStatusCode.BOUND,

  CandidateScanProgressStatusCode.CONFLICT,

  CandidateScanProgressStatusCode.DISCARDED,

  CandidateScanProgressStatusCode.ABSENT,

  CandidateScanProgressStatusCode.ATTENTION_OPEN,

  CandidateScanProgressStatusCode.INCOMPLETE_SCAN,

]



export const CandidateScanProgressStatusDescription: Record<CandidateScanProgressStatusCode, string> = {

  [CandidateScanProgressStatusCode.NOT_SCANNED]: '未扫描',

  [CandidateScanProgressStatusCode.SCANNED_UNBOUND]: '已扫未绑',

  [CandidateScanProgressStatusCode.BOUND]: '已绑定',

  [CandidateScanProgressStatusCode.CONFLICT]: '绑定冲突',

  [CandidateScanProgressStatusCode.DISCARDED]: '已废弃',

  [CandidateScanProgressStatusCode.ABSENT]: '缺考',

  [CandidateScanProgressStatusCode.ATTENTION_OPEN]: '待处理异常',

  [CandidateScanProgressStatusCode.INCOMPLETE_SCAN]: '扫描不完整',

}



export const CANDIDATE_SCAN_PROGRESS_STATUS_TONE: Record<CandidateScanProgressStatusCode, 'gray' | 'blue' | 'green' | 'orange' | 'red'> = {

  [CandidateScanProgressStatusCode.NOT_SCANNED]: 'gray',

  [CandidateScanProgressStatusCode.SCANNED_UNBOUND]: 'orange',

  [CandidateScanProgressStatusCode.BOUND]: 'green',

  [CandidateScanProgressStatusCode.CONFLICT]: 'red',

  [CandidateScanProgressStatusCode.DISCARDED]: 'gray',

  [CandidateScanProgressStatusCode.ABSENT]: 'red',

  [CandidateScanProgressStatusCode.ATTENTION_OPEN]: 'orange',

  [CandidateScanProgressStatusCode.INCOMPLETE_SCAN]: 'orange',

}



export function isCandidateScanProgressStatusCode(value: string): value is CandidateScanProgressStatusCode {
  return (ALL_CANDIDATE_SCAN_PROGRESS_STATUS_CODES as readonly string[]).includes(value)
}

