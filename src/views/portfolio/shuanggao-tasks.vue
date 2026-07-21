<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioDoubleHighEvidenceArchiveVO,
  PortfolioDoubleHighTaskVO,
} from '@/apis/portfolio/double-high'
import { portfolioDoubleHighApi } from '@/apis/portfolio/double-high'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiCheckboxGroup from '@/components/ui-guide/ui/UiCheckboxGroup.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import {
  flattenPortfolioOrgOptionsUnderDepartment,
  usePortfolioOrgTree,
} from '@/composables/usePortfolioOrgTree'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import {
  ALL_PORTFOLIO_DOUBLE_HIGH_TASK_STATUS_CODES,
  PortfolioDoubleHighTaskStatusCode,
  PortfolioDoubleHighTaskStatusDescription,
} from '@/types/enums/portfolio-double-high-task-status-enum'
import {
  PortfolioDoubleHighStageReviewStatusCode,
  PortfolioDoubleHighStageReviewStatusDescription,
} from '@/types/enums/portfolio-double-high-stage-review-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { handleDownloadFile } from '@/utils/file-download'
import { strictEnumLabel } from '@/utils/strict-enum'

interface TaskFilterModel extends Record<string, unknown> {
  taskStatus?: PortfolioDoubleHighTaskStatusCode
  keyword?: string
  constructionPeriodLabel?: string
  departmentId?: string
  portfolioOrgId?: string
}

interface CreateStageFormItem {
  stageIndex: number
  stageName: string
  stageDeadline?: string
}

const route = useRoute()
const userStore = useUserStore()
const currentUserIdForGuard = computed(() => {
  const id = userStore.userInfo?.userId
  return id != null && String(id).trim() !== '' ? String(id) : undefined
})
const {
  archiveWriteForbidden: operatorArchiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: currentUserIdForGuard })
const { loadTree, departmentOptions: loadDepartmentOptions, treeRoots } = usePortfolioOrgTree()
const departmentOptions = computed(() => loadDepartmentOptions())
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const actionLoading = ref(false)
const rows = ref<PortfolioDoubleHighTaskVO[]>([])
const total = ref(0)
const createOpen = ref(false)
const actionOpen = ref(false)
const actionMode = ref<'submit' | 'review' | 'void'>('submit')
const voidReason = ref('')
const activeTask = ref<PortfolioDoubleHighTaskVO | null>(null)
const reviewApproved = ref<'true' | 'false'>('true')
const reviewComment = ref('')
const evidenceArchives = ref<PortfolioDoubleHighEvidenceArchiveVO[]>([])
const selectedArchiveIds = ref<string[]>([])
const evidenceLoading = ref(false)

const createForm = reactive({
  taskCode: '',
  taskTitle: '',
  taskSource: '校级双高',
  departmentId: undefined as string | undefined,
  portfolioOrgId: undefined as string | undefined,
  constructionPeriodLabel: '',
  baselinePeriodLabel: '',
  periodStartDate: undefined as string | undefined,
  periodEndDate: undefined as string | undefined,
  acceptanceCriteria: '',
  stages: [
    { stageIndex: 1, stageName: '阶段一', stageDeadline: undefined },
  ] as CreateStageFormItem[],
})
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailTask = ref<PortfolioDoubleHighTaskVO | null>(null)
const pageRequestToken = ref(0)
const detailRequestToken = ref(0)
const evidenceRequestToken = ref(0)
const busy = computed(
  () => actionLoading.value || actionOpen.value || createOpen.value || detailOpen.value,
)

const filterForm = reactive<TaskFilterModel>({})
const currentUserId = computed(() => userStore.userInfo.userId || '')

const createPortfolioOrgOptions = computed(() => {
  if (!createForm.departmentId) {
    return []
  }
  return flattenPortfolioOrgOptionsUnderDepartment(treeRoots.value, createForm.departmentId)
})

const filterPortfolioOrgOptions = computed(() => {
  if (!filterForm.departmentId) {
    return []
  }
  return flattenPortfolioOrgOptionsUnderDepartment(treeRoots.value, filterForm.departmentId)
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => Object.assign(filterForm, value),
})

