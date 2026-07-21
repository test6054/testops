<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioArchiveRecordSourceTypeCode,
  PortfolioArchiveRecordStatusCode,
  PortfolioMaterialRiskLevelCode,
  PortfolioReviewActionTypeCode,
} from '@/apis/portfolio/enums'
import type {
  PortfolioAiAnalysisDetailVO,
  PortfolioArchiveCategoryTreeNodeVO,
  PortfolioReviewArchiveRecordDetailVO,
  PortfolioReviewLogVO,
  PortfolioReviewRecordFieldVO,
  PortfolioReviewTaskPageRequest,
  PortfolioReviewTaskSummaryVO,
} from '@/apis/portfolio/types'
import type { BadgeTone, FilterField, FilterOption } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import {
  PortfolioArchiveRecordSourceTypeDescription,
  PortfolioArchiveRecordStatusDescription,
  PortfolioMaterialRiskLevelDescription,
  PortfolioReviewActionTypeDescription,
  PortfolioReviewTaskStatusCode,
  PortfolioReviewTaskStatusDescription,
} from '@/apis/portfolio/enums'
import { portfolioReviewApi } from '@/apis/portfolio/review'
import {
  PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE,
  PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE,
  PORTFOLIO_MATERIAL_RISK_LEVEL_TONE,
  PORTFOLIO_REVIEW_TASK_STATUS_TONE,
  PORTFOLIO_SCHOOL_REVIEW_FLOW_CODE,
} from '@/apis/portfolio/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { isPortfolioCourseFrameworkCategoryCode } from '@/constants/portfolio-archive-category-codes'
import { ResultCode } from '@/types/enums/result-code'
import {
  readBusinessResultCode,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const PORTFOLIO_REVIEW_TASK_STATUS_FILTER_CODES = [
  PortfolioReviewTaskStatusCode.PENDING,
  PortfolioReviewTaskStatusCode.SECOND_REVIEW,
  PortfolioReviewTaskStatusCode.APPROVED,
  PortfolioReviewTaskStatusCode.RETURNED,
  PortfolioReviewTaskStatusCode.DISMISSED,
  PortfolioReviewTaskStatusCode.CLOSED,
] satisfies readonly PortfolioReviewTaskStatusCode[]

function reviewTaskStatusLabel(status: PortfolioReviewTaskStatusCode): string {
  return strictEnumLabel(PortfolioReviewTaskStatusDescription, status, '审核任务状态')
}

function reviewTaskStatusTone(status: PortfolioReviewTaskStatusCode): BadgeTone {
  return strictEnumTone(PORTFOLIO_REVIEW_TASK_STATUS_TONE, status, '审核任务状态')
}

function materialRiskLevelLabel(riskLevel: PortfolioMaterialRiskLevelCode): string {
  return strictEnumLabel(PortfolioMaterialRiskLevelDescription, riskLevel, '档案材料风险等级')
}

function materialRiskLevelTone(riskLevel: PortfolioMaterialRiskLevelCode): BadgeTone {
  return strictEnumTone(PORTFOLIO_MATERIAL_RISK_LEVEL_TONE, riskLevel, '档案材料风险等级')
}

function archiveRecordSourceTypeLabel(sourceType: PortfolioArchiveRecordSourceTypeCode): string {
  return strictEnumLabel(
    PortfolioArchiveRecordSourceTypeDescription,
    sourceType,
    '档案记录来源类型',
  )
}

function archiveRecordStatusLabel(status: PortfolioArchiveRecordStatusCode): string {
  return strictEnumLabel(PortfolioArchiveRecordStatusDescription, status, '档案记录状态')
}

function archiveRecordStatusTone(status: PortfolioArchiveRecordStatusCode): BadgeTone {
  return strictEnumTone(PORTFOLIO_ARCHIVE_RECORD_STATUS_TONE, status, '档案记录状态')
}

function reviewActionTypeLabel(actionType: PortfolioReviewActionTypeCode): string {
  return strictEnumLabel(PortfolioReviewActionTypeDescription, actionType, '审核操作类型')
}

function reviewTaskStatusFilterOptions(): FilterOption[] {
  return PORTFOLIO_REVIEW_TASK_STATUS_FILTER_CODES.map((value) => ({
    value,
    label: reviewTaskStatusLabel(value),
  }))
}

interface ReviewFilterModel extends Record<string, unknown> {
  departmentId?: string
  categoryId?: string
  teacherId?: string
  auditFlowCode?: string
  reviewStatus?: PortfolioReviewTaskPageRequest['reviewStatus']
}

const listColumns: ColumnsType = [
  { title: '教师', key: 'teacher', width: 140, fixed: 'left' },
  { title: '工号', dataIndex: 'teacherNumber', key: 'teacherNumber', width: 120 },
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '材料分类', dataIndex: 'categoryName', key: 'categoryName', width: 140 },
  { title: '风险', key: 'riskLevel', width: 88 },
  { title: '引用任务', key: 'referenceTask', width: 120 },
  { title: '智能初审', key: 'aiPreReview', width: 160 },
  { title: '来源', key: 'sourceType', width: 100 },
  { title: '档案状态', key: 'recordStatus', width: 100 },
  { title: '审核状态', key: 'reviewStatus', width: 100 },
  { title: '关联健康', key: 'associationBroken', width: 100 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  { title: '提交时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 200 },
]

const fieldColumns: ColumnsType = [
  { title: '字段', dataIndex: 'fieldLabel', key: 'fieldLabel', width: 140, fixed: 'left' },
  { title: '值', dataIndex: 'fieldValue', key: 'fieldValue' },
  { title: '证据', dataIndex: 'evidenceRef', key: 'evidenceRef', width: 120 },
]

const logColumns: ColumnsType = [
  { title: '操作', key: 'actionType', width: 100, fixed: 'left' },
  { title: '意见', dataIndex: 'opinion', key: 'opinion' },
  { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
]

const { loadTree, departmentOptions } = usePortfolioOrgTree()

const filterForm = reactive<ReviewFilterModel>({
  departmentId: undefined,
  categoryId: undefined,
})

const hasSensitiveRows = computed(() => rows.value.some((item) => item.riskLevel === 'SENSITIVE'))
const showReviewActions = computed(() => Boolean(activeRow.value?.reviewActionAllowed))
const activeAssociationBroken = computed(() => Boolean(activeRow.value?.associationBroken))

function lifecycleTagTone(record: {
  lifecycleStatus?: string
}): 'green' | 'orange' | 'gray' | 'red' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const categoryOptions = ref<{ label: string, value: string }[]>([])

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'departmentId',
    type: 'select',
    label: '院系',
    allowClear: true,
    width: 200,
    options: departmentOptions(),
  },
  {
    key: 'categoryId',
    type: 'select',
    label: '材料分类',
    allowClear: true,
    width: 200,
    options: categoryOptions.value,
  },
  {
    key: 'teacherId',
    type: 'input',
    label: '教师编号',
    allowClear: true,
    width: 160,
    placeholder: '用户编号',
  },
  {
    key: 'auditFlowCode',
    type: 'select',
    label: '审核流',
    allowClear: true,
    width: 180,
    options: [
      { value: PORTFOLIO_DEFAULT_AUDIT_FLOW_CODE, label: '默认审核流' },
      { value: PORTFOLIO_SCHOOL_REVIEW_FLOW_CODE, label: '学校复审（敏感）' },
    ],
  },
  {
    key: 'reviewStatus',
    type: 'select',
    label: '审核状态',
    allowClear: true,
    width: 140,
    options: reviewTaskStatusFilterOptions(),
  },
])

