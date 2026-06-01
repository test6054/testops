/**
 * 难度等级枚举 - 与后端 Difficulty 完全对应
 * 定义实践任务或题目的难易等级
 */
export enum DifficultyEnum {
  /** 简单 */
  EASY = 'EASY',
  /** 中等 */
  MEDIUM = 'MEDIUM',
  /** 困难 */
  HARD = 'HARD',
}

/** 难度等级配置 */
export const DIFFICULTY_CONFIG: Record<DifficultyEnum, {
  label: string
  color: string
  level: number
}> = {
  [DifficultyEnum.EASY]: {
    label: '简单',
    color: 'var(--ant-color-success)',
    level: 1,
  },
  [DifficultyEnum.MEDIUM]: {
    label: '中等',
    color: 'var(--ant-color-warning)',
    level: 2,
  },
  [DifficultyEnum.HARD]: {
    label: '困难',
    color: 'var(--ant-color-error)',
    level: 3,
  },
}

function requireDifficultyConfig(difficulty: DifficultyEnum): {
  label: string
  color: string
  level: number
} {
  return strictEnumValue(DIFFICULTY_CONFIG, difficulty, '难度等级')
}

/**
 * 获取难度标签
 */
export function getDifficultyLabel(difficulty: DifficultyEnum): string {
  return requireDifficultyConfig(difficulty).label
}

/**
 * 获取难度颜色
 */
export function getDifficultyColor(difficulty: DifficultyEnum): string {
  return requireDifficultyConfig(difficulty).color
}

/**
 * 难度选项列表（用于下拉选择）
 */
export const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}))
import { strictEnumValue } from '@/utils/strict-enum'
