import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/types'
import http from '@/config/axios'

export interface PortfolioTeachingPhilosophyVO {
  id: string
  teacherUserId: string
  academicYear: string
  philosophyText: string
  updateTime?: string
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: string
  /** 生命周期状态中文标签 */
  lifecycleStatusLabel?: string
  /** 是否禁止档案写 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
  /** 贡献教师多身份并列层 */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 贡献教师多身份口径说明 */
  ownerMultiIdentityNote?: string

}

export interface PortfolioTeachingPhilosophyListRequest {
  teacherId?: string
}

export interface PortfolioTeachingPhilosophySaveRequest {
  id?: string
  teacherId?: string
  academicYear: string
  philosophyText: string
}

export interface PortfolioTeachingPhilosophyDeleteRequest {
  teacherId?: string
  id: string
}

export const portfolioTeachingPhilosophyApi = {
  list(request: PortfolioTeachingPhilosophyListRequest = {}) {
    return http.post<PortfolioTeachingPhilosophyVO[]>(
      '/api/portfolio/teaching-philosophy/list',
      request,
    )
  },
  save(request: PortfolioTeachingPhilosophySaveRequest) {
    return http.post<string>('/api/portfolio/teaching-philosophy/save', request)
  },
  delete(request: PortfolioTeachingPhilosophyDeleteRequest) {
    return http.post<void>('/api/portfolio/teaching-philosophy/delete', request)
  },
}
