/**
 * 间接评价题项题型枚举
 * 取值与展示文案以后端 {@code IndirectEvaluationItemTypeEnum} 为真源，须逐值同步。
 */

export enum IndirectEvaluationItemTypeCode {
  SCALE = 'SCALE',
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTI_CHOICE = 'MULTI_CHOICE',
  OPEN_TEXT = 'OPEN_TEXT',
}

export const ALL_INDIRECT_EVALUATION_ITEM_TYPE_CODES: readonly IndirectEvaluationItemTypeCode[] = [
  IndirectEvaluationItemTypeCode.SCALE,
  IndirectEvaluationItemTypeCode.SINGLE_CHOICE,
  IndirectEvaluationItemTypeCode.MULTI_CHOICE,
  IndirectEvaluationItemTypeCode.OPEN_TEXT,
]

/** 与后端 IndirectEvaluationItemTypeEnum.label 一致 */
export const IndirectEvaluationItemTypeDescription: Record<IndirectEvaluationItemTypeCode, string> = {
  [IndirectEvaluationItemTypeCode.SCALE]: '量表题',
  [IndirectEvaluationItemTypeCode.SINGLE_CHOICE]: '单选题',
  [IndirectEvaluationItemTypeCode.MULTI_CHOICE]: '多选题',
  [IndirectEvaluationItemTypeCode.OPEN_TEXT]: '开放文本题',
}

export const INDIRECT_EVALUATION_ITEM_TYPE_OPTIONS: Array<{
  value: IndirectEvaluationItemTypeCode
  label: string
}> = ALL_INDIRECT_EVALUATION_ITEM_TYPE_CODES.map((value) => ({
  value,
  label: IndirectEvaluationItemTypeDescription[value],
}))

const ITEM_TYPE_SET = new Set<string>(Object.values(IndirectEvaluationItemTypeCode))

export function isIndirectEvaluationItemType(
  value: string | null | undefined,
): value is IndirectEvaluationItemTypeCode {
  return value !== null && value !== undefined && ITEM_TYPE_SET.has(value)
}

export function formatIndirectEvaluationItemType(
  value: IndirectEvaluationItemTypeCode,
): string {
  return IndirectEvaluationItemTypeDescription[value]
}

export function formatPublicSurveyItemType(
  value: IndirectEvaluationItemTypeCode,
): string {
  return formatIndirectEvaluationItemType(value)
}

export function isIndirectEvaluationChoiceItemType(
  value: IndirectEvaluationItemTypeCode | null | undefined,
): boolean {
  return value === IndirectEvaluationItemTypeCode.SINGLE_CHOICE
    || value === IndirectEvaluationItemTypeCode.MULTI_CHOICE
}
