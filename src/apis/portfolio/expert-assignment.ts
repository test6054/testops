import type { PortfolioMultiIdentityLayerVO } from '@/apis/portfolio/multi-identity'
import type { PortfolioTeacherLifecycleStatusCode } from '@/apis/portfolio/teacher-lifecycle'
import type { PageResult } from '@/types'
import type { PortfolioArchiveRecordSourceTypeCode } from '@/types/enums/portfolio-archive-record-source-type-enum'
import type { PortfolioExpertAssignmentStatusCode } from '@/types/enums/portfolio-expert-assignment-status-enum'
import http from '@/config/axios'

/** 对齐后端 PortfolioExpertMaterialScope */
export interface PortfolioExpertMaterialScope {
  categoryCodes: string[]
  categoryIds?: string[]
}

export interface PortfolioExpertAssignmentVO {
  id: string
  evaluationTaskId: string
  evaluationTaskName?: string
  expertUserId: string
  subjectTeacherIds: string[]
  materialScope: PortfolioExpertMaterialScope
  accessToken?: string
  maskRequired: boolean
  assignmentStatus: PortfolioExpertAssignmentStatusCode
  expireTime: string
  createTime: string
}

/** 对齐后端 PortfolioExpertAssignmentSubjectTeacherVO；Long ID 对前端保持 string */
export interface PortfolioExpertAssignmentSubjectTeacherVO {
  /** 脱敏稳定引用，如 T01；maskRequired 时作为行键 */
  subjectRef?: string
  /** 被评教师用户 ID；脱敏时为空；后端 Long */
  teacherUserId?: string
  maskedDisplayName: string
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 生命周期状态中文标签 */
  lifecycleStatusLabel?: string
  /** 是否禁止档案写 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（US-MI-01 / §8.50） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

/** 对齐后端 PortfolioExpertReviewMaterialItemVO；Long ID 对前端保持 string */
export interface PortfolioExpertReviewMaterialItemVO {
  /** 脱敏材料稳定引用，如 M0001；maskRequired 时作为行键 */
  materialRef?: string
  /** 被评教师用户 ID；脱敏时为空；后端 Long */
  teacherUserId?: string
  maskedTeacherLabel: string
  /** 正式档案记录 ID；脱敏时为空；后端 Long */
  archiveRecordId?: string
  /** 档案分类 ID；脱敏时为空；后端 Long */
  categoryId?: string
  categoryCode?: string
  categoryName?: string
  academicYear?: string
  documentVersionNo?: number
  sourceType?: PortfolioArchiveRecordSourceTypeCode
  hasPrimaryFile: boolean
  /** 主附件文件节点；脱敏强制时不返回；后端 Long */
  fileNodeId?: string
  supportMaterialCount: number
  /** 是否关联正式 AI 初审结果 */
  hasAiPreReview?: boolean
  /** AI 初审结论编码 */
  aiPreReviewConclusionCode?: string
  /** AI 初审结果标题；maskRequired 时不返回 */
  aiPreReviewResultTitle?: string
  /** AI 初审摘要；maskRequired 时不返回 */
  aiPreReviewSummary?: string
  /** 身份用途切片 CAMPUS / EXTERNAL / SHARED */
  identityScope?: string
  /** 是否可用于校内硬性条件 */
  usableForCampusHardCriteria?: boolean
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: PortfolioTeacherLifecycleStatusCode
  /** 生命周期状态中文标签 */
  lifecycleStatusLabel?: string
  /** 是否禁止档案写 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean
  /** 归属教师多身份并列层（US-MI-01 / §8.50） */
  ownerIdentityLayers?: PortfolioMultiIdentityLayerVO[]
  /** 多身份贡献说明；层数大于 1 时非空 */
  ownerMultiIdentityNote?: string
}

export interface PortfolioExpertAssignmentReviewBundleVO {
  assignmentId: string
  evaluationTaskId: string
  evaluationTaskName: string
  maskRequired: boolean
  materialScope: PortfolioExpertMaterialScope
  assignmentStatus: PortfolioExpertAssignmentStatusCode
  expireTime: string
  readOnly: boolean
  subjectTeachers: PortfolioExpertAssignmentSubjectTeacherVO[]
  materials: PortfolioExpertReviewMaterialItemVO[]
}

export const portfolioExpertAssignmentApi = {
  create: (data: {
    evaluationTaskId: string
    expertUserId: string
    subjectTeacherIds: string[]
    materialScope: PortfolioExpertMaterialScope
    expireDays: number
  }) => http.post<PortfolioExpertAssignmentVO>('/api/portfolio/expert-assignment/create', data),
  page: (data: {
    pageNum: number
    pageSize: number
    id?: string | number
    evaluationTaskId?: string
    expertUserId?: string
    assignmentStatus?: PortfolioExpertAssignmentStatusCode
  }) =>
    http.post<PageResult<PortfolioExpertAssignmentVO>>(
      '/api/portfolio/expert-assignment/page',
      data,
    ),
  revoke: (data: { id: string }) =>
    http.post<PortfolioExpertAssignmentVO>('/api/portfolio/expert-assignment/revoke', data),
  reviewBundle: (data: { accessToken?: string, assignmentId?: string }) =>
    http.post<PortfolioExpertAssignmentReviewBundleVO>(
      '/api/portfolio/expert-assignment/review-bundle',
      data,
    ),
}
