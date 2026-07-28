/**
 * 阅卷沉浸批改会话节奏与剩余时间估算。
 * 仅使用本会话真实提交时间戳；样本不足时不编造 ETA。
 */

/** 忽略超过该间隔的相邻提交（休息/离席），避免拉高均值。 */
const MAX_INTERVAL_MS = 30 * 60 * 1000

/** 参与估算的最近有效间隔上限。 */
const MAX_INTERVAL_SAMPLES = 12

export interface GradingSessionPaceEstimate {
  /** 中位批改间隔（毫秒/份） */
  avgMsPerItem: number
  /** 剩余份数 x 中位间隔 */
  remainingMs: number
  /** 参与估算的有效间隔数 */
  sampleCount: number
}

/**
 * 由本会话提交时间戳估算剩余时间。
 * @param submittedAts 提交时刻（ms），无序亦可
 * @param remainingCount 本批剩余未阅份数
 */
export function estimateGradingRemainingMs(
  submittedAts: readonly number[],
  remainingCount: number,
): GradingSessionPaceEstimate | null {
  if (remainingCount <= 0) {
    return { avgMsPerItem: 0, remainingMs: 0, sampleCount: 0 }
  }
  if (submittedAts.length < 2) {
    return null
  }
  const sorted = [...submittedAts]
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b)
  if (sorted.length < 2) {
    return null
  }
  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev == null || curr == null) {
      continue
    }
    const delta = curr - prev
    if (delta > 0 && delta <= MAX_INTERVAL_MS) {
      intervals.push(delta)
    }
  }
  if (intervals.length === 0) {
    return null
  }
  const recent = intervals.slice(-MAX_INTERVAL_SAMPLES).sort((a, b) => a - b)
  const mid = Math.floor(recent.length / 2)
  const left = recent[mid - 1]
  const right = recent[mid]
  if (right == null) {
    return null
  }
  const median = recent.length % 2 === 1
    ? right
    : left == null
      ? right
      : Math.round((left + right) / 2)
  if (median <= 0) {
    return null
  }
  return {
    avgMsPerItem: median,
    remainingMs: median * remainingCount,
    sampleCount: recent.length,
  }
}

/** 中文时长文案。 */
export function formatGradingDurationZh(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '即将完成'
  }
  const totalSec = Math.max(1, Math.round(ms / 1000))
  if (totalSec < 60) {
    return `约 ${totalSec} 秒`
  }
  const totalMin = Math.floor(totalSec / 60)
  const remSec = totalSec % 60
  if (totalMin < 60) {
    return remSec >= 15 ? `约 ${totalMin} 分 ${remSec} 秒` : `约 ${totalMin} 分钟`
  }
  const hours = Math.floor(totalMin / 60)
  const remMin = totalMin % 60
  return remMin > 0 ? `约 ${hours} 小时 ${remMin} 分` : `约 ${hours} 小时`
}

/** 中位间隔文案。 */
export function formatGradingPaceZh(avgMsPerItem: number): string {
  if (!Number.isFinite(avgMsPerItem) || avgMsPerItem <= 0) {
    return ''
  }
  const sec = Math.max(1, Math.round(avgMsPerItem / 1000))
  if (sec < 60) {
    return `约 ${sec} 秒/份`
  }
  const min = Math.floor(sec / 60)
  const rem = sec % 60
  return rem > 0 ? `约 ${min} 分 ${rem} 秒/份` : `约 ${min} 分钟/份`
}
