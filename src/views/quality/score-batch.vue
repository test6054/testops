<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
/**
 * 质量评价 - 成绩 Excel 异步导入
 *
 * 后端契约（ScoreBatchController）：
 * 1. 选择 质量评价课程 + 考核环节 + 学年 / 学期 -> 填批次编码 / 名称 -> 上传 Excel
 *    上传后调用 edu-storage 得到 sourceFileId，再调用 /api/quality/score-batches/create 注册批次
 * 2. POST /enqueue-parse 触发异步解析，状态机：PENDING -> PARSING -> PREVIEW_READY / FAILED
 * 3. PREVIEW_READY 后 POST /preview 拿到 ScoreImportPreviewVO（含 diagnostics），人工核对
 * 4. POST /validate 进入 VALIDATED，POST /confirm 进入 CONFIRMED，进入达成度计算可用来源
 * 5. 任意阶段可 POST /update-status?status=CANCELLED 取消
 */
import type {
  AssessmentItemVO,
  QualityCourseVO,
  ScoreBatchQueryPayload,
  ScoreBatchSavePayload,
  ScoreBatchStatus,
  ScoreBatchVO,
  ScoreImportRowDiagnostic,
} from '@/apis/quality'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
} from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { uploadFile } from '@/apis/edu/file-management'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import {
  assessmentItemApi,
  isScoreBatchStatus,
  qualityCourseApi,
  SCORE_BATCH_STATUS_COLOR,
  SCORE_BATCH_STATUS_LABEL,
  scoreBatchApi,
} from '@/apis/quality'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import {
  AuditTimelineDrawer,
  SignalBand,
  StageRail,
  StageWorkbenchShell,
  TaskResultPanel,
} from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityStore } from '@/stores/modules/quality'

const qualityStore = useQualityStore()

const batches = ref<ScoreBatchVO[]>([])
const total = ref(0)
const loading = ref(false)
const uploading = ref(false)

const previewVisible = ref(false)
const previewLoading = ref(false)
const diagnostics = ref<ScoreImportRowDiagnostic[]>([])
const previewBatch = ref<ScoreBatchVO | null>(null)
const previewSummary = reactive({
  totalRows: 0,
  successRows: 0,
  errorRows: 0,
  errorSummary: '' as string | undefined,
})

const courseOptions = ref<QualityCourseVO[]>([])
/** 上传表单下拉选择器用的考核环节列表（随 uploadForm.qualityCourseId 切换） */
const uploadAssessmentItems = ref<AssessmentItemVO[]>([])
const uploadAssessmentLoading = ref(false)
/** 查询表单下拉选择器用的考核环节列表（随 query.qualityCourseId 切换） */
const queryAssessmentItems = ref<AssessmentItemVO[]>([])
const queryAssessmentLoading = ref(false)

const query = reactive<ScoreBatchQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  qualityCourseId: '',
  assessmentItemId: '',
  status: undefined,
  sourceMode: undefined,
  keyword: '',
})

const SOURCE_MODE_OPTIONS = [
  { value: 'EXCEL_IMPORT', label: 'Excel 异步导入' },
  { value: 'EXTERNAL_AI_CONNECTOR', label: '外部 AI 解析草稿' },
  { value: 'READ_ONLY_DATABASE_PULL', label: '只读数据库主动拔取' },
  { value: 'MANUAL_CONFIRMATION', label: '人工录入与确认' },
]

const uploadForm = reactive<ScoreBatchSavePayload & { fileName?: string }>({
  qualityCourseId: '',
  assessmentItemId: '',
  batchCode: '',
  batchName: '',
  sourceMode: 'EXCEL_IMPORT',
  schoolYear: qualityStore.currentSchoolYear || '2024-2025',
  semester: qualityStore.currentSemester || '1',
  fileName: '',
})

