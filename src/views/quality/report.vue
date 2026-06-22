<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ReportQueryRequest,
  ReportSaveRequest,
  ReportVO,
} from '@/apis/quality/report'
/**
 * 质量评价 - 报告生成与确认台
 *
 * 后端契约（ReportController + ReportExportController）：
 * 1. AI 任务（COURSE_REPORT_GENERATE / PROGRAM_REPORT_GENERATE）生成草稿
 * 2. 状态机 DRAFT -> SUBMITTED -> CONFIRMED / RETURNED -> ARCHIVED（transitStatus 仅接受 id + targetStatus）
 * 3. SUBMITTED / CONFIRMED / ARCHIVED 状态可触发 Word / PDF / Excel 异步三格式导出
 * 4. 导出 exportStatus IDLE -> PENDING -> PROCESSING -> COMPLETED / FAILED，前端轮询 5s/次。
 */
import type {
  ReportExportStatus,
  ReportStatus,
  ReportType,
} from '@/apis/quality/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
  WorkbenchStageStatus,
} from '@/types/workbench'
import { LoadingOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import Modal from 'ant-design-vue/es/modal'
import { computed, onActivated, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { getOperationLogPage } from '@/apis/edu/operation-logs'
import {
  reportApi,
} from '@/apis/quality/report'
import {
  REPORT_EXPORT_STATUS_COLOR,
  REPORT_EXPORT_STATUS_LABEL,
  REPORT_STATUS_COLOR,
  REPORT_STATUS_LABEL,
  REPORT_TYPE_LABEL,
} from '@/apis/quality/types'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import {
  AchievementResultSelector,
  CourseSelector,
  ProgramSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import AuditTimelineDrawer from '@/components/workbench/AuditTimelineDrawer.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageRail from '@/components/workbench/StageRail.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import TaskResultPanel from '@/components/workbench/TaskResultPanel.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityStore } from '@/stores/modules/quality'
import { getUserProcessFailureMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'

function reportTypeLabel(value: ReportType): string {
  return strictEnumLabel(REPORT_TYPE_LABEL, value, '报告类型')
}

function reportStatusLabel(value: ReportStatus): string {
  return strictEnumLabel(REPORT_STATUS_LABEL, value, '报告状态')
}

function reportStatusColor(value: ReportStatus): BadgeTone {
  return strictEnumTone(REPORT_STATUS_COLOR, value, '报告状态')
}

function exportStatusLabel(value: ReportExportStatus): string {
  return strictEnumLabel(REPORT_EXPORT_STATUS_LABEL, value, '报告导出状态')
}

function exportStatusColor(value: ReportExportStatus): BadgeTone {
  return strictEnumTone(REPORT_EXPORT_STATUS_COLOR, value, '报告导出状态')
}

function reportExportFailureMessage(errorMessage?: string): string {
  return getUserProcessFailureMessage(
    errorMessage,
    '报告文件生成未完成，请稍后重试；如多次失败，请联系管理员核对报告模板和附件材料。',
  )
}

const qualityStore = useQualityStore()

const list = ref<ReportVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<ReportQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  reportType: undefined,
  qualityCourseId: '',
  schoolYear: '',
  semester: '',
  status: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ReportSaveRequest>({
  reportType: 'COURSE_ACHIEVEMENT',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  achievementResultId: '',
  title: '',
  schoolYear: '',
  semester: '',
  bodyContent: '',
})
const submitting = ref(false)

function handleEditorProgramChange(value: string | null): void {
  editor.programId = value ?? ''
}

function handleEditorTrainingPlanChange(value: string | null): void {
  editor.trainingPlanId = value ?? ''
}

function handleEditorQualityCourseChange(value: string | null): void {
  editor.qualityCourseId = value ?? ''
}

function handleQueryQualityCourseChange(value: string | null): void {
  query.qualityCourseId = value ?? ''
}

function handleEditorAchievementResultChange(value: string | null): void {
  editor.achievementResultId = value ?? ''
}

const detailVisible = ref(false)
const detailRecord = ref<ReportVO | null>(null)
const detailLoading = ref(false)

const reportTypeOptions: Array<{ value: ReportType, label: string }> = [
  { value: 'COURSE_ACHIEVEMENT', label: REPORT_TYPE_LABEL.COURSE_ACHIEVEMENT },
  { value: 'PROGRAM_QUALITY', label: REPORT_TYPE_LABEL.PROGRAM_QUALITY },
  { value: 'IMPROVEMENT', label: REPORT_TYPE_LABEL.IMPROVEMENT },
  {
    value: 'AUDIT_EVALUATION_RECTIFICATION',
    label: REPORT_TYPE_LABEL.AUDIT_EVALUATION_RECTIFICATION,
  },
]
const statusOptions: Array<{ value: ReportStatus, label: string }> = [
  { value: 'DRAFT', label: REPORT_STATUS_LABEL.DRAFT },
  { value: 'SUBMITTED', label: REPORT_STATUS_LABEL.SUBMITTED },
  { value: 'CONFIRMED', label: REPORT_STATUS_LABEL.CONFIRMED },
  { value: 'RETURNED', label: REPORT_STATUS_LABEL.RETURNED },
  { value: 'ARCHIVED', label: REPORT_STATUS_LABEL.ARCHIVED },
]

const filterModel = computed<Record<string, unknown>>({
  get: () => query as Record<string, unknown>,
  set: (value) => {
    Object.assign(query, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'reportType',
    type: 'select',
    label: '类型',
    placeholder: '类型',
    allowClear: true,
    width: 140,
    options: reportTypeOptions,
  },
  {
    key: 'qualityCourseId',
    type: 'custom',
    label: '关联课程',
    width: 160,
  },
  {
    key: 'schoolYear',
    type: 'input',
    label: '学年',
    placeholder: '学年',
    width: 120,
  },
  {
    key: 'semester',
    type: 'input',
    label: '学期',
    placeholder: '学期',
    width: 100,
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: statusOptions,
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '关键字',
    width: 160,
  },
]

function handleSearch() {
  loadList()
}

function handleReset() {
  resetQuery()
}

const transitMap: Record<ReportStatus, ReportStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'RETURNED'],
  CONFIRMED: ['ARCHIVED', 'RETURNED'],
  RETURNED: ['DRAFT', 'SUBMITTED'],
  ARCHIVED: [],
}

async function loadList() {
  loading.value = true
  try {
    const page = await reportApi.page({
      ...query,
      trainingPlanId: qualityStore.currentTrainingPlanId || undefined,
      qualityCourseId: query.qualityCourseId || undefined,
      schoolYear: query.schoolYear || undefined,
      semester: query.semester || undefined,
      reportType: query.reportType || undefined,
      status: query.status || undefined,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = readPageList(page, '质量报告加载失败，请稍后重试')
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = readPageTotal(page, '质量报告加载失败，请稍后重试')
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
      return
    }
    resumeExportPollingForList()
  } catch (error) {
    showUserError(error, '质量报告加载失败')
  } finally {
    loading.value = false
  }
}

async function handleScopeChange(): Promise<void> {
  await loadList()
}

useQualityScopedLoader(handleScopeChange, { watchScope: true, immediate: false, reloadOnActivated: false })

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

const columns: ColumnsType = [
  { title: '标题', dataIndex: 'title', key: 'title' },
  { title: '类型', dataIndex: 'reportType', key: 'reportType', width: 120 },
  { title: '关联课程', key: 'qualityCourseRef', width: 120 },
  { title: '达成结果', key: 'achievementResultRef', width: 140 },
  { title: '学年 / 学期', key: 'period', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '附件 / 导出', key: 'exports', width: 260 },
  { title: '操作', key: 'actions', width: 380, fixed: 'right' },
]

function resetQuery() {
  query.pageNum = 1
  Object.assign(query, {
    reportType: undefined,
    qualityCourseId: '',
    schoolYear: '',
    semester: '',
    status: undefined,
    keyword: '',
  })
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    reportType: 'COURSE_ACHIEVEMENT',
    programId: qualityStore.currentProgramId || '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    achievementResultId: '',
    title: '',
    schoolYear: qualityStore.currentSchoolYear || '',
    semester: qualityStore.currentSemester || '',
    bodyContent: '',
  })
  editorVisible.value = true
}

async function openEdit(record: ReportVO) {
  if (!canEditReport(record.status)) {
    message.error('当前状态不允许编辑报告')
    return
  }
  editorMode.value = 'edit'
  detailLoading.value = true
  try {
    const detail = await reportApi.detail(record.id)
    Object.assign(editor, {
      id: detail.id,
      reportType: detail.reportType,
      programId: detail.programId || '',
      trainingPlanId: detail.trainingPlanId || '',
      qualityCourseId: detail.qualityCourseId || '',
      achievementResultId: detail.achievementResultId || '',
      title: detail.title,
      schoolYear: detail.schoolYear || '',
      semester: detail.semester || '',
      bodyContent: detail.bodyContent || '',
    })
    editorVisible.value = true
  } finally {
    detailLoading.value = false
  }
}

async function submitEditor() {
  if (editorMode.value === 'edit' && editor.id) {
    const current = list.value.find((item) => item.id === editor.id)
    if (current && !canEditReport(current.status)) {
      message.error('当前状态不允许编辑报告')
      return
    }
  }
  if (!editor.title.trim()) {
    message.error('请填写报告标题')
    return
  }
  if (!editor.programId) {
    message.error('请选择报告所属专业')
    return
  }
  if (!editor.schoolYear || !editor.semester) {
    message.error('请填写学年与学期')
    return
  }
  submitting.value = true
  try {
    const request: ReportSaveRequest = {
      id: editor.id,
      reportType: editor.reportType,
      programId: editor.programId,
      trainingPlanId: editor.trainingPlanId || undefined,
      qualityCourseId: editor.qualityCourseId || undefined,
      achievementResultId: editor.achievementResultId || undefined,
      title: editor.title.trim(),
      schoolYear: editor.schoolYear,
      semester: editor.semester,
      bodyContent: editor.bodyContent,
    }
    if (editorMode.value === 'create') {
      await reportApi.create(request)
      message.success('已创建报告草稿')
    } else {
      await reportApi.update(request)
      message.success('已保存修改')
    }
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

function nextStatuses(status: ReportStatus) {
  return strictEnumValue(transitMap, status, '报告状态')
}

function canEditReport(status: ReportStatus): boolean {
  return status === 'DRAFT' || status === 'RETURNED'
}

/**
 * 后端 ReportStatusTransitRequest 仅接受 id + targetStatus，不接受备注。
 * 如需记录驳回原因，请使用外层 ImprovementTask / AuditTrail 能力。
 */
async function handleTransit(record: ReportVO, to: ReportStatus) {
  if (to === 'RETURNED') {
    const ok = await confirmAsync({
      title: `${reportStatusLabel(record.status)} → ${reportStatusLabel(to)}`,
      content: '驳回后报告会重新进入修订状态，驳回原因请在外层改进任务中记录。',
      type: 'error',
    })
    if (!ok) return
  }
  await reportApi.transitStatus({ id: record.id, targetStatus: to })
  message.success('流转成功')
  await loadList()
}

/** 正在轮询导出状态的报告 ID 集合，用于禁用重复点击与表格展示加载动画。 */
const pollingExportIds = ref<Set<string>>(new Set())
/** 轮询代次：组件卸载时递增以中止在途 pollExportStatus 循环。 */
let exportPollGeneration = 0
const exportPollTokens = new Map<string, number>()

const EXPORT_POLL_INTERVAL_MS = 5000
/** 最大轮询时长 30 分钟：超出后停止轮询但不影响后端实际执行，用户可手工刷新列表。 */
const EXPORT_POLL_MAX_ATTEMPTS = 360

/**
 * 轮询异步导出状态：调用 detail 拿最新 exportStatus，直到到达终态 COMPLETED / FAILED，
 * 或达到最大尝试次数（30 分钟）。非终态（IDLE / PENDING / PROCESSING）持续轮询。
 */
async function pollExportStatus(id: string) {
  const token = ++exportPollGeneration
  exportPollTokens.set(id, token)
  pollingExportIds.value.add(id)
  try {
    for (let attempt = 0; attempt < EXPORT_POLL_MAX_ATTEMPTS; attempt++) {
      if (exportPollTokens.get(id) !== token) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, EXPORT_POLL_INTERVAL_MS))
      if (exportPollTokens.get(id) !== token) {
        return
      }
      const detail = await reportApi.detail(id)
      const idx = list.value.findIndex((item) => item.id === id)
      if (idx >= 0) list.value[idx] = detail
      const title = reportTitle(detail)
      const exportStatus = detail.exportStatus
      if (exportStatus === 'COMPLETED') {
        message.success(`${title} 三格式导出完成`)
        return
      }
      if (exportStatus === 'FAILED') {
        Modal.error({
          title: `${title} 导出失败`,
          content: reportExportFailureMessage(detail.exportErrorMessage),
          width: 640,
        })
        return
      }
    }
    message.warning(
      `报告导出已超过 ${(EXPORT_POLL_INTERVAL_MS * EXPORT_POLL_MAX_ATTEMPTS) / 60_000} 分钟未完成，已停止轮询；请稍后手工刷新列表查看最新状态。`,
    )
  } finally {
    if (exportPollTokens.get(id) === token) {
      exportPollTokens.delete(id)
    }
    pollingExportIds.value.delete(id)
  }
}

function reportTitle(record: ReportVO): string {
  return record.title?.trim() || reportTypeLabel(record.reportType)
}

async function handleExport(record: ReportVO) {
  const currentExport = record.exportStatus
  if (currentExport === 'PENDING' || currentExport === 'PROCESSING') {
    message.info(
      `${reportTitle(record)}当前处于「${exportStatusLabel(currentExport)}」，请等待完成`,
    )
    if (!pollingExportIds.value.has(record.id)) void pollExportStatus(record.id)
    return
  }
  void confirmAsync({
    title: `导出 ${record.title}？`,
    content: '系统会生成 Word / PDF / Excel 三种报告文件，完成后可在附件列查看。',
    type: 'info',
    onOk: async () => {
      await reportApi.export(record.id)
      message.success('已触发异步导出，后台生成中')
      // 立即把本行标为 PENDING，UI 先展示「待导出」徽标，避免等 5s 才感知
      const idx = list.value.findIndex((item) => item.id === record.id)
      if (idx >= 0) {
        list.value[idx] = {
          ...list.value[idx],
          exportStatus: 'PENDING',
          exportErrorMessage: undefined,
        }
      }
      void pollExportStatus(record.id)
    },
  })
}

function isExportInFlight(status: ReportExportStatus | undefined) {
  return status === 'PENDING' || status === 'PROCESSING'
}

function resumeExportPollingForList() {
  for (const record of list.value) {
    if (isExportInFlight(record.exportStatus) && !pollingExportIds.value.has(record.id)) {
      void pollExportStatus(record.id)
    }
  }
}

async function downloadReportExportFile(record: ReportVO, kind: 'word' | 'pdf' | 'excel') {
  const fileId = kind === 'word'
    ? record.wordFileId
    : kind === 'pdf'
      ? record.pdfFileId
      : record.excelFileId
  if (!fileId) {
    message.warning('该格式文件尚未生成')
    return
  }
  const suffix = kind === 'word' ? 'docx' : kind === 'pdf' ? 'pdf' : 'xlsx'
  await handleDownloadFile({
    fileId,
    fileName: `${reportTitle(record)}.${suffix}`,
  })
}

async function handleDelete(record: ReportVO) {
  if (record.status !== 'DRAFT') {
    message.warning('只能删除草稿状态的报告')
    return
  }
  void confirmAsync({
    title: `删除报告 ${record.title}？`,
    type: 'error',
    onOk: async () => {
      await reportApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

async function openDetail(record: ReportVO) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await reportApi.detail(record.id)
  } finally {
    detailLoading.value = false
  }
}

/* ========== 阶段轨与信号指标 ========== */

const statusBuckets = computed(() => {
  const buckets: Record<ReportStatus, number> = {
    DRAFT: 0,
    SUBMITTED: 0,
    CONFIRMED: 0,
    RETURNED: 0,
    ARCHIVED: 0,
  }
  for (const r of list.value) {
    buckets[r.status] += 1
  }
  return buckets
})

const stages = computed<WorkbenchStage[]>(() => {
  const b = statusBuckets.value
  const order: Array<{ key: ReportStatus, title: string }> = [
    { key: 'DRAFT', title: '草稿' },
    { key: 'SUBMITTED', title: '待确认' },
    { key: 'CONFIRMED', title: '已确认' },
    { key: 'ARCHIVED', title: '已归档' },
  ]
  return order.map((stage) => {
    const count = b[stage.key]
    let status: WorkbenchStageStatus = 'pending'
    if (stage.key === 'ARCHIVED' && count > 0) status = 'completed'
    else if (count > 0) status = 'active'
    return {
      key: stage.key,
      title: stage.title,
      status,
      statusText: `${count} 条`,
    }
  })
})

const signals = computed<SignalMetric[]>(() => {
  const b = statusBuckets.value
  const exporting = list.value.filter((r) => isExportInFlight(r.exportStatus)).length
  const exportFailed = list.value.filter((r) => r.exportStatus === 'FAILED').length
  const exportComplete = list.value.filter((r) => r.exportStatus === 'COMPLETED').length
  return [
    { key: 'total', label: '本页报告', value: list.value.length, tone: 'blue' },
    { key: 'draft', label: '草稿', value: b.DRAFT, tone: b.DRAFT > 0 ? 'orange' : 'gray' },
    {
      key: 'submitted',
      label: '待确认',
      value: b.SUBMITTED,
      tone: b.SUBMITTED > 0 ? 'blue' : 'gray',
    },
    { key: 'returned', label: '已驳回', value: b.RETURNED, tone: b.RETURNED > 0 ? 'red' : 'gray' },
    {
      key: 'export-running',
      label: '导出中',
      value: exporting,
      tone: exporting > 0 ? 'orange' : 'gray',
    },
    {
      key: 'export-completed',
      label: '导出完成',
      value: exportComplete,
      tone: exportComplete > 0 ? 'green' : 'gray',
    },
    {
      key: 'export-failed',
      label: '导出未完成',
      value: exportFailed,
      tone: exportFailed > 0 ? 'red' : 'gray',
    },
  ]
})


const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

async function openAuditDrawer(record: ReportVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const page = await getOperationLogPage({
      pageNum: 1,
      pageSize: 50,
      module: 'REPORT',
      category: 'QUALITY',
      bizId: record.id,
    })
    auditEvents.value = readPageList(page, '报告审计记录加载失败，请稍后重试').map((log) => {
      return {
        id: log.id,
        operatorName: log.userDto.nickName,
        operationType: log.type,
        operationLabel: log.detail,
        time: log.createTime,
        targetType: log.module,
        targetId: log.bizId || undefined,
        reason: log.changeDetails || log.errorStack || undefined,
      }
    })
  } finally {
    auditLoading.value = false
  }
}

const reportResultItems = computed<TaskResultItem[]>(() => {
  return list.value
    .filter((r) => r.status === 'RETURNED' || r.exportStatus === 'FAILED')
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      title: reportTitle(r),
      statusLabel: r.status === 'RETURNED' ? '已驳回' : '导出未完成',
      statusTone: 'red',
      description:
        r.status === 'RETURNED'
          ? '审核驳回，需修订后重新提交'
          : reportExportFailureMessage(r.exportErrorMessage),
      actions: [{ key: 'detail', label: '详情' }],
    }))
})

function handleReportResultAction(actionEvent: { item: TaskResultItem, action: { key: string } }) {
  const record = list.value.find((r) => r.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'detail') openDetail(record)
}

onMounted(loadList)

onActivated(() => {
  if (qualityStore.currentTrainingPlanId) {
    void loadList()
  }
})

onBeforeUnmount(() => {
  exportPollGeneration += 1
  exportPollTokens.clear()
  pollingExportIds.value.clear()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="handleScopeChange">
            刷新
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <UiEmpty
      v-if="!qualityStore.currentTrainingPlanId"
      description="请选择培养方案"
      class="report__empty"
    />

    <template v-else>
      <StageRail :stages="stages" compact class="report__stages" />
      <SignalBand :metrics="signals" compact class="report__signals" />

      <TaskResultPanel
        v-if="reportResultItems.length > 0"
        title="待关注报告"
        :items="reportResultItems"
        class="report__result-panel"
        @action="handleReportResultAction"
      />

      <UiCard class="detail-table-card report__table-card">
        <template #title>报告列表</template>
        <template #extra>
          <UiButton size="sm" @click="openCreate">新建报告</UiButton>
        </template>

        <UiFilterBar
          v-model="filterModel"
          :fields="filterFields"
          show-labels
          @search="handleSearch"
          @reset="handleReset"
        >
          <template #field-qualityCourseId>
            <CourseSelector
              :value="query.qualityCourseId || null"
              :training-plan-id="qualityStore.currentTrainingPlanId || null"
              placeholder="关联课程"
              :width="160"
              @change="handleQueryQualityCourseChange"
            />
          </template>
        </UiFilterBar>

        <UiDataTable
          class="student-detail-table__data-table"
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          :columns="columns"
          :data-source="list"
          :loading="loading"
          row-key="id"
          size="middle"
          :total="total"
          flat
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'reportType'">
              {{ reportTypeLabel(record.reportType) }}
            </template>
            <template v-else-if="column.key === 'qualityCourseRef'">
              <span v-if="record.qualityCourseId">
                {{ record.qualityCourseCode }} {{ record.qualityCourseName }}
              </span>
            </template>
            <template v-else-if="column.key === 'achievementResultRef'">
              {{ record.achievementResultLabel }}
            </template>
            <template v-else-if="column.key === 'period'">
              {{ record.schoolYear }} / {{ record.semester }}
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="reportStatusColor(record.status)" size="sm">
                {{ reportStatusLabel(record.status) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'exports'">
              <a-space size="small" wrap>
                <UiTextAction
                  v-if="record.wordFileId"
                  @click="downloadReportExportFile(record, 'word')"
                >
                  Word
                </UiTextAction>
                <UiTextAction
                  v-if="record.pdfFileId"
                  @click="downloadReportExportFile(record, 'pdf')"
                >
                  PDF
                </UiTextAction>
                <UiTextAction
                  v-if="record.excelFileId"
                  @click="downloadReportExportFile(record, 'excel')"
                >
                  Excel
                </UiTextAction>
                <UiTag
                  v-if="record.exportStatus && record.exportStatus !== 'COMPLETED'"
                  :tone="exportStatusColor(record.exportStatus)"
                  size="sm"
                >
                  <LoadingOutlined v-if="isExportInFlight(record.exportStatus)" />
                  {{ exportStatusLabel(record.exportStatus) }}
                </UiTag>
                <a-tooltip
                  v-if="record.exportStatus === 'FAILED'"
                  :title="reportExportFailureMessage(record.exportErrorMessage)"
                >
                  <UiTag tone="red" size="sm"> 错误详情 </UiTag>
                </a-tooltip>
              </a-space>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <UiTextAction @click="openDetail(record)">详情</UiTextAction>
                <UiTextAction
                  :disabled="!canEditReport(record.status)"
                  @click="openEdit(record)"
                >
                  编辑
                </UiTextAction>
                <UiTextAction
                  v-for="to in nextStatuses(record.status)"
                  :key="to"
                  :tone="to === 'RETURNED' ? 'danger' : 'primary'"
                  @click="handleTransit(record, to)"
                >
                  -> {{ reportStatusLabel(to) }}
                </UiTextAction>
                <UiTextAction
                  v-if="record.status === 'SUBMITTED' || record.status === 'CONFIRMED' || record.status === 'ARCHIVED'"
                  :disabled="isExportInFlight(record.exportStatus) || pollingExportIds.has(record.id)"
                  @click="handleExport(record)"
                >
                  导出三格式
                </UiTextAction>
                <UiTextAction v-if="record.status === 'DRAFT'" tone="danger" @click="handleDelete(record)">
                  删除
                </UiTextAction>
                <UiTextAction @click="openAuditDrawer(record)">审计</UiTextAction>
              </div>
            </template>
          </template>
        </UiDataTable>
      </UiCard>

      <UiDrawer
        v-model:open="editorVisible"
        :title="editorMode === 'create' ? '新建质量评价报告' : '编辑质量评价报告'"
        :width="800"
        :confirm-loading="submitting"
        :hide-footer="false"
        ok-text="保存"
        @ok="submitEditor"
      >
        <a-form layout="vertical" :model="editor">
          <a-row :gutter="12">
            <a-col :span="16">
              <a-form-item label="标题" required>
                <a-input
                  v-model:value="editor.title"
                  placeholder="例：2024-2025 学年春季学期《程序设计基础》课程评价报告"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="类型" required>
                <a-select
                  v-model:value="editor.reportType"
                  :options="reportTypeOptions"
                  :disabled="editorMode === 'edit'"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="12">
            <a-col :span="8">
              <a-form-item label="专业" required>
                <ProgramSelector
                  :value="editor.programId || null"
                  placeholder="选择专业"
                  :disabled="editorMode === 'edit'"
                  @change="handleEditorProgramChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="培养方案">
                <TrainingPlanSelector
                  :value="editor.trainingPlanId || null"
                  placeholder="选择培养方案（可选）"
                  :disabled="editorMode === 'edit'"
                  @change="handleEditorTrainingPlanChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="质量评价课程">
                <CourseSelector
                  :value="editor.qualityCourseId || null"
                  :training-plan-id="editor.trainingPlanId || null"
                  placeholder="选择质量评价课程（可选）"
                  :disabled="editorMode === 'edit'"
                  @change="handleEditorQualityCourseChange"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="12">
            <a-col :span="24">
              <a-form-item label="达成度结果">
                <AchievementResultSelector
                  :value="editor.achievementResultId || null"
                  :program-id="editor.programId || null"
                  :training-plan-id="editor.trainingPlanId || null"
                  :quality-course-id="editor.qualityCourseId || null"
                  :school-year="editor.schoolYear || null"
                  :semester="editor.semester || null"
                  placeholder="可选，用于关联已有达成度结果"
                  :disabled="editorMode === 'edit'"
                  @change="handleEditorAchievementResultChange"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-row :gutter="12">
            <a-col :span="6">
              <a-form-item label="学年" required>
                <a-input v-model:value="editor.schoolYear" :disabled="editorMode === 'edit'" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="学期" required>
                <a-input v-model:value="editor.semester" :disabled="editorMode === 'edit'" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="报告正文">
            <a-textarea
              v-model:value="editor.bodyContent"
              :rows="12"
              placeholder="填写报告正文；AI 任务生成后会自动回填"
              class="report__body-editor"
            />
          </a-form-item>
        </a-form>
      </UiDrawer>

      <UiDrawer v-model:open="detailVisible" title="报告详情" :width="760" :hide-footer="true">
        <UiEmpty v-if="!detailRecord && !detailLoading" description="暂无数据" size="sm" />
        <a-descriptions v-if="detailRecord" :column="2" size="small" bordered>
          <a-descriptions-item label="类型">
            {{ reportTypeLabel(detailRecord.reportType) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <UiTag :tone="reportStatusColor(detailRecord.status)" size="sm">
              {{ reportStatusLabel(detailRecord.status) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="达成度结果">
            {{ detailRecord.achievementResultLabel }}
          </a-descriptions-item>
          <a-descriptions-item label="所属专业">
            {{ detailRecord.programName }}
          </a-descriptions-item>
          <a-descriptions-item label="培养方案">
            <span v-if="detailRecord.trainingPlanId">
              {{ detailRecord.trainingPlanCode }} {{ detailRecord.trainingPlanName }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="关联课程">
            <span v-if="detailRecord.qualityCourseId">
              {{ detailRecord.qualityCourseCode }} {{ detailRecord.qualityCourseName }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="学年 / 学期">
            {{ detailRecord.schoolYear }} / {{ detailRecord.semester }}
          </a-descriptions-item>
          <a-descriptions-item label="Word 文件">
            <UiTextAction
              v-if="detailRecord.wordFileId"
              @click="downloadReportExportFile(detailRecord, 'word')"
            >
              下载 Word
            </UiTextAction>
            <span v-else>未生成 Word 文件</span>
          </a-descriptions-item>
          <a-descriptions-item label="PDF 文件">
            <UiTextAction
              v-if="detailRecord.pdfFileId"
              @click="downloadReportExportFile(detailRecord, 'pdf')"
            >
              下载 PDF
            </UiTextAction>
            <span v-else>未生成 PDF 文件</span>
          </a-descriptions-item>
          <a-descriptions-item label="Excel 文件">
            <UiTextAction
              v-if="detailRecord.excelFileId"
              @click="downloadReportExportFile(detailRecord, 'excel')"
            >
              下载 Excel
            </UiTextAction>
            <span v-else>未生成 Excel 文件</span>
          </a-descriptions-item>
          <a-descriptions-item label="导出状态">
            <UiTag :tone="exportStatusColor(detailRecord.exportStatus)" size="sm">
              {{ exportStatusLabel(detailRecord.exportStatus) }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.exportStartedAt" label="导出开始">
            {{ detailRecord.exportStartedAt }}
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.exportFinishedAt" label="导出结束">
            {{ detailRecord.exportFinishedAt }}
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.exportErrorMessage" label="导出处理说明" :span="2">
            <span class="report__export-error">
              {{ reportExportFailureMessage(detailRecord.exportErrorMessage) }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.confirmedAt" label="确认时间">
            {{ detailRecord.confirmedAt }}
          </a-descriptions-item>
          <a-descriptions-item v-if="detailRecord.archivedAt" label="归档时间">
            {{ detailRecord.archivedAt }}
          </a-descriptions-item>
          <a-descriptions-item label="标题" :span="2">
            {{ detailRecord.title }}
          </a-descriptions-item>
        </a-descriptions>
        <h4 class="report__section-title">正文预览</h4>
        <div v-if="detailRecord?.bodyContent" class="report__body-preview">
          {{ detailRecord.bodyContent }}
        </div>
        <UiEmpty v-else description="暂无数据" size="sm" />
      </UiDrawer>
    </template>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="报告操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.report {
  &__stages {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__result-panel {
    margin-bottom: 16px;
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
    width: 160px;

    &--xs {
      width: 110px;
    }

    &--xxs {
      width: 80px;
    }
  }

  &__section-title {
    margin: 16px 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__export-error {
    color: var(--ant-color-error, #dc2626);
  }

  &__body-preview {
    margin: 0;
    padding: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 13px;
    line-height: 1.7;
    background: var(--dp-gray-50, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 6px;
    max-height: 520px;
    overflow: auto;
  }

  &__error-pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--ant-color-error, #dc2626);
  }

  &__body-editor {
    :deep(textarea) {
      font-family: var(--dp-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      font-size: 13px;
      line-height: 1.7;
    }
  }
}
</style>
