<script setup lang="ts">
import type { RadioChangeEvent } from 'ant-design-vue'
import { message } from 'ant-design-vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AssessmentGoalWeightSaveRequest,
  AssessmentGoalWeightVO,
} from '@/apis/quality/assessment-goal-weight'
import { assessmentGoalWeightApi } from '@/apis/quality/assessment-goal-weight'
import type { AssessmentItemSaveRequest, AssessmentItemVO } from '@/apis/quality/assessment-item'
import { assessmentItemApi } from '@/apis/quality/assessment-item'
import type { CourseGoalSaveRequest, CourseGoalVO } from '@/apis/quality/course-goal'
import { courseGoalApi } from '@/apis/quality/course-goal'
import type { CourseGoalAssessmentRuleSaveRequest } from '@/apis/quality/course-goal-assessment-rule'
import { courseGoalAssessmentRuleApi } from '@/apis/quality/course-goal-assessment-rule'
import type {
  CourseGoalRequirementSaveRequest,
  CourseGoalRequirementVO,
} from '@/apis/quality/course-goal-requirement'
import { courseGoalRequirementApi } from '@/apis/quality/course-goal-requirement'
import type { GraduationRequirementVO } from '@/apis/quality/graduation-requirement'
import { graduationRequirementApi } from '@/apis/quality/graduation-requirement'
import type {
  QualityCourseEditorForm,
  QualityCourseSaveRequest,
  QualityCourseVO,
} from '@/apis/quality/quality-course'
import { qualityCourseApi } from '@/apis/quality/quality-course'
import type { RequirementIndicatorVO } from '@/apis/quality/requirement-indicator'
import { requirementIndicatorApi } from '@/apis/quality/requirement-indicator'
import type { RubricItemSaveRequest, RubricItemVO } from '@/apis/quality/rubric-item'
import { rubricItemApi } from '@/apis/quality/rubric-item'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
/**
 * 质量评价课程 - 支撑矩阵工作台（3-in-1）
 *
 * 合并原 3 个独立路由：质量评价课程 / 课程目标 / 考核环节。
 *
 * 业务链路（OBE）：
 *   培养方案
 *     → 质量评价课程（一门具体开课，含教师、班级、学期）
 *         → 课程目标（3-5 个学习目标，每个支撑若干「毕业要求/观测点」）
 *             → 课程支撑矩阵：课程目标(行) × 毕业要求|观测点(列)
 *               单元格 = 支撑度 H/M/L + 权重；
 *               可针对毕业要求整体（requirementId）或某个观测点（indicatorId）建立支撑
 *         → 考核环节（理论考试 / 作业 / 实验 / 报告 / 答辩 等）
 *             → 考核-课程目标权重矩阵：考核(行) × 课程目标(列)
 *               单元格 = (item, goal) 的 weight + fullScore；
 *               同一考核环节对各课程目标 weight 之和必须 = 1（validate-weights 强校验）
 *             → Rubric 评分量规：每个 (考核, 课程目标) 拆分到具体维度的等级化打分
 *               rubric 满分之和必须 = 该 (item, goal) 的 fullScore（validate-full-score 强校验）
 *
 * 关键约束：
 *   - 课程目标 → 毕业要求/观测点 supportWeight：取值 0~1，无强校验和=1（仅业务侧约束）
 *   - 考核 → 课程目标 weight：同一考核内权重和必须 = 1
 *   - Rubric 满分加总 = (item, goal) 的 fullScore
 */
import type { CourseListVO } from '@/apis/quality/user-catalog'
import type { MatrixCell, MatrixCol, MatrixRow } from '@/components/workbench/matrix-types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref } from 'vue'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  AggregationFunctionCode,
  AggregationFunctionDescription,
  ALL_AGGREGATION_FUNCTION_CODES,
  ALL_ASSESSMENT_ITEM_TYPE_CODES,
  ALL_SUPPORT_LEVEL_CODES,
  AssessmentItemTypeCode,
  AssessmentItemTypeDescription,
  SUPPORT_LEVEL_DEFAULT_FACTOR,
  SupportLevelCode,
  SupportLevelDescription,
} from '@/apis/quality/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import CourseSelector from '@/components/quality/selectors/CourseSelector.vue'
import ProgramSelector from '@/components/quality/selectors/ProgramSelector.vue'
import TeacherSelector from '@/components/quality/selectors/TeacherSelector.vue'
import TrainingPlanSelector from '@/components/quality/selectors/TrainingPlanSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import MatrixWorkbench from '@/components/workbench/MatrixWorkbench.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useQualityStore } from '@/stores/modules/quality'
import { ALL_SEMESTER_CODES, formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

const itemColumns: ColumnsType = [
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 100 },
  { title: '名称', dataIndex: 'itemName', key: 'itemName' },
  { title: '类型', key: 'itemType', width: 120 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '过程性', dataIndex: 'isProcessOriented', key: 'isProcessOriented', width: 80 },
  { title: '权重和', key: 'weightSum', width: 100 },
  { title: 'Rubric 数', key: 'rubricCount', width: 100 },
  { title: '操作', key: 'actions', width: 280, fixed: 'right' },
]

const goalColumns: ColumnsType = [
  { title: '编码', dataIndex: 'goalCode', key: 'goalCode', width: 80 },
  { title: '名称', dataIndex: 'goalName', key: 'goalName' },
  { title: '阈值', dataIndex: 'thresholdValue', key: 'thresholdValue', width: 80 },
  { title: '聚合', dataIndex: 'aggregation', key: 'aggregation', width: 120 },
  { title: '支撑数', key: 'supportCount', width: 80 },
  { title: '标记', key: 'flags', width: 180 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const rubricColumns: ColumnsType = [
  { title: '编码', dataIndex: 'rubricCode', key: 'rubricCode', width: 80 },
  { title: '维度', dataIndex: 'rubricName', key: 'rubricName' },
  { title: '课程目标', key: 'goalCode', width: 120 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const qualityStore = useQualityStore()

const isPlanStructureEditable = computed(
  () => qualityStore.currentPlan?.confirmationStatus !== 'CONFIRMED',
)

function guardCourseMatrixEditable(action: string): boolean {
  if (isPlanStructureEditable.value) return true
  message.error(`培养方案已确认，请先撤回后再${action}`)
  return false
}

const WEIGHT_EPSILON = 1e-3

function assessmentItemTypeLabel(value: AssessmentItemTypeCode): string {
  return strictEnumLabel(AssessmentItemTypeDescription, value, '考核环节类型')
}

function aggregationFunctionLabel(value: AggregationFunctionCode): string {
  return strictEnumLabel(AggregationFunctionDescription, value, '聚合函数')
}

/* ========== 当前课程 ========== */

const currentCourse = ref<QualityCourseVO | null>(null)
const courseLoading = ref(false)

async function loadCurrentCourse() {
  const scope = beginQualityScopeRequest()
  const courseId = qualityStore.currentQualityCourseId
  if (!courseId) {
    currentCourse.value = null
    return
  }
  courseLoading.value = true
  try {
    const detail = await qualityCourseApi.detail(courseId)
    if (scope.isStale()) {
      return
    }
    currentCourse.value = detail
  } finally {
    if (!scope.isStale()) {
      courseLoading.value = false
    }
  }
}

/* ========== 课程目标 ========== */

const courseGoals = ref<CourseGoalVO[]>([])
const courseGoalsLoading = ref(false)

async function loadCourseGoals() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentQualityCourseId) {
    courseGoals.value = []
    return
  }
  courseGoalsLoading.value = true
  try {
    const goals = await courseGoalApi.listByCourse(qualityStore.currentQualityCourseId)
    if (scope.isStale()) {
      return
    }
    courseGoals.value = goals
  } finally {
    if (!scope.isStale()) {
      courseGoalsLoading.value = false
    }
  }
}

/* ========== 课程目标 → 毕业要求/观测点 支撑映射 ========== */

const courseGoalSupports = ref<Map<string, CourseGoalRequirementVO[]>>(new Map())
const supportsLoading = ref(false)

async function loadAllSupports() {
  const scope = beginQualityScopeRequest()
  supportsLoading.value = true
  try {
    const map = new Map<string, CourseGoalRequirementVO[]>()
    for (const goal of courseGoals.value) {
      const list = await courseGoalRequirementApi.listByCourseGoal(goal.id)
      if (scope.isStale()) {
        return
      }
      map.set(goal.id, list)
    }
    if (scope.isStale()) {
      return
    }
    courseGoalSupports.value = map
  } finally {
    if (!scope.isStale()) {
      supportsLoading.value = false
    }
  }
}

const allSupports = computed<CourseGoalRequirementVO[]>(() => {
  const acc: CourseGoalRequirementVO[] = []
  for (const list of courseGoalSupports.value.values()) acc.push(...list)
  return acc
})

function supportsOfGoal(goalId: string): CourseGoalRequirementVO[] {
  return courseGoalSupports.value.get(goalId) || []
}

function supportWeightSumOfGoal(goalId: string): number {
  return supportsOfGoal(goalId).reduce((acc, s) => acc + (Number(s.supportWeight) || 0), 0)
}

/* ========== 考核环节 ========== */

const assessmentItems = ref<AssessmentItemVO[]>([])
const assessmentItemsLoading = ref(false)

async function loadAssessmentItems() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentQualityCourseId) {
    assessmentItems.value = []
    return
  }
  assessmentItemsLoading.value = true
  try {
    const items = await assessmentItemApi.listByCourse(qualityStore.currentQualityCourseId)
    if (scope.isStale()) {
      return
    }
    assessmentItems.value = items
  } finally {
    if (!scope.isStale()) {
      assessmentItemsLoading.value = false
    }
  }
}