const statusOptions = Object.entries(SCORE_BATCH_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

// ─── 状态守卫 helper：禁止 as 类型断言 ─────────────────────────────
function statusLabel(value: unknown): string {
  if (isScoreBatchStatus(value)) return SCORE_BATCH_STATUS_LABEL[value]
  return typeof value === 'string' && value ? value : '-'
}

function statusColor(value: unknown): string {
  if (isScoreBatchStatus(value)) return SCORE_BATCH_STATUS_COLOR[value]
  return 'default'
}

function sourceModeLabel(value: unknown): string {
  if (typeof value !== 'string') return '-'
  const opt = SOURCE_MODE_OPTIONS.find((o) => o.value === value)
  return opt ? opt.label : value || '-'
}

// ─── 阶段状态分布（用于 StageRail） ─────────────────────────────
const statusBuckets = computed(() => {
  const buckets: Record<ScoreBatchStatus, number> = {
    PENDING: 0,
    PARSING: 0,
    PREVIEW_READY: 0,
    VALIDATED: 0,
    CONFIRMED: 0,
    FAILED: 0,
    CANCELLED: 0,
  }
  for (const b of batches.value) {
    if (isScoreBatchStatus(b.status)) buckets[b.status] += 1
  }
  return buckets
})

const stages = computed<WorkbenchStage[]>(() => {
  const b = statusBuckets.value
  const stageOrder: Array<{ key: ScoreBatchStatus, title: string }> = [
    { key: 'PENDING', title: '待处理' },
    { key: 'PARSING', title: '解析中' },
    { key: 'PREVIEW_READY', title: '预览就绪' },
    { key: 'VALIDATED', title: '已校验' },
    { key: 'CONFIRMED', title: '已确认' },
  ]
  return stageOrder.map((stage) => {
    const count = b[stage.key]
    let status: WorkbenchStage['status'] = 'pending'
    if (stage.key === 'CONFIRMED' && count > 0) status = 'completed'
    else if (count > 0) status = 'active'
    return {
      key: stage.key,
      title: stage.title,
      status,
      statusText: `${count} 个批次`,
    }
  })
})

const signals = computed<SignalMetric[]>(() => {
  const b = statusBuckets.value
  return [
    { key: 'total', label: '本页批次', value: batches.value.length, tone: 'blue' },
    { key: 'confirmed', label: '已确认', value: b.CONFIRMED, tone: 'green' },
    { key: 'validated', label: '已校验', value: b.VALIDATED, tone: 'blue' },
    { key: 'previewReady', label: '预览就绪', value: b.PREVIEW_READY, tone: 'orange' },
    { key: 'failed', label: '失败', value: b.FAILED, tone: 'red' },
    { key: 'cancelled', label: '已取消', value: b.CANCELLED, tone: 'gray' },
  ]
})

const courseSelectOptions = computed(() =>
  courseOptions.value.map((item) => ({
    value: item.id,
    label: `${item.courseCode} · ${item.courseName}`,
  })),
)

const uploadAssessmentItemOptions = computed(() =>
  uploadAssessmentItems.value.map((item) => ({
    value: item.id,
    label: `${item.itemCode} · ${item.itemName}`,
  })),
)

const queryAssessmentItemOptions = computed(() =>
  queryAssessmentItems.value.map((item) => ({
    value: item.id,
    label: `${item.itemCode} · ${item.itemName}`,
  })),
)

async function loadCourses() {
  if (!qualityStore.currentTrainingPlanId) {
    courseOptions.value = []
    return
  }
  const page = await qualityCourseApi.page({
    pageNum: 1,
    pageSize: 100,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    enabled: true,
  })
  courseOptions.value = page.list
}

async function loadUploadAssessmentItems(qualityCourseId: string | undefined) {
  if (!qualityCourseId) {
    uploadAssessmentItems.value = []
    return
  }
  uploadAssessmentLoading.value = true
  try {
    uploadAssessmentItems.value = await assessmentItemApi.listByCourse(qualityCourseId)
  } catch (e) {
    console.error('[score-batch] 加载上传表单考核环节列表失败', e)
    uploadAssessmentItems.value = []
    message.error('加载考核环节列表失败')
  } finally {
    uploadAssessmentLoading.value = false
  }
}

async function loadQueryAssessmentItems(qualityCourseId: string | undefined) {
  if (!qualityCourseId) {
    queryAssessmentItems.value = []
    return
  }
  queryAssessmentLoading.value = true
  try {
    queryAssessmentItems.value = await assessmentItemApi.listByCourse(qualityCourseId)
  } catch (e) {
    console.error('[score-batch] 加载查询表单考核环节列表失败', e)
    queryAssessmentItems.value = []
  } finally {
    queryAssessmentLoading.value = false
  }
}

async function loadBatches() {
  loading.value = true
  try {
    const page = await scoreBatchApi.page({
      ...query,
      qualityCourseId: query.qualityCourseId || undefined,
      assessmentItemId: query.assessmentItemId || undefined,
      status: query.status || undefined,
      sourceMode: query.sourceMode || undefined,
      keyword: query.keyword?.trim() || undefined,
    })
    batches.value = page.list
    total.value = page.total
  } finally {
    loading.value = false
  }
}

function handlePageChange(payload: { current: number, pageSize: number }) {
  query.pageNum = payload.current
  query.pageSize = payload.pageSize
  loadBatches()
}

const batchListColumns: ColumnsType = [
  { title: '批次 ID', dataIndex: 'id', key: 'id', width: 120 },
  { title: '编码', dataIndex: 'batchCode', key: 'batchCode', width: 140 },
  { title: '名称', dataIndex: 'batchName', key: 'batchName' },
  { title: '课程', key: 'course', width: 220 },
  { title: '考核环节', key: 'assessmentItem', width: 200 },
  { title: '学年', dataIndex: 'schoolYear', key: 'schoolYear', width: 110 },
  { title: '学期', dataIndex: 'semester', key: 'semester', width: 70 },
  { title: '接入模式', dataIndex: 'sourceMode', key: 'sourceMode', width: 160 },
  { title: '行数（成功/错误/总）', key: 'rowsBreakdown', width: 180 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '提交时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 360, fixed: 'right' },
]

const diagnosticsColumns: ColumnsType = [
  { title: 'Excel 行号', dataIndex: 'rowIndex', key: 'rowIndex', width: 80 },
  { title: '学号', dataIndex: 'studentNumber', key: 'studentNumber' },
  { title: '姓名', dataIndex: 'studentName', key: 'studentName' },
  { title: '班级', dataIndex: 'className', key: 'className' },
  { title: '原始得分', dataIndex: 'rawScore', key: 'rawScore' },
  { title: '是否通过', dataIndex: 'valid', key: 'valid', width: 90 },
  { title: '错误码 / 说明', key: 'errorInfo' },
]

function resetQuery() {
  query.pageNum = 1
  query.qualityCourseId = ''
  query.assessmentItemId = ''
  query.status = undefined
  query.sourceMode = undefined
  query.keyword = ''
  loadBatches()
}

async function handleUpload(options: UploadRequestOption) {
  if (!uploadForm.qualityCourseId) {
    message.warning('请先选择质量评价课程')
    options.onError?.(new Error('课程未选择'))
    return
  }
  if (!uploadForm.assessmentItemId) {
    message.warning('请填写考核环节 ID（后端必填）')
    options.onError?.(new Error('考核环节未填写'))
    return
  }
  if (!uploadForm.batchCode.trim() || !uploadForm.batchName.trim()) {
    message.warning('请填写批次编码与名称')
    options.onError?.(new Error('批次编码 / 名称未填写'))
    return
  }
  uploading.value = true
  try {
    const file = options.file as File
    // 步骤 1：上传 Excel 到 edu-storage 拿 sourceFileId
    const uploaded = await uploadFile(file, { businessType: 'QUALITY_SCORE_IMPORT' })
    const sourceFileId = String(uploaded.id)
    // 步骤 2：注册成绩批次
    const batchId = await scoreBatchApi.create({
      qualityCourseId: uploadForm.qualityCourseId,
      assessmentItemId: uploadForm.assessmentItemId,
      batchCode: uploadForm.batchCode.trim(),
      batchName: uploadForm.batchName.trim(),
      sourceMode: uploadForm.sourceMode || 'EXCEL_IMPORT',
      sourceFileId,
      schoolYear: uploadForm.schoolYear || undefined,
      semester: uploadForm.semester || undefined,
    })
    // 步骤 3：触发解析
    await scoreBatchApi.enqueueParse(batchId)
    message.success(`已提交导入 batchId=${batchId}，解析完成后可预览并确认`)
    // ant-design-vue customRequest 的 onSuccess 第二参为 XMLHttpRequest，可选；本地文件 IO 流程不传 xhr。
    options.onSuccess?.({})
    await loadBatches()
  } catch (err) {
    options.onError?.(err as Error)
  } finally {
    uploading.value = false
  }
}

async function openPreview(record: ScoreBatchVO) {
  previewBatch.value = record
  previewVisible.value = true
  previewLoading.value = true
  try {
    const preview = await scoreBatchApi.preview(record.id)
    diagnostics.value = preview.diagnostics || []
    previewSummary.totalRows = preview.totalRows ?? 0
    previewSummary.successRows = preview.successRows ?? 0
    previewSummary.errorRows = preview.errorRows ?? 0
    previewSummary.errorSummary = preview.errorSummary
  } finally {
    previewLoading.value = false
  }
}

async function handleValidate(record: ScoreBatchVO) {
  void confirmAsync({
    title: '校验该批次？',
    content: `批次 ${record.id} 校验通过后将进入 VALIDATED 状态，是否继续？`,
    type: 'info',
    onOk: async () => {
      await scoreBatchApi.validate(record.id)
      message.success('批次已校验')
      await loadBatches()
    },
  })
}

async function handleConfirm(record: ScoreBatchVO) {
  void confirmAsync({
    title: '确认该批次？',
    content: `批次 ${record.id} 确认后将参与达成度计算，是否继续？`,
    type: 'info',
    onOk: async () => {
      await scoreBatchApi.confirm(record.id)
      message.success('批次已确认')
      await loadBatches()
    },
  })
}

async function handleCancel(record: ScoreBatchVO) {
  void confirmAsync({
    title: '取消该批次？',
    content: `批次 ${record.id} 取消后不再参与达成度计算`,
    type: 'error',
    onOk: async () => {
      await scoreBatchApi.updateStatus({
        id: record.id,
        status: 'CANCELLED',
      })
      message.success('批次已取消')
      await loadBatches()
    },
  })
}

async function handleReParse(record: ScoreBatchVO) {
  void confirmAsync({
    title: '重新解析该批次？',
    content: `仅 PENDING / FAILED 状态可触发；当前状态：${SCORE_BATCH_STATUS_LABEL[record.status]}`,
    type: 'warning',
    onOk: async () => {
      await scoreBatchApi.enqueueParse(record.id)
      message.success('已重新触发解析')
      await loadBatches()
    },
  })
}

/* ========== 编辑 / 删除批次 ========== */

const editorVisible = ref(false)
const editorSubmitting = ref(false)
const editor = reactive<ScoreBatchSavePayload>({
  id: undefined,
  qualityCourseId: '',
  assessmentItemId: '',
  batchCode: '',
  batchName: '',
  sourceMode: 'EXCEL_IMPORT',
  sourceFileId: undefined,
  externalPullTaskId: undefined,
  schoolYear: '',
  semester: '',
})
const editorAssessmentItems = ref<AssessmentItemVO[]>([])

const editorAssessmentItemOptions = computed(() =>
  editorAssessmentItems.value.map((item) => ({
    value: item.id,
    label: `${item.itemCode} · ${item.itemName}`,
  })),
)

async function openEdit(record: ScoreBatchVO) {
  editor.id = record.id
  editor.qualityCourseId = record.qualityCourseId
  editor.assessmentItemId = record.assessmentItemId || ''
  editor.batchCode = record.batchCode
  editor.batchName = record.batchName
  editor.sourceMode = record.sourceMode
  editor.sourceFileId = record.sourceFileId
  editor.externalPullTaskId = record.externalPullTaskId
  editor.schoolYear = record.schoolYear || ''
  editor.semester = record.semester || ''
  try {
    editorAssessmentItems.value = await assessmentItemApi.listByCourse(record.qualityCourseId)
  } catch {
    editorAssessmentItems.value = []
  }
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.batchCode.trim() || !editor.batchName.trim()) {
    message.error('请填写批次编码与名称')
    return
  }
  if (!editor.qualityCourseId || !editor.assessmentItemId) {
    message.error('课程与考核环节不能为空')
    return
  }
  editorSubmitting.value = true
  try {
    await scoreBatchApi.update({
      ...editor,
      batchCode: editor.batchCode.trim(),
      batchName: editor.batchName.trim(),
      schoolYear: editor.schoolYear?.trim() || undefined,
      semester: editor.semester?.trim() || undefined,
    })
    message.success('批次已更新')
    editorVisible.value = false
    await loadBatches()
  } finally {
    editorSubmitting.value = false
  }
}

function canEdit(status: ScoreBatchStatus) {
  // CONFIRMED 被后端锁住，其余状态允许修改元数据
  return status !== 'CONFIRMED'
}

const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

async function openAuditDrawer(record: ScoreBatchVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const page = await getOperationLogPage({
      pageNum: 1,
      pageSize: 50,
      module: 'SCORE_BATCH',
      category: 'QUALITY',
      description: record.id,
    })
    auditEvents.value = page.list.map((log) => ({
      id: log.id,
      operatorName: log.userDto?.nickName || log.userDto?.userName || '-',
      operationType: log.type,
      operationLabel: log.detail || log.type,
      time: log.createTime,
      targetType: log.module,
      targetId: log.bizId || undefined,
      beforeValue: log.changeDetails ? JSON.parse(log.changeDetails)?.before : undefined,
      afterValue: log.changeDetails ? JSON.parse(log.changeDetails)?.after : undefined,
    }))
  } catch {
    auditEvents.value = []
  } finally {
    auditLoading.value = false
  }
}