const loading = ref(false)
const rows = ref<PortfolioReviewTaskSummaryVO[]>([])
const pageNum = ref(1)
const pageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const pageTotal = ref(0)
const categoryRequestToken = ref(0)
const pageRequestToken = ref(0)
const detailRequestToken = ref(0)
const fieldRequestToken = ref(0)
const logRequestToken = ref(0)
const aiPreReviewRequestToken = ref(0)
const selectedRowKeys = ref<string[]>([])
const batchSubmitting = ref(false)
const batchRejectSubmitting = ref(false)

const drawerOpen = ref(false)
const activeRow = ref<PortfolioReviewTaskSummaryVO | null>(null)

/** 当前审核目标教师；封存写禁预检 */
const actionTeacherId = ref<string | undefined>()
const {
  archiveWriteForbidden,
  archiveWriteBlockMessage,
  assertArchiveWritable,
  reloadLifecycleState,
} = usePortfolioArchiveWriteGuard({ teacherId: actionTeacherId })

async function bindActionTeacherAndAssert(
  teacherId: string | number | undefined | null,
  actionLabel: string,
): Promise<boolean> {
  actionTeacherId.value
    = teacherId != null && String(teacherId).trim() !== '' ? String(teacherId) : undefined
  await reloadLifecycleState()
  return assertArchiveWritable(actionLabel)
}