/* ========== 考核 → 课程目标 权重 + Rubric ========== */

const assessmentGoalWeights = ref<Map<string, AssessmentGoalWeightVO[]>>(new Map())
const rubricsByItem = ref<Map<string, RubricItemVO[]>>(new Map())
const itemMetaLoading = ref(false)

async function loadAllItemMeta() {
  const scope = beginQualityScopeRequest()
  itemMetaLoading.value = true
  try {
    const wMap = new Map<string, AssessmentGoalWeightVO[]>()
    const rMap = new Map<string, RubricItemVO[]>()
    for (const item of assessmentItems.value) {
      const [weights, rubrics] = await Promise.all([
        assessmentGoalWeightApi.listByItem(item.id),
        rubricItemApi.listByItem(item.id),
      ])
      if (scope.isStale()) {
        return
      }
      wMap.set(item.id, weights)
      rMap.set(item.id, rubrics)
    }
    if (scope.isStale()) {
      return
    }
    assessmentGoalWeights.value = wMap
    rubricsByItem.value = rMap
  } finally {
    if (!scope.isStale()) {
      itemMetaLoading.value = false
    }
  }
}

function weightsOfItem(itemId: string): AssessmentGoalWeightVO[] {
  return assessmentGoalWeights.value.get(itemId) || []
}

function rubricsOfItem(itemId: string): RubricItemVO[] {
  return rubricsByItem.value.get(itemId) || []
}

function itemWeightSum(itemId: string): number {
  return weightsOfItem(itemId).reduce((acc, w) => acc + (Number(w.weight) || 0), 0)
}

/* ========== 矩阵列：毕业要求 + 观测点（来自 trainingPlan） ========== */

const requirements = ref<GraduationRequirementVO[]>([])
const indicators = ref<RequirementIndicatorVO[]>([])
const referenceLoading = ref(false)

async function loadReferenceData() {
  const scope = beginQualityScopeRequest()
  const planId = currentCourse.value?.trainingPlanId || qualityStore.currentTrainingPlanId
  if (!planId) {
    requirements.value = []
    indicators.value = []
    return
  }
  referenceLoading.value = true
  try {
    const reqList = await graduationRequirementApi.listByPlan(planId)
    if (scope.isStale()) {
      return
    }
    requirements.value = reqList
    const indicatorAcc: RequirementIndicatorVO[] = []
    for (const req of reqList) {
      const list = await requirementIndicatorApi.listByRequirement(req.id)
      if (scope.isStale()) {
        return
      }
      indicatorAcc.push(...list)
    }
    if (scope.isStale()) {
      return
    }
    indicators.value = indicatorAcc
  } finally {
    if (!scope.isStale()) {
      referenceLoading.value = false
    }
  }
}

const indicatorsByReqId = computed(() => {
  const map = new Map<string, RequirementIndicatorVO[]>()
  indicators.value.forEach((ind) => {
    const list = map.get(ind.requirementId) || []
    list.push(ind)
    map.set(ind.requirementId, list)
  })
  return map
})

/* ========== 信号指标 ========== */

const courseGoalsCovered = computed(
  () => courseGoals.value.filter((g) => supportsOfGoal(g.id).length > 0).length,
)

const itemsHealthy = computed(() => {
  if (assessmentItems.value.length === 0) return 0
  return assessmentItems.value.filter((i) => Math.abs(itemWeightSum(i.id) - 1) < WEIGHT_EPSILON)
    .length
})

const indicatorsCoveredCount = computed(() => {
  const set = new Set<string>()
  for (const s of allSupports.value) {
    if (s.indicatorId) set.add(s.indicatorId)
  }
  return set.size
})

const requirementsCoveredCount = computed(() => {
  const set = new Set<string>()
  for (const s of allSupports.value) {
    if (s.requirementId) set.add(s.requirementId)
    if (s.indicatorId) {
      const ind = indicators.value.find((i) => i.id === s.indicatorId)
      if (ind) set.add(ind.requirementId)
    }
  }
  return set.size
})

const signals = computed<SignalMetric[]>(() => [
  {
    key: 'goals',
    label: '课程目标数',
    value: courseGoals.value.length,
    tone: courseGoals.value.length === 0 ? 'gray' : 'blue',
  },
  {
    key: 'goalsCovered',
    label: '已挂支撑目标',
    value: `${courseGoalsCovered.value}/${courseGoals.value.length}`,
    tone:
      courseGoals.value.length > 0 && courseGoalsCovered.value === courseGoals.value.length
        ? 'green'
        : 'red',
  },
  {
    key: 'reqCovered',
    label: '覆盖毕业要求',
    value: `${requirementsCoveredCount.value}/${requirements.value.length}`,
    tone: 'gray',
  },
  {
    key: 'indCovered',
    label: '覆盖观测点',
    value: `${indicatorsCoveredCount.value}/${indicators.value.length}`,
    tone: 'gray',
  },
  {
    key: 'items',
    label: '考核环节数',
    value: assessmentItems.value.length,
    tone: assessmentItems.value.length === 0 ? 'gray' : 'blue',
  },
  {
    key: 'itemsHealth',
    label: '考核权重健康',
    value: `${itemsHealthy.value}/${assessmentItems.value.length}`,
    tone:
      assessmentItems.value.length > 0 && itemsHealthy.value === assessmentItems.value.length
        ? 'green'
        : 'red',
  },
])

/* ========== 矩阵 1：课程目标 × 毕业要求/观测点 ========== */

interface SupportColMeta {
  key: string
  label: string
  hint?: string
  reqId?: string
  indicatorId?: string
}

const supportCols = computed<SupportColMeta[]>(() => {
  const arr: SupportColMeta[] = []
  for (const req of requirements.value) {
    arr.push({
      key: `R::${req.id}`,
      label: req.requirementCode,
      hint: req.requirementName,
      reqId: req.id,
    })
    const inds = indicatorsByReqId.value.get(req.id) || []
    for (const ind of inds) {
      arr.push({
        key: `I::${ind.id}`,
        label: ind.indicatorCode,
        hint: ind.indicatorName,
        indicatorId: ind.id,
      })
    }
  }
  return arr
})

const supportMatrixCols = computed<MatrixCol[]>(() =>
  supportCols.value.map((c) => ({
    key: c.key,
    label: c.label,
    hint: c.hint,
    width: 110,
    badgeTone: c.indicatorId ? 'gray' : 'blue',
    badge: c.indicatorId ? '观测点' : '要求',
  })),
)

const supportMatrixRows = computed<MatrixRow[]>(() =>
  courseGoals.value.map((g) => {
    const sum = supportWeightSumOfGoal(g.id)
    const linkedCount = supportsOfGoal(g.id).length
    return {
      key: g.id,
      label: g.goalCode,
      hint: g.goalName,
      badge: `挂${linkedCount} · Σw=${sum.toFixed(2)}`,
      badgeTone: linkedCount === 0 ? 'red' : 'blue',
      warning: linkedCount === 0 ? '未挂任何毕业要求/观测点' : undefined,
    }
  }),
)

const supportMatrixCells = computed<MatrixCell[]>(() => {
  const cells: MatrixCell[] = []
  for (const support of allSupports.value) {
    const colKey = support.indicatorId
      ? `I::${support.indicatorId}`
      : support.requirementId
        ? `R::${support.requirementId}`
        : null
    if (!colKey) continue
    const tone: MatrixCell['tone'] =
      support.supportLevel === SupportLevelCode.HIGH
        ? 'red'
        : support.supportLevel === SupportLevelCode.MEDIUM
          ? 'orange'
          : 'blue'
    cells.push({
      rowKey: support.courseGoalId,
      colKey,
      primary: support.supportLevel.charAt(0),
      secondary: `w=${support.supportWeight.toFixed(2)}`,
      tone,
    })
  }
  return cells
})

/* ========== 矩阵 2：考核 × 课程目标 ========== */