const filterFields = computed(() => [
  {
    key: 'departmentId',
    type: 'select' as const,
    label: '院系',
    allowClear: true,
    width: 160,
    options: departmentOptions.value,
  },
  {
    key: 'portfolioOrgId',
    type: 'select' as const,
    label: '专业群',
    allowClear: true,
    width: 160,
    options: filterPortfolioOrgOptions.value,
  },
  {
    key: 'taskStatus',
    type: 'select' as const,
    label: '任务状态',
    allowClear: true,
    width: 160,
    options: ALL_PORTFOLIO_DOUBLE_HIGH_TASK_STATUS_CODES.map((code) => ({
      value: code,
      label: PortfolioDoubleHighTaskStatusDescription[code],
    })),
  },
  {
    key: 'constructionPeriodLabel',
    type: 'input' as const,
    label: '建设周期',
    width: 140,
    placeholder: '如 2025-2026',
  },
  {
    key: 'keyword',
    type: 'input' as const,
    label: '关键词',
    width: 160,
    placeholder: '编码/标题',
  },
])

const evidenceOptions = computed(() =>
  evidenceArchives.value.map((item) => ({
    value: item.archiveRecordId,
    label: [
      item.categoryName || '分类',
      item.recordTitle || item.archiveRecordId,
      item.academicYear,
      item.lifecycleStatusLabel || item.lifecycleStatus,
      item.evaluationHeld ? '参评 hold' : undefined,
      item.archiveWriteForbidden ? '档案写禁' : undefined,
      item.hasDownloadableFile ? undefined : '缺附件',
    ]
      .filter(Boolean)
      .join(' · '),
    disabled: !item.hasDownloadableFile,
  })),
)

const reviewOptions = [
  { value: 'true', label: '通过' },
  { value: 'false', label: '退回' },
]

const query = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })

function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

const columns: ColumnsType = [
  { title: '任务编码', dataIndex: 'taskCode', key: 'taskCode', width: 140 },
  { title: '任务标题', dataIndex: 'taskTitle', key: 'taskTitle', ellipsis: true },
  {
    title: '建设周期',
    dataIndex: 'constructionPeriodLabel',
    key: 'constructionPeriodLabel',
    width: 120,
  },
  { title: '状态', key: 'taskStatus', width: 110 },
  { title: '阶段', key: 'stageProgress', width: 90 },
  { title: '验收包', key: 'acceptancePackage', width: 120 },
  { title: '责任人身份', key: 'responsibleIdentity', width: 180 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '操作', key: 'actions', width: 220 },
]

function taskStatusLabel(code: PortfolioDoubleHighTaskStatusCode): string {
  return strictEnumLabel(PortfolioDoubleHighTaskStatusDescription, code, '任务状态')
}

function taskStatusTone(
  code: PortfolioDoubleHighTaskStatusCode,
): 'blue' | 'green' | 'orange' | 'gray' {
  switch (code) {
    case PortfolioDoubleHighTaskStatusCode.PUBLISHED:
      return 'blue'
    case PortfolioDoubleHighTaskStatusCode.IN_PROGRESS:
    case PortfolioDoubleHighTaskStatusCode.STAGE_REVIEWING:
      return 'orange'
    case PortfolioDoubleHighTaskStatusCode.ACCEPTANCE:
    case PortfolioDoubleHighTaskStatusCode.ARCHIVED:
      return 'green'
    default:
      return 'gray'
  }
}

function stageReviewStatusLabel(code?: PortfolioDoubleHighStageReviewStatusCode): string {
  if (!code) {
    return '未提交'
  }
  return strictEnumLabel(PortfolioDoubleHighStageReviewStatusDescription, code, '阶段审核状态')
}

function isTaskResponsible(row: PortfolioDoubleHighTaskVO): boolean {
  return Boolean(currentUserId.value && row.responsibleUserId === currentUserId.value)
}

