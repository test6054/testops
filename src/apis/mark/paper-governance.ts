import http from '@/config/axios'

/** 与后端 ExamPaperGovernanceStatus 枚举同码的命题治理状态。 */
export enum ExamPaperGovernanceStatusCode {
  DRAFT = 'DRAFT',
  RULE_CHECKED = 'RULE_CHECKED',
  INTERNAL_REVIEW_PENDING = 'INTERNAL_REVIEW_PENDING',
  EXTERNAL_REVIEW_PENDING = 'EXTERNAL_REVIEW_PENDING',
  RECTIFICATION_REQUIRED = 'RECTIFICATION_REQUIRED',
  APPROVED_FOR_PRINT = 'APPROVED_FOR_PRINT',
}

/** 与后端 ExamAssessmentMode 枚举同码的考核方式。 */
export enum ExamAssessmentModeCode {
  WRITTEN_EXAM = 'WRITTEN_EXAM',
  CASE_ANALYSIS = 'CASE_ANALYSIS',
  COURSE_THESIS = 'COURSE_THESIS',
}

/** 与后端 ExamWrittenExamMode 枚举同码的笔试方式。 */
export enum ExamWrittenExamModeCode {
  CLOSED_BOOK = 'CLOSED_BOOK',
  OPEN_BOOK = 'OPEN_BOOK',
}