const assessMatrixRows = computed<MatrixRow[]>(() =>
  assessmentItems.value.map((it) => {
    const sum = itemWeightSum(it.id)
    const healthy = Math.abs(sum - 1) < WEIGHT_EPSILON
    return {
      key: it.id,
      label: it.itemCode,
      hint: `${it.itemName}（${assessmentItemTypeLabel(it.itemType)}）`,
      badge: `Σw=${sum.toFixed(3)}`,
      badgeTone: healthy ? 'green' : 'red',
      warning: healthy
        ? undefined
        : weightsOfItem(it.id).length === 0
          ? '未挂任何课程目标'
          : '权重和≠1',
    }
  }),
)

const assessMatrixCols = computed<MatrixCol[]>(() =>
  courseGoals.value.map((g) => ({
    key: g.id,
    label: g.goalCode,
    hint: g.goalName,
    width: 130,
  })),
)

const assessMatrixCells = computed<MatrixCell[]>(() => {
  const cells: MatrixCell[] = []
  for (const item of assessmentItems.value) {
    for (const w of weightsOfItem(item.id)) {
      cells.push({
        rowKey: item.id,
        colKey: w.courseGoalId,
        primary: `w=${w.weight.toFixed(2)}`,
        secondary: `满分 ${w.fullScore.toFixed(0)}`,
        tone: 'green',
      })
    }
  }
  return cells
})

/* ========== 编辑器：课程 ========== */

const courseEditorVisible = ref(false)
const courseEditorMode = ref<'create' | 'edit'>('create')
const courseEditor = reactive<QualityCourseEditorForm>({
  trainingPlanId: '',
  programId: '',
  courseId: '',
  courseCode: '',
  courseName: '',
  courseCategory: '',
  courseNature: '',
  schoolYear: '',
  semester: undefined,
  teacherUserId: '',
  classId: '',
  creditHours: undefined,
  creditValue: undefined,
  civicObjective: '',
  syllabusFileId: '',
  enabled: true,
})
const courseSubmitting = ref(false)
const syllabusFileName = ref('')

function openCourseCreate() {
  if (!guardCourseMatrixEditable('新建课程')) return
  if (!qualityStore.currentTrainingPlanId) {
    message.warning('请先在"培养方案体系工作台"选择培养方案')
    return
  }
  courseEditorMode.value = 'create'
  Object.assign(courseEditor, {
    id: undefined,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    programId: qualityStore.currentProgramId,
    courseId: '',
    courseCode: '',
    courseName: '',
    courseCategory: '',
    courseNature: '',
    schoolYear: qualityStore.currentSchoolYear || '',
    semester: qualityStore.currentSemester,
    teacherUserId: '',
    classId: '',
    creditHours: undefined,
    creditValue: undefined,
    civicObjective: '',
    syllabusFileId: '',
    enabled: true,
  })
  syllabusFileName.value = ''
  courseEditorVisible.value = true
}

function openCourseEdit() {
  if (!currentCourse.value || !guardCourseMatrixEditable('编辑课程')) return
  courseEditorMode.value = 'edit'
  Object.assign(courseEditor, {
    id: currentCourse.value.id,
    trainingPlanId: currentCourse.value.trainingPlanId,
    programId: currentCourse.value.programId,
    courseId: currentCourse.value.courseId,
    courseCode: currentCourse.value.courseCode,
    courseName: currentCourse.value.courseName,
    courseCategory: currentCourse.value.courseCategory || '',
    courseNature: currentCourse.value.courseNature || '',
    schoolYear: currentCourse.value.schoolYear || '',
    semester: currentCourse.value.semester,
    teacherUserId: currentCourse.value.teacherUserId || '',
    classId: currentCourse.value.classId || '',
    creditHours: currentCourse.value.creditHours,
    creditValue: currentCourse.value.creditValue,
    civicObjective: currentCourse.value.civicObjective || '',
    syllabusFileId: currentCourse.value.syllabusFileId || '',
    enabled: currentCourse.value.enabled,
  })
  syllabusFileName.value = currentCourse.value.syllabusFileId ? '已关联教学大纲附件' : ''
  courseEditorVisible.value = true
}

/**
 * 选中 edu-user 课程目录后，回填编码/名称：
 * - 创建模式：以目录课程为权威，覆盖手动输入。
 * - 编辑模式：仅在原值为空时回填，保留教师按学期自定义的编码 / 名称。
 */
function handleCatalogCourseChange(value: string | null, option?: CourseListVO) {
  courseEditor.courseId = value ?? ''
  if (!option) return
  if (courseEditorMode.value === 'create') {
    courseEditor.courseCode = option.courseCode || ''
    courseEditor.courseName = option.courseName || ''
  } else {
    if (!courseEditor.courseCode) courseEditor.courseCode = option.courseCode || ''
    if (!courseEditor.courseName) courseEditor.courseName = option.courseName || ''
  }
}

function handleProgramChange(value: string | null) {
  courseEditor.programId = value ?? ''
  courseEditor.trainingPlanId = ''
  courseEditor.courseId = ''
  courseEditor.courseCode = ''
  courseEditor.courseName = ''
}

function handleTrainingPlanChange(value: string | null) {
  courseEditor.trainingPlanId = value ?? ''
}

function handleTeacherChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    message.error('授课教师只能选择一位，请重新选择')
    return
  }
  courseEditor.teacherUserId = value ?? ''
}

function handleClassChange(value: string | null) {
  courseEditor.classId = value ?? ''
}

async function submitCourse() {
  if (courseEditorMode.value === 'edit' && !guardCourseMatrixEditable('编辑课程')) return
  if (courseEditorMode.value === 'create' && !guardCourseMatrixEditable('新建课程')) return
  const semester = courseEditor.semester
  const selectedSemester = ALL_SEMESTER_CODES.find((code) => code === semester)
  if (
    !courseEditor.programId.trim() ||
    !courseEditor.trainingPlanId.trim() ||
    !courseEditor.courseId.trim() ||
    !courseEditor.courseCode.trim() ||
    !courseEditor.courseName.trim() ||
    !courseEditor.schoolYear.trim() ||
    !selectedSemester
  ) {
    message.error('请填写专业、培养方案、目录课程、编码、名称、学年、学期')
    return
  }
  const request: QualityCourseSaveRequest = {
    id: courseEditor.id,
    trainingPlanId: courseEditor.trainingPlanId,
    programId: courseEditor.programId,
    courseId: courseEditor.courseId,
    courseCode: courseEditor.courseCode.trim(),
    courseName: courseEditor.courseName.trim(),
    courseCategory: courseEditor.courseCategory?.trim() || undefined,
    courseNature: courseEditor.courseNature?.trim() || undefined,
    schoolYear: courseEditor.schoolYear.trim(),
    semester: selectedSemester,
    teacherUserId: courseEditor.teacherUserId || undefined,
    classId: courseEditor.classId || undefined,
    creditHours: courseEditor.creditHours,
    creditValue: courseEditor.creditValue,
    civicObjective: courseEditor.civicObjective?.trim() || undefined,
    syllabusFileId: courseEditor.syllabusFileId || undefined,
    enabled: courseEditor.enabled,
  }
  courseSubmitting.value = true
  try {
    if (courseEditorMode.value === 'create') {
      const newId = await qualityCourseApi.create(request)
      message.success('课程已创建')
      qualityStore.setQualityCourse(newId)
      await qualityStore.loadQualityCourseOptions()
    } else {
      await qualityCourseApi.update(request)
      message.success('课程已更新')
    }
    courseEditorVisible.value = false
    await loadCurrentCourse()
  } finally {
    courseSubmitting.value = false
  }
}

async function deleteCourse() {
  if (!currentCourse.value || !guardCourseMatrixEditable('删除课程')) return
  const courseId = currentCourse.value.id
  const courseCode = currentCourse.value.courseCode
  void confirmAsync({
    title: `删除课程 ${courseCode}？`,
    content: '将级联删除该课程下所有课程目标、考核环节、Rubric 和支撑映射。请谨慎操作。',
    type: 'error',
    onOk: async () => {
      await qualityCourseApi.delete(courseId)
      message.success('课程已删除')
      qualityStore.setQualityCourse('')
      currentCourse.value = null
      courseGoals.value = []
      assessmentItems.value = []
      courseGoalSupports.value = new Map()
      assessmentGoalWeights.value = new Map()
      rubricsByItem.value = new Map()
      await qualityStore.loadQualityCourseOptions()
    },
  })
}

/* ========== 编辑器：课程目标 ========== */

const goalEditorVisible = ref(false)
const goalEditorMode = ref<'create' | 'edit'>('create')
const goalEditor = reactive<CourseGoalSaveRequest>({
  qualityCourseId: '',
  goalCode: '',
  goalName: '',
  description: '',
  thresholdValue: 0.7,
  directWeight: undefined,
  indirectWeight: undefined,
  aggregation: AggregationFunctionCode.WEIGHTED_SUM,
  civicObjectiveFlag: false,
  aiLiteracyFlag: false,
  sortOrder: 0,
})
const goalSubmitting = ref(false)

