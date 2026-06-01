/**
 * 达成度明细 API - 对应 AchievementDetailController
 * 后端路径：/api/quality/achievement-details
 *
 * 明细是达成度结果的拆解数据，
 * 记录每个子对象（课程目标/观测点/毕业要求）参与本次计算的权重、样本、平均分与达成值。
 */
import type { AchievementDetailType } from './types'
import http from '@/config/axios'

const BASE = '/api/quality/achievement-details'

export interface AchievementDetailVO {
  id: string
  achievementResultId: string
  detailType: AchievementDetailType
  referenceId: string
  referenceCode?: string
  referenceName: string
  weight?: number
  fullScore?: number
  averageScore?: number
  achievementValue?: number
  sampleTotal: number
  sampleValid: number
  excludedSampleReason?: string
  notes?: string
  createTime?: string
  updateTime?: string
}

export interface AchievementDetailSaveRequest {
  achievementResultId: string
  detailType: AchievementDetailType
  referenceId: string
  referenceCode?: string
  referenceName: string
  weight?: number
  fullScore?: number
  averageScore?: number
  achievementValue?: number
  sampleTotal: number
  sampleValid: number
  excludedSampleReason?: string
  notes?: string
}

export const achievementDetailApi = {
  listByResult: (achievementResultId: string) =>
    http.post<AchievementDetailVO[]>(`${BASE}/list-by-result`, { id: achievementResultId }),
  create: (data: AchievementDetailSaveRequest) =>
    http.post<string>(`${BASE}/create`, data),
  /** 按结果 ID 全量替换（内部重算用，用户端一般不直接调用） */
  replaceByResult: (achievementResultId: string, details: AchievementDetailSaveRequest[]) =>
    http.post<void>(`${BASE}/replace-by-result`, { achievementResultId, details }),
  /** 按结果 ID 软删除全部明细 */
  deleteByResult: (achievementResultId: string) =>
    http.post<void>(`${BASE}/delete-by-result`, { id: achievementResultId }),
}