async function assertTaskIdsArchiveWritable(
  taskIds: string[],
  actionLabel: string,
): Promise<boolean> {
  const teacherIds = new Set<string>()
  for (const id of taskIds) {
    const row = rows.value.find((item) => item.id === id)
    if (row?.teacherId != null && String(row.teacherId).trim() !== '') {
      teacherIds.add(String(row.teacherId))
    }
  }
  for (const teacherId of teacherIds) {
    if (!(await bindActionTeacherAndAssert(teacherId, actionLabel))) {
      return false
    }
  }
  return true
}
const recordDetail = ref<PortfolioReviewArchiveRecordDetailVO | null>(null)
const aiPreReview = ref<PortfolioAiAnalysisDetailVO | null>(null)
const aiPreReviewAbsent = ref(false)
const fieldRows = ref<PortfolioReviewRecordFieldVO[]>([])
const fieldPageNum = ref(1)
const fieldPageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const fieldTotal = ref(0)
const logRows = ref<PortfolioReviewLogVO[]>([])
const logPageNum = ref(1)
const logPageSize = ref(DEFAULT_LIST_PAGE_SIZE)
const logTotal = ref(0)
const detailLoading = ref(false)
const actionSubmitting = ref(false)
const reviewWriting = computed(
  () => actionSubmitting.value || batchSubmitting.value || batchRejectSubmitting.value,
)
const approveOpinion = ref('')
const rejectReason = ref('')
const dismissReason = ref('')
const returnDeadline = ref('')
const batchRejectReason = ref('')
const batchReturnDeadline = ref('')
const escalateReason = ref('')
const router = useRouter()

const batchSelectableKeys = computed(() =>
  rows.value
    .filter((item) => item.batchApproveAllowed && !item.associationBroken)
    .map((item) => item.id),
)

/** 列表或筛选变化后，若当前审核任务已失效，必须关闭抽屉并清空旧复核上下文。 */
function resetReviewDetailContext() {
  detailRequestToken.value += 1
  fieldRequestToken.value += 1
  logRequestToken.value += 1
  aiPreReviewRequestToken.value += 1
  detailLoading.value = false
  drawerOpen.value = false
  activeRow.value = null
  recordDetail.value = null
  aiPreReview.value = null
  aiPreReviewAbsent.value = false
  fieldRows.value = []
  fieldTotal.value = 0
  fieldPageNum.value = 1
  logRows.value = []
  logTotal.value = 0
  logPageNum.value = 1
  approveOpinion.value = ''
  rejectReason.value = ''
  dismissReason.value = ''
  returnDeadline.value = ''
  escalateReason.value = ''
}

async function loadCategories() {
  const currentToken = ++categoryRequestToken.value
  try {
    const tree = await portfolioArchiveTemplateApi.listCategoryTree({
      teacherId: filterForm.teacherId,
    })
    if (currentToken !== categoryRequestToken.value) {
      return
    }
    categoryOptions.value = flattenCategoryTree(tree ?? [])
  } catch (error) {
    if (currentToken !== categoryRequestToken.value) {
      return
    }
    categoryOptions.value = []
    showUserError(error, '加载档案分类失败')
  }
}

function reviewRecordFieldValue(fieldCode: string): string | undefined {
  if (fieldCode === 'academicYear') {
    const fromRecordColumn = recordDetail.value?.academicYear?.trim()
    if (fromRecordColumn) {
      return fromRecordColumn
    }
  }
  const fromDetail = recordDetail.value?.fields
    ?.find((item) => item.fieldCode === fieldCode)
    ?.fieldValue
?.trim()
  if (fromDetail) {
    return fromDetail
  }
  return (
    fieldRows.value.find((item) => item.fieldCode === fieldCode)?.fieldValue?.trim() || undefined
  )
}

function goCourseArchive(teacherId: string) {
  const query: Record<string, string> = { teacherId }
  const courseCode = reviewRecordFieldValue('courseCode')
  const academicYear = reviewRecordFieldValue('academicYear')
  const semester = reviewRecordFieldValue('semester')
  if (courseCode) {
    query.courseCode = courseCode
  }
  if (academicYear) {
    query.academicYear = academicYear
  }
  if (semester) {
    query.semester = semester
  }
  void router.push({
    path: '/portfolio/teacher/course-archive',
    query,
  })
}

function goTeacherPortfolioPage(path: string, teacherId: string) {
  void router.push({
    path,
    query: { teacherId },
  })
}

const showCourseArchiveLink = computed(
  () =>
    activeRow.value?.teacherId != null
    && isPortfolioCourseFrameworkCategoryCode(activeRow.value.categoryCode),
)

function flattenCategoryTree(
  nodes: PortfolioArchiveCategoryTreeNodeVO[],
): { label: string, value: string }[] {
  const options: { label: string, value: string }[] = []
  for (const node of nodes) {
    options.push({ label: node.categoryName, value: node.id })
    if (node.children?.length) {
      options.push(...flattenCategoryTree(node.children))
    }
  }
  return options
}

