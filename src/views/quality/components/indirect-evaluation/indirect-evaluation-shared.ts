import type { ColumnsType } from 'ant-design-vue/es/table'
import type { SurveyIdentityFieldVO } from '@/apis/public-survey'
import type { IndirectEvaluationFormVO } from '@/apis/quality/indirect-form'
import type { RespondentTypeCode } from '@/types/enums/respondent-type-enum'
import {
  AchievementTargetTypeCode,
  AchievementTargetTypeDescription,
  IndirectFormAccessModeCode,
  IndirectFormAccessModeDescription,
  IndirectFormStatusCode,
  IndirectFormStatusDescription,
  IndirectFormTypeCode,
  IndirectFormTypeDescription,
} from '@/apis/quality/types'
import { IndirectEvaluationItemTypeCode } from '@/types/enums/indirect-evaluation-item-type-enum'
import {
  ManualConversionStatusCode,
  ManualConversionStatusDescription,
} from '@/types/enums/manual-conversion-status-enum'
import { formatRespondentType } from '@/types/enums/respondent-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export const ITEM_CONFIG_ERROR = '题项配置不完整，请检查后重试'
export const SCALE_CONVERSION_RULE_OPTION_PAGE_SIZE = 100

/** C14：同目标题项权重须全有或全无 */
export const TARGET_WEIGHT_C14_MESSAGE
  = '请为同一课程目标下的所有题项填写有效权重（>0），或全部留空以使用等权重（默认 1:1）。'

/**
 * 校验同目标题项权重一致性（C14 预校验，与后端 IndirectTargetItemWeightRules 一致）
 */
export function validateTargetWeightC14(
  siblings: Array<{
    id?: string
    targetType: AchievementTargetTypeCode
    targetId: string
    weight?: number | null
  }>,
  editing: {
    id?: string
    targetType: AchievementTargetTypeCode
    targetId: string
    weight?: number | null
  },
): string | null {
  let anyPositive = false
  let anyMissing = false
  for (const item of siblings) {
    if (item.targetType !== editing.targetType || item.targetId !== editing.targetId) {
      continue
    }
    if (item.id && item.id === editing.id) {
      continue
    }
    const weight = item.weight
    if (weight != null && weight > 0) {
      anyPositive = true
    } else {
      anyMissing = true
    }
  }
  const editWeight = editing.weight
  if (editWeight != null && editWeight > 0) {
    anyPositive = true
  } else {
    anyMissing = true
  }
  if (anyPositive && anyMissing) {
    return TARGET_WEIGHT_C14_MESSAGE
  }
  return null
}

/** 统计题项权重展示：C18 等权重回退时显示「等权重（1:1）」 */
export function formatIndirectItemWeightDisplay(
  weight?: number | null,
  equalWeightFallback?: boolean,
): string {
  if (equalWeightFallback) {
    return '等权重（1:1）'
  }
  if (weight != null && weight > 0) {
    return String(weight)
  }
  return '—'
}

export const formColumns: ColumnsType = [
  { title: '编码', dataIndex: 'formCode', key: 'formCode', width: 120, fixed: 'left' },
  { title: '名称', dataIndex: 'formName', key: 'formName' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '问卷类型', dataIndex: 'formType', key: 'formType', width: 140 },
  { title: '目标', dataIndex: 'targetType', key: 'targetType', width: 200 },
  { title: '期望样本', dataIndex: 'expectedSample', key: 'expectedSample', width: 100 },
  { title: '操作', key: 'actions', width: 360 },
]

export const itemColumns: ColumnsType = [
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 100, fixed: 'left' },
  { title: '题型', dataIndex: 'itemType', key: 'itemType', width: 88 },
  { title: '题面', dataIndex: 'itemText', key: 'itemText' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 70 },
  { title: '有效样本', key: 'validCount', width: 100 },
  { title: '操作', key: 'actions', width: 160 },
]

export const responseColumns: ColumnsType = [
  {
    title: '应答人',
    dataIndex: 'respondentType',
    key: 'respondentType',
    width: 100,
    fixed: 'left',
  },
  { title: '答案', dataIndex: 'answerSummary', key: 'answerSummary', width: 180 },
  { title: '换算分', dataIndex: 'convertedScore', key: 'convertedScore', width: 80 },
  { title: '换算状态', key: 'conversionStatus', width: 88 },
  { title: '开放回答', dataIndex: 'openText', key: 'openText' },
  { title: '有效', dataIndex: 'validFlag', key: 'validFlag', width: 70 },
  { title: '操作', key: 'actions', width: 160 },
]