/** 按责任人/治理角色裁剪操作：责任人不可见审核入口，非责任人不可见实施动作。 */
function rowActions(row: PortfolioDoubleHighTaskVO) {
  const items: Array<{ key: string; label: string; tone?: 'danger' }> = [
    { key: 'detail', label: '阶段明细' },
  ]
  const responsible = isTaskResponsible(row)
  if (row.taskStatus === PortfolioDoubleHighTaskStatusCode.PUBLISHED) {
    items.push({
      key: 'claim',
      label: operatorArchiveWriteForbidden.value ? '认领（写禁）' : '认领',
    })
  }
  if (row.taskStatus === PortfolioDoubleHighTaskStatusCode.CLAIMED && responsible) {
    items.push({
      key: 'start',
      label:
        row.archiveWriteForbidden || operatorArchiveWriteForbidden.value
          ? '开始建设（写禁）'
          : '开始建设',
    })
  }
  if (row.taskStatus === PortfolioDoubleHighTaskStatusCode.IN_PROGRESS && responsible) {
    items.push({
      key: 'submit',
      label:
        row.archiveWriteForbidden || operatorArchiveWriteForbidden.value
          ? '提交阶段（写禁）'
          : '提交阶段',
    })
  }
  if (
    (row.taskStatus === PortfolioDoubleHighTaskStatusCode.STAGE_SUBMITTED ||
      row.taskStatus === PortfolioDoubleHighTaskStatusCode.STAGE_REVIEWING) &&
    !responsible
  ) {
    if (row.taskStatus === PortfolioDoubleHighTaskStatusCode.STAGE_SUBMITTED) {
      items.push({ key: 'enterReview', label: '进入审核' })
    }
    items.push({ key: 'review', label: '审核阶段' })
  }
  if (row.taskStatus === PortfolioDoubleHighTaskStatusCode.ACCEPTANCE && !responsible) {
    items.push({ key: 'archive', label: '归档' })
  }
  if (row.acceptanceFileNodeId) {
    items.push({ key: 'downloadAcceptance', label: '下载验收包' })
  }
  if (
    row.taskStatus !== PortfolioDoubleHighTaskStatusCode.ARCHIVED &&
    row.taskStatus !== PortfolioDoubleHighTaskStatusCode.VOID
  ) {
    items.push({ key: 'void', label: '作废', tone: 'danger' })
  }
  return items.map((item) => {
    const writeAction = item.key === 'claim' || item.key === 'start' || item.key === 'submit'
    const writeBlocked =
      writeAction &&
      (operatorArchiveWriteForbidden.value ||
        (item.key !== 'claim' && Boolean(row.archiveWriteForbidden)))
    return { ...item, disabled: busy.value || writeBlocked }
  })
}

async function loadPage() {
  const currentToken = pageRequestToken.value + 1
  pageRequestToken.value = currentToken
  const request = {
    pageNum: query.pageNum,
    pageSize: query.pageSize,
    taskStatus: filterForm.taskStatus,
    keyword: filterForm.keyword?.trim() || undefined,
    constructionPeriodLabel: filterForm.constructionPeriodLabel?.trim() || undefined,
    departmentId: filterForm.departmentId || undefined,
    portfolioOrgId: filterForm.portfolioOrgId || undefined,
  }
  beginLoad()
  loading.value = true
  try {
    const result = await portfolioDoubleHighApi.pageTasks(request)
    if (pageRequestToken.value !== currentToken) {
      return
    }
    rows.value = result.list ?? []
    total.value = result.total ?? 0

    okLoad()
  } catch (error) {
    if (pageRequestToken.value !== currentToken) {
      return
    }
    failLoad()
    rows.value = []
    total.value = 0
    showUserError(error, '加载双高任务失败')
  } finally {
    if (pageRequestToken.value === currentToken) {
      loading.value = false
    }
  }
}

function onSearch() {
  query.pageNum = 1
  void loadPage()
}

