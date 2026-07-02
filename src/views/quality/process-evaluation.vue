<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ProcessEvaluationNodeSaveRequest,
  ProcessEvaluationNodeVO,
} from '@/apis/quality/process-evaluation'
import { processNodeApi } from '@/apis/quality/process-evaluation'
import type {
  ProcessEvaluationRecordSaveRequest,
  ProcessEvaluationRecordVO,
} from '@/apis/quality/process-evaluation-record'
import { processRecordApi } from '@/apis/quality/process-evaluation-record'
/**
 * 过程性评价节点配置 + 节点记录管理
 *
 * 上下文：当前培养方案 → 当前质量评价课程 → 列出该课程的过程性评价节点
 * 后端：
 * - /api/quality/process-nodes     节点 CRUD + 状态流转
 * - /api/quality/process-records   记录 CRUD + 状态流转 + 确认
 *
 * 规则：
 * - 节点必须 CONFIRMED 才允许录入记录
 * - 记录 DRAFT/RETURNED 可编辑，SUBMITTED/CONFIRMED 锁定
 * - 记录确认状态机与节点对称：DRAFT→SUBMITTED→CONFIRMED/RETURNED
 * - 已确认记录才进入达成度计算
 */
import type { ConfirmationStatus, ProcessNodeType } from '@/apis/quality/types'
import {
  CONFIRMATION_STATUS_COLOR,
  CONFIRMATION_STATUS_LABEL,
  CONFIRMATION_STATUS_TRANSIT_MAP,
  DATA_SOURCE_MODE_LABEL,
  PROCESS_NODE_TYPE_LABEL,
  PROCESS_NODE_TYPE_OPTIONS,
} from '@/apis/quality/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message, Modal } from 'ant-design-vue'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { ExcelImportSceneKey, FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import QualityIngestPageShell from '@/components/quality/QualityIngestPageShell.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import {
  AssessmentItemSelector,
  CourseGoalSelector,
  CourseSelector,
  RequirementIndicatorSelector,
  StudentSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityStore } from '@/stores/modules/quality'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const nodeColumns: ColumnsType = [
  { title: '编码', dataIndex: 'nodeCode', key: 'nodeCode', width: 100 },
  { title: '名称', key: 'nodeName' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 80 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 100 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const recordColumns: ColumnsType = [
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120 },
  { title: '学生', key: 'studentBinding', width: 120 },
  { title: '得分', dataIndex: 'score', key: 'score', width: 80 },
  { title: '换算分', dataIndex: 'convertedScore', key: 'convertedScore', width: 80 },
  { title: '来源', dataIndex: 'sourceMode', key: 'sourceMode', width: 140 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 100 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const confirmedByGoalColumns: ColumnsType = [
  { title: '评价节点', key: 'nodeBinding', width: 120 },
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120 },
  { title: '得分 / 换算分', key: 'scores', width: 150 },
  { title: '证据文件', key: 'evidenceFileRef', width: 120 },
  { title: '确认时间', dataIndex: 'confirmedTime', key: 'confirmedTime', width: 160 },
]

const qualityStore = useQualityStore()

function confirmationStatusLabel(value: ConfirmationStatus): string {
  return strictEnumLabel(CONFIRMATION_STATUS_LABEL, value, '确认状态')
}

function confirmationStatusColor(value: ConfirmationStatus): BadgeTone {
  return strictEnumTone(CONFIRMATION_STATUS_COLOR, value, '确认状态')
}

function allowedConfirmationTransitions(current: ConfirmationStatus): ConfirmationStatus[] {
  return CONFIRMATION_STATUS_TRANSIT_MAP[current] ?? []
}

function isNodeMutable(node: ProcessEvaluationNodeVO): boolean {
  return node.confirmationStatus !== 'CONFIRMED'
}

function isRecordMutable(record: ProcessEvaluationRecordVO): boolean {
  return record.confirmationStatus === 'DRAFT' || record.confirmationStatus === 'RETURNED'
}

function processNodeTypeLabel(value: ProcessNodeType): string {
  return strictEnumLabel(PROCESS_NODE_TYPE_LABEL, value, '过程节点类型')
}

function dataSourceModeLabel(record: ProcessEvaluationRecordVO): string {
  return strictEnumLabel(DATA_SOURCE_MODE_LABEL, record.sourceMode, '数据来源模式')
}

function studentDisplay(record: ProcessEvaluationRecordVO): string {
  if (!record.studentUserId) return ''
  return record.studentName?.trim() ?? ''
}

function isRecordStudentContractValid(items: ProcessEvaluationRecordVO[]): boolean {
  return items.every((item) => item.sourceMode && (!item.studentUserId || item.studentName?.trim()))
}

/* ========== 节点列表 ========== */

const nodes = ref<ProcessEvaluationNodeVO[]>([])
const nodesLoading = ref(false)
const selectedNode = ref<ProcessEvaluationNodeVO | null>(null)

const nodeTypeOptions = PROCESS_NODE_TYPE_OPTIONS

async function loadNodes() {
  if (!qualityStore.currentQualityCourseId) {
    nodes.value = []
    return
  }
  nodesLoading.value = true
  try {
    nodes.value = await processNodeApi.listByCourse(qualityStore.currentQualityCourseId)
  } catch (error) {
    nodes.value = []
    showUserError(error, '过程性评价节点加载失败')
  } finally {
    nodesLoading.value = false
  }
}

async function handleScopeChange(): Promise<void> {
  if (qualityStore.currentQualityCourseId) {
    await loadNodes()
    if (selectedNode.value) {
      await loadRecords()
    }
  }
}

useQualityScopedLoader(handleScopeChange, {
  watchScope: true,
  immediate: false,
  reloadOnActivated: false,
})

/* ========== 节点编辑 ========== */

const nodeEditorVisible = ref(false)
const nodeEditorMode = ref<'create' | 'edit'>('create')
const nodeEditor = ref<ProcessEvaluationNodeSaveRequest>({
  qualityCourseId: '',
  nodeCode: '',
  nodeName: '',
  nodeType: 'CLASS_INTERACTION',
  evidenceType: '',
  semester: undefined,
  weight: 0.2,
  fullScore: 100,
  coverageRequired: 0.8,
  description: '',
})

function handleNodeAssessmentItemChange(value: string | null): void {
  nodeEditor.value.assessmentItemId = value ?? ''
}

function handleNodeCourseGoalChange(value: string | null): void {
  nodeEditor.value.courseGoalId = value ?? ''
}

function handleNodeIndicatorChange(value: string | null): void {
  nodeEditor.value.indicatorId = value ?? ''
}

function openNodeCreate() {
  if (!qualityStore.currentQualityCourseId) {
    message.warning('请先选择质量评价课程')
    return
  }
  nodeEditorMode.value = 'create'
  nodeEditor.value = {
    qualityCourseId: qualityStore.currentQualityCourseId,
    nodeCode: '',
    nodeName: '',
    nodeType: 'CLASS_INTERACTION',
    evidenceType: '',
    semester: qualityStore.currentSemester || undefined,
    weight: 0.2,
    fullScore: 100,
    coverageRequired: 0.8,
    description: '',
  }
  nodeEditorVisible.value = true
}

function openNodeEdit(record: ProcessEvaluationNodeVO) {
  if (!isNodeMutable(record)) {
    message.warning('节点已确认，禁止编辑')
    return
  }
  nodeEditorMode.value = 'edit'
  nodeEditor.value = { ...record }
  nodeEditorVisible.value = true
}

async function submitNode() {
  const v = nodeEditor.value
  if (!v.nodeCode.trim() || !v.nodeName.trim()) {
    message.error('请填写节点编码和名称')
    return
  }
  if (nodeEditorMode.value === 'edit' && nodeEditor.value.id) {
    const existed = nodes.value.find((item) => item.id === nodeEditor.value.id)
    if (existed && !isNodeMutable(existed)) {
      message.warning('节点已确认，禁止编辑')
      return
    }
  }
  try {
    if (nodeEditorMode.value === 'create') await processNodeApi.create(v)
    else await processNodeApi.update(v)
    message.success('已保存')
    nodeEditorVisible.value = false
    await loadNodes()
  } catch (error) {
    showUserError(error, '过程性评价节点保存失败')
  }
}

async function handleNodeDelete(record: ProcessEvaluationNodeVO) {
  if (!isNodeMutable(record)) {
    message.warning('节点已确认，禁止删除')
    return
  }
  void confirmAsync({
    title: `删除节点 ${record.nodeCode}？`,
    type: 'error',
    onOk: async () => {
      await processNodeApi.delete(record.id)
      message.success('已删除')
      if (selectedNode.value?.id === record.id) selectedNode.value = null
      await loadNodes()
    },
  })
}

async function changeNodeStatus(record: ProcessEvaluationNodeVO, target: ConfirmationStatus) {
  if (!allowedConfirmationTransitions(record.confirmationStatus).includes(target)) {
    message.warning(
      `禁止由 ${confirmationStatusLabel(record.confirmationStatus)} 流转到 ${confirmationStatusLabel(target)}`,
    )
    return
  }
  try {
    await processNodeApi.updateConfirmationStatus(record.id, target)
    message.success(`已切换到 ${confirmationStatusLabel(target)}`)
    await loadNodes()
  } catch (error) {
    showUserError(error, '过程性评价节点状态更新失败')
  }
}

/* ========== 节点记录 ========== */

const records = ref<ProcessEvaluationRecordVO[]>([])
const recordsLoading = ref(false)
const recordFilterForm = reactive<{ status?: ConfirmationStatus }>({
  status: undefined,
})

const recordFilterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态筛选',
    allowClear: true,
    width: 140,
    options: [
      { value: 'DRAFT', label: '起草' },
      { value: 'SUBMITTED', label: '已提交' },
      { value: 'CONFIRMED', label: '已确认' },
      { value: 'RETURNED', label: '已退回' },
    ],
  },
]

