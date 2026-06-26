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

/** 画像维度 - PortfolioPortraitDimensionEnum */
export type PortfolioPortraitDimension
  = | 'DEVELOPMENT_CORE'
    | 'TEACHING'
    | 'RESEARCH'
    | 'TRAINING'
    | 'PRACTICE'

export const PORTFOLIO_PORTRAIT_DIMENSION_LABEL: Record<PortfolioPortraitDimension, string> = {
  DEVELOPMENT_CORE: '职业发展核心',
  TEACHING: '教学能力',
  RESEARCH: '科研教研',
  TRAINING: '培训发展',
  PRACTICE: '企业实践',
}

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

/** AI 任务状态（portfolio 子集）- AiTaskStatusEnum */
export type PortfolioAiTaskStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'

export const PORTFOLIO_AI_TASK_STATUS_LABEL: Record<PortfolioAiTaskStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  SUCCEEDED: '已完成',
  FAILED: '已失败',
  CANCELLED: '已取消',
}
