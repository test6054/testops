<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AssessmentGoalWeightSaveRequest,
  AssessmentGoalWeightVO,
} from '@/apis/quality/assessment-goal-weight'
import type { AssessmentItemSaveRequest, AssessmentItemVO } from '@/apis/quality/assessment-item'
import type { CourseGoalSaveRequest, CourseGoalVO } from '@/apis/quality/course-goal'
import type { CourseGoalAssessmentRuleSaveRequest } from '@/apis/quality/course-goal-assessment-rule'
import type {
  CourseGoalRequirementSaveRequest,
  CourseGoalRequirementVO,
} from '@/apis/quality/course-goal-requirement'
import type { GraduationRequirementVO } from '@/apis/quality/graduation-requirement'
import type {
  QualityCourseEditorForm,
  QualityCourseSaveRequest,
  QualityCourseVO,
} from '@/apis/quality/quality-course'
import type { RequirementIndicatorVO } from '@/apis/quality/requirement-indicator'
import type { RubricItemSaveRequest, RubricItemVO } from '@/apis/quality/rubric-item'
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
 *               同一考核环节对各课程目标 weight 之和必须 = 1；
 *               同一课程目标对各考核环节 weight 之和必须 = 1；
 *               矩阵校验要求全部考核行与全部目标列非空且配平
 *             → Rubric 评分量规：每个 (考核, 课程目标) 拆分到具体维度的等级化打分
 *               rubric 满分之和必须 = 该 (item, goal) 的 fullScore（validate-full-score 强校验）
 *
 * 关键约束：
 *   - 课程目标 → 毕业要求/观测点 supportWeight：取值 0~1，无强校验和=1（仅业务侧约束）
 *   - 考核 → 课程目标 weight：同一考核内权重和必须 = 1
 *   - Rubric 满分加总 = (item, goal) 的 fullScore
 */
import type { CourseListVO } from '@/apis/quality/user-catalog'
import type { QualityCourseMatrixSignalSummaryVO } from '@/apis/quality/workbench'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { MatrixCell, MatrixCol, MatrixRow } from '@/components/workbench/matrix-types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { assessmentGoalWeightApi } from '@/apis/quality/assessment-goal-weight'
import { assessmentItemApi } from '@/apis/quality/assessment-item'
import { courseGoalApi } from '@/apis/quality/course-goal'
import { courseGoalAssessmentRuleApi } from '@/apis/quality/course-goal-assessment-rule'
import { courseGoalRequirementApi } from '@/apis/quality/course-goal-requirement'
import { graduationRequirementApi } from '@/apis/quality/graduation-requirement'
import { qualityCourseApi } from '@/apis/quality/quality-course'
import { requirementIndicatorApi } from '@/apis/quality/requirement-indicator'
import { rubricItemApi } from '@/apis/quality/rubric-item'
import {
  AggregationFunctionCode,
  AggregationFunctionDescription,
  ALL_AGGREGATION_FUNCTION_CODES,
  ALL_ASSESSMENT_ITEM_TYPE_CODES,
  ALL_SUPPORT_LEVEL_CODES,
  AssessmentItemTypeCode,
  AssessmentItemTypeDescription,
  ConfirmationStatusCode,
  SUPPORT_LEVEL_DEFAULT_FACTOR,
  SupportLevelCode,
  SupportLevelDescription,
} from '@/apis/quality/types'
import { workbenchApi } from '@/apis/quality/workbench'
import TeacherSelector from '@/components/platform/TeacherSelector.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import ClassSelector from '@/components/quality/selectors/ClassSelector.vue'
import CourseSelector from '@/components/quality/selectors/CourseSelector.vue'
import { loadBoundedPlanAggregate } from '@/components/quality/selectors/page-contract'
import ProgramSelector from '@/components/quality/selectors/ProgramSelector.vue'
import TrainingPlanSelector from '@/components/quality/selectors/TrainingPlanSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import MatrixWorkbench from '@/components/workbench/MatrixWorkbench.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useQualityStore } from '@/stores/modules/quality'
import { ALL_SEMESTER_CODES, formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { isWeightSumHealthy } from '@/utils/weight-sum-health'

const itemColumns: ColumnsType = [
  { title: '编码', dataIndex: 'itemCode', key: 'itemCode', width: 100, fixed: 'left' },
  { title: '名称', dataIndex: 'itemName', key: 'itemName' },
  { title: '类型', key: 'itemType', width: 120 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '过程性', dataIndex: 'isProcessOriented', key: 'isProcessOriented', width: 80 },
  { title: 'Rubric 数', key: 'rubricCount', width: 100 },
  { title: '操作', key: 'actions', width: 280 },
]

const goalColumns: ColumnsType = [
  { title: '编码', dataIndex: 'goalCode', key: 'goalCode', width: 80, fixed: 'left' },
  { title: '名称', dataIndex: 'goalName', key: 'goalName' },
  { title: '阈值', dataIndex: 'thresholdValue', key: 'thresholdValue', width: 80 },
  { title: '聚合', dataIndex: 'aggregation', key: 'aggregation', width: 120 },
  { title: '标记', key: 'flags', width: 180 },
  { title: '操作', key: 'actions', width: 180 },
]

const rubricColumns: ColumnsType = [
  { title: '编码', dataIndex: 'rubricCode', key: 'rubricCode', width: 80, fixed: 'left' },
  { title: '维度', dataIndex: 'rubricName', key: 'rubricName' },
  { title: '课程目标', key: 'goalCode', width: 120 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '操作', key: 'actions', width: 120 },
]

const qualityStore = useQualityStore()

const isPlanStructureEditable = computed(
  () => qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED,
)

function guardCourseMatrixEditable(action: string): boolean {
  if (isPlanStructureEditable.value) return true
  void message.error(`培养方案已确认，请先撤回后再${action}`)
  return false
}

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
  } catch (error) {
    if (!scope.isStale()) {
      currentCourse.value = null
      showUserError(error, '质量课程详情加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      courseLoading.value = false
    }
  }
}

/* ========== 课程目标 ========== */

const courseGoals = ref<CourseGoalVO[]>([])
const courseGoalsLoading = ref(false)
const goalTableRows = ref<CourseGoalVO[]>([])
const goalPageNum = ref(1)
const goalPageSize = ref(10)
const goalTableTotal = ref(0)
const goalTableLoading = ref(false)
const {
  loadError: courseGoalsAggLoadError,
  beginLoad: beginCourseGoalsAggLoad,
  failLoad: failCourseGoalsAggLoad,
  okLoad: okCourseGoalsAggLoad,
} = useUiTableLoadError()
const {
  loadError: goalTableLoadError,
  beginLoad: beginGoalTableLoad,
  failLoad: failGoalTableLoad,
  okLoad: okGoalTableLoad,
} = useUiTableLoadError()

async function loadCourseGoalsAggregate() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentQualityCourseId) {
    courseGoals.value = []
    courseGoalsAggLoadError.value = false
    return
  }
  courseGoalsLoading.value = true
  beginCourseGoalsAggLoad()
  try {
    const goals = await loadBoundedPlanAggregate(
      (pageNum, pageSize) =>
        courseGoalApi.page({
          pageNum,
          pageSize,
          qualityCourseId: qualityStore.currentQualityCourseId!,
        }),
      '课程目标',
    )
    if (scope.isStale()) {
      return
    }
    courseGoals.value = goals
    okCourseGoalsAggLoad()
  } catch (e) {
    if (!scope.isStale()) {
      showUserError(e, '课程目标加载失败')
      courseGoals.value = []
      failCourseGoalsAggLoad()
    }
  } finally {
    if (!scope.isStale()) {
      courseGoalsLoading.value = false
    }
  }
}

async function loadGoalTable() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentQualityCourseId) {
    goalTableRows.value = []
    goalTableTotal.value = 0
    goalTableLoadError.value = false
    return
  }
  goalTableLoading.value = true
  beginGoalTableLoad()
  try {
    const page = await courseGoalApi.page({
      pageNum: goalPageNum.value,
      pageSize: goalPageSize.value,
      qualityCourseId: qualityStore.currentQualityCourseId!,
    })
    if (scope.isStale()) {
      return
    }
    goalTableRows.value = page.list
    goalTableTotal.value = page.total
    okGoalTableLoad()
  } catch (error) {
    if (!scope.isStale()) {
      goalTableRows.value = []
      goalTableTotal.value = 0
      failGoalTableLoad()
      showUserError(error, '课程目标列表加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      goalTableLoading.value = false
    }
  }
}