export function targetTypeLabel(value: AchievementTargetTypeCode): string {
  return strictEnumLabel(AchievementTargetTypeDescription, value, '达成目标类型')
}

export function respondentTypeLabel(value: RespondentTypeCode): string {
  return formatRespondentType(value)
}

export function formTypeLabel(value: IndirectFormTypeCode): string {
  return strictEnumLabel(IndirectFormTypeDescription, value, '间接评价问卷类型')
}

export function formStatusLabel(value: IndirectFormStatusCode | undefined): string {
  if (!value) {
    return strictEnumLabel(
      IndirectFormStatusDescription,
      IndirectFormStatusCode.DRAFT,
      '间接评价问卷状态',
    )
  }
  return strictEnumLabel(IndirectFormStatusDescription, value, '间接评价问卷状态')
}

export function formStatusTone(
  value: IndirectFormStatusCode | undefined,
): 'gray' | 'green' | 'orange' | 'blue' {
  const status = value ?? IndirectFormStatusCode.DRAFT
  if (status === IndirectFormStatusCode.PUBLISHED) return 'green'
  if (status === IndirectFormStatusCode.CLOSED) return 'orange'
  if (status === IndirectFormStatusCode.ARCHIVED) return 'blue'
  return 'gray'
}

export function canPublishForm(record: IndirectEvaluationFormVO): boolean {
  const status = record.status ?? IndirectFormStatusCode.DRAFT
  return status === IndirectFormStatusCode.DRAFT || status === IndirectFormStatusCode.CLOSED
}

export function isFormStructureMutable(
  record: IndirectEvaluationFormVO | null | undefined,
): boolean {
  if (!record) return false
  const status = record.status ?? IndirectFormStatusCode.DRAFT
  return status === IndirectFormStatusCode.DRAFT || status === IndirectFormStatusCode.CLOSED
}

/** C10：PUBLISHED 问卷改题型阻断文案 */
export const PUBLISHED_INDIRECT_ITEM_TYPE_CHANGE_MESSAGE
  = '该问卷已发布，请先关闭问卷（操作路径：间接评价工作台 → 关闭问卷），修改题型后将触发该题项下全部答卷状态重算。'

/** Phase A：PUBLISHED 文案编辑说明（C13 保存即生效） */
export const PUBLISHED_INDIRECT_CONTENT_EDIT_MESSAGE
  = '已发布问卷仅允许修改题干与选项文案，保存后立即对新的公开访问生效。'

/** PUBLISHED 问卷允许编辑题项文案（题干、选项/量表标签） */
export function isFormContentEditable(
  record: IndirectEvaluationFormVO | null | undefined,
): boolean {
  if (!record) return false
  return record.status === IndirectFormStatusCode.PUBLISHED
}

/** 已发布 / 已归档问卷题项结构不可编辑（与后端 assertStructureMutable 一致） */
export function isIndirectFormStructureLocked(
  record: IndirectEvaluationFormVO | null | undefined,
): boolean {
  if (!record) return false
  const status = record.status ?? IndirectFormStatusCode.DRAFT
  return status === IndirectFormStatusCode.PUBLISHED || status === IndirectFormStatusCode.ARCHIVED
}

/** C10 内联引导：按问卷状态返回结构锁定说明 */
export function indirectFormStructureLockMessage(
  record: IndirectEvaluationFormVO | null | undefined,
): string {
  if (!record) return ''
  if (record.status === IndirectFormStatusCode.ARCHIVED) {
    return '该问卷已归档，题项结构已锁定，仅可查看配置。'
  }
  if (record.status === IndirectFormStatusCode.PUBLISHED) {
    return PUBLISHED_INDIRECT_ITEM_TYPE_CHANGE_MESSAGE
  }
  return ''
}

/** PUBLISHED 文案编辑模式说明 */
export function indirectFormContentEditMessage(
  record: IndirectEvaluationFormVO | null | undefined,
): string {
  if (!isFormContentEditable(record)) return ''
  return PUBLISHED_INDIRECT_CONTENT_EDIT_MESSAGE
}

