import type { EffectiveStatusCode } from './effective-status'
import { EFFECTIVE_STATUS_LABEL } from './effective-status'
/**
 * 阅卷考试标准答案 API - 对接 /api/mark/exams/standard-answer/*。
 */
import http from '@/config/axios'
import { assertUserFacingFiniteNumber, assertUserFacingText } from '@/utils/contract-guard'
import { strictEnumLabel } from '@/utils/strict-enum'

const STANDARD_ANSWER_DATA_ERROR = '标准答案数据异常，请刷新后重试'

/**
 * 客观题比较策略编码 - 与后端 com.nybc.edu.common.enums.ObjectiveComparePolicy 一一对齐。
 */
export type ObjectiveComparePolicyCode =
  'EXACT_NORMALIZED' | 'CHOICE_SET' | 'REGEX' | 'NUMERIC_TOLERANCE' | 'AI_GRADE'

/** 客观题比较策略选项，供前端 a-select 渲染 */
export const OBJECTIVE_COMPARE_POLICY_OPTIONS: Array<{
  value: ObjectiveComparePolicyCode
  label: string
}> = [
  { value: 'EXACT_NORMALIZED', label: '规范化精确比较（填空 / 单空对比）' },
  { value: 'CHOICE_SET', label: '选择题集合判等（多选 / 顺序无关）' },
  { value: 'REGEX', label: '正则匹配（自定义答案模式）' },
  { value: 'NUMERIC_TOLERANCE', label: '数值容差（标准值 + 容差 + 单位）' },
  { value: 'AI_GRADE', label: 'AI 评分（无标答时由 AI 给出评分，教师复核）' },
]

/** 选择题标准答案选项请求 - 对应后端 ExamQuestionStandardAnswerOptionRequest */
export interface ExamQuestionStandardAnswerOptionRequest {
  /** 正确选项标签 */
  optionLabel: string
  /** 选项排序号 */
  sortNo: number
}

/** 选择题正式声明选项请求 - 对应后端 ExamQuestionDeclaredOptionRequest */
export interface ExamQuestionDeclaredOptionRequest {
  /** 声明选项标签 */
  optionLabel: string
  /** 选项排序号 */
  sortNo: number
}

/** 标准答案保存请求 - 对应 ExamStandardAnswerSaveRequest */
export interface ExamStandardAnswerSaveRequest {
  examId: string
  questionTemplateId: string
  /**
   * 文本类策略填写；选择集合、数值容差和 AI 评分策略由结构化字段承接。
   * 主观题 standardAnswer 一律可选。
   */
  standardAnswer?: string
  declaredOptions?: ExamQuestionDeclaredOptionRequest[]
  choiceOptions?: ExamQuestionStandardAnswerOptionRequest[]
  answerExplain?: string
  comparePolicy?: ObjectiveComparePolicyCode
  numericExpectedValue?: string
  numericTolerance?: string
  numericUnit?: string
  gradingRubric?: string
  aiHint?: string
  effectiveNow?: boolean
}

/** 标准答案查询请求 - 对应 ExamStandardAnswerQueryRequest */
export interface ExamStandardAnswerQueryRequest {
  examId: string
  questionTemplateId: string
}

/** 选择题标准答案选项响应 - 对应 ExamQuestionStandardAnswerOptionResponse */
export interface ExamQuestionStandardAnswerOptionVO {
  optionId: string
  optionLabel: string
  sortNo: number
}

/** 选择题正式声明选项响应 - 对应后端 ExamQuestionDeclaredOptionResponse */
export interface ExamQuestionDeclaredOptionVO {
  optionId: string
  optionLabel: string
  sortNo: number
}

/** 标准答案响应 - 对应 ExamStandardAnswerResponse */
export interface ExamStandardAnswerVO {
  standardAnswerId: string
  examId: string
  questionTemplateId: string
  standardAnswer?: string
  declaredOptions: ExamQuestionDeclaredOptionVO[]
  choiceOptions: ExamQuestionStandardAnswerOptionVO[]
  answerExplain?: string
  comparePolicy?: ObjectiveComparePolicyCode
  numericExpectedValue?: number
  numericTolerance?: number
  numericUnit?: string
  gradingRubric?: string
  aiHint?: string
  effectiveStatus?: EffectiveStatusCode
}

/** 标准答案选项合同校验，确保选择题答案选项 ID、标签和排序完整。 */
function validateStandardAnswerOptionContract(record: ExamQuestionStandardAnswerOptionVO): void {
  assertUserFacingText(record.optionId, STANDARD_ANSWER_DATA_ERROR)
  assertUserFacingText(record.optionLabel, STANDARD_ANSWER_DATA_ERROR)
  assertUserFacingFiniteNumber(record.sortNo, STANDARD_ANSWER_DATA_ERROR)
}

/** 正式声明选项合同校验，确保自动判分选项空间与标准答案展示使用同一正式口径。 */
function validateDeclaredOptionContract(record: ExamQuestionDeclaredOptionVO): void {
  assertUserFacingText(record.optionId, STANDARD_ANSWER_DATA_ERROR)
  assertUserFacingText(record.optionLabel, STANDARD_ANSWER_DATA_ERROR)
  assertUserFacingFiniteNumber(record.sortNo, STANDARD_ANSWER_DATA_ERROR)
}

/** 标准答案合同校验，空记录表示该题尚未配置标准答案。 */
function validateStandardAnswerContract(
  record: ExamStandardAnswerVO | null,
): ExamStandardAnswerVO | null {
  if (record === null) {
    return null
  }
  assertUserFacingText(record.standardAnswerId, STANDARD_ANSWER_DATA_ERROR)
  assertUserFacingText(record.examId, STANDARD_ANSWER_DATA_ERROR)
  assertUserFacingText(record.questionTemplateId, STANDARD_ANSWER_DATA_ERROR)
  if (record.comparePolicy) {
    strictEnumLabel(
      {
        EXACT_NORMALIZED: '规范化精确比较',
        CHOICE_SET: '选择题集合判等',
        REGEX: '正则匹配',
        NUMERIC_TOLERANCE: '数值容差',
        AI_GRADE: 'AI 评分',
      },
      record.comparePolicy,
      '客观题比较策略',
    )
  }
  if (!Array.isArray(record.declaredOptions)) {
    throw new TypeError(STANDARD_ANSWER_DATA_ERROR)
  }
  record.declaredOptions.forEach(validateDeclaredOptionContract)
  if (!Array.isArray(record.choiceOptions)) {
    throw new TypeError(STANDARD_ANSWER_DATA_ERROR)
  }
  record.choiceOptions.forEach(validateStandardAnswerOptionContract)
  if (record.effectiveStatus) {
    strictEnumLabel(EFFECTIVE_STATUS_LABEL, record.effectiveStatus, '标准答案生效状态')
  }
  return record
}

/** 保存题目标准答案。 */
export function saveStandardAnswer(request: ExamStandardAnswerSaveRequest): Promise<string> {
  return http.post<string>('/api/mark/exams/standard-answer/save', request)
}

/** 查询题目当前标准答案。 */
export async function getStandardAnswer(
  request: ExamStandardAnswerQueryRequest,
): Promise<ExamStandardAnswerVO | null> {
  const record = await http.post<ExamStandardAnswerVO | null>(
    '/api/mark/exams/standard-answer/get',
    request,
  )
  return validateStandardAnswerContract(record)
}
