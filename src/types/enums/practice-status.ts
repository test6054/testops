/**
 * 实训状态枚举 - 与后端 PracticeStatusEnum 完全对应
 * V2.0 更新：整合了原PracticeDisplayStatusEnum的功能，统一前后端状态管理
 */
export enum PracticeStatusEnum {
  /** 草稿 - 教师正在创建和编辑实训，学生不可见 */
  DRAFT = 'DRAFT',
  /** 未开始 - 实训已发布，学生可以查看，但还未到开始时间 */
  NOT_STARTED = 'NOT_STARTED',
  /** 进行中 - 实训正在进行，学生可以提交作业 */
  ACTIVE = 'ACTIVE',
  /** 已结束 - 超过截止时间，不再接受新的提交 */
  FINISHED = 'FINISHED',
  /** 已关闭 */
  CLOSED = 'CLOSED'
}
/** 实训状态配置项接口 */
export interface PracticeStatusItem {
  code: string
  description: string
  color: string
}

/** 实训状态配置映射 */
export const PRACTICE_STATUS_CONFIG: Record<PracticeStatusEnum, PracticeStatusItem> = {
  [PracticeStatusEnum.DRAFT]: {
    code: 'DRAFT',
    description: '草稿',
    color: 'var(--ant-color-text-tertiary)'
  },
  [PracticeStatusEnum.NOT_STARTED]: {
    code: 'NOT_STARTED',
    description: '未开始',
    color: 'var(--ant-color-primary)'
  },
  [PracticeStatusEnum.ACTIVE]: {
    code: 'ACTIVE',
    description: '作答阶段',
    color: 'var(--ant-color-success)'
  },
  [PracticeStatusEnum.FINISHED]: {
    code: 'FINISHED',
    description: '作答截止',
    color: 'var(--ant-color-warning)'
  },
  [PracticeStatusEnum.CLOSED]: {
    code: 'CLOSED',
    description: '已关闭',
    color: 'var(--ant-color-text-tertiary)'
  }
}

/** 获取实训状态标签 */
export function getPracticeStatusLabel(status: PracticeStatusEnum): string {
  return strictEnumValue(PRACTICE_STATUS_CONFIG, status, '实训状态').description
}

import { strictEnumValue } from '@/utils/strict-enum'
