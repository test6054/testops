import type { ArchiveExternalImportResultVO } from '@/apis/mark/archive-volume'
import type { ExcelImportResult } from '@/apis/platform/types'
import type { UiAlertStripTone } from '@/components/ui-guide/ui/types'
import { ArchiveImportBatchStatusDescription } from '@/apis/mark/archive-volume'
import { ArchiveImportBatchStatusCode } from '@/types/enums/archive-import-batch-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

export function archiveImportResultTone(status: ArchiveImportBatchStatusCode): UiAlertStripTone {
  if (status === ArchiveImportBatchStatusCode.SUCCESS) {
    return 'success'
  }
  if (status === ArchiveImportBatchStatusCode.PARTIAL_FAILED) {
    return 'warning'
  }
  return 'error'
}

export function buildArchiveImportFailureSummaries(result: ExcelImportResult): string[] {
  return (result.diagnostics ?? [])
    .filter((row) => !row.valid)
    .map((row) => `第 ${row.rowIndex} 行：${row.invalidReason ?? '导入失败'}`)
}

export function mapExcelImportResultToArchiveBatch(
  result: ExcelImportResult,
): ArchiveExternalImportResultVO | null {
  if (!result.batchId) {
    return null
  }
  const batchStatus = resolveArchiveImportBatchStatus(result.batchStatus)
  if (!batchStatus) {
    return null
  }
  return {
    batchId: result.batchId,
    batchNo: result.batchNo ?? result.batchId,
    batchStatus,
    totalCount: result.totalRows ?? 0,
    successCount: result.successRows ?? 0,
    failureCount: result.errorRows ?? 0,
  }
}

export function buildArchiveImportResultDescription(
  result: ArchiveExternalImportResultVO,
  failureSummaries: string[],
): string {
  const statusLabel = strictEnumLabel(
    ArchiveImportBatchStatusDescription,
    result.batchStatus,
    '归档导入批次状态',
  )
  let text = `${statusLabel}：成功 ${result.successCount} 条，失败 ${result.failureCount} 条，共 ${result.totalCount} 条`
  if (failureSummaries.length > 0) {
    text += `；${failureSummaries.join('；')}`
  }
  return text
}

function resolveArchiveImportBatchStatus(
  status: string | undefined,
): ArchiveImportBatchStatusCode | null {
  if (status === ArchiveImportBatchStatusCode.PROCESSING)
    return ArchiveImportBatchStatusCode.PROCESSING
  if (status === ArchiveImportBatchStatusCode.SUCCESS) return ArchiveImportBatchStatusCode.SUCCESS
  if (status === ArchiveImportBatchStatusCode.PARTIAL_FAILED)
    return ArchiveImportBatchStatusCode.PARTIAL_FAILED
  if (status === ArchiveImportBatchStatusCode.FAILED) return ArchiveImportBatchStatusCode.FAILED
  showUserError(null, '归档导入批次状态异常')
  return null
}

export function buildMissingBatchImportFailure(): {
  result: ArchiveExternalImportResultVO
  failureSummaries: string[]
} {
  return {
    result: {
      batchId: '',
      batchNo: '—',
      batchStatus: ArchiveImportBatchStatusCode.FAILED,
      totalCount: 0,
      successCount: 0,
      failureCount: 0,
    },
    failureSummaries: ['导入结果缺少批次号，请重试或联系管理员排查'],
  }
}
