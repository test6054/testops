import type { MarkingTaskResponse } from './marking-organization'
import http from '@/config/axios'

/** 阅卷任务提交撤销请求 - 对应后端 MarkingTaskWithdrawRequest */
export interface MarkingTaskWithdrawRequest {
  taskId: string
  withdrawReason?: string
}

/** 快捷撤销 UiAlertStrip 展示时长 */
export const MARKING_WITHDRAW_TOAST_MS = 10 * 1000

/** 工具栏最近提交列表上限 */
export const MARKING_RECENT_SUBMIT_MAX = 5

/** 将租户配置的撤回窗口分钟数转为毫秒；须为后端 delayedFinalScoreConfirmMinutes 真源。 */
export function resolveMarkingWithdrawWindowMs(withdrawWindowMinutes: number): number {
  if (!Number.isFinite(withdrawWindowMinutes) || withdrawWindowMinutes < 1 || withdrawWindowMinutes > 120) {
    throw new Error(`租户撤回窗口分钟数无效：${withdrawWindowMinutes}`)
  }
  return withdrawWindowMinutes * 60 * 1000
}

/** 格式化撤回窗口展示文案 */
export function formatMarkingWithdrawWindowLabel(withdrawWindowMinutes: number): string {
  return `${withdrawWindowMinutes} 分钟内有效`
}

/**
 * 撤回已提交阅卷任务（租户配置的撤回窗口内）。
 * POST /api/mark/organization/task/withdraw
 */
export function withdrawMarkingTask(request: MarkingTaskWithdrawRequest): Promise<MarkingTaskResponse> {
  return http.post<MarkingTaskResponse>('/api/mark/organization/task/withdraw', request)
}
