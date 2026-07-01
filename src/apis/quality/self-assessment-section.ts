import type { BadgeTone } from '@/components/ui-guide/ui/types'
import http from '@/config/axios'

const BASE = '/api/quality/accreditation/self-assessment-sections'

export type SelfAssessmentSectionKey
  = | 'STUDENT'
    | 'TRAINING_OBJECTIVE'
    | 'GRADUATION_REQUIREMENT'
    | 'CONTINUOUS_IMPROVEMENT'
    | 'CURRICULUM'
    | 'FACULTY'
    | 'SUPPORT'
    | 'ATTACHMENT'

export type SelfAssessmentSectionContentStatus = 'DRAFT' | 'READY'

export type SelfAssessmentSectionEvidenceRefType = 'FIELD_PATH' | 'ACCREDITATION_EVIDENCE'

export const SELF_ASSESSMENT_SECTION_KEY_LABEL: Record<SelfAssessmentSectionKey, string> = {
  STUDENT: '一、学生',
  TRAINING_OBJECTIVE: '二、培养目标',
  GRADUATION_REQUIREMENT: '三、毕业要求',
  CONTINUOUS_IMPROVEMENT: '四、持续改进',
  CURRICULUM: '五、课程体系',
  FACULTY: '六、师资队伍',
  SUPPORT: '七、支持条件',
  ATTACHMENT: '八、附件索引',
}

export const SELF_ASSESSMENT_SECTION_CONTENT_STATUS_LABEL: Record<
  SelfAssessmentSectionContentStatus,
  string
> = {
  DRAFT: '草稿',
  READY: '就绪',
}

export const SELF_ASSESSMENT_SECTION_CONTENT_STATUS_TONE: Record<
  SelfAssessmentSectionContentStatus,
  BadgeTone
> = {
  DRAFT: 'orange',
  READY: 'green',
}

export interface SelfAssessmentSectionEvidenceRefVO {
  id: string
  refType: SelfAssessmentSectionEvidenceRefType
  fieldPath?: string
  accreditationEvidenceId?: string
  accreditationEvidenceTitle?: string
}

export interface SelfAssessmentSectionVO {
  id: string
  accreditationCycleId: string
  trainingPlanId: string
  sectionKey: SelfAssessmentSectionKey
  sectionTitle: string
  narrativeContent?: string
  evidenceNarrative?: string
  contentStatus: SelfAssessmentSectionContentStatus
  aiGenerated?: boolean
  materialReady?: boolean
  evidenceRefs?: SelfAssessmentSectionEvidenceRefVO[]
}

export interface SelfAssessmentSectionEvidenceRefItem {
  refType: SelfAssessmentSectionEvidenceRefType
  fieldPath?: string
  accreditationEvidenceId?: string
}

export interface SelfAssessmentSectionSaveRequest {
  id: string
  narrativeContent?: string
  evidenceNarrative?: string
  evidenceRefs?: SelfAssessmentSectionEvidenceRefItem[]
}

export const selfAssessmentSectionApi = {
  listByCycle: (accreditationCycleId: string) =>
    http.post<SelfAssessmentSectionVO[]>(`${BASE}/list-by-cycle`, { id: accreditationCycleId }),
  save: (data: SelfAssessmentSectionSaveRequest) => http.post<void>(`${BASE}/save`, data),
}