async function loadRecords() {
  if (!selectedNode.value) {
    records.value = []
    return
  }
  recordsLoading.value = true
  try {
    const result = await processRecordApi.listByNode(selectedNode.value.id, recordFilterForm.status)
    if (!isRecordStudentContractValid(result)) {
      records.value = []
      showUserError(null, '过程性评价数据异常，请刷新后重试')
      return
    }
    records.value = result
  } catch (err) {
    records.value = []
    showUserError(err, '过程性评价记录加载失败')
  } finally {
    recordsLoading.value = false
  }
}

const recordEditorVisible = ref(false)
const recordEditorMode = ref<'create' | 'edit'>('create')
const recordEditor = ref<ProcessEvaluationRecordSaveRequest>({
  nodeId: '',
  qualityCourseId: '',
  studentUserId: '',
  studentNumber: '',
  score: 0,
  convertedScore: undefined,
  evidenceFileId: '',
  sourceMode: 'MANUAL_CONFIRMATION',
  notes: '',
})
const evidenceFileName = ref('')

function handleRecordStudentChange(value: string | null): void {
  recordEditor.value.studentUserId = value ?? ''
}

function openRecordCreate() {
  if (!selectedNode.value) return
  if (selectedNode.value.confirmationStatus !== 'CONFIRMED') {
    message.warning('节点未确认，无法录入记录')
    return
  }
  recordEditorMode.value = 'create'
  recordEditor.value = {
    nodeId: selectedNode.value.id,
    qualityCourseId: qualityStore.currentQualityCourseId,
    studentUserId: '',
    studentNumber: '',
    score: 0,
    convertedScore: undefined,
    evidenceFileId: '',
    sourceMode: 'MANUAL_CONFIRMATION',
    notes: '',
  }
  evidenceFileName.value = ''
  recordEditorVisible.value = true
}

