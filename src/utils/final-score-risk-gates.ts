import { FinalScoreRiskReasonCode } from '@/apis/mark/exam-score'

/**
 * 场级写分硬拦原因码。
 * 与 BE FinalScoreRiskReviewServiceImpl 场级硬拦集合语义对齐。
 */
export const FINAL_SCORE_WRITE_HARD_BLOCK_REASON_CODES = new Set<FinalScoreRiskReasonCode>([
  FinalScoreRiskReasonCode.UNRECONCILED_ABSENCE,
  FinalScoreRiskReasonCode.UNRESOLVED_ABSENCE_SCORE_POLICY,
  FinalScoreRiskReasonCode.BLOCKING_INCIDENT,
  FinalScoreRiskReasonCode.PENDING_DUPLICATE_IMAGE,
])

/**
 * 不可靠「集中复核已标记」绕过的原因码。
 * 与 BE FinalScoreRiskReviewServiceImpl 不可软复核集合语义对齐。
 */
export const FINAL_SCORE_NON_SOFT_REVIEWABLE_REASON_CODES = new Set<FinalScoreRiskReasonCode>([
  FinalScoreRiskReasonCode.UNRECONCILED_ABSENCE,
  FinalScoreRiskReasonCode.UNRESOLVED_ABSENCE_SCORE_POLICY,
  FinalScoreRiskReasonCode.MISSING_ABSENCE_SCORE_ZERO_FINAL,
  FinalScoreRiskReasonCode.BLOCKING_INCIDENT,
  FinalScoreRiskReasonCode.PENDING_DUPLICATE_IMAGE,
  FinalScoreRiskReasonCode.UNCONFIRMED_QUESTION_GRADE,
  FinalScoreRiskReasonCode.MISSING_QUESTION_GRADE,
  FinalScoreRiskReasonCode.SAFE_CONFIRMABLE,
])