function handleGoalPageChange(page: { current: number, pageSize: number }) {
  goalPageNum.value = page.current
  goalPageSize.value = page.pageSize
  void loadGoalTable()
}

async function loadCourseGoals() {
  await Promise.all([loadCourseGoalsAggregate(), loadGoalTable()])
}

/* ========== 课程目标 → 毕业要求/观测点 支撑映射 ========== */

const courseGoalSupports = ref<Map<string, CourseGoalRequirementVO[]>>(new Map())
const supportsLoading = ref(false)
const {
  loadError: supportsLoadError,
  beginLoad: beginSupportsLoad,
  failLoad: failSupportsLoad,
  okLoad: okSupportsLoad,
} = useUiTableLoadError()

async function loadAllSupports() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentQualityCourseId) {
    courseGoalSupports.value = new Map()
    supportsLoadError.value = false
    return
  }
  supportsLoading.value = true
  beginSupportsLoad()
  try {
    const list = await loadBoundedPlanAggregate(
      (pageNum, pageSize) =>
        courseGoalRequirementApi.page({
          pageNum,
          pageSize,
          qualityCourseId: qualityStore.currentQualityCourseId!,
        }),
      '课程目标支撑映射',
    )
    if (scope.isStale()) {
      return
    }
    const map = new Map<string, CourseGoalRequirementVO[]>()
    for (const item of list) {
      const bucket = map.get(item.courseGoalId) ?? []
      bucket.push(item)
      map.set(item.courseGoalId, bucket)
    }
    courseGoalSupports.value = map
    okSupportsLoad()
  } catch (e) {
    if (!scope.isStale()) {
      showUserError(e, '课程目标支撑映射加载失败')
      courseGoalSupports.value = new Map()
      failSupportsLoad()
    }
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
const itemTableRows = ref<AssessmentItemVO[]>([])
const itemPageNum = ref(1)
const itemPageSize = ref(10)
const itemTableTotal = ref(0)
const itemTableLoading = ref(false)
const {
  loadError: assessmentItemsAggLoadError,
  beginLoad: beginAssessmentItemsAggLoad,
  failLoad: failAssessmentItemsAggLoad,
  okLoad: okAssessmentItemsAggLoad,
} = useUiTableLoadError()
const {
  loadError: itemTableLoadError,
  beginLoad: beginItemTableLoad,
  failLoad: failItemTableLoad,
  okLoad: okItemTableLoad,
} = useUiTableLoadError()

async function loadAssessmentItemsAggregate() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentQualityCourseId) {
    assessmentItems.value = []
    assessmentItemsAggLoadError.value = false
    return
  }
  assessmentItemsLoading.value = true
  beginAssessmentItemsAggLoad()
  try {
    const items = await loadBoundedPlanAggregate(
      (pageNum, pageSize) =>
        assessmentItemApi.page({
          pageNum,
          pageSize,
          qualityCourseId: qualityStore.currentQualityCourseId!,
        }),
      '考核环节',
    )
    if (scope.isStale()) {
      return
    }
    assessmentItems.value = items
    okAssessmentItemsAggLoad()
  } catch (e) {
    if (!scope.isStale()) {
      showUserError(e, '考核环节加载失败')
      assessmentItems.value = []
      failAssessmentItemsAggLoad()
    }
  } finally {
    if (!scope.isStale()) {
      assessmentItemsLoading.value = false
    }
  }
}

async function loadItemTable() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentQualityCourseId) {
    itemTableRows.value = []
    itemTableTotal.value = 0
    itemTableLoadError.value = false
    return
  }
  itemTableLoading.value = true
  beginItemTableLoad()
  try {
    const page = await assessmentItemApi.page({
      pageNum: itemPageNum.value,
      pageSize: itemPageSize.value,
      qualityCourseId: qualityStore.currentQualityCourseId!,
    })
    if (scope.isStale()) {
      return
    }
    itemTableRows.value = page.list
    itemTableTotal.value = page.total
    okItemTableLoad()
  } catch (error) {
    if (!scope.isStale()) {
      itemTableRows.value = []
      itemTableTotal.value = 0
      failItemTableLoad()
      showUserError(error, '考核环节列表加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      itemTableLoading.value = false
    }
  }
}

function handleItemPageChange(page: { current: number, pageSize: number }) {
  itemPageNum.value = page.current
  itemPageSize.value = page.pageSize
  void loadItemTable()
}

async function loadAssessmentItems() {
  await Promise.all([loadAssessmentItemsAggregate(), loadItemTable()])
}

/* ========== 考核 → 课程目标 权重 + Rubric ========== */

const assessmentGoalWeights = ref<Map<string, AssessmentGoalWeightVO[]>>(new Map())
const rubricsByItem = ref<Map<string, RubricItemVO[]>>(new Map())
const itemMetaLoading = ref(false)
const {
  loadError: assessWeightsLoadError,
  beginLoad: beginAssessWeightsLoad,
  failLoad: failAssessWeightsLoad,
  okLoad: okAssessWeightsLoad,
} = useUiTableLoadError()

async function loadAllItemMeta() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentQualityCourseId) {
    assessmentGoalWeights.value = new Map()
    rubricsByItem.value = new Map()
    assessWeightsLoadError.value = false
    return
  }
  itemMetaLoading.value = true
  beginAssessWeightsLoad()
  try {
    let weightList: AssessmentGoalWeightVO[] = []
    let rubricList: RubricItemVO[] = []
    let weightsFailed = false
    try {
      weightList = await loadBoundedPlanAggregate(
        (pageNum, pageSize) =>
          assessmentGoalWeightApi.page({
            pageNum,
            pageSize,
            qualityCourseId: qualityStore.currentQualityCourseId!,
          }),
        '考核环节课程目标权重',
      )
    } catch (error) {
      if (!scope.isStale()) {
        weightsFailed = true
        failAssessWeightsLoad()
        showUserError(error, '考核环节课程目标权重加载失败')
      }
    }
    try {
      rubricList = await loadBoundedPlanAggregate(
        (pageNum, pageSize) =>
          rubricItemApi.page({
            pageNum,
            pageSize,
            qualityCourseId: qualityStore.currentQualityCourseId!,
          }),
        '评分标准明细',
      )
    } catch (error) {
      if (!scope.isStale()) {
        showUserError(error, '评分标准明细加载失败')
      }
    }
    if (scope.isStale()) {
      return
    }
    const wMap = new Map<string, AssessmentGoalWeightVO[]>()
    for (const weight of weightList) {
      const bucket = wMap.get(weight.assessmentItemId) ?? []
      bucket.push(weight)
      wMap.set(weight.assessmentItemId, bucket)
    }
    const rMap = new Map<string, RubricItemVO[]>()
    for (const rubric of rubricList) {
      const bucket = rMap.get(rubric.assessmentItemId) ?? []
      bucket.push(rubric)
      rMap.set(rubric.assessmentItemId, bucket)
    }
    assessmentGoalWeights.value = wMap
    rubricsByItem.value = rMap
    if (!weightsFailed) {
      okAssessWeightsLoad()
    }
  } catch (error) {
    assessmentGoalWeights.value = new Map()
    rubricsByItem.value = new Map()
    failAssessWeightsLoad()
    showUserError(error, '考核权重与评分标准加载失败')
  } finally {
    if (!scope.isStale()) {
      itemMetaLoading.value = false
    }
  }
}

function weightsOfItem(itemId: string): AssessmentGoalWeightVO[] {
  return assessmentGoalWeights.value.get(itemId) || []
}

interface PendingWeightPatch {
  assessmentItemId: string
  courseGoalId: string
  weight: number
  fullScore: number
  id?: string
  deleted?: boolean
}

interface EffectiveWeightCell {
  assessmentItemId: string
  courseGoalId: string
  weight: number
  fullScore: number
  id?: string
  dirty: boolean
}

const pendingWeightPatches = ref<Map<string, PendingWeightPatch>>(new Map())
const assessEntityExpanded = ref(false)
const weightFlushing = ref(false)

function weightPatchKey(assessmentItemId: string, courseGoalId: string): string {
  return `${assessmentItemId}::${courseGoalId}`
}

const weightMatrixDirtyCount = computed(() => pendingWeightPatches.value.size)

function clearPendingWeightPatches(): void {
  pendingWeightPatches.value = new Map()
}

