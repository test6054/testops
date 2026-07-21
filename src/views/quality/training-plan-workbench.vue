<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 培养方案体系工作台 - 4-in-1 综合工作台
 *
 * 合并原 4 个独立路由：培养方案 / 培养目标 / 毕业要求 / 观测点。
 *
 * 设计参考：中国工程教育认证通用标准（华盛顿协议）课程体系建设要求 §1.3 / §1.5。
 *
 * 业务链路：
 *   培养方案 → 培养目标（毕业 5 年职业成就描述）
 *           → 毕业要求（标准 12 条覆盖：a 工程知识、b 问题分析、c 设计/开发解决方案、
 *                       d 研究、e 使用现代工具、f 工程与社会、g 环境与可持续、
 *                       h 职业规范、i 个人和团队、j 沟通、k 项目管理、l 终身学习）
 *           → 观测点（每条毕业要求分解为 2-5 个可测量指标点）
 *           → 标准条款映射（指向 AccreditationStandard）
 *
 * 关键约束：
 *   - 培养目标 → 毕业要求映射权重之和必须为 1（实时校验提示）
 *   - 毕业要求 → 观测点 requirementWeight 之和必须为 1（后端 validate-weights 校验）
 *
 * 后端契约：
 *   - /api/quality/training-plans                   培养方案 CRUD + confirm
 *   - /api/quality/training-objectives              培养目标 CRUD
 *   - /api/quality/training-objective-requirements  培养目标 ↔ 毕业要求权重映射
 *   - /api/quality/graduation-requirements          毕业要求 CRUD
 *   - /api/quality/requirement-indicators           观测点 CRUD + validate-weights
 *   - /api/quality/requirement-standard-mappings    观测点-标准条款映射
 *   - /api/quality/accreditation-standards          认证标准条目
 */
import type { AccreditationStandardVO } from '@/apis/quality/accreditation-standard'
import { accreditationStandardApi } from '@/apis/quality/accreditation-standard'
import type {
  GraduationRequirementSaveRequest,
  GraduationRequirementVO,
} from '@/apis/quality/graduation-requirement'
import { graduationRequirementApi } from '@/apis/quality/graduation-requirement'
import type {
  RequirementIndicatorSaveRequest,
  RequirementIndicatorVO,
} from '@/apis/quality/requirement-indicator'
import { requirementIndicatorApi } from '@/apis/quality/requirement-indicator'
import type {
  RequirementStandardMappingSaveRequest,
  RequirementStandardMappingVO,
} from '@/apis/quality/requirement-standard-mapping'
import { requirementStandardMappingApi } from '@/apis/quality/requirement-standard-mapping'
import type {
  TrainingObjectiveSaveRequest,
  TrainingObjectiveVO,
} from '@/apis/quality/training-objective'
import { trainingObjectiveApi } from '@/apis/quality/training-objective'
import type {
  TrainingObjectiveRequirementSaveRequest,
  TrainingObjectiveRequirementVO,
} from '@/apis/quality/training-objective-requirement'
import { trainingObjectiveRequirementApi } from '@/apis/quality/training-objective-requirement'
import type { TrainingPlanSaveRequest, TrainingPlanVO } from '@/apis/quality/training-plan'
import { trainingPlanApi } from '@/apis/quality/training-plan'
import type { CivicDimensionCode } from '@/apis/quality/types'
import {
  AggregationFunctionCode,
  AggregationFunctionDescription,
  ALL_AGGREGATION_FUNCTION_CODES,
  ALL_CIVIC_DIMENSION_CODES,
  CivicDimensionDescription,
  ConfirmationStatusCode,
  ConfirmationStatusDescription,
} from '@/apis/quality/types'
import type { TrainingPlanWorkbenchSignalSummaryVO } from '@/apis/quality/workbench'
import { workbenchApi } from '@/apis/quality/workbench'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { MatrixCell, MatrixCol, MatrixRow } from '@/components/workbench/matrix-types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { professionAlgorithmProfileApi } from '@/apis/quality/profession-algorithm-profile'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import {
  loadBoundedPlanAggregate,
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import ProfessionAlgorithmProfileSelector from '@/components/quality/selectors/ProfessionAlgorithmProfileSelector.vue'
import ProgramSelector from '@/components/quality/selectors/ProgramSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
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
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import MatrixWorkbench from '@/components/workbench/MatrixWorkbench.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useQualityStore } from '@/stores/modules/quality'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import {
  QUALITY_PLAN_GATE_REASON_NO_PLAN,
  QUALITY_PLAN_GATE_REASON_QUERY,
  QUALITY_PLAN_GATE_REASON_UNCONFIRMED,
} from '@/utils/quality-plan-guard'

import { strictEnumLabel } from '@/utils/strict-enum'
import { isWeightSumHealthy } from '@/utils/weight-sum-health'

const objectiveColumns: ColumnsType = [
  { title: '编码', dataIndex: 'objectiveCode', key: 'objectiveCode', width: 80, fixed: 'left' },
  { title: '名称', key: 'objectiveName' },
  { title: '权重和', key: 'weightSum', width: 100 },
  { title: '操作', key: 'actions', width: 120 },
]

const objMappingColumns: ColumnsType = [
  { title: '毕业要求', key: 'requirement', fixed: 'left' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 100 },
  { title: '备注', dataIndex: 'notes', key: 'notes' },
  { title: '操作', key: 'actions', width: 120 },
]

const requirementColumns: ColumnsType = [
  { title: '编码', dataIndex: 'requirementCode', key: 'requirementCode', width: 80, fixed: 'left' },
  { title: '名称', key: 'requirementName' },
  { title: '观测点权重', key: 'indicatorWeightSum', width: 120 },
  { title: '操作', key: 'actions', width: 160 },
]

const indicatorColumns: ColumnsType = [
  { title: '编码', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 80, fixed: 'left' },
  { title: '名称', dataIndex: 'indicatorName', key: 'indicatorName' },
  { title: '权重', dataIndex: 'requirementWeight', key: 'requirementWeight', width: 80 },
  { title: '阈值', dataIndex: 'thresholdValue', key: 'thresholdValue', width: 80 },
  { title: '五育维度', dataIndex: 'civicDimensions', key: 'civicDimensions', width: 160 },
  { title: '操作', key: 'actions', width: 120 },
]

const stdMappingColumns: ColumnsType = [
  { title: '标准条目', key: 'standardItem', fixed: 'left' },
  { title: '标准条款', dataIndex: 'standardClause', key: 'standardClause', width: 180 },
  { title: '覆盖说明', dataIndex: 'coverageNote', key: 'coverageNote' },
  { title: '操作', key: 'actions', width: 120 },
]

const qualityStore = useQualityStore()
const route = useRoute()

const planGateReason = computed(() => {
  const value = route.query[QUALITY_PLAN_GATE_REASON_QUERY]
  return typeof value === 'string' ? value : undefined
})

const planGateStrip = computed(() => {
  if (planGateReason.value === QUALITY_PLAN_GATE_REASON_NO_PLAN) {
    return {
      tone: 'info' as const,
      tag: '未选择',
      title: '未选择培养方案',
      description: '请在上方范围中选择培养方案后再维护目标与毕业要求',
    }
  }
  if (planGateReason.value === QUALITY_PLAN_GATE_REASON_UNCONFIRMED) {
    return {
      tone: 'warning' as const,
      tag: '待确认',
      title: '培养方案待确认',
      description: '未确认前不可作为达成度与正式报告底座；请核对体系后提交确认',
    }
  }
  return null
})

const WORKBENCH_TABLE_PAGE_SIZE = 20

const currentPlan = ref<TrainingPlanVO | null>(null)
const planLoading = ref(false)

async function loadCurrentPlan() {
  const scope = beginQualityScopeRequest()
  const planId = qualityStore.currentTrainingPlanId
  if (!planId) {
    currentPlan.value = null
    return
  }
  planLoading.value = true
  try {
    const detail = await trainingPlanApi.detail(planId)
    if (scope.isStale()) {
      return
    }
    currentPlan.value = detail
  } catch (error) {
    if (!scope.isStale()) {
      currentPlan.value = null
      showUserError(error, '培养方案详情加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      planLoading.value = false
    }
  }
}

const objectives = ref<TrainingObjectiveVO[]>([])
const objectivesLoading = ref(false)
const objectivePageNum = ref(1)
const objectivePageSize = ref(WORKBENCH_TABLE_PAGE_SIZE)
const objectiveTotal = ref(0)
const selectedObjective = ref<TrainingObjectiveVO | null>(null)

async function loadObjectives() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentTrainingPlanId) {
    objectives.value = []
    objectiveTotal.value = 0
    return
  }
  objectivesLoading.value = true
  try {
    const page = await trainingObjectiveApi.page({
      pageNum: objectivePageNum.value,
      pageSize: objectivePageSize.value,
      trainingPlanId: qualityStore.currentTrainingPlanId,
    })
    if (scope.isStale()) {
      return
    }
    objectives.value = page.list
    objectiveTotal.value = page.total
    if (selectedObjective.value) {
      const matched = objectives.value.find((o) => o.id === selectedObjective.value!.id)
      selectedObjective.value = matched || objectives.value[0] || null
    } else if (objectives.value.length) {
      selectedObjective.value = objectives.value[0]
    }
  } catch (error) {
    if (!scope.isStale()) {
      objectives.value = []
      objectiveTotal.value = 0
      showUserError(error, '培养目标列表加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      objectivesLoading.value = false
    }
  }
}

function handleObjectivePageChange(page: { current: number; pageSize: number }) {
  objectivePageNum.value = page.current
  objectivePageSize.value = page.pageSize
  void loadObjectives()
}

