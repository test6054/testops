/**
 * 分析状态枚举
 * 与后端 AnalysisStatusEnum 保持一致（NOT_SUBMITTED/ANALYZING/COMPLETED/FAILED）
 */

export interface AnalysisStatusConfig {
  text: string
  color: string
  icon?: string
  description: string
}

/** 分析状态枚举 - 与后端 AnalysisStatusEnum 对齐 */
export enum AnalysisStatus {
  /** 未提交：尚未触发分析 */
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  /** 分析中：AI 正在处理 */
  ANALYZING = 'ANALYZING',
  /** 已完成：分析完成，可查看结果 */
  COMPLETED = 'COMPLETED',
  /** 失败：分析过程中出现错误 */
  FAILED = 'FAILED'
}

/** 分析状态配置映射 */
export const ANALYSIS_STATUS_CONFIG: Record<AnalysisStatus, AnalysisStatusConfig> = {
  [AnalysisStatus.NOT_SUBMITTED]: {
    text: '未提交',
    color: 'gray',
    icon: 'icon-clock-circle',
    description: '等待提交或尚未触发分析'
  },
  [AnalysisStatus.ANALYZING]: {
    text: '分析中',
    color: 'orange',
    icon: 'icon-loading',
    description: 'AI 正在进行分析'
  },
  [AnalysisStatus.COMPLETED]: {
    text: '已完成',
    color: 'green',
    icon: 'icon-check-circle',
    description: '分析已完成，可查看结果'
  },
  [AnalysisStatus.FAILED]: {
    text: '失败',
    color: 'red',
    icon: 'icon-close-circle',
    description: '分析失败，请重试或联系管理员'
  }
}
