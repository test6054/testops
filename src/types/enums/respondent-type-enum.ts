/**
 * 间接评价应答人类型
 * 与后端 RespondentTypeEnum 保持一致
 */
import { strictEnumLabel } from '@/utils/strict-enum'

export enum RespondentTypeCode {
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

export const ALL_RESPONDENT_TYPE_CODES: readonly RespondentTypeCode[] = [
  RespondentTypeCode.STUDENT,
  RespondentTypeCode.GRADUATE,
  RespondentTypeCode.EMPLOYER,
  RespondentTypeCode.TEACHER,
  RespondentTypeCode.EXPERT,
  RespondentTypeCode.SUPERVISOR,
  RespondentTypeCode.PUBLIC,
  RespondentTypeCode.EXCEL_IMPORT,
  RespondentTypeCode.AI_DRAFT,
]

export const RespondentTypeDescription: Record<RespondentTypeCode, string> = {
  [RespondentTypeCode.STUDENT]: '在校学生',
  [RespondentTypeCode.GRADUATE]: '毕业生',
  [RespondentTypeCode.EMPLOYER]: '用人单位',
  [RespondentTypeCode.TEACHER]: '任课教师',
  [RespondentTypeCode.EXPERT]: '校外专家',
  [RespondentTypeCode.SUPERVISOR]: '教学督导',
  [RespondentTypeCode.PUBLIC]: '公开填报',
  [RespondentTypeCode.EXCEL_IMPORT]: 'Excel 导入',
  [RespondentTypeCode.AI_DRAFT]: 'AI 解析草稿',
}

/** 管理端手工录入答卷时可选的应答人类型 */
export const MANUAL_RESPONDENT_TYPE_OPTIONS: Array<{ value: RespondentTypeCode, label: string }>
  = ALL_RESPONDENT_TYPE_CODES.filter((value) =>
    value !== RespondentTypeCode.PUBLIC
    && value !== RespondentTypeCode.EXCEL_IMPORT
    && value !== RespondentTypeCode.AI_DRAFT,
  ).map((value) => ({
    value,
    label: strictEnumLabel(RespondentTypeDescription, value, '应答人类型'),
  }))

const RESPONDENT_TYPE_SET = new Set<string>(Object.values(RespondentTypeCode))

export function isRespondentType(value: string | null | undefined): value is RespondentTypeCode {
  return value !== null && value !== undefined && RESPONDENT_TYPE_SET.has(value)
}

export function formatRespondentType(value: RespondentTypeCode): string {
  return strictEnumLabel(RespondentTypeDescription, value, '应答人类型')
}

export function isSystemCollectedRespondentType(value: RespondentTypeCode | null | undefined): boolean {
  return value === RespondentTypeCode.PUBLIC || value === RespondentTypeCode.EXCEL_IMPORT
}
