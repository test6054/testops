import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { PageResult, QueryDto } from '@/types'
import type { AnnualEvaluationPlanStatusCode } from '@/types/enums/annual-evaluation-plan-status-enum'
import type { OnsiteVisitPlanStatusCode } from '@/types/enums/onsite-visit-plan-status-enum'
import type { ProgramSupportProfileStatusCode } from '@/types/enums/program-support-profile-status-enum'
import type { SelfAssessmentReviewStatusCode } from '@/types/enums/self-assessment-review-status-enum'
import type { SemesterCode } from '@/types/enums/semester-enum'
import http from '@/config/axios'
import {
  AccreditationConclusionTypeCode,
  AccreditationConclusionTypeDescription,
  ALL_ACCREDITATION_CONCLUSION_TYPE_CODES,
} from '@/types/enums/accreditation-conclusion-type-enum'
import {
  AccreditationCyclePhaseCode,
  AccreditationCyclePhaseDescription,
  ALL_ACCREDITATION_CYCLE_PHASE_CODES,
} from '@/types/enums/accreditation-cycle-phase-enum'
import {
  AccreditationCycleStatusCode,
  AccreditationCycleStatusDescription,
  ALL_ACCREDITATION_CYCLE_STATUS_CODES,
} from '@/types/enums/accreditation-cycle-status-enum'
import {
  AccreditationEvidenceAnchorTypeCode,
  AccreditationEvidenceAnchorTypeDescription,
  ALL_ACCREDITATION_EVIDENCE_ANCHOR_TYPE_CODES,
} from '@/types/enums/accreditation-evidence-anchor-type-enum'
import {
  AccreditationEvidenceCategoryCode,
  AccreditationEvidenceCategoryDescription,
  ALL_ACCREDITATION_EVIDENCE_CATEGORY_CODES,
} from '@/types/enums/accreditation-evidence-category-enum'
import {
  AccreditationEvidenceStatusCode,
  AccreditationEvidenceStatusDescription,
  ALL_ACCREDITATION_EVIDENCE_STATUS_CODES,
} from '@/types/enums/accreditation-evidence-status-enum'
import {
  ALL_ANNUAL_REPORT_MATERIAL_CATEGORY_CODES,
  AnnualReportMaterialCategoryCode,
  AnnualReportMaterialCategoryDescription,
} from '@/types/enums/annual-report-material-category-enum'
import {
  ALL_ANNUAL_REPORT_MATERIAL_REVIEW_STATUS_CODES,
  AnnualReportMaterialReviewStatusCode,
  AnnualReportMaterialReviewStatusDescription,
} from '@/types/enums/annual-report-material-review-status-enum'
import {
  ALL_ANNUAL_REPORT_MATERIAL_STATUS_CODES,
  AnnualReportMaterialStatusCode,
  AnnualReportMaterialStatusDescription,
} from '@/types/enums/annual-report-material-status-enum'
import {
  ALL_ONSITE_CHECKLIST_CATEGORY_CODES,
  OnsiteChecklistCategoryCode,
  OnsiteChecklistCategoryDescription,
} from '@/types/enums/onsite-checklist-category-enum'
import {
  ALL_ONSITE_CHECKLIST_ITEM_STATUS_CODES,
  OnsiteChecklistItemStatusCode,
  OnsiteChecklistItemStatusDescription,
} from '@/types/enums/onsite-checklist-item-status-enum'
import {
  ALL_SELF_ASSESSMENT_REVIEW_DECISION_CODES,
  SelfAssessmentReviewDecisionCode,
  SelfAssessmentReviewDecisionDescription,
} from '@/types/enums/self-assessment-review-decision-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  AccreditationConclusionTypeCode,
  AccreditationConclusionTypeDescription,
  AccreditationCyclePhaseCode,
  AccreditationCyclePhaseDescription,
  AccreditationCycleStatusCode,
  AccreditationCycleStatusDescription,
  AccreditationEvidenceAnchorTypeCode,
  AccreditationEvidenceAnchorTypeDescription,
  AccreditationEvidenceCategoryCode,
  AccreditationEvidenceCategoryDescription,
  AccreditationEvidenceStatusCode,
  AccreditationEvidenceStatusDescription,
  ALL_ACCREDITATION_CONCLUSION_TYPE_CODES,
  ALL_ACCREDITATION_CYCLE_PHASE_CODES,
  ALL_ACCREDITATION_CYCLE_STATUS_CODES,
  ALL_ACCREDITATION_EVIDENCE_ANCHOR_TYPE_CODES,
  ALL_ACCREDITATION_EVIDENCE_CATEGORY_CODES,
  ALL_ACCREDITATION_EVIDENCE_STATUS_CODES,
  ALL_ANNUAL_REPORT_MATERIAL_CATEGORY_CODES,
  ALL_ANNUAL_REPORT_MATERIAL_REVIEW_STATUS_CODES,
  ALL_ANNUAL_REPORT_MATERIAL_STATUS_CODES,
  ALL_ONSITE_CHECKLIST_CATEGORY_CODES,
  ALL_ONSITE_CHECKLIST_ITEM_STATUS_CODES,
  ALL_SELF_ASSESSMENT_REVIEW_DECISION_CODES,
  AnnualReportMaterialCategoryCode,
  AnnualReportMaterialCategoryDescription,
  AnnualReportMaterialReviewStatusCode,
  AnnualReportMaterialReviewStatusDescription,
  AnnualReportMaterialStatusCode,
  AnnualReportMaterialStatusDescription,
  OnsiteChecklistCategoryCode,
  OnsiteChecklistCategoryDescription,
  OnsiteChecklistItemStatusCode,
  OnsiteChecklistItemStatusDescription,
  SelfAssessmentReviewDecisionCode,
  SelfAssessmentReviewDecisionDescription,
}

