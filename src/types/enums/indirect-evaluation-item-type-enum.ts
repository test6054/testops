/**
 * 间接评价题项题型枚举
 * 与后端 IndirectEvaluationItemTypeEnum 保持一致
 */
import { throwUserFacing } from '@/utils/contract-guard'

export enum IndirectEvaluationItemType {
  SCALE = 'SCALE',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTI_CHOICE = 'MULTI_CHOICE',
  OPEN_TEXT = 'OPEN_TEXT',
}

/** 管理端 / 间接评价配置题型展示文案 */
export const INDIRECT_EVALUATION_ITEM_TYPE_LABEL: Record<IndirectEvaluationItemType, string> = {
  [IndirectEvaluationItemType.SCALE]: '量表题',
  [IndirectEvaluationItemType.SINGLE_CHOICE]: '单选题',
  [IndirectEvaluationItemType.MULTI_CHOICE]: '多选题',
  [IndirectEvaluationItemType.OPEN_TEXT]: '开放文本',
}

/** 公开问卷填写页题型展示文案（面向填答人） */
export const PUBLIC_SURVEY_ITEM_TYPE_LABEL: Record<IndirectEvaluationItemType, string> = {
  [IndirectEvaluationItemType.SCALE]: '量表题',
  [IndirectEvaluationItemType.SINGLE_CHOICE]: '单选题',
  [IndirectEvaluationItemType.MULTI_CHOICE]: '多选题',
  [IndirectEvaluationItemType.OPEN_TEXT]: '填空题',
}

export const INDIRECT_EVALUATION_ITEM_TYPE_OPTIONS: Array<{
  value: IndirectEvaluationItemType
  label: string
}> = [
  { value: IndirectEvaluationItemType.SCALE, label: INDIRECT_EVALUATION_ITEM_TYPE_LABEL.SCALE },
  {
    value: IndirectEvaluationItemType.SINGLE_CHOICE,
    label: INDIRECT_EVALUATION_ITEM_TYPE_LABEL.SINGLE_CHOICE,
  },
  {
    value: IndirectEvaluationItemType.MULTI_CHOICE,
    label: INDIRECT_EVALUATION_ITEM_TYPE_LABEL.MULTI_CHOICE,
  },
  {
    value: IndirectEvaluationItemType.OPEN_TEXT,
    label: INDIRECT_EVALUATION_ITEM_TYPE_LABEL.OPEN_TEXT,
  },
]

const ITEM_TYPE_SET = new Set<string>(Object.values(IndirectEvaluationItemType))

export function isIndirectEvaluationItemType(
  value: string | null | undefined,
): value is IndirectEvaluationItemType {
  return value !== null && value !== undefined && ITEM_TYPE_SET.has(value)
}

export function formatIndirectEvaluationItemType(
  value: string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  if (!isIndirectEvaluationItemType(value)) {
    throwUserFacing('数据异常，请刷新后重试')
  }
  return INDIRECT_EVALUATION_ITEM_TYPE_LABEL[value]
}

export function formatPublicSurveyItemType(
  value: string | null | undefined,
): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }
  if (!isIndirectEvaluationItemType(value)) {
    throwUserFacing('数据异常，请刷新后重试')
  }
  return PUBLIC_SURVEY_ITEM_TYPE_LABEL[value]
}

export function isIndirectEvaluationChoiceItemType(
  value: IndirectEvaluationItemType | null | undefined,
): boolean {
  return value === IndirectEvaluationItemType.SINGLE_CHOICE
    || value === IndirectEvaluationItemType.MULTI_CHOICE
}
