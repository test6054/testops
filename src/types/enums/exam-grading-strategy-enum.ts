/** 考试批改策略 */
export enum ExamGradingStrategyCode {
  SINGLE = 'SINGLE',
}

export const ALL_EXAM_GRADING_STRATEGY_CODES: readonly ExamGradingStrategyCode[] = [
  ExamGradingStrategyCode.SINGLE,
]

export const ExamGradingStrategyDescription: Record<ExamGradingStrategyCode, string> = {
  [ExamGradingStrategyCode.SINGLE]: '单评',
}