function effectiveWeightsOfItem(itemId: string): EffectiveWeightCell[] {
  const map = new Map<string, EffectiveWeightCell>()
  for (const weight of weightsOfItem(itemId)) {
    map.set(weight.courseGoalId, {
      assessmentItemId: weight.assessmentItemId,
      courseGoalId: weight.courseGoalId,
      weight: Number(weight.weight) || 0,
      fullScore: Number(weight.fullScore) || 0,
      id: weight.id,
      dirty: false,
    })
  }
  for (const patch of pendingWeightPatches.value.values()) {
    if (patch.assessmentItemId !== itemId) {
      continue
    }
    if (patch.deleted) {
      map.delete(patch.courseGoalId)
      continue
    }
    map.set(patch.courseGoalId, {
      assessmentItemId: patch.assessmentItemId,
      courseGoalId: patch.courseGoalId,
      weight: patch.weight,
      fullScore: patch.fullScore,
      id: patch.id,
      dirty: true,
    })
  }
  return [...map.values()]
}

function effectiveItemWeightSum(itemId: string): number {
  return effectiveWeightsOfItem(itemId).reduce((acc, w) => acc + w.weight, 0)
}

function effectiveGoalWeightSum(goalId: string): number {
  let sum = 0
  for (const item of assessmentItems.value) {
    const matched = effectiveWeightsOfItem(item.id).find((w) => w.courseGoalId === goalId)
    if (matched) {
      sum += matched.weight
    }
  }
  return sum
}

function effectiveGoalHasWeights(goalId: string): boolean {
  return assessmentItems.value.some((item) =>
    effectiveWeightsOfItem(item.id).some((w) => w.courseGoalId === goalId),
  )
}

function stageWeightPatch(patch: PendingWeightPatch): void {
  const next = new Map(pendingWeightPatches.value)
  next.set(weightPatchKey(patch.assessmentItemId, patch.courseGoalId), patch)
  pendingWeightPatches.value = next
}

async function confirmLeaveWeightDirty(): Promise<boolean> {
  if (weightMatrixDirtyCount.value === 0) {
    return true
  }
  const ok = await confirmAsync({
    title: '有未提交的权重编辑',
    content: `当前有 ${weightMatrixDirtyCount.value} 处未保存的考核×目标权重修改，离开将丢失。`,
    type: 'warning',
    okText: '丢弃并离开',
  })
  if (ok) {
    clearPendingWeightPatches()
  }
  return ok
}

function goalWeightSum(goalId: string): number {
  let sum = 0
  for (const item of assessmentItems.value) {
    const matched = weightsOfItem(item.id).find((w) => w.courseGoalId === goalId)
    if (matched) {
      sum += Number(matched.weight) || 0
    }
  }
  return sum
}

function goalHasWeights(goalId: string): boolean {
  return assessmentItems.value.some((item) =>
    weightsOfItem(item.id).some((w) => w.courseGoalId === goalId),
  )
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
const {
  loadError: referenceLoadError,
  beginLoad: beginReferenceLoad,
  failLoad: failReferenceLoad,
  okLoad: okReferenceLoad,
} = useUiTableLoadError()

async function loadReferenceData() {
  const scope = beginQualityScopeRequest()
  const planId = currentCourse.value?.trainingPlanId || qualityStore.currentTrainingPlanId
  if (!planId) {
    requirements.value = []
    indicators.value = []
    referenceLoadError.value = false
    return
  }
  referenceLoading.value = true
  beginReferenceLoad()
  try {
    requirements.value = await loadBoundedPlanAggregate(
      (pageNum, pageSize) =>
        graduationRequirementApi.page({ pageNum, pageSize, trainingPlanId: planId }),
      '毕业要求',
    )
    if (scope.isStale()) {
      return
    }
    indicators.value = await loadBoundedPlanAggregate(
      (pageNum, pageSize) =>
        requirementIndicatorApi.page({ pageNum, pageSize, trainingPlanId: planId }),
      '毕业要求观测点',
    )
    okReferenceLoad()
  } catch (error) {
    if (!scope.isStale()) {
      requirements.value = []
      indicators.value = []
      failReferenceLoad()
      showUserError(error, '毕业要求参考数据加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      referenceLoading.value = false
    }
  }
}

const supportMatrixLoadError = computed(
  () =>
    courseGoalsAggLoadError.value
    || supportsLoadError.value
    || referenceLoadError.value,
)

const assessMatrixLoadError = computed(
  () =>
    assessmentItemsAggLoadError.value
    || assessWeightsLoadError.value
    || courseGoalsAggLoadError.value,
)

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

const itemsWeighted = computed(
  () => assessmentItems.value.filter((i) => weightsOfItem(i.id).length > 0).length,
)

const goalsWeighted = computed(() => courseGoals.value.filter((g) => goalHasWeights(g.id)).length)

const goalsHealthy = computed(
  () =>
    courseGoals.value.filter((g) => goalHasWeights(g.id) && isWeightSumHealthy(goalWeightSum(g.id)))
      .length,
)

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

const signalSummary = ref<QualityCourseMatrixSignalSummaryVO | null>(null)
const signalLastSuccessAt = ref<string | null>(null)
const distributionExpanded = ref(false)
const activeTab = ref<'support' | 'assess' | 'goals'>('support')

function markSignalSuccessAt(): void {
  signalLastSuccessAt.value = new Date().toISOString().replace('T', ' ').slice(0, 19)
}

async function loadSignalSummary() {
  if (!qualityStore.currentQualityCourseId) {
    signalSummary.value = null
    signalLastSuccessAt.value = null
    return
  }
  try {
    signalSummary.value = await workbenchApi.qualityCourseMatrixSignalSummary({
      qualityCourseId: qualityStore.currentQualityCourseId,
    })
    markSignalSuccessAt()
  } catch (error) {
    signalSummary.value = null
    showUserError(error, '课程矩阵指标加载失败')
  }
}

const configStatusStrip = computed(() => {
  const summary = signalSummary.value
  if (!summary || !qualityStore.currentQualityCourseId) {
    return null
  }
  const courseGoalTotal = summary.courseGoalTotal ?? 0
  const courseGoalCoveredCount = summary.courseGoalCoveredCount ?? 0
  const assessmentItemWeightedCount = summary.assessmentItemWeightedCount ?? itemsWeighted.value
  const assessmentItemHealthyCount = summary.assessmentItemHealthyCount ?? 0
  const courseGoalWeightedCount = summary.courseGoalWeightedCount ?? goalsWeighted.value
  const courseGoalHealthyCount = summary.courseGoalHealthyCount ?? goalsHealthy.value
  if (courseGoalTotal === 0) {
    return {
      tone: 'warning' as const,
      tag: '未配置',
      description: '当前课程尚无课程目标，请先在「课程目标」中新建',
      actionKey: 'goals' as const,
    }
  }
  if (courseGoalCoveredCount < courseGoalTotal) {
    return {
      tone: 'warning' as const,
      tag: '下一动作',
      description: `还有 ${courseGoalTotal - courseGoalCoveredCount} 个课程目标未挂支撑，请补全支撑矩阵`,
      actionKey: 'support' as const,
    }
  }
  if (assessmentItemWeightedCount > 0 && assessmentItemHealthyCount < assessmentItemWeightedCount) {
    return {
      tone: 'warning' as const,
      tag: '下一动作',
      description: '考核行权重未配平，请在「考核环节」修正权重',
      actionKey: 'assess' as const,
    }
  }
  if (courseGoalWeightedCount > 0 && courseGoalHealthyCount < courseGoalWeightedCount) {
    return {
      tone: 'warning' as const,
      tag: '下一动作',
      description: '目标列权重未配平，请在「课程目标」核对列合计',
      actionKey: 'goals' as const,
    }
  }
  return {
    tone: 'success' as const,
    tag: '配置就绪',
    description: '支撑覆盖与权重健康已满足；可继续维护量规或进入成绩接入',
    actionKey: null,
  }
})

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const courseGoalTotal = summary.courseGoalTotal
  const courseGoalCoveredCount = summary.courseGoalCoveredCount
  const assessmentItemTotal = summary.assessmentItemTotal
  const assessmentItemWeightedCount = summary.assessmentItemWeightedCount ?? itemsWeighted.value
  const assessmentItemHealthyCount = summary.assessmentItemHealthyCount
  const courseGoalWeightedCount = summary.courseGoalWeightedCount ?? goalsWeighted.value
  const courseGoalHealthyCount = summary.courseGoalHealthyCount ?? goalsHealthy.value
  const goalsConfigured = courseGoalTotal > 0
  const goalsCoverageOk = goalsConfigured && courseGoalCoveredCount === courseGoalTotal
  const itemsConfigured = assessmentItemWeightedCount > 0
  const itemsHealthOk = itemsConfigured && assessmentItemHealthyCount === assessmentItemWeightedCount
  const goalsWeightConfigured = courseGoalWeightedCount > 0
  const goalsWeightHealthOk
    = goalsWeightConfigured && courseGoalHealthyCount === courseGoalWeightedCount
  return [
    {
      key: 'goalsCovered',
      label: '已挂支撑目标',
      value: goalsConfigured ? `${courseGoalCoveredCount}/${courseGoalTotal}` : '未配置',
      tone: !goalsConfigured ? 'orange' : goalsCoverageOk ? 'green' : 'red',
      clickable: goalsConfigured && !goalsCoverageOk,
      active: activeTab.value === 'support' && goalsConfigured && !goalsCoverageOk,
    },
    {
      key: 'itemsHealth',
      label: '考核行权重健康',
      value: itemsConfigured
        ? `${assessmentItemHealthyCount}/${assessmentItemWeightedCount}`
        : '未配置',
      tone: !itemsConfigured ? 'orange' : itemsHealthOk ? 'green' : 'red',
      clickable: itemsConfigured && !itemsHealthOk,
      active: activeTab.value === 'assess' && itemsConfigured && !itemsHealthOk,
    },
    {
      key: 'goalsWeightHealth',
      label: '目标列权重健康',
      value: goalsWeightConfigured
        ? `${courseGoalHealthyCount}/${courseGoalWeightedCount}`
        : '未配置',
      tone: !goalsWeightConfigured ? 'orange' : goalsWeightHealthOk ? 'green' : 'red',
      clickable: goalsWeightConfigured && !goalsWeightHealthOk,
      active: activeTab.value === 'goals' && goalsWeightConfigured && !goalsWeightHealthOk,
    },
    {
      key: 'goals',
      label: '课程目标数',
      value: courseGoalTotal,
      tone: goalsConfigured ? 'blue' : 'orange',
      clickable: true,
      active: activeTab.value === 'goals',
    },
    {
      key: 'items',
      label: '考核环节数',
      value: assessmentItemTotal,
      tone: assessmentItemTotal > 0 ? 'blue' : 'orange',
      clickable: true,
      active: activeTab.value === 'assess',
    },
  ]
})