async function loadPage() {
  const currentToken = ++pageRequestToken.value
  loading.value = true
  try {
    const result = await portfolioReviewApi.pageTasks({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      departmentId: filterForm.departmentId,
      categoryId: filterForm.categoryId,
      teacherId: filterForm.teacherId,
      auditFlowCode: filterForm.auditFlowCode,
      reviewStatus: filterForm.reviewStatus,
    })
    if (currentToken !== pageRequestToken.value) {
      return
    }
    rows.value = result.list
    pageTotal.value = result.total
    selectedRowKeys.value = selectedRowKeys.value.filter((id) =>
      batchSelectableKeys.value.includes(id),
    )
    if (activeRow.value && !rows.value.some((item) => item.id === activeRow.value?.id)) {
      resetReviewDetailContext()
    }
  } catch (error) {
    if (currentToken !== pageRequestToken.value) {
      return
    }
    rows.value = []
    pageTotal.value = 0
    selectedRowKeys.value = []
    resetReviewDetailContext()
    showUserError(error, '加载审核待办失败')
  } finally {
    if (currentToken === pageRequestToken.value) {
      loading.value = false
    }
  }
}

function handleSearch() {
  if (actionSubmitting.value || batchSubmitting.value || batchRejectSubmitting.value) {
    showFormValidationMessage('审核操作处理中，请稍后切换筛选')
    return
  }
  pageNum.value = 1
  resetReviewDetailContext()
  void loadPage()
}

function handlePageChange(event: { current: number, pageSize: number }) {
  if (actionSubmitting.value || batchSubmitting.value || batchRejectSubmitting.value) {
    showFormValidationMessage('审核操作处理中，请稍后翻页')
    return
  }
  pageNum.value = event.current
  pageSize.value = event.pageSize
  resetReviewDetailContext()
  void loadPage()
}

async function loadFieldPage() {
  if (!activeRow.value) {
    return
  }
  const requestTaskId = activeRow.value.id
  const currentToken = ++fieldRequestToken.value
  try {
    const page = await portfolioReviewApi.pageArchiveRecordFields({
      archiveRecordId: activeRow.value.archiveRecordId,
      pageNum: fieldPageNum.value,
      pageSize: fieldPageSize.value,
    })
    if (currentToken !== fieldRequestToken.value || activeRow.value?.id !== requestTaskId) {
      return
    }
    fieldRows.value = page.list
    fieldTotal.value = page.total
  } catch (error) {
    if (currentToken !== fieldRequestToken.value || activeRow.value?.id !== requestTaskId) {
      return
    }
    fieldRows.value = []
    fieldTotal.value = 0
    showUserError(error, '加载档案字段失败')
  }
}

async function loadLogPage() {
  if (!activeRow.value) {
    return
  }
  const requestTaskId = activeRow.value.id
  const currentToken = ++logRequestToken.value
  try {
    const page = await portfolioReviewApi.pageLogs({
      reviewTaskId: activeRow.value.id,
      pageNum: logPageNum.value,
      pageSize: logPageSize.value,
    })
    if (currentToken !== logRequestToken.value || activeRow.value?.id !== requestTaskId) {
      return
    }
    logRows.value = page.list
    logTotal.value = page.total
  } catch (error) {
    if (currentToken !== logRequestToken.value || activeRow.value?.id !== requestTaskId) {
      return
    }
    logRows.value = []
    logTotal.value = 0
    showUserError(error, '加载审核日志失败')
  }
}

function handleFieldPageChange(event: { current: number, pageSize: number }) {
  fieldPageNum.value = event.current
  fieldPageSize.value = event.pageSize
  void loadFieldPage()
}

function handleLogPageChange(event: { current: number, pageSize: number }) {
  logPageNum.value = event.current
  logPageSize.value = event.pageSize
  void loadLogPage()
}

