<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ProcessEvaluationNodeSaveRequest,
  ProcessEvaluationNodeUpdateRequest,
  ProcessEvaluationNodeVO,
} from '@/apis/quality/process-evaluation'
import type {
  ProcessEvaluationRecordSaveRequest,
  ProcessEvaluationRecordUpdateRequest,
  ProcessEvaluationRecordVO,
} from '@/apis/quality/process-evaluation-record'
import type { ProcessEvaluationSignalSummaryVO } from '@/apis/quality/workbench'
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
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { ExcelImportSceneKey, FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { processNodeApi } from '@/apis/quality/process-evaluation'
import { processRecordApi } from '@/apis/quality/process-evaluation-record'
import {
  CONFIRMATION_STATUS_COLOR,
  CONFIRMATION_STATUS_TRANSIT_MAP,
  ConfirmationStatusCode,
  ConfirmationStatusDescription,
  DataSourceModeCode,
  DataSourceModeDescription,
  PROCESS_NODE_TYPE_OPTIONS,
  ProcessNodeTypeCode,
  ProcessNodeTypeDescription,
} from '@/apis/quality/types'
import { workbenchApi } from '@/apis/quality/workbench'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import QualityIngestPageShell from '@/components/quality/QualityIngestPageShell.vue'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import {
  AssessmentItemSelector,
  CourseGoalSelector,
  CourseSelector,
  RequirementIndicatorSelector,
  StudentSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityStore } from '@/stores/modules/quality'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const nodeColumns: ColumnsType = [
  { title: '编码', dataIndex: 'nodeCode', key: 'nodeCode', width: 100, fixed: 'left' },
  { title: '名称', key: 'nodeName' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 80 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 100 },
  { title: '操作', key: 'actions', width: 220 },
]

const recordColumns: ColumnsType = [
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120, fixed: 'left' },
  { title: '学生', key: 'studentBinding', width: 120 },
  { title: '得分', dataIndex: 'score', key: 'score', width: 80 },
  { title: '换算分', dataIndex: 'convertedScore', key: 'convertedScore', width: 80 },
  { title: '来源', dataIndex: 'sourceMode', key: 'sourceMode', width: 140 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 100 },
  { title: '操作', key: 'actions', width: 220 },
]

const confirmedByGoalColumns: ColumnsType = [
  { title: '评价节点', key: 'nodeBinding', width: 120 },
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120 },
  { title: '得分 / 换算分', key: 'scores', width: 150 },
  { title: '证据文件', key: 'evidenceFileRef', width: 120 },
  { title: '确认时间', dataIndex: 'confirmedTime', key: 'confirmedTime', width: 160 },
]

const qualityStore = useQualityStore()

function confirmationStatusLabel(value: ConfirmationStatusCode): string {
  return strictEnumLabel(ConfirmationStatusDescription, value, '确认状态')
}

function confirmationStatusColor(value: ConfirmationStatusCode): BadgeTone {
  return strictEnumTone(CONFIRMATION_STATUS_COLOR, value, '确认状态')
}

function allowedConfirmationTransitions(current: ConfirmationStatusCode): ConfirmationStatusCode[] {
  return CONFIRMATION_STATUS_TRANSIT_MAP[current] ?? []
}

function isNodeMutable(node: ProcessEvaluationNodeVO): boolean {
  return node.confirmationStatus !== ConfirmationStatusCode.CONFIRMED
}

function isRecordMutable(record: ProcessEvaluationRecordVO): boolean {
  return (
    record.confirmationStatus === ConfirmationStatusCode.DRAFT
    || record.confirmationStatus === ConfirmationStatusCode.RETURNED
  )
}

function processNodeTypeLabel(value: ProcessNodeTypeCode): string {
  return strictEnumLabel(ProcessNodeTypeDescription, value, '过程节点类型')
}

function dataSourceModeLabel(record: ProcessEvaluationRecordVO): string {
  if (!record.sourceMode) return '-'
  return strictEnumLabel(DataSourceModeDescription, record.sourceMode, '数据来源模式')
}

