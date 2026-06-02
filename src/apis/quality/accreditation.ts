import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

const BASE = '/api/quality/accreditation'

export type AccreditationCyclePhase =
  | 'SELF_EVALUATION'
  | 'SELF_ASSESSMENT_REVIEW'
  | 'ONSITE_VISIT'
  | 'CONCLUSION'
  | 'MAINTENANCE'

export type AccreditationCycleStatus = 'ACTIVE' | 'CLOSED' | 'SUSPENDED'

export type SelfAssessmentReviewDecision = 'ACCEPTED' | 'SUPPLEMENT_REQUIRED' | 'REJECTED'

export type AccreditationConclusionType = 'FULL_6Y' | 'CONDITIONAL_6Y' | 'NOT_PASS'

export type OnsiteChecklistItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_APPLICABLE'

export type OnsiteChecklistCategory =
  | 'FACILITY'
  | 'PAPER_SAMPLE'
  | 'CLASS_OBSERVATION'
  | 'INTERVIEW'
  | 'DOCUMENT'
  | 'OTHER'

export interface AccreditationCycleVO {
  id: string
  programId: string
  programName: string
  trainingPlanId: string
  trainingPlanCode: string
  trainingPlanName: string
  accreditationStandardId?: string
  cycleCode: string
  cycleName: string
  currentPhase: AccreditationCyclePhase
  cycleStatus: AccreditationCycleStatus
  applicationRecordedAt?: string
  selfAssessmentSubmittedAt?: string
  selfAssessmentReviewStatus?: string
  selfAssessmentReviewDecision?: SelfAssessmentReviewDecision
  selfAssessmentReviewRemark?: string
  selfAssessmentReviewAt?: string
  onsiteVisitStart?: string
  onsiteVisitEnd?: string
  onsiteReportDueDate?: string
  conclusionType?: AccreditationConclusionType
  validFrom?: string
  validUntil?: string
  conditionalDueDate?: string
  conclusionRemark?: string
  conclusionRegisteredAt?: string
  remark?: string
  createTime?: string
  updateTime?: string
}

export interface AccreditationCockpitVO {
  activeCycle?: AccreditationCycleVO
  annualPlanCount: number
  annualCoverageRate: number
  onsiteVisitPlanCount: number
  onsiteChecklistCompletionRate: number
  supportProfileConfirmed: boolean
  conditionalDueDaysRemaining?: number
  onsiteReportDueDaysRemaining?: number
}

export interface AccreditationCycleQueryRequest extends QueryDto {
  programId?: string
  trainingPlanId?: string
  currentPhase?: AccreditationCyclePhase
  cycleStatus?: AccreditationCycleStatus
  keyword?: string
}

export interface AccreditationCycleSaveRequest {
  id?: string
  programId: string
  trainingPlanId: string
  accreditationStandardId?: string
  cycleCode: string
  cycleName: string
  remark?: string
  onsiteVisitStart?: string
  onsiteVisitEnd?: string
  onsiteReportDueDate?: string
}

export interface SelfAssessmentReviewDecisionRequest {
  accreditationCycleId: string
  reviewDecision: SelfAssessmentReviewDecision
  reviewRemark?: string
  supplementDeadline?: string
}

export interface AccreditationConclusionRegisterRequest {
  accreditationCycleId: string
  conclusionType: AccreditationConclusionType
  validFrom: string
  validUntil?: string
  conditionalDueDate?: string
  conclusionRemark?: string
}

export interface ProgramSupportProfileSaveRequest {
  id?: string
  programId: string
  trainingPlanId: string
  facultySummary?: string
  facultyStructureRemark?: string
  supportFacilitySummary?: string
  supportLibraryRemark?: string
  supportItRemark?: string
  industryCoopRemark?: string
  studentDevelopmentRemark?: string
  qualityAssuranceRemark?: string
}

