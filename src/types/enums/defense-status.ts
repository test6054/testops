/**
 * 答辩相关状态枚举
 * 统一管理答辩系统中的各种状态类型
 */


/** 答辩会话状态（后端原始状态，用于详细场景） */
export enum DefenseSessionStatus {
  /** 未开始 */
  NOT_STARTED = 'NOT_STARTED',
  /** 进行中 */
  IN_PROGRESS = 'IN_PROGRESS',
  /** 评审中（AI评分中） */
  REVIEWING = 'REVIEWING',
  /** 已完成 */
  COMPLETED = 'COMPLETED',
  /** 超时 */
  TIMEOUT = 'TIMEOUT',
  /** 评估失败 */
  FAILED = 'FAILED',
  /** 已取消 */
  CANCELLED = 'CANCELLED'
}
/** 答辩会话状态配置 */
export interface DefenseSessionStatusConfig {
  text: string
  color: string
  icon?: string
  description: string
}

/** 答辩会话状态配置映射 */
export const DEFENSE_SESSION_STATUS_CONFIG: Record<DefenseSessionStatus, DefenseSessionStatusConfig> = {
  [DefenseSessionStatus.NOT_STARTED]: {
    text: '未开始',
    color: 'var(--ant-color-text-tertiary)',
    icon: 'icon-clock-circle',
    description: '答辩会话尚未开始',
  },
  [DefenseSessionStatus.IN_PROGRESS]: {
    text: '进行中',
    color: 'var(--ant-color-primary)',
    icon: 'icon-loading',
    description: '答辩会话正在进行中',
  },
  [DefenseSessionStatus.REVIEWING]: {
    text: '评审中',
    color: 'var(--ant-color-warning)',
    icon: 'icon-sync',
    description: '答辩已提交，正在评审中',
  },
  [DefenseSessionStatus.COMPLETED]: {
    text: '已完成',
    color: 'var(--ant-color-success)',
    icon: 'icon-check-circle',
    description: '答辩会话已成功完成',
  },
  [DefenseSessionStatus.TIMEOUT]: {
    text: '超时',
    color: 'var(--ant-color-error)',
    icon: 'icon-close-circle',
    description: '答辩会话已超时结束',
  },
  [DefenseSessionStatus.FAILED]: {
    text: '评估失败',
    color: 'var(--ant-color-error)',
    icon: 'icon-exclamation-circle',
    description: '答辩评估失败，请联系教师处理',
  },
  [DefenseSessionStatus.CANCELLED]: {
    text: '已取消',
    color: 'var(--ant-color-text-tertiary)',
    icon: 'icon-minus-circle',
    description: '答辩场次已被取消',
  },
}


/** 答辩任务状态（与后端 DefenseTaskStatusEnum 对齐） */
export enum DefenseTaskStatus {
  /** 实践未发布 */
  DRAFT = 'DRAFT',
  /** 答辩功能未开启 */
  NOT_ENABLED = 'NOT_ENABLED',
  /** 等待实训截止 */
  PENDING_PRACTICE_DEADLINE = 'PENDING_PRACTICE_DEADLINE',
  /** 从未开启 */
  NEVER_OPENED = 'NEVER_OPENED',
  /** 待开始 - 已设置但未到开始时间 */
  SCHEDULED = 'SCHEDULED',
  /** 进行中（允许学生申请答辩） */
  ACTIVE = 'ACTIVE',
  /** 已过期（超过有效期） */
  EXPIRED = 'EXPIRED',
  /** 已关闭（教师禁用） */
  DISABLED = 'DISABLED',
  /** 已取消 */
  CANCELLED = 'CANCELLED'
}

/** 答辩任务状态颜色映射 */
export const DEFENSE_TASK_STATUS_COLOR: Record<DefenseTaskStatus, string> = {
  [DefenseTaskStatus.DRAFT]: 'gray',
  [DefenseTaskStatus.NOT_ENABLED]: 'red',
  [DefenseTaskStatus.PENDING_PRACTICE_DEADLINE]: 'yellow',
  [DefenseTaskStatus.NEVER_OPENED]: 'gray',
  [DefenseTaskStatus.SCHEDULED]: 'cyan',
  [DefenseTaskStatus.ACTIVE]: 'blue',
  [DefenseTaskStatus.EXPIRED]: 'orange',
  [DefenseTaskStatus.DISABLED]: 'red',
  [DefenseTaskStatus.CANCELLED]: 'gray',
}

export function getDefenseTaskStatusColor(status?: DefenseTaskStatus | string): string {
  if (!status) return 'gray'
  return DEFENSE_TASK_STATUS_COLOR[status as DefenseTaskStatus] || 'gray'
}