const requirements = ref<GraduationRequirementVO[]>([])
const requirementsLoading = ref(false)
const requirementPageNum = ref(1)
const requirementPageSize = ref(WORKBENCH_TABLE_PAGE_SIZE)
const requirementTotal = ref(0)
const selectedRequirement = ref<GraduationRequirementVO | null>(null)

async function loadRequirements() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentTrainingPlanId) {
    requirements.value = []
    requirementTotal.value = 0
    return
  }
  requirementsLoading.value = true
  try {
    const page = await graduationRequirementApi.page({
      pageNum: requirementPageNum.value,
      pageSize: requirementPageSize.value,
      trainingPlanId: qualityStore.currentTrainingPlanId,
    })
    if (scope.isStale()) {
      return
    }
    requirements.value = page.list
    requirementTotal.value = page.total
    if (selectedRequirement.value) {
      const matched = requirements.value.find((r) => r.id === selectedRequirement.value!.id)
      selectedRequirement.value = matched || requirements.value[0] || null
    } else if (requirements.value.length) {
      selectedRequirement.value = requirements.value[0]
    }
  } catch (error) {
    if (!scope.isStale()) {
      requirements.value = []
      requirementTotal.value = 0
      showUserError(error, '毕业要求列表加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      requirementsLoading.value = false
    }
  }
}

function handleRequirementPageChange(page: { current: number; pageSize: number }) {
  requirementPageNum.value = page.current
  requirementPageSize.value = page.pageSize
  void loadRequirements()
}

const planLevelIndicators = ref<RequirementIndicatorVO[]>([])
const selectedIndicators = ref<RequirementIndicatorVO[]>([])
const indicatorsLoading = ref(false)
const indicatorPageNum = ref(1)
const indicatorPageSize = ref(WORKBENCH_TABLE_PAGE_SIZE)
const indicatorTotal = ref(0)

async function loadPlanLevelIndicators() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentTrainingPlanId) {
    planLevelIndicators.value = []
    return
  }
  try {
    const indicators = await loadBoundedPlanAggregate(
      (pageNum, pageSize) =>
        requirementIndicatorApi.page({
          pageNum,
          pageSize,
          trainingPlanId: qualityStore.currentTrainingPlanId!,
        }),
      '毕业要求观测点',
    )
    if (scope.isStale()) {
      return
    }
    planLevelIndicators.value = indicators
  } catch (e) {
    showUserError(e, '观测点聚合加载失败')
    planLevelIndicators.value = []
  }
}

async function loadSelectedRequirementIndicators() {
  const scope = beginQualityScopeRequest()
  if (!selectedRequirement.value) {
    selectedIndicators.value = []
    indicatorTotal.value = 0
    return
  }
  indicatorsLoading.value = true
  try {
    const page = await requirementIndicatorApi.page({
      pageNum: indicatorPageNum.value,
      pageSize: indicatorPageSize.value,
      graduationRequirementId: selectedRequirement.value.id,
    })
    if (scope.isStale()) {
      return
    }
    selectedIndicators.value = page.list
    indicatorTotal.value = page.total
  } catch (error) {
    if (!scope.isStale()) {
      selectedIndicators.value = []
      indicatorTotal.value = 0
      showUserError(error, '观测点列表加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      indicatorsLoading.value = false
    }
  }
}

function handleIndicatorPageChange(page: { current: number; pageSize: number }) {
  indicatorPageNum.value = page.current
  indicatorPageSize.value = page.pageSize
  void loadSelectedRequirementIndicators()
}

watch(selectedRequirement, () => {
  indicatorPageNum.value = 1
  stdMappingPageNum.value = 1
  void loadSelectedRequirementIndicators()
  void loadStandardMappings()
})

const planLevelMappings = ref<TrainingObjectiveRequirementVO[]>([])
const objectiveRequirementMappings = ref<TrainingObjectiveRequirementVO[]>([])
const mappingLoading = ref(false)
const objMappingPageNum = ref(1)
const objMappingPageSize = ref(WORKBENCH_TABLE_PAGE_SIZE)
const objMappingTotal = ref(0)

async function loadPlanLevelMappings() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentTrainingPlanId) {
    planLevelMappings.value = []
    return
  }
  try {
    const mappings = await loadBoundedPlanAggregate(
      (pageNum, pageSize) =>
        trainingObjectiveRequirementApi.page({
          pageNum,
          pageSize,
          trainingPlanId: qualityStore.currentTrainingPlanId!,
        }),
      '培养目标支撑映射',
    )
    if (scope.isStale()) {
      return
    }
    planLevelMappings.value = mappings
  } catch (e) {
    showUserError(e, '支撑映射聚合加载失败')
    planLevelMappings.value = []
  }
}

async function loadObjectiveRequirementMappings() {
  const scope = beginQualityScopeRequest()
  if (!selectedObjective.value) {
    objectiveRequirementMappings.value = []
    objMappingTotal.value = 0
    return
  }
  mappingLoading.value = true
  try {
    const page = await trainingObjectiveRequirementApi.page({
      pageNum: objMappingPageNum.value,
      pageSize: objMappingPageSize.value,
      trainingObjectiveId: selectedObjective.value.id,
    })
    if (scope.isStale()) {
      return
    }
    objectiveRequirementMappings.value = page.list
    objMappingTotal.value = page.total
  } catch (error) {
    if (!scope.isStale()) {
      objectiveRequirementMappings.value = []
      objMappingTotal.value = 0
      showUserError(error, '培养目标支撑映射加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      mappingLoading.value = false
    }
  }
}

function handleObjMappingPageChange(page: { current: number; pageSize: number }) {
  objMappingPageNum.value = page.current
  objMappingPageSize.value = page.pageSize
  void loadObjectiveRequirementMappings()
}

watch(selectedObjective, () => {
  objMappingPageNum.value = 1
  void loadObjectiveRequirementMappings()
})

const mappingsOfSelectedObjective = computed<TrainingObjectiveRequirementVO[]>(
  () => objectiveRequirementMappings.value,
)

const objectiveWeightSum = computed(() => {
  if (!selectedObjective.value) return 0
  return planLevelMappings.value
    .filter((m) => m.trainingObjectiveId === selectedObjective.value!.id)
    .reduce((acc, m) => acc + (Number(m.weight) || 0), 0)
})

const objectiveWeightHealthy = computed(() => isWeightSumHealthy(objectiveWeightSum.value))

function objectiveMappingSum(objectiveId: string): number {
  return planLevelMappings.value
    .filter((m) => m.trainingObjectiveId === objectiveId)
    .reduce((acc, m) => acc + (Number(m.weight) || 0), 0)
}

const standardMappings = ref<RequirementStandardMappingVO[]>([])
const standardMappingsLoading = ref(false)
const stdMappingPageNum = ref(1)
const stdMappingPageSize = ref(WORKBENCH_TABLE_PAGE_SIZE)
const stdMappingTotal = ref(0)
const standardOptions = ref<AccreditationStandardVO[]>([])

async function loadStandardOptions(keyword?: string) {
  const scope = beginQualityScopeRequest()
  try {
    const page = await accreditationStandardApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      enabled: true,
      keyword: keyword?.trim() || undefined,
    })
    if (scope.isStale()) {
      return
    }
    standardOptions.value = page.list
  } catch (error) {
    if (!scope.isStale()) {
      standardOptions.value = []
      showUserError(error, '认证标准选项加载失败')
    }
  }
}

let standardOptionSearchTimer: ReturnType<typeof setTimeout> | null = null
function handleStandardOptionSearch(keyword: string) {
  if (standardOptionSearchTimer) clearTimeout(standardOptionSearchTimer)
  standardOptionSearchTimer = setTimeout(
    () => void loadStandardOptions(keyword),
    QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
  )
}

async function loadStandardMappings() {
  const scope = beginQualityScopeRequest()
  if (!selectedRequirement.value) {
    standardMappings.value = []
    stdMappingTotal.value = 0
    return
  }
  standardMappingsLoading.value = true
  try {
    const page = await requirementStandardMappingApi.page({
      pageNum: stdMappingPageNum.value,
      pageSize: stdMappingPageSize.value,
      graduationRequirementId: selectedRequirement.value.id,
    })
    if (scope.isStale()) {
      return
    }
    standardMappings.value = page.list
    stdMappingTotal.value = page.total
  } catch (error) {
    if (!scope.isStale()) {
      standardMappings.value = []
      stdMappingTotal.value = 0
      showUserError(error, '标准映射列表加载失败')
    }
  } finally {
    if (!scope.isStale()) {
      standardMappingsLoading.value = false
    }
  }
}

function handleStdMappingPageChange(page: { current: number; pageSize: number }) {
  stdMappingPageNum.value = page.current
  stdMappingPageSize.value = page.pageSize
  void loadStandardMappings()
}

const standardMap = computed(() => {
  const map = new Map<string, AccreditationStandardVO>()
  standardOptions.value.forEach((s) => map.set(s.id, s))
  return map
})

function indicatorWeightSumByReq(reqId: string): number {
  return planLevelIndicators.value
    .filter((i) => i.requirementId === reqId)
    .reduce((acc, i) => acc + (Number(i.requirementWeight) || 0), 0)
}

const requirementsHealthy = computed(() => {
  if (requirements.value.length === 0) return 0
  return requirements.value.filter((r) => isWeightSumHealthy(indicatorWeightSumByReq(r.id))).length
})

const objectivesHealthy = computed(() => {
  if (objectives.value.length === 0) return 0
  return objectives.value.filter((o) => isWeightSumHealthy(objectiveMappingSum(o.id))).length
})