export interface ProgramSupportProfileVO {
  id: string
  programId: string
  trainingPlanId: string
  facultySummary?: string
  facultyStructureRemark?: string
  supportFacilitySummary?: string
  supportLibraryRemark?: string
  supportItRemark?: string
  industryCoopRemark?: string
  studentDevelopmentRemark?: string
  qualityAssuranceRemark?: string
  profileStatus?: string
  confirmedAt?: string
}

export interface OnsiteVisitPlanSaveRequest {
  id?: string
  programId: string
  trainingPlanId: string
  accreditationCycleId: string
  visitCode: string
  visitTitle: string
  visitStart: string
  visitEnd: string
  leadExpertName?: string
  expertGroupRemark?: string
  auditSupervisionId?: string
  remark?: string
}

export interface OnsiteChecklistItemVO {
  id: string
  itemCategory: OnsiteChecklistCategory
  itemCode: string
  itemTitle: string
  itemDescription?: string
  responsibleUserId?: string
  itemStatus: OnsiteChecklistItemStatus
  evidenceArchiveId?: string
  completedAt?: string
  sortOrder?: number
  remark?: string
}

export interface OnsiteVisitPlanVO {
  id: string
  programId: string
  trainingPlanId: string
  accreditationCycleId: string
  visitCode: string
  visitTitle: string
  visitStart: string
  visitEnd: string
  reportDueDate?: string
  leadExpertName?: string
  expertGroupRemark?: string
  planStatus?: string
  completedChecklistCount?: number
  totalChecklistCount?: number
  remark?: string
  checklistItems?: OnsiteChecklistItemVO[]
}

export interface OnsiteChecklistItemUpdateRequest {
  id: string
  responsibleUserId?: string
  itemStatus: OnsiteChecklistItemStatus
  evidenceArchiveId?: string
  remark?: string
}

export interface AnnualEvaluationPlanSaveRequest {
  id?: string
  programId: string
  trainingPlanId: string
  accreditationCycleId?: string
  planYear: string
  planTitle: string
  coverageTargetRate?: number
  remark?: string
  qualityCourseIds?: string[]
}

export interface AnnualEvaluationPlanCourseVO {
  id: string
  qualityCourseId: string
  courseCode: string
  courseName: string
  evaluationRequired: boolean
  evaluationCompleted: boolean
  completedAt?: string
  remark?: string
}

export interface AnnualEvaluationPlanVO {
  id: string
  programId: string
  trainingPlanId: string
  accreditationCycleId?: string
  planYear: string
  planTitle: string
  planStatus?: string
  coverageTargetRate?: number
  actualCoverageRate?: number
  requiredCourseCount?: number
  completedCourseCount?: number
  remark?: string
  courses?: AnnualEvaluationPlanCourseVO[]
}

export interface AccreditationScopeRequest {
  trainingPlanId: string
  programId?: string
  accreditationCycleId?: string
}

export type AccreditationEvidenceCategory =
  | 'EXAM_PAPER'
  | 'HOMEWORK'
  | 'LAB_REPORT'
  | 'GRADUATION_PROJECT'
  | 'COURSE_MATERIAL'
  | 'FACILITY'
  | 'MANAGEMENT_DOC'
  | 'OTHER'

export type AccreditationEvidenceAnchorType =
  | 'TRAINING_PLAN'
  | 'QUALITY_COURSE'
  | 'ASSESSMENT_ITEM'
  | 'MARK_EXAM'
  | 'MARK_SCANNED_PAGE'
  | 'MANUAL'

export interface AccreditationEvidenceVO {
  id: string
  programId: string
  trainingPlanId: string
  qualityCourseId?: string
  assessmentItemId?: string
  sourceExamId?: string
  evidenceCategory: AccreditationEvidenceCategory
  anchorType: AccreditationEvidenceAnchorType
  anchorId?: string
  evidenceCode: string
  evidenceTitle: string
  evidenceDescription?: string
  storageFileId: string
  schoolYear?: string
  semester?: string
  markScannedPageId?: string
  markPaperInstanceId?: string
  evidenceStatus?: string
  createTime?: string
}