const distributionSignals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const requirementTotal = summary.requirementTotal ?? 0
  const requirementCoveredCount = summary.requirementCoveredCount ?? 0
  const indicatorTotal = summary.indicatorTotal ?? 0
  const indicatorCoveredCount = summary.indicatorCoveredCount ?? 0
  return [
    {
      key: 'reqCovered',
      label: '覆盖毕业要求',
      value: `${requirementCoveredCount}/${requirementTotal}`,
      tone: 'gray',
    },
    {
      key: 'indCovered',
      label: '覆盖观测点',
      value: `${indicatorCoveredCount}/${indicatorTotal}`,
      tone: 'gray',
    },
  ]
})

function handleSignalMetricClick(key: string): void {
  if (key === 'goals' || key === 'goalsWeightHealth') {
    void switchMatrixTab('goals')
    return
  }
  if (key === 'items' || key === 'itemsHealth') {
    void switchMatrixTab('assess')
    return
  }
  if (key === 'goalsCovered') {
    void switchMatrixTab('support')
  }
}

function runConfigStatusAction(): void {
  const actionKey = configStatusStrip.value?.actionKey
  if (actionKey === 'goals') {
    void switchMatrixTab('goals')
    return
  }
  if (actionKey === 'assess') {
    void switchMatrixTab('assess')
    return
  }
  if (actionKey === 'support') {
    void switchMatrixTab('support')
  }
}

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
    const tone: MatrixCell['tone']
      = support.supportLevel === SupportLevelCode.HIGH
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
    const sum = effectiveItemWeightSum(it.id)
    const weighted = effectiveWeightsOfItem(it.id).length > 0
    const healthy = weighted && isWeightSumHealthy(sum)
    return {
      key: it.id,
      label: it.itemCode,
      hint: `${it.itemName}（${assessmentItemTypeLabel(it.itemType)}）`,
      badge: weighted ? `Σw=${sum.toFixed(3)}` : undefined,
      badgeTone: !weighted ? undefined : healthy ? 'green' : 'red',
      warning: healthy ? undefined : !weighted ? '未挂任何课程目标' : '权重和≠1',
    }
  }),
)

const assessMatrixCols = computed<MatrixCol[]>(() =>
  courseGoals.value.map((g) => {
    const sum = effectiveGoalWeightSum(g.id)
    const weighted = effectiveGoalHasWeights(g.id)
    const healthy = weighted && isWeightSumHealthy(sum)
    return {
      key: g.id,
      label: g.goalCode,
      hint: g.goalName,
      width: 130,
      badge: weighted ? `Σw=${sum.toFixed(3)}` : undefined,
      badgeTone: !weighted ? undefined : healthy ? 'green' : 'red',
    }
  }),
)

const assessMatrixCells = computed<MatrixCell[]>(() => {
  const cells: MatrixCell[] = []
  for (const item of assessmentItems.value) {
    for (const w of effectiveWeightsOfItem(item.id)) {
      cells.push({
        rowKey: item.id,
        colKey: w.courseGoalId,
        primary: `w=${w.weight.toFixed(2)}`,
        secondary: w.dirty ? `满分 ${w.fullScore.toFixed(0)} · 未保存` : `满分 ${w.fullScore.toFixed(0)}`,
        tone: w.dirty ? 'orange' : 'green',
        dirty: w.dirty,
      })
    }
  }
  return cells
})

function assessRowSummary(row: MatrixRow): string {
  return effectiveItemWeightSum(row.key).toFixed(3)
}

function assessRowSummaryHint(row: MatrixRow): string {
  const sum = effectiveItemWeightSum(row.key)
  const weighted = effectiveWeightsOfItem(row.key).length > 0
  if (!weighted) {
    return '未配平'
  }
  return isWeightSumHealthy(sum) ? '行配平' : '行未配平'
}

function assessColSummary(col: MatrixCol): string {
  return effectiveGoalWeightSum(col.key).toFixed(3)
}

function assessColSummaryHint(col: MatrixCol): string {
  const sum = effectiveGoalWeightSum(col.key)
  const weighted = effectiveGoalHasWeights(col.key)
  if (!weighted) {
    return '未配平'
  }
  return isWeightSumHealthy(sum) ? '列配平' : '列未配平'
}

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
    showFormValidationMessage('请先在"培养方案体系工作台"选择培养方案')
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
    void message.error('授课教师只能选择一位，请重新选择')
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
    !courseEditor.programId.trim()
    || !courseEditor.trainingPlanId.trim()
    || !courseEditor.courseId.trim()
    || !courseEditor.courseCode.trim()
    || !courseEditor.courseName.trim()
    || !courseEditor.schoolYear.trim()
    || !selectedSemester
  ) {
    void message.error('请填写专业、培养方案、目录课程、编码、名称、学年、学期')
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
      void message.success('课程已创建')
      qualityStore.setQualityCourse(newId)
      await qualityStore.loadQualityCourseOptions()
    } else {
      await qualityCourseApi.update(request)
      void message.success('课程已更新')
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
      void message.success('课程已删除')
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
    showFormValidationMessage('请先选择课程')
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
    void message.error('请填写编码与名称')
    return
  }
  goalSubmitting.value = true
  try {
    if (goalEditorMode.value === 'create') await courseGoalApi.create(goalEditor)
    else await courseGoalApi.update(goalEditor)
    void message.success('课程目标已保存')
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
      void message.success('课程目标已删除')
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
    void message.error('课程目标数据异常，请返回后重新打开矩阵页')
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
    void message.error('必须指定毕业要求或观测点')
    return
  }
  if (
    supportEditor.supportWeight == null
    || supportEditor.supportWeight <= 0
    || supportEditor.supportWeight > 1
  ) {
    void message.error('权重必须在 (0, 1] 之间')
    return
  }
  if (supportEditorMode.value === 'create') await courseGoalRequirementApi.create(supportEditor)
  else await courseGoalRequirementApi.update(supportEditor)
  void message.success('支撑映射已保存')
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
        void message.success('已删除')
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
      (colMeta.indicatorId && s.indicatorId === colMeta.indicatorId)
      || (colMeta.reqId
        && !colMeta.indicatorId
        && s.requirementId === colMeta.reqId
        && !s.indicatorId),
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
    showFormValidationMessage('请先选择课程')
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
    void message.error('请填写编码、名称、类型')
    return
  }
  if (itemEditor.fullScore == null || itemEditor.fullScore <= 0) {
    void message.error('满分必须 > 0')
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
    void message.success('考核环节已保存')
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
      void message.success('考核环节已删除')
      await Promise.all([loadAssessmentItems(), loadAllItemMeta()])
    },
  })
}