async function openDetail(row: PortfolioReviewTaskSummaryVO) {
  actionTeacherId.value
    = row.teacherId != null && String(row.teacherId).trim() !== '' ? String(row.teacherId) : undefined
  void reloadLifecycleState()

  if (actionSubmitting.value || batchSubmitting.value || batchRejectSubmitting.value) {
    showFormValidationMessage('审核操作处理中，请稍后查看其他任务')
    return
  }
  const currentToken = ++detailRequestToken.value
  fieldRequestToken.value += 1
  logRequestToken.value += 1
  aiPreReviewRequestToken.value += 1
  activeRow.value = row
  drawerOpen.value = true
  approveOpinion.value = ''
  rejectReason.value = ''
  dismissReason.value = ''
  returnDeadline.value = ''
  escalateReason.value = ''
  detailLoading.value = true
  recordDetail.value = null
  aiPreReview.value = null
  aiPreReviewAbsent.value = false
  fieldRows.value = []
  fieldTotal.value = 0
  fieldPageNum.value = 1
  logRows.value = []
  logTotal.value = 0
  logPageNum.value = 1
  try {
    const detail = await portfolioReviewApi.getArchiveRecord(row.archiveRecordId)
    if (currentToken !== detailRequestToken.value || activeRow.value?.id !== row.id) {
      return
    }
    recordDetail.value = detail
    if (row.reviewActionAllowed) {
      await Promise.all([loadFieldPage(), loadLogPage()])
      if (currentToken !== detailRequestToken.value || activeRow.value?.id !== row.id) {
        return
      }
      try {
        const aiRequestToken = ++aiPreReviewRequestToken.value
        const aiDetail = await portfolioReviewApi.getAiPreReview(row.id)
        if (
          aiRequestToken !== aiPreReviewRequestToken.value
          || currentToken !== detailRequestToken.value
          || activeRow.value?.id !== row.id
        ) {
          return
        }
        aiPreReview.value = aiDetail
      } catch (error) {
        if (currentToken !== detailRequestToken.value || activeRow.value?.id !== row.id) {
          return
        }
        if (readBusinessResultCode(error) === ResultCode.DATA_NOT_FOUND) {
          aiPreReviewAbsent.value = true
        } else {
          showUserError(error, '加载智能初审失败')
        }
      }
    }
  } catch (error) {
    if (currentToken !== detailRequestToken.value || activeRow.value?.id !== row.id) {
      return
    }
    showUserError(error, '加载审核详情失败')
  } finally {
    if (currentToken === detailRequestToken.value && activeRow.value?.id === row.id) {
      detailLoading.value = false
    }
  }
}

async function handleApprove() {
  if (
    !activeRow.value
    || actionSubmitting.value
    || batchSubmitting.value
    || batchRejectSubmitting.value
  ) {
    return
  }
  if (!(await bindActionTeacherAndAssert(activeRow.value.teacherId, '档案审核通过'))) {
    return
  }
  actionSubmitting.value = true
  try {
    await portfolioReviewApi.approve({
      reviewTaskId: activeRow.value.id,
      opinion: approveOpinion.value.trim() || undefined,
    })
    void message.success('审核已通过')
    resetReviewDetailContext()
    await loadPage()
  } catch (error) {
    showUserError(error, '审核通过失败')
  } finally {
    actionSubmitting.value = false
  }
}

async function handleReject() {
  if (
    !activeRow.value
    || actionSubmitting.value
    || batchSubmitting.value
    || batchRejectSubmitting.value
    || !rejectReason.value.trim()
    || !returnDeadline.value.trim()
  ) {
    showFormValidationMessage('请填写退回原因与重提期限')
    return
  }
  if (!(await bindActionTeacherAndAssert(activeRow.value.teacherId, '档案审核退回'))) {
    return
  }
  actionSubmitting.value = true
  try {
    await portfolioReviewApi.reject({
      reviewTaskId: activeRow.value.id,
      reason: rejectReason.value.trim(),
      returnDeadline: returnDeadline.value.trim(),
    })
    void message.success('已退回修改')
    resetReviewDetailContext()
    await loadPage()
  } catch (error) {
    showUserError(error, '审核退回失败')
  } finally {
    actionSubmitting.value = false
  }
}

async function handleDismiss() {
  if (
    !activeRow.value
    || actionSubmitting.value
    || batchSubmitting.value
    || batchRejectSubmitting.value
    || !dismissReason.value.trim()
  ) {
    showFormValidationMessage('请填写驳回依据')
    return
  }
  const ok = await confirmAsync({
    title: '确认驳回',
    content: '确认驳回该档案材料？驳回后记录将作废。',
    type: 'warning',
  })
  if (!ok) {
    return
  }
  if (!(await bindActionTeacherAndAssert(activeRow.value.teacherId, '档案审核驳回'))) {
    return
  }
  actionSubmitting.value = true
  try {
    await portfolioReviewApi.dismiss({
      reviewTaskId: activeRow.value.id,
      reason: dismissReason.value.trim(),
    })
    void message.success('已驳回')
    resetReviewDetailContext()
    await loadPage()
  } catch (error) {
    showUserError(error, '审核驳回失败')
  } finally {
    actionSubmitting.value = false
  }
}

async function handleBatchApprove() {
  if (actionSubmitting.value || batchSubmitting.value || batchRejectSubmitting.value) {
    return
  }
  if (!selectedRowKeys.value.length) {
    showFormValidationMessage('请选择可批量通过的待审任务')
    return
  }
  if (!(await assertTaskIdsArchiveWritable(selectedRowKeys.value.map(String), '批量审核通过'))) {
    return
  }
  batchSubmitting.value = true
  try {
    const count = await portfolioReviewApi.batchApprove({ reviewTaskIds: selectedRowKeys.value })
    void message.success(`已批量通过 ${count} 条`)
    selectedRowKeys.value = []
    await loadPage()
  } catch (error) {
    showUserError(error, '批量通过失败')
  } finally {
    batchSubmitting.value = false
  }
}

