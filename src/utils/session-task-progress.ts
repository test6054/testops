/**
 * 试评 / 正评任务进度展示契约（读取面与操作面共用）。
 * total/finalized 未形成或异常时不得伪装成 0%。
 */

/**
 * 计算任务完成百分比；未形成或异常返回 null（页面展示「—」）。
 */
export function resolveTaskProgressPercent(
  total: number | null | undefined,
  finalized: number | null | undefined,
): number | null {
  if (total == null || finalized == null) {
    return null
  }
  if (!Number.isFinite(total) || !Number.isFinite(finalized) || total <= 0) {
    return null
  }
  if (finalized < 0 || finalized > total) {
    return null
  }
  return Math.round((finalized * 100) / total)
}

/**
 * 格式化 finalized/total；缺失时返回「—」。
 */
export function formatTaskProgressRatio(
  total: number | null | undefined,
  finalized: number | null | undefined,
): string {
  if (total == null || finalized == null) {
    return '—'
  }
  if (!Number.isFinite(total) || !Number.isFinite(finalized)) {
    return '—'
  }
  return `${finalized}/${total}`
}