/** 答辩题目类型（与接口文档保持一致） */
export enum DefenseQuestionType {
  /** 开放题 */
  OPEN_ENDED = 'OPEN_ENDED',
  /** 选择题 */
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE'
}

/** 答辩难度等级（与接口文档保持一致） */
export enum DefenseDifficulty {
  /** 简单 */
  EASY = 'EASY',
  /** 中等 */
  MEDIUM = 'MEDIUM',
  /** 困难 */
  HARD = 'HARD'
}

/** 答辩结果 */
export enum DefenseResult {
  /** 通过 */
  PASS = 'PASS',
  /** 未通过 */
  FAIL = 'FAIL',
  /** 超时 */
  TIMEOUT = 'TIMEOUT',
  /** 过期未参加 */
  EXPIRED = 'EXPIRED',
  /** 已重新提交代码，可重新答辩 */
  RESUBMITTED = 'RESUBMITTED'
}

/** 答题状态枚举 */
export enum AnswerStatus {
  /** 未作答 */
  NOT_ANSWERED = 'NOT_ANSWERED',
  /** 已作答 */
  ANSWERED = 'ANSWERED'
}


/**
 * 获取会话状态文本
 */
export function getSessionStatusText(status?: DefenseSessionStatus): string {
  return status ? DEFENSE_SESSION_STATUS_CONFIG[status]?.text || '未知' : '未知'
}

/**
 * 获取会话状态颜色
 */
export function getSessionStatusColor(status?: DefenseSessionStatus): string {
  return status ? DEFENSE_SESSION_STATUS_CONFIG[status]?.color || 'gray' : 'gray'
}

/**
 * 获取会话状态描述
 */
export function getSessionStatusDescription(status?: DefenseSessionStatus): string {
  return status ? DEFENSE_SESSION_STATUS_CONFIG[status]?.description || '未知状态' : '未知状态'
}

/**
 * 获取题目类型文本
 */
export function getQuestionTypeText(type: DefenseQuestionType): string {
  const textMap: Record<DefenseQuestionType, string> = {
    OPEN_ENDED: '问答题',
    MULTIPLE_CHOICE: '选择题'
  }
  return textMap[type] || '未知'
}

/**
 * 获取题目类型颜色
 */
export function getQuestionTypeColor(type: DefenseQuestionType): string {
  const colorMap: Record<DefenseQuestionType, string> = {
    MULTIPLE_CHOICE: 'blue',
    OPEN_ENDED: 'purple'
  }
  return colorMap[type] || 'gray'
}

/**
 * 获取难度文本
 */
export function getDifficultyText(difficulty: DefenseDifficulty): string {
  const textMap: Record<DefenseDifficulty, string> = {
    EASY: '简单',
    MEDIUM: '中等',
    HARD: '困难'
  }
  return textMap[difficulty] || '未知'
}

/**
 * 获取难度颜色
 */
export function getDifficultyColor(difficulty: DefenseDifficulty): string {
  const colorMap: Record<DefenseDifficulty, string> = {
    EASY: 'green',
    MEDIUM: 'orange',
    HARD: 'red'
  }
  return colorMap[difficulty] || 'gray'
}

/**
 * 获取答辩结果文本
 */
export function getDefenseResultText(result: DefenseResult): string {
  const textMap: Record<DefenseResult, string> = {
    PASS: '通过',
    FAIL: '未通过',
    TIMEOUT: '超时',
    EXPIRED: '过期未参加',
    RESUBMITTED: '有新提交，可重新答辩'
  }
  return textMap[result] || '未知'
}

/**
 * 获取答辩结果颜色
 */
export function getDefenseResultColor(result: DefenseResult): string {
  const colorMap: Record<DefenseResult, string> = {
    PASS: 'green',
    FAIL: 'red',
    TIMEOUT: 'orange',
    EXPIRED: 'gray',
    RESUBMITTED: 'blue'
  }
  return colorMap[result] || 'gray'
}

/**
 * 判断会话是否为活跃状态
 */
export function isActiveSession(status: DefenseSessionStatus): boolean {
  return status === DefenseSessionStatus.IN_PROGRESS
}

/**
 * 判断会话是否已结束
 */
export function isCompletedSession(status: DefenseSessionStatus): boolean {
  return [
    DefenseSessionStatus.REVIEWING,
    DefenseSessionStatus.COMPLETED,
    DefenseSessionStatus.TIMEOUT,
    DefenseSessionStatus.FAILED
  ].includes(status)
}