async function handleBatchReject() {
  if (actionSubmitting.value || batchSubmitting.value || batchRejectSubmitting.value) {
    return
  }
  if (!selectedRowKeys.value.length) {
    showFormValidationMessage('请选择可批量退回的待审任务')
    return
  }
  if (!batchRejectReason.value.trim() || !batchReturnDeadline.value.trim()) {
    showFormValidationMessage('请填写批量退回原因与重提期限')
    return
  }
  if (!(await assertTaskIdsArchiveWritable(selectedRowKeys.value.map(String), '批量审核退回'))) {
    return
  }
  batchRejectSubmitting.value = true
  try {
    const count = await portfolioReviewApi.batchReject({
      reviewTaskIds: selectedRowKeys.value,
      reason: batchRejectReason.value.trim(),
      returnDeadline: batchReturnDeadline.value.trim(),
    })
    void message.success(`已批量退回 ${count} 条`)
    selectedRowKeys.value = []
    batchRejectReason.value = ''
    batchReturnDeadline.value = ''
    await loadPage()
  } catch (error) {
    showUserError(error, '批量退回失败')
  } finally {
    batchRejectSubmitting.value = false
  }
}

async function handleEscalate() {
  if (
    !activeRow.value
    || actionSubmitting.value
    || batchSubmitting.value
    || batchRejectSubmitting.value
    || !escalateReason.value.trim()
  ) {
    showFormValidationMessage('请填写转复审原因')
    return
  }
  const ok = await confirmAsync({
    title: '确认转复审',
    content: '确认将该材料转学校复审？转复审后禁止批量操作。',
    type: 'warning',
  })
  if (!ok) {
    return
  }
  if (!(await bindActionTeacherAndAssert(activeRow.value.teacherId, '档案转复审'))) {
    return
  }
  actionSubmitting.value = true
  try {
    await portfolioReviewApi.escalate({
      reviewTaskId: activeRow.value.id,
      reason: escalateReason.value.trim(),
    })
    void message.success('已转复审')
    resetReviewDetailContext()
    await loadPage()
  } catch (error) {
    showUserError(error, '转复审失败')
  } finally {
    actionSubmitting.value = false
  }
}

onMounted(async () => {
  await loadTree()
  await loadCategories()
  await loadPage()
})

