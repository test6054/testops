import type { ExamWorkbenchScanMonitorPanelResponse } from '@/apis/mark/exam-progress'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import {
  ExamScanMonitorSignalActionKeyCode,
  ExamScanMonitorSignalCode,
} from '@/apis/mark/exam-progress'
import { ExamScanBatchWorkbenchSignalBandToneCode } from '@/types/enums/exam-scan-batch-workbench-signal-band-tone-enum'
import { ExamScanMonitorSignalToneCode } from '@/types/enums/exam-scan-monitor-signal-tone-enum'

export type ScanMonitorAlertTone = 'error' | 'success' | 'info' | 'warning'

/** SignalBand 色调映射为 UiAlertStrip tone */
export function mapScanMonitorSignalBandToneToAlert(
  tone: ExamScanMonitorSignalToneCode | undefined,
): ScanMonitorAlertTone {
  switch (tone) {
    case ExamScanMonitorSignalToneCode.RED:
      return 'error'
    case ExamScanMonitorSignalToneCode.GREEN:
      return 'success'
    case ExamScanMonitorSignalToneCode.BLUE:
      return 'info'
    case ExamScanMonitorSignalToneCode.AMBER:
    case ExamScanMonitorSignalToneCode.ORANGE:
      return 'warning'
    default:
      return 'info'
  }
}

/** KPI 主指标色调映射为 SignalMetric tone */
export function mapScanMonitorPrimaryMetricTone(
  tone: ExamScanMonitorSignalToneCode | undefined,
  fallback: SignalMetric['tone'],
): SignalMetric['tone'] {
  switch (tone) {
    case ExamScanMonitorSignalToneCode.GREEN:
      return 'green'
    case ExamScanMonitorSignalToneCode.BLUE:
      return 'blue'
    case ExamScanMonitorSignalToneCode.ORANGE:
      return 'orange'
    case ExamScanMonitorSignalToneCode.RED:
      return 'red'
    case ExamScanMonitorSignalToneCode.GRAY:
      return 'gray'
    default:
      return fallback
  }
}

export function formatScanMonitorBatchHelper(
  panel: ExamWorkbenchScanMonitorPanelResponse,
): string | undefined {
  const parts: string[] = []
  if (panel.inProgressCount > 0) {
    parts.push(`进行中 ${panel.inProgressCount}`)
  }
  if (panel.blockedCount > 0) {
    parts.push(`阻断 ${panel.blockedCount}`)
  }
  return parts.length > 0 ? parts.join(' · ') : undefined
}

export function resolveScanMonitorSignalActionLabel(
  panel: ExamWorkbenchScanMonitorPanelResponse,
): string {
  switch (panel.signalActionKey) {
    case ExamScanMonitorSignalActionKeyCode.UPLOAD_ROSTER:
      return '去上传名册'
    case ExamScanMonitorSignalActionKeyCode.VIEW_ATTENTION:
      return '查看异常队列'
    case ExamScanMonitorSignalActionKeyCode.PUBLISH_SCORE:
      return '去提交复核'
    case ExamScanMonitorSignalActionKeyCode.REFRESH:
      return '刷新数据'
    default:
      break
  }
  switch (panel.signalCode) {
    case ExamScanMonitorSignalCode.PAGE_REGISTER_PENDING:
      return panel.blockedCount > 0 ? '查看阻断批次' : '刷新数据'
    case ExamScanMonitorSignalCode.PARTIAL_TAIL:
    case ExamScanMonitorSignalCode.INCIDENT_OPEN:
      return '查看异常队列'
    case ExamScanMonitorSignalCode.AWAITING_FIRST_SCAN_INFERENCE:
      return '刷新数据'
    default:
      return ''
  }
}