function handlePageChange(page: { current: number; pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadPage()
}

async function openTaskDetailById(taskId: string) {
  const currentToken = detailRequestToken.value + 1
  detailRequestToken.value = currentToken
  detailOpen.value = true
  detailLoading.value = true
  detailTask.value = null
  try {
    const nextDetail = await portfolioDoubleHighApi.getTask({ id: taskId })
    if (detailRequestToken.value !== currentToken) {
      return
    }
    detailTask.value = nextDetail
  } catch (error) {
    if (detailRequestToken.value !== currentToken) {
      return
    }
    detailTask.value = null
    showUserError(error, '加载阶段明细失败')
  } finally {
    if (detailRequestToken.value === currentToken) {
      detailLoading.value = false
    }
  }
}

function resetCreateForm() {
  createForm.taskCode = ''
  createForm.taskTitle = ''
  createForm.taskSource = '校级双高'
  createForm.departmentId =
    typeof route.query.departmentId === 'string' ? route.query.departmentId : undefined
  createForm.portfolioOrgId = undefined
  createForm.constructionPeriodLabel = ''
  createForm.baselinePeriodLabel = ''
  createForm.periodStartDate = undefined
  createForm.periodEndDate = undefined
  createForm.acceptanceCriteria = ''
  createForm.stages = [{ stageIndex: 1, stageName: '阶段一', stageDeadline: undefined }]
}

function openCreateModal() {
  if (busy.value) {
    return
  }
  resetCreateForm()
  createOpen.value = true
}

function addCreateStage() {
  const nextIndex = createForm.stages.length + 1
  createForm.stages.push({
    stageIndex: nextIndex,
    stageName: `阶段${nextIndex}`,
    stageDeadline: undefined,
  })
}

function removeCreateStage(index: number) {
  if (createForm.stages.length <= 1) {
    showFormValidationMessage('至少保留一个阶段')
    return
  }
  createForm.stages.splice(index, 1)
  createForm.stages.forEach((stage, stageIndex) => {
    stage.stageIndex = stageIndex + 1
  })
}

async function handleAction(key: string, row: PortfolioDoubleHighTaskVO) {
  if (busy.value) {
    return
  }
  if (key === 'claim' || key === 'start' || key === 'submit') {
    await reloadLifecycleState()
    if (
      !(await assertArchiveWritable(
        key === 'claim' ? '认领双高任务' : key === 'start' ? '开始双高建设' : '提交双高阶段',
      ))
    ) {
      return
    }
  }
  actionLoading.value = true
  try {
    if (key === 'detail') {
      await openTaskDetailById(row.id)
      return
    } else if (key === 'claim') {
      await portfolioDoubleHighApi.claimTask({ id: row.id })
      void message.success('已认领任务')
    } else if (key === 'start') {
      await portfolioDoubleHighApi.startTask({ id: row.id })
      void message.success('已进入实施')
    } else if (key === 'enterReview') {
      await portfolioDoubleHighApi.enterStageReview({ id: row.id })
      void message.success('已进入阶段审核')
    } else if (key === 'submit') {
      activeTask.value = row
      actionMode.value = 'submit'
      selectedArchiveIds.value = []
      actionOpen.value = true
      evidenceLoading.value = true
      const evidenceToken = evidenceRequestToken.value + 1
      evidenceRequestToken.value = evidenceToken
      try {
        const nextArchives =
          (await portfolioDoubleHighApi.listEvidenceArchives({ id: row.id })) ?? []
        if (evidenceRequestToken.value !== evidenceToken || activeTask.value?.id !== row.id) {
          return
        }
        evidenceArchives.value = nextArchives
      } catch (error) {
        if (evidenceRequestToken.value !== evidenceToken || activeTask.value?.id !== row.id) {
          return
        }
        evidenceArchives.value = []
        showUserError(error, '加载失败')
      } finally {
        evidenceLoading.value = false
      }
      return
    } else if (key === 'downloadAcceptance') {
      if (!row.acceptanceFileNodeId) {
        showFormValidationMessage('验收包尚未生成')
        return
      }
      await handleDownloadFile({
        fileId: row.acceptanceFileNodeId,
        fileName: row.acceptanceFileName || `双高验收包-${row.taskCode}.zip`,
      })
      return
    } else if (key === 'review') {
      activeTask.value = row
      actionMode.value = 'review'
      reviewApproved.value = 'true'
      reviewComment.value = ''
      actionOpen.value = true
      return
    } else if (key === 'archive') {
      const confirmed = await confirmAsync({
        title: '确认归档双高任务',
        content: `确认归档「${row.taskTitle}」？归档后任务进入终态，不再接受阶段材料。`,
        type: 'warning',
        okText: '确认归档',
      })
      if (!confirmed) {
        return
      }
      await portfolioDoubleHighApi.archiveTask({ id: row.id })
      void message.success('任务已归档')
    } else if (key === 'void') {
      activeTask.value = row
      actionMode.value = 'void'
      voidReason.value = ''
      actionOpen.value = true
      return
    }
    await loadPage()
  } catch (error) {
    showUserError(error, '操作失败')
  } finally {
    actionLoading.value = false
  }
}

async function submitActionModal() {
  if (!activeTask.value || actionLoading.value) {
    return
  }
  actionLoading.value = true
  try {
    if (actionMode.value === 'submit') {
      if (selectedArchiveIds.value.length === 0) {
        showFormValidationMessage('请至少选择一条正式档案作为阶段佐证')
        return
      }
      const missingFile = evidenceArchives.value.filter(
        (item) =>
          selectedArchiveIds.value.includes(item.archiveRecordId) && !item.hasDownloadableFile,
      )
      if (missingFile.length > 0) {
        showFormValidationMessage('所选正式档案缺少可下载附件，请先补齐材料')
        return
      }
      await portfolioDoubleHighApi.submitStage({
        id: activeTask.value.id,
        stageIndex: activeTask.value.currentStageIndex,
        materialRef: { archiveRecordIds: selectedArchiveIds.value },
      })
      void message.success('阶段材料已提交')
    } else if (actionMode.value === 'void') {
      const reason = voidReason.value.trim()
      if (!reason) {
        showFormValidationMessage('请填写作废原因')
        return
      }
      await portfolioDoubleHighApi.voidTask({
        id: activeTask.value.id,
        voidReason: reason,
      })
      void message.success('任务已作废')
    } else {
      if (reviewApproved.value === 'false' && !reviewComment.value.trim()) {
        showFormValidationMessage('阶段退回须填写原因')
        return
      }
      await portfolioDoubleHighApi.reviewStage({
        id: activeTask.value.id,
        stageIndex: activeTask.value.currentStageIndex,
        approved: reviewApproved.value === 'true',
        reviewComment: reviewComment.value.trim() || undefined,
      })
      void message.success(reviewApproved.value === 'true' ? '阶段已通过' : '阶段已退回')
    }
    actionOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '提交失败')
  } finally {
    actionLoading.value = false
  }
}

