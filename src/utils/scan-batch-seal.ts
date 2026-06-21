import type { ExamScannerBatchVO } from '@/apis/mark/exam-scan'

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
export function batchSealBlockedReason(batch: ExamScannerBatchVO): string {
  if (batch.sealedAt) return '批次已封存'
  if (batch.status === 'DISCARDED' || batch.discardedAt) return '批次已废弃'
  if (batch.status === 'IN_PROGRESS') return '批次尚未完成提交'
  if (batch.status === 'BLOCKED') return '批次已阻断，请先处理异常'
  if (!batch.scannerDeviceId?.trim() || !batch.scannerStationId?.trim()) {
    return '批次缺少扫描设备信息'
  }
  const declared = batch.pageCount ?? 0
  const received = batch.receivedPageCount ?? 0
  const pending = batch.pendingUploadCount ?? Math.max(0, declared - received)
  if (pending > 0) return `仍有 ${pending} 页未落库`
  const attention = batch.attentionItemCount ?? 0
  if (attention > 0) return `仍有 ${attention} 项扫描异常未处置`
  return ''
}

export function canSealBatch(batch: ExamScannerBatchVO): boolean {
  return batchSealBlockedReason(batch) === ''
}

/**
 * 封存确认弹窗检查清单。
 */
export function buildBatchSealChecklist(batch: ExamScannerBatchVO): BatchSealCheckItem[] {
  const declared = batch.pageCount ?? 0
  const received = batch.receivedPageCount ?? 0
  const pending = batch.pendingUploadCount ?? Math.max(0, declared - received)
  const attention = batch.attentionItemCount ?? 0
  return [
    {
      key: 'not-sealed',
      ok: !batch.sealedAt,
      label: '批次未封存',
      detail: batch.sealedAt ? '已封存' : '可执行封存',
    },
    {
      key: 'not-discarded',
      ok: batch.status !== 'DISCARDED' && !batch.discardedAt,
      label: '批次未废弃',
      detail: batch.status === 'DISCARDED' || batch.discardedAt ? '已废弃' : '状态正常',
    },
    {
      key: 'committed',
      ok: batch.status !== 'IN_PROGRESS',
      label: '批次已完成提交',
      detail: batch.status === 'IN_PROGRESS' ? '仍在进行中' : batch.statusMessage,
    },
    {
      key: 'not-blocked',
      ok: batch.status !== 'BLOCKED',
      label: '批次未阻断',
      detail: batch.status === 'BLOCKED' ? '请先处理阻断原因' : '无阻断',
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
      key: 'has-device',
      ok: Boolean(batch.scannerDeviceId?.trim() && batch.scannerStationId?.trim()),
      label: '批次设备信息完整',
      detail: batch.scannerDeviceId
        ? `${batch.scannerDeviceId} · ${batch.scannerStationId || '—'}`
        : '缺少设备信息',
    },
  ]
}
