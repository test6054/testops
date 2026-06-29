import type { PortfolioPortraitDimension } from '@/apis/portfolio/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'

/** 双师认定申请状态 - PortfolioDualTeacherApplicationStatusEnum */
export type PortfolioDualTeacherApplicationStatus
  = | 'DRAFT'
    | 'COLLEGE_PENDING'
    | 'COLLEGE_RETURNED'
    | 'ACADEMIC_PENDING'
    | 'ACADEMIC_RETURNED'
    | 'APPROVED'
    | 'REJECTED'

export const PORTFOLIO_DUAL_TEACHER_APPLICATION_STATUS_LABEL: Record<PortfolioDualTeacherApplicationStatus, string> = {
  DRAFT: '草稿',
  COLLEGE_PENDING: '待院审',
  COLLEGE_RETURNED: '院审退回',
  ACADEMIC_PENDING: '待教务终审',
  ACADEMIC_RETURNED: '教务退回',
  APPROVED: '认定通过',
  REJECTED: '认定驳回',
}

/** 画像维度 - 复用 types.ts 定义 */
export type { PortfolioPortraitDimension } from '@/apis/portfolio/types'
export { PORTFOLIO_PORTRAIT_DIMENSION_LABEL } from '@/apis/portfolio/types'

/** PK 对比默认维度集（与集成测试一致） */
export const PORTFOLIO_PK_COMPARE_DEFAULT_DIMENSIONS: PortfolioPortraitDimension[] = [
  'TEACHING',
  'RESEARCH',
  'TRAINING',
  'PRACTICE',
]

/** 骨干/带头人登记类型 - PortfolioKeyTeacherRegistryTypeEnum */
export type PortfolioKeyTeacherRegistryType = 'PROGRAM_LEADER' | 'KEY_TEACHER'

export const PORTFOLIO_KEY_TEACHER_REGISTRY_TYPE_LABEL: Record<PortfolioKeyTeacherRegistryType, string> = {
  PROGRAM_LEADER: '专业带头人',
  KEY_TEACHER: '骨干教师',
}

/** 骨干/带头人登记状态 - PortfolioKeyTeacherRegistryStatusEnum */
export type PortfolioKeyTeacherRegistryStatus = 'ACTIVE' | 'REVOKED'

export const PORTFOLIO_KEY_TEACHER_REGISTRY_STATUS_LABEL: Record<PortfolioKeyTeacherRegistryStatus, string> = {
  ACTIVE: '在册',
  REVOKED: '已撤销',
}

/** 发展档案条目类型 - PortfolioDevelopmentRecordTypeEnum */
export type PortfolioDevelopmentRecordType = 'ACHIEVEMENT' | 'HONOR' | 'POLICY'

export const PORTFOLIO_DEVELOPMENT_RECORD_TYPE_LABEL: Record<PortfolioDevelopmentRecordType, string> = {
  ACHIEVEMENT: '成果库',
  HONOR: '荣誉库',
  POLICY: '政策文件库',
}

/** 发展档案条目状态 - PortfolioDevelopmentRecordStatusEnum */
export type PortfolioDevelopmentRecordStatus = 'DRAFT' | 'ACTIVE'

export const PORTFOLIO_DEVELOPMENT_RECORD_STATUS_LABEL: Record<PortfolioDevelopmentRecordStatus, string> = {
  DRAFT: '草稿',
  ACTIVE: '有效',
}

/** 推荐场景 - PortfolioTeacherRecommendSceneEnum */
export type PortfolioTeacherRecommendScene = 'EXCELLENT_TEACHER'

export const PORTFOLIO_TEACHER_RECOMMEND_SCENE_LABEL: Record<PortfolioTeacherRecommendScene, string> = {
  EXCELLENT_TEACHER: '优秀教师推荐',
}

/** 推荐运行模式 - PortfolioTeacherRecommendRunModeEnum */
export type PortfolioTeacherRecommendRunMode = 'RULE' | 'AI'

export const PORTFOLIO_TEACHER_RECOMMEND_RUN_MODE_LABEL: Record<PortfolioTeacherRecommendRunMode, string> = {
  RULE: '规则引擎',
  AI: 'AI 解释增强',
}

/** 推荐运行状态 - PortfolioTeacherRecommendRunStatusEnum */
export type PortfolioTeacherRecommendRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED'

export const PORTFOLIO_TEACHER_RECOMMEND_RUN_STATUS_LABEL: Record<PortfolioTeacherRecommendRunStatus, string> = {
  RUNNING: '运行中',
  COMPLETED: '已完成',
  FAILED: '失败',
}

/** 多元评价模式 - PortfolioEvaluationModeEnum */
export type PortfolioEvaluationMode = 'BY_PERSON' | 'BY_INDICATOR'

export const PORTFOLIO_EVALUATION_MODE_LABEL: Record<PortfolioEvaluationMode, string> = {
  BY_PERSON: '以人为主',
  BY_INDICATOR: '以指标为主',
}

/** 多元评价任务状态 - PortfolioEvaluationTaskStatusEnum */
export type PortfolioEvaluationTaskStatus
  = | 'DRAFT'
    | 'PUBLISHED'
    | 'PRELIMINARY_REVIEW'
    | 'SCHOOL_REVIEW'
    | 'EXPERT_REVIEW'
    | 'RESULT_SUMMARY'
    | 'PUBLICITY'
    | 'OBJECTION_HANDLING'
    | 'ARCHIVED'
    | 'SUSPENDED'
    | 'VOID'
    | 'CLOSED'

