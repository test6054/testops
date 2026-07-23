<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTeacherLifecycleChangeTypeCode,
  PortfolioTeacherLifecycleEventVO,
  PortfolioTeacherLifecycleStateVO,
} from '@/apis/portfolio/teacher-lifecycle'
import type { PortfolioIndustryMentorContributionVO } from '@/apis/portfolio/teacher-platform'
import type {
  PortfolioCompletenessLevelCode,
  PortfolioTeacherDetailVO,
  PortfolioTeacherIdentitySaveRequest,
  PortfolioTeacherIdentityVO,
  PortfolioTeacherPageRequest,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { UserStatusEnum } from '@/types/enums/user-status'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  ALL_PORTFOLIO_COMPLETENESS_LEVEL_CODES,
  PORTFOLIO_TEACHER_IDENTITY_STATUS_OPTIONS,
  PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS,
  PortfolioCompletenessLevelDescription,
  PortfolioTeacherIdentityStatusCode,
  PortfolioTeacherIdentityStatusDescription,
  PortfolioTeacherIdentityTypeCode,
  PortfolioTeacherIdentityTypeDescription,
} from '@/apis/portfolio/enums'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS,
  PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL,
  portfolioTeacherLifecycleApi,
} from '@/apis/portfolio/teacher-lifecycle'
import {
  portfolioExternalTeacherApi,
  portfolioTeacherLibraryApi,
  portfolioTeacherSalaryApi,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { stageBusinessFile } from '@/composables/platform/usePlatformFileStage'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { getUserStatusLabel, USER_STATUS_FILTER_OPTIONS } from '@/types/enums/user-status'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const completenessLevelOptions = ALL_PORTFOLIO_COMPLETENESS_LEVEL_CODES.map((code) => ({
  label: strictEnumLabel(PortfolioCompletenessLevelDescription, code, '档案完整度分级'),
  value: code,
}))

interface TeacherFilterModel extends Record<string, unknown> {
  searchText?: string
  title?: string
  identityType?: PortfolioTeacherPageRequest['identityType']
  departmentId?: string
  portfolioOrgId?: string
  status?: UserStatusEnum
  completenessLevel?: PortfolioCompletenessLevelCode
}

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readCompletenessLevelParam(value: unknown): PortfolioCompletenessLevelCode | undefined {
  const raw = readRouteStringParam(value)
  if (!raw) {
    return undefined
  }
  return ALL_PORTFOLIO_COMPLETENESS_LEVEL_CODES.includes(raw as PortfolioCompletenessLevelCode)
    ? (raw as PortfolioCompletenessLevelCode)
    : undefined
}

const route = useRoute()
const router = useRouter()
const { loadTree, departmentOptions, portfolioOrgOptions } = usePortfolioOrgTree()
const { canManageTeacherAi } = usePortfolioTeacherAccess()

const query = reactive<PortfolioTeacherPageRequest>({
  pageNum: 1,
  pageSize: 10,
  searchText: '',
  title: '',
  identityType: undefined,
  departmentId: undefined,
  portfolioOrgId: undefined,
  status: undefined,
  completenessLevel: undefined,
  includeCompletenessMetrics: true,
})

const showCompletenessColumns = computed(() => Boolean(query.includeCompletenessMetrics))

const listColumns = computed<ColumnsType>(() => {
  const columns: ColumnsType = [
    { title: '工号', dataIndex: 'teacherNumber', key: 'teacherNumber', width: 120, fixed: 'left' },
    { title: '姓名', dataIndex: 'nickName', key: 'nickName', width: 120 },
    { title: '账号', dataIndex: 'userName', key: 'userName', width: 140 },
    { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
    { title: '职称', dataIndex: 'title', key: 'title', width: 100 },
  ]
  if (showCompletenessColumns.value) {
    columns.push(
      { title: '完整度', key: 'completenessPercent', width: 120 },
      { title: '五框架', key: 'courseArchiveFramework', width: 120 },
    )
  }
  columns.push(
    { title: '身份标签', key: 'identityTags', width: 160 },
    { title: '账号状态', key: 'userStatus', width: 100 },
    { title: '生命周期', key: 'lifecycleStatus', width: 110 },
    { title: '身份层', key: 'identityLayers', width: 160 },
    { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 90 },
    { title: '主身份', key: 'primaryIdentityType', width: 120 },
    { title: '操作', key: 'actions', width: 240 },
  )
  return columns
})

const filterForm = reactive<TeacherFilterModel>({
  searchText: '',
  title: '',
  identityType: undefined,
  departmentId: undefined,
  portfolioOrgId: undefined,
  status: undefined,
  completenessLevel: undefined,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'searchText', type: 'input', label: '关键词', placeholder: '姓名/工号', width: 180 },
  {
    key: 'departmentId',
    type: 'select',
    label: '院系',
    allowClear: true,
    width: 200,
    options: departmentOptions(),
  },
  {
    key: 'portfolioOrgId',
    type: 'select',
    label: '归属扩展组织',
    allowClear: true,
    width: 220,
    options: portfolioOrgOptions(),
  },
  { key: 'title', type: 'input', label: '职称', width: 120 },
  {
    key: 'identityType',
    type: 'select',
    label: '身份类型',
    allowClear: true,
    width: 150,
    options: PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS,
  },
  {
    key: 'status',
    type: 'select',
    label: '账号状态',
    allowClear: true,
    width: 120,
    options: USER_STATUS_FILTER_OPTIONS,
  },
  {
    key: 'completenessLevel',
    type: 'select',
    label: '完整度分级',
    allowClear: true,
    width: 140,
    options: completenessLevelOptions,
  },
])

const identityColumns: ColumnsType = [
  { title: '身份类型', key: 'identityType', width: 120, fixed: 'left' },
  { title: '状态', key: 'identityStatus', width: 80 },
  { title: '工号', dataIndex: 'staffNo', key: 'staffNo', width: 110 },
  { title: '聘任编号', dataIndex: 'appointmentNo', key: 'appointmentNo', width: 120 },
  { title: '展示名称', dataIndex: 'displayName', key: 'displayName' },
  { title: '企业/单位', dataIndex: 'enterpriseName', key: 'enterpriseName' },
  { title: '操作', key: 'actions', width: 80 },
]

const list = ref<PortfolioTeacherSummaryVO[]>([])
const total = ref(0)
const loading = ref(false)
const loadError = ref(false)
const pageRequestToken = ref(0)
const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const exporting = computed(() => operationKey.value === 'roster:export')

const detailVisible = ref(false)
const detail = ref<PortfolioTeacherDetailVO | null>(null)
const salarySummary = ref('')
const librarySummary = ref('')
const extensionLoadError = ref(false)
const industryMentorContribution = ref<PortfolioIndustryMentorContributionVO | null>(null)
const industryMentorContributionError = ref('')
const detailRequestToken = ref(0)
const lifecycleState = ref<PortfolioTeacherLifecycleStateVO | null>(null)
const lifecycleLoadError = ref('')
const lifecycleChangeType = ref<PortfolioTeacherLifecycleChangeTypeCode | undefined>(undefined)
const lifecycleReason = ref('')
const lifecycleEvents = ref<PortfolioTeacherLifecycleEventVO[]>([])
const affiliationHistory = ref<
  import('@/apis/portfolio/types').PortfolioTeacherAffiliationHistoryVO[]
>([])
const affiliationLoadError = ref('')

const identityVisible = ref(false)
const identityMode = ref<'create' | 'edit'>('create')
const interactionLocked = computed(() => writing.value || identityVisible.value)
const identityEditor = reactive<PortfolioTeacherIdentitySaveRequest>({
  teacherUserId: undefined,
  identityType: PortfolioTeacherIdentityTypeCode.INDUSTRY_MENTOR,
  identityStatus: PortfolioTeacherIdentityStatusCode.ACTIVE,
  appointmentNo: '',
  staffNo: '',
  displayName: '',
  enterpriseName: '',
})

/** 名册身份维护和导出必须串行，避免跨教师上下文提交。 */
function beginOperation(key: string): boolean {
  if (writing.value) return false
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) operationKey.value = ''
}

