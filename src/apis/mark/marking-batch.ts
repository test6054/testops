import type {
  MarkingPageAnnotationSubmitItem,
  MarkingQuestionScoreSubmitItem,
} from './marking-organization'
import http from '@/config/axios'
import { MarkingTaskBatchOutcomeCode } from '@/types/enums/marking-task-batch-outcome-enum'

export {
  ALL_MARKING_TASK_BATCH_OUTCOME_CODES,
  MarkingTaskBatchOutcomeCode,
  MarkingTaskBatchOutcomeDescription,
} from '@/types/enums/marking-task-batch-outcome-enum'

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

/** 批量同题阅卷分片提交入参 - 与 MarkingTaskBatchSubmitRequest 保持同字段，taskIds 由分片链路填入 */
export interface MarkingTaskBatchChunkSubmitRequest {
  examId: string
  groupId: string
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
  request: MarkingTaskBatchChunkSubmitRequest,
  taskIds: string[],
  onChunkProgress?: (completed: number, total: number) => void,
): Promise<MarkingTaskBatchSubmitResponse[]> {
  const results: MarkingTaskBatchSubmitResponse[] = []
  const total = taskIds.length
  for (let offset = 0; offset < taskIds.length; offset += MARKING_BATCH_SUBMIT_MAX_TASKS) {
    const chunk = taskIds.slice(offset, offset + MARKING_BATCH_SUBMIT_MAX_TASKS)
    const response = await batchSubmitMarkingTasks({ ...request, taskIds: chunk })
    results.push(response)
    onChunkProgress?.(Math.min(offset + chunk.length, total), total)
    if (response.outcome === MarkingTaskBatchOutcomeCode.FAILED) {
      break
    }
  }
  return results
}