const BASE = '/api/quality/accreditation'

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
  currentPhase: AccreditationCyclePhaseCode
  cycleStatus: AccreditationCycleStatusCode
  applicationRecordedTime?: string
  selfAssessmentSubmittedTime?: string
  selfAssessmentReviewStatus?: SelfAssessmentReviewStatusCode
  selfAssessmentReviewDecision?: SelfAssessmentReviewDecisionCode
  selfAssessmentReviewRemark?: string
  selfAssessmentReviewTime?: string
  onsiteVisitStart?: string
  onsiteVisitEnd?: string
  onsiteReportDueDate?: string
  conclusionType?: AccreditationConclusionTypeCode
  validFrom?: string
  validUntil?: string
  conditionalDueDate?: string
  conclusionRemark?: string
  conclusionRegisteredTime?: string
  remark?: string
  createTime?: string
  updateTime?: string
}

export interface AccreditationAnnualCourseCoverageSnapshot {
  reportYear: string
  requiredCourseCount: number
  coveredCourseCount: number
}

export interface AccreditationConclusionReadinessItemVO {
  itemKey: string
  itemName: string
  ready: boolean
  message: string
}

export interface AccreditationCockpitVO {
  activeCycle?: AccreditationCycleVO
  annualPlanCount: number
  annualCoverageRate: number
  onsiteVisitPlanCount: number
  onsiteChecklistCompletionRate: number
  supportProfileConfirmed: boolean
  facultyProfileCount: number
  activeFacultyProfileCount: number
  annualReportMaterialCount: number
  submittedAnnualReportMaterialCount: number
  approvedAnnualReportMaterialCount: number
  annualReportMaterialsReady: boolean
  conclusionRegistrationReady: boolean
  conclusionReadinessItems?: AccreditationConclusionReadinessItemVO[]
  annualCourseCoverages?: AccreditationAnnualCourseCoverageSnapshot[]
  conditionalDueDaysRemaining?: number
  onsiteReportDueDaysRemaining?: number
  activeEvidenceCount: number
}

