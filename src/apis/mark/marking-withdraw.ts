import type { MarkingTaskResponse } from './marking-organization'
import http from '@/config/axios'

/** 阅卷任务提交撤销请求 - 对应后端 MarkingTaskWithdrawRequest */
export interface MarkingTaskWithdrawRequest {
  taskId: string
  withdrawReason?: string
}

/** 后端撤销窗口：10 分钟 */
export const MARKING_WITHDRAW_WINDOW_MS = 10 * 60 * 1000

/** 快捷撤销 UiAlertStrip 展示时长 */
export const MARKING_WITHDRAW_TOAST_MS = 10 * 1000

/** 工具栏最近提交列表上限 */
export const MARKING_RECENT_SUBMIT_MAX = 5

/**
 * 撤回已提交阅卷任务（10 分钟窗口内）。
 * POST /api/mark/organization/withdraw-task
 */
export function withdrawMarkingTask(request: MarkingTaskWithdrawRequest): Promise<MarkingTaskResponse> {
  return http.post<MarkingTaskResponse>('/api/mark/organization/withdraw-task', request)
}