function identityTypeLabel(type?: PortfolioTeacherIdentityVO['identityType']) {
  if (!type) {
    return '—'
  }
  return strictEnumLabel(PortfolioTeacherIdentityTypeDescription, type, '教师身份类型')
}

function identityStatusLabel(status?: PortfolioTeacherIdentityVO['identityStatus']) {
  if (!status) {
    return '—'
  }
  return strictEnumLabel(PortfolioTeacherIdentityStatusDescription, status, '教师身份状态')
}

function lifecycleTagTone(record: PortfolioTeacherSummaryVO): 'green' | 'red' | 'orange' | 'gray' {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.archiveWriteForbidden) return 'red'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  return 'gray'
}

function completenessRowLabel(record: PortfolioTeacherSummaryVO): string {
  if (record.completenessPercent == null) {
    return '—'
  }
  const level = record.completenessLevel
    ? strictEnumLabel(
        PortfolioCompletenessLevelDescription,
        record.completenessLevel,
        '档案完整度分级',
      )
    : ''
  return level ? `${record.completenessPercent}% · ${level}` : `${record.completenessPercent}%`
}

function courseArchiveRowLabel(record: PortfolioTeacherSummaryVO): string {
  if ((record.courseArchiveFrameworkSlotTotal ?? 0) <= 0) {
    return '—'
  }
  return `${record.courseArchiveFrameworkSlotDone ?? 0}/${record.courseArchiveFrameworkSlotTotal ?? 0} · 齐备 ${record.courseArchiveFullyCompleteCount ?? 0} 门`
}

function syncCompletenessRouteQuery() {
  const nextQuery: Record<string, string> = {}
  if (query.completenessLevel) {
    nextQuery.completenessLevel = query.completenessLevel
  }
  void router.replace({ path: route.path, query: nextQuery })
}

/** 切换教师详情目标或关闭抽屉时，必须失效旧请求并回收摘要，避免旧教师结果回填当前抽屉。 */
function resetDetailContext() {
  detailRequestToken.value += 1
  detail.value = null
  salarySummary.value = ''
  librarySummary.value = ''
  extensionLoadError.value = false
  lifecycleState.value = null
  lifecycleLoadError.value = ''
  lifecycleChangeType.value = undefined
  lifecycleReason.value = ''
  lifecycleEvents.value = []
}

