<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
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
import type {
  AccreditationStandardVO,
  CivicDimension,
  ConfirmationStatus,
  GraduationRequirementSaveRequest,
  GraduationRequirementVO,
  RequirementIndicatorSaveRequest,
  RequirementIndicatorVO,
  RequirementStandardMappingSaveRequest,
  RequirementStandardMappingVO,
  TrainingObjectiveRequirementSaveRequest,
  TrainingObjectiveRequirementVO,
  TrainingObjectiveSaveRequest,
  TrainingObjectiveVO,
  TrainingPlanSaveRequest,
  TrainingPlanVO,
} from '@/apis/quality'
import type { MatrixCell, MatrixCol, MatrixRow } from '@/components/workbench'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import {
  accreditationStandardApi,
  AGGREGATION_FUNCTION_LABEL,
  CIVIC_DIMENSION_LABEL,
  CONFIRMATION_STATUS_LABEL,
  graduationRequirementApi,
  requirementIndicatorApi,
  requirementStandardMappingApi,
  trainingObjectiveApi,
  trainingObjectiveRequirementApi,
  trainingPlanApi,
} from '@/apis/quality'
import QualityScopeHeader from '@/components/quality/QualityScopeHeader.vue'
import ProgramEvaluationProfileSelector from '@/components/quality/selectors/ProgramEvaluationProfileSelector.vue'
import ProgramSelector from '@/components/quality/selectors/ProgramSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { ContextBar, MatrixWorkbench, SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityStore } from '@/stores/modules/quality'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