/** 与后端 ExamPaperReviewStage 枚举同码的审核阶段，不代表职务。 */
export enum ExamPaperReviewStageCode {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

/** 与后端 ExamPaperApprovalAction 枚举同码的签审动作。 */
export enum ExamPaperApprovalActionCode {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/** 与后端 ExamPaperQuestionType 枚举同码的命题细粒度题型。 */
export enum ExamPaperQuestionTypeCode {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  INDEFINITE_CHOICE = 'INDEFINITE_CHOICE',
  FILL_BLANK = 'FILL_BLANK',
  TRUE_FALSE = 'TRUE_FALSE',
  TRUE_FALSE_ANALYSIS = 'TRUE_FALSE_ANALYSIS',
  TERM_EXPLANATION = 'TERM_EXPLANATION',
  SHORT_ANSWER = 'SHORT_ANSWER',
  CASE_ANALYSIS = 'CASE_ANALYSIS',
  ESSAY = 'ESSAY',
  PROOF = 'PROOF',
  CALCULATION = 'CALCULATION',
  APPLICATION = 'APPLICATION',
  COMPOSITION = 'COMPOSITION',
}

export const ExamPaperQuestionTypeDescription: Record<ExamPaperQuestionTypeCode, string> = {
  [ExamPaperQuestionTypeCode.SINGLE_CHOICE]: '单选题',
  [ExamPaperQuestionTypeCode.MULTIPLE_CHOICE]: '多选题',
  [ExamPaperQuestionTypeCode.INDEFINITE_CHOICE]: '不定项选择题',
  [ExamPaperQuestionTypeCode.FILL_BLANK]: '填空题',
  [ExamPaperQuestionTypeCode.TRUE_FALSE]: '判断题',
  [ExamPaperQuestionTypeCode.TRUE_FALSE_ANALYSIS]: '判断分析题',
  [ExamPaperQuestionTypeCode.TERM_EXPLANATION]: '名词解释',
  [ExamPaperQuestionTypeCode.SHORT_ANSWER]: '简答题',
  [ExamPaperQuestionTypeCode.CASE_ANALYSIS]: '案例分析题',
  [ExamPaperQuestionTypeCode.ESSAY]: '论述题',
  [ExamPaperQuestionTypeCode.PROOF]: '证明题',
  [ExamPaperQuestionTypeCode.CALCULATION]: '计算题',
  [ExamPaperQuestionTypeCode.APPLICATION]: '应用题',
  [ExamPaperQuestionTypeCode.COMPOSITION]: '作文题',
}

export const ALL_EXAM_PAPER_QUESTION_TYPE_CODES: readonly ExamPaperQuestionTypeCode[] = [
  ExamPaperQuestionTypeCode.SINGLE_CHOICE,
  ExamPaperQuestionTypeCode.MULTIPLE_CHOICE,
  ExamPaperQuestionTypeCode.INDEFINITE_CHOICE,
  ExamPaperQuestionTypeCode.FILL_BLANK,
  ExamPaperQuestionTypeCode.TRUE_FALSE,
  ExamPaperQuestionTypeCode.TRUE_FALSE_ANALYSIS,
  ExamPaperQuestionTypeCode.TERM_EXPLANATION,
  ExamPaperQuestionTypeCode.SHORT_ANSWER,
  ExamPaperQuestionTypeCode.CASE_ANALYSIS,
  ExamPaperQuestionTypeCode.ESSAY,
  ExamPaperQuestionTypeCode.PROOF,
  ExamPaperQuestionTypeCode.CALCULATION,
  ExamPaperQuestionTypeCode.APPLICATION,
  ExamPaperQuestionTypeCode.COMPOSITION,
]

export interface ExamPaperRuleCheckResponse {
  ruleCode: string
  passedFlag: boolean
  message: string
}

export interface ExamPaperGovernanceResponse {
  governance: {
    examId: string
    departmentId: string
    assessmentMode: ExamAssessmentModeCode
    writtenExamMode?: ExamWrittenExamModeCode
    externalReviewRequired: boolean
    planContent: string
    expectedTotalScore: number
    expectedDurationMinutes: number
    status: ExamPaperGovernanceStatusCode
    lastCheckTime?: string
    printReadyTime?: string
  } | null
  paperSets: Array<{
    id: string
    paperCode: string
    paperName: string
    sourcePdfFileId: string
    sourceFileHash: string
    answerFileId: string
    answerFileHash: string
    scoringRubricFileId: string
    scoringRubricFileHash: string
    totalScore: number
    durationMinutes: number
    calculatedQuestionTotalScore: number
  }>
  questionsByPaperSetId: Record<string, Array<{
    questionNo: string
    questionType: ExamPaperQuestionTypeCode
    fullScore: number
    stemText: string
    stemDigest: string
    layoutQuestionId?: string
  }>>
  ruleChecks: ExamPaperRuleCheckResponse[]
  approvalRecords: Array<{
    reviewerAssignmentId: string
    reviewStage: ExamPaperReviewStageCode
    reviewOrder: number
    approvalRoundNo: number
    approvalAction: ExamPaperApprovalActionCode
    comment: string
    approverUserId: string
    approvalTime: string
  }>
  reviewerAssignments: Array<{
    id: string
    reviewerUserId: string
    reviewStage: ExamPaperReviewStageCode
    reviewOrder: number
  }>
  currentReviewerUserId?: string
  currentUserCanApprove: boolean
}

export interface ExamPaperGovernanceQuestionItem {
  questionNo: string
  questionType: ExamPaperQuestionTypeCode
  fullScore: number
  stemText: string
  layoutQuestionId?: string
}

export interface ExamPaperGovernancePaperSetItem {
  paperCode: string
  paperName: string
  sourcePdfFileId: string
  answerFileId: string
  scoringRubricFileId: string
  totalScore: number
  durationMinutes: number
  questions: ExamPaperGovernanceQuestionItem[]
}

export interface ExamPaperGovernanceSaveRequest {
  departmentId: string
  examId: string
  assessmentMode: ExamAssessmentModeCode
  writtenExamMode?: ExamWrittenExamModeCode
  externalReviewRequired: boolean
  planContent: string
  expectedTotalScore: number
  expectedDurationMinutes: number
  paperSets: ExamPaperGovernancePaperSetItem[]
  reviewers: Array<{
    reviewerUserId: string
    reviewStage: ExamPaperReviewStageCode
    reviewOrder: number
  }>
}

export function getExamPaperGovernance(examId: string) {
  return http.post<ExamPaperGovernanceResponse>('/api/mark/exams/paper-governance/get', { examId })
}

export function checkExamPaperGovernance(examId: string) {
  return http.post<ExamPaperGovernanceResponse>('/api/mark/exams/paper-governance/check', { examId })
}

export function submitExamPaperGovernanceApproval(examId: string) {
  return http.post<boolean>('/api/mark/exams/paper-governance/submit-approval', { examId })
}

export function approveExamPaperGovernance(data: {
  examId: string
  approvalAction: ExamPaperApprovalActionCode
  comment: string
}) {
  return http.post<boolean>('/api/mark/exams/paper-governance/approve', data)
}

/** 下载当前考试受控试卷原件；后端仅允许主考和本场指定审核教师访问。 */
export function downloadExamPaperSource(examId: string, paperCode: string) {
  return http.downloadByPost('/api/mark/exams/paper-governance/source-paper/download', { examId, paperCode })
}

export function saveExamPaperGovernance(data: ExamPaperGovernanceSaveRequest) {
  return http.post<boolean>('/api/mark/exams/paper-governance/save', data)
}