const totalIndicators = computed(() => planLevelIndicators.value.length)

const planConfirmationStatus = computed<ConfirmationStatusCode | undefined>(() => {
  return currentPlan.value?.confirmationStatus
})

const canSubmitPlan = computed(
  () =>
    !!currentPlan.value &&
    (planConfirmationStatus.value === ConfirmationStatusCode.DRAFT ||
      planConfirmationStatus.value === ConfirmationStatusCode.RETURNED),
)

const isPlanStructureEditable = computed(
  () =>
    !!currentPlan.value &&
    planConfirmationStatus.value !== ConfirmationStatusCode.SUBMITTED &&
    planConfirmationStatus.value !== ConfirmationStatusCode.CONFIRMED,
)

/**
 * 体系搭建阶段：按认证工作流只暴露当前阶段主行动，避免页头「新建/编辑/院审/删除」并陈。
 * 阶段语义：选方案 → 建目标 → 映射毕业要求 → 建观测点 → 权重健康后提交院审。
 */
type PlanBuildStageKey =
  | 'select_plan'
  | 'build_objectives'
  | 'map_requirements'
  | 'build_indicators'
  | 'ready_submit'
  | 'awaiting_review'
  | 'confirmed'

const planBuildStage = computed((): PlanBuildStageKey => {
  if (!qualityStore.currentTrainingPlanId || !currentPlan.value) {
    return 'select_plan'
  }
  const status = planConfirmationStatus.value
  if (status === ConfirmationStatusCode.CONFIRMED) {
    return 'confirmed'
  }
  if (status === ConfirmationStatusCode.SUBMITTED) {
    return 'awaiting_review'
  }
  if (objectives.value.length === 0) {
    return 'build_objectives'
  }
  if (objectivesHealthy.value < objectives.value.length || requirements.value.length === 0) {
    return 'map_requirements'
  }
  if (totalIndicators.value === 0 || requirementsHealthy.value < requirements.value.length) {
    return 'build_indicators'
  }
  return 'ready_submit'
})

const planStageGuidance = computed(() => {
  switch (planBuildStage.value) {
    case 'select_plan':
      return {
        tone: 'info' as const,
        title: '当前阶段：选择或新建培养方案',
        description: '在页头范围选择已有方案，或点击「新建方案」后维护目标—毕业要求—观测点体系。',
      }
    case 'build_objectives':
      return {
        tone: 'warning' as const,
        title: '当前阶段：维护培养目标',
        description: '先新增培养目标，再配置目标到毕业要求的映射权重（各目标权重和须为 1）。',
      }
    case 'map_requirements':
      return {
        tone: 'warning' as const,
        title: '当前阶段：完善目标→毕业要求映射',
        description:
          requirements.value.length === 0
            ? '尚无毕业要求：请切换到「② 毕业要求」页签新建，并回本页完成权重映射。'
            : '仍有目标映射权重未健康，或毕业要求未齐套；请补齐映射后再进入观测点阶段。',
      }
    case 'build_indicators':
      return {
        tone: 'warning' as const,
        title: '当前阶段：维护观测点与标准条款',
        description: '在「② 毕业要求」页签为每条毕业要求拆分观测点，并保证观测点权重和为 1。',
      }
    case 'ready_submit':
      return {
        tone: 'success' as const,
        title: '当前阶段：提交院审',
        description:
          '目标 / 毕业要求 / 观测点权重已就绪，请核对后提交学院确认，方可进入达成度与正式报告。',
      }
    case 'awaiting_review':
      return {
        tone: 'info' as const,
        title: '当前阶段：等待院审确认',
        description: '方案已提交，体系结构已锁定；待学院确认人审核通过后可进入达成度计算。',
      }
    case 'confirmed':
      return {
        tone: 'success' as const,
        title: '培养方案已确认',
        description: '确认态不可再改结构；若需修订请按业务流程撤回后再编辑。',
      }
    default:
      return null
  }
})

const showPlanMoreActions = ref(false)

function focusPlanStageWorkbench(): void {
  if (
    planBuildStage.value === 'build_indicators' ||
    (planBuildStage.value === 'map_requirements' && requirements.value.length === 0)
  ) {
    activeTab.value = 'requirement'
    return
  }
  activeTab.value = 'objective'
}

async function runPlanPrimaryStageAction(): Promise<void> {
  switch (planBuildStage.value) {
    case 'select_plan':
      openPlanCreate()
      break
    case 'build_objectives':
      activeTab.value = 'objective'
      openObjectiveCreate()
      break
    case 'map_requirements':
      focusPlanStageWorkbench()
      if (requirements.value.length === 0) {
        openRequirementCreate()
      }
      break
    case 'build_indicators':
      activeTab.value = 'requirement'
      if (requirements.value.length > 0 && !selectedRequirement.value) {
        selectedRequirement.value = requirements.value[0] ?? null
      }
      break
    case 'ready_submit':
      await submitPlanForReview()
      break
    default:
      break
  }
}

const planPrimaryStageActionLabel = computed(() => {
  switch (planBuildStage.value) {
    case 'select_plan':
      return '新建方案'
    case 'build_objectives':
      return '新建培养目标'
    case 'map_requirements':
      return requirements.value.length === 0 ? '新建毕业要求' : '去完善映射'
    case 'build_indicators':
      return '去维护观测点'
    case 'ready_submit':
      return '提交院审'
    default:
      return ''
  }
})

const showPlanPrimaryStageAction = computed(
  () =>
    planBuildStage.value !== 'awaiting_review' &&
    planBuildStage.value !== 'confirmed' &&
    !!planPrimaryStageActionLabel.value,
)

function guardPlanStructureEditable(action: string): boolean {
  if (isPlanStructureEditable.value) return true
  void message.error('培养方案已提交院审或确认发布，请先退回或撤回后再' + action)
  return false
}

const signalSummary = ref<TrainingPlanWorkbenchSignalSummaryVO | null>(null)
const activeTab = ref<'objective' | 'requirement'>('objective')

async function loadSignalSummary() {
  if (!qualityStore.currentTrainingPlanId) {
    signalSummary.value = null
    return
  }
  try {
    signalSummary.value = await workbenchApi.trainingPlanWorkbenchSignalSummary({
      trainingPlanId: qualityStore.currentTrainingPlanId,
    })
  } catch (error) {
    signalSummary.value = null
    showUserError(error, '培养方案工作台指标加载失败')
  }
}

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const planStatus = summary.planConfirmationStatus
  const objectiveTotal = summary.objectiveTotal ?? 0
  const requirementTotal = summary.requirementTotal ?? 0
  const objectiveHealthyCount = summary.objectiveHealthyCount ?? 0
  const requirementHealthyCount = summary.requirementHealthyCount ?? 0
  const objectiveHealthOk = objectiveTotal === 0 || objectiveHealthyCount === objectiveTotal
  const requirementHealthOk = requirementTotal === 0 || requirementHealthyCount === requirementTotal
  return [
    {
      key: 'plan',
      label: '当前方案状态',
      value: planStatus
        ? strictEnumLabel(ConfirmationStatusDescription, planStatus, '培养方案确认状态')
        : '未提交',
      tone:
        planStatus === ConfirmationStatusCode.CONFIRMED
          ? 'green'
          : planStatus === ConfirmationStatusCode.RETURNED
            ? 'red'
            : 'orange',
    },
    {
      key: 'objectives',
      label: '培养目标数',
      value: objectiveTotal,
      tone: 'blue',
      clickable: objectiveTotal > 0,
      active: activeTab.value === 'objective',
    },
    {
      key: 'objectivesHealth',
      label: '目标→要求权重健康',
      value: `${objectiveHealthyCount}/${objectiveTotal}`,
      tone: objectiveHealthOk ? 'green' : 'red',
      clickable: !objectiveHealthOk,
      active: activeTab.value === 'objective' && !objectiveHealthOk,
    },
    {
      key: 'requirements',
      label: '毕业要求数',
      value: requirementTotal,
      tone: 'blue',
      clickable: requirementTotal > 0,
      active: activeTab.value === 'requirement',
    },
    {
      key: 'requirementsHealth',
      label: '要求→观测点权重健康',
      value: `${requirementHealthyCount}/${requirementTotal}`,
      tone: requirementHealthOk ? 'green' : 'red',
      clickable: !requirementHealthOk,
      active: activeTab.value === 'requirement' && !requirementHealthOk,
    },
    { key: 'indicators', label: '观测点总数', value: summary.indicatorTotal ?? 0, tone: 'blue' },
    {
      key: 'standardMaps',
      label: '已映射标准条款',
      value: summary.standardMappingTotal ?? 0,
      tone: 'gray',
    },
  ]
})

function handleSignalMetricClick(key: string): void {
  if (key === 'objectives' || key === 'objectivesHealth') {
    activeTab.value = 'objective'
    return
  }
  if (key === 'requirements' || key === 'requirementsHealth') {
    activeTab.value = 'requirement'
  }
}

const objectiveMatrixRows = computed<MatrixRow[]>(() =>
  objectives.value.map((o) => {
    const sum = objectiveMappingSum(o.id)
    const healthy = isWeightSumHealthy(sum)
    return {
      key: o.id,
      label: o.objectiveCode,
      hint: o.objectiveName,
      badge: `Σ=${sum.toFixed(3)}`,
      badgeTone: healthy ? 'green' : 'red',
      warning: healthy
        ? undefined
        : objectives.value.length > 0 && sum === 0
          ? '未映射任何毕业要求'
          : '权重和≠1',
    }
  }),
)