async function submitCreate() {
  if (actionLoading.value) {
    return
  }
  const taskCode = createForm.taskCode.trim()
  const taskTitle = createForm.taskTitle.trim()
  if (!taskCode || !taskTitle) {
    showFormValidationMessage('请填写任务编码与标题')
    return
  }
  if (!createForm.departmentId) {
    showFormValidationMessage('请选择责任院系')
    return
  }
  if (!createForm.constructionPeriodLabel.trim()) {
    showFormValidationMessage('请填写建设周期')
    return
  }
  if (!createForm.periodStartDate || !createForm.periodEndDate) {
    showFormValidationMessage('请填写建设周期起止日期')
    return
  }
  if (createForm.periodStartDate > createForm.periodEndDate) {
    showFormValidationMessage('建设周期开始日期不能晚于结束日期')
    return
  }
  const stages = createForm.stages.map((stage, index) => ({
    stageIndex: index + 1,
    stageName: stage.stageName.trim() || `阶段${index + 1}`,
    stageDeadline: stage.stageDeadline || undefined,
  }))
  if (stages.some((stage) => !stage.stageName)) {
    showFormValidationMessage('请填写阶段名称')
    return
  }
  if (stages.some((stage) => !stage.stageDeadline)) {
    showFormValidationMessage('请为每个阶段设置截止日')
    return
  }
  actionLoading.value = true
  try {
    await portfolioDoubleHighApi.createTask({
      taskCode,
      taskTitle,
      taskSource: createForm.taskSource.trim(),
      departmentId: createForm.departmentId || undefined,
      portfolioOrgId: createForm.portfolioOrgId || undefined,
      constructionPeriodLabel: createForm.constructionPeriodLabel.trim(),
      baselinePeriodLabel: createForm.baselinePeriodLabel.trim() || undefined,
      periodStartDate: createForm.periodStartDate,
      periodEndDate: createForm.periodEndDate,
      acceptanceCriteria: createForm.acceptanceCriteria.trim() || undefined,
      stages,
    })
    void message.success('双高任务已发布')
    createOpen.value = false
    await loadPage()
  } catch (error) {
    showUserError(error, '创建失败')
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  void loadTree()
  const departmentId = route.query.departmentId
  if (typeof departmentId === 'string' && departmentId) {
    filterForm.departmentId = departmentId
  }
  void loadPage().then(() => {
    const taskId = route.query.taskId
    if (typeof taskId === 'string' && taskId) {
      void openTaskDetailById(taskId)
    }
  })
})

