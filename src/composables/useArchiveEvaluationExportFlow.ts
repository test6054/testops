import type { ArchiveEvaluationExportResponse } from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { ref } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import { cancelEvaluationExport, getEvaluationExportProgress } from '@/apis/mark/archive-volume'
import { ArchiveEvaluationExportModeCode } from '@/types/enums/archive-evaluation-export-mode-enum'
import {
  ExportTaskStatusCode,
  ExportTaskStatusDescription,
} from '@/types/enums/export-task-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const EXPORT_POLL_INTERVAL_MS = 3000
const EXPORT_POLL_MAX_ATTEMPTS = 600

export interface ArchiveEvaluationExportFlowOptions {
  campaignId: string
  exportFn: (campaignId: string) => Promise<ArchiveEvaluationExportResponse>
  successMessage: string
  scopeHint?: string
  campaignLabel?: string
}

export interface ArchiveEvaluationExportTaskView {
  open: boolean
  taskId: string
  status: ExportTaskStatusCode
  volumeCount?: number
  errorMessage?: string
  campaignLabel?: string
  cancelling: boolean
}

export const archiveEvaluationExportTaskView = ref<ArchiveEvaluationExportTaskView | null>(null)

let pollAbortRequested = false

function isTerminalStatus(status: ExportTaskStatusCode): boolean {
  return (
    status === ExportTaskStatusCode.COMPLETED
    || status === ExportTaskStatusCode.FAILED
    || status === ExportTaskStatusCode.CANCELLED
  )
}

function exportStatusLabel(status: ExportTaskStatusCode): string {
  return strictEnumLabel(ExportTaskStatusDescription, status, 'exportTaskStatus')
}

function openExportTaskView(taskId: string, campaignLabel?: string): void {
  archiveEvaluationExportTaskView.value = {
    open: true,
    taskId,
    status: ExportTaskStatusCode.PENDING,
    campaignLabel,
    cancelling: false,
  }
}

function closeExportTaskView(): void {
  archiveEvaluationExportTaskView.value = null
}

function updateExportTaskView(progress: {
  status: ExportTaskStatusCode
  volumeCount?: number
  errorMessage?: string
}): void {
  const current = archiveEvaluationExportTaskView.value
  if (!current) {
    return
  }
  archiveEvaluationExportTaskView.value = {
    ...current,
    status: progress.status,
    volumeCount: progress.volumeCount,
    errorMessage: progress.errorMessage,
  }
}

async function pollEvaluationExportUntilDone(taskId: string): Promise<{
  exportFileId?: string
  volumeCount?: number
  errorMessage?: string
  status: ExportTaskStatusCode
}> {
  pollAbortRequested = false
  for (let attempt = 0; attempt < EXPORT_POLL_MAX_ATTEMPTS; attempt++) {
    if (pollAbortRequested) {
      return { status: ExportTaskStatusCode.CANCELLED }
    }
    await new Promise((resolve) => setTimeout(resolve, EXPORT_POLL_INTERVAL_MS))
    if (pollAbortRequested) {
      return { status: ExportTaskStatusCode.CANCELLED }
    }
    const progress = await getEvaluationExportProgress({ taskId })
    updateExportTaskView(progress)
    if (isTerminalStatus(progress.status)) {
      return {
        exportFileId: progress.exportFileId,
        volumeCount: progress.volumeCount,
        errorMessage: progress.errorMessage,
        status: progress.status,
      }
    }
  }
  throw new Error('迎评导出已超过最大等待时长')
}

/**
 * 执行迎评材料包导出：同步分支立即下载，异步分支展示进度并支持取消。
 */
export async function runArchiveEvaluationExportFlow(
  options: ArchiveEvaluationExportFlowOptions,
): Promise<void> {
  const result = await options.exportFn(options.campaignId)
  const exportMode = result.exportMode ?? ArchiveEvaluationExportModeCode.SYNC

  if (exportMode === ArchiveEvaluationExportModeCode.SYNC) {
    if (!result.exportFileId) {
      throw new Error('导出未返回文件 ID')
    }
    await downloadFile({ nodeId: result.exportFileId })
    const volumeHint = result.volumeCount != null ? `，共 ${result.volumeCount} 卷` : ''
    const scopeHint = options.scopeHint ? `（${options.scopeHint}）` : ''
    void message.success(`${options.successMessage}${volumeHint}${scopeHint}`)
    return
  }

  if (!result.taskId) {
    throw new Error('异步导出未返回任务 ID')
  }

  openExportTaskView(result.taskId, options.campaignLabel)
  void message.info(
    `批次卷数较多，已转入后台导出（${exportStatusLabel(result.status ?? ExportTaskStatusCode.PENDING)}）`,
  )
  try {
    const terminal = await pollEvaluationExportUntilDone(result.taskId)
    if (terminal.status === ExportTaskStatusCode.CANCELLED) {
      void message.warning('迎评导出已取消')
      return
    }
    if (terminal.status === ExportTaskStatusCode.FAILED) {
      throw new Error(terminal.errorMessage?.trim() || '迎评导出失败')
    }
    if (!terminal.exportFileId) {
      throw new Error('导出完成但未返回文件 ID')
    }
    await downloadFile({ nodeId: terminal.exportFileId })
    const volumeHint = terminal.volumeCount != null ? `，共 ${terminal.volumeCount} 卷` : ''
    const scopeHint = options.scopeHint ? `（${options.scopeHint}）` : ''
    void message.success(`${options.successMessage}${volumeHint}${scopeHint}`)
  } finally {
    closeExportTaskView()
  }
}

export async function cancelArchiveEvaluationExportTask(): Promise<void> {
  const current = archiveEvaluationExportTaskView.value
  if (!current || current.cancelling) {
    return
  }
  archiveEvaluationExportTaskView.value = { ...current, cancelling: true }
  pollAbortRequested = true
  try {
    await cancelEvaluationExport({ taskId: current.taskId })
    void message.success('已提交取消迎评导出任务')
  } catch (error) {
    pollAbortRequested = false
    showUserError(error, '取消迎评导出失败')
    if (archiveEvaluationExportTaskView.value) {
      archiveEvaluationExportTaskView.value = {
        ...archiveEvaluationExportTaskView.value,
        cancelling: false,
      }
    }
  }
}
