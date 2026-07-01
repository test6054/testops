import type { ExamStatusCode } from './exam'
import type { ReviewTaskStatusCode } from './exam-review-task'
/**
 * 阅卷考试进度与工作台阶段快照 API - 对接 /api/mark/exams/marking-progress 与 workbench-stage-snapshot。
 */
import type { QuestionTypeCode } from './question-type'
import http from '@/config/axios'

/** 阅卷进度响应 - 对应 MarkingProgressResponse */
export interface MarkingProgressVO {
  examId: string
  /** 试卷数量（含未绑定 / 冲突 / 已绑定的全部扫描卷面） */
  paperCount: number
  /** 可阅卷试卷数（bindingStatus = BOUND，完成率分母真源） */
  gradablePaperCount: number
  questionCount: number
  /** 应批阅题目总数 = gradablePaperCount × questionCount，已排除缺考 / 未绑定 / 冲突卷 */
  totalQuestionGradeCount: number
  confirmedQuestionGradeCount: number
  pendingReviewTaskCount: number
  inProgressReviewTaskCount: number
  openProcessingTaskCount: number
  scanAttentionCount: number
  /** 待教师复核的批改结果数（grade_status = NEED_REVIEW） */
  needReviewGradeResultCount: number
  reviewTaskStatusSummaryList: ReviewTaskStatusSummaryVO[]
  reviewQuestionProgressList: ReviewQuestionProgressItemVO[]
}

/** 复核任务状态汇总项 - 对应 ReviewTaskStatusSummaryResponse */
export interface ReviewTaskStatusSummaryVO {
  statusCode: ReviewTaskStatusCode
  taskCount: number
}

/** 按题目聚合的复核进度项 - 对应 ReviewQuestionProgressItemResponse */
export interface ReviewQuestionProgressItemVO {
  questionTemplateId: string
  questionNo: string
  questionType: QuestionTypeCode
  totalTaskCount: number
  pendingTaskCount: number
  inProgressTaskCount: number
  approvedTaskCount: number
  rejectedTaskCount: number
}

/** 考试工作台阶段键 - 对应 ExamWorkbenchStageKey */
export type ExamWorkbenchStageKeyCode =
  | 'EXAM_PREP'
  | 'PAPER_TEMPLATE'
  | 'CANDIDATE_ROSTER'
  | 'SCAN'
  | 'MARKING_ORG'
  | 'TRIAL_MARKING'
  | 'FORMAL_MARKING'
  | 'SCORE_PUBLISH'
  | 'ARCHIVE'

/** 工作台阶段状态 - 对应 ExamWorkbenchStageStatus */
export type WorkbenchStageStatusCode =
  'pending' | 'active' | 'completed' | 'warning' | 'error' | 'blocked'

/** 考试工作台阶段项 - 对应 ExamWorkbenchStageItemResponse */
export interface ExamWorkbenchStageItemVO {
  key: ExamWorkbenchStageKeyCode
  title: string
  status: WorkbenchStageStatusCode
  hint?: string
}

/** 考试工作台准备步骤 - 对应 ExamWorkbenchPrepStepResponse */
export interface ExamWorkbenchPrepStepVO {
  key: string
  title: string
  status: WorkbenchStageStatusCode
  statusText: string
  advisoryReason?: string
}

/** 工作台下一步动作键 - 对应 ExamWorkbenchNextActionKey */
export type WorkbenchNextActionKeyCode = 'START_SCAN' | 'ENTER_REVIEW' | 'ENTER_MARKING'

/** 工作台下一步动作 - 对应 ExamWorkbenchNextActionResponse */
export interface WorkbenchNextActionVO {
  actionKey: WorkbenchNextActionKeyCode
  label: string
  enabled: boolean
  disabledReason?: string
  targetStageKey: ExamWorkbenchStageKeyCode
}

/** 考试工作台阶段快照 - 对应 ExamWorkbenchStageSnapshotResponse */
export interface WorkbenchStageSnapshotVO {
  examId: string
  examName: string
  examNo: string
  examStatus: ExamStatusCode
  suggestedStageKey: ExamWorkbenchStageKeyCode
  stages: ExamWorkbenchStageItemVO[]
  prepSteps: ExamWorkbenchPrepStepVO[]
  prepAdvisoryReasons: string[]
  prepBlockingReasons: string[]
  markingProgress: MarkingProgressVO
  markingOrgConfigured: boolean
  trialSessionActive: boolean
  formalSessionActive: boolean
  archiveClosed: boolean
  /** 涉密 / 统考涉密场次 */
  confidential?: boolean
  nextActions: WorkbenchNextActionVO[]
}

/** 批量阅卷进度响应 */
export interface MarkingProgressBatchVO {
  items: MarkingProgressVO[]
}

/** 查询考试工作台阶段快照。 */
export function getWorkbenchStageSnapshot(examId: string): Promise<WorkbenchStageSnapshotVO> {
  return http.post<WorkbenchStageSnapshotVO>('/api/mark/exams/workbench-stage-snapshot', { examId })
}

/** 查询阅卷进度。 */
export function getMarkingProgress(examId: string): Promise<MarkingProgressVO> {
  return http.post<MarkingProgressVO>('/api/mark/exams/marking-progress', { examId })
}

/** 批量查询阅卷进度（考试工作台列表聚合，一次请求）。 */
export async function batchGetMarkingProgress(examIds: string[]): Promise<MarkingProgressVO[]> {
  const response = await http.post<MarkingProgressBatchVO>(
    '/api/mark/exams/marking-progress/batch',
    { examIds },
  )
  return response.items
}