export function buildScanMonitorSignalMetrics(
  panel: ExamWorkbenchScanMonitorPanelResponse | null,
  loadFailed: boolean,
  options: {
    activeTab: 'normal' | 'abnormal' | 'duplicate'
    attentionTypeFilterActive: boolean
  },
): SignalMetric[] {
  if (loadFailed) {
    return [{
      key: 'monitor-load-failed',
      label: '监控 KPI',
      value: '加载失败',
      tone: 'red',
      emphasis: 'primary',
    }]
  }
  if (!panel) {
    return [{
      key: 'monitor-empty',
      label: '监控 KPI',
      value: '—',
      tone: 'gray',
      emphasis: 'primary',
    }]
  }

  const pool: SignalMetric[] = [
    {
      key: 'attention',
      label: '扫描异常',
      value: panel.abnormalAttentionCount,
      unit: '条',
      tone: panel.abnormalAttentionCount > 0 ? 'orange' : 'green',
      clickable: panel.abnormalAttentionCount > 0,
      active: options.activeTab === 'abnormal' && !options.attentionTypeFilterActive,
      helper: panel.abnormalAttentionCount > 0 ? '打开异常 tab' : '扫描异常清零',
    },
    {
      key: 'missing-candidate',
      label: '缺失考生',
      value: panel.missingCandidateCount,
      tone: panel.missingCandidateCount > 0 ? 'red' : 'green',
      clickable: panel.missingCandidateCount > 0,
      helper: panel.missingCandidateCount > 0 ? '查看缺失名册异常' : undefined,
    },
    {
      key: 'duplicate-page',
      label: '重复影像',
      value: panel.duplicateAttentionCount,
      tone: panel.duplicateAttentionCount > 0 ? 'orange' : 'green',
      clickable: panel.duplicateAttentionCount > 0,
      active: options.activeTab === 'duplicate',
      helper: panel.duplicateAttentionCount > 0 ? '打开重复 tab' : undefined,
    },
    {
      key: 'orphan-event',
      label: '游离页事件',
      value: panel.orphanPendingEventCount,
      unit: '条',
      tone: panel.orphanPendingEventCount > 0 ? 'orange' : 'gray',
      clickable: panel.orphanPendingEventCount > 0,
      helper: panel.orphanPendingEventCount > 0 ? '前往批次工作台回收' : undefined,
    },
    {
      key: 'batch',
      label: '扫描批次',
      value: `${panel.settledBatchCount}/${panel.batchTotal}`,
      tone: 'blue',
      helper: formatScanMonitorBatchHelper(panel),
    },
    {
      key: 'scanned-page',
      label: '已扫描页',
      value: panel.progressDisplay ?? panel.scannedPageCount,
      tone: mapScanMonitorPrimaryMetricTone(
        panel.primaryMetricTone,
        panel.scannedPageCount > 0 ? 'green' : 'gray',
      ),
      helper: panel.progressPercent != null ? `扫描进度 ${panel.progressPercent}%` : undefined,
      showProgress: panel.progressPercent != null,
      progress: panel.progressPercent ?? undefined,
    },
    {
      key: 'bound-paper',
      label: '已绑定',
      value: panel.boundPaperCount,
      tone: panel.boundPaperCount > 0 ? 'green' : 'gray',
    },
  ]

  const primaryCandidate
    = pool.find((item) => item.key === 'attention' && Number(item.value) > 0)
      ?? pool.find((item) => item.key === 'missing-candidate' && Number(item.value) > 0)
      ?? pool.find((item) => item.key === 'duplicate-page' && Number(item.value) > 0)
      ?? pool.find((item) => item.key === 'orphan-event' && Number(item.value) > 0)
      ?? pool.find((item) => item.key === 'scanned-page')
      ?? pool[0]

  const actionLabel = resolveScanMonitorSignalActionLabel(panel) || undefined
  const primary: SignalMetric = {
    ...primaryCandidate,
    emphasis: 'primary',
    actionLabel: primaryCandidate.clickable || actionLabel ? (actionLabel || '查看详情') : undefined,
  }

  return [
    primary,
    ...pool
      .filter((item) => item.key !== primary.key)
      .slice(0, 3)
      .map((item) => ({ ...item, emphasis: 'secondary' as const })),
  ]
}

export function mapScanBatchWorkbenchSignalBandToneToAlert(
  tone: ExamScanBatchWorkbenchSignalBandToneCode | undefined,
): ScanMonitorAlertTone {
  switch (tone) {
    case ExamScanBatchWorkbenchSignalBandToneCode.ERROR:
      return 'error'
    case ExamScanBatchWorkbenchSignalBandToneCode.WARNING:
      return 'warning'
    case ExamScanBatchWorkbenchSignalBandToneCode.INFO:
      return 'info'
    default:
      return 'info'
  }
}

export function mapScanBatchWorkbenchSignalBandToneToBadge(
  tone: ExamScanBatchWorkbenchSignalBandToneCode | undefined,
): BadgeTone {
  switch (tone) {
    case ExamScanBatchWorkbenchSignalBandToneCode.ERROR:
      return 'red'
    case ExamScanBatchWorkbenchSignalBandToneCode.WARNING:
      return 'orange'
    case ExamScanBatchWorkbenchSignalBandToneCode.INFO:
      return 'blue'
    default:
      return 'gray'
  }
}
