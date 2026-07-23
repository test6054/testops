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
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import AchievementResultSelector from './AchievementResultSelector.vue'
import ArchiveSelector from './ArchiveSelector.vue'
import AssessmentItemSelector from './AssessmentItemSelector.vue'
import AuditIssueSelector from './AuditIssueSelector.vue'
import AuditRectificationSelector from './AuditRectificationSelector.vue'
import CatalogCourseSelector from './CatalogCourseSelector.vue'
import ClassSelector from './ClassSelector.vue'
import CourseGoalSelector from './CourseGoalSelector.vue'
import CourseSelector from './CourseSelector.vue'
import DepartmentSelector from './DepartmentSelector.vue'
import GraduationRequirementSelector from './GraduationRequirementSelector.vue'
import IndirectFormSelector from './IndirectFormSelector.vue'
import ProfessionAlgorithmProfileSelector from './ProfessionAlgorithmProfileSelector.vue'
import ProgramEvaluationProfileSelector from './ProgramEvaluationProfileSelector.vue'
import ProgramSelector from './ProgramSelector.vue'
import ReportSelector from './ReportSelector.vue'
import RequirementIndicatorSelector from './RequirementIndicatorSelector.vue'
import StudentSelector from './StudentSelector.vue'
import TrainingObjectiveSelector from './TrainingObjectiveSelector.vue'
import TrainingPlanSelector from './TrainingPlanSelector.vue'

export {
  AchievementResultSelector,
  ArchiveSelector,
  AssessmentItemSelector,
  AuditIssueSelector,
  AuditRectificationSelector,
  CatalogCourseSelector,
  ClassSelector,
  CourseGoalSelector,
  CourseSelector,
  DepartmentSelector,
  GraduationRequirementSelector,
  IndirectFormSelector,
  ProfessionAlgorithmProfileSelector,
  ProgramEvaluationProfileSelector,
  ProgramSelector,
  ReportSelector,
  RequirementIndicatorSelector,
  StudentSelector,
  TeacherSelector,
  TrainingObjectiveSelector,
  TrainingPlanSelector,
}