async function validateItemWeights(item: AssessmentItemVO) {
  try {
    await assessmentGoalWeightApi.validateWeights(item.id)
    void message.success(`考核 ${item.itemCode} 的课程目标行权重校验通过`)
  } catch (error) {
    showUserError(error, '考核行权重校验失败')
  }
}

async function validateGoalWeights(goal: CourseGoalVO) {
  try {
    await assessmentGoalWeightApi.validateWeightsByCourseGoal(goal.id)
    void message.success(`课程目标 ${goal.goalCode} 的考核列权重校验通过`)
  } catch (error) {
    showUserError(error, '课程目标列权重校验失败')
  }
}

async function validateMatrixWeights() {
  if (!qualityStore.currentQualityCourseId) {
    showFormValidationMessage('请先选择质量评价课程')
    return
  }
  try {
    await assessmentGoalWeightApi.validateMatrixWeights(qualityStore.currentQualityCourseId)
    void message.success('考核×目标权重矩阵已全部配平，可进入达成度计算')
  } catch (error) {
    showUserError(error, '矩阵权重校验失败')
  }
}

async function validateRubricFullScore(item: AssessmentItemVO) {
  await rubricItemApi.validateFullScore(item.id)
  void message.success(`考核 ${item.itemCode} 的评分量规满分加总校验通过`)
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
    void message.error('考核环节数据异常，请返回后重新打开矩阵页')
    return
  }
  if (!courseGoal) {
    void message.error('课程目标数据异常，请返回后重新打开矩阵页')
    return
  }
  const sumNow = effectiveItemWeightSum(itemId)
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

function openWeightEdit(record: AssessmentGoalWeightVO | EffectiveWeightCell) {
  if (!guardCourseMatrixEditable('编辑考核权重')) return
  weightEditorMode.value = 'edit'
  const item = assessmentItems.value.find((i) => i.id === record.assessmentItemId)
  const courseGoal = courseGoals.value.find((g) => g.id === record.courseGoalId)
  Object.assign(weightEditor, {
    id: record.id,
    assessmentItemId: record.assessmentItemId,
    courseGoalId: record.courseGoalId,
    weight: Number(record.weight) || 0,
    fullScore: Number(record.fullScore) || 0,
  })
  Object.assign(weightEditorDisplay, {
    assessmentItemName: item
      ? `${item.itemCode} ${item.itemName}`
      : record.assessmentItemId,
    courseGoalName: courseGoal
      ? `${courseGoal.goalCode} ${courseGoal.goalName}`
      : record.courseGoalId,
  })
  weightEditorVisible.value = true
}

function submitWeight() {
  if (!guardCourseMatrixEditable('保存考核权重')) return
  if (weightEditor.weight == null || weightEditor.weight < 0 || weightEditor.weight > 1) {
    void message.error('权重必须在 [0, 1] 之间')
    return
  }
  if (weightEditor.fullScore == null || weightEditor.fullScore <= 0) {
    void message.error('满分必须 > 0')
    return
  }
  stageWeightPatch({
    assessmentItemId: weightEditor.assessmentItemId,
    courseGoalId: weightEditor.courseGoalId,
    weight: weightEditor.weight,
    fullScore: weightEditor.fullScore,
    id: weightEditor.id,
    deleted: false,
  })
  weightEditorVisible.value = false
  void message.success('已记入未提交编辑，请点击「提交权重并校验」写入服务端')
}

async function flushPendingWeights(): Promise<void> {
  if (!guardCourseMatrixEditable('提交考核权重')) return
  if (weightMatrixDirtyCount.value === 0) {
    void message.warning('没有未提交的权重编辑')
    return
  }
  if (!qualityStore.currentQualityCourseId) {
    showFormValidationMessage('请先选择质量评价课程')
    return
  }
  weightFlushing.value = true
  try {
    const patches = [...pendingWeightPatches.value.values()]
    for (const patch of patches) {
      if (patch.deleted) {
        if (patch.id) {
          await assessmentGoalWeightApi.delete(patch.id)
        }
        continue
      }
      const payload: AssessmentGoalWeightSaveRequest = {
        id: patch.id,
        assessmentItemId: patch.assessmentItemId,
        courseGoalId: patch.courseGoalId,
        weight: patch.weight,
        fullScore: patch.fullScore,
      }
      if (patch.id) {
        await assessmentGoalWeightApi.update(payload)
      } else {
        await assessmentGoalWeightApi.create(payload)
      }
    }
    clearPendingWeightPatches()
    await loadAllItemMeta()
    await assessmentGoalWeightApi.validateMatrixWeights(qualityStore.currentQualityCourseId)
    void message.success('权重已提交且矩阵配平校验通过')
  } catch (error) {
    showUserError(error, '权重提交或矩阵校验失败')
    await loadAllItemMeta()
  } finally {
    weightFlushing.value = false
  }
}

function discardPendingWeights(): void {
  if (weightMatrixDirtyCount.value === 0) {
    return
  }
  void confirmAsync({
    title: '放弃未提交权重？',
    content: `将丢弃 ${weightMatrixDirtyCount.value} 处本地编辑，矩阵恢复为服务端已保存值。`,
    type: 'warning',
    onOk: () => {
      clearPendingWeightPatches()
      void message.success('已放弃未提交权重')
    },
  })
}

async function deleteWeight(record: AssessmentGoalWeightVO | EffectiveWeightCell) {
  if (!guardCourseMatrixEditable('删除考核权重')) return
  void confirmAsync({
    title: '删除该考核-目标权重？',
    type: 'error',
    onOk: async () => {
      stageWeightPatch({
        assessmentItemId: record.assessmentItemId,
        courseGoalId: record.courseGoalId,
        weight: Number(record.weight) || 0,
        fullScore: Number(record.fullScore) || 0,
        id: record.id,
        deleted: true,
      })
      void message.success('已标记删除，请点击「提交权重并校验」写入服务端')
    },
  })
}

function handleDeleteWeightClick() {
  const matched = effectiveWeightsOfItem(weightEditor.assessmentItemId).find(
    (w) => w.courseGoalId === weightEditor.courseGoalId,
  )
  if (matched) {
    void deleteWeight(matched)
    weightEditorVisible.value = false
  }
}

function handleAssessCellClick(cellEvent: {
  row: MatrixRow
  col: MatrixCol
  cell: MatrixCell | undefined
}) {
  if (!guardCourseMatrixEditable('维护考核权重')) return
  const matched = effectiveWeightsOfItem(cellEvent.row.key).find(
    (w) => w.courseGoalId === cellEvent.col.key,
  )
  if (matched) openWeightEdit(matched)
  else openWeightCreate(cellEvent.row.key, cellEvent.col.key)
}

/* ========== 编辑器：Rubric ========== */

const rubricDrawerVisible = ref(false)
const rubricItem = ref<AssessmentItemVO | null>(null)
const rubricDrawerRows = ref<RubricItemVO[]>([])
const rubricDrawerTotal = ref(0)
const rubricDrawerPageNum = ref(1)
const rubricDrawerPageSize = ref(20)
const rubricDrawerLoading = ref(false)
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
  rubricDrawerPageNum.value = 1
  rubricDrawerVisible.value = true
  void loadRubricDrawerPage()
}

async function loadRubricDrawerPage() {
  if (!rubricItem.value) return
  rubricDrawerLoading.value = true
  try {
    const page = await rubricItemApi.page({
      assessmentItemId: rubricItem.value.id,
      pageNum: rubricDrawerPageNum.value,
      pageSize: rubricDrawerPageSize.value,
    })
    rubricDrawerRows.value = page.list
    rubricDrawerTotal.value = page.total
  } catch (error: unknown) {
    rubricDrawerRows.value = []
    rubricDrawerTotal.value = 0
    showUserError(error, '评分量规列表加载失败')
  } finally {
    rubricDrawerLoading.value = false
  }
}

function handleRubricDrawerPageChange(pageEvent: { current: number, pageSize: number }) {
  rubricDrawerPageNum.value = pageEvent.current
  rubricDrawerPageSize.value = pageEvent.pageSize
  void loadRubricDrawerPage()
}

