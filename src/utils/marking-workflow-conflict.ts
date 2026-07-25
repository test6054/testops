import type {FormalSessionStartBlockingCode} from '@/types/enums/formal-session-start-blocking-code-enum';
import {
  FormalSessionStartBlockingActionLabel,
  
  FormalSessionStartBlockingRouteName,
  isFormalSessionStartBlockingCode
} from '@/types/enums/formal-session-start-blocking-code-enum'
import { ResultCode } from '@/types/enums/result-code'
import { getUserErrorMessage, readBusinessResultCode, readBusinessResultData } from '@/utils/error-handler'

/** 后端 CONFLICT 文案片段；与 edu-mark Service 抛错保持一致，供前端恢复引导匹配。 */
export const MarkingConflictHint = {
  MULTI_RESPONSE_SLICE: '多个有效作答切片',
  WITHDRAW_SCORE_CONFIRM_LOCK: '成绩确认处理中',
  FINAL_SCORE_CONFIRM_LOCK: '成绩确认处理中',
  FINAL_SCORE_WRITE_BLOCKED: '最终成绩已确认、发布或更正，不能再',
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

export function isFinalScoreConfirmLockConflict(error: unknown): boolean {
  return isBusinessConflict(error)
    && conflictMessageIncludes(error, MarkingConflictHint.FINAL_SCORE_CONFIRM_LOCK)
}

export function isScoreWriteBlockedByFinalScoreGate(error: unknown): boolean {
  return isBusinessConflict(error)
    && conflictMessageIncludes(error, MarkingConflictHint.FINAL_SCORE_WRITE_BLOCKED)
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

/** 正评启动阻断载荷 - 对应后端 FormalSessionStartBlockingResponse */
export interface FormalSessionStartBlockingPayload {
  blockingCode: FormalSessionStartBlockingCode
  workspaceRouteName?: string | null
  actionLabel?: string | null
}

/**
 * 从 CONFLICT ResultInfo.data 解析正评启动阻断合同；未知 code 返回 null。
 */
export function readFormalSessionStartBlocking(
  error: unknown,
): FormalSessionStartBlockingPayload | null {
  if (!isBusinessConflict(error)) {
    return null
  }
  const data = readBusinessResultData(error)
  if (data == null || typeof data !== 'object') {
    return null
  }
  const rawCode = Object.getOwnPropertyDescriptor(data, 'blockingCode')?.value
  if (!isFormalSessionStartBlockingCode(rawCode)) {
    return null
  }
  const routeRaw = Object.getOwnPropertyDescriptor(data, 'workspaceRouteName')?.value
  const labelRaw = Object.getOwnPropertyDescriptor(data, 'actionLabel')?.value
  return {
    blockingCode: rawCode,
    workspaceRouteName: typeof routeRaw === 'string' ? routeRaw : FormalSessionStartBlockingRouteName[rawCode],
    actionLabel: typeof labelRaw === 'string' ? labelRaw : FormalSessionStartBlockingActionLabel[rawCode],
  }
}