const batchResultItems = computed<TaskResultItem[]>(() => {
  return batches.value
    .filter((b) => b.status === 'FAILED' || b.status === 'PARSING')
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      title: `${b.batchCode} - ${b.batchName}`,
      statusLabel: statusLabel(b.status),
      statusTone: b.status === 'FAILED' ? 'red' : 'blue',
      description:
        b.status === 'FAILED'
          ? `错误 ${b.errorRows ?? 0} 行 / 总 ${b.totalRows ?? 0} 行`
          : `解析中…`,
      time: b.createTime || undefined,
      actions: [{ key: 'preview', label: '预览' }],
    }))
})

function handleBatchResultAction(payload: { item: TaskResultItem, action: { key: string } }) {
  const record = batches.value.find((b) => b.id === payload.item.id)
  if (record && payload.action.key === 'preview') openPreview(record)
}

function canDelete(status: ScoreBatchStatus) {
  // 仅安全状态允许物理删除；已 CONFIRMED 禁止删除以保护达成度计算血缘
  return status === 'PENDING' || status === 'FAILED' || status === 'CANCELLED'
}

async function handleDelete(record: ScoreBatchVO) {
  void confirmAsync({
    title: `删除批次 ${record.batchCode}？`,
    content: '删除后批次及关联成绩明细会被清除，该操作不可恢复，请谨慎操作。',
    type: 'error',
    onOk: async () => {
      await scoreBatchApi.delete(record.id)
      message.success('已删除')
      await loadBatches()
    },
  })
}

