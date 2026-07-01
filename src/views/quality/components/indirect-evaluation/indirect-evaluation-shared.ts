import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PublicSurveyItemType, SurveyIdentityFieldVO } from '@/apis/public-survey'
import {
  INDIRECT_EVALUATION_ITEM_TYPE_OPTIONS,
  IndirectEvaluationItemType,
} from '@/types/enums/indirect-evaluation-item-type-enum'
import type { IndirectEvaluationFormVO } from '@/apis/quality/indirect-form'
import type {
  AchievementTargetType,
  IndirectFormAccessMode,
  IndirectFormStatus,
  IndirectFormType,
} from '@/apis/quality/types'
import {
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  INDIRECT_FORM_ACCESS_MODE_LABEL,
  INDIRECT_FORM_STATUS_LABEL,
  INDIRECT_FORM_TYPE_LABEL,
} from '@/apis/quality/types'
import {
  formatRespondentType,
  MANUAL_RESPONDENT_TYPE_OPTIONS,
  RespondentType,
} from '@/types/enums/respondent-type-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export const ITEM_CONFIG_ERROR = '题项配置不完整，请检查后重试'
export const SCALE_CONVERSION_RULE_OPTION_PAGE_SIZE = 100

export const formColumns: ColumnsType = [
  { title: '编码', dataIndex: 'formCode', key: 'formCode', width: 120 },
  { title: '名称', dataIndex: 'formName', key: 'formName' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '问卷类型', dataIndex: 'formType', key: 'formType', width: 140 },
  { title: '目标', dataIndex: 'targetType', key: 'targetType', width: 200 },
  { title: '期望样本', dataIndex: 'expectedSample', key: 'expectedSample', width: 100 },
  { title: '操作', key: 'actions', width: 360, fixed: 'right' },
]

export const itemColumns: ColumnsType = [
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 100 },
  { title: '题型', dataIndex: 'itemType', key: 'itemType', width: 88 },
  { title: '题面', dataIndex: 'itemText', key: 'itemText' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 70 },
  { title: '有效样本', key: 'validCount', width: 100 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

export const responseColumns: ColumnsType = [
  { title: '应答人', dataIndex: 'respondentType', key: 'respondentType', width: 100 },
  { title: '答案', dataIndex: 'answerSummary', key: 'answerSummary', width: 180 },
  { title: '换算分', dataIndex: 'convertedScore', key: 'convertedScore', width: 80 },
  { title: '换算状态', key: 'conversionStatus', width: 88 },
  { title: '开放回答', dataIndex: 'openText', key: 'openText' },
  { title: '有效', dataIndex: 'validFlag', key: 'validFlag', width: 70 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

export function targetTypeLabel(value: AchievementTargetType): string {
  return strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, value, '达成目标类型')
}

export function respondentTypeLabel(value: RespondentType): string {
  return formatRespondentType(value)
}

export function formTypeLabel(value: IndirectFormType): string {
  return strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, value, '间接评价问卷类型')
}

export function formStatusLabel(value: IndirectFormStatus | undefined): string {
  if (!value) {
    return strictEnumLabel(INDIRECT_FORM_STATUS_LABEL, 'DRAFT', '间接评价问卷状态')
  }
  return strictEnumLabel(INDIRECT_FORM_STATUS_LABEL, value, '间接评价问卷状态')
}

export function formStatusTone(
  value: IndirectFormStatus | undefined,
): 'gray' | 'green' | 'orange' | 'blue' {
  const status = value ?? 'DRAFT'
  if (status === 'PUBLISHED') return 'green'
  if (status === 'CLOSED') return 'orange'
  if (status === 'ARCHIVED') return 'blue'
  return 'gray'
}

export function canPublishForm(record: IndirectEvaluationFormVO): boolean {
  const status = record.status ?? 'DRAFT'
  return status === 'DRAFT' || status === 'CLOSED'
}

export function isFormStructureMutable(
  record: IndirectEvaluationFormVO | null | undefined,
): boolean {
  if (!record) return false
  const status = record.status ?? 'DRAFT'
  return status === 'DRAFT' || status === 'CLOSED'
}

export function isTeacherResponseWritable(
  record: IndirectEvaluationFormVO | null | undefined,
): boolean {
  if (!record) return false
  const status = record.status ?? 'DRAFT'
  return status === 'DRAFT' || status === 'PUBLISHED'
}

export function canCloseForm(record: IndirectEvaluationFormVO): boolean {
  return record.status === 'PUBLISHED'
}

export function canShowWorkflowInsights(record: IndirectEvaluationFormVO): boolean {
  const status = record.status ?? 'DRAFT'
  return status === 'PUBLISHED' || status === 'CLOSED' || status === 'ARCHIVED'
}

export function buildPublicSurveyUrl(accessToken: string): string {
  return `${window.location.origin}/survey/${accessToken}`
}

export const DEFAULT_IDENTITY_FIELDS: SurveyIdentityFieldVO[] = [
  { fieldKey: 'NAME', fieldLabel: '姓名', fieldType: 'TEXT', required: true },
  { fieldKey: 'ORGANIZATION', fieldLabel: '单位', fieldType: 'TEXT', required: false },
  { fieldKey: 'CONTACT', fieldLabel: '联系方式', fieldType: 'TEXT', required: false },
]

export const accessModeOptions: { value: IndirectFormAccessMode; label: string }[] = [
  {
    value: 'PUBLIC_LINK',
    label: strictEnumLabel(INDIRECT_FORM_ACCESS_MODE_LABEL, 'PUBLIC_LINK', '问卷访问模式'),
  },
  {
    value: 'AUTHENTICATED',
    label: strictEnumLabel(INDIRECT_FORM_ACCESS_MODE_LABEL, 'AUTHENTICATED', '问卷访问模式'),
  },
  {
    value: 'BOTH',
    label: strictEnumLabel(INDIRECT_FORM_ACCESS_MODE_LABEL, 'BOTH', '问卷访问模式'),
  },
]

export const formTypeOptions: { value: IndirectFormType; label: string }[] = [
  {
    value: 'STUDENT_SELF',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'STUDENT_SELF', '间接评价问卷类型'),
  },
  {
    value: 'GRADUATE_TRACKING',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'GRADUATE_TRACKING', '间接评价问卷类型'),
  },
  {
    value: 'TEACHER_EVALUATION',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'TEACHER_EVALUATION', '间接评价问卷类型'),
  },
  {
    value: 'EMPLOYER_FEEDBACK',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'EMPLOYER_FEEDBACK', '间接评价问卷类型'),
  },
  {
    value: 'EXPERT_EVALUATION',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'EXPERT_EVALUATION', '间接评价问卷类型'),
  },
  {
    value: 'SUPERVISOR_EVALUATION',
    label: strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, 'SUPERVISOR_EVALUATION', '间接评价问卷类型'),
  },
]