export const PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES: PortfolioEvaluationTaskStatus[] = [
  'PUBLISHED',
  'PRELIMINARY_REVIEW',
  'SCHOOL_REVIEW',
  'EXPERT_REVIEW',
  'RESULT_SUMMARY',
  'PUBLICITY',
  'OBJECTION_HANDLING',
  'ARCHIVED',
  'SUSPENDED',
]

export const PORTFOLIO_EVALUATION_TASK_STATUS_LABEL: Record<PortfolioEvaluationTaskStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  PRELIMINARY_REVIEW: '资格初审中',
  SCHOOL_REVIEW: '学校复审中',
  EXPERT_REVIEW: '专家评审中',
  RESULT_SUMMARY: '结果汇总中',
  PUBLICITY: '公示中',
  OBJECTION_HANDLING: '异议处理中',
  ARCHIVED: '已归档',
  SUSPENDED: '已暂停',
  VOID: '已作废',
  CLOSED: '已关闭',
}

export const PORTFOLIO_EVALUATION_TASK_STATUS_TONE: Record<PortfolioEvaluationTaskStatus, BadgeTone> = {
  DRAFT: 'gray',
  PUBLISHED: 'green',
  PRELIMINARY_REVIEW: 'blue',
  SCHOOL_REVIEW: 'blue',
  EXPERT_REVIEW: 'blue',
  RESULT_SUMMARY: 'orange',
  PUBLICITY: 'orange',
  OBJECTION_HANDLING: 'orange',
  ARCHIVED: 'green',
  SUSPENDED: 'gray',
  VOID: 'red',
  CLOSED: 'blue',
}

/** 教师发展规划类型 - PortfolioDevelopmentPlanTypeEnum */
export type PortfolioDevelopmentPlanType = 'TEACHER' | 'DEPARTMENT'

export const PORTFOLIO_DEVELOPMENT_PLAN_TYPE_LABEL: Record<PortfolioDevelopmentPlanType, string> = {
  TEACHER: '教师年度规划',
  DEPARTMENT: '部门年度规划',
}

/** 教师发展规划状态 - PortfolioDevelopmentPlanStatusEnum */
export type PortfolioDevelopmentPlanStatus
  = | 'DRAFT'
    | 'DEPARTMENT_PENDING'
    | 'DEPARTMENT_RETURNED'
    | 'APPROVED'
    | 'HISTORICAL'

export const PORTFOLIO_DEVELOPMENT_PLAN_STATUS_LABEL: Record<PortfolioDevelopmentPlanStatus, string> = {
  DRAFT: '草稿',
  DEPARTMENT_PENDING: '待部门审核',
  DEPARTMENT_RETURNED: '部门退回',
  APPROVED: '审核通过',
  HISTORICAL: '历史只读',
}

export const PORTFOLIO_DEVELOPMENT_PLAN_STATUS_TONE: Record<PortfolioDevelopmentPlanStatus, BadgeTone> = {
  DRAFT: 'gray',
  DEPARTMENT_PENDING: 'blue',
  DEPARTMENT_RETURNED: 'orange',
  APPROVED: 'green',
  HISTORICAL: 'gray',
}

/** 发展规划明细项状态 - PortfolioDevelopmentPlanItemStatusEnum */
export type PortfolioDevelopmentPlanItemStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export const PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_LABEL: Record<PortfolioDevelopmentPlanItemStatus, string> = {
  NOT_STARTED: '未开始',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成',
}

export const PORTFOLIO_DEVELOPMENT_PLAN_ITEM_STATUS_TONE: Record<PortfolioDevelopmentPlanItemStatus, BadgeTone> = {
  NOT_STARTED: 'gray',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
}

/** 外聘教师数据状态 - PortfolioExternalTeacherDataStatusEnum */
export type PortfolioExternalTeacherDataStatus = 'ACTIVE' | 'INACTIVE'

export const PORTFOLIO_EXTERNAL_TEACHER_DATA_STATUS_LABEL: Record<PortfolioExternalTeacherDataStatus, string> = {
  ACTIVE: '有效',
  INACTIVE: '停用',
}

/** 外聘教师导入批次状态 - PortfolioExternalTeacherImportBatchStatusEnum */
export type PortfolioExternalTeacherImportBatchStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export const PORTFOLIO_EXTERNAL_TEACHER_IMPORT_BATCH_STATUS_LABEL: Record<PortfolioExternalTeacherImportBatchStatus, string> = {
  PENDING: '待确认',
  COMPLETED: '导入完成',
  FAILED: '导入失败',
}

/** 历史规划导入批次状态 - PortfolioDevelopmentPlanHistoryImportBatchStatusEnum */
export type PortfolioDevelopmentPlanHistoryImportBatchStatus = 'PENDING' | 'COMPLETED' | 'FAILED'

export const PORTFOLIO_DEVELOPMENT_PLAN_HISTORY_IMPORT_BATCH_STATUS_LABEL: Record<PortfolioDevelopmentPlanHistoryImportBatchStatus, string> = {
  PENDING: '待确认',
  COMPLETED: '导入完成',
  FAILED: '导入失败',
}
