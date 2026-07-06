import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { WeaknessLevelCode } from '@/types/enums/weakness-level-enum'

export {
  ALL_WEAKNESS_LEVEL_CODES,
  WeaknessLevelCode,
  WeaknessLevelDescription,
} from '@/types/enums/weakness-level-enum'

export const WEAKNESS_LEVEL_TONE: Record<WeaknessLevelCode, BadgeTone> = {
  [WeaknessLevelCode.HIGH]: 'red',
  [WeaknessLevelCode.MEDIUM]: 'orange',
}

/**
 * 由题型错误率与平均得分率推导薄弱等级，供班级薄弱扫描行展示。
 * 阈值对齐教务惯例：错误率 ≥40% 或得分率 ≤50% 视为薄弱。
 */
export function deriveWeaknessLevel(errorRate?: number, avgScoreRate?: number): WeaknessLevelCode {
  if (typeof errorRate === 'number' && errorRate >= 0.4) {
    return WeaknessLevelCode.HIGH
  }
  if (typeof avgScoreRate === 'number' && avgScoreRate <= 0.5) {
    return WeaknessLevelCode.HIGH
  }
  return WeaknessLevelCode.MEDIUM
}

export function formatAnalysisRate(rate?: number | string): string {
  if (rate == null) {
    return '—'
  }
  const value = typeof rate === 'string' ? Number(rate) : rate
  if (!Number.isFinite(value)) {
    return '—'
  }
  return `${(value * 100).toFixed(1)}%`
}

export function formatProportionPercent(proportion?: number): string {
  if (proportion == null || !Number.isFinite(proportion)) {
    return '—'
  }
  return `${(proportion * 100).toFixed(0)}%`
}