export interface AccreditationCycleQueryRequest extends QueryDto {
  programId?: string
  trainingPlanId?: string
  currentPhase?: AccreditationCyclePhaseCode
  cycleStatus?: AccreditationCycleStatusCode
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

export interface TrainingPlanIdRequest {
  trainingPlanId: string
}

export interface SelfAssessmentReviewDecisionRequest {
  accreditationCycleId: string
  reviewDecision: SelfAssessmentReviewDecisionCode
  reviewRemark?: string
  supplementDeadline?: string
}

export interface AccreditationConclusionRegisterRequest {
  accreditationCycleId: string
  conclusionType: AccreditationConclusionTypeCode
  validFrom?: string
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
  profileStatus?: ProgramSupportProfileStatusCode
  confirmedTime?: string
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
  itemCategory: OnsiteChecklistCategoryCode
  itemCode: string
  itemTitle: string
  itemDescription?: string
  responsibleUserId?: string
  itemStatus: OnsiteChecklistItemStatusCode
  evidenceArchiveId?: string
  completedTime?: string
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
  planStatus?: OnsiteVisitPlanStatusCode
  completedChecklistCount?: number
  totalChecklistCount?: number
  remark?: string
  checklistItems?: OnsiteChecklistItemVO[]
}

export interface OnsiteChecklistItemUpdateRequest {
  id: string
  responsibleUserId?: string
  itemStatus: OnsiteChecklistItemStatusCode
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
  completedTime?: string
  remark?: string
}

export interface AnnualEvaluationPlanQueryRequest extends QueryDto {
  programId?: string
  trainingPlanId: string
  planYear?: string
  planStatus?: AnnualEvaluationPlanStatusCode
  keyword?: string
}

export interface AnnualEvaluationPlanCourseQueryRequest extends QueryDto {
  annualPlanId: string
}

export interface OnsiteVisitPlanQueryRequest extends QueryDto {
  programId?: string
  trainingPlanId: string
  accreditationCycleId?: string
  planStatus?: AnnualEvaluationPlanStatusCode
  keyword?: string
}

export interface OnsiteChecklistItemQueryRequest extends QueryDto {
  onsiteVisitPlanId: string
  itemCategory?: OnsiteChecklistCategoryCode | ''
}

export interface AnnualEvaluationPlanCourseStatusUpdateRequest {
  id: string
  evaluationCompleted: boolean
}

export interface AnnualEvaluationPlanVO {
  id: string
  programId: string
  trainingPlanId: string
  accreditationCycleId?: string
  planYear: string
  planTitle: string
  planStatus?: AnnualEvaluationPlanStatusCode
  coverageTargetRate?: number
  actualCoverageRate?: number
  requiredCourseCount?: number
  completedCourseCount?: number
  remark?: string
  courses?: AnnualEvaluationPlanCourseVO[]
}

export interface AnnualReportMaterialSaveRequest {
  id?: string
  accreditationCycleId: string
  trainingPlanId: string
  reportYear: string
  materialCategory: AnnualReportMaterialCategoryCode
  qualityCourseId?: string
  materialName: string
  materialDescription?: string
  storageFileId?: string
}

export interface AnnualReportMaterialQueryRequest extends QueryDto {
  accreditationCycleId?: string
  trainingPlanId?: string
  reportYear?: string
  materialCategory?: AnnualReportMaterialCategoryCode
  reportStatus?: AnnualReportMaterialStatusCode
  keyword?: string
}

export interface AnnualReportMaterialReviewRequest {
  id: string
  reviewStatus: AnnualReportMaterialReviewStatusCode
  reviewComment?: string
}

export interface AnnualReportMaterialVO {
  id: string
  accreditationCycleId: string
  trainingPlanId: string
  reportYear: string
  materialCategory: AnnualReportMaterialCategoryCode
  qualityCourseId?: string
  qualityCourseCode?: string
  qualityCourseName?: string
  materialName: string
  materialDescription?: string
  storageFileId?: string
  reportStatus: AnnualReportMaterialStatusCode
  submittedTime?: string
  reviewerUserId?: string
  reviewComment?: string
  reviewedTime?: string
  createTime?: string
  updateTime?: string
}

export interface AccreditationScopeRequest {
  trainingPlanId: string
  programId?: string
  accreditationCycleId?: string
}

export interface AccreditationEvidenceVO {
  id: string
  programId: string
  trainingPlanId: string
  qualityCourseId?: string
  assessmentItemId?: string
  sourceExamId?: string
  evidenceCategory: AccreditationEvidenceCategoryCode
  anchorType: AccreditationEvidenceAnchorTypeCode
  anchorId?: string
  evidenceCode: string
  evidenceTitle: string
  evidenceDescription?: string
  storageFileId: string
  archiveId?: string
  schoolYear?: string
  semester?: SemesterCode
  markScannedPageId?: string
  markPaperInstanceId?: string
  evidenceStatus?: AccreditationEvidenceStatusCode
  createTime?: string
}

export interface AccreditationEvidenceQueryRequest extends QueryDto {
  programId?: string
  trainingPlanId?: string
  qualityCourseId?: string
  evidenceCategory?: AccreditationEvidenceCategoryCode
  keyword?: string
}

export interface AccreditationEvidenceSaveRequest {
  id?: string
  programId: string
  trainingPlanId: string
  qualityCourseId?: string
  assessmentItemId?: string
  sourceExamId?: string
  evidenceCategory: AccreditationEvidenceCategoryCode
  anchorType: AccreditationEvidenceAnchorTypeCode
  anchorId?: string
  evidenceCode: string
  evidenceTitle: string
  evidenceDescription?: string
  storageFileId: string
  schoolYear?: string
  semester?: SemesterCode
  markScannedPageId?: string
  markPaperInstanceId?: string
}

export interface ImportMarkExamEvidenceRequest {
  programId: string
  trainingPlanId: string
  examIds: string[]
}

/** 认证证据登记可选的 edu-mark 来源考试 */
export interface AccreditationLinkedExamOptionVO {
  sourceExamId: string
  courseName: string
  itemName: string
  label: string
}

export const ANNUAL_REPORT_MATERIAL_STATUS_TONE: Record<AnnualReportMaterialStatusCode, BadgeTone>
  = {
    [AnnualReportMaterialStatusCode.DRAFT]: 'gray',
    [AnnualReportMaterialStatusCode.SUBMITTED]: 'blue',
    [AnnualReportMaterialStatusCode.APPROVED]: 'green',
    [AnnualReportMaterialStatusCode.REJECTED]: 'orange',
  }

export const ANNUAL_REPORT_MATERIAL_CATEGORY_OPTIONS: Array<{
  value: AnnualReportMaterialCategoryCode
  label: string
}> = ALL_ANNUAL_REPORT_MATERIAL_CATEGORY_CODES.map((value) => ({
  value,
  label: strictEnumLabel(AnnualReportMaterialCategoryDescription, value, '年报材料类别'),
}))

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
  cockpit: (data: TrainingPlanIdRequest) =>
    http.post<AccreditationCockpitVO>(`${BASE}/cockpit`, data),
  annualPlanPage: (data: AnnualEvaluationPlanQueryRequest) =>
    http.post<PageResult<AnnualEvaluationPlanVO>>(`${BASE}/annual-plans/page`, data),
  annualPlanDetail: (id: string) =>
    http.post<AnnualEvaluationPlanVO>(`${BASE}/annual-plans/detail`, { id }),
  annualPlanCoursePage: (data: AnnualEvaluationPlanCourseQueryRequest) =>
    http.post<PageResult<AnnualEvaluationPlanCourseVO>>(`${BASE}/annual-plans/course-page`, data),
  annualPlanCreate: (data: AnnualEvaluationPlanSaveRequest) =>
    http.post<string>(`${BASE}/annual-plans/create`, data),
  annualPlanUpdate: (data: AnnualEvaluationPlanSaveRequest) =>
    http.post<void>(`${BASE}/annual-plans/update`, data),
  annualPlanDelete: (id: string) => http.post<void>(`${BASE}/annual-plans/delete`, { id }),
  updateAnnualPlanCourseStatus: (data: AnnualEvaluationPlanCourseStatusUpdateRequest) =>
    http.post<void>(`${BASE}/annual-plans/update-course-status`, data),
  annualReportMaterialPage: (data: AnnualReportMaterialQueryRequest) =>
    http.post<PageResult<AnnualReportMaterialVO>>(`${BASE}/annual-report-materials/page`, data),
  annualReportMaterialCreate: (data: AnnualReportMaterialSaveRequest) =>
    http.post<string>(`${BASE}/annual-report-materials/create`, data),
  annualReportMaterialUpdate: (data: AnnualReportMaterialSaveRequest) =>
    http.post<void>(`${BASE}/annual-report-materials/update`, data),
  annualReportMaterialDelete: (id: string) =>
    http.post<void>(`${BASE}/annual-report-materials/delete`, { id }),
  annualReportMaterialDetail: (id: string) =>
    http.post<AnnualReportMaterialVO>(`${BASE}/annual-report-materials/detail`, { id }),
  annualReportMaterialSubmit: (id: string) =>
    http.post<void>(`${BASE}/annual-report-materials/submit`, { id }),
  annualReportMaterialReview: (data: AnnualReportMaterialReviewRequest) =>
    http.post<void>(`${BASE}/annual-report-materials/review`, data),
  onsitePlanPage: (data: OnsiteVisitPlanQueryRequest) =>
    http.post<PageResult<OnsiteVisitPlanVO>>(`${BASE}/onsite-plans/page`, data),
  onsitePlanDetail: (id: string) =>
    http.post<OnsiteVisitPlanVO>(`${BASE}/onsite-plans/detail`, { id }),
  onsiteChecklistPage: (data: OnsiteChecklistItemQueryRequest) =>
    http.post<PageResult<OnsiteChecklistItemVO>>(`${BASE}/onsite-plans/checklist-page`, data),
  createOnsitePlan: (data: OnsiteVisitPlanSaveRequest) =>
    http.post<string>(`${BASE}/onsite-plans/create`, data),
  updateOnsitePlan: (data: OnsiteVisitPlanSaveRequest) =>
    http.post<void>(`${BASE}/onsite-plans/update`, data),
  deleteOnsitePlan: (id: string) => http.post<void>(`${BASE}/onsite-plans/delete`, { id }),
  updateChecklistItem: (data: OnsiteChecklistItemUpdateRequest) =>
    http.post<void>(`${BASE}/onsite-plans/update-checklist-item`, data),
  currentSupportProfile: (data: TrainingPlanIdRequest) =>
    http.post<ProgramSupportProfileVO | null>(`${BASE}/support-profiles/current`, data),
  saveSupportProfile: (data: ProgramSupportProfileSaveRequest) =>
    http.post<string>(`${BASE}/support-profiles/save`, data),
  confirmSupportProfile: (id: string) =>
    http.post<void>(`${BASE}/support-profiles/confirm`, { id }),
  evidencePage: (data: AccreditationEvidenceQueryRequest) =>
    http.post<PageResult<AccreditationEvidenceVO>>(`${BASE}/evidences/page`, data),
  linkedExamOptions: (data: { trainingPlanId: string, programId?: string }) =>
    http.post<AccreditationLinkedExamOptionVO[]>(`${BASE}/evidences/linked-exam-options`, data),
  evidenceCreate: (data: AccreditationEvidenceSaveRequest) =>
    http.post<string>(`${BASE}/evidences/create`, data),
  evidenceUpdate: (data: AccreditationEvidenceSaveRequest) =>
    http.post<void>(`${BASE}/evidences/update`, data),
  evidenceDelete: (id: string) => http.post<void>(`${BASE}/evidences/delete`, { id }),
  importMarkExamEvidence: (data: ImportMarkExamEvidenceRequest) =>
    http.post<number>(`${BASE}/evidences/import-from-mark-exams`, data),
}