function openGoalCreate() {
  if (!guardCourseMatrixEditable('新建课程目标')) return
  if (!qualityStore.currentQualityCourseId) {
    message.warning('请先选择课程')
    return
  }
  goalEditorMode.value = 'create'
  Object.assign(goalEditor, {
    id: undefined,
    qualityCourseId: qualityStore.currentQualityCourseId,
    goalCode: '',
    goalName: '',
    description: '',
    thresholdValue: 0.7,
    directWeight: undefined,
    indirectWeight: undefined,
    aggregation: AggregationFunctionCode.WEIGHTED_SUM,
    civicObjectiveFlag: false,
    aiLiteracyFlag: false,
    sortOrder: (courseGoals.value.length + 1) * 10,
  })
  goalEditorVisible.value = true
}

function openGoalEdit(record: CourseGoalVO) {
  if (!guardCourseMatrixEditable('编辑课程目标')) return
  goalEditorMode.value = 'edit'
  Object.assign(goalEditor, {
    id: record.id,
    qualityCourseId: record.qualityCourseId,
    goalCode: record.goalCode,
    goalName: record.goalName,
    description: record.description || '',
    thresholdValue: record.thresholdValue,
    directWeight: record.directWeight,
    indirectWeight: record.indirectWeight,
    aggregation: record.aggregation,
    civicObjectiveFlag: record.civicObjectiveFlag,
    aiLiteracyFlag: record.aiLiteracyFlag,
    sortOrder: record.sortOrder ?? 0,
  })
  goalEditorVisible.value = true
}

async function submitGoal() {
  if (!guardCourseMatrixEditable('保存课程目标')) return
  if (!goalEditor.goalCode.trim() || !goalEditor.goalName.trim()) {
    message.error('请填写编码与名称')
    return
  }
  goalSubmitting.value = true
  try {
    if (goalEditorMode.value === 'create') await courseGoalApi.create(goalEditor)
    else await courseGoalApi.update(goalEditor)
    message.success('课程目标已保存')
    goalEditorVisible.value = false
    await Promise.all([loadCourseGoals(), loadAllSupports(), loadAllItemMeta()])
  } finally {
    goalSubmitting.value = false
  }
}

async function deleteGoal(record: CourseGoalVO) {
  if (!guardCourseMatrixEditable('删除课程目标')) return
  void confirmAsync({
    title: `删除课程目标 ${record.goalCode}？`,
    content: '将级联删除该目标的所有支撑映射、考核权重、Rubric 关联和计算规则。',
    type: 'error',
    onOk: async () => {
      await courseGoalApi.delete(record.id)
      message.success('课程目标已删除')
      await Promise.all([loadCourseGoals(), loadAllSupports(), loadAllItemMeta()])
    },
  })
}

/* ========== 编辑器：课程目标支撑映射 ========== */

const supportEditorVisible = ref(false)
const supportEditorMode = ref<'create' | 'edit'>('create')
const supportEditor = reactive<CourseGoalRequirementSaveRequest>({
  courseGoalId: '',
  requirementId: undefined,
  indicatorId: undefined,
  supportLevel: SupportLevelCode.MEDIUM,
  supportWeight: 0.8,
})
const supportEditorDisplay = reactive({
  courseGoalName: '',
  supportTargetLabel: '',
})

function openSupportCreate(rowKey: string, colKey: string) {
  if (!guardCourseMatrixEditable('维护课程支撑')) return
  supportEditorMode.value = 'create'
  const colMeta = supportCols.value.find((c) => c.key === colKey)
  if (!colMeta) return
  const courseGoal = courseGoals.value.find((g) => g.id === rowKey)
  if (!courseGoal) {
    message.error('课程目标数据异常，请刷新后重试')
    return
  }
  Object.assign(supportEditor, {
    id: undefined,
    courseGoalId: rowKey,
    requirementId: colMeta.reqId,
    indicatorId: colMeta.indicatorId,
    supportLevel: SupportLevelCode.MEDIUM,
    supportWeight: SUPPORT_LEVEL_DEFAULT_FACTOR[SupportLevelCode.MEDIUM],
  })
  Object.assign(supportEditorDisplay, {
    courseGoalName: `${courseGoal.goalCode} ${courseGoal.goalName}`,
    supportTargetLabel: colMeta.indicatorId
      ? `观测点：${colMeta.label} ${colMeta.hint}`
      : `毕业要求：${colMeta.label} ${colMeta.hint}`,
  })
  supportEditorVisible.value = true
}

function openSupportEdit(record: CourseGoalRequirementVO) {
  if (!guardCourseMatrixEditable('编辑课程支撑')) return
  supportEditorMode.value = 'edit'
  Object.assign(supportEditor, {
    id: record.id,
    courseGoalId: record.courseGoalId,
    requirementId: record.requirementId,
    indicatorId: record.indicatorId,
    supportLevel: record.supportLevel,
    supportWeight: Number(record.supportWeight) || 0,
  })
  Object.assign(supportEditorDisplay, {
    courseGoalName: `${record.courseGoalCode} ${record.courseGoalName}`,
    supportTargetLabel: record.indicatorId
      ? `观测点：${record.indicatorCode} ${record.indicatorName}`
      : `毕业要求：${record.requirementCode} ${record.requirementName}`,
  })
  supportEditorVisible.value = true
}

async function submitSupport() {
  if (!guardCourseMatrixEditable('保存课程支撑')) return
  if (!supportEditor.requirementId && !supportEditor.indicatorId) {
    message.error('必须指定毕业要求或观测点')
    return
  }
  if (
    supportEditor.supportWeight == null ||
    supportEditor.supportWeight <= 0 ||
    supportEditor.supportWeight > 1
  ) {
    message.error('权重必须在 (0, 1] 之间')
    return
  }
  if (supportEditorMode.value === 'create') await courseGoalRequirementApi.create(supportEditor)
  else await courseGoalRequirementApi.update(supportEditor)
  message.success('支撑映射已保存')
  supportEditorVisible.value = false
  await loadAllSupports()
}

function handleDeleteSupportClick() {
  const supportId = supportEditor.id
  if (supportId) {
    void confirmAsync({
      title: '删除该支撑映射？',
      type: 'error',
      onOk: async () => {
        await courseGoalRequirementApi.delete(supportId)
        message.success('已删除')
        supportEditorVisible.value = false
        await loadAllSupports()
      },
    })
  }
}

function handleSupportLevelChange(level: SupportLevelCode) {
  supportEditor.supportLevel = level
  supportEditor.supportWeight = SUPPORT_LEVEL_DEFAULT_FACTOR[level]
}

function handleSupportLevelRadioChange(event: RadioChangeEvent) {
  const selected = supportLevelOptions.find((option) => option.value === event.target?.value)
  if (selected) {
    handleSupportLevelChange(selected.value)
  }
}

function handleSupportCellClick(cellEvent: {
  row: MatrixRow
  col: MatrixCol
  cell: MatrixCell | undefined
}) {
  if (!guardCourseMatrixEditable('维护课程支撑')) return
  const colMeta = supportCols.value.find((c) => c.key === cellEvent.col.key)
  if (!colMeta) return
  const goalSupports = supportsOfGoal(cellEvent.row.key)
  const matched = goalSupports.find(
    (s) =>
      (colMeta.indicatorId && s.indicatorId === colMeta.indicatorId) ||
      (colMeta.reqId &&
        !colMeta.indicatorId &&
        s.requirementId === colMeta.reqId &&
        !s.indicatorId),
  )
  if (matched) openSupportEdit(matched)
  else openSupportCreate(cellEvent.row.key, cellEvent.col.key)
}

/* ========== 编辑器：考核环节 ========== */

const itemEditorVisible = ref(false)
const itemEditorMode = ref<'create' | 'edit'>('create')
const itemEditor = reactive<AssessmentItemSaveRequest>({
  qualityCourseId: '',
  itemCode: '',
  itemName: '',
  itemType: AssessmentItemTypeCode.HOMEWORK,
  fullScore: 100,
  passScore: 60,
  weightInCourse: undefined,
  isProcessOriented: false,
  description: '',
  sortOrder: 0,
})
const itemSubmitting = ref(false)

function openItemCreate() {
  if (!guardCourseMatrixEditable('新建考核环节')) return
  if (!qualityStore.currentQualityCourseId) {
    message.warning('请先选择课程')
    return
  }
  itemEditorMode.value = 'create'
  Object.assign(itemEditor, {
    id: undefined,
    qualityCourseId: qualityStore.currentQualityCourseId,
    itemCode: '',
    itemName: '',
    itemType: AssessmentItemTypeCode.HOMEWORK,
    fullScore: 100,
    passScore: 60,
    weightInCourse: undefined,
    isProcessOriented: false,
    description: '',
    sortOrder: (assessmentItems.value.length + 1) * 10,
  })
  itemEditorVisible.value = true
}

