/**
 * Quality 模块下拉选择器集合
 *
 * 使用方式（按需引入）：
 *   import { ProgramSelector, TrainingPlanSelector } from '@/components/quality/selectors'
 *
 * 设计原则：
 * - 所有 selector 使用 v-model:value，回调统一抛 (value, option) 形态
 * - 上下游 selector 通过 props 联动（如 RequirementIndicatorSelector 必须传 requirementId）
 * - 默认对真源 API 做一次 onMounted 加载，远程搜索类使用 300ms 防抖
 */
export { default as AchievementResultSelector } from './AchievementResultSelector.vue'
export { default as ArchiveSelector } from './ArchiveSelector.vue'
export { default as AssessmentItemSelector } from './AssessmentItemSelector.vue'
export { default as AuditIssueSelector } from './AuditIssueSelector.vue'
export { default as AuditRectificationSelector } from './AuditRectificationSelector.vue'
export { default as CatalogCourseSelector } from './CatalogCourseSelector.vue'
export { default as ClassSelector } from './ClassSelector.vue'
export { default as CourseGoalSelector } from './CourseGoalSelector.vue'
export { default as CourseSelector } from './CourseSelector.vue'
export { default as GraduationRequirementSelector } from './GraduationRequirementSelector.vue'
export { default as IndirectFormSelector } from './IndirectFormSelector.vue'
export { default as ProgramEvaluationProfileSelector } from './ProgramEvaluationProfileSelector.vue'
export { default as ProgramSelector } from './ProgramSelector.vue'
export { default as ReportSelector } from './ReportSelector.vue'
export { default as RequirementIndicatorSelector } from './RequirementIndicatorSelector.vue'
export { default as StudentSelector } from './StudentSelector.vue'
export { default as TeacherSelector } from './TeacherSelector.vue'
export { default as TrainingObjectiveSelector } from './TrainingObjectiveSelector.vue'
export { default as TrainingPlanSelector } from './TrainingPlanSelector.vue'