export const targetTypeOptions: { value: AchievementTargetType; label: string }[] = [
  {
    value: 'COURSE_GOAL',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'COURSE_GOAL', '达成目标类型'),
  },
  {
    value: 'REQUIREMENT_INDICATOR',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'REQUIREMENT_INDICATOR', '达成目标类型'),
  },
  {
    value: 'GRADUATION_REQUIREMENT',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'GRADUATION_REQUIREMENT', '达成目标类型'),
  },
  {
    value: 'TRAINING_OBJECTIVE',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'TRAINING_OBJECTIVE', '达成目标类型'),
  },
  {
    value: 'PROGRAM_SUMMARY',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'PROGRAM_SUMMARY', '达成目标类型'),
  },
  {
    value: 'CIVIC_GOAL_AGGREGATE',
    label: strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, 'CIVIC_GOAL_AGGREGATE', '达成目标类型'),
  },
  {
    value: 'COMPLEX_ENGINEERING_AGGREGATE',
    label: strictEnumLabel(
      ACHIEVEMENT_TARGET_TYPE_LABEL,
      'COMPLEX_ENGINEERING_AGGREGATE',
      '达成目标类型',
    ),
  },
]

export const respondentTypeOptions = MANUAL_RESPONDENT_TYPE_OPTIONS

export const itemTypeOptions = INDIRECT_EVALUATION_ITEM_TYPE_OPTIONS

export function isScaleItemType(itemType: PublicSurveyItemType | undefined): boolean {
  return itemType === IndirectEvaluationItemType.SCALE
}

export function isSingleChoiceItemType(itemType: PublicSurveyItemType | undefined): boolean {
  return itemType === IndirectEvaluationItemType.SINGLE_CHOICE
}

export function isMultiChoiceItemType(itemType: PublicSurveyItemType | undefined): boolean {
  return itemType === IndirectEvaluationItemType.MULTI_CHOICE
}

export function isOpenTextItemType(itemType: PublicSurveyItemType | undefined): boolean {
  return itemType === IndirectEvaluationItemType.OPEN_TEXT
}

/** 选择 / 开放题须教师录入换算分后才纳入间接达成度均值 */
export function requiresTeacherScoreConversion(
  itemType: PublicSurveyItemType | undefined,
): boolean {
  return (
    isSingleChoiceItemType(itemType) ||
    isMultiChoiceItemType(itemType) ||
    isOpenTextItemType(itemType)
  )
}