function openRubricCreate() {
  if (!guardCourseMatrixEditable('新增评分量规')) return
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
    sortOrder: (rubricDrawerTotal.value + 1) * 10,
  })
  rubricEditorVisible.value = true
}

function openRubricEdit(record: RubricItemVO) {
  if (!guardCourseMatrixEditable('编辑评分量规')) return
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
  if (!guardCourseMatrixEditable('保存评分量规')) return
  if (
    !rubricEditor.rubricName.trim()
    || rubricEditor.fullScore == null
    || rubricEditor.fullScore <= 0
  ) {
    void message.error('请填写名称与满分')
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
  void message.success('评分量规已保存')
  rubricEditorVisible.value = false
  await Promise.all([loadRubricDrawerPage(), loadAllItemMeta()])
}

async function deleteRubric(record: RubricItemVO) {
  if (!guardCourseMatrixEditable('删除评分量规')) return
  void confirmAsync({
    title: `删除 Rubric「${record.rubricName}」？`,
    type: 'error',
    onOk: async () => {
      await rubricItemApi.delete(record.id)
      void message.success('已删除')
      await Promise.all([loadRubricDrawerPage(), loadAllItemMeta()])
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
      void validateItemWeights(record)
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
    void message.error('请填写阈值')
    return
  }
  if (ruleEditorMode.value === 'create') await courseGoalAssessmentRuleApi.create(ruleEditor)
  else await courseGoalAssessmentRuleApi.update(ruleEditor)
  void message.success('计算规则已保存')
  ruleEditorVisible.value = false
}

/* ========== 上下文与 Tab 切换 ========== */

const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (!qualityStore.currentTrainingPlanId) {
    return 'need-plan'
  }
  if (qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return 'need-confirm'
  }
  return null
})

async function handleScopeChange(): Promise<void> {
  clearPendingWeightPatches()
  assessEntityExpanded.value = false
  if (!qualityStore.currentQualityCourseId && qualityStore.currentTrainingPlanId) {
    await qualityStore.loadQualityCourseOptions()
    if (qualityStore.qualityCourseOptions.length) {
      qualityStore.setQualityCourse(qualityStore.qualityCourseOptions[0].id)
      return
    }
  }
  goalPageNum.value = 1
  itemPageNum.value = 1
  await loadCurrentCourse()
  await Promise.all([loadCourseGoals(), loadAssessmentItems()])
  await loadSignalSummary()
  await Promise.all([loadAllSupports(), loadAllItemMeta(), loadReferenceData()])
}

useQualityScopedLoader(handleScopeChange, { watchScope: true, immediate: true })

function handleCourseChange(courseId: string | null) {
  qualityStore.setQualityCourse(courseId || '')
}

async function switchMatrixTab(next: 'support' | 'assess' | 'goals'): Promise<void> {
  if (next === activeTab.value) {
    return
  }
  if (activeTab.value === 'assess' && weightMatrixDirtyCount.value > 0) {
    const ok = await confirmLeaveWeightDirty()
    if (!ok) {
      return
    }
  }
  activeTab.value = next
}

onBeforeRouteLeave(async () => {
  if (weightMatrixDirtyCount.value === 0) {
    return true
  }
  return await confirmLeaveWeightDirty()
})

/* ========== 字典 ========== */

const supportLevelOptions: { value: SupportLevelCode, label: string }[]
  = ALL_SUPPORT_LEVEL_CODES.map((value) => ({
    value,
    label: strictEnumLabel(SupportLevelDescription, value, '支撑度'),
  }))

const aggregationOptions: { value: AggregationFunctionCode, label: string }[]
  = ALL_AGGREGATION_FUNCTION_CODES.map((value) => ({
    value,
    label: aggregationFunctionLabel(value),
  }))

const itemTypeOptions: { value: AssessmentItemTypeCode, label: string }[]
  = ALL_ASSESSMENT_ITEM_TYPE_CODES.map((value) => ({
    value,
    label: strictEnumLabel(AssessmentItemTypeDescription, value, '考核项类型'),
  }))
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="课程支撑矩阵">
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
              · {{ formatSemester(currentCourse.semester) }}</span>
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

    <QualityPlanGateStrip v-if="planGateMode" :mode="planGateMode" class="qcm__empty" />

    <UiAlertStrip
      v-else-if="!qualityStore.currentQualityCourseId"
      tone="info"
      size="sm"
      dense
      inline
      :show-icon="false"
      class="qcm__empty"
    >
      <template #default>
        <span class="qcm__gate-row">
          <UiTag tone="blue" size="sm">未选择课程</UiTag>
          <span>请在上方选择质量评价课程后再维护支撑矩阵（上下文未就绪）</span>
        </span>
      </template>
    </UiAlertStrip>

    <template v-else>
      <UiAlertStrip
        v-if="configStatusStrip"
        :tone="configStatusStrip.tone"
        dense
        inline
        :show-icon="false"
        class="qcm__config-status"
      >
        <template #default>
          <span class="qcm__gate-row">
            <UiTag
              :tone="
                configStatusStrip.tone === 'warning'
                  ? 'orange'
                  : configStatusStrip.tone === 'success'
                    ? 'green'
                    : 'blue'
              "
              size="sm"
            >
              {{ configStatusStrip.tag }}
            </UiTag>
            <span>{{ configStatusStrip.description }}</span>
            <UiButton
              v-if="configStatusStrip.actionKey"
              variant="ghost"
              size="sm"
              @click="runConfigStatusAction"
            >
              去处理
            </UiButton>
          </span>
        </template>
      </UiAlertStrip>
      <SignalBand
        :metrics="signals"
        variant="panel"
        compact
        class="qcm__signals"
        @metric-click="handleSignalMetricClick"
      />
      <p v-if="signalLastSuccessAt" class="qcm__sync-hint">
        指标最近同步：{{ signalLastSuccessAt }}
      </p>
      <div v-if="distributionSignals.length" class="qcm__charts-fold">
        <UiButton
          variant="ghost"
          size="sm"
          class="qcm__charts-toggle"
          @click="distributionExpanded = !distributionExpanded"
        >
          {{ distributionExpanded ? '收起覆盖统计' : '展开覆盖统计' }}
        </UiButton>
        <SignalBand
          v-if="distributionExpanded"
          :metrics="distributionSignals"
          variant="panel"
          compact
          class="qcm__signals-secondary"
        />
      </div>

      <div class="qcm__tabs">
        <UiButton
          :variant="activeTab === 'support' ? 'primary' : 'ghost'"
          size="sm"
          @click="switchMatrixTab('support')"
        >
          ① 课程目标 → 毕业要求/观测点 支撑矩阵
        </UiButton>
        <UiButton
          :variant="activeTab === 'assess' ? 'primary' : 'ghost'"
          size="sm"
          @click="switchMatrixTab('assess')"
        >
          ② 考核环节 → 课程目标 权重矩阵
        </UiButton>
        <UiButton
          :variant="activeTab === 'goals' ? 'primary' : 'ghost'"
          size="sm"
          @click="switchMatrixTab('goals')"
        >
          ③ 课程目标实体 / 计算规则
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
          :load-error="supportMatrixLoadError"
          empty-error-title="支撑矩阵加载失败"
          empty-text="尚未创建课程目标或未挂接毕业要求"
          :default-col-width="110"
          @cell-click="handleSupportCellClick"
        />
      </div>

      <!-- Tab 2: 考核环节 × 课程目标 -->
      <div v-else-if="activeTab === 'assess'" class="qcm__tab-content">
        <div class="qcm__matrix-toolbar">
          <UiButton variant="primary" size="sm" @click="openItemCreate"> 新建考核环节 </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :loading="weightFlushing"
            :disabled="weightMatrixDirtyCount === 0"
            @click="flushPendingWeights"
          >
            提交权重并校验
            <template v-if="weightMatrixDirtyCount > 0">（{{ weightMatrixDirtyCount }}）</template>
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="weightMatrixDirtyCount === 0"
            @click="discardPendingWeights"
          >
            放弃未提交
          </UiButton>
          <UiButton variant="outline" size="sm" @click="validateMatrixWeights">
            校验已保存矩阵
          </UiButton>
          <span class="qcm__hint">
            单元格编辑先进入本地 dirty；行/列 Σw 须 = 1。提交后才会写入服务端并跑矩阵配平校验。
          </span>
        </div>
        <UiAlertStrip
          v-if="weightMatrixDirtyCount > 0"
          tone="warning"
          dense
          inline
          :show-icon="false"
          class="qcm__dirty-strip"
        >
          有 {{ weightMatrixDirtyCount }} 处未提交权重（橙色描边）；切换页签或离开前请提交或放弃。
        </UiAlertStrip>
        <MatrixWorkbench
          title="考核环节 × 课程目标 权重矩阵"
          subtitle="行/列徽标与底部合计均为配平口径（含未提交 dirty）"
          row-header-label="考核环节"
          col-header-label="课程目标"
          :rows="assessMatrixRows"
          :cols="assessMatrixCols"
          :cells="assessMatrixCells"
          :loading="assessmentItemsLoading || itemMetaLoading || courseGoalsLoading"
          :load-error="assessMatrixLoadError"
          empty-error-title="权重矩阵加载失败"
          empty-text="尚未创建考核环节或课程目标"
          :default-col-width="130"
          :show-row-summary="true"
          row-summary-label="行Σw"
          :row-summary="assessRowSummary"
          :row-summary-hint="assessRowSummaryHint"
          :show-col-summary="true"
          col-summary-label="列Σw"
          :col-summary="assessColSummary"
          :col-summary-hint="assessColSummaryHint"
          @cell-click="handleAssessCellClick"
        />

        <div class="qcm__entity-fold">
          <UiButton
            variant="ghost"
            size="sm"
            class="qcm__entity-toggle"
            @click="assessEntityExpanded = !assessEntityExpanded"
          >
            {{ assessEntityExpanded ? '收起考核实体维护' : '维护考核实体（列表 / Rubric）' }}
          </UiButton>
          <div v-if="assessEntityExpanded" class="qcm__entity-panel">
            <UiDataTable
              pagination-mode="server"
              v-model:current="itemPageNum"
              v-model:page-size="itemPageSize"
              :columns="itemColumns"
              :data-source="itemTableRows"
              :loading="itemTableLoading"
              :load-error="itemTableLoadError"
              empty-title="暂无考核环节"
              empty-description="请新建考核环节并配置权重"
              row-key="id"
              size="middle"
              flat
              :total="itemTableTotal"
              @page-change="handleItemPageChange"
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
          </div>
        </div>
      </div>

      <!-- Tab 3: 课程目标实体 -->
      <div v-else class="qcm__tab-content">
        <div class="qcm__matrix-toolbar">
          <UiButton variant="primary" size="sm" @click="openGoalCreate"> 新建课程目标 </UiButton>
          <span class="qcm__hint">
            本页仅维护课程目标实体与计算规则；支撑映射与权重配平请回到矩阵页签。
          </span>
        </div>
        <UiDataTable
          pagination-mode="server"
          v-model:current="goalPageNum"
          v-model:page-size="goalPageSize"
          :columns="goalColumns"
          :data-source="goalTableRows"
          :loading="goalTableLoading"
          :load-error="goalTableLoadError"
          empty-title="暂无课程目标"
          empty-description="请新建课程目标后再维护支撑与权重"
          row-key="id"
          size="middle"
          flat
          :total="goalTableTotal"
          @page-change="handleGoalPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'thresholdValue'">
              {{ record.thresholdValue == null ? '-' : record.thresholdValue.toFixed(2) }}
            </template>
            <template v-else-if="column.key === 'aggregation'">
              {{ aggregationFunctionLabel(record.aggregation) }}
            </template>
            <template v-else-if="column.key === 'flags'">
              <div class="dp-space dp-space--wrap" style="--dp-space-component: 8px">
                <UiTag v-if="record.civicObjectiveFlag" tone="purple"> 思政 </UiTag>
                <UiTag v-if="record.aiLiteracyFlag" tone="blue"> AI 素养 </UiTag>
                <UiTag v-if="record.complexEngineeringFlag" tone="orange"> 复杂工程 </UiTag>
                <span
                  v-if="
                    !record.civicObjectiveFlag
                      && !record.aiLiteracyFlag
                      && !record.complexEngineeringFlag
                  "
                  class="qcm__muted"
                >-</span>
              </div>
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
      <UiForm layout="vertical" :model="courseEditor">
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="所属专业大类" required>
              <ProgramSelector
                :value="courseEditor.programId || null"
                placeholder="请选择 edu-user 专业大类"
                @change="handleProgramChange"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="培养方案" required>
              <TrainingPlanSelector
                :value="courseEditor.trainingPlanId || null"
                :program-id="courseEditor.programId || null"
                :disabled="!courseEditor.programId"
                :only-confirmed="false"
                :only-enabled="true"
                placeholder="选定专业后可选培养方案"
                @change="handleTrainingPlanChange"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="目录课程" required>
              <CatalogCourseSelector
                :value="courseEditor.courseId || null"
                :major-category-id="courseEditor.programId || null"
                :disabled="!courseEditor.programId"
                placeholder="选择 edu-user 已授权课程"
                @change="handleCatalogCourseChange"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="编码" required>
              <UiInput
                size="sm"
                v-model="courseEditor.courseCode"
                placeholder="目录课程已自动填入"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="名称" required>
              <UiInput
                size="sm"
                v-model="courseEditor.courseName"
                placeholder="目录课程已自动填入"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="课程类别">
              <UiInput
                size="sm"
                v-model="courseEditor.courseCategory"
                placeholder="如 通识 / 专业核心"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="课程性质">
              <UiInput size="sm" v-model="courseEditor.courseNature" placeholder="如 必修 / 选修" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="学年">
              <UiInput size="sm" v-model="courseEditor.schoolYear" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="学期" required>
              <UiSelect
                size="sm"
                v-model="courseEditor.semester"
                :options="SemesterOptions"
                placeholder="选择学期"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="学时">
              <UiInputNumber
                size="sm"
                v-model="courseEditor.creditHours"
                :min="0"
                :step="1"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="学分">
              <UiInputNumber
                size="sm"
                v-model="courseEditor.creditValue"
                :min="0"
                :step="0.5"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="授课教师">
              <TeacherSelector
                :value="courseEditor.teacherUserId || null"
                placeholder="请选择教师"
                @change="handleTeacherChange"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="授课班级">
              <ClassSelector
                :value="courseEditor.classId || null"
                placeholder="请选择班级"
                @change="handleClassChange"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="思政目标">
          <UiTextarea size="sm" v-model="courseEditor.civicObjective" :rows="3" />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="教学大纲附件">
              <UiPlatformFileField
                v-model:file-node-id="courseEditor.syllabusFileId"
                v-model:file-name="syllabusFileName"
                :scene-key="FileUploadSceneKey.QUALITY_COURSE_SYLLABUS"
                button-text="上传教学大纲附件"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="是否启用">
              <UiSwitch size="sm" v-model="courseEditor.enabled" />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>
    </UiDrawer>

    <!-- 课程目标编辑 Modal -->
    <UiDialog
      v-model:open="goalEditorVisible"
      :title="goalEditorMode === 'create' ? '新建课程目标' : '编辑课程目标'"
      :confirm-loading="goalSubmitting"
      :width="640"
      @ok="submitGoal"
    >
      <UiForm layout="vertical" :model="goalEditor">
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="编码" required>
              <UiInput size="sm" v-model="goalEditor.goalCode" placeholder="如 G1" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="18">
            <UiFormItem label="名称" required>
              <UiInput size="sm" v-model="goalEditor.goalName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="描述">
          <UiTextarea size="sm" v-model="goalEditor.description" :rows="3" />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="阈值">
              <UiInputNumber
                size="sm"
                v-model="goalEditor.thresholdValue"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="聚合">
              <UiSelect size="sm" v-model="goalEditor.aggregation" :options="aggregationOptions" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="直接评价权重">
              <UiInputNumber
                size="sm"
                v-model="goalEditor.directWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="间接评价权重">
              <UiInputNumber
                size="sm"
                v-model="goalEditor.indirectWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="思政目标">
              <UiSwitch size="sm" v-model="goalEditor.civicObjectiveFlag" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="AI 素养">
              <UiSwitch size="sm" v-model="goalEditor.aiLiteracyFlag" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="排序">
          <UiInputNumber size="sm" v-model="goalEditor.sortOrder" :min="0" style="width: 200px" />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- 支撑映射编辑 Modal -->
    <UiDialog
      v-model:open="supportEditorVisible"
      :title="supportEditorMode === 'create' ? '新增课程目标支撑' : '编辑课程目标支撑'"
      width="540px"
      @ok="submitSupport"
    >
      <UiForm layout="vertical" :model="supportEditor">
        <UiFormItem label="课程目标">
          <UiInput size="sm" :value="supportEditorDisplay.courseGoalName" disabled />
        </UiFormItem>
        <UiFormItem label="支撑对象">
          <UiInput size="sm" :value="supportEditorDisplay.supportTargetLabel" disabled />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="支撑度" required>
              <UiRadioGroup
                :model-value="supportEditor.supportLevel"
                size="sm"
                :options="supportLevelOptions"
                @update:model-value="(value) => handleSupportLevelChange(value as SupportLevelCode)"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="权重 (0~1]" required>
              <UiInputNumber
                size="sm"
                v-model="supportEditor.supportWeight"
                :min="0"
                :max="1"
                :step="0.05"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>
      <template #footer>
        <div class="dp-space" style="--dp-space-component: 8px">
          <UiButton
            v-if="supportEditorMode === 'edit'"
            size="sm"
            status="danger"
            variant="outline"
            @click="handleDeleteSupportClick"
          >
            删除映射
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="supportEditorVisible = false">取消</UiButton>
          <UiButton size="sm" variant="primary" @click="submitSupport">保存</UiButton>
        </div>
      </template>
    </UiDialog>

    <!-- 考核环节编辑 Modal -->
    <UiDialog
      v-model:open="itemEditorVisible"
      :title="itemEditorMode === 'create' ? '新建考核环节' : '编辑考核环节'"
      :confirm-loading="itemSubmitting"
      :width="640"
      @ok="submitItem"
    >
      <UiForm layout="vertical" :model="itemEditor">
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="编码" required>
              <UiInput size="sm" v-model="itemEditor.itemCode" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="名称" required>
              <UiInput size="sm" v-model="itemEditor.itemName" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="排序">
              <UiInputNumber
                size="sm"
                v-model="itemEditor.sortOrder"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="类型" required>
              <UiSelect size="sm" v-model="itemEditor.itemType" :options="itemTypeOptions" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="满分" required>
              <UiInputNumber
                size="sm"
                v-model="itemEditor.fullScore"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="及格分">
              <UiInputNumber
                size="sm"
                v-model="itemEditor.passScore"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="4">
            <UiFormItem label="过程性">
              <UiSwitch size="sm" v-model="itemEditor.isProcessOriented" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="课程内权重">
          <UiInputNumber
            size="sm"
            v-model="itemEditor.weightInCourse"
            :min="0"
            :max="1"
            :step="0.01"
            style="width: 200px"
            placeholder="可选 - 该考核在课程总评中的权重"
          />
        </UiFormItem>
        <UiFormItem label="说明">
          <UiTextarea size="sm" v-model="itemEditor.description" :rows="3" />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- 考核-目标 权重编辑 Modal -->
    <UiDialog
      v-model:open="weightEditorVisible"
      :title="weightEditorMode === 'create' ? '新增「考核 → 目标」权重' : '编辑「考核 → 目标」权重'"
      width="500px"
      @ok="submitWeight"
    >
      <UiForm layout="vertical" :model="weightEditor">
        <UiFormItem label="考核环节">
          <UiInput size="sm" :value="weightEditorDisplay.assessmentItemName" disabled />
        </UiFormItem>
        <UiFormItem label="课程目标">
          <UiInput size="sm" :value="weightEditorDisplay.courseGoalName" disabled />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="权重 [0, 1]" required>
              <UiInputNumber
                size="sm"
                v-model="weightEditor.weight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="对应满分" required>
              <UiInputNumber
                size="sm"
                v-model="weightEditor.fullScore"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </UiForm>
      <template #footer>
        <div class="dp-space" style="--dp-space-component: 8px">
          <UiButton
            v-if="weightEditorMode === 'edit'"
            size="sm"
            status="danger"
            variant="outline"
            @click="handleDeleteWeightClick"
          >
            删除
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="weightEditorVisible = false">取消</UiButton>
          <UiButton size="sm" variant="primary" @click="submitWeight">保存</UiButton>
        </div>
      </template>
    </UiDialog>

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
        pagination-mode="server"
        v-model:current="rubricDrawerPageNum"
        v-model:page-size="rubricDrawerPageSize"
        :columns="rubricColumns"
        :data-source="rubricDrawerRows"
        :loading="rubricDrawerLoading"
        row-key="id"
        size="middle"
        :total="rubricDrawerTotal"
        @page-change="handleRubricDrawerPageChange"
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
    <UiDialog
      v-model:open="rubricEditorVisible"
      :title="rubricEditorMode === 'create' ? '新增 Rubric' : '编辑 Rubric'"
      width="600px"
      @ok="submitRubric"
    >
      <UiForm layout="vertical" :model="rubricEditor">
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="编码">
              <UiInput size="sm" v-model="rubricEditor.rubricCode" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="18">
            <UiFormItem label="维度名称" required>
              <UiInput
                size="sm"
                v-model="rubricEditor.rubricName"
                placeholder="如 解题思路 / 创新性 / 工程实现"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="关联课程目标">
              <UiSelect
                v-model="rubricEditor.courseGoalId"
                placeholder="可选 - 关联到某课程目标"
                allow-clear
                size="sm"
                :options="
                  courseGoals.map((g) => ({ value: g.id, label: `${g.goalCode} · ${g.goalName}` }))
                "
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="满分" required>
              <UiInputNumber
                size="sm"
                v-model="rubricEditor.fullScore"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="排序">
              <UiInputNumber
                size="sm"
                v-model="rubricEditor.sortOrder"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="说明">
          <UiTextarea size="sm" v-model="rubricEditor.description" :rows="3" />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- 计算规则编辑 Modal -->
    <UiDialog
      v-model:open="ruleEditorVisible"
      :title="`课程目标计算规则：${ruleGoal?.goalName || ''}`"
      :width="640"
      @ok="submitRule"
    >
      <UiForm layout="vertical" :model="ruleEditor">
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="聚合策略" required>
              <UiSelect size="sm" v-model="ruleEditor.aggregation" :options="aggregationOptions" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="阈值" required>
              <UiInputNumber
                size="sm"
                v-model="ruleEditor.thresholdValue"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="直接评价权重">
              <UiInputNumber
                size="sm"
                v-model="ruleEditor.directWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="间接评价权重">
              <UiInputNumber
                size="sm"
                v-model="ruleEditor.indirectWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="最小有效样本">
              <UiInputNumber
                size="sm"
                v-model="ruleEditor.minimumValidSample"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="间接最小样本">
              <UiInputNumber
                size="sm"
                v-model="ruleEditor.indirectMinValidSample"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="间接覆盖阈值">
              <UiInputNumber
                size="sm"
                v-model="ruleEditor.indirectCoverageThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="ruleEditor.notes" :rows="3" />
        </UiFormItem>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.qcm {
  &__context-label {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__empty {
    margin-top: var(--dp-space-component);
  }

  &__config-status {
    margin-bottom: var(--dp-space-component);
  }

  &__signals {
    margin-bottom: var(--dp-space-component-xs);
  }

  &__signals-secondary {
    margin-top: var(--dp-space-component-tight);
  }

  &__sync-hint {
    margin: 0 0 var(--dp-space-component-tight);
    color: var(--dp-text-secondary, #666);
    font-size: var(--dp-font-size-sm, 12px);
  }

  &__charts-fold {
    margin-bottom: var(--dp-space-component-tight);
  }

  &__charts-toggle {
    padding-inline: 0;
  }

  &__tabs {
    display: flex;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component);
    flex-wrap: wrap;
  }

  &__tab-content {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
  }

  &__matrix-toolbar,
  &__rubric-toolbar {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component);
    padding: var(--dp-space-component-tight) 0;
  }

  &__hint {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__dirty-strip {
    margin-bottom: var(--dp-space-component-xs);
  }

  &__entity-fold {
    margin-top: var(--dp-space-component-xs);
  }

  &__entity-toggle {
    padding-inline: 0;
  }

  &__entity-panel {
    margin-top: var(--dp-space-component-tight);
    padding-top: var(--dp-space-component-tight);
    border-top: 1px solid var(--dp-border);
  }

  &__muted {
    color: var(--dp-text-muted);
  }

  &__file-name {
    margin-top: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }

  &__gate-row {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    min-width: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }
}

.text-xs {
  font-size: var(--dp-font-size-xs);
}

.text-gray-500 {
  color: var(--dp-text-muted);
}

.mr-1 {
  margin-right: var(--dp-space-component-xs);
}
</style>
