/**
 * 阅卷重大事件与审计共享类型。
 *
 * 供 audit-trail / admin-audit 使用；不再承接 dashboard API。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { IncidentSourceTypeCode } from '@/types/enums/incident-source-type-enum'
import type { IncidentTypeCode } from '@/types/enums/incident-type-enum'
import { IncidentLevelCode } from '@/types/enums/incident-level-enum'

export {
  ALL_INCIDENT_LEVEL_CODES,
  IncidentLevelCode,
  IncidentLevelDescription,
} from '@/types/enums/incident-level-enum'
export {
  ALL_INCIDENT_SOURCE_TYPE_CODES,
  IncidentSourceTypeCode,
  IncidentSourceTypeDescription,
} from '@/types/enums/incident-source-type-enum'
export {
  ALL_INCIDENT_TYPE_CODES,
  IncidentTypeCode,
  IncidentTypeDescription,
} from '@/types/enums/incident-type-enum'

/** 重大事件级别 BadgeTone 映射（UiTag/UiBadge） */
export const INCIDENT_LEVEL_TONE: Record<IncidentLevelCode, BadgeTone> = {
  [IncidentLevelCode.BLOCKING]: 'red',
  [IncidentLevelCode.REVIEW_REQUIRED]: 'orange',
  [IncidentLevelCode.WARNING]: 'orange',
  [IncidentLevelCode.INFO]: 'blue',
}

/** 重大事件记录 - 对应 ExamIncidentRecord */
export interface ExamIncidentRecord {
  id: string
  tenantId?: string
  examId: string
  incidentLevel: IncidentLevelCode
  incidentType: IncidentTypeCode
  sourceType?: IncidentSourceTypeCode
  sourceId?: string
  summary: string
  detail?: string
  resolved?: boolean
  resolvedUserId?: string
  resolvedTime?: string
  resolveNote?: string
  createUser?: string
  updateUser?: string
  createTime?: string
  updateTime?: string
  /** 是否可处置本场重大事件；与 hasExamReviewerWritePermission 同源 */
  canManageReviewerWrites?: boolean
}