export interface AccreditationEvidenceQueryRequest extends QueryDto {
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  evidenceCategory?: AccreditationEvidenceCategory
  keyword?: string
}

export interface AccreditationEvidenceSaveRequest {
  id?: string
  programId: string
  trainingPlanId: string
  qualityCourseId?: string
  assessmentItemId?: string
  sourceExamId?: string
  evidenceCategory: AccreditationEvidenceCategory
  anchorType: AccreditationEvidenceAnchorType
  anchorId?: string
  evidenceCode: string
  evidenceTitle: string
  evidenceDescription?: string
  storageFileId: string
  schoolYear?: string
  semester?: string
  markScannedPageId?: string
  markPaperInstanceId?: string
}

export interface ImportMarkExamEvidenceRequest {
  programId: string
  trainingPlanId: string
  examIds: string[]
}

export const ACCREDITATION_CYCLE_PHASE_LABEL: Record<AccreditationCyclePhase, string> = {
  SELF_EVALUATION: '校内自评',
  SELF_ASSESSMENT_REVIEW: '自评审阅',
  ONSITE_VISIT: '现场考查',
  CONCLUSION: '认证结论',
  MAINTENANCE: '保持改进',
}

export const ACCREDITATION_CYCLE_STATUS_LABEL: Record<AccreditationCycleStatus, string> = {
  ACTIVE: '进行中',
  CLOSED: '已关闭',
  SUSPENDED: '已暂停',
}

export const ACCREDITATION_CONCLUSION_LABEL: Record<AccreditationConclusionType, string> = {
  FULL_6Y: '通过（6年）',
  CONDITIONAL_6Y: '有条件通过',
  NOT_PASS: '不通过',
}

export const ONSITE_CHECKLIST_STATUS_LABEL: Record<OnsiteChecklistItemStatus, string> = {
  PENDING: '待准备',
  IN_PROGRESS: '准备中',
  COMPLETED: '已完成',
  NOT_APPLICABLE: '不适用',
}

export const ONSITE_CHECKLIST_CATEGORY_LABEL: Record<OnsiteChecklistCategory, string> = {
  FACILITY: '实验与工程训练设施',
  PAPER_SAMPLE: '试卷与作业样本',
  CLASS_OBSERVATION: '课堂听课',
  INTERVIEW: '访谈座谈',
  DOCUMENT: '支撑材料与档案',
  OTHER: '其他',
}

export const ACCREDITATION_EVIDENCE_CATEGORY_LABEL: Record<AccreditationEvidenceCategory, string> =
  {
    EXAM_PAPER: '试卷样本',
    HOMEWORK: '作业样本',
    LAB_REPORT: '实验报告',
    GRADUATION_PROJECT: '毕业设计',
    COURSE_MATERIAL: '课程材料',
    FACILITY: '实验设施',
    MANAGEMENT_DOC: '管理文件',
    OTHER: '其他',
  }

export const ACCREDITATION_EVIDENCE_ANCHOR_LABEL: Record<AccreditationEvidenceAnchorType, string> =
  {
    TRAINING_PLAN: '培养方案',
    QUALITY_COURSE: '质量评价课程',
    ASSESSMENT_ITEM: '考核环节',
    MARK_EXAM: 'edu-mark 考试',
    MARK_SCANNED_PAGE: 'edu-mark 扫描页',
    MANUAL: '手工上传',
  }