function canValidate(status: ScoreBatchStatus) {
  return status === 'PREVIEW_READY'
}
function canConfirm(status: ScoreBatchStatus) {
  return status === 'VALIDATED'
}
/**
 * 后端 ScoreBatchServiceImpl.updateStatus 状态机：
 * - 仅检查：当前状态 != CONFIRMED（CONFIRMED 状态上锁）且 target != CONFIRMED（CONFIRMED 走 /confirm）
 * - 未限制源状态，因此 PENDING / PARSING / PREVIEW_READY / VALIDATED / FAILED 均可 → CANCELLED
 */
function canCancel(status: ScoreBatchStatus) {
  return status !== 'CONFIRMED' && status !== 'CANCELLED'
}
function canReParse(status: ScoreBatchStatus) {
  return status === 'PENDING' || status === 'FAILED'
}

watch(
  () => qualityStore.currentTrainingPlanId,
  async () => {
    await loadCourses()
    // 切换培养方案后课程 / 考核环节列表均失效，应重置选中项
    uploadForm.qualityCourseId = ''
    uploadForm.assessmentItemId = ''
    uploadAssessmentItems.value = []
    query.qualityCourseId = ''
    query.assessmentItemId = ''
    queryAssessmentItems.value = []
  },
)

watch(
  () => uploadForm.qualityCourseId,
  async (courseId) => {
    uploadForm.assessmentItemId = ''
    await loadUploadAssessmentItems(courseId || undefined)
  },
)