/** 换算审计操作人展示：昵称优先，回退 operatorId，系统任务显示「系统」 */
export function formatConversionAuditOperator(log: {
  operatorNickName?: string
  operatorId?: string
}): string {
  const nick = log.operatorNickName?.trim()
  if (nick) return nick
  if (log.operatorId) return `操作人#${log.operatorId}`
  return '系统'
}

/** 换算审计动作语义 */
export function formatConversionAuditAction(
  oldScore?: number | null,
  newScore?: number | null,
): string {
  if (oldScore == null && newScore != null) return '首次换算'
  if (oldScore != null && newScore == null) return '清空换算分'
  if (oldScore != null && newScore != null) return '修正分值'
  return '换算记录'
}

export function isTeacherResponseWritable(
  record: IndirectEvaluationFormVO | null | undefined,
): boolean {
  if (!record) return false
  const status = record.status ?? IndirectFormStatusCode.DRAFT
  return status === IndirectFormStatusCode.DRAFT || status === IndirectFormStatusCode.PUBLISHED
}

export function canCloseForm(record: IndirectEvaluationFormVO): boolean {
  return record.status === IndirectFormStatusCode.PUBLISHED
}

export function canShowWorkflowInsights(record: IndirectEvaluationFormVO): boolean {
  const status = record.status ?? IndirectFormStatusCode.DRAFT
  return (
    status === IndirectFormStatusCode.PUBLISHED
    || status === IndirectFormStatusCode.CLOSED
    || status === IndirectFormStatusCode.ARCHIVED
  )
}

export function buildPublicSurveyUrl(accessToken: string): string {
  return `${window.location.origin}/survey/${accessToken}`
}

export const DEFAULT_IDENTITY_FIELDS: SurveyIdentityFieldVO[] = [
  { fieldKey: 'NAME', fieldLabel: '姓名', fieldType: 'TEXT', required: true },
  { fieldKey: 'ORGANIZATION', fieldLabel: '单位', fieldType: 'TEXT', required: false },
  { fieldKey: 'CONTACT', fieldLabel: '联系方式', fieldType: 'TEXT', required: false },
]

export const accessModeOptions: { value: IndirectFormAccessModeCode, label: string }[] = [
  {
    value: IndirectFormAccessModeCode.PUBLIC_LINK,
    label: strictEnumLabel(
      IndirectFormAccessModeDescription,
      IndirectFormAccessModeCode.PUBLIC_LINK,
      '问卷访问模式',
    ),
  },
  {
    value: IndirectFormAccessModeCode.AUTHENTICATED,
    label: strictEnumLabel(
      IndirectFormAccessModeDescription,
      IndirectFormAccessModeCode.AUTHENTICATED,
      '问卷访问模式',
    ),
  },
  {
    value: IndirectFormAccessModeCode.BOTH,
    label: strictEnumLabel(
      IndirectFormAccessModeDescription,
      IndirectFormAccessModeCode.BOTH,
      '问卷访问模式',
    ),
  },
]

export const formTypeOptions: { value: IndirectFormTypeCode, label: string }[] = [
  {
    value: IndirectFormTypeCode.STUDENT_SELF,
    label: strictEnumLabel(
      IndirectFormTypeDescription,
      IndirectFormTypeCode.STUDENT_SELF,
      '间接评价问卷类型',
    ),
  },
  {
    value: IndirectFormTypeCode.GRADUATE_TRACKING,
    label: strictEnumLabel(
      IndirectFormTypeDescription,
      IndirectFormTypeCode.GRADUATE_TRACKING,
      '间接评价问卷类型',
    ),
  },
  {
    value: IndirectFormTypeCode.TEACHER_EVALUATION,
    label: strictEnumLabel(
      IndirectFormTypeDescription,
      IndirectFormTypeCode.TEACHER_EVALUATION,
      '间接评价问卷类型',
    ),
  },
  {
    value: IndirectFormTypeCode.EMPLOYER_FEEDBACK,
    label: strictEnumLabel(
      IndirectFormTypeDescription,
      IndirectFormTypeCode.EMPLOYER_FEEDBACK,
      '间接评价问卷类型',
    ),
  },
  {
    value: IndirectFormTypeCode.EXPERT_EVALUATION,
    label: strictEnumLabel(
      IndirectFormTypeDescription,
      IndirectFormTypeCode.EXPERT_EVALUATION,
      '间接评价问卷类型',
    ),
  },
  {
    value: IndirectFormTypeCode.SUPERVISOR_EVALUATION,
    label: strictEnumLabel(
      IndirectFormTypeDescription,
      IndirectFormTypeCode.SUPERVISOR_EVALUATION,
      '间接评价问卷类型',
    ),
  },
]

