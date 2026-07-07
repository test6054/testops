/** 客观题比较策略 - 与后端 com.nybc.edu.common.enums.ObjectiveComparePolicy 对齐 */
export enum ObjectiveComparePolicyCode {
  EXACT_NORMALIZED = 'EXACT_NORMALIZED',
  CHOICE_SET = 'CHOICE_SET',
  REGEX = 'REGEX',
  NUMERIC_TOLERANCE = 'NUMERIC_TOLERANCE',
  AI_GRADE = 'AI_GRADE',
}

export const ALL_OBJECTIVE_COMPARE_POLICY_CODES: readonly ObjectiveComparePolicyCode[] = [
  ObjectiveComparePolicyCode.EXACT_NORMALIZED,
  ObjectiveComparePolicyCode.CHOICE_SET,
  ObjectiveComparePolicyCode.REGEX,
  ObjectiveComparePolicyCode.NUMERIC_TOLERANCE,
  ObjectiveComparePolicyCode.AI_GRADE,
]

export const ObjectiveComparePolicyDescription: Record<ObjectiveComparePolicyCode, string> = {
  [ObjectiveComparePolicyCode.EXACT_NORMALIZED]: '规范化精确比较（填空 / 单空对比）',
  [ObjectiveComparePolicyCode.CHOICE_SET]: '选择题集合判等（多选 / 顺序无关）',
  [ObjectiveComparePolicyCode.REGEX]: '正则匹配（自定义答案模式）',
  [ObjectiveComparePolicyCode.NUMERIC_TOLERANCE]: '数值容差（标准值 + 容差 + 单位）',
  [ObjectiveComparePolicyCode.AI_GRADE]: 'AI 评分（无标答时由 AI 给出评分，教师复核）',
}