function studentDisplay(record: ProcessEvaluationRecordVO): string {
  if (!record.studentUserId) return ''
  return record.studentName?.trim() ?? ''
}

/* ========== 节点列表 ========== */

const nodes = ref<ProcessEvaluationNodeVO[]>([])
const nodesLoading = ref(false)
const nodePageNum = ref(1)
const nodePageSize = ref(20)
const nodeTotal = ref(0)
const selectedNode = ref<ProcessEvaluationNodeVO | null>(null)

async function loadNodes() {
  if (!qualityStore.currentQualityCourseId) {
    nodes.value = []
    nodeTotal.value = 0
    signalSummary.value = null
    return
  }
  nodesLoading.value = true
  try {
    const page = await processNodeApi.page({
      pageNum: nodePageNum.value,
      pageSize: nodePageSize.value,
      qualityCourseId: qualityStore.currentQualityCourseId,
    })
    nodes.value = page.list
    nodeTotal.value = page.total
    if (selectedNode.value) {
      const matched = nodes.value.find((item) => item.id === selectedNode.value!.id)
      selectedNode.value = matched || nodes.value[0] || null
    }
    await loadSignalSummary()
  } catch (error) {
    nodes.value = []
    nodeTotal.value = 0
    showUserError(error, '过程性评价节点加载失败')
  } finally {
    nodesLoading.value = false
  }
}