export const targetTypeOptions: { value: AchievementTargetTypeCode, label: string }[] = [
  {
    value: AchievementTargetTypeCode.COURSE_GOAL,
    label: strictEnumLabel(
      AchievementTargetTypeDescription,
      AchievementTargetTypeCode.COURSE_GOAL,
      '达成目标类型',
    ),
  },
  {
    value: AchievementTargetTypeCode.REQUIREMENT_INDICATOR,
    label: strictEnumLabel(
      AchievementTargetTypeDescription,
      AchievementTargetTypeCode.REQUIREMENT_INDICATOR,
      '达成目标类型',
    ),
  },
  {
    value: AchievementTargetTypeCode.GRADUATION_REQUIREMENT,
    label: strictEnumLabel(
      AchievementTargetTypeDescription,
      AchievementTargetTypeCode.GRADUATION_REQUIREMENT,
      '达成目标类型',
    ),
  },
  {
    value: AchievementTargetTypeCode.TRAINING_OBJECTIVE,
    label: strictEnumLabel(
      AchievementTargetTypeDescription,
      AchievementTargetTypeCode.TRAINING_OBJECTIVE,
      '达成目标类型',
    ),
  },
  {
    value: AchievementTargetTypeCode.PROGRAM_SUMMARY,
    label: strictEnumLabel(
      AchievementTargetTypeDescription,
      AchievementTargetTypeCode.PROGRAM_SUMMARY,
      '达成目标类型',
    ),
  },
  {
    value: AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE,
    label: strictEnumLabel(
      AchievementTargetTypeDescription,
      AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE,
      '达成目标类型',
    ),
  },
  {
    value: AchievementTargetTypeCode.COMPLEX_ENGINEERING_AGGREGATE,
    label: strictEnumLabel(
      AchievementTargetTypeDescription,
      AchievementTargetTypeCode.COMPLEX_ENGINEERING_AGGREGATE,
      '达成目标类型',
    ),
  },
]

export function isScaleItemType(itemType: IndirectEvaluationItemTypeCode | undefined): boolean {
  return itemType === IndirectEvaluationItemTypeCode.SCALE
}

export function isSingleChoiceItemType(
  itemType: IndirectEvaluationItemTypeCode | undefined,
): boolean {
  return itemType === IndirectEvaluationItemTypeCode.SINGLE_CHOICE
}

export function isMultiChoiceItemType(
  itemType: IndirectEvaluationItemTypeCode | undefined,
): boolean {
  return itemType === IndirectEvaluationItemTypeCode.MULTI_CHOICE
}

export function isOpenTextItemType(itemType: IndirectEvaluationItemTypeCode | undefined): boolean {
  return itemType === IndirectEvaluationItemTypeCode.OPEN_TEXT
}

/** 选择 / 开放题须教师录入换算分后才纳入间接达成度均值 */
export function requiresTeacherScoreConversion(
  itemType: IndirectEvaluationItemTypeCode | undefined,
): boolean {
  return (
    isSingleChoiceItemType(itemType)
    || isMultiChoiceItemType(itemType)
    || isOpenTextItemType(itemType)
  )
}

export function manualConversionStatusLabel(value: ManualConversionStatusCode | undefined): string {
  if (!value) {
    throw new Error('间接评价换算状态缺失')
  }
  return strictEnumLabel(ManualConversionStatusDescription, value, '间接评价换算状态')
}

export function manualConversionStatusTone(
  value: ManualConversionStatusCode,
): 'gray' | 'green' | 'orange' {
  if (value === ManualConversionStatusCode.PENDING) return 'orange'
  if (value === ManualConversionStatusCode.CONVERTED) return 'green'
  return 'gray'
}
