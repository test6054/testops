import type {
  ScanWorkOrderContextVO,
  ScanWorkOrderLifecycleVO,
} from '@/apis/mark/scanner-work-order'
import type { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { ScanWorkOrderStatusCode } from '@/types/enums/scan-work-order-status-enum'

/**
 * 将 work-order context 中的活动工单摘要合并进 lifecycle，保留同批次已有 pageCount/reportId 等字段。
 */
export function mergeWorkOrderLifecycleFromContext(
  context: ScanWorkOrderContextVO,
  taskKind: ScanTaskKindCode,
  previous: ScanWorkOrderLifecycleVO | null,
): ScanWorkOrderLifecycleVO | null {
  const snapshot = context.activeWorkOrderLifecycle
  const batchNo = context.activeBatchExternalNo
    ?? context.archiveContext?.activeBatchExternalNo
    ?? context.portfolioContext?.activeBatchExternalNo
    ?? snapshot?.batchExternalNo
  const status = context.activeWorkOrderStatus
    ?? context.archiveContext?.activeWorkOrderStatus
    ?? context.portfolioContext?.activeWorkOrderStatus
    ?? snapshot?.status
  if (
    !batchNo
    || !status
    || ![
      ScanWorkOrderStatusCode.COMMITTING,
      ScanWorkOrderStatusCode.FAILED,
      ScanWorkOrderStatusCode.IN_PROGRESS,
      ScanWorkOrderStatusCode.COMMITTED,
    ].includes(status)
  ) {
    return null
  }
  const preserve = previous?.batchExternalNo === batchNo ? previous : null
  const diagnostic = status === ScanWorkOrderStatusCode.FAILED
    || status === ScanWorkOrderStatusCode.COMMITTING
    ? (
        context.archiveContext?.activeWorkOrderDiagnostic
        ?? context.portfolioContext?.activeWorkOrderDiagnostic
        ?? snapshot?.diagnostic
        ?? preserve?.diagnostic
      )
    : preserve?.diagnostic
  return {
    ...preserve,
    ...snapshot,
    workOrderId: context.activeWorkOrderId
      ?? context.archiveContext?.activeWorkOrderId
      ?? context.portfolioContext?.activeWorkOrderId
      ?? snapshot?.workOrderId
      ?? preserve?.workOrderId,
    batchExternalNo: batchNo,
    status,
    taskKind: snapshot?.taskKind ?? preserve?.taskKind ?? taskKind,
    diagnostic,
    reportId: snapshot?.reportId ?? preserve?.reportId,
    pageCount: snapshot?.pageCount ?? preserve?.pageCount,
    resolvedScanConfig: snapshot?.resolvedScanConfig ?? preserve?.resolvedScanConfig,
    committedFileNodeId: snapshot?.committedFileNodeId ?? preserve?.committedFileNodeId,
    committedMaterialId: snapshot?.committedMaterialId ?? preserve?.committedMaterialId,
    committedQualityAiTaskId: snapshot?.committedQualityAiTaskId ?? preserve?.committedQualityAiTaskId,
    committedAiJobId: snapshot?.committedAiJobId ?? preserve?.committedAiJobId,
  }
}