watch(
  () => filterForm.teacherId,
  (teacherId, previousTeacherId) => {
    if (teacherId === previousTeacherId) {
      return
    }
    filterForm.categoryId = undefined
    void loadCategories()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="院系审核台" />
    </template>

    <UiAlertStrip
      v-if="archiveWriteForbidden"
      tone="warning"
      title="档案已封存写禁"
      :description="archiveWriteBlockMessage"
    />

    <UiFilterBar
      variant="plain"
      v-model="filterModel"
      :fields="filterFields"
      @search="handleSearch"
    />
    <UiCard class="review-card">
      <UiAlertStrip
        v-if="hasSensitiveRows"
        tone="warning"
        :closable="false"
        title="敏感材料须单条复核，禁止批量通过/退回"
      />
      <div class="review-toolbar">
        <UiButton
          variant="primary"
          size="sm"
          :loading="batchSubmitting"
          :disabled="!selectedRowKeys.length || reviewWriting"
          @click="handleBatchApprove"
        >
          批量通过（{{ selectedRowKeys.length }}）
        </UiButton>
        <UiButton
          size="sm"
          :loading="batchRejectSubmitting"
          :disabled="!selectedRowKeys.length || reviewWriting"
          @click="handleBatchReject"
        >
          批量退回（{{ selectedRowKeys.length }}）
        </UiButton>
      </div>
      <div v-if="selectedRowKeys.length" class="review-batch-reject">
        <UiInput
          v-model="batchRejectReason"
          size="sm"
          :disabled="reviewWriting"
          placeholder="批量退回原因"
        />
        <UiDatePicker
          v-model="batchReturnDeadline"
          show-time
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="重提期限"
          :disabled="reviewWriting"
          style="width: 100%"
        />
      </div>
      <UiDataTable
        row-key="id"
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="listColumns"
        :data-source="rows"
        :loading="loading"
        :total="pageTotal"
        flat
        empty-title="暂无审核待办"
        empty-description="当前筛选条件下没有待复核材料，可调整院系、分类或审核状态后重试。"
        @page-change="handlePageChange"
        :row-selection="{
          selectedRowKeys,
          onChange: (keys: string[]) => {
            selectedRowKeys = keys
          },
          getCheckboxProps: (record: PortfolioReviewTaskSummaryVO) => ({
            disabled:
              reviewWriting || !record.batchApproveAllowed || Boolean(record.associationBroken),
          }),
        }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'teacher'">
            {{ record.teacherName }}
          </template>
          <template v-else-if="column.key === 'riskLevel'">
            <UiTag v-if="record.riskLevel" :tone="materialRiskLevelTone(record.riskLevel)">
              {{ materialRiskLevelLabel(record.riskLevel) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'referenceTask'">
            {{ record.referenceAiTaskId ?? '—' }}
          </template>
          <template v-else-if="column.key === 'aiPreReview'">
            {{ record.aiPreReviewSummary ?? '—' }}
          </template>
          <template v-else-if="column.key === 'sourceType'">
            {{ record.sourceType ? archiveRecordSourceTypeLabel(record.sourceType) : '—' }}
          </template>
          <template v-else-if="column.key === 'recordStatus'">
            <UiTag v-if="record.recordStatus" :tone="archiveRecordStatusTone(record.recordStatus)">
              {{ archiveRecordStatusLabel(record.recordStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'reviewStatus'">
            <UiTag :tone="reviewTaskStatusTone(record.reviewStatus)">
              {{ reviewTaskStatusLabel(record.reviewStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'associationBroken'">
            <span
              v-if="record.associationBroken"
              :title="record.associationBrokenReason || '关联数据断裂'"
            >
              <UiTag tone="red">断裂</UiTag>
            </span>
            <UiTag v-else tone="green">正常</UiTag>
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else-if="!record.lifecycleStatus" class="text-neutral-400">—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="record.id || record.teacherId || record.teacherUserId || record.userId"
            />
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
              :items="[
                {
                  key: 'review',
                  label: record.riskLevel === 'SENSITIVE' ? '单条复核' : '复核',
                },
                {
                  key: 'masterpiece',
                  label: '读整袋',
                  disabled: !record.teacherId,
                },
              ]"
              split
              @action="
                (key) => {
                  if (key === 'masterpiece') {
                    goTeacherPortfolioPage('/portfolio/teacher/masterpiece', record.teacherId)
                    return
                  }
                  openDetail(record)
                }
              "
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDrawer
      v-model:open="drawerOpen"
      title="审核复核"
      width="720"
      @close="resetReviewDetailContext"
    >
      <template v-if="activeRow">
        <p class="review-meta">
          {{ activeRow.teacherName }} · {{ activeRow.categoryName }} ·
          {{ reviewTaskStatusLabel(activeRow.reviewStatus) }}
        </p>
        <div v-if="activeRow.teacherId" class="review-teacher-links">
          <UiButton
            size="sm"
            variant="primary"
            @click="goTeacherPortfolioPage('/portfolio/teacher/masterpiece', activeRow.teacherId)"
          >
            读整袋
          </UiButton>
          <UiButton
            size="sm"
            v-if="showCourseArchiveLink"
            variant="ghost"
            @click="goCourseArchive(activeRow.teacherId)"
          >
            查看课程档案
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            @click="goTeacherPortfolioPage('/portfolio/teacher/philosophy', activeRow.teacherId)"
          >
            教学理念
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            @click="goTeacherPortfolioPage('/portfolio/teacher/profile', activeRow.teacherId)"
          >
            个人资料
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            @click="goTeacherPortfolioPage('/portfolio/teacher/honor', activeRow.teacherId)"
          >
            获奖情况
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            @click="
              goTeacherPortfolioPage('/portfolio/teacher/extension-activity', activeRow.teacherId)
            "
          >
            教学拓展
          </UiButton>
        </div>
        <p v-if="aiPreReview?.summary" class="review-ai-summary">
          智能初审：{{ aiPreReview.summary }}
        </p>
        <ul v-if="aiPreReview?.issueItems?.length" class="review-ai-issues">
          <li v-for="(issue, index) in aiPreReview.issueItems" :key="index">
            {{ issue.issueTitle }}：{{ issue.issueDescription }}
          </li>
        </ul>
        <p v-else-if="activeRow.aiPreReviewSummary" class="review-ai-summary">
          智能初审：{{ activeRow.aiPreReviewSummary }}
        </p>
        <p
          v-else-if="aiPreReviewAbsent && activeRow.reviewActionAllowed"
          class="review-ai-summary review-ai-absent"
        >
          尚无智能初审结果
        </p>
        <p v-if="activeRow.singleReviewRequired" class="review-sensitive-hint">
          敏感材料：须单条复核，禁止批量操作。
        </p>
        <div v-if="activeAssociationBroken" class="review-broken-alert" role="alert">
          <strong>关联数据断裂，禁止审核动作</strong>
          <p>{{ activeRow.associationBrokenReason || '档案/分类/教师关联缺失' }}</p>
        </div>
        <div
          v-if="activeRow.lifecycleStatus && activeRow.lifecycleStatus !== 'ACTIVE'"
          class="review-lifecycle-hint"
        >
          教师生命周期：
          <UiTag :tone="lifecycleTagTone(activeRow)">
            {{ activeRow.lifecycleStatusLabel || activeRow.lifecycleStatus }}
          </UiTag>
          <span v-if="activeRow.countsInCurrentFacultyStructure === false">（不计入当前在岗结构）</span>
          <span v-if="activeRow.archiveWriteForbidden">（档案写禁）</span>
          <span v-if="activeRow.evaluationHeld">（参评 hold）</span>
        </div>
        <UiDataTable
          v-if="fieldTotal > 0"
          row-key="fieldCode"
          size="small"
          v-model:current="fieldPageNum"
          v-model:page-size="fieldPageSize"
          pagination-mode="server"
          :columns="fieldColumns"
          :data-source="fieldRows"
          :total="fieldTotal"
          :sticky-header="false"
          flat
          @page-change="handleFieldPageChange"
        />
        <UiEmpty size="sm" v-else-if="!detailLoading" description="暂无字段快照" />
        <UiDataTable
          v-if="logTotal > 0"
          class="review-logs"
          row-key="id"
          size="small"
          v-model:current="logPageNum"
          v-model:page-size="logPageSize"
          pagination-mode="server"
          :columns="logColumns"
          :data-source="logRows"
          :total="logTotal"
          :sticky-header="false"
          flat
          @page-change="handleLogPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actionType'">
              {{ reviewActionTypeLabel(record.actionType) }}
            </template>
          </template>
        </UiDataTable>
        <div v-if="showReviewActions" class="review-actions">
          <UiInput
            v-model="approveOpinion"
            size="sm"
            :disabled="reviewWriting"
            placeholder="通过意见（可选）"
          />
          <div class="review-actions__row">
            <UiButton
              size="sm"
              variant="primary"
              :loading="actionSubmitting"
              @click="handleApprove"
            >
              通过
            </UiButton>
          </div>
          <template v-if="activeRow.escalateAllowed">
            <UiInput
              v-model="escalateReason"
              size="sm"
              :disabled="reviewWriting"
              placeholder="转复审原因"
            />
            <UiButton size="sm" :loading="actionSubmitting" @click="handleEscalate">
              转复审
            </UiButton>
          </template>
          <UiInput
            v-model="rejectReason"
            size="sm"
            :disabled="reviewWriting"
            placeholder="退回原因"
          />
          <UiDatePicker
            v-model="returnDeadline"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="重提期限"
            :disabled="reviewWriting"
            style="width: 100%"
          />
          <UiButton size="sm" :loading="actionSubmitting" @click="handleReject">
            退回修改
          </UiButton>
          <UiInput
            v-model="dismissReason"
            size="sm"
            :disabled="reviewWriting"
            placeholder="驳回依据"
          />
          <UiButton size="sm" status="danger" :loading="actionSubmitting" @click="handleDismiss">
            驳回
          </UiButton>
        </div>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.review-card {
  margin-top: 16px;
}
.review-batch-reject {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.review-toolbar {
  margin-bottom: 12px;
}
.review-section {
  margin-bottom: 16px;
}
.review-section__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.review-sensitive-hint {
  margin: 0 0 12px;
  color: var(--dp-error);
  font-size: 13px;
}
.review-meta {
  margin: 0 0 12px;
  color: var(--dp-color-text-secondary);
}
.review-teacher-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-bottom: 12px;
}
.review-broken-alert {
  margin: 12px 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--dp-danger-border, #ffccc7);
  background: var(--dp-danger-bg, #fff2f0);
  color: var(--dp-danger, #cf1322);
}
.review-broken-alert p {
  margin: 6px 0 0;
  color: var(--dp-text-secondary, #595959);
  word-break: break-word;
}
.review-lifecycle-hint {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 8px 0 12px;
  color: var(--dp-text-secondary, #595959);
  font-size: 13px;
}
.review-ai-summary {
  margin: 0 0 8px;
  font-size: 13px;
}
.review-ai-issues {
  margin: 0 0 12px 16px;
  padding: 0;
  font-size: 13px;
  color: var(--dp-color-text-secondary);
}
.review-ai-absent {
  color: var(--dp-color-text-secondary);
}
.review-logs {
  margin-top: 16px;
}
.review-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}
.review-actions__row {
  display: flex;
  gap: 8px;
}
</style>
