/**
 * 成绩定稿页当前页 z-score 偏差档位（前端派生展示，无后端 enum）。
 * 口径：|z| ≥ 1.5 显著偏离，|z| ≥ 1 轻度偏离；样本 < 3 或 stddev = 0 为 insufficient。
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { ScoreBiasLevelCode } from '@/types/enums/score-bias-level-enum'

export {
  ALL_SCORE_BIAS_LEVEL_CODES,
  ScoreBiasLevelCode,
  ScoreBiasLevelDescription,
} from '@/types/enums/score-bias-level-enum'

/** 当前页成绩样本统计，供偏差档位与 Δ 分计算 */
export interface ScoreBiasStats {
  count: number
  mean: number
  stddev: number
}

export const SCORE_BIAS_LEVEL_TONE: Record<ScoreBiasLevelCode, BadgeTone> = {
  [ScoreBiasLevelCode.NORMAL]: 'gray',
  [ScoreBiasLevelCode.MILD_HIGH]: 'blue',
  [ScoreBiasLevelCode.MILD_LOW]: 'orange',
  [ScoreBiasLevelCode.SEVERE_HIGH]: 'purple',
  [ScoreBiasLevelCode.SEVERE_LOW]: 'red',
  [ScoreBiasLevelCode.INSUFFICIENT]: 'gray',
}

/** 由有限成绩列表计算均值与样本标准差；样本不足时 stddev 为 0。 */
export function computeScoreBiasStats(scores: number[]): ScoreBiasStats {
  const validScores = scores.filter((value) => Number.isFinite(value))
  const count = validScores.length
  if (count === 0) {
    return { count: 0, mean: 0, stddev: 0 }
  }
  const mean = validScores.reduce((acc, value) => acc + value, 0) / count
  if (count < 3) {
    return { count, mean, stddev: 0 }
  }
  const variance = validScores.reduce((acc, value) => acc + (value - mean) ** 2, 0) / (count - 1)
  return { count, mean, stddev: Math.sqrt(variance) }
}

export function classifyScoreBias(
  score: number | undefined,
  stats: ScoreBiasStats,
): ScoreBiasLevelCode {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return ScoreBiasLevelCode.INSUFFICIENT
  }
  const { count, mean, stddev } = stats
  if (count < 3 || stddev === 0) {
    return ScoreBiasLevelCode.INSUFFICIENT
  }
  const z = (score - mean) / stddev
  if (z >= 1.5) {
    return ScoreBiasLevelCode.SEVERE_HIGH
  }
  if (z <= -1.5) {
    return ScoreBiasLevelCode.SEVERE_LOW
  }
  if (z >= 1) {
    return ScoreBiasLevelCode.MILD_HIGH
  }
  if (z <= -1) {
    return ScoreBiasLevelCode.MILD_LOW
  }
  return ScoreBiasLevelCode.NORMAL
}

/** 相对当前页均值的分数差展示，样本不足时返回空串。 */
export function formatScoreBiasDelta(score: number | undefined, stats: ScoreBiasStats): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return ''
  }
  const { count, mean, stddev } = stats
  if (count < 3 || stddev === 0) {
    return ''
  }
  const delta = score - mean
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} 分`
}
