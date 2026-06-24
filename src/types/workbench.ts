/**
 * 工作台共享类型 - 阶段驱动工作台通用展示模型
 *
 * 设计原则：
 * - 本文件只定义工作台 UI 展示层类型，不重复后端 DTO / API 响应类型
 * - 后端状态码 → 工作台语义状态 的映射由各业务 API 模块或页面编排层显式完成
 * - UiArrowTimelineStage / UiArrowTimelineStatus 等底层渲染类型
 *   定义在 src/components/ui-guide/ui/types.ts，本文件引用但不重复定义
 */
import type { BadgeTone, UiArrowTimelineStatus } from '@/components/ui-guide/ui/types'

// ─── 阶段轨（StageRail）─────────────────────────────────

/** 工作台阶段状态 - 业务语义层，映射到 UiArrowTimelineStatus 由 StageRail 内部完成 */
export type WorkbenchStageStatus
  = | 'pending'
    | 'active'
    | 'completed'
    | 'warning'
    | 'error'
    | 'blocked'

/** 工作台阶段指标 */
export interface WorkbenchStageMetric {
  label: string
  value: string | number
}

/** 工作台阶段定义 */
export interface WorkbenchStage {
  key: string
  title: string
  status: WorkbenchStageStatus
  statusText?: string
  dateRange?: string
  progress?: number
  metrics?: WorkbenchStageMetric[]
}

/** WorkbenchStageStatus → UiArrowTimelineStatus 映射表 */
export const WORKBENCH_STAGE_TO_TIMELINE: Record<WorkbenchStageStatus, UiArrowTimelineStatus> = {
  pending: 'pending',
  active: 'running',
  completed: 'completed',
  warning: 'warning',
  error: 'error',
  blocked: 'error',
}

// ─── 信号指标带（SignalBand）────────────────────────────

/** 信号指标项 */
export interface SignalMetric {
  key: string
  label: string
  value: string | number
  unit?: string
  tone?: BadgeTone
  /** 趋势：正数向上、负数向下、0 持平 */
  trend?: number
  helper?: string
}

// ─── 任务结果面板（TaskResultPanel）──────────────────────

/** 任务结果操作项 */
export interface TaskResultAction {
  key: string
  label: string
  danger?: boolean
  disabled?: boolean
}

/** 任务结果项 */
export interface TaskResultItem {
  id: string
  title: string
  statusLabel: string
  statusTone: BadgeTone
  description?: string
  time?: string
  meta?: string
  actions?: TaskResultAction[]
}

// ─── 审计时间线抽屉（AuditTimelineDrawer）────────────────

/** 审计事件项 - 与后端 OperationLogVO 字段对齐 */
export interface AuditTimelineEvent {
  /** 审计日志ID */
  id: string
  /** 操作人ID（审计创建人） */
  createUser?: string
  /** 操作人显示名 */
  operatorName?: string
  /** 操作人角色 */
  operatorRole?: string
  /** 操作类型编码（对应后端 OperationType） */
  operationType?: string
  /** 操作类型显示文案 */
  operationLabel: string
  /** 目标类型（对应后端 AuditTargetType） */
  targetType?: string
  /** 目标ID */
  targetId?: string
  /** 操作时间 */
  time?: string
  /** 操作原因 */
  reason?: string
  /** 追踪ID */
  traceId?: string
}