function openRecordEdit(record: ProcessEvaluationRecordVO) {
  if (!isRecordMutable(record)) {
    message.warning('已提交或已确认的记录不可修改')
    return
  }
  recordEditorMode.value = 'edit'
  recordEditor.value = { ...record }
  evidenceFileName.value = record.evidenceFileId ? '已关联证据文件' : ''
  recordEditorVisible.value = true
}

async function submitRecord() {
  const v = recordEditor.value
  if (!v.nodeId || v.score == null) {
    message.error('请填写完整记录')
    return
  }
  if (recordEditorMode.value === 'edit' && recordEditor.value.id) {
    const existed = records.value.find((item) => item.id === recordEditor.value.id)
    if (existed && !isRecordMutable(existed)) {
      message.warning('记录已提交或已确认，禁止编辑')
      return
    }
  }
  try {
    if (recordEditorMode.value === 'create') await processRecordApi.create(v)
    else await processRecordApi.update(v)
    message.success('已保存')
    recordEditorVisible.value = false
    await loadRecords()
  } catch (error) {
    showUserError(error, '过程性评价记录保存失败')
  }
}

async function changeRecordStatus(record: ProcessEvaluationRecordVO, target: ConfirmationStatus) {
  if (!allowedConfirmationTransitions(record.confirmationStatus).includes(target)) {
    message.warning(
      `禁止由 ${confirmationStatusLabel(record.confirmationStatus)} 流转到 ${confirmationStatusLabel(target)}`,
    )
    return
  }
  try {
    await processRecordApi.updateConfirmationStatus(record.id, target)
    message.success(`已切换到 ${confirmationStatusLabel(target)}`)
    await loadRecords()
  } catch (error) {
    showUserError(error, '过程性评价记录状态更新失败')
  }
}