watch(
  () => filterForm.departmentId,
  () => {
    filterForm.portfolioOrgId = undefined
  },
)

watch(
  () => createForm.departmentId,
  () => {
    createForm.portfolioOrgId = undefined
  },
)
</script>

<template>
  <StageWorkbenchShell title="双高任务台账">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="双高建设任务"
        subtitle="发布→认领→实施→阶段提交→审核→验收归档"
      />
    </template>
    <UiCard>
      <div class="shuanggao-tasks__toolbar">
        <UiButton size="sm" variant="primary" :disabled="busy" @click="openCreateModal">
          发布任务
        </UiButton>
      </div>
      <UiFilterBar v-model="filterModel" :fields="filterFields" @search="onSearch" />
      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        row-key="id"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        pagination-mode="server"
        :total="total"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'taskStatus'">
            <UiTag :tone="taskStatusTone(record.taskStatus)">
              {{ taskStatusLabel(record.taskStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'stageProgress'">
            {{ record.currentStageIndex }}/{{ record.totalStageCount }}
          </template>
          <template v-else-if="column.key === 'acceptancePackage'">
            <span v-if="record.acceptanceFileNodeId" class="shuanggao-tasks__cell-text">
              {{ record.acceptanceFileName || '已生成' }}
            </span>
            <span v-else class="shuanggao-tasks__cell-muted">—</span>
          </template>
          <template v-else-if="column.key === 'responsibleIdentity'">
            <template v-if="record.responsibleIdentityLayers?.length">
              <UiTag
                v-for="(layer, idx) in record.responsibleIdentityLayers"
                :key="layer.identityId || `${layer.identityType}-${idx}`"
                :tone="layer.externalIdentity ? 'orange' : 'blue'"
                style="margin-right: 4px; margin-bottom: 4px"
              >
                {{ layer.identityTypeLabel }}
              </UiTag>
            </template>
            <span v-else class="shuanggao-tasks__cell-muted">—</span>
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>

            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else class="text-neutral-400">—</span>
          </template>
          <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
            {{
              record.countsInCurrentFacultyStructure === true
                ? '是'
                : record.countsInCurrentFacultyStructure === false
                  ? '否'
                  : '—'
            }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              v-if="rowActions(record).length"
              :items="rowActions(record)"
              @action="(key) => handleAction(key, record)"
            />
          </template>
        </template>
        <template #emptyText>
          <WorkbenchContextGateStrip
            tag="未配置"
            body="暂无双高任务，请先发布任务"
            cta-label="发布任务"
            @cta="openCreateModal"
          />
        </template>
      </UiDataTable>
    </UiCard>
    <UiDialog
      v-model:open="createOpen"
      title="发布双高任务"
      width="720px"
      :confirm-loading="actionLoading"
      @ok="submitCreate"
    >
      <div class="create-form">
        <label class="create-form__field">
          <span>任务编码</span>
          <UiInput v-model="createForm.taskCode" placeholder="任务编码" />
        </label>
        <label class="create-form__field">
          <span>任务标题</span>
          <UiInput v-model="createForm.taskTitle" placeholder="任务标题" />
        </label>
        <label class="create-form__field">
          <span>任务来源</span>
          <UiInput v-model="createForm.taskSource" placeholder="如 校级双高" />
        </label>
        <label class="create-form__field">
          <span>责任院系</span>
          <UiSelect
            v-model="createForm.departmentId"
            :options="departmentOptions"
            placeholder="请选择院系"
            allow-search
          />
        </label>
        <label class="create-form__field">
          <span>专业群（可选）</span>
          <UiSelect
            v-model="createForm.portfolioOrgId"
            :options="createPortfolioOrgOptions"
            :disabled="!createForm.departmentId"
            placeholder="可选"
            allow-clear
            allow-search
          />
        </label>
        <label class="create-form__field">
          <span>建设周期</span>
          <UiInput v-model="createForm.constructionPeriodLabel" placeholder="如 2025-2026" />
        </label>
        <label class="create-form__field">
          <span>基线周期（可选）</span>
          <UiInput v-model="createForm.baselinePeriodLabel" placeholder="如 2024-2025" />
        </label>
        <label class="create-form__field">
          <span>周期开始日</span>
          <UiDatePicker v-model="createForm.periodStartDate" placeholder="建设周期开始" />
        </label>
        <label class="create-form__field">
          <span>周期结束日</span>
          <UiDatePicker v-model="createForm.periodEndDate" placeholder="建设周期结束" />
        </label>
        <label class="create-form__field create-form__field--full">
          <span>验收标准</span>
          <UiTextarea
            v-model="createForm.acceptanceCriteria"
            :rows="2"
            placeholder="验收口径说明"
          />
        </label>
        <div class="create-form__stages">
          <div class="create-form__stages-head">
            <span>阶段节点</span>
            <UiButton size="sm" variant="secondary" @click="addCreateStage">增加阶段</UiButton>
          </div>
          <div
            v-for="(stage, index) in createForm.stages"
            :key="stage.stageIndex"
            class="create-form__stage-row"
          >
            <span class="create-form__stage-index">第{{ stage.stageIndex }}阶</span>
            <UiInput v-model="stage.stageName" placeholder="阶段名称" />
            <UiDatePicker v-model="stage.stageDeadline" placeholder="阶段截止日" />
            <UiButton size="sm" variant="secondary" @click="removeCreateStage(index)">
              移除
            </UiButton>
          </div>
        </div>
      </div>
    </UiDialog>
    <UiDrawer v-model:open="detailOpen" title="双高任务阶段明细" width="520">
      <UiSpin :spinning="detailLoading">
        <template v-if="detailTask">
          <p class="shuanggao-tasks__detail-title">
            {{ detailTask.taskCode }} · {{ detailTask.taskTitle }}
          </p>
          <p class="shuanggao-tasks__detail-meta">
            状态 {{ taskStatusLabel(detailTask.taskStatus) }} · 进度
            {{ detailTask.currentStageIndex }}/{{ detailTask.totalStageCount }}
          </p>
          <p class="shuanggao-tasks__detail-meta shuanggao-tasks__detail-meta--spaced">
            建设周期 {{ detailTask.constructionPeriodLabel }}
            <template v-if="detailTask.periodStartDate || detailTask.periodEndDate">
              · {{ detailTask.periodStartDate || '—' }} ~ {{ detailTask.periodEndDate || '—' }}
            </template>
          </p>
          <div v-if="detailTask.lifecycleStatus" class="shuanggao-tasks__lifecycle">
            责任人生命周期：
            <UiTag :tone="lifecycleTagTone(detailTask)">
              {{ detailTask.lifecycleStatusLabel || detailTask.lifecycleStatus }}
            </UiTag>
            <span v-if="detailTask.countsInCurrentFacultyStructure === false"
              >（不计入当前在岗结构）</span
            >
            <span v-if="detailTask.archiveWriteForbidden"
              >（档案写禁，禁止认领/实施/阶段提交）</span
            >
          </div>
          <div
            v-if="detailTask.responsibleIdentityLayers?.length"
            class="shuanggao-tasks__detail-meta shuanggao-tasks__detail-meta--spaced"
          >
            <span>责任人身份：</span>
            <UiTag
              v-for="(layer, idx) in detailTask.responsibleIdentityLayers"
              :key="layer.identityId || `${layer.identityType}-${idx}`"
              :tone="layer.externalIdentity ? 'orange' : 'blue'"
              style="margin-right: 4px"
            >
              {{ layer.identityTypeLabel }} · {{ layer.workloadHours ?? 0 }} 学时
            </UiTag>
            <p v-if="detailTask.responsibleMultiIdentityNote" class="shuanggao-tasks__cell-muted">
              {{ detailTask.responsibleMultiIdentityNote }}
            </p>
          </div>
          <ul class="shuanggao-tasks__stage-list">
            <li
              v-for="stage in detailTask.stages"
              :key="stage.id"
              class="shuanggao-tasks__stage-item"
            >
              <div class="shuanggao-tasks__stage-name">
                阶段 {{ stage.stageIndex }} · {{ stage.stageName }}
              </div>
              <div class="shuanggao-tasks__stage-meta">
                截止：{{ stage.stageDeadline || '未设' }} · 审核：{{
                  stageReviewStatusLabel(stage.reviewStatus)
                }}
                <span v-if="stage.submitTime"> · 提交 {{ stage.submitTime }}</span>
                <span v-if="stage.reviewedTime"> · 审核 {{ stage.reviewedTime }}</span>
              </div>
              <p v-if="stage.reviewComment" class="shuanggao-tasks__stage-comment">
                意见：{{ stage.reviewComment }}
              </p>
            </li>
          </ul>
        </template>
        <UiEmpty size="sm" v-else description="暂无明细" />
      </UiSpin>
    </UiDrawer>
    <UiDialog
      v-model:open="actionOpen"
      :title="
        actionMode === 'submit' ? '提交阶段材料' : actionMode === 'void' ? '作废任务' : '阶段审核'
      "
      :confirm-loading="actionLoading"
      @ok="submitActionModal"
    >
      <template v-if="actionMode === 'submit'">
        <div class="shuanggao-tasks__action-body">
          <span>选择正式档案作为阶段举证材料</span>
          <UiSpin :spinning="evidenceLoading">
            <UiCheckboxGroup
              v-if="evidenceOptions.length"
              v-model="selectedArchiveIds"
              direction="vertical"
              :options="evidenceOptions"
            />
            <UiEmpty size="sm" v-else title="暂无内容" />
          </UiSpin>
        </div>
      </template>
      <template v-else-if="actionMode === 'void'">
        <UiTextarea v-model="voidReason" placeholder="作废原因（必填）" :rows="3" />
      </template>
      <template v-else>
        <UiRadioGroup
          v-model="reviewApproved"
          class="shuanggao-tasks__review-options"
          :options="reviewOptions"
        />
        <UiTextarea v-model="reviewComment" placeholder="审核意见（退回必填）" :rows="3" />
      </template>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.create-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.create-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}

.create-form__field--full,
.create-form__stages {
  grid-column: 1 / -1;
}

.create-form__stages-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.create-form__stage-row {
  display: grid;
  grid-template-columns: 64px 1fr 160px auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.create-form__stage-index {
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.shuanggao-tasks__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--dp-space-3);
}

.shuanggao-tasks__cell-text {
  font-size: 13px;
  color: var(--dp-text-primary);
}

.shuanggao-tasks__cell-muted {
  font-size: 13px;
  color: var(--dp-text-muted);
}

.shuanggao-tasks__detail-title {
  margin: 0 0 var(--dp-space-2);
  font-size: 14px;
  color: var(--dp-text-primary);
}

.shuanggao-tasks__detail-meta {
  margin: 0 0 var(--dp-space-1);
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
}

.shuanggao-tasks__detail-meta--spaced {
  margin-bottom: var(--dp-space-3);
}

.shuanggao-tasks__stage-list {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

.shuanggao-tasks__stage-item {
  padding: var(--dp-space-2) var(--dp-space-3);
  border: 1px solid var(--dp-border-light);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface-subtle);
}

.shuanggao-tasks__stage-name {
  font-weight: var(--dp-font-weight-medium);
  color: var(--dp-text-primary);
}

.shuanggao-tasks__stage-meta {
  margin-top: var(--dp-space-1);
  color: var(--dp-text-secondary);
}

.shuanggao-tasks__stage-comment {
  margin: var(--dp-space-1) 0 0;
  color: var(--dp-text-primary);
}

.shuanggao-tasks__action-body {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2);
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.shuanggao-tasks__review-options {
  display: block;
  margin-bottom: var(--dp-space-3);
}
</style>