function openItemEdit(record: AssessmentItemVO) {
  if (!guardCourseMatrixEditable('编辑考核环节')) return
  itemEditorMode.value = 'edit'
  Object.assign(itemEditor, {
    id: record.id,
    qualityCourseId: record.qualityCourseId,
    itemCode: record.itemCode,
    itemName: record.itemName,
    itemType: record.itemType,
    fullScore: record.fullScore,
    passScore: record.passScore,
    weightInCourse: record.weightInCourse,
    isProcessOriented: record.isProcessOriented,
    description: record.description || '',
    sortOrder: record.sortOrder ?? 0,
  })
  itemEditorVisible.value = true
}

async function submitItem() {
  if (!guardCourseMatrixEditable('保存考核环节')) return
  if (!itemEditor.itemCode.trim() || !itemEditor.itemName.trim() || !itemEditor.itemType) {
    message.error('请填写编码、名称、类型')
    return
  }
  if (itemEditor.fullScore == null || itemEditor.fullScore <= 0) {
    message.error('满分必须 > 0')
    return
  }
  itemSubmitting.value = true
  try {
    const request: AssessmentItemSaveRequest = {
      id: itemEditor.id,
      qualityCourseId: itemEditor.qualityCourseId,
      itemCode: itemEditor.itemCode,
      itemName: itemEditor.itemName,
      itemType: itemEditor.itemType,
      fullScore: itemEditor.fullScore,
      passScore: itemEditor.passScore,
      weightInCourse: itemEditor.weightInCourse,
      isProcessOriented: itemEditor.isProcessOriented,
      description: itemEditor.description,
      sortOrder: itemEditor.sortOrder,
    }
    if (itemEditorMode.value === 'create') await assessmentItemApi.create(request)
    else await assessmentItemApi.update(request)
    message.success('考核环节已保存')
    itemEditorVisible.value = false
    await Promise.all([loadAssessmentItems(), loadAllItemMeta()])
  } finally {
    itemSubmitting.value = false
  }
}

async function deleteItem(record: AssessmentItemVO) {
  if (!guardCourseMatrixEditable('删除考核环节')) return
  void confirmAsync({
    title: `删除考核环节 ${record.itemCode}？`,
    content: '将级联删除该环节的所有课程目标权重和 Rubric。',
    type: 'error',
    onOk: async () => {
      await assessmentItemApi.delete(record.id)
      message.success('考核环节已删除')
      await Promise.all([loadAssessmentItems(), loadAllItemMeta()])
    },
  })
}

async function validateItemWeights(item: AssessmentItemVO) {
  await assessmentGoalWeightApi.validateWeights(item.id)
  message.success(`考核 ${item.itemCode} 的课程目标权重和校验通过`)
}

async function validateRubricFullScore(item: AssessmentItemVO) {
  await rubricItemApi.validateFullScore(item.id)
  message.success(`考核 ${item.itemCode} 的 Rubric 满分加总校验通过`)
}

/* ========== 编辑器：考核 → 目标 权重 ========== */

const weightEditorVisible = ref(false)
const weightEditorMode = ref<'create' | 'edit'>('create')
const weightEditor = reactive<AssessmentGoalWeightSaveRequest>({
  assessmentItemId: '',
  courseGoalId: '',
  weight: 0,
  fullScore: 0,
})
const weightEditorDisplay = reactive({
  assessmentItemName: '',
  courseGoalName: '',
})

function openWeightCreate(itemId: string, goalId: string) {
  if (!guardCourseMatrixEditable('维护考核权重')) return
  weightEditorMode.value = 'create'
  const item = assessmentItems.value.find((i) => i.id === itemId)
  const courseGoal = courseGoals.value.find((g) => g.id === goalId)
  if (!item) {
    message.error('考核环节数据异常，请刷新后重试')
    return
  }
  if (!courseGoal) {
    message.error('课程目标数据异常，请刷新后重试')
    return
  }
  const sumNow = itemWeightSum(itemId)
  const remain = Math.max(0, 1 - sumNow)
  Object.assign(weightEditor, {
    id: undefined,
    assessmentItemId: itemId,
    courseGoalId: goalId,
    weight: Number(remain.toFixed(3)),
    fullScore: item.fullScore,
  })
  Object.assign(weightEditorDisplay, {
    assessmentItemName: `${item.itemCode} ${item.itemName}`,
    courseGoalName: `${courseGoal.goalCode} ${courseGoal.goalName}`,
  })
  weightEditorVisible.value = true
}

function openWeightEdit(record: AssessmentGoalWeightVO) {
  if (!guardCourseMatrixEditable('编辑考核权重')) return
  weightEditorMode.value = 'edit'
  Object.assign(weightEditor, {
    id: record.id,
    assessmentItemId: record.assessmentItemId,
    courseGoalId: record.courseGoalId,
    weight: Number(record.weight) || 0,
    fullScore: Number(record.fullScore) || 0,
  })
  Object.assign(weightEditorDisplay, {
    assessmentItemName: `${record.assessmentItemCode} ${record.assessmentItemName}`,
    courseGoalName: `${record.courseGoalCode} ${record.courseGoalName}`,
  })
  weightEditorVisible.value = true
}

async function submitWeight() {
  if (!guardCourseMatrixEditable('保存考核权重')) return
  if (weightEditor.weight == null || weightEditor.weight < 0 || weightEditor.weight > 1) {
    message.error('权重必须在 [0, 1] 之间')
    return
  }
  if (weightEditor.fullScore == null || weightEditor.fullScore <= 0) {
    message.error('满分必须 > 0')
    return
  }
  if (weightEditorMode.value === 'create') await assessmentGoalWeightApi.create(weightEditor)
  else await assessmentGoalWeightApi.update(weightEditor)
  message.success('权重已保存')
  weightEditorVisible.value = false
  await loadAllItemMeta()
}

async function deleteWeight(record: AssessmentGoalWeightVO) {
  if (!guardCourseMatrixEditable('删除考核权重')) return
  void confirmAsync({
    title: '删除该考核-目标权重？',
    type: 'error',
    onOk: async () => {
      await assessmentGoalWeightApi.delete(record.id)
      message.success('已删除')
      await loadAllItemMeta()
    },
  })
}

function handleDeleteWeightClick() {
  if (weightEditor.id) {
    const w = weightsOfItem(weightEditor.assessmentItemId).find((w) => w.id === weightEditor.id)
    if (w) deleteWeight(w)
  }
}

function handleAssessCellClick(cellEvent: {
  row: MatrixRow
  col: MatrixCol
  cell: MatrixCell | undefined
}) {
  if (!guardCourseMatrixEditable('维护考核权重')) return
  const matched = weightsOfItem(cellEvent.row.key).find((w) => w.courseGoalId === cellEvent.col.key)
  if (matched) openWeightEdit(matched)
  else openWeightCreate(cellEvent.row.key, cellEvent.col.key)
}

/* ========== 编辑器：Rubric ========== */

const rubricDrawerVisible = ref(false)
const rubricItem = ref<AssessmentItemVO | null>(null)
const rubricEditor = reactive<RubricItemSaveRequest>({
  assessmentItemId: '',
  courseGoalId: '',
  rubricCode: '',
  rubricName: '',
  description: '',
  fullScore: 0,
  sortOrder: 0,
})
const rubricEditorVisible = ref(false)
const rubricEditorMode = ref<'create' | 'edit'>('create')

function openRubricList(item: AssessmentItemVO) {
  rubricItem.value = item
  rubricDrawerVisible.value = true
}

function openRubricCreate() {
  if (!guardCourseMatrixEditable('新增 Rubric')) return
  if (!rubricItem.value) return
  rubricEditorMode.value = 'create'
  Object.assign(rubricEditor, {
    id: undefined,
    assessmentItemId: rubricItem.value.id,
    courseGoalId: '',
    rubricCode: '',
    rubricName: '',
    description: '',
    fullScore: 0,
    sortOrder: (rubricsOfItem(rubricItem.value.id).length + 1) * 10,
  })
  rubricEditorVisible.value = true
}

function openRubricEdit(record: RubricItemVO) {
  if (!guardCourseMatrixEditable('编辑 Rubric')) return
  rubricEditorMode.value = 'edit'
  Object.assign(rubricEditor, {
    id: record.id,
    assessmentItemId: record.assessmentItemId,
    courseGoalId: record.courseGoalId,
    rubricCode: record.rubricCode,
    rubricName: record.rubricName,
    description: record.description || '',
    fullScore: Number(record.fullScore) || 0,
    sortOrder: record.sortOrder ?? 0,
  })
  rubricEditorVisible.value = true
}

