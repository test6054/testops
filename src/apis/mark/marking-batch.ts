import type { MarkingPageAnnotationSubmitItem, MarkingQuestionScoreSubmitItem } from './marking-organization'
import http from '@/config/axios'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 批量阅卷提交结果 - 与后端 MarkingTaskBatchOutcome enum 对齐 */
export type MarkingTaskBatchOutcomeCode = 'SUCCESS' | 'FAILED' | 'WARN'

export const MARKING_TASK_BATCH_OUTCOME_LABEL: Record<MarkingTaskBatchOutcomeCode, string> = {
  SUCCESS: '全部成功',
  FAILED: '提交失败',
  WARN: '给分成功批注告警',
}

/** 批量同题阅卷预检请求 - 对应后端 MarkingTaskBatchPrecheckRequest */
export interface MarkingTaskBatchPrecheckRequest {
  examId: string
  groupId: string
  taskIds: string[]
  questionScores: MarkingQuestionScoreSubmitItem[]
  pageAnnotations?: MarkingPageAnnotationSubmitItem[]
}

/** 批量同题阅卷预检响应 - 对应后端 MarkingTaskBatchPrecheckResponse */
export interface MarkingTaskBatchPrecheckResponse {
  passed: boolean
  blockingTaskId?: string
  blockingReason?: string
}

/** 批量同题阅卷提交请求 - 对应后端 MarkingTaskBatchSubmitRequest */
export interface MarkingTaskBatchSubmitRequest {
  examId: string
  groupId: string
  taskIds: string[]
  questionScores: MarkingQuestionScoreSubmitItem[]
  pageAnnotations?: MarkingPageAnnotationSubmitItem[]
}

/** 批量同题阅卷提交响应 - 对应后端 MarkingTaskBatchSubmitResponse */
export interface MarkingTaskBatchSubmitResponse {
  outcome: MarkingTaskBatchOutcomeCode
  submittedTaskIds: string[]
  annotationWarning?: string
  failureMessage?: string
}

/** 单批最大任务数，与后端 @Size(max = 50) 对齐 */
export const MARKING_BATCH_SUBMIT_MAX_TASKS = 50

export function validateMarkingTaskBatchOutcome(outcome: MarkingTaskBatchOutcomeCode): void {
  strictEnumLabel(MARKING_TASK_BATCH_OUTCOME_LABEL, outcome, '批量阅卷提交结果')
}

/**
 * 批量同题阅卷预检（只读）。
 * POST /api/mark/organization/batch-submit-tasks/precheck
 */
export function precheckMarkingTaskBatch(
  request: MarkingTaskBatchPrecheckRequest,
): Promise<MarkingTaskBatchPrecheckResponse> {
  return http.post<MarkingTaskBatchPrecheckResponse>(
    '/api/mark/organization/batch-submit-tasks/precheck',
    request,
  )
}

/**
 * 批量同题阅卷原子提交。
 * POST /api/mark/organization/batch-submit-tasks
 */
export function batchSubmitMarkingTasks(
  request: MarkingTaskBatchSubmitRequest,
): Promise<MarkingTaskBatchSubmitResponse> {
  return http.post<MarkingTaskBatchSubmitResponse>(
    '/api/mark/organization/batch-submit-tasks',
    request,
  )
}

/**
 * 将 taskIds 按后端上限分批，流式顺序提交。
 */
export async function batchSubmitMarkingTasksInChunks(
  request: Omit<MarkingTaskBatchSubmitRequest, 'taskIds'>,
  taskIds: string[],
  onChunkProgress?: (completed: number, total: number) => void,
): Promise<MarkingTaskBatchSubmitResponse[]> {
  const results: MarkingTaskBatchSubmitResponse[] = []
  const total = taskIds.length
  for (let offset = 0; offset < taskIds.length; offset += MARKING_BATCH_SUBMIT_MAX_TASKS) {
    const chunk = taskIds.slice(offset, offset + MARKING_BATCH_SUBMIT_MAX_TASKS)
    const response = await batchSubmitMarkingTasks({ ...request, taskIds: chunk })
    validateMarkingTaskBatchOutcome(response.outcome)
    results.push(response)
    onChunkProgress?.(Math.min(offset + chunk.length, total), total)
    if (response.outcome === 'FAILED') {
      break
    }
  }
  return results
}
