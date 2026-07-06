import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type {
  SelfAssessmentSectionEvidenceRefTypeCode,
} from '@/types/enums/self-assessment-section-evidence-ref-type-enum'
import type {
  SelfAssessmentSectionKeyCode} from '@/types/enums/self-assessment-section-key-enum';
import http from '@/config/axios'
import { SelfAssessmentSectionContentStatusCode } from '@/types/enums/self-assessment-section-content-status-enum'

const BASE = '/api/quality/accreditation/self-assessment-sections'

export {
  ALL_SELF_ASSESSMENT_SECTION_CONTENT_STATUS_CODES,
  SelfAssessmentSectionContentStatusCode,
  SelfAssessmentSectionContentStatusDescription,
} from '@/types/enums/self-assessment-section-content-status-enum'

export {
  ALL_SELF_ASSESSMENT_SECTION_EVIDENCE_REF_TYPE_CODES,
  SelfAssessmentSectionEvidenceRefTypeCode,
  SelfAssessmentSectionEvidenceRefTypeDescription,
} from '@/types/enums/self-assessment-section-evidence-ref-type-enum'

export {
  ALL_SELF_ASSESSMENT_SECTION_KEY_CODES,
  SelfAssessmentSectionKeyCode,
  SelfAssessmentSectionKeyDescription,
} from '@/types/enums/self-assessment-section-key-enum'

export const SELF_ASSESSMENT_SECTION_CONTENT_STATUS_TONE: Record<
  SelfAssessmentSectionContentStatusCode,
  BadgeTone
> = {
  [SelfAssessmentSectionContentStatusCode.DRAFT]: 'orange',
  [SelfAssessmentSectionContentStatusCode.READY]: 'green',
}

export interface SelfAssessmentSectionEvidenceRefVO {
  id: string
  refType: SelfAssessmentSectionEvidenceRefTypeCode
  fieldPath?: string
  accreditationEvidenceId?: string
  accreditationEvidenceTitle?: string
}

export interface SelfAssessmentSectionVO {
  id: string
  accreditationCycleId: string
  trainingPlanId: string
  sectionKey: SelfAssessmentSectionKeyCode
  sectionTitle: string
  narrativeContent?: string
  evidenceNarrative?: string
  contentStatus: SelfAssessmentSectionContentStatusCode
  aiGenerated?: boolean
  materialReady?: boolean
  evidenceRefs?: SelfAssessmentSectionEvidenceRefVO[]
}

export interface SelfAssessmentSectionEvidenceRefItem {
  refType: SelfAssessmentSectionEvidenceRefTypeCode
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
