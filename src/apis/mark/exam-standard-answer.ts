import type { EffectiveStatusCode } from './effective-status'
/**
 * 阅卷考试标准答案 API - 对接 /api/mark/exams/standard-answer/*。
 */
import http from '@/config/axios'

import {
  ALL_OBJECTIVE_COMPARE_POLICY_CODES,
  ObjectiveComparePolicyCode,
  ObjectiveComparePolicyDescription,
} from '@/types/enums/objective-compare-policy-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

export {
  ALL_OBJECTIVE_COMPARE_POLICY_CODES,
  ObjectiveComparePolicyCode,
  ObjectiveComparePolicyDescription,
}

/** 客观题比较策略选项，供前端 a-select 渲染 */
export const OBJECTIVE_COMPARE_POLICY_OPTIONS: Array<{
  value: ObjectiveComparePolicyCode
  label: string
}> = ALL_OBJECTIVE_COMPARE_POLICY_CODES.map((value) => ({
  value,
  label: strictEnumLabel(ObjectiveComparePolicyDescription, value, '客观题比较策略'),
}))

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

/** 标准答案查询请求 - 对应 ExamStandardAnswerQueryRequest */
export interface ExamStandardAnswerQueryRequest {
  examId: string
  layoutQuestionId: string
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
export interface ExamStandardAnswerResponse {
  standardAnswerId: string
  examId: string
  layoutQuestionId: string
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

/** 查询题目当前标准答案。 */
export function getStandardAnswer(
  request: ExamStandardAnswerQueryRequest,
): Promise<ExamStandardAnswerResponse | null> {
  return http.post<ExamStandardAnswerResponse | null>(
    '/api/mark/exams/standard-answer/get',
    request,
  )
}