export const accreditationApi = {
  cyclePage: (data: AccreditationCycleQueryRequest) =>
    http.post<PageResult<AccreditationCycleVO>>(`${BASE}/cycles/page`, data),
  cycleDetail: (id: string) => http.post<AccreditationCycleVO>(`${BASE}/cycles/detail`, { id }),
  cycleCreate: (data: AccreditationCycleSaveRequest) =>
    http.post<string>(`${BASE}/cycles/create`, data),
  cycleUpdate: (data: AccreditationCycleSaveRequest) =>
    http.post<void>(`${BASE}/cycles/update`, data),
  cycleDelete: (id: string) => http.post<void>(`${BASE}/cycles/delete`, { id }),
  recordApplication: (id: string) => http.post<void>(`${BASE}/cycles/record-application`, { id }),
  submitSelfAssessment: (id: string) =>
    http.post<void>(`${BASE}/cycles/submit-self-assessment`, { id }),
  decideReview: (data: SelfAssessmentReviewDecisionRequest) =>
    http.post<void>(`${BASE}/cycles/decide-self-assessment-review`, data),
  registerConclusion: (data: AccreditationConclusionRegisterRequest) =>
    http.post<void>(`${BASE}/cycles/register-conclusion`, data),
  cockpit: (trainingPlanId: string) =>
    http.post<AccreditationCockpitVO>(`${BASE}/cockpit`, { trainingPlanId }),
  annualPlanList: (trainingPlanId: string) =>
    http.post<AnnualEvaluationPlanVO[]>(`${BASE}/annual-plans/list`, { trainingPlanId }),
  annualPlanDetail: (id: string) =>
    http.post<AnnualEvaluationPlanVO>(`${BASE}/annual-plans/detail`, { id }),
  annualPlanCreate: (data: AnnualEvaluationPlanSaveRequest) =>
    http.post<string>(`${BASE}/annual-plans/create`, data),
  annualPlanUpdate: (data: AnnualEvaluationPlanSaveRequest) =>
    http.post<void>(`${BASE}/annual-plans/update`, data),
  annualPlanDelete: (id: string) => http.post<void>(`${BASE}/annual-plans/delete`, { id }),
  markCourseCompleted: (id: string) =>
    http.post<void>(`${BASE}/annual-plans/mark-course-completed`, { id }),
  onsitePlanList: (data: AccreditationScopeRequest) =>
    http.post<OnsiteVisitPlanVO[]>(`${BASE}/onsite-plans/list`, data),
  onsitePlanDetail: (id: string) =>
    http.post<OnsiteVisitPlanVO>(`${BASE}/onsite-plans/detail`, { id }),
  createOnsitePlan: (data: OnsiteVisitPlanSaveRequest) =>
    http.post<string>(`${BASE}/onsite-plans/create`, data),
  updateOnsitePlan: (data: OnsiteVisitPlanSaveRequest) =>
    http.post<void>(`${BASE}/onsite-plans/update`, data),
  deleteOnsitePlan: (id: string) => http.post<void>(`${BASE}/onsite-plans/delete`, { id }),
  updateChecklistItem: (data: OnsiteChecklistItemUpdateRequest) =>
    http.post<void>(`${BASE}/onsite-plans/update-checklist-item`, data),
  currentSupportProfile: (trainingPlanId: string) =>
    http.post<ProgramSupportProfileVO | null>(`${BASE}/support-profiles/current`, {
      trainingPlanId,
    }),
  saveSupportProfile: (data: ProgramSupportProfileSaveRequest) =>
    http.post<string>(`${BASE}/support-profiles/save`, data),
  confirmSupportProfile: (id: string) =>
    http.post<void>(`${BASE}/support-profiles/confirm`, { id }),
  evidencePage: (data: AccreditationEvidenceQueryRequest) =>
    http.post<PageResult<AccreditationEvidenceVO>>(`${BASE}/evidences/page`, data),
  evidenceCreate: (data: AccreditationEvidenceSaveRequest) =>
    http.post<string>(`${BASE}/evidences/create`, data),
  evidenceUpdate: (data: AccreditationEvidenceSaveRequest) =>
    http.post<void>(`${BASE}/evidences/update`, data),
  evidenceDelete: (id: string) => http.post<void>(`${BASE}/evidences/delete`, { id }),
  importMarkExamEvidence: (data: ImportMarkExamEvidenceRequest) =>
    http.post<number>(`${BASE}/evidences/import-from-mark-exams`, data),
}
