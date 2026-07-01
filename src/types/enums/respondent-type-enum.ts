/**
 * 间接评价应答人类型
 * 与后端 RespondentTypeEnum 保持一致
 */
import { throwUserFacing } from '@/utils/contract-guard'

export enum RespondentType {
  STUDENT = 'STUDENT',
  GRADUATE = 'GRADUATE',
  EMPLOYER = 'EMPLOYER',
  TEACHER = 'TEACHER',
  EXPERT = 'EXPERT',
  SUPERVISOR = 'SUPERVISOR',
  PUBLIC = 'PUBLIC',
  EXCEL_IMPORT = 'EXCEL_IMPORT',
  AI_DRAFT = 'AI_DRAFT',
}

export const RESPONDENT_TYPE_LABEL: Record<RespondentType, string> = {
  [RespondentType.STUDENT]: '在校学生',
  [RespondentType.GRADUATE]: '毕业生',
  [RespondentType.EMPLOYER]: '用人单位',
  [RespondentType.TEACHER]: '任课教师',
  [RespondentType.EXPERT]: '校外专家',
  [RespondentType.SUPERVISOR]: '教学督导',
  [RespondentType.PUBLIC]: '公开填报',
  [RespondentType.EXCEL_IMPORT]: 'Excel 导入',
  [RespondentType.AI_DRAFT]: 'AI 解析草稿',
}

/** 管理端手工录入答卷时可选的应答人类型 */
export const MANUAL_RESPONDENT_TYPE_OPTIONS: Array<{ value: RespondentType, label: string }> = [
  { value: RespondentType.STUDENT, label: RESPONDENT_TYPE_LABEL.STUDENT },
  { value: RespondentType.GRADUATE, label: RESPONDENT_TYPE_LABEL.GRADUATE },
  { value: RespondentType.EMPLOYER, label: RESPONDENT_TYPE_LABEL.EMPLOYER },
  { value: RespondentType.TEACHER, label: RESPONDENT_TYPE_LABEL.TEACHER },
  { value: RespondentType.EXPERT, label: RESPONDENT_TYPE_LABEL.EXPERT },
  { value: RespondentType.SUPERVISOR, label: RESPONDENT_TYPE_LABEL.SUPERVISOR },
]

const RESPONDENT_TYPE_SET = new Set<string>(Object.values(RespondentType))

export function isRespondentType(value: string | null | undefined): value is RespondentType {
  return value !== null && value !== undefined && RESPONDENT_TYPE_SET.has(value)
}

export function formatRespondentType(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  if (!isRespondentType(value)) {
    throwUserFacing('数据异常，请刷新后重试')
  }
  return RESPONDENT_TYPE_LABEL[value]
}

export function isSystemCollectedRespondentType(value: RespondentType | null | undefined): boolean {
  return value === RespondentType.PUBLIC || value === RespondentType.EXCEL_IMPORT
}
