import { ResultCode } from '@/types/enums/result-code'
import { getUserErrorMessage, readBusinessResultCode } from '@/utils/error-handler'

/** 后端 CONFLICT 文案片段；与 edu-mark Service 抛错保持一致，供前端恢复引导匹配。 */
export const MarkingConflictHint = {
  MULTI_RESPONSE_SLICE: '多个有效作答切片',
  WITHDRAW_SCORE_CONFIRM_LOCK: '成绩确认处理中',
  FORMAL_START_PENDING_REVIEW: '待复核题目',
  LAYOUT_DETECT_IN_FLIGHT: '正在识别题目',
} as const

export function isBusinessConflict(error: unknown): boolean {
  return readBusinessResultCode(error) === ResultCode.CONFLICT
}

export function conflictMessageIncludes(error: unknown, fragment: string): boolean {
  return getUserErrorMessage(error, '').includes(fragment)
}

export function isMultiResponseSliceConflict(error: unknown): boolean {
  return isBusinessConflict(error)
    && conflictMessageIncludes(error, MarkingConflictHint.MULTI_RESPONSE_SLICE)
}

export function isWithdrawScoreConfirmLockConflict(error: unknown): boolean {
  return isBusinessConflict(error)
    && conflictMessageIncludes(error, MarkingConflictHint.WITHDRAW_SCORE_CONFIRM_LOCK)
}

export function isFormalStartPendingReviewConflict(error: unknown): boolean {
  return isBusinessConflict(error)
    && conflictMessageIncludes(error, MarkingConflictHint.FORMAL_START_PENDING_REVIEW)
}

export function isLayoutDetectInFlightConflict(error: unknown): boolean {
  return isBusinessConflict(error)
    && conflictMessageIncludes(error, MarkingConflictHint.LAYOUT_DETECT_IN_FLIGHT)
}

export function messageIncludesConflictHint(message: string, fragment: string): boolean {
  return message.includes(fragment)
}