const objectiveMatrixCols = computed<MatrixCol[]>(() =>
  requirements.value.map((r) => ({
    key: r.id,
    label: r.requirementCode,
    hint: r.requirementName,
    width: 130,
  })),
)

const objectiveMatrixCells = computed<MatrixCell[]>(() => {
  return objectiveRequirementMappings.value.map((m) => {
    const w = Number(m.weight) || 0
    let tone: MatrixCell['tone']
    if (w >= 0.5) tone = 'green'
    else if (w >= 0.2) tone = 'blue'
    else tone = 'gray'
    return {
      rowKey: m.trainingObjectiveId,
      colKey: m.graduationRequirementId,
      primary: w.toFixed(2),
      secondary: m.notes || undefined,
      tone,
    }
  })
})

const planEditorVisible = ref(false)
const planEditorMode = ref<'create' | 'edit'>('create')
const planEditor = reactive<TrainingPlanSaveRequest>({
  programId: '',
  planCode: '',
  planName: '',
  schoolYear: '',
  gradeLevel: '',
  description: '',
  accreditationProfileId: '',
  storageFileId: '',
  enabled: true,
})
const planSubmitting = ref(false)
const planFileName = ref('')

async function openPlanCreate() {
  planEditorMode.value = 'create'
  let defaultAccreditationProfileId = ''
  if (qualityStore.currentProgramId) {
    try {
      const activeProfile = await professionAlgorithmProfileApi.activeByProgram(
        qualityStore.currentProgramId,
      )
      defaultAccreditationProfileId = activeProfile?.id ?? ''
    } catch (error) {
      defaultAccreditationProfileId = ''
      showUserError(error, '当前专业认证配置加载失败')
    }
  }
  Object.assign(planEditor, {
    id: undefined,
    programId: qualityStore.currentProgramId,
    planCode: '',
    planName: '',
    schoolYear: '',
    gradeLevel: '',
    description: '',
    accreditationProfileId: defaultAccreditationProfileId,
    storageFileId: '',
    enabled: true,
  })
  planFileName.value = ''
  planEditorVisible.value = true
}

function openPlanEdit() {
  if (!currentPlan.value || !guardPlanStructureEditable('编辑方案')) return
  planEditorMode.value = 'edit'
  Object.assign(planEditor, {
    id: currentPlan.value.id,
    programId: currentPlan.value.programId,
    planCode: currentPlan.value.planCode,
    planName: currentPlan.value.planName,
    schoolYear: currentPlan.value.schoolYear,
    gradeLevel: currentPlan.value.gradeLevel || '',
    description: currentPlan.value.description || '',
    accreditationProfileId: currentPlan.value.accreditationProfileId || '',
    storageFileId: currentPlan.value.storageFileId || '',
    enabled: currentPlan.value.enabled,
  })
  planFileName.value = currentPlan.value.storageFileId ? '已关联方案附件' : ''
  planEditorVisible.value = true
}

async function submitPlan() {
  if (planEditorMode.value === 'edit' && !guardPlanStructureEditable('编辑方案')) return
  if (
    !planEditor.programId.trim() ||
    !planEditor.planCode.trim() ||
    !planEditor.planName.trim() ||
    !planEditor.schoolYear.trim()
  ) {
    void message.error('请选择专业，并填写方案编码、方案名称和入学学年')
    return
  }
  planSubmitting.value = true
  try {
    const request: TrainingPlanSaveRequest = {
      id: planEditor.id,
      programId: planEditor.programId,
      planCode: planEditor.planCode.trim(),
      planName: planEditor.planName.trim(),
      schoolYear: planEditor.schoolYear.trim(),
      gradeLevel: planEditor.gradeLevel?.trim() || undefined,
      description: planEditor.description?.trim() || undefined,
      accreditationProfileId: planEditor.accreditationProfileId || undefined,
      storageFileId: planEditor.storageFileId || undefined,
      enabled: planEditor.enabled,
    }
    if (planEditorMode.value === 'create') {
      const newId = await trainingPlanApi.create(request)
      void message.success('培养方案已创建')
      qualityStore.setTrainingPlan(newId)
      await qualityStore.loadTrainingPlanOptions({ programId: planEditor.programId })
    } else {
      await trainingPlanApi.update(request)
      void message.success('培养方案已更新')
    }
    planEditorVisible.value = false
    await loadCurrentPlan()
  } finally {
    planSubmitting.value = false
  }
}

async function submitPlanForReview() {
  if (!currentPlan.value || !canSubmitPlan.value) return
  const plan = currentPlan.value
  void confirmAsync({
    title: `提交培养方案 ${plan.planCode} 进入院审？`,
    content:
      '提交后将锁定体系结构，待具备发布权限的学院确认人完成审核后才可进入达成度计算和正式报告。',
    type: 'info',
    okText: '提交院审',
    onOk: async () => {
      await trainingPlanApi.submit({ id: plan.id, statusVersion: plan.statusVersion })
      void message.success('培养方案已提交院审')
      await loadCurrentPlan()
      await qualityStore.loadTrainingPlanOptions()
    },
  })
}

async function deletePlan() {
  if (!currentPlan.value || !guardPlanStructureEditable('删除方案')) return
  const planId = currentPlan.value.id
  const planCode = currentPlan.value.planCode
  void confirmAsync({
    title: `删除培养方案 ${planCode}？`,
    content: '将级联删除其下所有培养目标、毕业要求、观测点和支撑映射。请谨慎操作。',
    type: 'error',
    onOk: async () => {
      await trainingPlanApi.delete(planId)
      void message.success('培养方案已删除')
      qualityStore.setTrainingPlan('')
      currentPlan.value = null
      objectives.value = []
      requirements.value = []
      planLevelIndicators.value = []
      objectiveRequirementMappings.value = []
      standardMappings.value = []
      await qualityStore.loadTrainingPlanOptions()
    },
  })
}

/* ========== 编辑器：培养目标 ========== */

const objectiveEditorVisible = ref(false)
const objectiveEditorMode = ref<'create' | 'edit'>('create')
const objectiveEditor = reactive<TrainingObjectiveSaveRequest>({
  trainingPlanId: '',
  objectiveCode: '',
  objectiveName: '',
  description: '',
  sortOrder: 0,
})
const objectiveSubmitting = ref(false)

function openObjectiveCreate() {
  if (!guardPlanStructureEditable('新建培养目标')) return
  if (!qualityStore.currentTrainingPlanId) {
    showFormValidationMessage('请先选择培养方案')
    return
  }
  objectiveEditorMode.value = 'create'
  Object.assign(objectiveEditor, {
    id: undefined,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    objectiveCode: '',
    objectiveName: '',
    description: '',
    sortOrder: (objectives.value.length + 1) * 10,
  })
  objectiveEditorVisible.value = true
}

function openObjectiveEdit(record: TrainingObjectiveVO) {
  if (!guardPlanStructureEditable('编辑培养目标')) return
  objectiveEditorMode.value = 'edit'
  Object.assign(objectiveEditor, {
    id: record.id,
    trainingPlanId: record.trainingPlanId,
    objectiveCode: record.objectiveCode,
    objectiveName: record.objectiveName,
    description: record.description || '',
    sortOrder: record.sortOrder ?? 0,
  })
  objectiveEditorVisible.value = true
}

async function submitObjective() {
  if (!objectiveEditor.objectiveCode.trim() || !objectiveEditor.objectiveName.trim()) {
    void message.error('请填写编码与名称')
    return
  }
  objectiveSubmitting.value = true
  try {
    if (objectiveEditorMode.value === 'create') await trainingObjectiveApi.create(objectiveEditor)
    else await trainingObjectiveApi.update(objectiveEditor)
    void message.success('培养目标已保存')
    objectiveEditorVisible.value = false
    await loadObjectives()
  } finally {
    objectiveSubmitting.value = false
  }
}

async function deleteObjective(record: TrainingObjectiveVO) {
  if (!guardPlanStructureEditable('删除培养目标')) return
  void confirmAsync({
    title: `删除培养目标 ${record.objectiveCode}？`,
    content: '将级联删除其下所有"目标→毕业要求"权重映射。',
    type: 'error',
    onOk: async () => {
      await trainingObjectiveApi.delete(record.id)
      void message.success('培养目标已删除')
      if (selectedObjective.value?.id === record.id) selectedObjective.value = null
      await Promise.all([loadObjectives(), loadObjectiveRequirementMappings()])
    },
  })
}

/* ========== 编辑器：目标→要求映射 ========== */

const objMappingEditorVisible = ref(false)
const objMappingEditorMode = ref<'create' | 'edit'>('create')
const objMappingEditor = reactive<TrainingObjectiveRequirementSaveRequest>({
  trainingObjectiveId: '',
  graduationRequirementId: '',
  weight: 0,
  sortOrder: 0,
  notes: '',
})
const objMappingSubmitting = ref(false)
const objMappingEditingId = ref<string | undefined>(undefined)

function openObjMappingCreate() {
  if (!guardPlanStructureEditable('新增映射')) return
  if (!selectedObjective.value) return
  if (requirements.value.length === 0) {
    void message.warning('当前方案下没有毕业要求，请先在「毕业要求与观测点」页签创建')
    return
  }
  objMappingEditorMode.value = 'create'
  objMappingEditingId.value = undefined
  const remain = Math.max(0, 1 - objectiveWeightSum.value)
  Object.assign(objMappingEditor, {
    id: undefined,
    trainingObjectiveId: selectedObjective.value.id,
    graduationRequirementId: '',
    weight: Number(remain.toFixed(3)),
    sortOrder: (mappingsOfSelectedObjective.value.length + 1) * 10,
    notes: '',
  })
  objMappingEditorVisible.value = true
}

