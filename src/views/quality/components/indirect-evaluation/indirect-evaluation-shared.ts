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
import {
  IndirectEvaluationItemTypeCode,
} from '@/types/enums/indirect-evaluation-item-type-enum'
import {
  formatRespondentType,
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
    return strictEnumLabel(IndirectFormStatusDescription, IndirectFormStatusCode.DRAFT, '间接评价问卷状态')
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
  return status === IndirectFormStatusCode.PUBLISHED
    || status === IndirectFormStatusCode.CLOSED
    || status === IndirectFormStatusCode.ARCHIVED
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
    label: strictEnumLabel(IndirectFormAccessModeDescription, IndirectFormAccessModeCode.PUBLIC_LINK, '问卷访问模式'),
  },
  {
    value: IndirectFormAccessModeCode.AUTHENTICATED,
    label: strictEnumLabel(IndirectFormAccessModeDescription, IndirectFormAccessModeCode.AUTHENTICATED, '问卷访问模式'),
  },
  {
    value: IndirectFormAccessModeCode.BOTH,
    label: strictEnumLabel(IndirectFormAccessModeDescription, IndirectFormAccessModeCode.BOTH, '问卷访问模式'),
  },
]

export const formTypeOptions: { value: IndirectFormTypeCode, label: string }[] = [
  {
    value: IndirectFormTypeCode.STUDENT_SELF,
    label: strictEnumLabel(IndirectFormTypeDescription, IndirectFormTypeCode.STUDENT_SELF, '间接评价问卷类型'),
  },
  {
    value: IndirectFormTypeCode.GRADUATE_TRACKING,
    label: strictEnumLabel(IndirectFormTypeDescription, IndirectFormTypeCode.GRADUATE_TRACKING, '间接评价问卷类型'),
  },
  {
    value: IndirectFormTypeCode.TEACHER_EVALUATION,
    label: strictEnumLabel(IndirectFormTypeDescription, IndirectFormTypeCode.TEACHER_EVALUATION, '间接评价问卷类型'),
  },
  {
    value: IndirectFormTypeCode.EMPLOYER_FEEDBACK,
    label: strictEnumLabel(IndirectFormTypeDescription, IndirectFormTypeCode.EMPLOYER_FEEDBACK, '间接评价问卷类型'),
  },
  {
    value: IndirectFormTypeCode.EXPERT_EVALUATION,
    label: strictEnumLabel(IndirectFormTypeDescription, IndirectFormTypeCode.EXPERT_EVALUATION, '间接评价问卷类型'),
  },
  {
    value: IndirectFormTypeCode.SUPERVISOR_EVALUATION,
    label: strictEnumLabel(IndirectFormTypeDescription, IndirectFormTypeCode.SUPERVISOR_EVALUATION, '间接评价问卷类型'),
  },
]

export const targetTypeOptions: { value: AchievementTargetTypeCode, label: string }[] = [
  {
    value: AchievementTargetTypeCode.COURSE_GOAL,
    label: strictEnumLabel(AchievementTargetTypeDescription, AchievementTargetTypeCode.COURSE_GOAL, '达成目标类型'),
  },
  {
    value: AchievementTargetTypeCode.REQUIREMENT_INDICATOR,
    label: strictEnumLabel(AchievementTargetTypeDescription, AchievementTargetTypeCode.REQUIREMENT_INDICATOR, '达成目标类型'),
  },
  {
    value: AchievementTargetTypeCode.GRADUATION_REQUIREMENT,
    label: strictEnumLabel(AchievementTargetTypeDescription, AchievementTargetTypeCode.GRADUATION_REQUIREMENT, '达成目标类型'),
  },
  {
    value: AchievementTargetTypeCode.TRAINING_OBJECTIVE,
    label: strictEnumLabel(AchievementTargetTypeDescription, AchievementTargetTypeCode.TRAINING_OBJECTIVE, '达成目标类型'),
  },
  {
    value: AchievementTargetTypeCode.PROGRAM_SUMMARY,
    label: strictEnumLabel(AchievementTargetTypeDescription, AchievementTargetTypeCode.PROGRAM_SUMMARY, '达成目标类型'),
  },
  {
    value: AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE,
    label: strictEnumLabel(AchievementTargetTypeDescription, AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE, '达成目标类型'),
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

export function isSingleChoiceItemType(itemType: IndirectEvaluationItemTypeCode | undefined): boolean {
  return itemType === IndirectEvaluationItemTypeCode.SINGLE_CHOICE
}

export function isMultiChoiceItemType(itemType: IndirectEvaluationItemTypeCode | undefined): boolean {
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