async function loadPage() {
  const currentToken = pageRequestToken.value + 1
  pageRequestToken.value = currentToken
  const request = { ...query }
  loading.value = true
  loadError.value = false
  try {
    const page = await portfolioTeacherApi.page(request)
    if (pageRequestToken.value !== currentToken) return
    list.value = page.list
    total.value = page.total
  } catch (error) {
    if (pageRequestToken.value !== currentToken) return
    list.value = []
    total.value = 0
    loadError.value = true
    showUserError(error, '加载教师名册失败')
  } finally {
    if (pageRequestToken.value === currentToken) loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  query.searchText = filterForm.searchText
  query.title = filterForm.title
  query.identityType = filterForm.identityType
  query.departmentId = filterForm.departmentId
  query.portfolioOrgId = filterForm.portfolioOrgId
  query.status = filterForm.status
  query.completenessLevel = filterForm.completenessLevel
  syncCompletenessRouteQuery()
  loadPage()
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadPage()
}

function buildTeacherDirectoryRowActions(
  record: PortfolioTeacherSummaryVO,
): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [
    { key: 'home', label: '进入工作台' },
    { key: 'archive', label: '档案' },
    { key: 'detail', label: '详情' },
    { key: 'one-table', label: '一张表' },
  ]
  if (canManageTeacherAi(record.userId)) {
    actions.push({ key: 'intake', label: '材料采集' })
  }
  actions.push({ key: 'identity', label: '身份' })
  return actions.map((item) => ({ ...item, disabled: interactionLocked.value }))
}

function handleTeacherDirectoryAction(key: string, record: PortfolioTeacherSummaryVO): void {
  switch (key) {
    case 'detail':
      void openDetail(record)
      break
    case 'home':
      openTeacherHome(record.userId)
      break
    case 'archive':
      openTeacherArchive(record.userId)
      break
    case 'one-table':
      openOneTable(record.userId)
      break
    case 'intake':
      openTeacherIntake(record.userId)
      break
    case 'identity':
      openIdentityCreate({
        userId: record.userId,
        nickName: record.nickName,
        departmentId: record.departmentId,
      })
      break
  }
}

async function loadAffiliationHistory(userId: string, requestToken = detailRequestToken.value) {
  affiliationLoadError.value = ''
  try {
    const rows = await portfolioTeacherApi.listAffiliationHistory({ teacherUserId: userId })
    if (detailRequestToken.value !== requestToken) {
      return
    }
    affiliationHistory.value = rows ?? []
  } catch (error) {
    if (detailRequestToken.value !== requestToken) {
      return
    }
    affiliationHistory.value = []
    affiliationLoadError.value = error instanceof Error ? error.message : '加载归属血缘失败'
  }
}

const PORTFOLIO_EXTERNAL_IDENTITY_TYPES: ReadonlySet<PortfolioTeacherIdentityTypeCode> = new Set([
  PortfolioTeacherIdentityTypeCode.INDUSTRY_MENTOR,
  PortfolioTeacherIdentityTypeCode.INDUSTRY_PROFESSOR,
  PortfolioTeacherIdentityTypeCode.ENTERPRISE_PART_TIME,
  PortfolioTeacherIdentityTypeCode.SKILL_MASTER,
  PortfolioTeacherIdentityTypeCode.CRAFTSMAN,
  PortfolioTeacherIdentityTypeCode.OTHER_EXTERNAL,
])

function hasActiveExternalIdentity(identities: PortfolioTeacherIdentityVO[] | undefined): boolean {
  if (!identities?.length) {
    return false
  }
  return identities.some(
    (item) =>
      item.identityStatus === PortfolioTeacherIdentityStatusCode.ACTIVE
      && PORTFOLIO_EXTERNAL_IDENTITY_TYPES.has(item.identityType),
  )
}