function openObjMappingEdit(record: TrainingObjectiveRequirementVO) {
  if (!guardPlanStructureEditable('编辑映射')) return
  objMappingEditorMode.value = 'edit'
  objMappingEditingId.value = record.id
  Object.assign(objMappingEditor, {
    id: record.id,
    trainingObjectiveId: record.trainingObjectiveId,
    graduationRequirementId: record.graduationRequirementId,
    weight: Number(record.weight) || 0,
    sortOrder: record.sortOrder ?? 0,
    notes: record.notes || '',
  })
  objMappingEditorVisible.value = true
}

function handleObjectiveRequirementCellClick(cellEvent: {
  row: MatrixRow
  col: MatrixCol
  cell: MatrixCell | undefined
}): void {
  if (!guardPlanStructureEditable('维护映射')) return
  const objective = objectives.value.find((item) => item.id === cellEvent.row.key)
  if (!objective) return
  selectedObjective.value = objective

  if (cellEvent.cell) {
    const mapping = objectiveRequirementMappings.value.find(
      (item) =>
        item.trainingObjectiveId === cellEvent.row.key &&
        item.graduationRequirementId === cellEvent.col.key,
    )
    if (mapping) openObjMappingEdit(mapping)
    return
  }

  objMappingEditorMode.value = 'create'
  objMappingEditingId.value = undefined
  Object.assign(objMappingEditor, {
    id: undefined,
    trainingObjectiveId: cellEvent.row.key,
    graduationRequirementId: cellEvent.col.key,
    weight: 0,
    sortOrder: (mappingsOfSelectedObjective.value.length + 1) * 10,
    notes: '',
  })
  objMappingEditorVisible.value = true
}

async function submitObjMapping() {
  if (!objMappingEditor.graduationRequirementId) {
    void message.error('请选择毕业要求')
    return
  }
  if (
    objMappingEditor.weight == null ||
    objMappingEditor.weight < 0 ||
    objMappingEditor.weight > 1
  ) {
    void message.error('权重必须在 0~1 之间')
    return
  }
  objMappingSubmitting.value = true
  try {
    if (objMappingEditorMode.value === 'create')
      await trainingObjectiveRequirementApi.create(objMappingEditor)
    else await trainingObjectiveRequirementApi.update(objMappingEditor)
    void message.success('映射已保存')
    objMappingEditorVisible.value = false
    await Promise.all([loadPlanLevelMappings(), loadObjectiveRequirementMappings()])
  } finally {
    objMappingSubmitting.value = false
  }
}

async function deleteObjMapping(record: TrainingObjectiveRequirementVO) {
  if (!guardPlanStructureEditable('删除映射')) return
  void confirmAsync({
    title: '删除该映射？',
    type: 'error',
    onOk: async () => {
      await trainingObjectiveRequirementApi.delete(record.id)
      void message.success('已删除')
      await Promise.all([loadPlanLevelMappings(), loadObjectiveRequirementMappings()])
    },
  })
}

/* ========== 编辑器：毕业要求 ========== */

const requirementEditorVisible = ref(false)
const requirementEditorMode = ref<'create' | 'edit'>('create')
const requirementEditor = reactive<GraduationRequirementSaveRequest>({
  trainingPlanId: '',
  requirementCode: '',
  requirementName: '',
  description: '',
  civicDimensions: [],
  thresholdValue: 0.7,
  aggregation: AggregationFunctionCode.WEIGHTED_SUM,
  sortOrder: 0,
})
const requirementSubmitting = ref(false)

function openRequirementCreate() {
  if (!guardPlanStructureEditable('新建毕业要求')) return
  if (!qualityStore.currentTrainingPlanId) {
    showFormValidationMessage('请先选择培养方案')
    return
  }
  requirementEditorMode.value = 'create'
  Object.assign(requirementEditor, {
    id: undefined,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    requirementCode: '',
    requirementName: '',
    description: '',
    civicDimensions: [],
    thresholdValue: 0.7,
    aggregation: AggregationFunctionCode.WEIGHTED_SUM,
    sortOrder: (requirements.value.length + 1) * 10,
  })
  requirementEditorVisible.value = true
}

function openRequirementEdit(record: GraduationRequirementVO) {
  if (!guardPlanStructureEditable('编辑毕业要求')) return
  requirementEditorMode.value = 'edit'
  Object.assign(requirementEditor, {
    id: record.id,
    trainingPlanId: record.trainingPlanId,
    requirementCode: record.requirementCode,
    requirementName: record.requirementName,
    description: record.description || '',
    civicDimensions: record.civicDimensions ?? [],
    thresholdValue: record.thresholdValue ?? 0.7,
    aggregation: record.aggregation,
    sortOrder: record.sortOrder ?? 0,
  })
  requirementEditorVisible.value = true
}

async function submitRequirement() {
  if (!requirementEditor.requirementCode.trim() || !requirementEditor.requirementName.trim()) {
    void message.error('请填写编码与名称')
    return
  }
  requirementSubmitting.value = true
  try {
    if (requirementEditorMode.value === 'create')
      await graduationRequirementApi.create(requirementEditor)
    else await graduationRequirementApi.update(requirementEditor)
    void message.success('毕业要求已保存')
    requirementEditorVisible.value = false
    await loadRequirements()
    await Promise.all([loadPlanLevelIndicators(), loadSelectedRequirementIndicators()])
  } finally {
    requirementSubmitting.value = false
  }
}

async function deleteRequirement(record: GraduationRequirementVO) {
  if (!guardPlanStructureEditable('删除毕业要求')) return
  void confirmAsync({
    title: `删除毕业要求 ${record.requirementCode}？`,
    content: '将级联删除其下所有观测点、培养目标映射和标准条款映射。',
    type: 'error',
    onOk: async () => {
      await graduationRequirementApi.delete(record.id)
      void message.success('毕业要求已删除')
      if (selectedRequirement.value?.id === record.id) selectedRequirement.value = null
      await Promise.all([
        loadRequirements(),
        Promise.all([loadPlanLevelIndicators(), loadSelectedRequirementIndicators()]),
        loadObjectiveRequirementMappings(),
        loadStandardMappings(),
      ])
    },
  })
}

/* ========== 编辑器：观测点 ========== */

const indicatorEditorVisible = ref(false)
const indicatorEditorMode = ref<'create' | 'edit'>('create')
const indicatorEditor = reactive<RequirementIndicatorSaveRequest>({
  requirementId: '',
  indicatorCode: '',
  indicatorName: '',
  description: '',
  requirementWeight: 0,
  thresholdValue: 0.7,
  civicDimensions: [],
  sortOrder: 0,
})
const indicatorSubmitting = ref(false)

function openIndicatorCreate() {
  if (!guardPlanStructureEditable('新增观测点')) return
  if (!selectedRequirement.value) return
  indicatorEditorMode.value = 'create'
  const sumNow = indicatorWeightSumByReq(selectedRequirement.value.id)
  const remain = Math.max(0, 1 - sumNow)
  Object.assign(indicatorEditor, {
    id: undefined,
    requirementId: selectedRequirement.value.id,
    indicatorCode: '',
    indicatorName: '',
    description: '',
    requirementWeight: Number(remain.toFixed(3)),
    thresholdValue: selectedRequirement.value.thresholdValue ?? 0.7,
    civicDimensions: [],
    sortOrder: (selectedIndicators.value.length + 1) * 10,
  })
  indicatorEditorVisible.value = true
}

function openIndicatorEdit(record: RequirementIndicatorVO) {
  if (!guardPlanStructureEditable('编辑观测点')) return
  indicatorEditorMode.value = 'edit'
  Object.assign(indicatorEditor, {
    id: record.id,
    requirementId: record.requirementId,
    indicatorCode: record.indicatorCode,
    indicatorName: record.indicatorName,
    description: record.description || '',
    requirementWeight: Number(record.requirementWeight) || 0,
    thresholdValue: record.thresholdValue ?? 0.7,
    civicDimensions: record.civicDimensions ?? [],
    sortOrder: record.sortOrder ?? 0,
  })
  indicatorEditorVisible.value = true
}

async function submitIndicator() {
  if (!indicatorEditor.indicatorCode.trim() || !indicatorEditor.indicatorName.trim()) {
    void message.error('请填写编码与名称')
    return
  }
  if (
    indicatorEditor.requirementWeight == null ||
    indicatorEditor.requirementWeight <= 0 ||
    indicatorEditor.requirementWeight > 1
  ) {
    void message.error('观测点权重必须在 (0, 1] 之间')
    return
  }
  indicatorSubmitting.value = true
  try {
    if (indicatorEditorMode.value === 'create')
      await requirementIndicatorApi.create(indicatorEditor)
    else await requirementIndicatorApi.update(indicatorEditor)
    void message.success('观测点已保存')
    indicatorEditorVisible.value = false
    await Promise.all([loadPlanLevelIndicators(), loadSelectedRequirementIndicators()])
  } finally {
    indicatorSubmitting.value = false
  }
}

async function deleteIndicator(record: RequirementIndicatorVO) {
  if (!guardPlanStructureEditable('删除观测点')) return
  void confirmAsync({
    title: `删除观测点 ${record.indicatorCode}？`,
    type: 'error',
    onOk: async () => {
      await requirementIndicatorApi.delete(record.id)
      void message.success('观测点已删除')
      await Promise.all([loadPlanLevelIndicators(), loadSelectedRequirementIndicators()])
    },
  })
}

