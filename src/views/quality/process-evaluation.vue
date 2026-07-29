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
import type { ProcessEvaluationEvidenceTypeCode } from '@/types/enums/process-evaluation-evidence-type-enum'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
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
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useQualityStore } from '@/stores/modules/quality'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const nodeColumns: ColumnsType = [
  { title: '编码', dataIndex: 'nodeCode', key: 'nodeCode', width: 100, fixed: 'left' },
  { title: '名称', key: 'nodeName' },
  { title: '权重', dataIndex: 'weight', key: 'weight', width: 72 },
  { title: '已确认记录', key: 'confirmedRecordCount', width: 96 },
  { title: '未确认记录', key: 'pendingRecordCount', width: 96 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 100 },
  { title: '主行动', key: 'actions', width: 200 },
]

const recordColumns: ColumnsType = [
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber', width: 120, fixed: 'left' },
  { title: '学生', key: 'studentBinding', width: 120 },
  { title: '得分', dataIndex: 'score', key: 'score', width: 80 },
  { title: '换算分', dataIndex: 'convertedScore', key: 'convertedScore', width: 80 },
  { title: '来源', dataIndex: 'sourceMode', key: 'sourceMode', width: 140 },
  { title: '状态', dataIndex: 'confirmationStatus', key: 'confirmationStatus', width: 100 },
  { title: '主行动', key: 'actions', width: 220 },
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

const evidenceGapNodes = computed(() =>
  nodes.value.filter(
    (node) =>
      node.confirmationStatus === ConfirmationStatusCode.CONFIRMED
      && (node.confirmedRecordCount == null || node.confirmedRecordCount <= 0),
  ),
)

const evidenceGapStrip = computed(() => {
  if (!evidenceGapNodes.value.length) {
    return null
  }
  const labels = evidenceGapNodes.value
    .map((node) => {
      const pending = node.pendingRecordCount ?? 0
      return pending > 0
        ? `${node.nodeCode}（未确认 ${pending} 条）`
        : `${node.nodeCode}（尚无成绩）`
    })
    .join('、')
  return {
    tone: 'error' as const,
    tag: '证据缺口',
    description:
      `已确认节点缺少已确认成绩，达成度计算将拒绝跳过：${labels}。请完成录入并确认，或退回未就绪节点。`,
  }
})
const nodePageNum = ref(1)
const nodePageSize = ref(20)
const nodeTotal = ref(0)
const selectedNode = ref<ProcessEvaluationNodeVO | null>(null)
const {
  loadError: nodesLoadError,
  beginLoad: beginNodesLoad,
  failLoad: failNodesLoad,
  okLoad: okNodesLoad,
} = useUiTableLoadError()

async function loadNodes() {
  const scope = beginQualityScopeRequest()
  if (!qualityStore.currentQualityCourseId) {
    nodes.value = []
    nodeTotal.value = 0
    signalSummary.value = null
    return
  }
  nodesLoading.value = true
  beginNodesLoad()
  try {
    const page = await processNodeApi.page({
      pageNum: nodePageNum.value,
      pageSize: nodePageSize.value,
      qualityCourseId: qualityStore.currentQualityCourseId,
    })
    if (scope.isStale()) {
      return
    }
    nodes.value = page.list
    nodeTotal.value = page.total
    if (selectedNode.value) {
      const matched = nodes.value.find((item) => item.id === selectedNode.value!.id)
      selectedNode.value = matched || nodes.value[0] || null
    }
    await loadSignalSummary()
    if (scope.isStale()) {
      return
    }
    okNodesLoad()
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    nodes.value = []
    nodeTotal.value = 0
    signalSummary.value = null
    failNodesLoad()
    showUserError(error, '过程性评价节点加载失败')
  } finally {
    if (!scope.isStale()) {
      nodesLoading.value = false
    }
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

const nodeEditor = ref<Omit<ProcessEvaluationNodeUpdateRequest, 'evidenceType'> & {
  evidenceType: ProcessEvaluationEvidenceTypeCode | ''
}>({
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
    void message.warning('节点已确认，禁止编辑')
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
    evidenceType: record.evidenceType ?? '',
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
    void message.error('请填写节点编码和名称')
    return
  }
  if (nodeEditorMode.value === 'edit' && nodeEditor.value.id) {
    const existed = nodes.value.find((item) => item.id === nodeEditor.value.id)
    if (existed && !isNodeMutable(existed)) {
      void message.warning('节点已确认，禁止编辑')
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
        evidenceType: v.evidenceType || undefined,
        semester: v.semester,
        weight: v.weight,
        fullScore: v.fullScore,
        coverageRequired: v.coverageRequired,
        description: v.description,
      }
      await processNodeApi.create(request)
    } else {
      if (!v.id) {
        void message.error('过程性评价节点编号缺失，无法更新')
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
        evidenceType: v.evidenceType || undefined,
        semester: v.semester,
        weight: v.weight,
        fullScore: v.fullScore,
        coverageRequired: v.coverageRequired,
        description: v.description,
      }
      await processNodeApi.update(request)
    }
    void message.success('已保存')
    nodeEditorVisible.value = false
    await loadNodes()
  } catch (error) {
    showUserError(error, '过程性评价节点保存失败')
  }
}

async function handleNodeDelete(record: ProcessEvaluationNodeVO) {
  if (!isNodeMutable(record)) {
    void message.warning('节点已确认，禁止删除')
    return
  }
  void confirmAsync({
    title: `删除节点 ${record.nodeCode}？`,
    type: 'error',
    onOk: async () => {
      await processNodeApi.delete(record.id)
      void message.success('已删除')
      if (selectedNode.value?.id === record.id) selectedNode.value = null
      await loadNodes()
    },
  })
}

async function changeNodeStatus(record: ProcessEvaluationNodeVO, target: ConfirmationStatusCode) {
  if (!allowedConfirmationTransitions(record.confirmationStatus).includes(target)) {
    void message.warning(
      `禁止由 ${confirmationStatusLabel(record.confirmationStatus)} 流转到 ${confirmationStatusLabel(target)}`,
    )
    return
  }
  try {
    await processNodeApi.updateConfirmationStatus({ id: record.id, confirmationStatus: target })
    void message.success(`已切换到 ${confirmationStatusLabel(target)}`)
    await loadNodes()
  } catch (error) {
    showUserError(error, '过程性评价节点状态更新失败')
  }
}

/* ========== 节点记录 ========== */

const records = ref<ProcessEvaluationRecordVO[]>([])
const recordsLoading = ref(false)
const {
  loadError: recordsLoadError,
  beginLoad: beginRecordsLoad,
  failLoad: failRecordsLoad,
  okLoad: okRecordsLoad,
} = useUiTableLoadError()
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
  beginRecordsLoad()
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
    okRecordsLoad()
  } catch (err) {
    records.value = []
    recordTotal.value = 0
    failRecordsLoad()
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
    void message.warning('节点未确认，无法录入记录')
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
    void message.warning('已提交或已确认的记录不可修改')
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
    void message.error('请填写完整记录')
    return
  }
  if (recordEditorMode.value === 'edit' && recordEditor.value.id) {
    const existed = records.value.find((item) => item.id === recordEditor.value.id)
    if (existed && !isRecordMutable(existed)) {
      void message.warning('记录已提交或已确认，禁止编辑')
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
        void message.error('过程性评价记录编号缺失，无法更新')
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
    void message.success('已保存')
    recordEditorVisible.value = false
    await loadRecords()
    await loadNodes()
  } catch (error) {
    showUserError(error, '过程性评价记录保存失败')
  }
}

async function changeRecordStatus(
  record: ProcessEvaluationRecordVO,
  target: ConfirmationStatusCode,
) {
  if (!allowedConfirmationTransitions(record.confirmationStatus).includes(target)) {
    void message.warning(
      `禁止由 ${confirmationStatusLabel(record.confirmationStatus)} 流转到 ${confirmationStatusLabel(target)}`,
    )
    return
  }
  try {
    await processRecordApi.updateConfirmationStatus({ id: record.id, confirmationStatus: target })
    void message.success(`已切换到 ${confirmationStatusLabel(target)}`)
    await loadRecords()
    await loadNodes()
  } catch (error) {
    showUserError(error, '过程性评价记录状态更新失败')
  }
}

async function deleteRecord(record: ProcessEvaluationRecordVO) {
  if (!isRecordMutable(record)) {
    void message.warning('已提交或已确认的记录不可删除')
    return
  }
  void confirmAsync({
    title: '删除该记录？',
    type: 'error',
    onOk: async () => {
      await processRecordApi.delete(record.id)
      void message.success('已删除')
      await loadRecords()
      await loadNodes()
    },
  })
}

function buildProcessNodeActions(record: ProcessEvaluationNodeVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = []
  if (isNodeMutable(record)) {
    actions.push({ key: 'edit', label: '编辑' })
  }
  const transitions = allowedConfirmationTransitions(record.confirmationStatus)
  // 行内仅 1 个 primary：有状态迁移时首个迁移为主；否则可编辑时「编辑」为主
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
  if (!actions.some((a) => a.tone === 'primary') && actions[0] && actions[0].tone !== 'danger') {
    actions[0] = { ...actions[0], tone: 'primary' }
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
  // 行内仅 1 个 primary：有状态迁移时首个迁移为主；否则可编辑时「编辑」为主
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
  if (!actions.some((a) => a.tone === 'primary') && actions[0] && actions[0].tone !== 'danger') {
    actions[0] = { ...actions[0], tone: 'primary' }
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
    void message.warning('节点未确认，无法导入数据')
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
  await loadNodes()
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
const signalLastSuccessAt = ref<string | null>(null)
const distributionExpanded = ref(false)

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
    signalSummary.value = await workbenchApi.processEvaluationSignalSummary({
      qualityCourseId: qualityStore.currentQualityCourseId,
      nodeId: selectedNode.value?.id,
    })
    markSignalSuccessAt()
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

/* ========== 信号指标：配置状态优先，分布下沉 ========== */

const configStatusStrip = computed(() => {
  const summary = signalSummary.value
  if (!summary || !qualityStore.currentQualityCourseId) {
    return null
  }
  const totalWeight = summary.weightSum
  const nodesConfigured = summary.nodeTotal > 0
  const weightKnown = typeof totalWeight === 'number' && !Number.isNaN(totalWeight)
  const weightOk = nodesConfigured && weightKnown && Math.abs(totalWeight - 1) < 0.01
  const pendingNodes = summary.nodeDraftCount + summary.nodeReturnedCount
  if (!nodesConfigured) {
    return {
      tone: 'warning' as const,
      tag: '未配置',
      description: '当前课程尚无过程性评价节点，请先新建节点并配置权重',
    }
  }
  if (!weightKnown) {
    return {
      tone: 'error' as const,
      tag: '权重未知',
      description: '过程性评价权重合计未返回，禁止按已配平处理',
    }
  }
  if (!weightOk) {
    return {
      tone: 'error' as const,
      tag: '权重未配平',
      description: `节点权重合计为 ${totalWeight}，须为 1 后才能作为正式过程成绩底座`,
    }
  }
  if (summary.nodeReturnedCount > 0) {
    return {
      tone: 'warning' as const,
      tag: '下一动作',
      description: `有 ${summary.nodeReturnedCount} 个节点已退回，请修订后重新提交`,
    }
  }
  if (summary.nodeDraftCount > 0) {
    return {
      tone: 'info' as const,
      tag: '下一动作',
      description: `有 ${summary.nodeDraftCount} 个节点仍在起草，请完善后提交确认`,
    }
  }
  if (pendingNodes === 0) {
    return {
      tone: 'success' as const,
      tag: '配置就绪',
      description: '节点权重已配平且无待处置草稿/退回；可继续录入过程成绩记录',
    }
  }
  return null
})

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const totalWeight = summary.weightSum
  const avgCoverage = summary.avgCoverageRequired
  const nodesConfigured = summary.nodeTotal > 0
  const weightKnown = typeof totalWeight === 'number' && !Number.isNaN(totalWeight)
  const weightOk = nodesConfigured && weightKnown && Math.abs(totalWeight - 1) < 0.01
  const returned = summary.nodeReturnedCount
  const primaryKey = returned > 0
    ? 'nodes-returned'
    : (!nodesConfigured || !weightOk ? 'weight-sum' : 'coverage-avg')

  return [
    {
      key: 'nodes-returned',
      label: '已退回',
      value: returned,
      tone: returned > 0 ? 'red' : 'gray',
      emphasis: primaryKey === 'nodes-returned' ? 'primary' : 'secondary',
      actionLabel: returned > 0 ? '处理退回' : undefined,
      helper: returned > 0 ? '优先处理退回节点' : undefined,
    },
    {
      key: 'weight-sum',
      label: '权重合计',
      value: !nodesConfigured ? '未配置' : weightKnown ? totalWeight : '—',
      tone: !nodesConfigured ? 'orange' : weightOk ? 'green' : 'red',
      emphasis: primaryKey === 'weight-sum' ? 'primary' : 'secondary',
      actionLabel: !nodesConfigured || !weightOk ? '修复权重' : undefined,
      helper: !nodesConfigured ? '过程评价节点未配置' : weightOk ? '权重正常' : '权重合计异常',
    },
    {
      key: 'nodes-draft',
      label: '起草中',
      value: summary.nodeDraftCount,
      tone: summary.nodeDraftCount > 0 ? 'orange' : 'gray',
      emphasis: 'secondary',
    },
    {
      key: 'coverage-avg',
      label: '平均覆盖率',
      value: typeof avgCoverage === 'number' && !Number.isNaN(avgCoverage) ? avgCoverage : '—',
      tone: typeof avgCoverage === 'number' && !Number.isNaN(avgCoverage)
        ? (avgCoverage >= 0.8 ? 'green' : avgCoverage > 0 ? 'orange' : 'gray')
        : 'gray',
      emphasis: primaryKey === 'coverage-avg' ? 'primary' : 'secondary',
    },
  ]
})

const distributionSignals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  return [
    { key: 'nodes-total', label: '节点总数', value: summary.nodeTotal, tone: 'blue' },
    {
      key: 'nodes-confirmed',
      label: '已确认节点',
      value: summary.nodeConfirmedCount,
      tone: summary.nodeConfirmedCount > 0 ? 'green' : 'gray',
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

/** 任务工作台副标题：节点与记录规模。 */
const processEvalWorkbenchSubtitle = computed(() => {
  if (!qualityStore.currentQualityCourseId) {
    return '请选择质量评价课程'
  }
  if (selectedNode.value) {
    const pending = selectedNode.value.pendingRecordCount
    if (typeof pending === 'number' && pending > 0) {
      return `「${selectedNode.value.nodeName}」· 待确认记录 ${pending}`
    }
    return `「${selectedNode.value.nodeName}」· ${nodeTotal.value} 节点 · ${recordTotal.value} 记录`
  }
  return `${nodeTotal.value} 个节点 · ${recordTotal.value} 条记录`
})

/**
 * 页级唯一实心主行动：已选确认节点优先录入；否则新建节点。
 */
const processEvalPagePrimaryAction = computed(() => {
  if (planGateMode.value || !qualityStore.currentQualityCourseId) {
    return null
  }
  if (
    selectedNode.value
    && selectedNode.value.confirmationStatus === ConfirmationStatusCode.CONFIRMED
  ) {
    return {
      key: 'create-record',
      label: '录入记录',
      run: () => openRecordCreate(),
    }
  }
  return {
    key: 'create-node',
    label: '新建节点',
    run: () => openNodeCreate(),
  }
})
</script>

<template>
  <QualityIngestPageShell embedded>
    <template #context>
      <QualityPageContextBar show-title title="过程性评价" :subtitle="processEvalWorkbenchSubtitle">
        <template #status>
          <span class="pe__filter-label">质量评价课程：</span>
          <CourseSelector
            :value="qualityStore.currentQualityCourseId || null"
            :training-plan-id="qualityStore.currentTrainingPlanId || null"
            :width="320"
            @change="handleCourseChange"
          />
        </template>
        <template #actions>
          <UiButton
            v-if="processEvalPagePrimaryAction"
            variant="primary"
            size="sm"
            @click="processEvalPagePrimaryAction.run()"
          >
            {{ processEvalPagePrimaryAction.label }}
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <QualityPlanGateStrip v-if="planGateMode" :mode="planGateMode" class="pe__empty" />

    <template v-else-if="qualityStore.currentQualityCourseId">
      <UiAlertStrip
        v-if="configStatusStrip"
        :tone="configStatusStrip.tone"
        dense
        inline
        :show-icon="false"
        class="pe__config-status"
      >
        <template #default>
          <span class="pe__gate-row">
            <UiTag
              :tone="
                configStatusStrip.tone === 'error'
                  ? 'red'
                  : configStatusStrip.tone === 'warning'
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
          </span>
        </template>
      </UiAlertStrip>
      <UiAlertStrip
        v-if="evidenceGapStrip"
        :tone="evidenceGapStrip.tone"
        dense
        inline
        :show-icon="false"
        class="pe__config-status"
      >
        <template #default>
          <span class="pe__gate-row">
            <UiTag tone="red" size="sm">{{ evidenceGapStrip.tag }}</UiTag>
            <span>{{ evidenceGapStrip.description }}</span>
          </span>
        </template>
      </UiAlertStrip>
      <SignalBand
        :metrics="signals"
        layout="spotlight"
        variant="panel"
        compact
        class="pe__signals"
      />
      <p v-if="signalLastSuccessAt" class="pe__sync-hint">
        指标最近同步：{{ signalLastSuccessAt }}
      </p>
      <div v-if="distributionSignals.length" class="pe__charts-fold">
        <UiButton
          variant="ghost"
          size="sm"
          class="pe__charts-toggle"
          @click="distributionExpanded = !distributionExpanded"
        >
          {{ distributionExpanded ? '收起节点/记录统计' : '展开节点/记录统计' }}
        </UiButton>
        <SignalBand
          v-if="distributionExpanded"
          :metrics="distributionSignals"
          variant="panel"
          compact
          class="pe__signals-secondary"
        />
      </div>
    </template>

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
          <span>请在上方选择课程后再维护过程性评价节点与成绩（上下文未就绪）</span>
        </span>
      </template>
    </UiAlertStrip>

    <UiRow v-if="!planGateMode && qualityStore.currentQualityCourseId" :gutter="12">
      <UiCol :span="10">
        <UiCard class="detail-table-card pe__node-card">
          <template #title>过程性评价节点</template>
          <template #extra>
            <UiButton v-if="processEvalPagePrimaryAction?.key !== 'create-node'" variant="outline" size="sm" @click="openNodeCreate">新建节点</UiButton>
          </template>

          <UiDataTable
            pagination-mode="server"
            :columns="nodeColumns"
            :data-source="nodes"
            :loading="nodesLoading"
            :load-error="nodesLoadError"
            empty-title="暂无过程性评价节点"
            empty-description="请新建节点并配置权重"
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
              <template v-else-if="column.key === 'confirmedRecordCount'">
                <span
                  :class="
                    record.confirmationStatus === ConfirmationStatusCode.CONFIRMED
                      && (record.confirmedRecordCount == null || record.confirmedRecordCount <= 0)
                      ? 'pe__record-gap'
                      : undefined
                  "
                >
                  {{ record.confirmedRecordCount ?? 0 }}
                </span>
              </template>
              <template v-else-if="column.key === 'pendingRecordCount'">
                {{ record.pendingRecordCount ?? 0 }}
              </template>
              <template v-else-if="column.key === 'confirmationStatus'">
                <UiTag :tone="confirmationStatusColor(record.confirmationStatus)">
                  {{ confirmationStatusLabel(record.confirmationStatus) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTableActions
                  :max-visible="2"
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
              <span>请在左侧点击过程评价节点后录入记录（上下文未就绪）</span>
            </span>
          </template>
        </UiAlertStrip>

        <UiCard v-else class="detail-table-card pe__record-card">
          <template #title>「{{ selectedNode.nodeName }}」记录</template>
          <template #extra>
            <div class="dp-space dp-space--tight">
              <UiButton
                v-if="processEvalPagePrimaryAction?.key !== 'create-record'"
                variant="outline"
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
            :load-error="recordsLoadError"
            empty-title="暂无过程性评价记录"
            empty-description="请录入或导入本节点成绩"
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
                  :max-visible="2"
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
              <UiInput size="sm" v-model="nodeEditor.nodeCode" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="节点类型" required>
              <UiSelect
                size="sm"
                v-model="nodeEditor.nodeType"
                :options="PROCESS_NODE_TYPE_OPTIONS"
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
          <UiInput size="sm" v-model="nodeEditor.nodeName" />
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
                size="sm"
                v-model="nodeEditor.fullScore"
                :min="0"
                style="width: 100%"
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
              <UiInput size="sm" v-model="recordEditor.studentNumber" />
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
              <UiInputNumber size="sm" v-model="recordEditor.score" :min="0" style="width: 100%" />
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
                :options="
                  Object.entries(DataSourceModeDescription).map(([k, v]) => ({
                    value: k,
                    label: v,
                  }))
                "
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
      <div class="pe__modal-toolbar dp-space dp-space--wrap dp-space--tight">
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
    font-size: var(--dp-font-size-sm);
  }

  &__signals {
    margin-bottom: var(--dp-space-component-xs);
  }

  &__signals-secondary {
    margin-top: var(--dp-space-component-tight);
  }

  &__config-status {
    margin-bottom: var(--dp-space-component);
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

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-component);
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: var(--dp-type-panel-title-size);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__filter {
    width: 140px;
  }

  &__empty {
    margin-top: var(--dp-space-component);
  }

  &__gate-row {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    min-width: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__sub-desc {
    margin-top: var(--dp-space-component-xs);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__record-gap {
    color: var(--dp-color-danger, #cf1322);
    font-weight: 600;
  }

  &__modal-toolbar {
    margin-bottom: var(--dp-space-component);
  }

  &__import-status-label {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }

  &__file-name {
    margin-top: var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }
}

:deep(.pe__row-selected) td {
  background-color: var(--dp-color-primary-bg) !important;
}
.pe__gate-row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 0;
}
</style>