async function deleteRecord(record: ProcessEvaluationRecordVO) {
  if (!isRecordMutable(record)) {
    message.warning('已提交或已确认的记录不可删除')
    return
  }
  void confirmAsync({
    title: '删除该记录？',
    type: 'error',
    onOk: async () => {
      await processRecordApi.delete(record.id)
      message.success('已删除')
      await loadRecords()
    },
  })
}

/* ========== 节点记录 Excel 导入（同步） ========== */

const importExcelVisible = ref(false)
const importConfirmationStatus = ref<ConfirmationStatus>('SUBMITTED')

const importConfirmationStatusOptions: { label: string; value: ConfirmationStatus }[] = [
  { label: CONFIRMATION_STATUS_LABEL.DRAFT, value: 'DRAFT' },
  { label: CONFIRMATION_STATUS_LABEL.SUBMITTED, value: 'SUBMITTED' },
  { label: CONFIRMATION_STATUS_LABEL.CONFIRMED, value: 'CONFIRMED' },
]

const importRecordContext = computed(() => ({
  nodeId: selectedNode.value?.id,
  confirmationStatus: importConfirmationStatus.value,
}))

function openImportExcel() {
  if (!selectedNode.value) return
  if (selectedNode.value.confirmationStatus !== 'CONFIRMED') {
    message.warning('节点未确认，无法导入数据')
    return
  }
  if (importConfirmationStatus.value === 'CONFIRMED') {
    Modal.confirm({
      title: '以「已确认」状态导入',
      content:
        '导入后记录立即锁定且不可退回修改，将直接进入达成度计算。请确认 Excel 数据已核对无误。',
      okText: '继续导入',
      cancelText: '取消',
      onOk: () => {
        importExcelVisible.value = true
      },
    })
    return
  }
  importExcelVisible.value = true
}

async function handleImportFinished() {
  await loadRecords()
}

/* ========== 按课程目标查已确认记录 ========== */

const confirmedByGoalVisible = ref(false)
const confirmedByGoalLoading = ref(false)
const confirmedByGoalId = ref<string>('')
const confirmedByGoalRecords = ref<ProcessEvaluationRecordVO[]>([])

function handleConfirmedByGoalChange(value: string | null): void {
  confirmedByGoalId.value = value ?? ''
}

function openConfirmedByGoal() {
  if (!qualityStore.currentQualityCourseId) return
  confirmedByGoalId.value = ''
  confirmedByGoalRecords.value = []
  confirmedByGoalVisible.value = true
}

