export * from './accreditation'
export * from './accreditation-standard'
export * from './achievement'
export * from './achievement-audit'
export * from './achievement-detail'
export * from './ai-mask-mapping'
export * from './ai-task'
export * from './archive'
export * from './assessment-item'
export * from './audit-issue'
export * from './course-goal'
export * from './evaluation-workgroup'
export * from './external-pull'
export * from './graduation-requirement'
export * from './importing'
export * from './improvement-task'
export * from './indirect-evaluation'
export * from './process-evaluation'
export * from './profession-algorithm-profile'
export * from './profession-algorithm-template'
export * from './program-evaluation-profile'
export * from './quality-course'
export * from './report'
export * from './requirement-indicator'
export * from './scale-conversion-rule'
export * from './score-batch'
export * from './score-record'
export * from './training-objective'
export * from './training-plan'
/**
 * 教学质量评价 API 客户端 - 对接 edu-quality 模块
 *
 * 用法：
 *   import { trainingPlanApi, achievementApi, aiTaskApi } from '@/apis/quality'
 *
 * 设计要点：
 * - 所有方法返回的是 ResultInfo.data 解包后的业务数据
 * - 后端 Long ID 全部以 string 表达
 * - 仅使用 GET / POST，遵守项目契约
 */
export * from './types'
export * from './user-catalog'
