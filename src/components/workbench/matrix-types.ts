/**
 * 支撑矩阵工作台 - 行列与单元格契约
 *
 * 用于 MatrixWorkbench.vue 渲染：
 * - 行 / 列 / 单元格语义全部由调用方决定（培养目标×毕业要求 / 课程目标×指标点 / 考核×课程目标 ...）
 * - 单元格 tone 取 BadgeTone，颜色映射在 MatrixWorkbench 内部
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'

export interface MatrixRow {
  key: string
  label: string
  hint?: string
  badge?: string
  badgeTone?: BadgeTone
  warning?: string
}

export interface MatrixCol {
  key: string
  label: string
  hint?: string
  badge?: string
  badgeTone?: BadgeTone
  width?: number
}

export interface MatrixCell {
  rowKey: string
  colKey: string
  primary?: string
  secondary?: string
  tone?: BadgeTone
  warning?: string
  /** 本地未提交编辑，矩阵需可见标脏 */
  dirty?: boolean
}