async function queryConfirmedByGoal() {
  if (!confirmedByGoalId.value) {
    message.warning('请选择课程目标')
    return
  }
  confirmedByGoalLoading.value = true
  try {
    const result = await processRecordApi.listConfirmedByCourseGoal(
      qualityStore.currentQualityCourseId,
      confirmedByGoalId.value,
    )
    if (!isRecordStudentContractValid(result)) {
      confirmedByGoalRecords.value = []
      showUserError(null, '课程目标已确认记录数据异常，请刷新后重试')
      return
    }
    confirmedByGoalRecords.value = result
  } catch (err) {
    confirmedByGoalRecords.value = []
    showUserError(err, '课程目标已确认记录加载失败')
  } finally {
    confirmedByGoalLoading.value = false
  }
}

/* ========== 信号指标：节点 + 记录健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const buckets: Record<ConfirmationStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    CONFIRMED: 0,
    RETURNED: 0,
  }
  for (const n of nodes.value) {
    buckets[n.confirmationStatus] += 1
  }
  let weightSum = 0
  let coverageSum = 0
  let coverageCount = 0
  for (const n of nodes.value) {
    if (n.weight != null) {
      if (!Number.isFinite(n.weight)) continue
      weightSum += n.weight
    }
    if (n.coverageRequired != null) {
      if (!Number.isFinite(n.coverageRequired)) continue
      coverageSum += n.coverageRequired
      coverageCount += 1
    }
  }
  const recordBuckets: Record<ConfirmationStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    CONFIRMED: 0,
    RETURNED: 0,
  }
  for (const r of records.value) {
    recordBuckets[r.confirmationStatus] += 1
  }
  const totalWeight = Number(weightSum.toFixed(2))
  const avgCoverage = coverageCount > 0 ? Number((coverageSum / coverageCount).toFixed(2)) : 0
  const weightOk = totalWeight === 0 || Math.abs(totalWeight - 1) < 0.01

  return [
    { key: 'nodes-total', label: '节点总数', value: nodes.value.length, tone: 'blue' },
    {
      key: 'nodes-confirmed',
      label: '已确认节点',
      value: buckets.CONFIRMED,
      tone: buckets.CONFIRMED > 0 ? 'green' : 'gray',
    },
    {
      key: 'nodes-draft',
      label: '起草中',
      value: buckets.DRAFT,
      tone: buckets.DRAFT > 0 ? 'orange' : 'gray',
    },
    {
      key: 'nodes-returned',
      label: '已退回',
      value: buckets.RETURNED,
      tone: buckets.RETURNED > 0 ? 'red' : 'gray',
    },
    { key: 'weight-sum', label: '权重合计', value: totalWeight, tone: weightOk ? 'green' : 'red' },
    {
      key: 'coverage-avg',
      label: '平均覆盖率',
      value: avgCoverage,
      tone: avgCoverage >= 0.8 ? 'green' : avgCoverage > 0 ? 'orange' : 'gray',
    },
    { key: 'records-total', label: '当前节点记录', value: records.value.length, tone: 'blue' },
    {
      key: 'records-confirmed',
      label: '已确认记录',
      value: recordBuckets.CONFIRMED,
      tone: recordBuckets.CONFIRMED > 0 ? 'green' : 'gray',
    },
  ]
})

/* ========== 上下文联动 ========== */

watch(
  () => qualityStore.currentQualityCourseId,
  async () => {
    selectedNode.value = null
    records.value = []
    await loadNodes()
  },
)

watch(
  () => qualityStore.currentTrainingPlanId,
  () => {
    selectedNode.value = null
    nodes.value = []
  },
)

watch(selectedNode, () => loadRecords())

onMounted(async () => {
  if (qualityStore.currentQualityCourseId) {
    await loadNodes()
  }
})

onActivated(async () => {
  await handleScopeChange()
})

function handleCourseChange(courseId: string | null) {
  qualityStore.setQualityCourse(courseId || '')
}
</script>

