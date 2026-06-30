import type { TaskStatusCode } from './task-status'
import type { ProcessingTaskTypeCode } from './task-type'
import type { PageResult } from '@/types'
import http from '@/config/axios'

/** 批改处理任务分页查询请求 - 对应 ExamProcessingTaskQueryRequest */
export interface ExamProcessingTaskQueryRequest {
  examId: string
  paperInstanceId?: string
  taskType?: ProcessingTaskTypeCode
  pageNum?: number
  pageSize?: number
}

/** 整卷 AI 批阅重试请求 - 对应 ExamPaperGradeRetryRequest */
export interface ExamPaperGradeRetryRequest {
  examId: string
  paperInstanceId: string
}

/** 批改处理任务列表条目 - 对应 ExamProcessingTaskItemResponse */
export interface ExamProcessingTaskItemVO {
  id: string
  examId: string
  scanBatchId?: string
  paperInstanceId?: string
  questionTemplateId?: string
  taskType: ProcessingTaskTypeCode
  status: TaskStatusCode
  retryCount?: number
  diagnostic?: string
  createTime?: string
  updateTime?: string
}

/** 分页查询考试批改处理任务 */
export function pageExamProcessingTasks(
  request: ExamProcessingTaskQueryRequest,
): Promise<PageResult<ExamProcessingTaskItemVO>> {
  return http.post<PageResult<ExamProcessingTaskItemVO>>('/api/mark/exams/processing-tasks/page', request)
}

/** 教师主动重试整卷 AI 批阅 */
export function retryPaperGradeSuggestion(request: ExamPaperGradeRetryRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/paper-grade-suggestion/retry', request)
}
