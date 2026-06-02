<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
/**
 * 过程性评价节点配置 + 节点记录管理
 *
 * 上下文：当前培养方案 → 当前质量评价课程 → 列出该课程的过程性评价节点
 * 后端：
 * - /api/quality/process-nodes     节点 CRUD + 状态流转
 * - /api/quality/process-records   记录 CRUD + 批量 + 确认
 *
 * 规则：
 * - 节点必须 CONFIRMED 才允许录入记录
 * - 记录 CONFIRMED 后禁止修改/删除
 * - 已确认记录才进入达成度计算
 */
import type {
  ConfirmationStatus,
  ProcessEvaluationNodeSaveRequest,
  ProcessEvaluationNodeVO,
  ProcessEvaluationRecordSaveRequest,
  ProcessEvaluationRecordVO,
  ProcessNodeType,
} from '@/apis/quality'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import {
  CONFIRMATION_STATUS_COLOR,
  CONFIRMATION_STATUS_LABEL,
  DATA_SOURCE_MODE_LABEL,
  PROCESS_NODE_TYPE_LABEL,
  PROCESS_NODE_TYPE_OPTIONS,
  processNodeApi,
  processRecordApi,
} from '@/apis/quality'
import QualityImportPanel from '@/components/quality/import/QualityImportPanel.vue'
import {
  AssessmentItemSelector,
  CourseGoalSelector,
  CourseSelector,
  RequirementIndicatorSelector,
  StudentSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiEmpty, UiErrorRetryPanel } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityStore } from '@/stores/modules/quality'
import { toUserError } from '@/utils/error-handler'
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
  { title: '确认时间', dataIndex: 'confirmedAt', key: 'confirmedAt', width: 160 },
]

const qualityStore = useQualityStore()

function confirmationStatusLabel(value: ConfirmationStatus): string {
  return strictEnumLabel(CONFIRMATION_STATUS_LABEL, value, '确认状态')
}

function confirmationStatusColor(value: ConfirmationStatus): string {
  return strictEnumTone(CONFIRMATION_STATUS_COLOR, value, '确认状态')
}

function processNodeTypeLabel(value: ProcessNodeType): string {
  return strictEnumLabel(PROCESS_NODE_TYPE_LABEL, value, '过程节点类型')
}

function dataSourceModeLabel(record: ProcessEvaluationRecordVO): string {
  return strictEnumLabel(DATA_SOURCE_MODE_LABEL, record.sourceMode, '数据来源模式')
}

function studentDisplay(record: ProcessEvaluationRecordVO): string {
  if (!record.studentUserId) return '未关联学生'
  return record.studentName?.trim() || '—'
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
  } finally {
    nodesLoading.value = false
  }
}

/* ========== 节点编辑 ========== */

const nodeEditorVisible = ref(false)
const nodeEditorMode = ref<'create' | 'edit'>('create')
const nodeEditor = ref<ProcessEvaluationNodeSaveRequest>({
  qualityCourseId: '',
  nodeCode: '',
  nodeName: '',
  nodeType: 'CLASS_INTERACTION',
  evidenceType: '',
  semester: '',
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
    semester: qualityStore.currentSemester || '',
    weight: 0.2,
    fullScore: 100,
    coverageRequired: 0.8,
    description: '',
  }
  nodeEditorVisible.value = true
}

function openNodeEdit(record: ProcessEvaluationNodeVO) {
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
  if (nodeEditorMode.value === 'create') await processNodeApi.create(v)
  else await processNodeApi.update(v)
  message.success('已保存')
  nodeEditorVisible.value = false
  await loadNodes()
}

async function handleNodeDelete(record: ProcessEvaluationNodeVO) {
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
  await processNodeApi.updateConfirmationStatus(record.id, target)
  message.success(`已切换到 ${confirmationStatusLabel(target)}`)
  await loadNodes()
}

/* ========== 节点记录 ========== */

const records = ref<ProcessEvaluationRecordVO[]>([])
const recordsLoading = ref(false)
const recordsError = ref<Error | null>(null)
const recordStatusFilter = ref<ConfirmationStatus | undefined>(undefined)