async function openDetail(row: PortfolioTeacherSummaryVO) {
  const requestToken = detailRequestToken.value + 1
  detailRequestToken.value = requestToken
  detail.value = null
  salarySummary.value = ''
  librarySummary.value = ''
  extensionLoadError.value = false
  industryMentorContribution.value = null
  industryMentorContributionError.value = ''
  try {
    const nextDetail = await portfolioTeacherApi.get(row.userId)
    if (detailRequestToken.value !== requestToken) {
      return
    }
    detail.value = nextDetail
    detailVisible.value = true
    await Promise.all([
      loadTeacherExtensions(row.userId, requestToken),
      loadTeacherLifecycle(row.userId, requestToken),
      loadAffiliationHistory(row.userId, requestToken),
      loadIndustryMentorContribution(row.userId, nextDetail.identities, requestToken),
    ])
  } catch (error) {
    if (detailRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载教师详情失败')
  }
}

/** §8.42：仅在存在 ACTIVE 外部身份时按教师路径加载产业导师贡献度 */
async function loadIndustryMentorContribution(
  userId: string,
  identities: PortfolioTeacherIdentityVO[] | undefined,
  requestToken = detailRequestToken.value,
) {
  industryMentorContributionError.value = ''
  industryMentorContribution.value = null
  if (!hasActiveExternalIdentity(identities)) {
    return
  }
  try {
    const contribution = await portfolioExternalTeacherApi.contributionByTeacher({
      teacherId: userId,
    })
    if (detailRequestToken.value !== requestToken) {
      return
    }
    industryMentorContribution.value = contribution
  } catch (error) {
    if (detailRequestToken.value !== requestToken) {
      return
    }
    industryMentorContribution.value = null
    industryMentorContributionError.value
      = error instanceof Error ? error.message : '加载产业导师贡献度失败'
  }
}

async function loadTeacherExtensions(userId: string, requestToken = detailRequestToken.value) {
  salarySummary.value = ''
  librarySummary.value = ''
  try {
    const salaryPage = await portfolioTeacherSalaryApi.page({
      teacherUserId: userId,
      pageNum: 1,
      pageSize: 1,
    })
    const latest = salaryPage.list?.[0]
    if (detailRequestToken.value !== requestToken) {
      return
    }
    if (latest) {
      salarySummary.value = `${latest.salaryMonth} 基本 ${latest.baseAmountDisplay ?? '—'}`
    }
    const libStats = await portfolioTeacherLibraryApi.stats({ teacherUserId: userId })
    if (detailRequestToken.value !== requestToken) {
      return
    }
    librarySummary.value = `在借 ${libStats.activeBorrowCount} · 逾期 ${libStats.overdueCount}`
  } catch (error) {
    if (detailRequestToken.value !== requestToken) {
      return
    }
    salarySummary.value = ''
    librarySummary.value = ''
    extensionLoadError.value = true
    showUserError(error, '加载教师工资与借阅摘要失败')
  }
}

async function reloadDetail() {
  if (!detail.value?.userId) {
    return
  }
  const userId = detail.value.userId
  const requestToken = detailRequestToken.value + 1
  detailRequestToken.value = requestToken
  try {
    detail.value = await portfolioTeacherApi.get(userId)
    await loadAffiliationHistory(userId)
    if (detailRequestToken.value !== requestToken) {
      return
    }
    await loadTeacherExtensions(userId, requestToken)
  } catch (error) {
    if (detailRequestToken.value !== requestToken) return
    showUserError(error, '刷新教师详情失败')
  }
}

function openIdentityCreate(context: { userId: string, nickName?: string, departmentId?: string }) {
  if (interactionLocked.value) return
  if (!assertCurrentTeacherArchiveWritable('新增教师身份')) return
  identityMode.value = 'create'
  identityEditor.teacherUserId = context.userId
  identityEditor.id = undefined
  identityEditor.identityType = PortfolioTeacherIdentityTypeCode.INDUSTRY_MENTOR
  identityEditor.identityStatus = PortfolioTeacherIdentityStatusCode.ACTIVE
  identityEditor.appointmentNo = ''
  identityEditor.staffNo = ''
  identityEditor.displayName = context.nickName ?? ''
  identityEditor.enterpriseName = ''
  identityEditor.anchorDepartmentId = context.departmentId
  identityEditor.anchorPortfolioOrgId = undefined
  identityEditor.titleAtIdentity = ''
  identityEditor.validFrom = undefined
  identityEditor.validTo = undefined
  identityVisible.value = true
}

function openIdentityEdit(identity: PortfolioTeacherIdentityVO) {
  if (!detail.value || interactionLocked.value) {
    return
  }
  if (!assertCurrentTeacherArchiveWritable('编辑教师身份')) return
  identityMode.value = 'edit'
  identityEditor.teacherUserId = detail.value.userId
  identityEditor.id = identity.id
  identityEditor.identityType = identity.identityType
  identityEditor.identityStatus = identity.identityStatus
  identityEditor.appointmentNo = identity.appointmentNo ?? ''
  identityEditor.staffNo = identity.staffNo ?? ''
  identityEditor.displayName = identity.displayName ?? ''
  identityEditor.enterpriseName = identity.enterpriseName ?? ''
  identityEditor.anchorDepartmentId = identity.anchorDepartmentId
  identityEditor.anchorPortfolioOrgId = identity.anchorPortfolioOrgId
  identityEditor.titleAtIdentity = identity.titleAtIdentity ?? ''
  identityEditor.validFrom = identity.validFrom
  identityEditor.validTo = identity.validTo
  identityVisible.value = true
}

async function submitIdentity() {
  const teacherUserId = identityEditor.teacherUserId
  if (!teacherUserId) {
    showFormValidationMessage('教师身份上下文已失效，请重新打开')
    return
  }
  if (
    identityEditor.validFrom
    && identityEditor.validTo
    && identityEditor.validFrom > identityEditor.validTo
  ) {
    showFormValidationMessage('有效截止日期不能早于有效起始日期')
    return
  }
  const targetId = identityEditor.id || 'new'
  if (!assertCurrentTeacherArchiveWritable('保存教师身份')) return
  const operation = `identity:save:${targetId}`
  if (!beginOperation(operation)) return
  const request: PortfolioTeacherIdentitySaveRequest = {
    id: identityEditor.id,
    teacherUserId,
    identityType: identityEditor.identityType,
    identityStatus: identityEditor.identityStatus,
    appointmentNo: identityEditor.appointmentNo?.trim() || undefined,
    staffNo: identityEditor.staffNo?.trim() || undefined,
    displayName: identityEditor.displayName?.trim() || undefined,
    enterpriseName: identityEditor.enterpriseName?.trim() || undefined,
    anchorDepartmentId: identityEditor.anchorDepartmentId,
    anchorPortfolioOrgId: identityEditor.anchorPortfolioOrgId,
    titleAtIdentity: identityEditor.titleAtIdentity?.trim() || undefined,
    validFrom: identityEditor.validFrom,
    validTo: identityEditor.validTo,
  }
  try {
    await portfolioTeacherApi.saveIdentity(request)
    void message.success(identityMode.value === 'edit' ? '身份已更新' : '身份已保存')
    identityVisible.value = false
    await loadPage()
    if (detailVisible.value && detail.value?.userId === teacherUserId) {
      await reloadDetail()
      await loadIndustryMentorContribution(teacherUserId, detail.value?.identities)
    }
  } catch (error) {
    showUserError(error, '保存身份失败')
  } finally {
    endOperation(operation)
  }
}

function openTeacherIntake(userId: string) {
  router.push({
    path: '/portfolio/teacher/intake',
    query: { teacherId: userId },
  })
}

function openTeacherHome(userId: string) {
  router.push({
    path: '/portfolio/teacher/home',
    query: { teacherId: userId },
  })
}

function openTeacherArchive(userId: string) {
  router.push({
    path: '/portfolio/teacher/archive',
    query: { teacherId: userId },
  })
}

function openOneTable(userId: string) {
  router.push({
    path: '/portfolio/teacher/one-table',
    query: { teacherId: userId },
  })
}

const lifecycleChangeOptions = computed(() => {
  const status = lifecycleState.value?.lifecycleStatus ?? 'ACTIVE'
  return PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS.filter((item) =>
    item.from.includes(status),
  ).map((item) => ({ label: item.label, value: item.value }))
})

const lifecycleStatusLabel = computed(() => {
  const status = lifecycleState.value?.lifecycleStatus
  if (!status) {
    return '—'
  }
  return (
    lifecycleState.value?.lifecycleStatusLabel
    || PORTFOLIO_TEACHER_LIFECYCLE_STATUS_LABEL[status]
    || status
  )
})

/** 详情抽屉已加载的生命周期写禁预检；后端 assertArchiveWritable 仍是权威 */
function assertCurrentTeacherArchiveWritable(actionLabel: string): boolean {
  if (!lifecycleState.value?.archiveWriteForbidden) {
    return true
  }
  const status = lifecycleStatusLabel.value || '非在职'
  showFormValidationMessage(
    `教师生命周期为「${status}」，禁止档案填报与改写。历史档案只读可查。（${actionLabel}）`,
  )
  return false
}

async function loadTeacherLifecycle(userId: string, requestToken = detailRequestToken.value) {
  lifecycleState.value = null
  lifecycleLoadError.value = ''
  lifecycleChangeType.value = undefined
  lifecycleReason.value = ''
  try {
    const state = await portfolioTeacherLifecycleApi.get({ teacherUserId: userId })
    if (detailRequestToken.value !== requestToken) {
      return
    }
    lifecycleState.value = state
    const options = PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS.filter((item) =>
      item.from.includes(state.lifecycleStatus ?? 'ACTIVE'),
    )
    lifecycleChangeType.value = options[0]?.value
    const eventPage = await portfolioTeacherLifecycleApi.pageEvents({
      teacherUserId: userId,
      pageNum: 1,
      pageSize: 5,
    })
    if (detailRequestToken.value !== requestToken) {
      return
    }
    lifecycleEvents.value = eventPage?.list ?? []
  } catch (error) {
    if (detailRequestToken.value !== requestToken) {
      return
    }
    lifecycleLoadError.value = '生命周期状态加载失败'
    showUserError(error, '加载教师生命周期失败')
  }
}

async function applyLifecycleChange() {
  if (!detail.value?.userId || !lifecycleChangeType.value) {
    void message.warning('请选择生命周期变更类型')
    return
  }
  const operation = `lifecycle:apply:${detail.value.userId}`
  if (!beginOperation(operation)) {
    return
  }
  try {
    const next = await portfolioTeacherLifecycleApi.apply({
      teacherUserId: detail.value.userId,
      changeType: lifecycleChangeType.value,
      reasonText: lifecycleReason.value?.trim() || undefined,
    })
    lifecycleState.value = next
    const options = PORTFOLIO_TEACHER_LIFECYCLE_CHANGE_OPTIONS.filter((item) =>
      item.from.includes(next.lifecycleStatus ?? 'ACTIVE'),
    )
    lifecycleChangeType.value = options[0]?.value
    lifecycleReason.value = ''
    void message.success(`已更新为${next.lifecycleStatusLabel || next.lifecycleStatus}`)
    const eventPage = await portfolioTeacherLifecycleApi.pageEvents({
      teacherUserId: detail.value.userId,
      pageNum: 1,
      pageSize: 5,
    })
    lifecycleEvents.value = eventPage?.list ?? []
  } catch (error) {
    showUserError(error, '生命周期变更失败')
  } finally {
    endOperation(operation)
  }
}

async function exportTransferPackage() {
  if (!detail.value?.userId) {
    return
  }
  if (lifecycleState.value?.lifecycleStatus !== 'TRANSFER_FROZEN') {
    void message.warning('仅迁出冻结态可导出迁出数据包')
    return
  }
  const operation = `lifecycle:export:${detail.value.userId}`
  if (!beginOperation(operation)) {
    return
  }
  try {
    const result = await portfolioTeacherLifecycleApi.exportTransferPackage({
      teacherUserId: detail.value.userId,
    })
    lifecycleState.value = {
      teacherUserId: result.teacherUserId,
      lifecycleStatus: result.lifecycleStatus || 'TRANSFERRED',
      lifecycleStatusLabel: result.lifecycleStatusLabel,
      archiveWriteForbidden: true,
      evaluationHeld: true,
    }
    lifecycleChangeType.value = undefined
    if (result.fileNodeId) {
      await downloadPortfolioExcelExport({
        fileName: result.fileName || `teacher-transfer-${detail.value.userId}.zip`,
        fileNodeId: String(result.fileNodeId),
      })
    }
    void message.success(
      `迁出数据包已生成（正式档 ${result.officialRecordCount ?? 0} 条，附件 ${result.attachmentCount ?? 0}）`,
    )
  } catch (error) {
    showUserError(error, '导出迁出数据包失败')
  } finally {
    endOperation(operation)
  }
}

/** 上传迁入包时冻结目标教师与详情代际，禁止旧文件导入到后切换的教师。 */
async function importTransferPackageFromFile(event: Event): Promise<void> {
  if (!detail.value?.userId) {
    return
  }
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  const input = event.target
  const file = input.files?.[0]
  if (!file) {
    return
  }
  const targetTeacherUserId = detail.value.userId
  const detailGeneration = detailRequestToken.value
  if (!assertCurrentTeacherArchiveWritable('导入迁出包')) {
    input.value = ''
    return
  }
  const operation = `lifecycle:import:${targetTeacherUserId}`
  if (!beginOperation(operation)) {
    input.value = ''
    return
  }
  try {
    const uploaded = await stageBusinessFile(FileUploadSceneKey.PORTFOLIO_MATERIAL, file)
    if (
      detailRequestToken.value !== detailGeneration
      || detail.value?.userId !== targetTeacherUserId
    ) {
      return
    }
    const result = await portfolioTeacherLifecycleApi.importTransferPackage({
      targetTeacherUserId,
      fileNodeId: uploaded.id,
    })
    void message.success(
      result.idempotentHit
        ? `迁出数据包已导入过（正式档 ${result.officialRecordCount ?? 0} 条）`
        : `迁出数据包导入成功（正式档 ${result.officialRecordCount ?? 0} 条，材料 ${result.materialCount ?? 0} 条）`,
    )
  } catch (error) {
    showUserError(error, '导入迁出数据包失败')
  } finally {
    endOperation(operation)
    input.value = ''
  }
}

async function exportRoster() {
  const operation = 'roster:export'
  if (!beginOperation(operation)) return
  const request = { ...query }
  try {
    const result = await portfolioTeacherApi.exportRoster(request)
    await downloadPortfolioExcelExport(result)
    void message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出教师名册失败')
  } finally {
    endOperation(operation)
  }
}

/**
 * PF-P0-281 / US-MI：生命周期站内信 jumpUrl 携带 teacherUserId 时打开对应教师详情，禁止只落到名册首页。
 */
async function applyTeacherUserIdDeepLink() {
  const teacherUserId = readRouteStringParam(route.query.teacherUserId)
  if (!teacherUserId) {
    return
  }
  const matched = list.value.find((row) => row.userId === teacherUserId)
  if (matched) {
    await openDetail(matched)
    return
  }
  await openDetail({ userId: teacherUserId } as PortfolioTeacherSummaryVO)
}

onMounted(async () => {
  await loadTree(false)
  const routeLevel = readCompletenessLevelParam(route.query.completenessLevel)
  if (routeLevel) {
    filterForm.completenessLevel = routeLevel
    query.completenessLevel = routeLevel
  }
  await loadPage()
  await applyTeacherUserIdDeepLink()
})

watch(
  () => route.query.teacherUserId,
  (teacherUserId, previousTeacherUserId) => {
    if (teacherUserId === previousTeacherUserId) {
      return
    }
    if (typeof teacherUserId === 'string' && teacherUserId) {
      void applyTeacherUserIdDeepLink()
    }
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="教师名册" />
    </template>
    <UiFilterBar
      variant="plain"
      v-model="filterModel"
      :fields="filterFields"
      @search="handleSearch"
    />
    <UiCard>
      <div class="list-toolbar">
        <UiButton
          size="sm"
          variant="primary"
          :loading="exporting"
          :disabled="interactionLocked"
          @click="exportRoster"
        >
          导出名册
        </UiButton>
      </div>
      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        pagination-mode="server"
        :columns="listColumns"
        :data-source="list"
        :loading="loading"
        :load-error="loadError"
        :total="total"
        row-key="userId"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'primaryIdentityType'">
            <UiTag v-if="record.primaryIdentityType" tone="blue">
              {{ identityTypeLabel(record.primaryIdentityType) }}
            </UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityTags'">
            <UiTag
              v-for="tag in record.identityTags ?? []"
              :key="tag"
              tone="gray"
              style="margin-right: 4px"
            >
              {{ identityTypeLabel(tag) }}
            </UiTag>
            <span v-if="!record.identityTags?.length">—</span>
          </template>
          <template v-else-if="column.key === 'completenessPercent'">
            {{ completenessRowLabel(record) }}
          </template>
          <template v-else-if="column.key === 'courseArchiveFramework'">
            {{ courseArchiveRowLabel(record) }}
          </template>
          <template v-else-if="column.key === 'userStatus'">
            <span v-if="record.status">
              {{ getUserStatusLabel(record.status) }}
            </span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'lifecycleStatus'">
            <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
              {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
            </UiTag>
            <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
            <span v-else-if="!record.lifecycleStatus">—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
            />
          </template>
          <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
            <span>{{
              record.countsInCurrentFacultyStructure === true
                ? '是'
                : record.countsInCurrentFacultyStructure === false
                  ? '否'
                  : '—'
            }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildTeacherDirectoryRowActions(record)"
              split
              @action="(key) => handleTeacherDirectoryAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <UiDrawer
      v-model:open="detailVisible"
      title="教师详情"
      width="640"
      hide-footer
      :closable="!interactionLocked"
      :mask-closable="!interactionLocked"
      @close="resetDetailContext"
    >
      <template v-if="detail">
        <UiDescriptions :column="2" size="small" bordered>
          <UiDescriptionsItem label="工号">
            {{ detail.teacherNumber ?? '—' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="姓名">
            {{ detail.nickName }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="账号">
            {{ detail.userName ?? '—' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="院系">
            {{ detail.departmentName ?? '—' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="职称">
            {{ detail.title ?? '—' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="手机">
            {{ detail.mobile ?? '—' }}
          </UiDescriptionsItem>
          <UiDescriptionsItem label="邮箱" :span="2">
            {{ detail.email ?? '—' }}
          </UiDescriptionsItem>
        </UiDescriptions>
        <UiDescriptions
          v-if="salarySummary || librarySummary"
          :column="1"
          size="small"
          bordered
          style="margin-top: 16px"
        >
          <UiDescriptionsItem v-if="salarySummary" label="工资摘要">
            {{ salarySummary }}
          </UiDescriptionsItem>
          <UiDescriptionsItem v-if="librarySummary" label="图书借阅">
            {{ librarySummary }}
          </UiDescriptionsItem>
        </UiDescriptions>
        <p v-if="extensionLoadError" class="teacher-directory__extension-error">
          工资与借阅摘要加载失败，主档案信息不受影响。
        </p>

        <div class="teacher-directory__lifecycle">
          <h4>生命周期管理</h4>
          <p v-if="lifecycleLoadError" class="teacher-directory__extension-error">
            {{ lifecycleLoadError }}
          </p>
          <UiDescriptions v-else :column="2" size="small" bordered>
            <UiDescriptionsItem label="当前状态">
              {{ lifecycleStatusLabel }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="最近变更">
              {{ lifecycleState?.changeTypeLabel || lifecycleState?.changeType || '—' }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="档案写禁">
              {{ lifecycleState?.archiveWriteForbidden ? '是' : '否' }}
            </UiDescriptionsItem>
            <UiDescriptionsItem label="评价 hold">
              {{ lifecycleState?.evaluationHeld ? '是' : '否' }}
            </UiDescriptionsItem>
            <UiDescriptionsItem v-if="lifecycleState?.reasonText" label="原因" :span="2">
              {{ lifecycleState.reasonText }}
            </UiDescriptionsItem>
          </UiDescriptions>
          <div class="teacher-directory__lifecycle-actions">
            <UiSelect
              v-model="lifecycleChangeType"
              size="sm"
              placeholder="选择变更类型"
              :options="lifecycleChangeOptions"
              :disabled="interactionLocked || !lifecycleChangeOptions.length"
              style="min-width: 200px"
            />
            <UiInput
              v-model="lifecycleReason"
              size="sm"
              placeholder="变更原因（可选）"
              :disabled="interactionLocked || !lifecycleChangeOptions.length"
              style="flex: 1"
            />
            <UiButton
              size="sm"
              variant="primary"
              :disabled="interactionLocked || !lifecycleChangeType"
              :loading="operationKey.startsWith('lifecycle:apply:')"
              @click="applyLifecycleChange"
            >
              应用变更
            </UiButton>
            <UiButton
              v-if="lifecycleState?.lifecycleStatus === 'TRANSFER_FROZEN'"
              size="sm"
              :disabled="interactionLocked"
              :loading="operationKey.startsWith('lifecycle:export:')"
              @click="exportTransferPackage"
            >
              导出迁出数据包
            </UiButton>
            <label class="teacher-directory__import-transfer">
              <span class="teacher-directory__import-transfer-btn">
                <UiButton
                  variant="primary"
                  size="sm"
                  :disabled="interactionLocked"
                  :loading="operationKey.startsWith('lifecycle:import:')"
                >
                  导入迁出数据包
                </UiButton>
              </span>
              <input
                class="teacher-directory__import-transfer-input"
                type="file"
                accept=".zip,application/zip"
                :disabled="interactionLocked || operationKey.startsWith('lifecycle:import:')"
                @change="importTransferPackageFromFile"
              />
            </label>
          </div>
          <div v-if="lifecycleEvents.length" class="teacher-directory__lifecycle-events">
            <h5>最近变更事件</h5>
            <ul>
              <li v-for="item in lifecycleEvents" :key="String(item.id)">
                {{ item.changeTypeLabel || item.changeType }}：
                {{ item.fromStatusLabel || item.fromStatus || '—' }}
                → {{ item.toStatusLabel || item.toStatus }}
                <span v-if="item.effectiveTime">（{{ item.effectiveTime }}）</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="teacher-directory__affiliation">
          <h4>工号与组织归属血缘</h4>
          <p v-if="affiliationLoadError" class="teacher-directory__muted">
            {{ affiliationLoadError }}
          </p>
          <ul v-else-if="affiliationHistory.length" class="teacher-directory__affiliation-list">
            <li
              v-for="row in affiliationHistory"
              :key="row.id || `${row.effectiveFrom}-${row.changeType}`"
            >
              <strong>{{ row.changeTypeLabel || row.changeType }}</strong>
              <span v-if="row.openSegment"> · 当前</span>
              <span v-if="row.staffNo"> · 工号 {{ row.staffNo }}</span>
              <span v-if="row.appointmentNo"> · 聘任 {{ row.appointmentNo }}</span>
              <span v-if="row.identityTypeLabel"> · {{ row.identityTypeLabel }}</span>
              <div class="teacher-directory__muted">
                {{ row.effectiveFrom || '-' }}
                <template v-if="row.effectiveTo"> → {{ row.effectiveTo }}</template>
                <template v-else> 起</template>
                <template v-if="row.reasonText"> · {{ row.reasonText }}</template>
              </div>
            </li>
          </ul>
          <p v-else class="teacher-directory__muted">暂无归属血缘记录</p>
        </div>

        <div class="teacher-directory__identity-header">
          <h4>扩展身份</h4>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="interactionLocked"
            @click="
              openIdentityCreate({
                userId: detail.userId,
                nickName: detail.nickName,
                departmentId: detail.departmentId,
              })
            "
          >
            新增身份
          </UiButton>
        </div>
        <div
          v-if="industryMentorContribution || industryMentorContributionError"
          class="teacher-directory__contribution"
        >
          <h5>§8.42 产业导师贡献度</h5>
          <p v-if="industryMentorContributionError" class="teacher-directory__muted">
            {{ industryMentorContributionError }}
          </p>
          <template v-else-if="industryMentorContribution">
            <p>
              综合 {{ industryMentorContribution.contributionScore }} · 聘任
              {{ industryMentorContribution.appointmentValidityScore }} · 教学
              {{ industryMentorContribution.teachingParticipationScore }} · 实践
              {{ industryMentorContribution.practiceGuidanceScore }} · 成果
              {{ industryMentorContribution.industryOutcomeScore }} · 考核
              {{ industryMentorContribution.assessmentScore }}
            </p>
            <p class="teacher-directory__muted">{{ industryMentorContribution.formulaLabel }}</p>
            <ul v-if="industryMentorContribution.evidenceNotes?.length">
              <li v-for="(note, idx) in industryMentorContribution.evidenceNotes" :key="idx">
                {{ note }}
              </li>
            </ul>
          </template>
        </div>
        <UiDataTable
          pagination-mode="none"
          :columns="identityColumns"
          :data-source="detail.identities"
          row-key="id"
          :show-pagination="false"
          :sticky-header="false"
          flat
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'identityType'">
              {{ identityTypeLabel(record.identityType) }}
            </template>
            <template v-else-if="column.key === 'identityStatus'">
              <UiTag
                :tone="
                  record.identityStatus === PortfolioTeacherIdentityStatusCode.ACTIVE
                    ? 'green'
                    : 'gray'
                "
              >
                {{ identityStatusLabel(record.identityStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="[
                  {
                    key: 'edit',
                    label: '编辑',
                    disabled: interactionLocked || Boolean(lifecycleState?.archiveWriteForbidden),
                  },
                ]"
                split
                @action="() => openIdentityEdit(record)"
              />
            </template>
          </template>
          <template #empty>
            <UiEmpty size="sm" description="暂无扩展身份" />
          </template>
        </UiDataTable>
      </template>
    </UiDrawer>
    <UiDialog
      v-model:open="identityVisible"
      :title="identityMode === 'edit' ? '编辑教师身份' : '新增教师身份'"
      :confirm-loading="operationKey.startsWith('identity:save:')"
      :closable="!writing"
      :mask-closable="!writing"
      @ok="submitIdentity"
    >
      <UiForm layout="vertical">
        <UiFormItem label="身份类型" required>
          <UiSelect
            v-model="identityEditor.identityType"
            size="sm"
            :options="PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="身份状态" required>
          <UiSelect
            v-model="identityEditor.identityStatus"
            size="sm"
            :options="PORTFOLIO_TEACHER_IDENTITY_STATUS_OPTIONS"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="聘任编号">
          <UiInput size="sm" v-model="identityEditor.appointmentNo" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="当前工号">
          <UiInput
            size="sm"
            v-model="identityEditor.staffNo"
            :disabled="writing"
            placeholder="校内工号；变更将写入归属血缘"
          />
        </UiFormItem>
        <UiFormItem label="展示名称">
          <UiInput size="sm" v-model="identityEditor.displayName" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="企业/单位">
          <UiInput size="sm" v-model="identityEditor.enterpriseName" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="归属院系">
          <UiSelect
            v-model="identityEditor.anchorDepartmentId"
            size="sm"
            allow-clear
            :options="departmentOptions()"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="归属扩展组织编号">
          <UiSelect
            v-model="identityEditor.anchorPortfolioOrgId"
            size="sm"
            allow-clear
            :options="portfolioOrgOptions()"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="该身份下职称/职务">
          <UiInput size="sm" v-model="identityEditor.titleAtIdentity" :disabled="writing" />
        </UiFormItem>
        <UiFormItem label="有效起始">
          <UiInput
            size="sm"
            v-model="identityEditor.validFrom"
            placeholder="年-月-日，例如 2026-07-16"
            :disabled="writing"
          />
        </UiFormItem>
        <UiFormItem label="有效截止">
          <UiInput
            size="sm"
            v-model="identityEditor.validTo"
            placeholder="年-月-日，例如 2026-07-16"
            :disabled="writing"
          />
        </UiFormItem>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.list-toolbar {
  margin-bottom: 12px;
}
.teacher-directory__identity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 8px;

  h4 {
    margin: 0;
    font-size: var(--dp-font-size-lg);
    font-weight: 600;
  }
}
.teacher-directory__extension-error {
  margin: 12px 0 0;
  color: var(--dp-error);
  font-size: var(--dp-font-size-sm);
}
.teacher-directory__lifecycle {
  margin-top: 16px;
  h4 {
    margin: 0 0 8px;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }
}
.teacher-directory__lifecycle-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
}
.teacher-directory__lifecycle-events {
  margin-top: 12px;
  h5 {
    margin: 0 0 6px;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
  }
  ul {
    margin: 0;
    padding-left: 18px;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
  }
}

.teacher-directory__import-transfer {
  position: relative;
  display: inline-flex;
  cursor: pointer;
}
.teacher-directory__import-transfer-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.teacher-directory__import-transfer-input:disabled {
  cursor: not-allowed;
}
.teacher-directory__affiliation {
  margin-top: 16px;
  h4 {
    margin: 0 0 8px;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }
}
.teacher-directory__affiliation-list {
  margin: 0;
  padding-left: 18px;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
}
.teacher-directory__contribution {
  margin: 0 0 12px;
  padding: 8px 12px;
  border: 1px solid var(--dp-border);
  border-radius: 6px;
  background: var(--dp-bg-subtle, #fafafa);
  h5 {
    margin: 0 0 6px;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
  }
  p {
    margin: 0 0 4px;
    font-size: var(--dp-font-size-xs);
  }
  ul {
    margin: 4px 0 0;
    padding-left: 18px;
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
  }
}
.teacher-directory__muted {
  margin: 0;
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}
</style>
