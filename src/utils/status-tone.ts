/**
 * 状态 → 色调映射工具
 *
 * 将后端业务状态码统一映射到 BadgeTone / UiArrowTimelineStatus，
 * 供工作台组件消费，避免各页面重复硬编码映射逻辑。
 *
 * 设计原则：
 * - 每个 API 模块已有自己的 *_STATUS_COLOR / *_STATUS_LABEL 常量
 * - 本文件提供跨模块的统一映射函数，用于工作台场景
 * - 未知状态一律返回安全默认值（gray / pending）
 */
import type { BadgeTone, UiArrowTimelineStatus } from '@/components/ui-guide/ui/types'
import type { WorkbenchStageStatus } from '@/types/workbench'

// ─── 通用状态 → BadgeTone 映射 ────────────────────────

/** 通用状态关键词 → BadgeTone 映射表 */
const GENERIC_TONE_MAP: Record<string, BadgeTone> = {
  // 成功 / 完成类
  COMPLETED: 'green',
  CONFIRMED: 'green',
  PUBLISHED: 'green',
  RESOLVED: 'green',
  ACHIEVED: 'green',
  SUCCEEDED: 'green',
  CLOSED: 'green',
  DONE: 'green',
  HEALTHY: 'green',
  PASSED: 'green',
  VERIFIED: 'green',
  ARCHIVED: 'green',

  // 进行中类
  ACTIVE: 'blue',
  RUNNING: 'blue',
  PROCESSING: 'blue',
  IN_PROGRESS: 'blue',
  GRADING: 'blue',
  MARKING: 'blue',
  SCORING: 'blue',
  SCANNING: 'blue',
  CALCULATING: 'blue',
  PARSING: 'blue',

  // 待处理类
  PENDING: 'orange',
  DRAFT: 'orange',
  OPEN: 'orange',
  PREVIEW: 'orange',
  PREVIEW_READY: 'orange',
  SUBMITTED: 'blue',
  RETURNED: 'orange',

  // 警告类
  WARNING: 'orange',
  PARTIALLY_ACHIEVED: 'orange',
  WARN: 'orange',
  INSUFFICIENT_EVIDENCE: 'orange',

  // 错误 / 阻断类
  ERROR: 'red',
  FAILED: 'red',
  BLOCKED: 'red',
  BLOCKING: 'red',
  CRITICAL: 'red',
  NOT_ACHIEVED: 'red',
  REJECTED: 'red',
  REVOKED: 'red',

  // 取消 / 关闭 / 默认类
  CANCELLED: 'gray',
  IDLE: 'gray',
  CREATED: 'gray',
  UNKNOWN: 'gray',
  NONE: 'gray',
}

/**
 * 将任意业务状态码映射为 BadgeTone
 * 优先查精确匹配，未命中返回 'gray'
 */
export function statusToTone(status: string | undefined | null): BadgeTone {
  if (!status) return 'gray'
  return GENERIC_TONE_MAP[status] ?? 'gray'
}

// ─── WorkbenchStageStatus → UiArrowTimelineStatus ──────

const STAGE_TO_TIMELINE: Record<WorkbenchStageStatus, UiArrowTimelineStatus> = {
  pending: 'pending',
  active: 'running',
  completed: 'completed',
  warning: 'warning',
  error: 'error',
  blocked: 'error',
}

/**
 * 将工作台阶段状态映射为 UiArrowTimeline 可消费的状态
 */
export function stageStatusToTimeline(status: WorkbenchStageStatus): UiArrowTimelineStatus {
  return STAGE_TO_TIMELINE[status] ?? 'pending'
}

// ─── 风险等级 → BadgeTone ──────────────────────────────

/** 进度风险等级 → BadgeTone（对齐 marking-quality.ts ProgressRiskLevel） */
export function riskLevelToTone(level: string | undefined | null): BadgeTone {
  switch (level) {
    case 'HIGH': return 'red'
    case 'MEDIUM': return 'orange'
    case 'LOW': return 'green'
    case 'NONE': return 'gray'
    default: return 'gray'
  }
}

// ─── 事件级别 → BadgeTone ──────────────────────────────

/** 重大事件级别 → BadgeTone（对齐 admin-dashboard.ts IncidentLevelCode） */
export function incidentLevelToTone(level: string | undefined | null): BadgeTone {
  switch (level) {
    case 'BLOCKING': return 'red'
    case 'CRITICAL': return 'red'
    case 'WARNING': return 'orange'
    case 'INFO': return 'blue'
    default: return 'gray'
  }
}
