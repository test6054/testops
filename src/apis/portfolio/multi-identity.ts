/**
 * US-MI-01 / §8.50 多身份并列层契约（前后端对齐）。
 * 独立模块，避免 bag-types ↔ types 循环依赖导致类型解析失败。
 */
import type { PortfolioTeacherIdentityTypeCode } from '@/types/enums/portfolio-teacher-identity-type-enum'

export interface PortfolioMultiIdentityLayerVO {
  identityId?: string
  /** 身份类型编码，如 FULL_TIME / INDUSTRY_MENTOR */
  identityType: PortfolioTeacherIdentityTypeCode
  /** 身份类型中文标签 */
  identityTypeLabel: string
  /** 是否外聘/外部身份 */
  externalIdentity: boolean
  /** 展示名 */
  displayName?: string
  /** 本身份口径工作量学时 */
  workloadHours: number
  /** 本身份口径讲授课程数 */
  taughtCourseCount?: number
}