const ACCREDITATION_STANDARD_OPTION_PAGE_SIZE = 100
const objectiveColumns: ColumnsType = [
  { title: '编码', dataIndex: 'objectiveCode', key: 'objectiveCode', width: 80 },
  { title: '名称', key: 'objectiveName' },
  { title: '权重和', key: 'weightSum', width: 100 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const objMappingColumns: ColumnsType = [
  { title: '毕业要求', key: 'requirement' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 100 },
  { title: '备注', dataIndex: 'notes', key: 'notes' },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const requirementColumns: ColumnsType = [
  { title: '编码', dataIndex: 'requirementCode', key: 'requirementCode', width: 80 },
  { title: '名称', key: 'requirementName' },
  { title: '观测点权重', key: 'indicatorWeightSum', width: 120 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const indicatorColumns: ColumnsType = [
  { title: '编码', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 80 },
  { title: '名称', dataIndex: 'indicatorName', key: 'indicatorName' },
  { title: '权重', dataIndex: 'requirementWeight', key: 'requirementWeight', width: 80 },
  { title: '阈值', dataIndex: 'thresholdValue', key: 'thresholdValue', width: 80 },
  { title: '五育维度', dataIndex: 'civicDimensions', key: 'civicDimensions', width: 160 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const stdMappingColumns: ColumnsType = [
  { title: '标准条目', key: 'standardItem' },
  { title: '标准条款', dataIndex: 'standardClause', key: 'standardClause', width: 180 },
  { title: '覆盖说明', dataIndex: 'coverageNote', key: 'coverageNote' },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const qualityStore = useQualityStore()

const WEIGHT_EPSILON = 1e-3

const currentPlan = ref<TrainingPlanVO | null>(null)
const planLoading = ref(false)

async function loadCurrentPlan() {
  const planId = qualityStore.currentTrainingPlanId
  if (!planId) {
    currentPlan.value = null
    return
  }
  planLoading.value = true
  try {
    currentPlan.value = await trainingPlanApi.detail(planId)
  } finally {
    planLoading.value = false
  }
}

const objectives = ref<TrainingObjectiveVO[]>([])
const objectivesLoading = ref(false)
const selectedObjective = ref<TrainingObjectiveVO | null>(null)

async function loadObjectives() {
  if (!qualityStore.currentTrainingPlanId) {
    objectives.value = []
    return
  }
  objectivesLoading.value = true
  try {
    objectives.value = await trainingObjectiveApi.listByPlan(qualityStore.currentTrainingPlanId)
    if (selectedObjective.value) {
      const matched = objectives.value.find((o) => o.id === selectedObjective.value!.id)
      selectedObjective.value = matched || objectives.value[0] || null
    } else if (objectives.value.length) {
      selectedObjective.value = objectives.value[0]
    }
  } finally {
    objectivesLoading.value = false
  }
}

const requirements = ref<GraduationRequirementVO[]>([])
const requirementsLoading = ref(false)
const selectedRequirement = ref<GraduationRequirementVO | null>(null)

async function loadRequirements() {
  if (!qualityStore.currentTrainingPlanId) {
    requirements.value = []
    return
  }
  requirementsLoading.value = true
  try {
    requirements.value = await graduationRequirementApi.listByPlan(
      qualityStore.currentTrainingPlanId,
    )
    if (selectedRequirement.value) {
      const matched = requirements.value.find((r) => r.id === selectedRequirement.value!.id)
      selectedRequirement.value = matched || requirements.value[0] || null
    } else if (requirements.value.length) {
      selectedRequirement.value = requirements.value[0]
    }
  } finally {
    requirementsLoading.value = false
  }
}

const indicatorsByReq = ref<Map<string, RequirementIndicatorVO[]>>(new Map())
const indicatorsLoading = ref(false)

async function loadAllIndicators() {
  indicatorsLoading.value = true
  try {
    const map = new Map<string, RequirementIndicatorVO[]>()
    for (const req of requirements.value) {
      const list = await requirementIndicatorApi.listByRequirement(req.id)
      map.set(req.id, list)
    }
    indicatorsByReq.value = map
  } finally {
    indicatorsLoading.value = false
  }
}

const indicatorsOfSelected = computed<RequirementIndicatorVO[]>(() => {
  if (!selectedRequirement.value) return []
  return indicatorsByReq.value.get(selectedRequirement.value.id) || []
})

const objectiveRequirementMappings = ref<TrainingObjectiveRequirementVO[]>([])
const mappingLoading = ref(false)

async function loadObjectiveRequirementMappings() {
  if (!qualityStore.currentTrainingPlanId) {
    objectiveRequirementMappings.value = []
    return
  }
  mappingLoading.value = true
  try {
    objectiveRequirementMappings.value = await trainingObjectiveRequirementApi.listByPlan(
      qualityStore.currentTrainingPlanId,
    )
  } finally {
    mappingLoading.value = false
  }
}

const mappingsOfSelectedObjective = computed<TrainingObjectiveRequirementVO[]>(() => {
  if (!selectedObjective.value) return []
  return objectiveRequirementMappings.value.filter(
    (m) => m.trainingObjectiveId === selectedObjective.value!.id,
  )
})

const objectiveWeightSum = computed(() =>
  mappingsOfSelectedObjective.value.reduce((acc, m) => acc + (Number(m.weight) || 0), 0),
)

const objectiveWeightHealthy = computed(
  () => Math.abs(objectiveWeightSum.value - 1) < WEIGHT_EPSILON,
)

function objectiveMappingSum(objectiveId: string): number {
  return objectiveRequirementMappings.value
    .filter((m) => m.trainingObjectiveId === objectiveId)
    .reduce((acc, m) => acc + (Number(m.weight) || 0), 0)
}

const standardMappings = ref<RequirementStandardMappingVO[]>([])
const standardMappingsLoading = ref(false)
const standardOptions = ref<AccreditationStandardVO[]>([])

async function loadStandardOptions() {
  standardOptions.value = await readAllPages(
    (pageNum) => accreditationStandardApi.page({
      pageNum,
      pageSize: ACCREDITATION_STANDARD_OPTION_PAGE_SIZE,
      enabled: true,
    }),
    '认证标准列表加载失败，请稍后重试',
  )
}

async function loadStandardMappings() {
  if (!selectedRequirement.value) {
    standardMappings.value = []
    return
  }
  standardMappingsLoading.value = true
  try {
    standardMappings.value = await requirementStandardMappingApi.listByRequirement(
      selectedRequirement.value.id,
    )
  } finally {
    standardMappingsLoading.value = false
  }
}

const standardMap = computed(() => {
  const map = new Map<string, AccreditationStandardVO>()
  standardOptions.value.forEach((s) => map.set(s.id, s))
  return map
})

function indicatorWeightSumByReq(reqId: string): number {
  const list = indicatorsByReq.value.get(reqId) || []
  return list.reduce((acc, i) => acc + (Number(i.requirementWeight) || 0), 0)
}

const requirementsHealthy = computed(() => {
  if (requirements.value.length === 0) return 0
  return requirements.value.filter(
    (r) => Math.abs(indicatorWeightSumByReq(r.id) - 1) < WEIGHT_EPSILON,
  ).length
})

const objectivesHealthy = computed(() => {
  if (objectives.value.length === 0) return 0
  return objectives.value.filter((o) => Math.abs(objectiveMappingSum(o.id) - 1) < WEIGHT_EPSILON)
    .length
})

const totalIndicators = computed(() =>
  Array.from(indicatorsByReq.value.values()).reduce((acc, list) => acc + list.length, 0),
)

const planConfirmationStatus = computed<ConfirmationStatus | undefined>(() => {
  return currentPlan.value?.confirmationStatus
})

const canConfirmPlan = computed(
  () =>
    !!currentPlan.value
    && (planConfirmationStatus.value === 'DRAFT' || planConfirmationStatus.value === 'RETURNED'),
)

const canRevokePlan = computed(
  () => !!currentPlan.value && planConfirmationStatus.value === 'CONFIRMED',
)

const signals = computed<SignalMetric[]>(() => [
  {
    key: 'plan',
    label: '当前方案状态',
    value: planConfirmationStatus.value
      ? strictEnumLabel(CONFIRMATION_STATUS_LABEL, planConfirmationStatus.value, '培养方案确认状态')
      : '未提交',
    tone:
      planConfirmationStatus.value === 'CONFIRMED'
        ? 'green'
        : planConfirmationStatus.value === 'RETURNED'
          ? 'red'
          : 'orange',
  },
  { key: 'objectives', label: '培养目标数', value: objectives.value.length, tone: 'blue' },
  {
    key: 'objectivesHealth',
    label: '目标→要求权重健康',
    value: `${objectivesHealthy.value}/${objectives.value.length}`,
    tone:
      objectives.value.length === 0 || objectivesHealthy.value === objectives.value.length
        ? 'green'
        : 'red',
  },
  { key: 'requirements', label: '毕业要求数', value: requirements.value.length, tone: 'blue' },
  {
    key: 'requirementsHealth',
    label: '要求→观测点权重健康',
    value: `${requirementsHealthy.value}/${requirements.value.length}`,
    tone:
      requirements.value.length === 0 || requirementsHealthy.value === requirements.value.length
        ? 'green'
        : 'red',
  },
  { key: 'indicators', label: '观测点总数', value: totalIndicators.value, tone: 'blue' },
  {
    key: 'standardMaps',
    label: '已映射标准条款',
    value: standardMappings.value.length,
    tone: 'gray',
  },
])


const objectiveMatrixRows = computed<MatrixRow[]>(() =>
  objectives.value.map((o) => {
    const sum = objectiveMappingSum(o.id)
    const healthy = Math.abs(sum - 1) < WEIGHT_EPSILON
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
const planFileUploading = ref(false)
const planFileName = ref('')

function openPlanCreate() {
  planEditorMode.value = 'create'
  Object.assign(planEditor, {
    id: undefined,
    programId: qualityStore.currentProgramId,
    planCode: '',
    planName: '',
    schoolYear: '',
    gradeLevel: '',
    description: '',
    accreditationProfileId: qualityStore.currentAccreditationProfileId || '',
    storageFileId: '',
    enabled: true,
  })
  planFileName.value = ''
  planEditorVisible.value = true
}

function openPlanEdit() {
  if (!currentPlan.value) return
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
  if (
    !planEditor.programId.trim()
    || !planEditor.planCode.trim()
    || !planEditor.planName.trim()
    || !planEditor.schoolYear.trim()
  ) {
    message.error('请选择专业，并填写方案编码、方案名称和入学学年')
    return
  }
  planSubmitting.value = true
  try {
    if (planEditorMode.value === 'create') {
      const newId = await trainingPlanApi.create(planEditor)
      message.success('培养方案已创建')
      qualityStore.setTrainingPlan(newId)
      await qualityStore.loadTrainingPlanOptions({ programId: planEditor.programId })
    } else {
      await trainingPlanApi.update(planEditor)
      message.success('培养方案已更新')
    }
    planEditorVisible.value = false
    await loadCurrentPlan()
  } finally {
    planSubmitting.value = false
  }
}

async function handlePlanFileUpload(options: UploadRequestOption): Promise<void> {
  planFileUploading.value = true
  try {
    const { file } = options
    if (!(file instanceof File)) {
      message.error('无效的培养方案附件')
      options.onError?.(new Error('无效的培养方案附件'))
      return
    }
    const uploaded = await uploadFile(file, { businessType: 'QUALITY_TRAINING_PLAN_FILE' })
    planEditor.storageFileId = uploaded.id
    planFileName.value = uploaded.nodeName
    message.success(`已上传培养方案附件：${uploaded.nodeName}`)
    options.onSuccess?.({})
  } catch (err) {
    options.onError?.(err instanceof Error ? err : new Error(String(err)))
  } finally {
    planFileUploading.value = false
  }
}

async function confirmPlan() {
  if (!currentPlan.value || !canConfirmPlan.value) return
  const planId = currentPlan.value.id
  void confirmAsync({
    title: `确认提交培养方案 ${currentPlan.value.planCode}？`,
    content: '确认后将进入"已确认"状态，可参与达成度计算和后续审核流程。',
    type: 'info',
    okText: '确认',
    onOk: async () => {
      await trainingPlanApi.confirm(planId)
      message.success('培养方案已确认')
      await loadCurrentPlan()
    },
  })
}

async function revokePlan() {
  if (!currentPlan.value || !canRevokePlan.value) return
  const planId = currentPlan.value.id
  void confirmAsync({
    title: `撤回培养方案 ${currentPlan.value.planCode}？`,
    content: '撤回后方案回到起草状态，可继续编辑体系数据并重新提交确认。',
    type: 'warning',
    okText: '撤回',
    onOk: async () => {
      await trainingPlanApi.revoke(planId)
      message.success('培养方案已撤回')
      await loadCurrentPlan()
    },
  })
}

async function deletePlan() {
  if (!currentPlan.value) return
  const planId = currentPlan.value.id
  const planCode = currentPlan.value.planCode
  void confirmAsync({
    title: `删除培养方案 ${planCode}？`,
    content: '将级联删除其下所有培养目标、毕业要求、观测点和支撑映射。请谨慎操作。',
    type: 'error',
    onOk: async () => {
      await trainingPlanApi.delete(planId)
      message.success('培养方案已删除')
      qualityStore.setTrainingPlan('')
      currentPlan.value = null
      objectives.value = []
      requirements.value = []
      indicatorsByReq.value = new Map()
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
  if (!qualityStore.currentTrainingPlanId) {
    message.warning('请先选择培养方案')
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
  objectiveEditorMode.value = 'edit'
  Object.assign(objectiveEditor, record)
  objectiveEditorVisible.value = true
}

async function submitObjective() {
  if (!objectiveEditor.objectiveCode.trim() || !objectiveEditor.objectiveName.trim()) {
    message.error('请填写编码与名称')
    return
  }
  objectiveSubmitting.value = true
  try {
    if (objectiveEditorMode.value === 'create') await trainingObjectiveApi.create(objectiveEditor)
    else await trainingObjectiveApi.update(objectiveEditor)
    message.success('培养目标已保存')
    objectiveEditorVisible.value = false
    await loadObjectives()
  } finally {
    objectiveSubmitting.value = false
  }
}

async function deleteObjective(record: TrainingObjectiveVO) {
  void confirmAsync({
    title: `删除培养目标 ${record.objectiveCode}？`,
    content: '将级联删除其下所有"目标→毕业要求"权重映射。',
    type: 'error',
    onOk: async () => {
      await trainingObjectiveApi.delete(record.id)
      message.success('培养目标已删除')
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
  if (!selectedObjective.value) return
  if (requirements.value.length === 0) {
    message.warning('当前方案下没有毕业要求，请先在「毕业要求与观测点」Tab 创建')
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
  const objective = objectives.value.find((item) => item.id === cellEvent.row.key)
  if (!objective) return
  selectedObjective.value = objective

  if (cellEvent.cell) {
    const mapping = objectiveRequirementMappings.value.find(
      (item) =>
        item.trainingObjectiveId === cellEvent.row.key
        && item.graduationRequirementId === cellEvent.col.key,
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
    message.error('请选择毕业要求')
    return
  }
  if (
    objMappingEditor.weight == null
    || objMappingEditor.weight < 0
    || objMappingEditor.weight > 1
  ) {
    message.error('权重必须在 0~1 之间')
    return
  }
  objMappingSubmitting.value = true
  try {
    if (objMappingEditorMode.value === 'create')
      await trainingObjectiveRequirementApi.create(objMappingEditor)
    else await trainingObjectiveRequirementApi.update(objMappingEditor)
    message.success('映射已保存')
    objMappingEditorVisible.value = false
    await loadObjectiveRequirementMappings()
  } finally {
    objMappingSubmitting.value = false
  }
}

async function deleteObjMapping(record: TrainingObjectiveRequirementVO) {
  void confirmAsync({
    title: '删除该映射？',
    type: 'error',
    onOk: async () => {
      await trainingObjectiveRequirementApi.delete(record.id)
      message.success('已删除')
      await loadObjectiveRequirementMappings()
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
  aggregation: 'WEIGHTED_SUM',
  sortOrder: 0,
})
const requirementSubmitting = ref(false)

function openRequirementCreate() {
  if (!qualityStore.currentTrainingPlanId) {
    message.warning('请先选择培养方案')
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
    aggregation: 'WEIGHTED_SUM',
    sortOrder: (requirements.value.length + 1) * 10,
  })
  requirementEditorVisible.value = true
}

function openRequirementEdit(record: GraduationRequirementVO) {
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
    message.error('请填写编码与名称')
    return
  }
  requirementSubmitting.value = true
  try {
    if (requirementEditorMode.value === 'create')
      await graduationRequirementApi.create(requirementEditor)
    else await graduationRequirementApi.update(requirementEditor)
    message.success('毕业要求已保存')
    requirementEditorVisible.value = false
    await loadRequirements()
    await loadAllIndicators()
  } finally {
    requirementSubmitting.value = false
  }
}

async function deleteRequirement(record: GraduationRequirementVO) {
  void confirmAsync({
    title: `删除毕业要求 ${record.requirementCode}？`,
    content: '将级联删除其下所有观测点、培养目标映射和标准条款映射。',
    type: 'error',
    onOk: async () => {
      await graduationRequirementApi.delete(record.id)
      message.success('毕业要求已删除')
      if (selectedRequirement.value?.id === record.id) selectedRequirement.value = null
      await Promise.all([
        loadRequirements(),
        loadAllIndicators(),
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
    sortOrder: (indicatorsOfSelected.value.length + 1) * 10,
  })
  indicatorEditorVisible.value = true
}

function openIndicatorEdit(record: RequirementIndicatorVO) {
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
    message.error('请填写编码与名称')
    return
  }
  if (
    indicatorEditor.requirementWeight == null
    || indicatorEditor.requirementWeight <= 0
    || indicatorEditor.requirementWeight > 1
  ) {
    message.error('观测点权重必须在 (0, 1] 之间')
    return
  }
  indicatorSubmitting.value = true
  try {
    if (indicatorEditorMode.value === 'create')
      await requirementIndicatorApi.create(indicatorEditor)
    else await requirementIndicatorApi.update(indicatorEditor)
    message.success('观测点已保存')
    indicatorEditorVisible.value = false
    await loadAllIndicators()
  } finally {
    indicatorSubmitting.value = false
  }
}

async function deleteIndicator(record: RequirementIndicatorVO) {
  void confirmAsync({
    title: `删除观测点 ${record.indicatorCode}？`,
    type: 'error',
    onOk: async () => {
      await requirementIndicatorApi.delete(record.id)
      message.success('观测点已删除')
      await loadAllIndicators()
    },
  })
}

async function validateIndicatorWeights(req: GraduationRequirementVO) {
  await requirementIndicatorApi.validateWeights(req.id)
  message.success(`毕业要求 ${req.requirementCode} 的观测点权重和校验通过`)
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
    message.error('请选择标准条目')
    return
  }
  if (stdEditorMode.value === 'create') await requirementStandardMappingApi.create(stdEditor)
  else await requirementStandardMappingApi.update(stdEditor)
  message.success('标准映射已保存')
  stdEditorVisible.value = false
  await loadStandardMappings()
}

async function deleteStdMapping(record: RequirementStandardMappingVO) {
  void confirmAsync({
    title: '删除该标准条款映射？',
    type: 'error',
    onOk: async () => {
      await requirementStandardMappingApi.delete(record.id)
      message.success('已删除')
      await loadStandardMappings()
    },
  })
}

/* ========== 上下文与 Tab 切换 ========== */

const activeTab = ref<'objective' | 'requirement'>('objective')

watch(
  () => qualityStore.currentTrainingPlanId,
  async () => {
    selectedObjective.value = null
    selectedRequirement.value = null
    await loadCurrentPlan()
    await Promise.all([loadObjectives(), loadRequirements(), loadObjectiveRequirementMappings()])
    await loadAllIndicators()
    await loadStandardMappings()
  },
)

watch(selectedRequirement, () => loadStandardMappings())

onMounted(async () => {
  await loadStandardOptions()
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setTrainingPlan(qualityStore.trainingPlanOptions[0].id)
    }
  } else {
    await loadCurrentPlan()
    await Promise.all([loadObjectives(), loadRequirements(), loadObjectiveRequirementMappings()])
    await loadAllIndicators()
    await loadStandardMappings()
  }
})

/* ========== 字典 ========== */

const aggregationOptions = [
  { value: 'WEIGHTED_SUM', label: AGGREGATION_FUNCTION_LABEL.WEIGHTED_SUM },
  { value: 'MINIMUM', label: AGGREGATION_FUNCTION_LABEL.MINIMUM },
  { value: 'DIRECT_INDIRECT_WEIGHTED', label: AGGREGATION_FUNCTION_LABEL.DIRECT_INDIRECT_WEIGHTED },
]

const civicDimensionOptions: Array<{ value: CivicDimension, label: string }> = [
  { value: 'MORAL', label: CIVIC_DIMENSION_LABEL.MORAL },
  { value: 'INTELLECTUAL', label: CIVIC_DIMENSION_LABEL.INTELLECTUAL },
  { value: 'PHYSICAL', label: CIVIC_DIMENSION_LABEL.PHYSICAL },
  { value: 'AESTHETIC', label: CIVIC_DIMENSION_LABEL.AESTHETIC },
  { value: 'LABOR', label: CIVIC_DIMENSION_LABEL.LABOR },
]

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
      <ContextBar>
        <template #status>
          <QualityScopeHeader show-plan-confirmation />
          <span v-if="currentPlan" class="tpw__context-meta">
            学年 {{ currentPlan.schoolYear || '未配置学年' }} · 年级
            {{ currentPlan.gradeLevel || '未配置年级' }}
          </span>
        </template>
        <template #actions>
          <UiTextAction @click="openPlanCreate">新建方案</UiTextAction>
          <UiButton variant="outline" size="sm" :disabled="!currentPlan" @click="openPlanEdit">
            编辑方案
          </UiButton>
          <UiButton size="sm" :disabled="!canConfirmPlan" @click="confirmPlan">提交确认</UiButton>
          <UiButton v-if="canRevokePlan" variant="outline" size="sm" @click="revokePlan">
            撤回修订
          </UiButton>
          <UiTextAction tone="danger" @click="deletePlan">删除方案</UiTextAction>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!qualityStore.currentTrainingPlanId"
      description="请选择培养方案"
      class="tpw__empty"
    />

    <template v-else>
      <SignalBand :metrics="signals" compact class="tpw__signals" />

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
        <a-row :gutter="12">
          <a-col :span="9">
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
                class="student-detail-table__data-table"
                :columns="objectiveColumns"
                :data-source="objectives"
                :loading="objectivesLoading"
                row-key="id"
                size="middle"
                :pagination="false"
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
                :show-pagination="false"
                flat
                :total="objectives.length"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'objectiveName'">
                    {{ record.objectiveName }}
                  </template>
                  <template v-else-if="column.key === 'weightSum'">
                    <UiTag
                      :tone="
                        Math.abs(objectiveMappingSum(record.id) - 1) < WEIGHT_EPSILON
                          ? 'green'
                          : 'red'
                      "
                    >
                      Σ={{ objectiveMappingSum(record.id).toFixed(3) }}
                    </UiTag>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <div class="operations-cell" @click.stop>
                      <UiTextAction @click.stop="openObjectiveEdit(record)">编辑</UiTextAction>
                      <UiTextAction tone="danger" @click.stop="deleteObjective(record)">删除</UiTextAction>
                    </div>
                  </template>
                </template>
              </UiDataTable>
            </UiCard>
          </a-col>

          <a-col :span="15">
            <UiCard v-if="!selectedObjective" class="tpw__card">
              <UiEmpty description="请选择" />
            </UiCard>
            <UiCard v-else class="tpw__card">
              <template #title>
                <span>「{{ selectedObjective.objectiveName }}」支撑毕业要求映射</span>
              </template>
              <template #extra>
                <a-space>
                  <UiTag :tone="objectiveWeightHealthy ? 'green' : 'red'">
                    权重和：{{ objectiveWeightSum.toFixed(3) }}
                    {{ objectiveWeightHealthy ? '合规' : '需=1' }}
                  </UiTag>
                  <UiButton variant="primary" size="sm" @click="openObjMappingCreate">
                    新增映射
                  </UiButton>
                </a-space>
              </template>
              <UiDataTable
                pagination-mode="none"
                class="student-detail-table__data-table"
                :columns="objMappingColumns"
                :data-source="mappingsOfSelectedObjective"
                :loading="mappingLoading"
                row-key="id"
                size="middle"
                :show-pagination="false"
                flat
                :total="mappingsOfSelectedObjective.length"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'requirement'">
                    <span class="text-xs text-gray-500 mr-1">
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
                    <div class="operations-cell" @click.stop>
                      <UiTextAction @click="openObjMappingEdit(record)">编辑</UiTextAction>
                      <UiTextAction tone="danger" @click="deleteObjMapping(record)">删除</UiTextAction>
                    </div>
                  </template>
                </template>
              </UiDataTable>
            </UiCard>
          </a-col>
        </a-row>

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
        <a-row :gutter="12">
          <a-col :span="9">
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
                class="student-detail-table__data-table"
                :columns="requirementColumns"
                :data-source="requirements"
                :loading="requirementsLoading"
                row-key="id"
                size="middle"
                :pagination="false"
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
                :show-pagination="false"
                flat
                :total="requirements.length"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'requirementName'">
                    {{ record.requirementName }}
                  </template>
                  <template v-else-if="column.key === 'indicatorWeightSum'">
                    <UiTag
                      :tone="
                        Math.abs(indicatorWeightSumByReq(record.id) - 1) < WEIGHT_EPSILON
                          ? 'green'
                          : 'red'
                      "
                    >
                      Σ={{ indicatorWeightSumByReq(record.id).toFixed(3) }}
                    </UiTag>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <div class="operations-cell" @click.stop>
                      <UiTextAction @click.stop="openRequirementEdit(record)">编辑</UiTextAction>
                      <UiTextAction @click.stop="validateIndicatorWeights(record)">校验权重</UiTextAction>
                      <UiTextAction tone="danger" @click.stop="deleteRequirement(record)">删除</UiTextAction>
                    </div>
                  </template>
                </template>
              </UiDataTable>
            </UiCard>
          </a-col>

          <a-col :span="15">
            <UiCard v-if="!selectedRequirement" class="tpw__card">
              <UiEmpty description="请选择" />
            </UiCard>
            <template v-else>
              <UiCard class="tpw__card" style="margin-bottom: 12px">
                <template #title>
                  <span>「{{ selectedRequirement.requirementName }}」观测点</span>
                </template>
                <template #extra>
                  <a-space>
                    <UiTag
                      :tone="
                        Math.abs(indicatorWeightSumByReq(selectedRequirement.id) - 1)
                          < WEIGHT_EPSILON
                          ? 'green'
                          : 'red'
                      "
                    >
                      权重和：{{ indicatorWeightSumByReq(selectedRequirement.id).toFixed(3) }}
                    </UiTag>
                    <UiButton variant="primary" size="sm" @click="openIndicatorCreate">
                      新增观测点
                    </UiButton>
                  </a-space>
                </template>
                <UiDataTable
                  pagination-mode="none"
                  class="student-detail-table__data-table"
                  :columns="indicatorColumns"
                  :data-source="indicatorsOfSelected"
                  :loading="indicatorsLoading"
                  row-key="id"
                  size="middle"
                  :show-pagination="false"
                  flat
                  :total="indicatorsOfSelected.length"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'requirementWeight'">
                      {{ record.requirementWeight.toFixed(3) }}
                    </template>
                    <template v-else-if="column.key === 'thresholdValue'">
                      {{ record.thresholdValue == null ? '-' : record.thresholdValue.toFixed(2) }}
                    </template>
                    <template v-else-if="column.key === 'civicDimensions'">
                      <a-space size="small" wrap>
                        <UiTag v-for="d in record.civicDimensions ?? []" :key="d" tone="purple">
                          {{ strictEnumLabel(CIVIC_DIMENSION_LABEL, d, '课程思政维度') }}
                        </UiTag>
                        <span v-if="!(record.civicDimensions ?? []).length" class="tpw__muted">-</span>
                      </a-space>
                    </template>
                    <template v-else-if="column.key === 'actions'">
                      <div class="operations-cell" @click.stop>
                        <UiTextAction @click="openIndicatorEdit(record)">编辑</UiTextAction>
                        <UiTextAction tone="danger" @click="deleteIndicator(record)">删除</UiTextAction>
                      </div>
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
                  pagination-mode="none"
                  class="student-detail-table__data-table"
                  :columns="stdMappingColumns"
                  :data-source="standardMappings"
                  :loading="standardMappingsLoading"
                  row-key="id"
                  size="middle"
                  :show-pagination="false"
                  flat
                  :total="standardMappings.length"
                >
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'standardItem'">
                      <span v-if="standardMap.get(record.standardId)">
                        <span class="text-xs text-gray-500 mr-1">
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
                      <div class="operations-cell" @click.stop>
                        <UiTextAction @click="openStdMappingEdit(record)">编辑</UiTextAction>
                        <UiTextAction tone="danger" @click="deleteStdMapping(record)">删除</UiTextAction>
                      </div>
                    </template>
                  </template>
                </UiDataTable>
              </UiCard>
            </template>
          </a-col>
        </a-row>
      </div>
    </template>

    <!-- 培养方案编辑 Drawer -->
    <UiDrawer
      v-model:open="planEditorVisible"
      :title="planEditorMode === 'create' ? '新建培养方案' : '编辑培养方案'"
      :width="640"
      :confirm-loading="planSubmitting"
      ok-text="保存"
      @ok="submitPlan"
    >
      <a-form layout="vertical" :model="planEditor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="所属专业大类" required>
              <ProgramSelector
                :value="planEditor.programId || null"
                placeholder="请选择 edu-user 专业大类"
                @change="handlePlanProgramChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="认证评价口径">
              <ProgramEvaluationProfileSelector
                :value="planEditor.accreditationProfileId || null"
                :program-id="planEditor.programId || null"
                :disabled="!planEditor.programId"
                :only-enabled="true"
                placeholder="选定专业后可选；不选表示通用评价"
                @change="handlePlanAccreditationProfileChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="方案编码" required>
              <a-input v-model:value="planEditor.planCode" placeholder="如 CSE-2024-V1" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="方案名称" required>
              <a-input v-model:value="planEditor.planName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="入学学年" required>
              <a-input v-model:value="planEditor.schoolYear" placeholder="如 2024-2025" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="年级">
              <a-input v-model:value="planEditor.gradeLevel" placeholder="如 2024 级" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="是否启用">
              <a-switch v-model:checked="planEditor.enabled" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="方案说明">
          <a-textarea v-model:value="planEditor.description" :rows="4" />
        </a-form-item>
        <a-form-item label="方案附件">
          <a-upload
            :show-upload-list="false"
            :custom-request="handlePlanFileUpload"
            :disabled="planFileUploading"
          >
            <UiButton variant="outline" size="sm" :loading="planFileUploading">
              上传方案附件
            </UiButton>
          </a-upload>
          <div v-if="planFileName" class="training-plan__file-name">
            {{ planFileName }}
          </div>
        </a-form-item>
      </a-form>
    </UiDrawer>

    <!-- 培养目标编辑 Modal -->
    <a-modal
      v-model:open="objectiveEditorVisible"
      :title="objectiveEditorMode === 'create' ? '新建培养目标' : '编辑培养目标'"
      :confirm-loading="objectiveSubmitting"
      width="600px"
      @ok="submitObjective"
    >
      <a-form layout="vertical" :model="objectiveEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="objectiveEditor.objectiveCode" placeholder="如 PO1" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="名称" required>
              <a-input v-model:value="objectiveEditor.objectiveName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="描述（毕业 5 年职业成就）">
          <a-textarea v-model:value="objectiveEditor.description" :rows="4" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model:value="objectiveEditor.sortOrder" :min="0" style="width: 200px" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 目标→要求映射编辑 Modal -->
    <a-modal
      v-model:open="objMappingEditorVisible"
      :title="objMappingEditorMode === 'create' ? '新增「目标→要求」映射' : '编辑「目标→要求」映射'"
      :confirm-loading="objMappingSubmitting"
      width="540px"
      @ok="submitObjMapping"
    >
      <a-form layout="vertical" :model="objMappingEditor">
        <a-form-item label="毕业要求" required>
          <a-select
            v-model:value="objMappingEditor.graduationRequirementId"
            placeholder="请选择毕业要求"
            :disabled="objMappingEditorMode === 'edit'"
          >
            <a-select-option v-for="r in requirements" :key="r.id" :value="r.id">
              <span class="text-xs text-gray-500 mr-1">{{ r.requirementCode }}</span>
              {{ r.requirementName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="权重 (0~1)" required>
              <a-input-number
                v-model:value="objMappingEditor.weight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="排序">
              <a-input-number
                v-model:value="objMappingEditor.sortOrder"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-textarea v-model:value="objMappingEditor.notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 毕业要求编辑 Modal -->
    <a-modal
      v-model:open="requirementEditorVisible"
      :title="requirementEditorMode === 'create' ? '新建毕业要求' : '编辑毕业要求'"
      :confirm-loading="requirementSubmitting"
      width="700px"
      @ok="submitRequirement"
    >
      <a-form layout="vertical" :model="requirementEditor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="requirementEditor.requirementCode" placeholder="如 GR1" />
            </a-form-item>
          </a-col>
          <a-col :span="18">
            <a-form-item label="名称" required>
              <a-input
                v-model:value="requirementEditor.requirementName"
                placeholder="如 工程知识"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="描述">
          <a-textarea
            v-model:value="requirementEditor.description"
            :rows="4"
            placeholder="参考工程教育认证 12 条标准（a-l）的官方描述"
          />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="阈值 (0~1)">
              <a-input-number
                v-model:value="requirementEditor.thresholdValue"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="聚合策略">
              <a-select
                v-model:value="requirementEditor.aggregation"
                :options="aggregationOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序">
              <a-input-number
                v-model:value="requirementEditor.sortOrder"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="五育维度（多选）">
          <a-select
            mode="multiple"
            v-model:value="requirementEditor.civicDimensions"
            :options="civicDimensionOptions"
            placeholder="德 智 体 美 劳 维度（如适用）"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 观测点编辑 Modal -->
    <a-modal
      v-model:open="indicatorEditorVisible"
      :title="indicatorEditorMode === 'create' ? '新增观测点' : '编辑观测点'"
      :confirm-loading="indicatorSubmitting"
      width="640px"
      @ok="submitIndicator"
    >
      <a-form layout="vertical" :model="indicatorEditor">
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="编码" required>
              <a-input v-model:value="indicatorEditor.indicatorCode" placeholder="如 1.1" />
            </a-form-item>
          </a-col>
          <a-col :span="18">
            <a-form-item label="名称" required>
              <a-input v-model:value="indicatorEditor.indicatorName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="描述">
          <a-textarea v-model:value="indicatorEditor.description" :rows="3" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="权重 (0~1)" required>
              <a-input-number
                v-model:value="indicatorEditor.requirementWeight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="阈值">
              <a-input-number
                v-model:value="indicatorEditor.thresholdValue"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="排序">
              <a-input-number
                v-model:value="indicatorEditor.sortOrder"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="五育维度（多选）">
          <a-select
            mode="multiple"
            v-model:value="indicatorEditor.civicDimensions"
            :options="civicDimensionOptions"
            placeholder="可选"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 标准条款映射编辑 Modal -->
    <a-modal
      v-model:open="stdEditorVisible"
      :title="stdEditorMode === 'create' ? '新增标准条款映射' : '编辑标准条款映射'"
      width="600px"
      @ok="submitStdMapping"
    >
      <a-form layout="vertical" :model="stdEditor">
        <a-form-item label="标准条目" required>
          <a-select v-model:value="stdEditor.standardId" placeholder="选择已启用的认证标准">
            <a-select-option v-for="s in standardOptions" :key="s.id" :value="s.id">
              <span class="text-xs text-gray-500 mr-1">{{ s.standardCode }}</span>
              {{ s.standardName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="标准条款">
          <a-input v-model:value="stdEditor.standardClause" placeholder="如 §1.3.a" />
        </a-form-item>
        <a-form-item label="覆盖说明">
          <a-textarea v-model:value="stdEditor.coverageNote" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.tpw {
  &__context-label {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__context-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__empty {
    margin-top: 32px;
  }

  &__signals {
    margin-bottom: 12px;
    padding: 14px 18px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
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
    background: var(--dp-surface, #fff);
    border-radius: 8px;
  }

  &__matrix-block {
    margin-top: 4px;
  }

  &__muted {
    color: var(--dp-text-muted, #94a3b8);
  }

  &__file-name {
    margin-top: 8px;
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }
}

:deep(.tpw-row-selected) td {
  background-color: var(--ant-color-primary-bg, #e6f4ff) !important;
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