async function loadRecords() {
  if (!selectedNode.value) {
    records.value = []
    recordsError.value = null
    return
  }
  recordsLoading.value = true
  recordsError.value = null
  try {
    const result = await processRecordApi.listByNode(
      selectedNode.value.id,
      recordStatusFilter.value,
    )
    if (!isRecordStudentContractValid(result)) {
      records.value = []
      recordsError.value = toUserError(null, '过程性评价数据异常，请刷新后重试')
      return
    }
    records.value = result
  } catch (err) {
    records.value = []
    recordsError.value = toUserError(err, '过程性评价记录加载失败')
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
const evidenceFileUploading = ref(false)
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
  if (record.confirmationStatus === 'CONFIRMED') {
    message.warning('已确认的记录不可修改')
    return
  }
  recordEditorMode.value = 'edit'
  recordEditor.value = { ...record }
  evidenceFileName.value = record.evidenceFileId ? '已关联证据文件' : ''
  recordEditorVisible.value = true
}

async function handleEvidenceFileUpload(options: UploadRequestOption): Promise<void> {
  evidenceFileUploading.value = true
  try {
    const { file } = options
    if (!(file instanceof File)) {
      message.error('无效的证据文件')
      options.onError?.(new Error('无效的证据文件'))
      return
    }
    const uploaded = await uploadFile(file, { businessType: 'QUALITY_PROCESS_EVIDENCE' })
    recordEditor.value.evidenceFileId = uploaded.id
    evidenceFileName.value = uploaded.nodeName
    message.success(`已上传证据文件：${uploaded.nodeName}`)
    options.onSuccess?.({})
  } catch (err) {
    options.onError?.(err instanceof Error ? err : new Error(String(err)))
  } finally {
    evidenceFileUploading.value = false
  }
}

async function submitRecord() {
  const v = recordEditor.value
  if (!v.nodeId || v.score == null) {
    message.error('请填写完整记录')
    return
  }
  if (recordEditorMode.value === 'create') await processRecordApi.create(v)
  else await processRecordApi.update(v)
  message.success('已保存')
  recordEditorVisible.value = false
  await loadRecords()
}

async function confirmRecord(record: ProcessEvaluationRecordVO) {
  await processRecordApi.confirm(record.id)
  message.success('记录已确认')
  await loadRecords()
}

async function deleteRecord(record: ProcessEvaluationRecordVO) {
  if (record.confirmationStatus === 'CONFIRMED') {
    message.warning('已确认的记录不可删除')
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

function openImportExcel() {
  if (!selectedNode.value) return
  if (selectedNode.value.confirmationStatus !== 'CONFIRMED') {
    message.warning('节点未确认，无法导入数据')
    return
  }
  importExcelVisible.value = true
}

function importTemplateApi() {
  return processRecordApi.downloadTemplate()
}

function importUploadApi(file: File) {
  if (!selectedNode.value) {
    return Promise.reject(new Error('未选定节点'))
  }
  return processRecordApi.importExcel(selectedNode.value.id, file)
}

async function handleImportFinished() {
  await loadRecords()
}

/* ========== 按课程目标查已确认记录 ========== */

const confirmedByGoalVisible = ref(false)
const confirmedByGoalLoading = ref(false)
const confirmedByGoalError = ref<Error | null>(null)
const confirmedByGoalId = ref<string>('')
const confirmedByGoalRecords = ref<ProcessEvaluationRecordVO[]>([])

function handleConfirmedByGoalChange(value: string | null): void {
  confirmedByGoalId.value = value ?? ''
}

function openConfirmedByGoal() {
  if (!qualityStore.currentQualityCourseId) return
  confirmedByGoalId.value = ''
  confirmedByGoalRecords.value = []
  confirmedByGoalError.value = null
  confirmedByGoalVisible.value = true
}

async function queryConfirmedByGoal() {
  if (!confirmedByGoalId.value) {
    message.warning('请选择课程目标')
    return
  }
  confirmedByGoalLoading.value = true
  confirmedByGoalError.value = null
  try {
    const result = await processRecordApi.listConfirmedByCourseGoal(
      qualityStore.currentQualityCourseId,
      confirmedByGoalId.value,
    )
    if (!isRecordStudentContractValid(result)) {
      confirmedByGoalRecords.value = []
      confirmedByGoalError.value = toUserError(null, '课程目标已确认记录数据异常，请刷新后重试')
      return
    }
    confirmedByGoalRecords.value = result
  } catch (err) {
    confirmedByGoalRecords.value = []
    confirmedByGoalError.value = toUserError(err, '课程目标已确认记录加载失败')
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
watch(recordStatusFilter, () => loadRecords())

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setTrainingPlan(qualityStore.trainingPlanOptions[0].id)
    }
  }
  if (qualityStore.currentQualityCourseId) {
    await loadNodes()
  }
})

function handlePlanChange(planId: string | null) {
  qualityStore.setTrainingPlan(planId || '')
}

function handleCourseChange(courseId: string | null) {
  qualityStore.setQualityCourse(courseId || '')
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="pe__context">
        <div class="pe__context-info">
          <h2 class="pe__title">过程性评价管理</h2>
        </div>
        <div class="pe__context-actions">
          <span class="pe__filter-label">培养方案：</span>
          <TrainingPlanSelector
            :value="qualityStore.currentTrainingPlanId || null"
            :width="260"
            @change="handlePlanChange"
          />
          <span class="pe__filter-label">质量评价课程：</span>
          <CourseSelector
            :value="qualityStore.currentQualityCourseId || null"
            :training-plan-id="qualityStore.currentTrainingPlanId || null"
            :width="320"
            @change="handleCourseChange"
          />
        </div>
      </div>
    </template>

    <SignalBand
      v-if="qualityStore.currentQualityCourseId"
      :metrics="signals"
      compact
      class="pe__signals"
    />

    <UiEmpty
      v-if="!qualityStore.currentQualityCourseId"
      description="尚未选择质量评价课程，请在工作台顶部选择培养方案与课程"
      class="pe__empty"
    />

    <a-row v-if="qualityStore.currentQualityCourseId" :gutter="12">
      <a-col :span="10">
        <section class="pe__panel">
          <header class="pe__panel-header">
            <h3 class="pe__panel-title">过程性评价节点</h3>
            <UiButton variant="primary" size="sm" @click="openNodeCreate"> 新建节点 </UiButton>
          </header>

          <UiDataTable
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
                <a-tag :color="confirmationStatusColor(record.confirmationStatus)">
                  {{ confirmationStatusLabel(record.confirmationStatus) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space wrap>
                  <UiButton variant="ghost" size="sm" @click.stop="openNodeEdit(record)">
                    编辑
                  </UiButton>
                  <a-dropdown>
                    <UiButton variant="outline" size="sm" @click.stop> 状态 </UiButton>
                    <template #overlay>
                      <a-menu>
                        <a-menu-item key="DRAFT" @click.stop="changeNodeStatus(record, 'DRAFT')">
                          起草
                        </a-menu-item>
                        <a-menu-item
                          key="SUBMITTED"
                          @click.stop="changeNodeStatus(record, 'SUBMITTED')"
                        >
                          提交
                        </a-menu-item>
                        <a-menu-item
                          key="CONFIRMED"
                          @click.stop="changeNodeStatus(record, 'CONFIRMED')"
                        >
                          确认
                        </a-menu-item>
                        <a-menu-item
                          key="RETURNED"
                          @click.stop="changeNodeStatus(record, 'RETURNED')"
                        >
                          退回
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                  <UiButton
                    variant="ghost"
                    status="danger"
                    size="sm"
                    @click.stop="handleNodeDelete(record)"
                  >
                    删除
                  </UiButton>
                </a-space>
              </template>
            </template>
          </UiDataTable>
        </section>
      </a-col>

      <a-col :span="14">
        <UiEmpty v-if="!selectedNode" description="请在左侧选择节点查看记录" class="pe__empty" />

        <section v-else class="pe__panel">
          <header class="pe__panel-header">
            <h3 class="pe__panel-title">「{{ selectedNode.nodeName }}」记录</h3>
            <div class="pe__panel-actions">
              <a-select
                v-model:value="recordStatusFilter"
                placeholder="状态筛选"
                allow-clear
                class="pe__filter"
              >
                <a-select-option value="DRAFT">起草</a-select-option>
                <a-select-option value="SUBMITTED">已提交</a-select-option>
                <a-select-option value="CONFIRMED">已确认</a-select-option>
                <a-select-option value="RETURNED">已退回</a-select-option>
              </a-select>
              <UiButton
                variant="primary"
                size="sm"
                :disabled="selectedNode.confirmationStatus !== 'CONFIRMED'"
                @click="openRecordCreate"
              >
                录入记录
              </UiButton>
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
            </div>
          </header>

          <a-alert
            v-if="selectedNode.confirmationStatus !== 'CONFIRMED'"
            type="warning"
            show-icon
            message="节点尚未确认，无法录入记录"
            class="pe__alert"
          />

          <UiErrorRetryPanel
            v-if="recordsError"
            :error="recordsError"
            title="过程性评价记录加载失败"
            helper="请检查后端过程性评价记录学生展示合同。"
            compact
            @retry="loadRecords"
          />

          <UiDataTable
            v-else
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
                <a-tag :color="confirmationStatusColor(record.confirmationStatus)">
                  {{ confirmationStatusLabel(record.confirmationStatus) }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space wrap>
                  <UiButton
                    v-if="record.confirmationStatus !== 'CONFIRMED'"
                    variant="ghost"
                    size="sm"
                    @click="openRecordEdit(record)"
                  >
                    编辑
                  </UiButton>
                  <UiButton
                    v-if="record.confirmationStatus !== 'CONFIRMED'"
                    variant="outline"
                    size="sm"
                    @click="confirmRecord(record)"
                  >
                    确认
                  </UiButton>
                  <UiButton
                    v-if="record.confirmationStatus !== 'CONFIRMED'"
                    variant="ghost"
                    status="danger"
                    size="sm"
                    @click="deleteRecord(record)"
                  >
                    删除
                  </UiButton>
                </a-space>
              </template>
            </template>
          </UiDataTable>
        </section>
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
              <a-input v-model:value="nodeEditor.semester" />
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
          <a-upload
            :show-upload-list="false"
            :custom-request="handleEvidenceFileUpload"
            :disabled="evidenceFileUploading"
          >
            <UiButton variant="outline" size="sm" :loading="evidenceFileUploading">
              上传证据文件
            </UiButton>
          </a-upload>
          <div v-if="evidenceFileName" class="pe__file-name">
            {{ evidenceFileName }}
          </div>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="recordEditor.notes" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Excel 批量导入节点记录 -->
    <QualityImportPanel
      v-model:open="importExcelVisible"
      :title="`Excel 导入节点记录（${selectedNode?.nodeName || ''}）`"
      accept=".xlsx,.xls"
      accept-hint="支持 .xlsx / .xls 格式"
      description-title="模板说明"
      description="Excel 列顺序：学号 | 姓名（可选） | 得分 | 换算得分（可选 0-1） | 备注（可选）。学号和得分必填；行级校验失败的行不会入库，可在导入完成后下载错误清单修订后重传。"
      template-button-label="下载节点记录模板"
      template-file-name="过程性评价记录导入模板.xlsx"
      :template-api="importTemplateApi"
      :upload-api="importUploadApi"
      @imported="handleImportFinished"
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
      <UiErrorRetryPanel
        v-if="confirmedByGoalError"
        :error="confirmedByGoalError"
        title="课程目标已确认记录加载失败"
        helper="请检查后端过程性评价记录学生展示合同。"
        compact
        @retry="queryConfirmedByGoal"
      />

      <UiDataTable
        v-else
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
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.pe {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 240px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter-label {
    color: var(--dp-text-muted, #64748b);
    font-size: 13px;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
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
    color: var(--dp-text-primary, #0f172a);
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
    color: var(--dp-text-muted, #64748b);
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__modal-toolbar {
    margin-bottom: 12px;
  }

  &__file-name {
    margin-top: 8px;
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }
}

:deep(.pe__row-selected) td {
  background-color: var(--ant-color-primary-bg) !important;
}
</style>
