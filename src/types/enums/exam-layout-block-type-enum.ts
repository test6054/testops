/**
 * 制卷布局块类型
 */

export enum ExamLayoutBlockTypeCode {
  IDENTITY_BUBBLE = 'IDENTITY_BUBBLE',
  OBJECTIVE_MATRIX = 'OBJECTIVE_MATRIX',
  SUBJECTIVE_ANSWER = 'SUBJECTIVE_ANSWER',
  QUESTION_STEM = 'QUESTION_STEM',
  FORBIDDEN_ZONE = 'FORBIDDEN_ZONE',
}

/** 全部合法布局块类型（显式枚举成员列表）。 */
export const ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES: readonly ExamLayoutBlockTypeCode[] = [
  ExamLayoutBlockTypeCode.IDENTITY_BUBBLE,
  ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX,
  ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER,
  ExamLayoutBlockTypeCode.QUESTION_STEM,
  ExamLayoutBlockTypeCode.FORBIDDEN_ZONE,
]

/** 布局块类型文案 */
export const ExamLayoutBlockTypeDescription: Record<ExamLayoutBlockTypeCode, string> = {
  [ExamLayoutBlockTypeCode.IDENTITY_BUBBLE]: '身份填涂区',
  [ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX]: '客观填涂矩阵',
  [ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER]: '主观作答区',
  [ExamLayoutBlockTypeCode.QUESTION_STEM]: '题面区',
  [ExamLayoutBlockTypeCode.FORBIDDEN_ZONE]: '禁止识别区',
}

export const ExamLayoutBlockTypeOptions: Array<{ value: ExamLayoutBlockTypeCode, label: string }> = [
  { value: ExamLayoutBlockTypeCode.IDENTITY_BUBBLE, label: ExamLayoutBlockTypeDescription[ExamLayoutBlockTypeCode.IDENTITY_BUBBLE] },
  { value: ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX, label: ExamLayoutBlockTypeDescription[ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX] },
  { value: ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER, label: ExamLayoutBlockTypeDescription[ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER] },
  { value: ExamLayoutBlockTypeCode.QUESTION_STEM, label: ExamLayoutBlockTypeDescription[ExamLayoutBlockTypeCode.QUESTION_STEM] },
  { value: ExamLayoutBlockTypeCode.FORBIDDEN_ZONE, label: ExamLayoutBlockTypeDescription[ExamLayoutBlockTypeCode.FORBIDDEN_ZONE] },
]

export function getExamLayoutBlockTypeDescription(code: ExamLayoutBlockTypeCode): string {
  return ExamLayoutBlockTypeDescription[code]
}

/** 协议边界：非法时显式失败。 */
export function requireExamLayoutBlockTypeCode(value: unknown): ExamLayoutBlockTypeCode {
  if (typeof value !== 'string') {
    throw new TypeError('布局块类型契约异常，请刷新后重试')
  }
  const code = ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES.find((item) => item === value)
  if (!code) {
    throw new Error('布局块类型契约异常，请刷新后重试')
  }
  return code
}
