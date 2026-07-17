/**
 * AI状态枚举（评分 + 评审）
 * 合并自 ai-grading-status.ts 和 ai-review-status.ts
 */

export interface AiGradingStatusConfig {
  text: string
  color: string
  loading: boolean
  canPoll: boolean
}

/**
 * AI评分消息状态枚举
 * 与后端AiGradingMessageStatusEnum完全对齐
 */
export enum AiGradingStatusEnum {
  /** 未开始 - 学生已提交作业但尚未启动AI评分流程 */
  NOT_STARTED = 'NOT_STARTED',
  /** 待处理 - 已发送到AI服务，等待开始处理 */
  PENDING = 'PENDING',
  /** 处理中 - AI正在处理中 */
  PROCESSING = 'PROCESSING',
  /** 处理完成 - AI处理完成，结果已返回 */
  COMPLETED = 'COMPLETED',
  /** 处理失败 - AI服务处理失败或超时 */
  FAILED = 'FAILED'
}

/** AI评分状态配置映射 */
export const AI_GRADING_STATUS_CONFIG: Record<AiGradingStatusEnum, AiGradingStatusConfig> = {
  [AiGradingStatusEnum.NOT_STARTED]: {
    text: '未开始',
    color: 'var(--dp-text-tertiary)',
    loading: false,
    canPoll: false
  },
  [AiGradingStatusEnum.PENDING]: {
    text: '待处理',
    color: 'var(--dp-color-primary)',
    loading: true,
    canPoll: true
  },
  [AiGradingStatusEnum.PROCESSING]: {
    text: '处理中',
    color: 'var(--dp-color-primary-hover)',
    loading: true,
    canPoll: true
  },
  [AiGradingStatusEnum.COMPLETED]: {
    text: '评分完成',
    color: 'var(--dp-success)',
    loading: false,
    canPoll: false
  },
  [AiGradingStatusEnum.FAILED]: {
    text: '处理失败',
    color: 'var(--dp-error)',
    loading: false,
    canPoll: false
  }
}

/** 判断状态是否为失败状态 */
export function isFailureStatus(status: AiGradingStatusEnum): boolean {
  return status === AiGradingStatusEnum.FAILED
}

/** 判断状态是否为成功状态 */
export function isSuccessStatus(status: AiGradingStatusEnum): boolean {
  return status === AiGradingStatusEnum.COMPLETED
}

/** 判断AI评分状态是否需要轮询 */
export function shouldPollGrading(status: AiGradingStatusEnum): boolean {
  return AI_GRADING_STATUS_CONFIG[status].canPoll
}


export interface AiReviewStatusItem {
  code: string
  description: string
  color: string
  icon?: string
  canPoll?: boolean
}

/**
 * AI评审状态枚举
 * 与后端AiReviewStatusEnum完全对齐
 */
export enum AiReviewStatusEnum {
  /** 无需评审 - 任务配置不需要AI评审，或学生未请求AI评审 */
  NOT_REQUIRED = 'NOT_REQUIRED',
  /** 待评审 - 学生已请求AI评审，等待开始处理 */
  PENDING = 'PENDING',
  /** 评审中 - AI正在分析代码并生成评分和反馈 */
  IN_PROGRESS = 'IN_PROGRESS',
  /** 评审完成 - AI评审完成，学生可查看反馈 */
  COMPLETED = 'COMPLETED',
  /** 评审失败 - AI服务处理失败或超时 */
  FAILED = 'FAILED'
}

/** AI评审状态配置映射 */
export const AI_REVIEW_STATUS_CONFIG: Record<AiReviewStatusEnum, AiReviewStatusItem> = {
  [AiReviewStatusEnum.NOT_REQUIRED]: {
    code: 'NOT_REQUIRED',
    description: '无需评审',
    color: 'var(--dp-text-tertiary)',
    icon: 'icon-minus-circle',
    canPoll: false
  },
  [AiReviewStatusEnum.PENDING]: {
    code: 'PENDING',
    description: '待评审',
    color: 'var(--dp-color-primary)',
    icon: 'icon-clock-circle',
    canPoll: true
  },
  [AiReviewStatusEnum.IN_PROGRESS]: {
    code: 'IN_PROGRESS',
    description: '评审中',
    color: 'var(--dp-color-primary-hover)',
    icon: 'icon-loading',
    canPoll: true
  },
  [AiReviewStatusEnum.COMPLETED]: {
    code: 'COMPLETED',
    description: '评审完成',
    color: 'var(--dp-success)',
    icon: 'icon-check-circle',
    canPoll: false
  },
  [AiReviewStatusEnum.FAILED]: {
    code: 'FAILED',
    description: '评审失败',
    color: 'var(--dp-error)',
    icon: 'icon-close-circle',
    canPoll: false
  }
}

/** 获取AI评审状态配置 */
export function getAiReviewStatusConfig(status: AiReviewStatusEnum): AiReviewStatusItem {
  return AI_REVIEW_STATUS_CONFIG[status]
}

/** 判断是否可以请求AI评审 */
export function canRequestReview(status: AiReviewStatusEnum): boolean {
  return status === AiReviewStatusEnum.NOT_REQUIRED
    || status === AiReviewStatusEnum.COMPLETED
    || status === AiReviewStatusEnum.FAILED
}

/** 判断AI评审是否进行中 */
export function isReviewInProgress(status: AiReviewStatusEnum): boolean {
  return status === AiReviewStatusEnum.PENDING || status === AiReviewStatusEnum.IN_PROGRESS
}
/** 判断AI评审是否完成 */
export function isReviewCompleted(status: AiReviewStatusEnum): boolean {
  return status === AiReviewStatusEnum.COMPLETED
}

/** 判断AI评审是否失败 */
export function isReviewFailed(status: AiReviewStatusEnum): boolean {
  return status === AiReviewStatusEnum.FAILED
}