watch(
  () => query.qualityCourseId,
  async (courseId) => {
    query.assessmentItemId = ''
    await loadQueryAssessmentItems(courseId || undefined)
  },
)

onMounted(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setCurrent({ trainingPlanId: qualityStore.trainingPlanOptions[0].id })
    }
  }
  await loadCourses()
  await loadBatches()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="score-batch__context">
        <div class="score-batch__context-left">
          <a-select
            v-model:value="query.qualityCourseId"
            placeholder="按课程筛选"
            class="score-batch__filter score-batch__filter--lg"
            allow-clear
            :options="courseSelectOptions"
          />
          <a-select
            v-model:value="query.assessmentItemId"
            placeholder="考核环节"
            class="score-batch__filter score-batch__filter--lg"
            :options="queryAssessmentItemOptions"
            :loading="queryAssessmentLoading"
            :disabled="!query.qualityCourseId"
            allow-clear
          />
          <a-select
            v-model:value="query.status"
            placeholder="状态"
            class="score-batch__filter"
            allow-clear
            :options="statusOptions"
          />
          <a-select
            v-model:value="query.sourceMode"
            placeholder="接入模式"
            class="score-batch__filter score-batch__filter--lg"
            allow-clear
            :options="SOURCE_MODE_OPTIONS"
          />
          <a-input
            v-model:value="query.keyword"
            placeholder="关键字"
            class="score-batch__filter"
            @press-enter="loadBatches"
          />
        </div>
        <div class="score-batch__context-right">
          <UiButton variant="ghost" size="sm" @click="resetQuery"> 重置 </UiButton>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadBatches">
            查询
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!qualityStore.currentTrainingPlanId"
      description="请先选择培养方案，再进行成绩批次的接入与计算"
      class="score-batch__empty"
    />

    <template v-else>
      <StageRail :stages="stages" compact class="score-batch__stages" />
      <SignalBand :metrics="signals" compact class="score-batch__signals" />

      <TaskResultPanel
        v-if="batchResultItems.length > 0"
        title="待关注批次"
        :items="batchResultItems"
        class="score-batch__result-panel"
        @action="handleBatchResultAction"
      />

      <div class="score-batch__upload">
        <header class="score-batch__upload-header">
          <h3 class="score-batch__upload-title">Excel 成绩导入</h3>
          <p class="score-batch__upload-hint">
            表头按后端 ScoreImportExcelParser 约定：学号 / 姓名 / 班级 / 最终成绩。 上传后进入
            <code>PENDING → PARSING → PREVIEW_READY</code> 状态机，由
            <strong>预览 → 校验 → 确认</strong> 完成闭环。
          </p>
        </header>
        <a-form layout="inline" :model="uploadForm" class="score-batch__upload-form">
          <a-form-item label="课程" required>
            <a-select
              v-model:value="uploadForm.qualityCourseId"
              placeholder="选择质量评价课程"
              class="score-batch__filter score-batch__filter--lg"
              :options="courseSelectOptions"
            />
          </a-form-item>
          <a-form-item label="考核环节" required>
            <a-select
              v-model:value="uploadForm.assessmentItemId"
              placeholder="选择考核环节"
              class="score-batch__filter score-batch__filter--lg"
              :options="uploadAssessmentItemOptions"
              :loading="uploadAssessmentLoading"
              :disabled="!uploadForm.qualityCourseId"
              allow-clear
            />
          </a-form-item>
          <a-form-item label="批次编码" required>
            <a-input
              v-model:value="uploadForm.batchCode"
              placeholder="batch_code"
              class="score-batch__filter"
            />
          </a-form-item>
          <a-form-item label="批次名称" required>
            <a-input
              v-model:value="uploadForm.batchName"
              placeholder="batch_name"
              class="score-batch__filter score-batch__filter--lg"
            />
          </a-form-item>
          <a-form-item label="接入模式">
            <a-select
              v-model:value="uploadForm.sourceMode"
              class="score-batch__filter score-batch__filter--lg"
              :options="SOURCE_MODE_OPTIONS"
            />
          </a-form-item>
          <a-form-item label="学年">
            <a-input
              v-model:value="uploadForm.schoolYear"
              placeholder="例：2024-2025"
              class="score-batch__filter"
            />
          </a-form-item>
          <a-form-item label="学期">
            <a-select
              v-model:value="uploadForm.semester"
              class="score-batch__filter score-batch__filter--xxs"
            >
              <a-select-option value="1"> 1 </a-select-option>
              <a-select-option value="2"> 2 </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-upload
              name="file"
              accept=".xlsx,.xls"
              :show-upload-list="false"
              :custom-request="handleUpload"
              :disabled="uploading"
            >
              <UiButton variant="primary" :loading="uploading"> 上传 Excel </UiButton>
            </a-upload>
          </a-form-item>
        </a-form>
      </div>

      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        class="score-batch__table"
        :columns="batchListColumns"
        :data-source="batches"
        :loading="loading"
        row-key="id"
        size="middle"
        :total="total"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'course'">
            <div>{{ record.qualityCourseName || '-' }}</div>
            <div class="score-batch__sub-text">
              {{ record.qualityCourseCode || '' }}
            </div>
          </template>
          <template v-else-if="column.key === 'assessmentItem'">
            <div>{{ record.assessmentItemName || '-' }}</div>
            <div class="score-batch__sub-text">
              {{ record.assessmentItemCode || '' }}
            </div>
          </template>
          <template
            v-else-if="
              column.key === 'schoolYear'
                || column.key === 'semester'
                || column.key === 'createTime'
            "
          >
            {{ text || '-' }}
          </template>
          <template v-else-if="column.key === 'sourceMode'">
            {{ sourceModeLabel(text) }}
          </template>
          <template v-else-if="column.key === 'rowsBreakdown'">
            <span class="score-batch__num-success">{{ record.successRows ?? 0 }}</span>
            /
            <span class="score-batch__num-error">{{ record.errorRows ?? 0 }}</span>
            /
            <span>{{ record.totalRows ?? 0 }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(text)">
              {{ statusLabel(text) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <UiButton variant="ghost" size="sm" @click="openPreview(record)"> 预览 </UiButton>
              <UiButton
                v-if="canValidate(record.status)"
                variant="ghost"
                size="sm"
                @click="handleValidate(record)"
              >
                校验
              </UiButton>
              <UiButton
                v-if="canConfirm(record.status)"
                variant="primary"
                size="sm"
                @click="handleConfirm(record)"
              >
                确认
              </UiButton>
              <UiButton
                v-if="canReParse(record.status)"
                variant="outline"
                size="sm"
                @click="handleReParse(record)"
              >
                重新解析
              </UiButton>
              <UiButton
                v-if="canEdit(record.status)"
                variant="ghost"
                size="sm"
                @click="openEdit(record)"
              >
                编辑
              </UiButton>
              <UiButton
                v-if="canCancel(record.status)"
                variant="ghost"
                status="danger"
                size="sm"
                @click="handleCancel(record)"
              >
                取消
              </UiButton>
              <UiButton
                v-if="canDelete(record.status)"
                variant="ghost"
                status="danger"
                size="sm"
                @click="handleDelete(record)"
              >
                删除
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="openAuditDrawer(record)"> 审计 </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </template>

    <UiDrawer v-model:open="previewVisible" title="批次明细预览" :width="960" :hide-footer="true">
      <a-descriptions
        v-if="previewBatch"
        :column="3"
        size="small"
        bordered
        class="score-batch__preview-descriptions"
      >
        <a-descriptions-item label="批次 ID">
          {{ previewBatch.id }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          <a-tag :color="statusColor(previewBatch.status)">
            {{ statusLabel(previewBatch.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="行数（成功/错误/总）">
          <span class="score-batch__num-success">{{ previewSummary.successRows }}</span>
          /
          <span :class="previewSummary.errorRows ? 'score-batch__num-error' : ''">
            {{ previewSummary.errorRows }}
          </span>
          /
          <span>{{ previewSummary.totalRows }}</span>
        </a-descriptions-item>
      </a-descriptions>
      <a-alert
        v-if="previewSummary.errorSummary"
        type="error"
        show-icon
        :message="previewSummary.errorSummary"
        class="score-batch__preview-alert"
      />
      <UiDataTable
        :columns="diagnosticsColumns"
        :data-source="diagnostics"
        :loading="previewLoading"
        row-key="rowIndex"
        size="small"
        :show-pagination="false"
        flat
        :total="diagnostics.length"
        :scroll="{ y: 420 }"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'rawScore'">
            {{ text ?? '-' }}
          </template>
          <template v-else-if="column.key === 'valid'">
            <a-tag :color="text ? 'green' : 'red'">
              {{ text ? '通过' : '失败' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'errorInfo'">
            <a-space direction="vertical" size="small" style="width: 100%">
              <a-space v-if="record.errorCodes?.length" wrap size="small">
                <a-tag v-for="code in record.errorCodes" :key="code" color="orange">
                  {{ code }}
                </a-tag>
              </a-space>
              <div
                v-for="(msg, idx) in record.errorMessages || []"
                :key="`${record.rowIndex}-${idx}`"
                class="score-batch__error-msg"
              >
                {{ msg }}
              </div>
              <span
                v-if="!record.errorCodes?.length && !record.errorMessages?.length"
                class="score-batch__sub-text"
              >
                -
              </span>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </UiDrawer>

    <UiDrawer
      v-model:open="editorVisible"
      :title="`编辑批次 ${editor.batchCode}`"
      :width="720"
      :confirm-loading="editorSubmitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-alert
        type="info"
        show-icon
        message="批次元数据编辑"
        description="可修改批次名称 / 编码 / 考核环节 / 学年学期；课程一经建立不建议变更。若批次已 CONFIRMED，请先取消后再编辑。"
        class="score-batch__editor-alert"
      />
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="批次编码" required>
              <a-input v-model:value="editor.batchCode" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="批次名称" required>
              <a-input v-model:value="editor.batchName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="考核环节" required>
              <a-select
                v-model:value="editor.assessmentItemId"
                :options="editorAssessmentItemOptions"
                placeholder="考核环节"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="接入模式">
              <a-select v-model:value="editor.sourceMode" :options="SOURCE_MODE_OPTIONS" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="学年">
              <a-input v-model:value="editor.schoolYear" placeholder="例：2024-2025" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="学期">
              <a-select v-model:value="editor.semester">
                <a-select-option value="1"> 1 </a-select-option>
                <a-select-option value="2"> 2 </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </UiDrawer>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="成绩批次操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.score-batch {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left,
  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 160px;

    &--lg {
      width: 220px;
    }

    &--xxs {
      width: 80px;
    }
  }

  &__empty {
    margin-top: 32px;
  }

  &__stages {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__result-panel {
    margin-bottom: 20px;
  }

  &__upload {
    margin-bottom: 20px;
    padding: 20px;
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__upload-header {
    margin-bottom: 16px;
  }

  &__upload-title {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__upload-hint {
    margin: 0;
    font-size: 13px;
    color: var(--dp-text-secondary, #64748b);
    line-height: 1.6;

    code {
      padding: 1px 6px;
      margin: 0 2px;
      font-size: 12px;
      background: var(--dp-gray-100, #f1f5f9);
      border-radius: 4px;
    }
  }

  &__upload-form {
    row-gap: 12px;
  }

  &__table {
    background: var(--dp-surface, #fff);
    border-radius: 8px;
  }

  &__sub-text {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__num-success {
    color: var(--ant-color-success, #16a34a);
  }

  &__num-error {
    color: var(--ant-color-error, #dc2626);
  }

  &__error-msg {
    color: var(--ant-color-error, #dc2626);
  }

  &__preview-descriptions {
    margin-bottom: 12px;
  }

  &__preview-alert,
  &__editor-alert {
    margin-bottom: 12px;
  }
}
</style>