function handleNodePageChange(page: { current: number, pageSize: number }) {
  nodePageNum.value = page.current
  nodePageSize.value = page.pageSize
  void loadNodes()
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

const nodeEditor = ref<ProcessEvaluationNodeUpdateRequest>({
  id: '',
  qualityCourseId: '',
  nodeCode: '',
  nodeName: '',
  nodeType: ProcessNodeTypeCode.CLASS_INTERACTION,
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
    showFormValidationMessage('请先选择质量评价课程')
    return
  }
  nodeEditorMode.value = 'create'
  nodeEditor.value = {
    id: '',
    qualityCourseId: qualityStore.currentQualityCourseId,
    nodeCode: '',
    nodeName: '',
    nodeType: ProcessNodeTypeCode.CLASS_INTERACTION,
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
  nodeEditor.value = {
    id: record.id,
    qualityCourseId: record.qualityCourseId,
    assessmentItemId: record.assessmentItemId,
    courseGoalId: record.courseGoalId,
    indicatorId: record.indicatorId,
    nodeCode: record.nodeCode,
    nodeName: record.nodeName,
    nodeType: record.nodeType,
    evidenceType: record.evidenceType,
    semester: record.semester,
    weight: record.weight,
    fullScore: record.fullScore,
    coverageRequired: record.coverageRequired,
    description: record.description,
  }
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
    if (nodeEditorMode.value === 'create') {
      const request: ProcessEvaluationNodeSaveRequest = {
        qualityCourseId: v.qualityCourseId,
        assessmentItemId: v.assessmentItemId,
        courseGoalId: v.courseGoalId,
        indicatorId: v.indicatorId,
        nodeCode: v.nodeCode,
        nodeName: v.nodeName,
        nodeType: v.nodeType,
        evidenceType: v.evidenceType,
        semester: v.semester,
        weight: v.weight,
        fullScore: v.fullScore,
        coverageRequired: v.coverageRequired,
        description: v.description,
      }
      await processNodeApi.create(request)
    } else {
      if (!v.id) {
        message.error('过程性评价节点编号缺失，无法更新')
        return
      }
      const request: ProcessEvaluationNodeUpdateRequest = {
        id: v.id,
        qualityCourseId: v.qualityCourseId,
        assessmentItemId: v.assessmentItemId,
        courseGoalId: v.courseGoalId,
        indicatorId: v.indicatorId,
        nodeCode: v.nodeCode,
        nodeName: v.nodeName,
        nodeType: v.nodeType,
        evidenceType: v.evidenceType,
        semester: v.semester,
        weight: v.weight,
        fullScore: v.fullScore,
        coverageRequired: v.coverageRequired,
        description: v.description,
      }
      await processNodeApi.update(request)
    }
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

async function changeNodeStatus(record: ProcessEvaluationNodeVO, target: ConfirmationStatusCode) {
  if (!allowedConfirmationTransitions(record.confirmationStatus).includes(target)) {
    message.warning(
      `禁止由 ${confirmationStatusLabel(record.confirmationStatus)} 流转到 ${confirmationStatusLabel(target)}`,
    )
    return
  }
  try {
    await processNodeApi.updateConfirmationStatus({ id: record.id, confirmationStatus: target })
    message.success(`已切换到 ${confirmationStatusLabel(target)}`)
    await loadNodes()
  } catch (error) {
    showUserError(error, '过程性评价节点状态更新失败')
  }
}

/* ========== 节点记录 ========== */

const records = ref<ProcessEvaluationRecordVO[]>([])
const recordsLoading = ref(false)
const recordPageNum = ref(1)
const recordPageSize = ref(20)
const recordTotal = ref(0)
const recordFilterForm = reactive<{ status?: ConfirmationStatusCode }>({
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
      { value: ConfirmationStatusCode.DRAFT, label: '起草' },
      { value: ConfirmationStatusCode.SUBMITTED, label: '已提交' },
      { value: ConfirmationStatusCode.CONFIRMED, label: '已确认' },
      { value: ConfirmationStatusCode.RETURNED, label: '已退回' },
    ],
  },
]

async function loadRecords() {
  if (!selectedNode.value) {
    records.value = []
    recordTotal.value = 0
    return
  }
  recordsLoading.value = true
  try {
    const page = await processRecordApi.page({
      pageNum: recordPageNum.value,
      pageSize: recordPageSize.value,
      nodeId: selectedNode.value.id,
      confirmationStatus: recordFilterForm.status,
    })
    records.value = page.list
    recordTotal.value = page.total
    await loadSignalSummary()
  } catch (err) {
    records.value = []
    recordTotal.value = 0
    showUserError(err, '过程性评价记录加载失败')
  } finally {
    recordsLoading.value = false
  }
}

function handleRecordPageChange(page: { current: number, pageSize: number }) {
  recordPageNum.value = page.current
  recordPageSize.value = page.pageSize
  void loadRecords()
}

function handleRecordFilterSearch() {
  recordPageNum.value = 1
  void loadRecords()
}

const recordEditorVisible = ref(false)
const recordEditorMode = ref<'create' | 'edit'>('create')

const recordEditor = ref<ProcessEvaluationRecordUpdateRequest>({
  id: '',
  nodeId: '',
  qualityCourseId: '',
  studentUserId: '',
  studentNumber: '',
  score: 0,
  convertedScore: undefined,
  evidenceFileId: '',
  sourceMode: DataSourceModeCode.MANUAL_CONFIRMATION,
  notes: '',
})
const evidenceFileName = ref('')

function handleRecordStudentChange(value: string | null): void {
  recordEditor.value.studentUserId = value ?? ''
}

function openRecordCreate() {
  if (!selectedNode.value) return
  if (selectedNode.value.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    message.warning('节点未确认，无法录入记录')
    return
  }
  recordEditorMode.value = 'create'
  recordEditor.value = {
    id: '',
    nodeId: selectedNode.value.id,
    qualityCourseId: qualityStore.currentQualityCourseId,
    studentUserId: '',
    studentNumber: '',
    score: 0,
    convertedScore: undefined,
    evidenceFileId: '',
    sourceMode: DataSourceModeCode.MANUAL_CONFIRMATION,
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
  recordEditor.value = {
    id: record.id,
    nodeId: record.nodeId,
    qualityCourseId: record.qualityCourseId,
    studentUserId: record.studentUserId,
    studentNumber: record.studentNumber,
    score: record.score,
    convertedScore: record.convertedScore,
    evidenceFileId: record.evidenceFileId,
    sourceBatchId: record.sourceBatchId,
    sourceMode: record.sourceMode,
    validationResult: record.validationResult,
    notes: record.notes,
  }
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
    if (recordEditorMode.value === 'create') {
      const request: ProcessEvaluationRecordSaveRequest = {
        nodeId: v.nodeId,
        qualityCourseId: v.qualityCourseId,
        studentUserId: v.studentUserId,
        studentNumber: v.studentNumber,
        score: v.score,
        convertedScore: v.convertedScore,
        evidenceFileId: v.evidenceFileId,
        sourceBatchId: v.sourceBatchId,
        sourceMode: v.sourceMode,
        validationResult: v.validationResult,
        notes: v.notes,
      }
      await processRecordApi.create(request)
    } else {
      if (!v.id) {
        message.error('过程性评价记录编号缺失，无法更新')
        return
      }
      const request: ProcessEvaluationRecordUpdateRequest = {
        id: v.id,
        nodeId: v.nodeId,
        qualityCourseId: v.qualityCourseId,
        studentUserId: v.studentUserId,
        studentNumber: v.studentNumber,
        score: v.score,
        convertedScore: v.convertedScore,
        evidenceFileId: v.evidenceFileId,
        sourceBatchId: v.sourceBatchId,
        sourceMode: v.sourceMode,
        validationResult: v.validationResult,
        notes: v.notes,
      }
      await processRecordApi.update(request)
    }
    message.success('已保存')
    recordEditorVisible.value = false
    await loadRecords()
  } catch (error) {
    showUserError(error, '过程性评价记录保存失败')
  }
}

async function changeRecordStatus(
  record: ProcessEvaluationRecordVO,
  target: ConfirmationStatusCode,
) {
  if (!allowedConfirmationTransitions(record.confirmationStatus).includes(target)) {
    message.warning(
      `禁止由 ${confirmationStatusLabel(record.confirmationStatus)} 流转到 ${confirmationStatusLabel(target)}`,
    )
    return
  }
  try {
    await processRecordApi.updateConfirmationStatus({ id: record.id, confirmationStatus: target })
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

function buildProcessNodeActions(record: ProcessEvaluationNodeVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (isNodeMutable(record)) {
    actions.push({ key: 'edit', label: '编辑' })
  }
  const transitions = allowedConfirmationTransitions(record.confirmationStatus)
  // 行内仅 1 个 primary：首个状态迁移为主动作
  transitions.forEach((target, index) => {
    const item: UiTableRowActionItem = {
      key: target,
      label: confirmationStatusLabel(target),
    }
    if (index === 0) {
      item.tone = 'primary'
    }
    actions.push(item)
  })
  if (isNodeMutable(record)) {
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  return actions
}

function handleProcessNodeAction(key: string, record: ProcessEvaluationNodeVO): void {
  switch (key) {
    case 'edit':
      openNodeEdit(record)
      return
    case 'delete':
      void handleNodeDelete(record)
      return
    case ConfirmationStatusCode.DRAFT:
    case ConfirmationStatusCode.SUBMITTED:
    case ConfirmationStatusCode.CONFIRMED:
    case ConfirmationStatusCode.RETURNED:
      void changeNodeStatus(record, key)
  }
}

function buildProcessRecordActions(record: ProcessEvaluationRecordVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (isRecordMutable(record)) {
    actions.push({ key: 'edit', label: '编辑' })
  }
  const transitions = allowedConfirmationTransitions(record.confirmationStatus)
  // 行内仅 1 个 primary：首个状态迁移为主动作
  transitions.forEach((target, index) => {
    const item: UiTableRowActionItem = {
      key: target,
      label: confirmationStatusLabel(target),
    }
    if (index === 0) {
      item.tone = 'primary'
    }
    actions.push(item)
  })
  if (isRecordMutable(record)) {
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  return actions
}

function handleProcessRecordAction(key: string, record: ProcessEvaluationRecordVO): void {
  switch (key) {
    case 'edit':
      openRecordEdit(record)
      return
    case 'delete':
      void deleteRecord(record)
      return
    case ConfirmationStatusCode.DRAFT:
    case ConfirmationStatusCode.SUBMITTED:
    case ConfirmationStatusCode.CONFIRMED:
    case ConfirmationStatusCode.RETURNED:
      void changeRecordStatus(record, key)
  }
}

/* ========== 节点记录 Excel 导入（同步） ========== */

const importExcelVisible = ref(false)
const importConfirmationStatus = ref<ConfirmationStatusCode>(ConfirmationStatusCode.SUBMITTED)

const importConfirmationStatusOptions: { label: string, value: ConfirmationStatusCode }[] = [
  { label: ConfirmationStatusDescription.DRAFT, value: ConfirmationStatusCode.DRAFT },
  { label: ConfirmationStatusDescription.SUBMITTED, value: ConfirmationStatusCode.SUBMITTED },
  { label: ConfirmationStatusDescription.CONFIRMED, value: ConfirmationStatusCode.CONFIRMED },
]

const importRecordContext = computed(() => ({
  nodeId: selectedNode.value?.id,
  confirmationStatus: importConfirmationStatus.value,
}))

function openImportExcel() {
  if (!selectedNode.value) return
  if (selectedNode.value.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    message.warning('节点未确认，无法导入数据')
    return
  }
  if (importConfirmationStatus.value === ConfirmationStatusCode.CONFIRMED) {
    void confirmAsync({
      title: '以「已确认」状态导入',
      content:
        '导入后记录立即锁定且不可退回修改，将直接进入达成度计算。请确认 Excel 数据已核对无误。',
      okText: '继续导入',
      cancelText: '取消',
      type: 'warning',
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
const confirmedByGoalPageNum = ref(1)
const confirmedByGoalPageSize = ref(20)
const confirmedByGoalTotal = ref(0)

const signalSummary = ref<ProcessEvaluationSignalSummaryVO | null>(null)

async function loadSignalSummary() {
  if (!qualityStore.currentQualityCourseId) {
    signalSummary.value = null
    return
  }
  try {
    signalSummary.value = await workbenchApi.processEvaluationSignalSummary({
      qualityCourseId: qualityStore.currentQualityCourseId,
      nodeId: selectedNode.value?.id,
    })
  } catch (err) {
    signalSummary.value = null
    showUserError(err, '过程性评价指标加载失败')
  }
}

function handleConfirmedByGoalChange(value: string | null): void {
  confirmedByGoalId.value = value ?? ''
}

function openConfirmedByGoal() {
  if (!qualityStore.currentQualityCourseId) return
  confirmedByGoalId.value = ''
  confirmedByGoalRecords.value = []
  confirmedByGoalTotal.value = 0
  confirmedByGoalPageNum.value = 1
  confirmedByGoalVisible.value = true
}

async function queryConfirmedByGoal() {
  if (!confirmedByGoalId.value) {
    showFormValidationMessage('请选择课程目标')
    return
  }
  confirmedByGoalLoading.value = true
  try {
    const page = await processRecordApi.pageConfirmedByCourseGoal({
      qualityCourseId: qualityStore.currentQualityCourseId,
      courseGoalId: confirmedByGoalId.value,
      pageNum: confirmedByGoalPageNum.value,
      pageSize: confirmedByGoalPageSize.value,
    })
    confirmedByGoalRecords.value = page.list
    confirmedByGoalTotal.value = page.total
  } catch (err) {
    confirmedByGoalRecords.value = []
    confirmedByGoalTotal.value = 0
    showUserError(err, '课程目标已确认记录加载失败')
  } finally {
    confirmedByGoalLoading.value = false
  }
}

function handleConfirmedByGoalPageChange(page: { current: number, pageSize: number }) {
  confirmedByGoalPageNum.value = page.current
  confirmedByGoalPageSize.value = page.pageSize
  void queryConfirmedByGoal()
}

/* ========== 信号指标：节点 + 记录健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const totalWeight = summary.weightSum ?? 0
  const avgCoverage = summary.avgCoverageRequired ?? 0
  const weightOk = totalWeight === 0 || Math.abs(totalWeight - 1) < 0.01

  return [
    { key: 'nodes-total', label: '节点总数', value: summary.nodeTotal, tone: 'blue' },
    {
      key: 'nodes-confirmed',
      label: '已确认节点',
      value: summary.nodeConfirmedCount,
      tone: summary.nodeConfirmedCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'nodes-draft',
      label: '起草中',
      value: summary.nodeDraftCount,
      tone: summary.nodeDraftCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'nodes-returned',
      label: '已退回',
      value: summary.nodeReturnedCount,
      tone: summary.nodeReturnedCount > 0 ? 'red' : 'gray',
    },
    { key: 'weight-sum', label: '权重合计', value: totalWeight, tone: weightOk ? 'green' : 'red' },
    {
      key: 'coverage-avg',
      label: '平均覆盖率',
      value: avgCoverage,
      tone: avgCoverage >= 0.8 ? 'green' : avgCoverage > 0 ? 'orange' : 'gray',
    },
    { key: 'records-total', label: '当前节点记录', value: summary.recordTotal, tone: 'blue' },
    {
      key: 'records-confirmed',
      label: '已确认记录',
      value: summary.recordConfirmedCount,
      tone: summary.recordConfirmedCount > 0 ? 'green' : 'gray',
    },
  ]
})

/* ========== 上下文联动 ========== */

watch(
  () => qualityStore.currentQualityCourseId,
  async () => {
    selectedNode.value = null
    records.value = []
    recordTotal.value = 0
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

watch(selectedNode, () => {
  recordPageNum.value = 1
  void loadRecords()
  void loadSignalSummary()
})

onMounted(async () => {
  if (qualityStore.currentQualityCourseId) {
    await loadNodes()
  }
})

onActivated(async () => {
  await handleScopeChange()
})


const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (!qualityStore.currentTrainingPlanId) {
    return 'need-plan'
  }
  if (qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return 'need-confirm'
  }
  return null
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

    <QualityPlanGateStrip
      v-if="planGateMode"
      :mode="planGateMode"
      class="pe__empty"
    />

    <SignalBand
      v-else-if="qualityStore.currentQualityCourseId"
      :metrics="signals"
      compact
      class="pe__signals"
    />

    <UiAlertStrip
      v-else-if="!qualityStore.currentQualityCourseId"
      tone="info"
      size="sm"
      dense
      inline
      :show-icon="false"
      class="pe__empty"
    >
      <template #default>
        <span class="pe__gate-row">
          <UiTag tone="blue" size="sm">未选择课程</UiTag>
          <span>请在上方选择课程后再维护过程性评价节点与成绩</span>
        </span>
      </template>
    </UiAlertStrip>

    <UiRow v-if="!planGateMode && qualityStore.currentQualityCourseId" :gutter="12">
      <UiCol :span="10">
        <UiCard class="detail-table-card pe__node-card">
          <template #title>过程性评价节点</template>
          <template #extra>
            <UiButton variant="primary" size="sm" @click="openNodeCreate">新建节点</UiButton>
          </template>

          <UiDataTable
            pagination-mode="server"
            :columns="nodeColumns"
            :data-source="nodes"
            :loading="nodesLoading"
            row-key="id"
            size="middle"
            v-model:current="nodePageNum"
            v-model:page-size="nodePageSize"
            :total="nodeTotal"
            flat
            @page-change="handleNodePageChange"
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
                <UiTableActions
                  :items="buildProcessNodeActions(record)"
                  split
                  @action="(key) => handleProcessNodeAction(key, record)"
                />
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </UiCol>

      <UiCol :span="14">
        <UiAlertStrip
          v-if="!selectedNode"
          tone="info"
          size="sm"
          dense
          inline
          :show-icon="false"
          class="pe__empty"
        >
          <template #default>
            <span class="pe__gate-row">
              <UiTag tone="blue" size="sm">未选择节点</UiTag>
              <span>请在左侧点击过程评价节点后录入记录</span>
            </span>
          </template>
        </UiAlertStrip>

        <UiCard v-else class="detail-table-card pe__record-card">
          <template #title>「{{ selectedNode.nodeName }}」记录</template>
          <template #extra>
            <div class="dp-space" style="--dp-space-gap: 8px">
              <UiButton
                variant="primary"
                size="sm"
                :disabled="selectedNode.confirmationStatus !== ConfirmationStatusCode.CONFIRMED"
                @click="openRecordCreate"
              >
                录入记录
              </UiButton>
              <span class="pe__import-status-label">导入状态</span>
              <UiSelect
                v-model="importConfirmationStatus"
                :options="importConfirmationStatusOptions"
                :disabled="selectedNode.confirmationStatus !== ConfirmationStatusCode.CONFIRMED"
                size="small"
                style="width: 112px"
              />
              <UiButton
                variant="outline"
                size="sm"
                :disabled="selectedNode.confirmationStatus !== ConfirmationStatusCode.CONFIRMED"
                @click="openImportExcel"
              >
                表格文件导入
              </UiButton>
              <UiButton variant="outline" size="sm" @click="openConfirmedByGoal">
                按课程目标查有效
              </UiButton>
            </div>
          </template>

          <UiFilterBar
            variant="plain"
            v-model="recordFilterForm"
            :fields="recordFilterFields"
            show-labels
            search-text="查询"
            @search="handleRecordFilterSearch"
            @reset="handleRecordFilterSearch"
          />

          <UiDataTable
            pagination-mode="server"
            :columns="recordColumns"
            :data-source="records"
            :loading="recordsLoading"
            row-key="id"
            size="middle"
            flat
            v-model:current="recordPageNum"
            v-model:page-size="recordPageSize"
            :total="recordTotal"
            @page-change="handleRecordPageChange"
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
                <UiTableActions
                  :items="buildProcessRecordActions(record)"
                  split
                  @action="(key) => handleProcessRecordAction(key, record)"
                />
              </template>
            </template>
          </UiDataTable>
        </UiCard>
      </UiCol>
    </UiRow>

    <!-- 节点编辑 -->
    <UiDialog
      v-model:open="nodeEditorVisible"
      :title="nodeEditorMode === 'create' ? '新建过程性评价节点' : '编辑节点'"
      :width="720"
      @ok="submitNode"
    >
      <UiForm layout="vertical" :model="nodeEditor">
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="节点编码" required>
              <UiInput
                size="sm" v-model="nodeEditor.nodeCode"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="节点类型" required>
              <UiSelect
                size="sm" v-model="nodeEditor.nodeType" :options="PROCESS_NODE_TYPE_OPTIONS"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="学期">
              <UiSelect
                size="sm"
                v-model="nodeEditor.semester"
                :options="SemesterOptions"
                placeholder="学期"
                allow-clear
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="名称" required>
          <UiInput
            size="sm" v-model="nodeEditor.nodeName"
          />
        </UiFormItem>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="挂靠考核环节">
              <AssessmentItemSelector
                :value="nodeEditor.assessmentItemId || null"
                :quality-course-id="qualityStore.currentQualityCourseId || null"
                placeholder="可选"
                @change="handleNodeAssessmentItemChange"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="挂靠课程目标">
              <CourseGoalSelector
                :value="nodeEditor.courseGoalId || null"
                :quality-course-id="qualityStore.currentQualityCourseId || null"
                placeholder="可选"
                @change="handleNodeCourseGoalChange"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="挂靠观测点">
              <RequirementIndicatorSelector
                :value="nodeEditor.indicatorId || null"
                placeholder="可选"
                @change="handleNodeIndicatorChange"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="权重 (0~1)">
              <UiInputNumber
                size="sm"
                v-model="nodeEditor.weight"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="满分">
              <UiInputNumber
                size="sm" v-model="nodeEditor.fullScore" :min="0" style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="覆盖率要求">
              <UiInputNumber
                size="sm"
                v-model="nodeEditor.coverageRequired"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="证据类型">
          <UiInput
            size="sm"
            v-model="nodeEditor.evidenceType"
            placeholder="如 实验报告 / 项目文档 / 课堂答辩"
          />
        </UiFormItem>
        <UiFormItem label="说明">
          <UiTextarea size="sm" v-model="nodeEditor.description" :rows="3" />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- 记录编辑 -->
    <UiDialog
      v-model:open="recordEditorVisible"
      :title="recordEditorMode === 'create' ? '录入节点记录' : '编辑节点记录'"
      :width="640"
      @ok="submitRecord"
    >
      <UiForm layout="vertical" :model="recordEditor">
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="学号">
              <UiInput
                size="sm" v-model="recordEditor.studentNumber"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="学生">
              <StudentSelector
                :value="recordEditor.studentUserId || null"
                placeholder="按学生选择"
                @change="handleRecordStudentChange"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="得分" required>
              <UiInputNumber
                size="sm" v-model="recordEditor.score" :min="0" style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="换算分">
              <UiInputNumber
                size="sm"
                v-model="recordEditor.convertedScore"
                :min="0"
                :max="1"
                :step="0.01"
                style="width: 100%"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="数据来源">
              <UiSelect
                v-model="recordEditor.sourceMode"
                size="sm"
                :options="Object.entries(DataSourceModeDescription).map(([k, v]) => ({ value: k, label: v }))"
              />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="证据文件">
          <UiPlatformFileField
            v-model:file-node-id="recordEditor.evidenceFileId"
            v-model:file-name="evidenceFileName"
            :scene-key="FileUploadSceneKey.QUALITY_PROCESS_EVIDENCE"
            accept=".pdf,.doc,.docx,.png,.jpg"
            button-text="上传证据文件"
          />
        </UiFormItem>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="recordEditor.notes" :rows="3" />
        </UiFormItem>
      </UiForm>
    </UiDialog>

    <!-- Excel 批量导入节点记录 -->
    <UiPlatformExcelImportModal
      v-model:open="importExcelVisible"
      :scene-key="ExcelImportSceneKey.QUALITY_PROCESS_RECORD"
      entity-label="过程性评价记录"
      :context="importRecordContext"
      :requirements="[
        '表格文件列顺序：学号 | 姓名（可选） | 得分 | 换算得分（可选 0-1） | 备注（可选）',
        '导入状态可在工具栏选择：起草 / 已提交 / 已确认；选「已确认」可直接进入达成度计算。',
        '选「已提交」导入后记录锁定，须先将状态改为「已退回」才能改分或删除。',
        '学号和得分必填；失败行不会入库。',
      ]"
      @success="handleImportFinished"
    />

    <!-- 按课程目标查已确认记录 -->
    <UiDialog
      v-model:open="confirmedByGoalVisible"
      title="按课程目标查已确认记录"
      hide-footer
      width="780px"
    >
      <div class="pe__modal-toolbar dp-space dp-space--wrap" style="--dp-space-gap: 8px">
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
      </div>
      <UiDataTable
        pagination-mode="server"
        :columns="confirmedByGoalColumns"
        :data-source="confirmedByGoalRecords"
        :loading="confirmedByGoalLoading"
        row-key="id"
        size="small"
        :page-size="confirmedByGoalPageSize"
        :page-num="confirmedByGoalPageNum"
        :total="confirmedByGoalTotal"
        flat
        @page-change="handleConfirmedByGoalPageChange"
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
    </UiDialog>
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
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-3, 12px);
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
    font-size: 15px;
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
    margin-top: var(--dp-space-3, 12px);
  }

  &__gate-row {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-2);
    min-width: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
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
  background-color: var(--dp-color-primary-bg) !important;
}
.pe__gate-row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
}
</style>