async function validateIndicatorWeights(req: GraduationRequirementVO) {
  await requirementIndicatorApi.validateWeights(req.id)
  void message.success(`毕业要求 ${req.requirementCode} 的观测点权重和校验通过`)
}

/* ========== 编辑器：标准条款映射 ========== */

const stdEditorVisible = ref(false)
const stdEditorMode = ref<'create' | 'edit'>('create')
const stdEditor = reactive<RequirementStandardMappingSaveRequest>({
  requirementId: '',
  standardId: '',
  standardClause: '',
  coverageNote: '',
})

function openStdMappingCreate() {
  if (!guardPlanStructureEditable('新增标准映射')) return
  if (!selectedRequirement.value) return
  stdEditorMode.value = 'create'
  Object.assign(stdEditor, {
    id: undefined,
    requirementId: selectedRequirement.value.id,
    standardId: '',
    standardClause: '',
    coverageNote: '',
  })
  stdEditorVisible.value = true
}

function openStdMappingEdit(record: RequirementStandardMappingVO) {
  if (!guardPlanStructureEditable('编辑标准映射')) return
  stdEditorMode.value = 'edit'
  Object.assign(stdEditor, {
    id: record.id,
    requirementId: record.requirementId,
    standardId: record.standardId,
    standardClause: record.standardClause || '',
    coverageNote: record.coverageNote || '',
  })
  stdEditorVisible.value = true
}

async function submitStdMapping() {
  if (!stdEditor.standardId) {
    void message.error('请选择标准条目')
    return
  }
  if (stdEditorMode.value === 'create') await requirementStandardMappingApi.create(stdEditor)
  else await requirementStandardMappingApi.update(stdEditor)
  void message.success('标准映射已保存')
  stdEditorVisible.value = false
  await loadStandardMappings()
}

async function deleteStdMapping(record: RequirementStandardMappingVO) {
  if (!guardPlanStructureEditable('删除标准映射')) return
  void confirmAsync({
    title: '删除该标准条款映射？',
    type: 'error',
    onOk: async () => {
      await requirementStandardMappingApi.delete(record.id)
      void message.success('已删除')
      await loadStandardMappings()
    },
  })
}

