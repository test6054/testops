import type { ExamScannerBatchResponse } from '@/apis/mark/exam-scan'
import { ScanBatchStatusCode } from '@/types/enums/scan-batch-status-enum'

/** 封存检查项：与后端 executeSealScanBatch 前置规则对齐。 */
export interface BatchSealCheckItem {
  key: string
  ok: boolean
  label: string
  detail?: string
}

/**
 * 推导批次封存阻断原因；空字符串表示可封存。
 */
export function batchSealBlockedReason(batch: ExamScannerBatchResponse): string {
  if (batch.sealedTime) return '批次已封存'
  if (batch.status === ScanBatchStatusCode.DISCARDED || batch.discardedTime) return '批次已废弃'
  if (batch.status === ScanBatchStatusCode.IN_PROGRESS) return '批次尚未完成提交'
  if (batch.status === ScanBatchStatusCode.BLOCKED) return '批次已阻断，请先处理异常'
  if (!batch.scannerDeviceId?.trim() || !batch.scannerStationId?.trim()) {
    return '批次缺少扫描设备信息'
  }
  const declared = batch.pageCount ?? 0
  const received = batch.receivedPageCount ?? 0
  const pending = batch.pendingUploadCount ?? Math.max(0, declared - received)
  if (pending > 0) return `仍有 ${pending} 页未落库`
  const attention = batch.attentionItemCount ?? 0
  if (attention > 0) return `仍有 ${attention} 项扫描异常未处置`
  if (batch.orderAuditAttentionPending === true) {
    return '存在余页 collate attention 待确认，请先忽略并继续或人工合并后再封存'
  }
  if (received > 0 && batch.orderAuditPassed !== true) {
    if (batch.orderAuditPassed === false) {
      const issueCount = batch.orderAuditIssueCount ?? 0
      return issueCount > 0
        ? `顺序审计未通过，存在 ${issueCount} 项顺序异常`
        : '顺序审计未通过，请先补扫或废弃后再封存'
    }
    return '顺序审计尚未完成，请刷新后重试'
  }
  return ''
}

export function canSealBatch(batch: ExamScannerBatchResponse): boolean {
  return batchSealBlockedReason(batch) === ''
}

/**
 * 封存确认弹窗检查清单。
 */
export function buildBatchSealChecklist(batch: ExamScannerBatchResponse): BatchSealCheckItem[] {
  const declared = batch.pageCount ?? 0
  const received = batch.receivedPageCount ?? 0
  const pending = batch.pendingUploadCount ?? Math.max(0, declared - received)
  const attention = batch.attentionItemCount ?? 0
  return [
    {
      key: 'not-sealed',
      ok: !batch.sealedTime,
      label: '批次未封存',
      detail: batch.sealedTime ? '已封存' : '可执行封存',
    },
    {
      key: 'not-discarded',
      ok: batch.status !== ScanBatchStatusCode.DISCARDED && !batch.discardedTime,
      label: '批次未废弃',
      detail: batch.status === ScanBatchStatusCode.DISCARDED || batch.discardedTime ? '已废弃' : '状态正常',
    },
    {
      key: 'committed',
      ok: batch.status !== ScanBatchStatusCode.IN_PROGRESS,
      label: '批次已完成提交',
      detail: batch.status === ScanBatchStatusCode.IN_PROGRESS ? '仍在进行中' : batch.statusMessage,
    },
    {
      key: 'not-blocked',
      ok: batch.status !== ScanBatchStatusCode.BLOCKED,
      label: '批次未阻断',
      detail: batch.status === ScanBatchStatusCode.BLOCKED ? '请先处理阻断原因' : '无阻断',
    },
    {
      key: 'pages-received',
      ok: pending === 0 && received >= 1,
      label: '扫描页已全部落库',
      detail: received >= 1 ? `${received} / ${declared} 页已落库` : '尚无落库页',
    },
    {
      key: 'no-attention',
      ok: attention === 0,
      label: '无未处理异常项',
      detail: attention === 0 ? '所有异常已处置' : `仍有 ${attention} 项未处理`,
    },
    {
      key: 'collate-attention',
      ok: batch.orderAuditAttentionPending !== true,
      label: 'collate attention 已确认',
      detail: batch.orderAuditAttentionPending === true
        ? '余页待教师确认'
        : batch.orderAuditIssueCount
          ? '已确认或无需确认'
          : '无 collate attention',
    },
    {
      key: 'order-audit',
      ok: batch.orderAuditPassed === true || (received < 1 && batch.orderAuditPassed !== false),
      label: '顺序审计通过',
      detail: batch.orderAuditPassed === false
        ? `未通过${batch.orderAuditIssueCount ? `（${batch.orderAuditIssueCount} 项）` : ''}`
        : batch.orderAuditAttentionPending === true
          ? `通过（${batch.orderAuditIssueCount ?? 0} 项 attention 待确认）`
          : batch.orderAuditPassed === true
            ? batch.orderAuditIssueCount
              ? `通过（已确认 ${batch.orderAuditIssueCount} 项 attention）`
              : '固定 collate 顺序正常'
            : received > 0
              ? '尚未执行'
              : '尚无落库页',
    },
    {
      key: 'has-device',
      ok: Boolean(batch.scannerDeviceId?.trim() && batch.scannerStationId?.trim()),
      label: '批次设备信息完整',
      detail: batch.scannerDeviceId
        ? `${batch.scannerDeviceId} · ${batch.scannerStationId || '—'}`
        : '缺少设备信息',
    },
  ]
}

/**
 * 封存确认文案：供 confirmAsync content 使用。
 */
export function formatBatchSealConfirmContent(batch: ExamScannerBatchResponse): string {
  const intro = `封存批次 ${batch.batchNo} 后，扫描端将无法再向该批次追加页面。`
  const checklistLines = buildBatchSealChecklist(batch).map((item) => {
    const mark = item.ok ? '✓' : '✗'
    const detail = item.detail ? `（${item.detail}）` : ''
    return `${mark} ${item.label}${detail}`
  })
  return [intro, '', '封存前检查：', ...checklistLines].join('\n')
}