async function submitRubric() {
  if (!guardCourseMatrixEditable('保存 Rubric')) return
  if (
    !rubricEditor.rubricName.trim() ||
    rubricEditor.fullScore == null ||
    rubricEditor.fullScore <= 0
  ) {
    message.error('请填写名称与满分')
    return
  }
  const request: RubricItemSaveRequest = {
    id: rubricEditor.id,
    assessmentItemId: rubricEditor.assessmentItemId,
    courseGoalId: rubricEditor.courseGoalId || undefined,
    rubricCode: rubricEditor.rubricCode,
    rubricName: rubricEditor.rubricName,
    description: rubricEditor.description,
    fullScore: rubricEditor.fullScore,
    sortOrder: rubricEditor.sortOrder,
  }
  if (rubricEditorMode.value === 'create') await rubricItemApi.create(request)
  else await rubricItemApi.update(request)
  message.success('Rubric 已保存')
  rubricEditorVisible.value = false
  await loadAllItemMeta()
}

async function deleteRubric(record: RubricItemVO) {
  if (!guardCourseMatrixEditable('删除 Rubric')) return
  void confirmAsync({
    title: `删除 Rubric「${record.rubricName}」？`,
    type: 'error',
    onOk: async () => {
      await rubricItemApi.delete(record.id)
      message.success('已删除')
      await loadAllItemMeta()
    },
  })
}

