import type { RouteLocationRaw } from 'vue-router'

/** 扫描阶段入口分流上下文（对齐 MarkingProgressVO.scanAttentionCount） */
export interface ScanStageEntryContext {
  scanAttentionCount?: number
}

/**
 * 解析扫描阶段默认落点（业界主流：无异常 → 录入与批次；有 scanAttention → 监控处置）。
 */
export function resolveScanStageEntryRoute(
  examId: string,
  context?: ScanStageEntryContext | null,
): RouteLocationRaw {
  if ((context?.scanAttentionCount ?? 0) > 0) {
    return { name: 'TeacherExamWorkspaceScanMonitor', params: { examId } }
  }
  return { name: 'TeacherExamWorkspaceScanBatches', params: { examId } }
}