function buildObjectiveActions(_record: TrainingObjectiveVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleObjectiveAction(key: string, record: TrainingObjectiveVO): void {
  switch (key) {
    case 'edit':
      openObjectiveEdit(record)
      break
    case 'delete':
      void deleteObjective(record)
      break
  }
}

function buildObjMappingActions(_record: TrainingObjectiveRequirementVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleObjMappingAction(key: string, record: TrainingObjectiveRequirementVO): void {
  switch (key) {
    case 'edit':
      openObjMappingEdit(record)
      break
    case 'delete':
      void deleteObjMapping(record)
      break
  }
}

function buildRequirementActions(_record: GraduationRequirementVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'validate-weights', label: '校验权重' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleRequirementAction(key: string, record: GraduationRequirementVO): void {
  switch (key) {
    case 'edit':
      openRequirementEdit(record)
      break
    case 'validate-weights':
      void validateIndicatorWeights(record)
      break
    case 'delete':
      void deleteRequirement(record)
      break
  }
}

function buildIndicatorActions(_record: RequirementIndicatorVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleIndicatorAction(key: string, record: RequirementIndicatorVO): void {
  switch (key) {
    case 'edit':
      openIndicatorEdit(record)
      break
    case 'delete':
      void deleteIndicator(record)
      break
  }
}

function buildStdMappingActions(_record: RequirementStandardMappingVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleStdMappingAction(key: string, record: RequirementStandardMappingVO): void {
  switch (key) {
    case 'edit':
      openStdMappingEdit(record)
      break
    case 'delete':
      void deleteStdMapping(record)
      break
  }
}

/* ========== 上下文与 Tab 切换 ========== */

async function handleScopeChange(): Promise<void> {
  selectedObjective.value = null
  selectedRequirement.value = null
  await loadCurrentPlan()
  await Promise.all([
    loadObjectives(),
    loadRequirements(),
    loadPlanLevelMappings(),
    loadPlanLevelIndicators(),
    loadObjectiveRequirementMappings(),
    loadSignalSummary(),
  ])
  await loadSelectedRequirementIndicators()
  await loadStandardMappings()
}

useQualityScopedLoader(handleScopeChange, {
  watchScope: true,
  immediate: false,
  reloadOnActivated: false,
})

onMounted(async () => {
  await loadStandardOptions()
  if (qualityStore.currentTrainingPlanId) {
    await handleScopeChange()
  }
})

onActivated(async () => {
  if (qualityStore.currentTrainingPlanId) {
    await loadCurrentPlan()
    await Promise.all([
      loadObjectives(),
      loadRequirements(),
      loadPlanLevelMappings(),
      loadPlanLevelIndicators(),
      loadObjectiveRequirementMappings(),
      loadSelectedRequirementIndicators(),
      loadStandardMappings(),
      loadSignalSummary(),
    ])
  }
})

/* ========== 字典 ========== */

const aggregationOptions = ALL_AGGREGATION_FUNCTION_CODES.map((value) => ({
  value,
  label: strictEnumLabel(AggregationFunctionDescription, value, '聚合函数'),
}))

const civicDimensionOptions: Array<{ value: CivicDimensionCode; label: string }> =
  ALL_CIVIC_DIMENSION_CODES.map((value) => ({
    value,
    label: strictEnumLabel(CivicDimensionDescription, value, '课程思政维度'),
  }))

function handlePlanProgramChange(value: string | null): void {
  planEditor.programId = value ?? ''
  planEditor.accreditationProfileId = ''
}

function handlePlanAccreditationProfileChange(value: string | null): void {
  planEditor.accreditationProfileId = value ?? ''
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="培养方案体系工作台">
        <template #status>
          <span v-if="currentPlan" class="tpw__context-meta">
            学年 {{ currentPlan.schoolYear || '未配置学年' }} · 年级
            {{ currentPlan.gradeLevel || '未配置年级' }}
            <template v-if="currentPlan.accreditationProfileName">
              · 算法实例 {{ currentPlan.accreditationProfileCode }} ·
              {{ currentPlan.accreditationProfileName }}
            </template>
          </span>
        </template>
        <template #actions>
          <UiButton
            v-if="showPlanPrimaryStageAction"
            variant="primary"
            size="sm"
            :disabled="planBuildStage === 'ready_submit' && !canSubmitPlan"
            @click="() => void runPlanPrimaryStageAction()"
          >
            {{ planPrimaryStageActionLabel }}
          </UiButton>
          <UiTextAction @click="showPlanMoreActions = !showPlanMoreActions">
            {{ showPlanMoreActions ? '收起更多' : '更多操作' }}
          </UiTextAction>
          <template v-if="showPlanMoreActions">
            <UiTextAction v-if="planBuildStage !== 'select_plan'" @click="openPlanCreate">
              新建方案
            </UiTextAction>
            <UiButton
              v-if="isPlanStructureEditable"
              variant="outline"
              size="sm"
              @click="openPlanEdit"
            >
              编辑方案
            </UiButton>
            <UiButton
              v-if="planBuildStage !== 'ready_submit' && canSubmitPlan"
              size="sm"
              variant="outline"
              @click="submitPlanForReview"
            >
              提交院审
            </UiButton>
            <UiTextAction v-if="isPlanStructureEditable" tone="danger" @click="deletePlan">
              删除方案
            </UiTextAction>
          </template>
        </template>
      </QualityPageContextBar>
    </template>

    <UiAlertStrip
      v-if="planGateStrip"
      :tone="planGateStrip.tone"
      dense
      inline
      :show-icon="false"
      class="tpw__scope-hint"
    >
      <template #default>
        <span class="tpw__gate-row">
          <UiTag :tone="planGateStrip.tone === 'warning' ? 'orange' : 'blue'" size="sm">
            {{ planGateStrip.tag }}
          </UiTag>
          <span>{{ planGateStrip.description }}</span>
        </span>
      </template>
    </UiAlertStrip>

    <UiAlertStrip
      v-else-if="planStageGuidance"
      :tone="planStageGuidance.tone"
      dense
      inline
      :show-icon="false"
      class="tpw__scope-hint"
    >
      <template #default>
        <span class="tpw__gate-row">
          <UiTag
            :tone="
              planStageGuidance.tone === 'success'
                ? 'green'
                : planStageGuidance.tone === 'warning'
                  ? 'orange'
                  : 'blue'
            "
            size="sm"
          >
            {{ planStageGuidance.title }}
          </UiTag>
          <span>{{ planStageGuidance.description }}</span>
        </span>
      </template>
    </UiAlertStrip>

    <div
      class="tpw__body"
      :class="[{ 'tpw__body--scoped-out': !qualityStore.currentTrainingPlanId }]"
    >
      <SignalBand
        :metrics="signals"
        variant="panel"
        compact
        class="tpw__signals"
        @metric-click="handleSignalMetricClick"
      />

      <div class="tpw__tabs">
        <UiButton
          :variant="activeTab === 'objective' ? 'primary' : 'ghost'"
          size="sm"
          @click="activeTab = 'objective'"
        >
          ① 培养目标 → 毕业要求映射
        </UiButton>
        <UiButton
          :variant="activeTab === 'requirement' ? 'primary' : 'ghost'"
          size="sm"
          @click="activeTab = 'requirement'"
        >
          ② 毕业要求 → 观测点 / 标准条款
        </UiButton>
      </div>

      <!-- Tab 1: 培养目标 -->
      <div v-if="activeTab === 'objective'" class="tpw__tab-content">
        <UiRow :gutter="12">
          <UiCol :span="9">
            <UiCard class="tpw__card">
              <template #title>
                <span>培养目标列表</span>
              </template>
              <template #extra>
                <UiButton variant="primary" size="sm" @click="openObjectiveCreate">
                  新建目标
                </UiButton>
              </template>
              <UiDataTable
                pagination-mode="server"
                :columns="objectiveColumns"
                :data-source="objectives"
                :loading="objectivesLoading"
                row-key="id"
                size="middle"
                v-model:current="objectivePageNum"
                v-model:page-size="objectivePageSize"
                :total="objectiveTotal"
                flat
                :sticky-header="false"
                @page-change="handleObjectivePageChange"
                :row-class-name="
                  (r: TrainingObjectiveVO) =>
                    selectedObjective?.id === r.id ? 'tpw-row-selected' : ''
                "
                :custom-row="
                  (record: TrainingObjectiveVO) => ({
                    onClick: () => (selectedObjective = record),
                    style: 'cursor: pointer',
                  })
                "
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'objectiveName'">
                    {{ record.objectiveName }}
                  </template>
                  <template v-else-if="column.key === 'weightSum'">
                    <UiTag
                      :tone="isWeightSumHealthy(objectiveMappingSum(record.id)) ? 'green' : 'red'"
                    >
                      Σ={{ objectiveMappingSum(record.id).toFixed(3) }}
                    </UiTag>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <UiTableActions
                      :items="buildObjectiveActions(record)"
                      split
                      @action="(key) => handleObjectiveAction(key, record)"
                    />
                  </template>
                </template>
              </UiDataTable>
            </UiCard>
          </UiCol>

          <UiCol :span="15">
            <UiCard v-if="!selectedObjective" class="tpw__card">
              <UiAlertStrip tone="info" size="sm" dense inline :show-icon="false">
                <template #default>
                  <span style="display: inline-flex; align-items: center; gap: 8px">
                    <UiTag tone="blue" size="sm">未选择</UiTag>
                    <span>请在左侧选择条目后再编辑</span>
                  </span>
                </template>
              </UiAlertStrip>
            </UiCard>
            <UiCard v-else class="tpw__card">
              <template #title>
                <span>「{{ selectedObjective.objectiveName }}」支撑毕业要求映射</span>
              </template>
              <template #extra>
                <div class="dp-space" style="--dp-space-gap: 8px">
                  <UiTag :tone="objectiveWeightHealthy ? 'green' : 'red'">
                    权重和：{{ objectiveWeightSum.toFixed(3) }}
                    {{ objectiveWeightHealthy ? '合规' : '需=1' }}
                  </UiTag>
                  <UiButton variant="primary" size="sm" @click="openObjMappingCreate">
                    新增映射
                  </UiButton>
                </div>
              </template>
              <UiDataTable
                pagination-mode="server"
                :columns="objMappingColumns"
                :data-source="mappingsOfSelectedObjective"
                :loading="mappingLoading"
                row-key="id"
                size="middle"
                v-model:current="objMappingPageNum"
                v-model:page-size="objMappingPageSize"
                :total="objMappingTotal"
                flat
                @page-change="handleObjMappingPageChange"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'requirement'">
                    <span class="dp-selector-option-code">
                      {{
                        requirements.find((r) => r.id === record.graduationRequirementId)
                          ?.requirementCode
                      }}
                    </span>
                    {{
                      requirements.find((r) => r.id === record.graduationRequirementId)
                        ?.requirementName
                    }}
                  </template>
                  <template v-else-if="column.key === 'weight'">
                    {{ record.weight.toFixed(3) }}
                  </template>
                  <template v-else-if="column.key === 'notes'">
                    {{ record.notes || '未填写说明' }}
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <UiTableActions
                      :items="buildObjMappingActions(record)"
                      split
                      @action="(key) => handleObjMappingAction(key, record)"
                    />
                  </template>
                </template>
              </UiDataTable>
            </UiCard>
          </UiCol>
        </UiRow>

        <div class="tpw__matrix-block">
          <MatrixWorkbench
            title="培养目标 × 毕业要求 权重矩阵"
            subtitle="单元格 = 权重；空格 = 未映射；点击单元格新增/修改"
            row-header-label="培养目标"
            col-header-label="毕业要求"
            :rows="objectiveMatrixRows"
            :cols="objectiveMatrixCols"
            :cells="objectiveMatrixCells"
            :loading="objectivesLoading || mappingLoading"
            empty-text="尚无培养目标或毕业要求"
            @cell-click="handleObjectiveRequirementCellClick"
          />
        </div>
      </div>

      <!-- Tab 2: 毕业要求与观测点 -->
      <div v-else class="tpw__tab-content">
        <UiRow :gutter="12">
          <UiCol :span="9">
            <UiCard class="tpw__card">
              <template #title>
                <span>毕业要求列表</span>
              </template>
              <template #extra>
                <UiButton variant="primary" size="sm" @click="openRequirementCreate">
                  新建毕业要求
                </UiButton>
              </template>
              <UiDataTable
                pagination-mode="server"
                :columns="requirementColumns"
                :data-source="requirements"
                :loading="requirementsLoading"
                row-key="id"
                size="middle"
                v-model:current="requirementPageNum"
                v-model:page-size="requirementPageSize"
                :total="requirementTotal"
                :sticky-header="false"
                flat
                @page-change="handleRequirementPageChange"
                :row-class-name="
                  (r: GraduationRequirementVO) =>
                    selectedRequirement?.id === r.id ? 'tpw-row-selected' : ''
                "
                :custom-row="
                  (record: GraduationRequirementVO) => ({
                    onClick: () => (selectedRequirement = record),
                    style: 'cursor: pointer',
                  })
                "
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'requirementName'">
                    {{ record.requirementName }}
                  </template>
                  <template v-else-if="column.key === 'indicatorWeightSum'">
                    <UiTag
                      :tone="
                        isWeightSumHealthy(indicatorWeightSumByReq(record.id)) ? 'green' : 'red'
                      "
                    >
                      Σ={{ indicatorWeightSumByReq(record.id).toFixed(3) }}
                    </UiTag>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <UiTableActions
                      :items="buildRequirementActions(record)"
                      split
                      @action="(key) => handleRequirementAction(key, record)"
                    />
                  </template>
                </template>
              </UiDataTable>
            </UiCard>
          </UiCol>

          <UiCol :span="15">
            <UiCard v-if="!selectedRequirement" class="tpw__card">
              <UiAlertStrip tone="info" size="sm" dense inline :show-icon="false">
                <template #default>
                  <span style="display: inline-flex; align-items: center; gap: 8px">
                    <UiTag tone="blue" size="sm">未选择</UiTag>
                    <span>请在左侧选择条目后再编辑</span>
                  </span>
                </template>
              </UiAlertStrip>
            </UiCard>
            <template v-else>
              <UiCard class="tpw__card" style="margin-bottom: 12px">
                <template #title>
                  <span>「{{ selectedRequirement.requirementName }}」观测点</span>
                </template>
                <template #extra>
                  <div class="dp-space" style="--dp-space-gap: 8px">
                    <UiTag
                      :tone="
                        isWeightSumHealthy(indicatorWeightSumByReq(selectedRequirement.id))
                          ? 'green'
                          : 'red'
                      "
                    >
                      权重和：{{ indicatorWeightSumByReq(selectedRequirement.id).toFixed(3) }}
                    </UiTag>
                    <UiButton variant="primary" size="sm" @click="openIndicatorCreate">
                      新增观测点
                    </UiButton>
                  </div>
                </template>
                <UiDataTable
                  pagination-mode="server"
                  :columns="indicatorColumns"
                  :data-source="selectedIndicators"
                  :loading="indicatorsLoading"
                  row-key="id"
                  size="middle"
                  v-model:current="indicatorPageNum"
                  v-model:page-size="indicatorPageSize"
                  :total="indicatorTotal"
                  flat
                  @page-change="handleIndicatorPageChange"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'requirementWeight'">
                      {{ record.requirementWeight.toFixed(3) }}
                    </template>
                    <template v-else-if="column.key === 'thresholdValue'">
                      {{ record.thresholdValue == null ? '-' : record.thresholdValue.toFixed(2) }}
                    </template>
                    <template v-else-if="column.key === 'civicDimensions'">
                      <div class="dp-space dp-space--wrap" style="--dp-space-gap: 8px">
                        <UiTag v-for="d in record.civicDimensions ?? []" :key="d" tone="purple">
                          {{ strictEnumLabel(CivicDimensionDescription, d, '课程思政维度') }}
                        </UiTag>
                        <span v-if="!(record.civicDimensions ?? []).length" class="tpw__muted"
                          >-</span
                        >
                      </div>
                    </template>
                    <template v-else-if="column.key === 'actions'">
                      <UiTableActions
                        :items="buildIndicatorActions(record)"
                        split
                        @action="(key) => handleIndicatorAction(key, record)"
                      />
                    </template>
                  </template>
                </UiDataTable>
              </UiCard>

              <UiCard class="tpw__card">
                <template #title>
                  <span>「{{ selectedRequirement.requirementName }}」对应认证标准条款</span>
                </template>
                <template #extra>
                  <UiButton variant="primary" size="sm" @click="openStdMappingCreate">
                    新增标准映射
                  </UiButton>
                </template>
                <UiDataTable
                  pagination-mode="server"
                  :columns="stdMappingColumns"
                  :data-source="standardMappings"
                  :loading="standardMappingsLoading"
                  row-key="id"
                  size="middle"
                  v-model:current="stdMappingPageNum"
                  v-model:page-size="stdMappingPageSize"
                  :total="stdMappingTotal"
                  flat
                  @page-change="handleStdMappingPageChange"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'standardItem'">
                      <span v-if="standardMap.get(record.standardId)">
                        <span class="dp-selector-option-code">
                          {{ standardMap.get(record.standardId)?.standardCode }}
                        </span>
                        {{ standardMap.get(record.standardId)?.standardName }}
                      </span>
                      <span v-else class="tpw__muted">已关联认证标准</span>
                    </template>
                    <template
                      v-else-if="column.key === 'standardClause' || column.key === 'coverageNote'"
                    >
                      {{
                        column.key === 'standardClause'
                          ? record.standardClause || '未填写标准条款'
                          : record.coverageNote || '未填写覆盖说明'
                      }}
                    </template>
                    <template v-else-if="column.key === 'actions'">
                      <UiTableActions
                        :items="buildStdMappingActions(record)"
                        split
                        @action="(key) => handleStdMappingAction(key, record)"
                      />
                    </template>
                  </template>
                </UiDataTable>
              </UiCard>
            </template>
          </UiCol>
        </UiRow>
      </div>
    </div>

    <!-- 培养方案编辑 Drawer -->
    <UiDrawer
      v-model:open="planEditorVisible"
      :title="planEditorMode === 'create' ? '新建培养方案' : '编辑培养方案'"
      :width="640"
      :confirm-loading="planSubmitting"
      ok-text="保存"
      @ok="submitPlan"
    >
      <UiForm layout="vertical" :model="planEditor">
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="所属专业大类" required>
              <ProgramSelector
                :value="planEditor.programId || null"
                placeholder="请选择 edu-user 专业大类"
                @change="handlePlanProgramChange"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="专业算法实例">
              <ProfessionAlgorithmProfileSelector
                :value="planEditor.accreditationProfileId || null"
                :program-id="planEditor.programId || null"
                :disabled="!planEditor.programId"
                :only-enabled="true"
                placeholder="选定专业后可选；不选则达成度计算回退专业默认实例"
                @change="handlePlanAccreditationProfileChange"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="方案编码" required>
              <UiInput size="sm" v-model="planEditor.planCode" placeholder="如 CSE-2024-V1" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="方案名称" required>
              <UiInput size="sm" v-model="planEditor.planName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="入学学年" required>
              <UiInput size="sm" v-model="planEditor.schoolYear" placeholder="如 2024-2025" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="年级">
              <UiInput size="sm" v-model="planEditor.gradeLevel" placeholder="如 2024 级" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="是否启用">
              <UiSwitch size="sm" v-model="planEditor.enabled" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="方案说明">
          <UiTextarea size="sm" v-model="planEditor.description" :rows="4" />
        </UiFormItem>
        <UiFormItem label="方案附件">
          <UiPlatformFileField
            v-model:file-node-id="planEditor.storageFileId"
            v-model:file-name="planFileName"
            :scene-key="FileUploadSceneKey.QUALITY_TRAINING_PLAN_FILE"
            button-text="上传方案附件"
          />
        </UiFormItem>
      </UiForm>
    </UiDrawer>

    <!-- 培养目标编辑 Modal -->
    <UiDialog
      v-model:open="objectiveEditorVisible"
      :title="objectiveEditorMode === 'create' ? '新建培养目标' : '编辑培养目标'"
      :confirm-loading="objectiveSubmitting"
      width="600px"
      @ok="submitObjective"
    >
      <UiForm layout="vertical" :model="objectiveEditor">
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="编码" required>
              <UiInput size="sm" v-model="objectiveEditor.objectiveCode" placeholder="如 PO1" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="16">
            <UiFormItem label="名称" required>
              <UiInput size="sm" v-model="objectiveEditor.objectiveName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="描述（毕业 5 年职业成就）">
          <UiTextarea size="sm" v-model="objectiveEditor.description" :rows="4" />
        </UiFormItem>
        <UiFormItem label="排序">
          <UiInputNumber
            size="sm"
            v-model="objectiveEditor.sortOrder"
            :min="0"
            style="width: 200px"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- 目标→要求映射编辑 Modal -->
    <UiDialog
      v-model:open="objMappingEditorVisible"
      :title="objMappingEditorMode === 'create' ? '新增「目标→要求」映射' : '编辑「目标→要求」映射'"
      :confirm-loading="objMappingSubmitting"
      width="540px"
      @ok="submitObjMapping"
    >
      <UiForm layout="vertical" :model="objMappingEditor">
        <UiFormItem label="毕业要求" required>
          <UiSelect
            v-model="objMappingEditor.graduationRequirementId"
            placeholder="请选择毕业要求"
            :disabled="objMappingEditorMode === 'edit'"
            size="sm"
            :options="
              requirements.map((r) => ({
                value: r.id,
                label: `${r.requirementCode} · ${r.requirementName}`,
              }))
            "
          />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="权重 (0~1)" required>
              <UiInputNumber
                size="sm"
                v-model="objMappingEditor.weight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="排序">
              <UiInputNumber
                size="sm"
                v-model="objMappingEditor.sortOrder"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="objMappingEditor.notes" :rows="3" />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- 毕业要求编辑 Modal -->
    <UiDialog
      v-model:open="requirementEditorVisible"
      :title="requirementEditorMode === 'create' ? '新建毕业要求' : '编辑毕业要求'"
      :confirm-loading="requirementSubmitting"
      width="700px"
      @ok="submitRequirement"
    >
      <UiForm layout="vertical" :model="requirementEditor">
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="编码" required>
              <UiInput size="sm" v-model="requirementEditor.requirementCode" placeholder="如 GR1" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="18">
            <UiFormItem label="名称" required>
              <UiInput
                size="sm"
                v-model="requirementEditor.requirementName"
                placeholder="如 工程知识"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="描述">
          <UiTextarea
            size="sm"
            v-model="requirementEditor.description"
            :rows="4"
            placeholder="参考工程教育认证 12 条标准（a-l）的官方描述"
          />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="阈值 (0~1)">
              <UiInputNumber
                size="sm"
                v-model="requirementEditor.thresholdValue"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="聚合策略">
              <UiSelect
                size="sm"
                v-model="requirementEditor.aggregation"
                :options="aggregationOptions"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="排序">
              <UiInputNumber
                size="sm"
                v-model="requirementEditor.sortOrder"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="五育维度（多选）">
          <UiSelect
            size="sm"
            mode="multiple"
            v-model="requirementEditor.civicDimensions"
            :options="civicDimensionOptions"
            placeholder="德 智 体 美 劳 维度（如适用）"
            style="width: 100%"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- 观测点编辑 Modal -->
    <UiDialog
      v-model:open="indicatorEditorVisible"
      :title="indicatorEditorMode === 'create' ? '新增观测点' : '编辑观测点'"
      :confirm-loading="indicatorSubmitting"
      :width="640"
      @ok="submitIndicator"
    >
      <UiForm layout="vertical" :model="indicatorEditor">
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="编码" required>
              <UiInput size="sm" v-model="indicatorEditor.indicatorCode" placeholder="如 1.1" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="18">
            <UiFormItem label="名称" required>
              <UiInput size="sm" v-model="indicatorEditor.indicatorName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="描述">
          <UiTextarea size="sm" v-model="indicatorEditor.description" :rows="3" />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="权重 (0~1)" required>
              <UiInputNumber
                size="sm"
                v-model="indicatorEditor.requirementWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="阈值">
              <UiInputNumber
                size="sm"
                v-model="indicatorEditor.thresholdValue"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="排序">
              <UiInputNumber
                size="sm"
                v-model="indicatorEditor.sortOrder"
                :min="0"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="五育维度（多选）">
          <UiSelect
            size="sm"
            mode="multiple"
            v-model="indicatorEditor.civicDimensions"
            :options="civicDimensionOptions"
            placeholder="可选"
            style="width: 100%"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- 标准条款映射编辑 Modal -->
    <UiDialog
      v-model:open="stdEditorVisible"
      :title="stdEditorMode === 'create' ? '新增标准条款映射' : '编辑标准条款映射'"
      width="600px"
      @ok="submitStdMapping"
    >
      <UiForm layout="vertical" :model="stdEditor">
        <UiFormItem label="标准条目" required>
          <UiSelect
            v-model="stdEditor.standardId"
            placeholder="选择已启用的认证标准"
            allow-search
            :filter-option="false"
            @search="handleStandardOptionSearch"
            size="sm"
            :options="
              standardOptions.map((s) => ({
                value: s.id,
                label: `${s.standardCode} · ${s.standardName}`,
              }))
            "
          />
        </UiFormItem>
        <UiFormItem label="标准条款">
          <UiInput size="sm" v-model="stdEditor.standardClause" placeholder="如 §1.3.a" />
        </UiFormItem>
        <UiFormItem label="覆盖说明">
          <UiTextarea size="sm" v-model="stdEditor.coverageNote" :rows="3" />
        </UiFormItem>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.tpw {
  &__context-label {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__context-meta {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__scope-hint {
    margin-bottom: 12px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;

    &--scoped-out {
      opacity: 0.55;
      pointer-events: none;
      user-select: none;
    }
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    padding: 8px 0;
  }

  &__tab-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__card {
    background: var(--dp-surface);
    border-radius: 8px;
  }

  &__matrix-block {
    margin-top: 4px;
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

:deep(.tpw-row-selected) td {
  background-color: var(--dp-color-primary-bg) !important;
}

.text-xs {
  font-size: 12px;
}

.text-gray-500 {
  color: var(--dp-text-tertiary);
}

.mr-1 {
  margin-right: 4px;
}
</style>