function buildAssessmentItemActions(_record: AssessmentItemVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'rubric', label: 'Rubric' },
    { key: 'validate-weights', label: '校验权重' },
    { key: 'validate-rubric', label: '校验 Rubric' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleAssessmentItemAction(key: string, record: AssessmentItemVO): void {
  switch (key) {
    case 'edit':
      openItemEdit(record)
      break
    case 'rubric':
      openRubricList(record)
      break
    case 'validate-weights':
      validateItemWeights(record)
      break
    case 'validate-rubric':
      validateRubricFullScore(record)
      break
    case 'delete':
      void deleteItem(record)
      break
  }
}

function buildCourseGoalActions(_record: CourseGoalVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'rule', label: '计算规则' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleCourseGoalAction(key: string, record: CourseGoalVO): void {
  switch (key) {
    case 'edit':
      openGoalEdit(record)
      break
    case 'rule':
      openRuleEditor(record)
      break
    case 'delete':
      void deleteGoal(record)
      break
  }
}

function buildRubricActions(_record: RubricItemVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleRubricAction(key: string, record: RubricItemVO): void {
  switch (key) {
    case 'edit':
      openRubricEdit(record)
      break
    case 'delete':
      void deleteRubric(record)
      break
  }
}

/* ========== 编辑器：课程目标计算规则 ========== */

const ruleEditorVisible = ref(false)
const ruleEditorMode = ref<'create' | 'edit'>('create')
const ruleGoal = ref<CourseGoalVO | null>(null)
const ruleEditor = reactive<CourseGoalAssessmentRuleSaveRequest>({
  courseGoalId: '',
  aggregation: AggregationFunctionCode.WEIGHTED_SUM,
  directWeight: undefined,
  indirectWeight: undefined,
  thresholdValue: 0.7,
  minimumValidSample: undefined,
  indirectMinValidSample: undefined,
  indirectCoverageThreshold: undefined,
  notes: '',
})

async function openRuleEditor(goal: CourseGoalVO) {
  if (!guardCourseMatrixEditable('维护计算规则')) return
  ruleGoal.value = goal
  const existing = await courseGoalAssessmentRuleApi.findByCourseGoal(goal.id)
  if (existing) {
    ruleEditorMode.value = 'edit'
    Object.assign(ruleEditor, {
      id: existing.id,
      courseGoalId: goal.id,
      aggregation: existing.aggregation,
      directWeight: existing.directWeight,
      indirectWeight: existing.indirectWeight,
      thresholdValue: existing.thresholdValue,
      minimumValidSample: existing.minimumValidSample,
      indirectMinValidSample: existing.indirectMinValidSample,
      indirectCoverageThreshold: existing.indirectCoverageThreshold,
      notes: existing.notes || '',
    })
  } else {
    ruleEditorMode.value = 'create'
    Object.assign(ruleEditor, {
      id: undefined,
      courseGoalId: goal.id,
      aggregation: goal.aggregation,
      directWeight: goal.directWeight,
      indirectWeight: goal.indirectWeight,
      thresholdValue: goal.thresholdValue ?? 0.7,
      minimumValidSample: undefined,
      indirectMinValidSample: undefined,
      indirectCoverageThreshold: undefined,
      notes: '',
    })
  }
  ruleEditorVisible.value = true
}

async function submitRule() {
  if (!guardCourseMatrixEditable('保存计算规则')) return
  if (ruleEditor.thresholdValue == null) {
    message.error('请填写阈值')
    return
  }
  if (ruleEditorMode.value === 'create') await courseGoalAssessmentRuleApi.create(ruleEditor)
  else await courseGoalAssessmentRuleApi.update(ruleEditor)
  message.success('计算规则已保存')
  ruleEditorVisible.value = false
}

/* ========== 上下文与 Tab 切换 ========== */

const activeTab = ref<'support' | 'assess' | 'goals'>('support')

async function handleScopeChange(): Promise<void> {
  if (!qualityStore.currentQualityCourseId && qualityStore.currentTrainingPlanId) {
    await qualityStore.loadQualityCourseOptions()
    if (qualityStore.qualityCourseOptions.length) {
      qualityStore.setQualityCourse(qualityStore.qualityCourseOptions[0].id)
      return
    }
  }
  await loadCurrentCourse()
  await Promise.all([loadCourseGoals(), loadAssessmentItems()])
  await Promise.all([loadAllSupports(), loadAllItemMeta(), loadReferenceData()])
}

useQualityScopedLoader(handleScopeChange, { watchScope: true, immediate: true })

function handleCourseChange(courseId: string | null) {
  qualityStore.setQualityCourse(courseId || '')
}

onMounted(async () => {
  if (!qualityStore.currentQualityCourseId && qualityStore.currentTrainingPlanId) {
    await qualityStore.loadQualityCourseOptions()
    if (qualityStore.qualityCourseOptions.length) {
      qualityStore.setQualityCourse(qualityStore.qualityCourseOptions[0].id)
    }
  }
})

/* ========== 字典 ========== */

const supportLevelOptions: { value: SupportLevelCode; label: string }[] =
  ALL_SUPPORT_LEVEL_CODES.map((value) => ({
    value,
    label: strictEnumLabel(SupportLevelDescription, value, '支撑度'),
  }))

const aggregationOptions: { value: AggregationFunctionCode; label: string }[] =
  ALL_AGGREGATION_FUNCTION_CODES.map((value) => ({
    value,
    label: AggregationFunctionDescription[value],
  }))

const itemTypeOptions: { value: AssessmentItemTypeCode; label: string }[] =
  ALL_ASSESSMENT_ITEM_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(AssessmentItemTypeDescription, value, '考核项类型'),
  }))
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar>
        <template #status>
          <span class="qcm__context-label">质量评价课程</span>
          <CourseSelector
            :value="qualityStore.currentQualityCourseId || null"
            :training-plan-id="qualityStore.currentTrainingPlanId || null"
            :program-id="qualityStore.currentProgramId || null"
            :only-enabled="false"
            :width="320"
            @change="handleCourseChange"
          />
          <UiTag v-if="currentCourse?.schoolYear" tone="blue">
            {{ currentCourse.schoolYear
            }}<span v-if="currentCourse.semester">
              · {{ formatSemester(currentCourse.semester) }}</span
            >
          </UiTag>
          <UiTag v-if="currentCourse?.creditValue != null" tone="gray">
            {{ currentCourse.creditValue }} 学分
          </UiTag>
          <UiTag v-if="currentCourse?.creditHours != null" tone="gray">
            {{ currentCourse.creditHours }} 学时
          </UiTag>
        </template>
        <template #actions>
          <UiTextAction @click="openCourseCreate">新建课程</UiTextAction>
          <UiButton variant="outline" size="sm" :disabled="!currentCourse" @click="openCourseEdit">
            编辑课程
          </UiButton>
          <UiTextAction tone="danger" @click="deleteCourse">删除课程</UiTextAction>
        </template>
      </QualityPageContextBar>
    </template>

    <UiEmpty
      v-if="!qualityStore.currentQualityCourseId"
      description="请选择课程"
      class="qcm__empty"
    />

    <template v-else>
      <SignalBand :metrics="signals" compact class="qcm__signals" />

      <div class="qcm__tabs">
        <UiButton
          :variant="activeTab === 'support' ? 'primary' : 'ghost'"
          size="sm"
          @click="activeTab = 'support'"
        >
          ① 课程目标 → 毕业要求/观测点 支撑矩阵
        </UiButton>
        <UiButton
          :variant="activeTab === 'assess' ? 'primary' : 'ghost'"
          size="sm"
          @click="activeTab = 'assess'"
        >
          ② 考核环节 → 课程目标 权重矩阵
        </UiButton>
        <UiButton
          :variant="activeTab === 'goals' ? 'primary' : 'ghost'"
          size="sm"
          @click="activeTab = 'goals'"
        >
          ③ 课程目标列表 / 计算规则
        </UiButton>
      </div>

      <!-- Tab 1: 课程目标 × 毕业要求/观测点 -->
      <div v-if="activeTab === 'support'" class="qcm__tab-content">
        <div class="qcm__matrix-toolbar">
          <UiButton variant="primary" size="sm" @click="openGoalCreate"> 新建课程目标 </UiButton>
          <span class="qcm__hint">
            点击单元格新增/修改支撑映射；空格 = 未支撑；颜色 = 支撑度（强 H 红 / 中 M 橙 / 弱 L 蓝）
          </span>
        </div>
        <MatrixWorkbench
          title="课程目标 × 毕业要求 / 观测点 支撑矩阵"
          subtitle="单元格 = 支撑度首字母 + 权重；列为「要求」级与「观测点」级两类"
          row-header-label="课程目标"
          col-header-label="毕业要求 / 观测点"
          :rows="supportMatrixRows"
          :cols="supportMatrixCols"
          :cells="supportMatrixCells"
          :loading="courseGoalsLoading || supportsLoading || referenceLoading"
          empty-text="尚未创建课程目标或未挂接毕业要求"
          :default-col-width="110"
          @cell-click="handleSupportCellClick"
        />
      </div>

      <!-- Tab 2: 考核环节 × 课程目标 -->
      <div v-else-if="activeTab === 'assess'" class="qcm__tab-content">
        <div class="qcm__matrix-toolbar">
          <UiButton variant="primary" size="sm" @click="openItemCreate"> 新建考核环节 </UiButton>
          <span class="qcm__hint"> 点击单元格新增/修改权重；同一考核环节权重和必须 = 1 </span>
        </div>
        <MatrixWorkbench
          title="考核环节 × 课程目标 权重矩阵"
          subtitle="单元格 = 权重 + 满分；行徽标 = 权重之和（必须 = 1）"
          row-header-label="考核环节"
          col-header-label="课程目标"
          :rows="assessMatrixRows"
          :cols="assessMatrixCols"
          :cells="assessMatrixCells"
          :loading="assessmentItemsLoading || itemMetaLoading || courseGoalsLoading"
          empty-text="尚未创建考核环节或课程目标"
          :default-col-width="130"
          @cell-click="handleAssessCellClick"
        />

        <UiCard class="qcm__card">
          <template #title>
            <span>考核环节列表</span>
          </template>
          <UiDataTable
            pagination-mode="none"
            class="student-detail-table__data-table"
            :columns="itemColumns"
            :data-source="assessmentItems"
            :loading="assessmentItemsLoading"
            row-key="id"
            size="middle"
            :show-pagination="false"
            flat
            :total="assessmentItems.length"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'itemType'">
                {{ assessmentItemTypeLabel(record.itemType) }}
              </template>
              <template v-else-if="column.key === 'fullScore'">
                {{ record.fullScore.toFixed(0) }}
              </template>
              <template v-else-if="column.key === 'isProcessOriented'">
                <UiTag v-if="record.isProcessOriented" tone="purple"> 过程 </UiTag>
                <span v-else class="qcm__muted">-</span>
              </template>
              <template v-else-if="column.key === 'weightSum'">
                <UiTag
                  :tone="Math.abs(itemWeightSum(record.id) - 1) < WEIGHT_EPSILON ? 'green' : 'red'"
                >
                  Σ={{ itemWeightSum(record.id).toFixed(3) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'rubricCount'">
                {{ rubricsOfItem(record.id).length }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildAssessmentItemActions(record)"
                  split
                  @action="(key) => handleAssessmentItemAction(key, record)"
                />
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </div>

      <!-- Tab 3: 课程目标列表 -->
      <div v-else class="qcm__tab-content">
        <UiCard class="qcm__card">
          <template #title>
            <span>课程目标列表</span>
          </template>
          <template #extra>
            <UiButton variant="primary" size="sm" @click="openGoalCreate"> 新建课程目标 </UiButton>
          </template>
          <UiDataTable
            pagination-mode="none"
            class="student-detail-table__data-table"
            :columns="goalColumns"
            :data-source="courseGoals"
            :loading="courseGoalsLoading"
            row-key="id"
            size="middle"
            :show-pagination="false"
            flat
            :total="courseGoals.length"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'thresholdValue'">
                {{ record.thresholdValue == null ? '-' : record.thresholdValue.toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'aggregation'">
                {{ aggregationFunctionLabel(record.aggregation) }}
              </template>
              <template v-else-if="column.key === 'supportCount'">
                {{ supportsOfGoal(record.id).length }}
              </template>
              <template v-else-if="column.key === 'flags'">
                <a-space size="small" wrap>
                  <UiTag v-if="record.civicObjectiveFlag" tone="purple"> 思政 </UiTag>
                  <UiTag v-if="record.aiLiteracyFlag" tone="blue"> AI 素养 </UiTag>
                  <UiTag v-if="record.complexEngineeringFlag" tone="orange"> 复杂工程 </UiTag>
                  <span
                    v-if="
                      !record.civicObjectiveFlag &&
                      !record.aiLiteracyFlag &&
                      !record.complexEngineeringFlag
                    "
                    class="qcm__muted"
                    >-</span
                  >
                </a-space>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :items="buildCourseGoalActions(record)"
                  split
                  @action="(key) => handleCourseGoalAction(key, record)"
                />
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </div>
    </template>

    <!-- 课程编辑 Drawer -->
    <UiDrawer
      v-model:open="courseEditorVisible"
      :title="courseEditorMode === 'create' ? '新建质量评价课程' : '编辑质量评价课程'"
      :width="720"
      :confirm-loading="courseSubmitting"
      ok-text="保存"
      @ok="submitCourse"
    >
      <a-form layout="vertical" :model="courseEditor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="所属专业大类" required>
              <ProgramSelector
                :value="courseEditor.programId || null"
                placeholder="请选择 edu-user 专业大类"
                @change="handleProgramChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="培养方案" required>
              <TrainingPlanSelector
                :value="courseEditor.trainingPlanId || null"
                :program-id="courseEditor.programId || null"
                :disabled="!courseEditor.programId"
                :only-confirmed="false"
                :only-enabled="true"
                placeholder="选定专业后可选培养方案"
                @change="handleTrainingPlanChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="目录课程" required>
              <CatalogCourseSelector
                :value="courseEditor.courseId || null"
                :major-category-id="courseEditor.programId || null"
                :disabled="!courseEditor.programId"
                placeholder="选择 edu-user 已授权课程"
                @change="handleCatalogCourseChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="courseEditor.courseCode" placeholder="目录课程已自动填入" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="名称" required>
              <a-input v-model:value="courseEditor.courseName" placeholder="目录课程已自动填入" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="课程类别">
              <a-input
                v-model:value="courseEditor.courseCategory"
                placeholder="如 通识 / 专业核心"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="课程性质">
              <a-input v-model:value="courseEditor.courseNature" placeholder="如 必修 / 选修" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="学年">
              <a-input v-model:value="courseEditor.schoolYear" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="学期" required>
              <a-select
                v-model:value="courseEditor.semester"
                :options="SemesterOptions"
                placeholder="选择学期"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="学时">
              <a-input-number
                v-model:value="courseEditor.creditHours"
                :min="0"
                :step="1"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="学分">
              <a-input-number
                v-model:value="courseEditor.creditValue"
                :min="0"
                :step="0.5"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="授课教师">
              <TeacherSelector
                :value="courseEditor.teacherUserId || null"
                placeholder="请选择教师"
                @change="handleTeacherChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="授课班级">
              <ClassSelector
                :value="courseEditor.classId || null"
                placeholder="请选择班级"
                @change="handleClassChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="思政目标">
          <a-textarea v-model:value="courseEditor.civicObjective" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="教学大纲附件">
              <UiPlatformFileField
                v-model:file-node-id="courseEditor.syllabusFileId"
                v-model:file-name="syllabusFileName"
                :scene-key="FileUploadSceneKey.QUALITY_COURSE_SYLLABUS"
                button-text="上传教学大纲附件"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="是否启用">
              <a-switch v-model:checked="courseEditor.enabled" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </UiDrawer>

    <!-- 课程目标编辑 Modal -->
    <a-modal
      v-model:open="goalEditorVisible"
      :title="goalEditorMode === 'create' ? '新建课程目标' : '编辑课程目标'"
      :confirm-loading="goalSubmitting"
      width="640px"
      @ok="submitGoal"
    >
      <a-form layout="vertical" :model="goalEditor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="goalEditor.goalCode" placeholder="如 G1" />
            </a-form-item>
          </a-col>
          <a-col :span="18">
            <a-form-item label="名称" required>
              <a-input v-model:value="goalEditor.goalName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="描述">
          <a-textarea v-model:value="goalEditor.description" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="阈值">
              <a-input-number
                v-model:value="goalEditor.thresholdValue"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="聚合">
              <a-select v-model:value="goalEditor.aggregation" :options="aggregationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="直接评价权重">
              <a-input-number
                v-model:value="goalEditor.directWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="间接评价权重">
              <a-input-number
                v-model:value="goalEditor.indirectWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="思政目标">
              <a-switch v-model:checked="goalEditor.civicObjectiveFlag" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="AI 素养">
              <a-switch v-model:checked="goalEditor.aiLiteracyFlag" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="排序">
          <a-input-number v-model:value="goalEditor.sortOrder" :min="0" style="width: 200px" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 支撑映射编辑 Modal -->
    <a-modal
      v-model:open="supportEditorVisible"
      :title="supportEditorMode === 'create' ? '新增课程目标支撑' : '编辑课程目标支撑'"
      width="540px"
      @ok="submitSupport"
    >
      <a-form layout="vertical" :model="supportEditor">
        <a-form-item label="课程目标">
          <a-input :value="supportEditorDisplay.courseGoalName" disabled />
        </a-form-item>
        <a-form-item label="支撑对象">
          <a-input :value="supportEditorDisplay.supportTargetLabel" disabled />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="支撑度" required>
              <a-radio-group
                :value="supportEditor.supportLevel"
                @change="handleSupportLevelRadioChange"
              >
                <a-radio-button
                  v-for="opt in supportLevelOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </a-radio-button>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="权重 (0~1]" required>
              <a-input-number
                v-model:value="supportEditor.supportWeight"
                :min="0"
                :max="1"
                :step="0.05"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <template #footer>
        <a-space>
          <a-button v-if="supportEditorMode === 'edit'" danger @click="handleDeleteSupportClick">
            删除映射
          </a-button>
          <a-button @click="supportEditorVisible = false"> 取消 </a-button>
          <a-button type="primary" @click="submitSupport"> 保存 </a-button>
        </a-space>
      </template>
    </a-modal>

    <!-- 考核环节编辑 Modal -->
    <a-modal
      v-model:open="itemEditorVisible"
      :title="itemEditorMode === 'create' ? '新建考核环节' : '编辑考核环节'"
      :confirm-loading="itemSubmitting"
      width="640px"
      @ok="submitItem"
    >
      <a-form layout="vertical" :model="itemEditor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="itemEditor.itemCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="名称" required>
              <a-input v-model:value="itemEditor.itemName" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="排序">
              <a-input-number v-model:value="itemEditor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="类型" required>
              <a-select v-model:value="itemEditor.itemType" :options="itemTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="满分" required>
              <a-input-number v-model:value="itemEditor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="及格分">
              <a-input-number v-model:value="itemEditor.passScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="过程性">
              <a-switch v-model:checked="itemEditor.isProcessOriented" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="课程内权重">
          <a-input-number
            v-model:value="itemEditor.weightInCourse"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 200px"
            placeholder="可选 - 该考核在课程总评中的权重"
          />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="itemEditor.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 考核-目标 权重编辑 Modal -->
    <a-modal
      v-model:open="weightEditorVisible"
      :title="weightEditorMode === 'create' ? '新增「考核 → 目标」权重' : '编辑「考核 → 目标」权重'"
      width="500px"
      @ok="submitWeight"
    >
      <a-form layout="vertical" :model="weightEditor">
        <a-form-item label="考核环节">
          <a-input :value="weightEditorDisplay.assessmentItemName" disabled />
        </a-form-item>
        <a-form-item label="课程目标">
          <a-input :value="weightEditorDisplay.courseGoalName" disabled />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="权重 [0, 1]" required>
              <a-input-number
                v-model:value="weightEditor.weight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="对应满分" required>
              <a-input-number v-model:value="weightEditor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <template #footer>
        <a-space>
          <a-button v-if="weightEditorMode === 'edit'" danger @click="handleDeleteWeightClick">
            删除
          </a-button>
          <a-button @click="weightEditorVisible = false"> 取消 </a-button>
          <a-button type="primary" @click="submitWeight"> 保存 </a-button>
        </a-space>
      </template>
    </a-modal>

    <!-- Rubric Drawer -->
    <UiDrawer
      v-model:open="rubricDrawerVisible"
      :title="`Rubric 评分量规：${rubricItem?.itemName || ''}`"
      :width="720"
      :show-footer="false"
    >
      <div class="qcm__rubric-toolbar">
        <UiButton variant="primary" size="sm" @click="openRubricCreate"> 新增 Rubric </UiButton>
        <span class="qcm__hint">
          每条 Rubric 关联到一个课程目标；该考核环节下所有 Rubric 满分加总应等于 (item, goal) 的
          fullScore
        </span>
      </div>
      <UiDataTable
        pagination-mode="none"
        class="student-detail-table__data-table"
        :columns="rubricColumns"
        :data-source="rubricItem ? rubricsOfItem(rubricItem.id) : []"
        row-key="id"
        size="middle"
        :show-pagination="false"
        flat
        :total="rubricItem ? rubricsOfItem(rubricItem.id).length : 0"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'rubricCode'">
            {{ record.rubricCode }}
          </template>
          <template v-else-if="column.key === 'goalCode'">
            {{ record.courseGoalCode }}
          </template>
          <template v-else-if="column.key === 'fullScore'">
            {{ record.fullScore.toFixed(0) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildRubricActions(record)"
              split
              @action="(key) => handleRubricAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiDrawer>

    <!-- Rubric 编辑 Modal -->
    <a-modal
      v-model:open="rubricEditorVisible"
      :title="rubricEditorMode === 'create' ? '新增 Rubric' : '编辑 Rubric'"
      width="600px"
      @ok="submitRubric"
    >
      <a-form layout="vertical" :model="rubricEditor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码">
              <a-input v-model:value="rubricEditor.rubricCode" />
            </a-form-item>
          </a-col>
          <a-col :span="18">
            <a-form-item label="维度名称" required>
              <a-input
                v-model:value="rubricEditor.rubricName"
                placeholder="如 解题思路 / 创新性 / 工程实现"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="关联课程目标">
              <a-select
                v-model:value="rubricEditor.courseGoalId"
                placeholder="可选 - 关联到某课程目标"
                allow-clear
              >
                <a-select-option v-for="g in courseGoals" :key="g.id" :value="g.id">
                  <span class="dp-selector-option-code">{{ g.goalCode }}</span>
                  {{ g.goalName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="满分" required>
              <a-input-number v-model:value="rubricEditor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="排序">
              <a-input-number v-model:value="rubricEditor.sortOrder" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="说明">
          <a-textarea v-model:value="rubricEditor.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 计算规则编辑 Modal -->
    <a-modal
      v-model:open="ruleEditorVisible"
      :title="`课程目标计算规则：${ruleGoal?.goalName || ''}`"
      width="640px"
      @ok="submitRule"
    >
      <a-form layout="vertical" :model="ruleEditor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="聚合策略" required>
              <a-select v-model:value="ruleEditor.aggregation" :options="aggregationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="阈值" required>
              <a-input-number
                v-model:value="ruleEditor.thresholdValue"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="直接评价权重">
              <a-input-number
                v-model:value="ruleEditor.directWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="间接评价权重">
              <a-input-number
                v-model:value="ruleEditor.indirectWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="最小有效样本">
              <a-input-number
                v-model:value="ruleEditor.minimumValidSample"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="间接最小样本">
              <a-input-number
                v-model:value="ruleEditor.indirectMinValidSample"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="间接覆盖阈值">
              <a-input-number
                v-model:value="ruleEditor.indirectCoverageThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-textarea v-model:value="ruleEditor.notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.qcm {
  &__context-label {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__empty {
    margin-top: 32px;
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__tab-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__matrix-toolbar,
  &__rubric-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }

  &__hint {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__card {
    background: var(--dp-surface);
    border-radius: 8px;
  }

  &__muted {
    color: var(--dp-text-muted);
  }

  &__file-name {
    margin-top: 8px;
    font-size: 12px;
    color: var(--dp-text-secondary);
  }
}

.text-xs {
  font-size: 12px;
}

.text-gray-500 {
  color: rgba(0, 0, 0, 0.45);
}

.mr-1 {
  margin-right: 4px;
}
</style>