<template>
  <QualityIngestPageShell embedded>
    <template #context>
      <QualityPageContextBar>
        <template #status>
          <span class="pe__filter-label">质量评价课程：</span>
          <CourseSelector
            :value="qualityStore.currentQualityCourseId || null"
            :training-plan-id="qualityStore.currentTrainingPlanId || null"
            :width="320"
            @change="handleCourseChange"
          />
        </template>
      </QualityPageContextBar>
    </template>

    <SignalBand
      v-if="qualityStore.currentQualityCourseId"
      :metrics="signals"
      compact
      class="pe__signals"
    />

    <UiEmpty
      v-if="!qualityStore.currentQualityCourseId"
      description="请选择课程"
      class="pe__empty"
    />

    <a-row v-if="qualityStore.currentQualityCourseId" :gutter="12">
      <a-col :span="10">
        <UiCard class="detail-table-card pe__node-card">
          <template #title>过程性评价节点</template>
          <template #extra>
            <UiButton variant="primary" size="sm" @click="openNodeCreate">新建节点</UiButton>
          </template>

          <UiDataTable
            pagination-mode="none"
            class="student-detail-table__data-table"
            :columns="nodeColumns"
            :data-source="nodes"
            :loading="nodesLoading"
            row-key="id"
            size="middle"
            :show-pagination="false"
            flat
            :total="nodes.length"
            :row-class-name="
              (r: ProcessEvaluationNodeVO) => (selectedNode?.id === r.id ? 'pe__row-selected' : '')
            "
            :custom-row="
              (record: ProcessEvaluationNodeVO) => ({
                onClick: () => (selectedNode = record),
                style: 'cursor: pointer',
              })
            "
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'nodeName'">
                {{ record.nodeName }}
                <div class="pe__sub-desc">
                  {{ processNodeTypeLabel(record.nodeType) }}
                </div>
              </template>
              <template v-else-if="column.key === 'weight'">
                {{ record.weight == null ? '-' : record.weight.toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'confirmationStatus'">
                <UiTag :tone="confirmationStatusColor(record.confirmationStatus)">
                  {{ confirmationStatusLabel(record.confirmationStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <UiTextAction v-if="isNodeMutable(record)" @click.stop="openNodeEdit(record)">
                    编辑
                  </UiTextAction>
                  <a-dropdown
                    v-if="allowedConfirmationTransitions(record.confirmationStatus).length"
                  >
                    <UiTextAction tone="primary" @click.stop.prevent>状态</UiTextAction>
                    <template #overlay>
                      <a-menu>
                        <a-menu-item
                          v-for="target in allowedConfirmationTransitions(
                            record.confirmationStatus,
                          )"
                          :key="target"
                          @click.stop="changeNodeStatus(record, target)"
                        >
                          {{ confirmationStatusLabel(target) }}
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <UiTextAction
                    v-if="isNodeMutable(record)"
                    tone="danger"
                    @click.stop="handleNodeDelete(record)"
                  >
                    删除
                  </UiTextAction>
                </div>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-col>

      <a-col :span="14">
        <UiEmpty v-if="!selectedNode" description="请选择" class="pe__empty" />

        <UiCard v-else class="detail-table-card pe__record-card">
          <template #title>「{{ selectedNode.nodeName }}」记录</template>
          <template #extra>
            <a-space>
              <UiButton
                variant="primary"
                size="sm"
                :disabled="selectedNode.confirmationStatus !== 'CONFIRMED'"
                @click="openRecordCreate"
              >
                录入记录
              </UiButton>
              <span class="pe__import-status-label">导入状态</span>
              <a-select
                v-model:value="importConfirmationStatus"
                :options="importConfirmationStatusOptions"
                :disabled="selectedNode.confirmationStatus !== 'CONFIRMED'"
                size="small"
                style="width: 112px"
              />
              <UiButton
                variant="outline"
                size="sm"
                :disabled="selectedNode.confirmationStatus !== 'CONFIRMED'"
                @click="openImportExcel"
              >
                Excel 导入
              </UiButton>
              <UiButton variant="outline" size="sm" @click="openConfirmedByGoal">
                按课程目标查有效
              </UiButton>
            </a-space>
          </template>

          <UiFilterBar
            variant="plain"
            v-model="recordFilterForm"
            :fields="recordFilterFields"
            show-labels
            search-text="查询"
            @search="loadRecords"
            @reset="loadRecords"
          />

          <UiDataTable
            pagination-mode="none"
            class="student-detail-table__data-table"
            :columns="recordColumns"
            :data-source="records"
            :loading="recordsLoading"
            row-key="id"
            size="middle"
            :show-pagination="false"
            flat
            :total="records.length"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'score'">
                {{ record.score.toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'studentBinding'">
                {{ studentDisplay(record) }}
              </template>
              <template v-else-if="column.key === 'convertedScore'">
                {{ record.convertedScore == null ? '-' : record.convertedScore.toFixed(2) }}
              </template>
              <template v-else-if="column.key === 'sourceMode'">
                {{ dataSourceModeLabel(record) }}
              </template>
              <template v-else-if="column.key === 'confirmationStatus'">
                <UiTag :tone="confirmationStatusColor(record.confirmationStatus)">
                  {{ confirmationStatusLabel(record.confirmationStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <UiTextAction v-if="isRecordMutable(record)" @click="openRecordEdit(record)">
                    编辑
                  </UiTextAction>
                  <a-dropdown
                    v-if="allowedConfirmationTransitions(record.confirmationStatus).length"
                  >
                    <UiTextAction tone="primary" @click.stop.prevent>状态</UiTextAction>
                    <template #overlay>
                      <a-menu>
                        <a-menu-item
                          v-for="target in allowedConfirmationTransitions(
                            record.confirmationStatus,
                          )"
                          :key="target"
                          @click.stop="changeRecordStatus(record, target)"
                        >
                          {{ confirmationStatusLabel(target) }}
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <UiTextAction
                    v-if="isRecordMutable(record)"
                    tone="danger"
                    @click="deleteRecord(record)"
                  >
                    删除
                  </UiTextAction>
                </div>
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </a-col>
    </a-row>

    <!-- 节点编辑 -->
    <a-modal
      v-model:open="nodeEditorVisible"
      :title="nodeEditorMode === 'create' ? '新建过程性评价节点' : '编辑节点'"
      width="720px"
      @ok="submitNode"
    >
      <a-form layout="vertical" :model="nodeEditor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="节点编码" required>
              <a-input v-model:value="nodeEditor.nodeCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="节点类型" required>
              <a-select v-model:value="nodeEditor.nodeType" :options="nodeTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="学期">
              <a-select
                v-model:value="nodeEditor.semester"
                :options="SemesterOptions"
                placeholder="学期"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="nodeEditor.nodeName" />
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="挂靠考核环节">
              <AssessmentItemSelector
                :value="nodeEditor.assessmentItemId || null"
                :quality-course-id="qualityStore.currentQualityCourseId || null"
                placeholder="可选"
                @change="handleNodeAssessmentItemChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="挂靠课程目标">
              <CourseGoalSelector
                :value="nodeEditor.courseGoalId || null"
                :quality-course-id="qualityStore.currentQualityCourseId || null"
                placeholder="可选"
                @change="handleNodeCourseGoalChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="挂靠观测点">
              <RequirementIndicatorSelector
                :value="nodeEditor.indicatorId || null"
                placeholder="可选"
                @change="handleNodeIndicatorChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="权重 (0~1)">
              <a-input-number
                v-model:value="nodeEditor.weight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="满分">
              <a-input-number v-model:value="nodeEditor.fullScore" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="覆盖率要求">
              <a-input-number
                v-model:value="nodeEditor.coverageRequired"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="证据类型">
          <a-input
            v-model:value="nodeEditor.evidenceType"
            placeholder="如 实验报告 / 项目文档 / 课堂答辩"
          />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="nodeEditor.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 记录编辑 -->
    <a-modal
      v-model:open="recordEditorVisible"
      :title="recordEditorMode === 'create' ? '录入节点记录' : '编辑节点记录'"
      width="640px"
      @ok="submitRecord"
    >
      <a-form layout="vertical" :model="recordEditor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="学号">
              <a-input v-model:value="recordEditor.studentNumber" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="学生">
              <StudentSelector
                :value="recordEditor.studentUserId || null"
                placeholder="按学生选择"
                @change="handleRecordStudentChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="得分" required>
              <a-input-number v-model:value="recordEditor.score" :min="0" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="换算分">
              <a-input-number
                v-model:value="recordEditor.convertedScore"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="数据来源">
              <a-select v-model:value="recordEditor.sourceMode">
                <a-select-option v-for="(v, k) in DATA_SOURCE_MODE_LABEL" :key="k" :value="k">
                  {{ v }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="证据文件">
          <UiPlatformFileField
            v-model:file-node-id="recordEditor.evidenceFileId"
            v-model:file-name="evidenceFileName"
            :scene-key="FileUploadSceneKey.QUALITY_PROCESS_EVIDENCE"
            accept=".pdf,.doc,.docx,.png,.jpg"
            button-text="上传证据文件"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="recordEditor.notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Excel 批量导入节点记录 -->
    <UiPlatformExcelImportModal
      v-model:open="importExcelVisible"
      :scene-key="ExcelImportSceneKey.QUALITY_PROCESS_RECORD"
      entity-label="过程性评价记录"
      :context="importRecordContext"
      :requirements="[
        'Excel 列顺序：学号 | 姓名（可选） | 得分 | 换算得分（可选 0-1） | 备注（可选）',
        '导入状态可在工具栏选择：起草 / 已提交 / 已确认；选「已确认」可直接进入达成度计算。',
        '选「已提交」导入后记录锁定，须先将状态改为「已退回」才能改分或删除。',
        '学号和得分必填；失败行不会入库。',
      ]"
      @success="handleImportFinished"
    />

    <!-- 按课程目标查已确认记录 -->
    <a-modal
      v-model:open="confirmedByGoalVisible"
      title="按课程目标查已确认记录"
      :footer="null"
      width="780px"
    >
      <a-space class="pe__modal-toolbar" wrap>
        <span>课程目标：</span>
        <CourseGoalSelector
          :value="confirmedByGoalId || null"
          :quality-course-id="qualityStore.currentQualityCourseId || null"
          placeholder="选择课程目标"
          :width="320"
          @change="handleConfirmedByGoalChange"
        />
        <UiButton
          variant="primary"
          size="sm"
          :loading="confirmedByGoalLoading"
          @click="queryConfirmedByGoal"
        >
          查询
        </UiButton>
      </a-space>
      <UiDataTable
        pagination-mode="client"
        class="student-detail-table__data-table"
        :columns="confirmedByGoalColumns"
        :data-source="confirmedByGoalRecords"
        :loading="confirmedByGoalLoading"
        row-key="id"
        size="small"
        :page-size="20"
        :total="confirmedByGoalRecords.length"
        flat
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'scores'">
            {{ record.score.toFixed(1) }}
            <span v-if="record.convertedScore != null" class="pe__sub-desc">
              / {{ record.convertedScore.toFixed(2) }}
            </span>
          </template>
          <template v-else-if="column.key === 'nodeBinding'">
            {{ record.nodeId ? '已关联评价节点' : '-' }}
          </template>
          <template v-else-if="column.key === 'evidenceFileRef'">
            {{ record.evidenceFileId ? '已关联证据文件' : '-' }}
          </template>
        </template>
      </UiDataTable>
    </a-modal>
  </QualityIngestPageShell>
</template>

<style scoped lang="scss">
.pe {
  &__filter-label {
    color: var(--dp-text-muted);
    font-size: 13px;
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 140px;
  }

  &__empty {
    margin-top: 32px;
  }

  &__sub-desc {
    margin-top: 4px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__modal-toolbar {
    margin-bottom: 12px;
  }

  &__import-status-label {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__file-name {
    margin-top: 8px;
    font-size: 12px;
    color: var(--dp-text-secondary);
  }
}

:deep(.pe__row-selected) td {
  background-color: var(--ant-color-primary-bg) !important;
}
</style>
