<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioConflictTicketVO,
  PortfolioCourseCodeMapVO,
  PortfolioIdentityUnmatchedVO,
  PortfolioIntegrationCleanLogVO,
  PortfolioIntegrationDatasourceVO,
  PortfolioIntegrationDictEntryVO,
  PortfolioIntegrationFieldMappingVO,
  PortfolioIntegrationHealthDashboardVO,
  PortfolioIntegrationMessageInboxVO,
  PortfolioIntegrationSyncTaskVO,
} from '@/apis/portfolio/integration'
import { portfolioIntegrationApi } from '@/apis/portfolio/integration'
import type {
  PortfolioArchiveCategoryTreeNodeVO,
  PortfolioTargetFieldDefinition,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { portfolioTeacherSelectOptionsFromSummaries } from '@/utils/portfolio-teacher-display'

const IDENTITY_HINT_MISSING_TEACHER_NUMBER = '缺少工号'

const activeTab = ref('datasource')
const tabItems = [
  { key: 'datasource', label: '数据源' },
  { key: 'mapping', label: '字段映射' },
  { key: 'course-map', label: '课程编码' },
  { key: 'dictionary', label: '字段字典' },
  { key: 'sync', label: '同步日志' },
  { key: 'clean-log', label: '清洗日志' },
  { key: 'queue', label: '待匹配/冲突' },
  { key: 'failed-message', label: '异常消息' },
  { key: 'health', label: '渠道健康' },
]

const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))
const loadState = reactive({
  datasources: false,
  mappings: false,
  syncTasks: false,
  unmatched: false,
  conflicts: false,
  failedMessages: false,
  cleanLogs: false,
  courseCodeMaps: false,
  dictEntries: false,
  health: false,
})
const loadError = reactive({
  datasources: '',
  mappings: '',
  syncTasks: '',
  unmatched: '',
  conflicts: '',
  failedMessages: '',
  cleanLogs: '',
  courseCodeMaps: '',
  dictEntries: '',
  health: '',
})
const requestToken = reactive({
  archiveCategories: 0,
  archiveFields: 0,
  teachers: 0,
  datasources: 0,
  mappings: 0,
  syncTasks: 0,
  unmatched: 0,
  conflicts: 0,
  failedMessages: 0,
  cleanLogs: 0,
  courseCodeMaps: 0,
  dictEntries: 0,
  health: 0,
})
const datasources = ref<PortfolioIntegrationDatasourceVO[]>([])
const mappings = ref<PortfolioIntegrationFieldMappingVO[]>([])
const archiveCategories = ref<PortfolioArchiveCategoryTreeNodeVO[]>([])
const archiveFields = ref<PortfolioTargetFieldDefinition[]>([])
const syncTasks = ref<PortfolioIntegrationSyncTaskVO[]>([])
const unmatched = ref<PortfolioIdentityUnmatchedVO[]>([])
const conflicts = ref<PortfolioConflictTicketVO[]>([])
const failedMessages = ref<PortfolioIntegrationMessageInboxVO[]>([])
const cleanLogs = ref<PortfolioIntegrationCleanLogVO[]>([])
const courseCodeMaps = ref<PortfolioCourseCodeMapVO[]>([])
const dictEntries = ref<PortfolioIntegrationDictEntryVO[]>([])
const health = ref<PortfolioIntegrationHealthDashboardVO | null>(null)
const datasourceTotal = ref(0)
const syncTaskTotal = ref(0)
const unmatchedTotal = ref(0)
const conflictTotal = ref(0)
const failedMessageTotal = ref(0)
const cleanLogTotal = ref(0)
const courseCodeMapTotal = ref(0)
const dictEntryTotal = ref(0)

const selectedDatasourceId = ref('')
const datasourceQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const syncTaskQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const unmatchedQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const conflictQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const failedMessageQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const cleanLogQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const courseCodeMapQuery = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  sourceSystemCode: '',
  keyword: '',
})
const dictEntryQuery = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  dictionaryCode: '',
})
const dsForm = reactive({
  channelCode: 'HR_PERSONNEL',
  pathwayCode: 'OPENAPI',
  datasourceName: 'edu-user 人事主数据',
  connectionConfigJson: '',
})

const datasourceChannelOptions = [
  { value: 'HR_PERSONNEL', label: '人事系统' },
  { value: 'TEACHING_AFFAIRS', label: '教务系统' },
  { value: 'TEACHING_EVALUATION', label: '评教系统' },
  { value: 'SCIENTIFIC_RESEARCH', label: '科研系统' },
  { value: 'TRAINING_CLOUD', label: '培训云' },
  { value: 'STUDENT_AFFAIRS', label: '学工系统' },
  { value: 'FINANCE_SUMMARY', label: '财务摘要' },
  { value: 'NATIONAL_TEACHER_SYSTEM', label: '全国教师系统' },
]

const datasourcePathwayOptions = computed(() => {
  if (dsForm.channelCode === 'HR_PERSONNEL' || dsForm.channelCode === 'NATIONAL_TEACHER_SYSTEM') {
    return [{ value: 'OPENAPI', label: 'OpenAPI/REST' }]
  }
  return [
    { value: 'JDBC', label: '中间库 JDBC' },
    { value: 'EXCEL_IMPORT', label: 'Excel/CSV 导入' },
    { value: 'MESSAGE_PUSH', label: '消息推送' },
    { value: 'SOAP', label: 'Web Service (SOAP)' },
  ]
})

function changeDatasourceChannel(value: SelectValue) {
  const channelCode = typeof value === 'string' ? value : String(value ?? '')
  dsForm.channelCode = channelCode
  dsForm.pathwayCode =
    channelCode === 'HR_PERSONNEL' || channelCode === 'NATIONAL_TEACHER_SYSTEM' ? 'OPENAPI' : 'JDBC'
}

function applyNationalTeacherPreset(direction: 'OUTBOUND' | 'INBOUND') {
  dsForm.channelCode = 'NATIONAL_TEACHER_SYSTEM'
  dsForm.pathwayCode = 'OPENAPI'
  dsForm.datasourceName = direction === 'OUTBOUND' ? '全国教师系统上报' : '全国教师系统回流'
  dsForm.connectionConfigJson =
    direction === 'OUTBOUND'
      ? JSON.stringify({ syncDirection: 'OUTBOUND' })
      : JSON.stringify({ syncDirection: 'INBOUND', inboundRecords: [] })
}
const mappingForm = reactive({
  sourceFieldCode: '',
  targetFieldCode: '',
  targetCategoryCode: '',
  dictionaryCode: '',
  transformType: 'NONE',
  transformExpr: '',
})
const mappingTransformOptions = [
  { value: 'NONE', label: '无转换' },
  { value: 'TRIM', label: '去首尾空白' },
  { value: 'UPPER', label: '转大写' },
  { value: 'LOWER', label: '转小写' },
  { value: 'SUBSTRING', label: '截取子串' },
  { value: 'PREFIX_SUFFIX', label: '前后缀拼接' },
  { value: 'LOOKUP_COURSE_CODE', label: '课程编码归一化' },
]
const mappingTransformExprPlaceholder = computed(() => {
  if (mappingForm.transformType === 'SUBSTRING') return 'start,end，例如 0,8'
  if (mappingForm.transformType === 'PREFIX_SUFFIX') return 'prefix|suffix，例如 CN-|-2026'
  if (mappingForm.transformType === 'LOOKUP_COURSE_CODE') return '来源系统编码；留空使用数据源渠道'
  return ''
})
const courseCodeMapForm = reactive({
  id: '',
  sourceSystemCode: '',
  sourceCourseCode: '',
  sourceCourseName: '',
  canonicalCourseCode: '',
  canonicalCourseName: '',
  enabled: true,
  remark: '',
})
const dictEntryForm = reactive({
  id: '',
  dictionaryCode: '',
  sourceValue: '',
  targetValue: '',
  enabled: true,
  remark: '',
})
const failedMessageDatasourceId = ref('')
const cleanLogDatasourceId = ref('')
const failedMessageDrawerOpen = ref(false)
const selectedFailedMessage = ref<PortfolioIntegrationMessageInboxVO | null>(null)
const correctedPayloadJson = ref('')
const requeueMessage = ref('管理员修正载荷后重入队')

const datasourceOptions = computed(() =>
  datasources.value.map((item) => ({ value: item.id, label: item.datasourceName })),
)
const messageDatasourceOptions = computed(() =>
  datasources.value
    .filter((item) => item.pathwayCode === 'MESSAGE_PUSH')
    .map((item) => ({ value: item.id, label: item.datasourceName })),
)

const archiveCategoryOptions = computed(() =>
  flattenArchiveCategories(archiveCategories.value)
    .filter((item) => Boolean(item.publishedVersionId))
    .map((item) => ({ value: item.categoryCode, label: item.categoryName, categoryId: item.id })),
)

const archiveFieldOptions = computed(() =>
  archiveFields.value.map((item) => ({
    value: item.fieldCode,
    label: item.fieldLabel ? `${item.fieldLabel} (${item.fieldCode})` : item.fieldCode,
  })),
)

const dsColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 160 },
  { title: '通路', dataIndex: 'pathwayCode', key: 'pathwayCode', width: 120 },
  { title: '名称', dataIndex: 'datasourceName', key: 'datasourceName' },
  { title: '状态', key: 'enabled', width: 90 },
  { title: '最近同步', dataIndex: 'lastSyncTime', key: 'lastSyncTime', width: 170 },
  { title: '操作', key: 'actions', width: 120 },
]

const mappingColumns: ColumnsType = [
  { title: '源字段', dataIndex: 'sourceFieldCode', key: 'sourceFieldCode', width: 160 },
  { title: '目标字段', dataIndex: 'targetFieldCode', key: 'targetFieldCode', width: 160 },
  { title: '目标分类', dataIndex: 'targetCategoryCode', key: 'targetCategoryCode', width: 140 },
  { title: '字典', dataIndex: 'dictionaryCode', key: 'dictionaryCode', width: 120 },
  { title: '转换', dataIndex: 'transformType', key: 'transformType', width: 140 },
  { title: '转换表达式', dataIndex: 'transformExpr', key: 'transformExpr', width: 180 },
  { title: '状态', key: 'enabled', width: 90 },
]

const syncColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 140 },
  { title: '状态', dataIndex: 'taskStatus', key: 'taskStatus', width: 120 },
  { title: '成功', dataIndex: 'successCount', key: 'successCount', width: 80 },
  { title: '失败', dataIndex: 'failedCount', key: 'failedCount', width: 80 },
  { title: '跳过', dataIndex: 'skippedCount', key: 'skippedCount', width: 80 },
  { title: '开始时间', dataIndex: 'startedTime', key: 'startedTime', width: 170 },
  { title: '摘要', dataIndex: 'errorSummary', key: 'errorSummary', ellipsis: true },
]

const unmatchedColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 140 },
  { title: '外部工号', dataIndex: 'externalTeacherCode', key: 'externalTeacherCode', width: 140 },
  { title: '外部姓名', dataIndex: 'externalName', key: 'externalName', width: 120 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 200 },
]

const conflictColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 120 },
  { title: '字段', dataIndex: 'fieldCode', key: 'fieldCode', width: 120 },
  { title: '教师', dataIndex: 'teacherId', key: 'teacherId', width: 120 },
  { title: '外部值', dataIndex: 'externalValue', key: 'externalValue', ellipsis: true },
  { title: '本地值', dataIndex: 'localValue', key: 'localValue', ellipsis: true },
  { title: '状态', dataIndex: 'ticketStatus', key: 'ticketStatus', width: 120 },
  { title: '操作', key: 'actions', width: 280 },
]

const failedMessageColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 130 },
  { title: '消息键', dataIndex: 'messageKey', key: 'messageKey', width: 210, ellipsis: true },
  { title: '重试次数', dataIndex: 'retryCount', key: 'retryCount', width: 90 },
  { title: '失败原因', dataIndex: 'processMessage', key: 'processMessage', ellipsis: true },
  { title: '失败时间', dataIndex: 'processedTime', key: 'processedTime', width: 170 },
  { title: '操作', key: 'actions', width: 190, fixed: 'right' },
]

const cleanLogColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 130 },
  { title: '源字段', dataIndex: 'sourceFieldCode', key: 'sourceFieldCode', width: 140 },
  { title: '目标字段', dataIndex: 'targetFieldCode', key: 'targetFieldCode', width: 140 },
  { title: '转换', dataIndex: 'transformType', key: 'transformType', width: 120 },
  { title: '原始值', dataIndex: 'rawValue', key: 'rawValue', ellipsis: true },
  { title: '清洗值', dataIndex: 'cleanedValue', key: 'cleanedValue', ellipsis: true },
  { title: '说明', dataIndex: 'detailMessage', key: 'detailMessage', ellipsis: true },
  { title: '时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
]

const courseCodeMapColumns: ColumnsType = [
  { title: '来源系统', dataIndex: 'sourceSystemCode', key: 'sourceSystemCode', width: 140 },
  { title: '源课程', key: 'sourceCourse', width: 220 },
  { title: '规范课程', key: 'canonicalCourse', width: 220 },
  { title: '状态', key: 'enabled', width: 90 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

const dictEntryColumns: ColumnsType = [
  { title: '字典编码', dataIndex: 'dictionaryCode', key: 'dictionaryCode', width: 160 },
  { title: '源值', dataIndex: 'sourceValue', key: 'sourceValue', width: 180 },
  { title: '规范值', dataIndex: 'targetValue', key: 'targetValue', width: 180 },
  { title: '状态', key: 'enabled', width: 90 },
  { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
  { title: '操作', key: 'actions', width: 140, fixed: 'right' },
]

const identityResolveTeacherId = ref('')
const identityResolveTeacherNumber = ref('')
const identityResolveRowId = ref('')
const teachers = ref<PortfolioTeacherSummaryVO[]>([])

const teacherOptions = computed(() => portfolioTeacherSelectOptionsFromSummaries(teachers.value))
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null

/** 集成配置写操作必须串行，避免同一数据源或治理记录被并发改写。 */
function beginOperation(key: string): boolean {
  if (writing.value) {
    return false
  }
  operationKey.value = key
  return true
}

function endOperation(key: string) {
  if (operationKey.value === key) {
    operationKey.value = ''
  }
}

function needsTeacherNumber(row: PortfolioIdentityUnmatchedVO): boolean {
  return Boolean(row.matchHintsJson?.includes(IDENTITY_HINT_MISSING_TEACHER_NUMBER))
}

function mergeTeacherOptions(rows: PortfolioTeacherSummaryVO[]) {
  const optionMap = new Map(teachers.value.map((item) => [item.userId, item]))
  for (const row of rows) {
    optionMap.set(row.userId, row)
  }
  teachers.value = Array.from(optionMap.values())
}

function flattenArchiveCategories(
  rows: PortfolioArchiveCategoryTreeNodeVO[],
): PortfolioArchiveCategoryTreeNodeVO[] {
  const result: PortfolioArchiveCategoryTreeNodeVO[] = []
  for (const row of rows) {
    result.push(row)
    if (row.children?.length) {
      result.push(...flattenArchiveCategories(row.children))
    }
  }
  return result
}

async function loadArchiveCategories() {
  const currentToken = ++requestToken.archiveCategories
  try {
    const rows = await portfolioArchiveTemplateApi.listCategoryTree()
    if (requestToken.archiveCategories !== currentToken) return
    archiveCategories.value = rows
  } catch (error) {
    if (requestToken.archiveCategories !== currentToken) return
    archiveCategories.value = []
    showUserError(error, '加载档案分类失败')
  }
}

async function changeMappingCategory(value: SelectValue) {
  const currentToken = ++requestToken.archiveFields
  const categoryCode = typeof value === 'string' ? value : value == null ? undefined : String(value)
  mappingForm.targetCategoryCode = categoryCode || ''
  archiveFields.value = []
  mappingForm.targetFieldCode = ''
  if (!categoryCode) {
    return
  }
  const category = archiveCategoryOptions.value.find((item) => item.value === categoryCode)
  if (!category) {
    return
  }
  try {
    const published = await portfolioArchiveTemplateApi.listPublishedFields({
      categoryId: category.categoryId,
    })
    if (
      requestToken.archiveFields !== currentToken ||
      mappingForm.targetCategoryCode !== categoryCode
    )
      return
    archiveFields.value = published.targetFields
  } catch (error) {
    if (requestToken.archiveFields !== currentToken) return
    archiveFields.value = []
    showUserError(error, '加载已发布档案字段失败')
  }
}

async function loadTeachers(keyword?: string) {
  const currentToken = ++requestToken.teachers
  const searchText = keyword?.trim() || undefined
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText,
    })
    if (requestToken.teachers !== currentToken) return
    mergeTeacherOptions(page.list ?? [])
  } catch (error) {
    if (requestToken.teachers !== currentToken) return
    showUserError(error, '加载教师名册失败')
  }
}

function handleTeacherSearch(value: string) {
  if (teacherSearchTimer) {
    clearTimeout(teacherSearchTimer)
  }
  teacherSearchTimer = setTimeout(() => {
    void loadTeachers(value.trim())
  }, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

async function loadDatasources() {
  const currentToken = ++requestToken.datasources
  const request = { pageNum: datasourceQuery.pageNum, pageSize: datasourceQuery.pageSize }
  loadState.datasources = true
  loadError.datasources = ''
  try {
    const res = await portfolioIntegrationApi.pageDatasource(request)
    if (requestToken.datasources !== currentToken) return
    datasources.value = res.list ?? []
    datasourceTotal.value = res.total ?? 0
    if (
      selectedDatasourceId.value &&
      !datasources.value.some((item) => item.id === selectedDatasourceId.value)
    ) {
      selectedDatasourceId.value = ''
      mappings.value = []
      requestToken.mappings++
    }
  } catch (error) {
    if (requestToken.datasources !== currentToken) return
    datasources.value = []
    datasourceTotal.value = 0
    selectedDatasourceId.value = ''
    mappings.value = []
    requestToken.mappings++
    loadError.datasources = '数据源加载失败，请重试'
    showUserError(error, '加载数据源失败')
  } finally {
    if (requestToken.datasources === currentToken) loadState.datasources = false
  }
}

async function loadMappings() {
  const datasourceConfigId = selectedDatasourceId.value
  const currentToken = ++requestToken.mappings
  if (!datasourceConfigId) {
    mappings.value = []
    loadError.mappings = ''
    return
  }
  loadState.mappings = true
  loadError.mappings = ''
  try {
    const rows = await portfolioIntegrationApi.listFieldMappings({
      datasourceConfigId,
    })
    if (requestToken.mappings !== currentToken || selectedDatasourceId.value !== datasourceConfigId)
      return
    mappings.value = rows
  } catch (error) {
    if (requestToken.mappings !== currentToken) return
    mappings.value = []
    loadError.mappings = '字段映射加载失败，请重试'
    showUserError(error, '加载字段映射失败')
  } finally {
    if (requestToken.mappings === currentToken) loadState.mappings = false
  }
}

async function loadSyncTasks() {
  const currentToken = ++requestToken.syncTasks
  const request = { pageNum: syncTaskQuery.pageNum, pageSize: syncTaskQuery.pageSize }
  loadState.syncTasks = true
  loadError.syncTasks = ''
  try {
    const res = await portfolioIntegrationApi.pageSyncLog(request)
    if (requestToken.syncTasks !== currentToken) return
    syncTasks.value = res.list ?? []
    syncTaskTotal.value = res.total ?? 0
  } catch (error) {
    if (requestToken.syncTasks !== currentToken) return
    syncTasks.value = []
    syncTaskTotal.value = 0
    loadError.syncTasks = '同步日志加载失败，请重试'
    showUserError(error, '加载同步日志失败')
  } finally {
    if (requestToken.syncTasks === currentToken) loadState.syncTasks = false
  }
}

async function loadUnmatched() {
  const currentToken = ++requestToken.unmatched
  const request = { pageNum: unmatchedQuery.pageNum, pageSize: unmatchedQuery.pageSize }
  loadState.unmatched = true
  loadError.unmatched = ''
  try {
    const res = await portfolioIntegrationApi.pageIdentityUnmatched(request)
    if (requestToken.unmatched !== currentToken) return
    unmatched.value = res.list ?? []
    unmatchedTotal.value = res.total ?? 0
    if (!unmatched.value.some((item) => item.id === identityResolveRowId.value)) {
      identityResolveRowId.value = ''
      identityResolveTeacherId.value = ''
      identityResolveTeacherNumber.value = ''
    }
  } catch (error) {
    if (requestToken.unmatched !== currentToken) return
    unmatched.value = []
    unmatchedTotal.value = 0
    identityResolveRowId.value = ''
    identityResolveTeacherId.value = ''
    identityResolveTeacherNumber.value = ''
    loadError.unmatched = '身份待匹配加载失败，请重试'
    showUserError(error, '加载身份待匹配失败')
  } finally {
    if (requestToken.unmatched === currentToken) loadState.unmatched = false
  }
}

async function loadConflicts() {
  const currentToken = ++requestToken.conflicts
  const request = { pageNum: conflictQuery.pageNum, pageSize: conflictQuery.pageSize }
  loadState.conflicts = true
  loadError.conflicts = ''
  try {
    const res = await portfolioIntegrationApi.pageConflict(request)
    if (requestToken.conflicts !== currentToken) return
    conflicts.value = res.list ?? []
    conflictTotal.value = res.total ?? 0
  } catch (error) {
    if (requestToken.conflicts !== currentToken) return
    conflicts.value = []
    conflictTotal.value = 0
    loadError.conflicts = '冲突单加载失败，请重试'
    showUserError(error, '加载冲突单失败')
  } finally {
    if (requestToken.conflicts === currentToken) loadState.conflicts = false
  }
}

async function loadHealth() {
  const currentToken = ++requestToken.health
  loadState.health = true
  loadError.health = ''
  try {
    const result = await portfolioIntegrationApi.healthDashboard()
    if (requestToken.health !== currentToken) return
    health.value = result
  } catch (error) {
    if (requestToken.health !== currentToken) return
    health.value = null
    loadError.health = '渠道健康加载失败，请重试'
    showUserError(error, '加载渠道健康失败')
  } finally {
    if (requestToken.health === currentToken) loadState.health = false
  }
}

async function loadFailedMessages() {
  const datasourceConfigId = failedMessageDatasourceId.value
  const currentToken = ++requestToken.failedMessages
  if (!datasourceConfigId) {
    failedMessages.value = []
    failedMessageTotal.value = 0
    loadError.failedMessages = ''
    return
  }
  const request = {
    pageNum: failedMessageQuery.pageNum,
    pageSize: failedMessageQuery.pageSize,
    datasourceConfigId,
  }
  loadState.failedMessages = true
  loadError.failedMessages = ''
  try {
    const result = await portfolioIntegrationApi.pageFailedMessages(request)
    if (
      requestToken.failedMessages !== currentToken ||
      failedMessageDatasourceId.value !== datasourceConfigId
    )
      return
    failedMessages.value = result.list ?? []
    failedMessageTotal.value = result.total ?? 0
  } catch (error) {
    if (requestToken.failedMessages !== currentToken) return
    failedMessages.value = []
    failedMessageTotal.value = 0
    loadError.failedMessages = '异常消息队列加载失败，请重试'
    showUserError(error, '加载异常消息队列失败')
  } finally {
    if (requestToken.failedMessages === currentToken) loadState.failedMessages = false
  }
}

async function loadCleanLogs() {
  const currentToken = ++requestToken.cleanLogs
  const request = {
    pageNum: cleanLogQuery.pageNum,
    pageSize: cleanLogQuery.pageSize,
    datasourceConfigId: cleanLogDatasourceId.value || undefined,
  }
  loadState.cleanLogs = true
  loadError.cleanLogs = ''
  try {
    const result = await portfolioIntegrationApi.pageCleanLog(request)
    if (requestToken.cleanLogs !== currentToken) return
    cleanLogs.value = result.list ?? []
    cleanLogTotal.value = result.total ?? 0
  } catch (error) {
    if (requestToken.cleanLogs !== currentToken) return
    cleanLogs.value = []
    cleanLogTotal.value = 0
    loadError.cleanLogs = '清洗日志加载失败，请重试'
    showUserError(error, '加载清洗日志失败')
  } finally {
    if (requestToken.cleanLogs === currentToken) loadState.cleanLogs = false
  }
}

async function loadCourseCodeMaps() {
  const currentToken = ++requestToken.courseCodeMaps
  const request = {
    pageNum: courseCodeMapQuery.pageNum,
    pageSize: courseCodeMapQuery.pageSize,
    sourceSystemCode: courseCodeMapQuery.sourceSystemCode.trim() || undefined,
    keyword: courseCodeMapQuery.keyword.trim() || undefined,
  }
  loadState.courseCodeMaps = true
  loadError.courseCodeMaps = ''
  try {
    const result = await portfolioIntegrationApi.pageCourseCodeMap(request)
    if (requestToken.courseCodeMaps !== currentToken) return
    courseCodeMaps.value = result.list ?? []
    courseCodeMapTotal.value = result.total ?? 0
  } catch (error) {
    if (requestToken.courseCodeMaps !== currentToken) return
    courseCodeMaps.value = []
    courseCodeMapTotal.value = 0
    loadError.courseCodeMaps = '课程编码对照加载失败，请重试'
    showUserError(error, '加载课程编码对照失败')
  } finally {
    if (requestToken.courseCodeMaps === currentToken) loadState.courseCodeMaps = false
  }
}

async function loadDictEntries() {
  const currentToken = ++requestToken.dictEntries
  const request = {
    pageNum: dictEntryQuery.pageNum,
    pageSize: dictEntryQuery.pageSize,
    dictionaryCode: dictEntryQuery.dictionaryCode.trim() || undefined,
  }
  loadState.dictEntries = true
  loadError.dictEntries = ''
  try {
    const result = await portfolioIntegrationApi.pageDictEntry(request)
    if (requestToken.dictEntries !== currentToken) return
    dictEntries.value = result.list ?? []
    dictEntryTotal.value = result.total ?? 0
  } catch (error) {
    if (requestToken.dictEntries !== currentToken) return
    dictEntries.value = []
    dictEntryTotal.value = 0
    loadError.dictEntries = '字段字典加载失败，请重试'
    showUserError(error, '加载字段字典失败')
  } finally {
    if (requestToken.dictEntries === currentToken) loadState.dictEntries = false
  }
}

async function saveDatasource() {
  const operation = 'datasource:save'
  if (!beginOperation(operation)) return
  const request = {
    channelCode: dsForm.channelCode,
    pathwayCode: dsForm.pathwayCode,
    datasourceName: dsForm.datasourceName.trim(),
    enabled: true,
    connectionConfigJson: dsForm.connectionConfigJson.trim() || undefined,
  }
  try {
    await portfolioIntegrationApi.saveDatasource(request)
    message.success('数据源已保存')
    datasourceQuery.pageNum = 1
    await loadDatasources()
  } catch (error) {
    showUserError(error)
  } finally {
    endOperation(operation)
  }
}

async function saveMapping() {
  const datasourceConfigId = selectedDatasourceId.value
  if (!datasourceConfigId) {
    message.warning('请先选择数据源')
    return
  }
  const operation = `mapping:save:${datasourceConfigId}`
  if (!beginOperation(operation)) return
  const request = {
    datasourceConfigId,
    sourceFieldCode: mappingForm.sourceFieldCode.trim(),
    targetFieldCode: mappingForm.targetFieldCode.trim(),
    targetCategoryCode: mappingForm.targetCategoryCode || undefined,
    dictionaryCode: mappingForm.dictionaryCode.trim() || undefined,
    transformType: mappingForm.transformType,
    transformExpr: mappingTransformExprPlaceholder.value
      ? mappingForm.transformExpr.trim() || undefined
      : undefined,
    enabled: true,
  }
  try {
    await portfolioIntegrationApi.saveFieldMapping(request)
    message.success('字段映射已保存')
    mappingForm.sourceFieldCode = ''
    mappingForm.targetFieldCode = ''
    mappingForm.targetCategoryCode = ''
    mappingForm.dictionaryCode = ''
    mappingForm.transformType = 'NONE'
    mappingForm.transformExpr = ''
    if (selectedDatasourceId.value === datasourceConfigId) await loadMappings()
  } catch (error) {
    showUserError(error)
  } finally {
    endOperation(operation)
  }
}

async function triggerSync(row: PortfolioIntegrationDatasourceVO) {
  const datasourceConfigId = row.id
  const operation = `sync:trigger:${datasourceConfigId}`
  if (!beginOperation(operation)) return
  try {
    await portfolioIntegrationApi.triggerSync({ datasourceConfigId })
    message.success('同步已触发')
    await Promise.all([
      loadSyncTasks(),
      loadDatasources(),
      loadHealth(),
      loadUnmatched(),
      loadConflicts(),
    ])
  } catch (error) {
    showUserError(error)
  } finally {
    endOperation(operation)
  }
}

async function resolveConflict(row: PortfolioConflictTicketVO, action: string) {
  const conflictTicketId = row.id
  const operation = `conflict:${conflictTicketId}:${action}`
  if (!beginOperation(operation)) return
  if (
    action === 'IGNORED' &&
    !(await confirmAsync({
      title: '确认忽略冲突单？',
      content: '忽略后该冲突单将结束处理，外部值和本地值都不会自动覆盖另一方。',
      type: 'warning',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    await portfolioIntegrationApi.resolveConflict({
      conflictTicketId,
      action,
      resolveRemark: action === 'IGNORED' ? '管理端忽略冲突' : '管理端确认处置',
    })
    message.success('冲突已处理')
    conflictQuery.pageNum = 1
    await loadConflicts()
  } catch (error) {
    showUserError(error)
  } finally {
    endOperation(operation)
  }
}

async function resolveIdentityUnmatched(
  row: PortfolioIdentityUnmatchedVO,
  action: 'RESOLVED' | 'IGNORED',
) {
  const identityUnmatchedId = row.id
  if (action === 'RESOLVED' && !identityResolveTeacherId.value) {
    message.warning('绑定本地教师须选择教师')
    return
  }
  if (
    action === 'RESOLVED' &&
    needsTeacherNumber(row) &&
    !identityResolveTeacherNumber.value.trim()
  ) {
    message.warning('缺少工号待匹配须补录工号')
    return
  }
  const operation = `identity:${identityUnmatchedId}:${action}`
  if (!beginOperation(operation)) return
  if (
    action === 'IGNORED' &&
    !(await confirmAsync({
      title: '确认忽略身份待匹配？',
      content: '忽略后该外部教师记录不会绑定到本地教师，本次同步数据也不会进入教师档案。',
      type: 'warning',
    }))
  ) {
    endOperation(operation)
    return
  }
  const resolvedTeacherId = identityResolveTeacherId.value
  const resolvedTeacherNumber = identityResolveTeacherNumber.value.trim()
  try {
    await portfolioIntegrationApi.resolveIdentityUnmatched({
      identityUnmatchedId,
      action,
      resolvedTeacherId: action === 'RESOLVED' ? resolvedTeacherId : undefined,
      resolvedTeacherNumber:
        action === 'RESOLVED' && needsTeacherNumber(row) ? resolvedTeacherNumber : undefined,
      resolveRemark: action === 'RESOLVED' ? '管理端绑定本地教师' : '管理端忽略待匹配',
    })
    message.success('身份待匹配已处置')
    identityResolveTeacherId.value = ''
    identityResolveTeacherNumber.value = ''
    identityResolveRowId.value = ''
    unmatchedQuery.pageNum = 1
    await loadUnmatched()
  } catch (error) {
    showUserError(error)
  } finally {
    endOperation(operation)
  }
}

function openFailedMessageFix(row: PortfolioIntegrationMessageInboxVO) {
  selectedFailedMessage.value = row
  correctedPayloadJson.value = row.payloadJson
  requeueMessage.value = '管理员修正载荷后重入队'
  failedMessageDrawerOpen.value = true
}

async function requeueFailedMessage(row: PortfolioIntegrationMessageInboxVO, corrected = false) {
  const messageInboxId = row.id
  const datasourceConfigId = row.datasourceConfigId
  let payloadJson: string | undefined
  if (corrected) {
    const value = correctedPayloadJson.value.trim()
    try {
      const parsed: unknown = JSON.parse(value)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('not-object')
      }
    } catch {
      message.error('修正后的消息载荷必须是 JSON 对象')
      return
    }
    payloadJson = value
  }
  const operation = `failed-message:${messageInboxId}`
  if (!beginOperation(operation)) return
  if (
    !corrected &&
    !(await confirmAsync({
      title: '确认使用原载荷重试？',
      content: '原载荷将放回普通收件箱并触发同步；若错误原因尚未消除，消息会再次进入异常状态。',
      type: 'warning',
    }))
  ) {
    endOperation(operation)
    return
  }
  const processMessage = corrected ? requeueMessage.value.trim() || undefined : '管理员原载荷重试'
  try {
    await portfolioIntegrationApi.requeueFailedMessage({
      messageInboxId,
      processMessage,
      correctedPayloadJson: payloadJson,
      triggerSync: true,
    })
    message.success('异常消息已重放并触发同步')
    failedMessageDrawerOpen.value = false
    selectedFailedMessage.value = null
    const reloads = [loadSyncTasks(), loadHealth(), loadUnmatched(), loadConflicts()]
    if (failedMessageDatasourceId.value === datasourceConfigId) reloads.push(loadFailedMessages())
    await Promise.all(reloads)
  } catch (error) {
    showUserError(error, '异常消息重放失败')
  } finally {
    endOperation(operation)
  }
}

function resetCourseCodeMapForm() {
  Object.assign(courseCodeMapForm, {
    id: '',
    sourceSystemCode: '',
    sourceCourseCode: '',
    sourceCourseName: '',
    canonicalCourseCode: '',
    canonicalCourseName: '',
    enabled: true,
    remark: '',
  })
}

function editCourseCodeMap(row: PortfolioCourseCodeMapVO) {
  Object.assign(courseCodeMapForm, {
    id: row.id,
    sourceSystemCode: row.sourceSystemCode,
    sourceCourseCode: row.sourceCourseCode,
    sourceCourseName: row.sourceCourseName ?? '',
    canonicalCourseCode: row.canonicalCourseCode,
    canonicalCourseName: row.canonicalCourseName,
    enabled: row.enabled,
    remark: row.remark ?? '',
  })
}

async function saveCourseCodeMap() {
  if (
    !courseCodeMapForm.sourceSystemCode.trim() ||
    !courseCodeMapForm.sourceCourseCode.trim() ||
    !courseCodeMapForm.canonicalCourseCode.trim() ||
    !courseCodeMapForm.canonicalCourseName.trim()
  ) {
    message.warning('请填写来源系统、源课程编码和规范课程编码/名称')
    return
  }
  const targetId = courseCodeMapForm.id || 'new'
  const operation = `course-code-map:save:${targetId}`
  if (!beginOperation(operation)) return
  const request = {
    id: courseCodeMapForm.id || undefined,
    sourceSystemCode: courseCodeMapForm.sourceSystemCode.trim(),
    sourceCourseCode: courseCodeMapForm.sourceCourseCode.trim(),
    sourceCourseName: courseCodeMapForm.sourceCourseName.trim() || undefined,
    canonicalCourseCode: courseCodeMapForm.canonicalCourseCode.trim(),
    canonicalCourseName: courseCodeMapForm.canonicalCourseName.trim(),
    enabled: courseCodeMapForm.enabled,
    remark: courseCodeMapForm.remark.trim() || undefined,
  }
  try {
    await portfolioIntegrationApi.saveCourseCodeMap(request)
    message.success('课程编码对照已保存')
    resetCourseCodeMapForm()
    await loadCourseCodeMaps()
  } catch (error) {
    showUserError(error, '保存课程编码对照失败')
  } finally {
    endOperation(operation)
  }
}

async function deleteCourseCodeMap(row: PortfolioCourseCodeMapVO) {
  const targetId = row.id
  const operation = `course-code-map:delete:${targetId}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '删除课程编码对照？',
    content: `${row.sourceSystemCode} / ${row.sourceCourseCode} 将不再归一为 ${row.canonicalCourseCode}`,
    type: 'error',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    await portfolioIntegrationApi.deleteCourseCodeMap(targetId)
    message.success('课程编码对照已删除')
    await loadCourseCodeMaps()
  } catch (error) {
    showUserError(error, '删除课程编码对照失败')
  } finally {
    endOperation(operation)
  }
}

function resetDictEntryForm() {
  Object.assign(dictEntryForm, {
    id: '',
    dictionaryCode: '',
    sourceValue: '',
    targetValue: '',
    enabled: true,
    remark: '',
  })
}

function editDictEntry(row: PortfolioIntegrationDictEntryVO) {
  Object.assign(dictEntryForm, {
    id: row.id,
    dictionaryCode: row.dictionaryCode,
    sourceValue: row.sourceValue,
    targetValue: row.targetValue,
    enabled: row.enabled,
    remark: row.remark ?? '',
  })
}

async function saveDictEntry() {
  if (
    !dictEntryForm.dictionaryCode.trim() ||
    !dictEntryForm.sourceValue.trim() ||
    !dictEntryForm.targetValue.trim()
  ) {
    message.warning('请填写字典编码、源值和规范值')
    return
  }
  const targetId = dictEntryForm.id || 'new'
  const operation = `dict-entry:save:${targetId}`
  if (!beginOperation(operation)) return
  const request = {
    id: dictEntryForm.id || undefined,
    dictionaryCode: dictEntryForm.dictionaryCode.trim(),
    sourceValue: dictEntryForm.sourceValue.trim(),
    targetValue: dictEntryForm.targetValue.trim(),
    enabled: dictEntryForm.enabled,
    remark: dictEntryForm.remark.trim() || undefined,
  }
  try {
    await portfolioIntegrationApi.saveDictEntry(request)
    message.success('字段字典项已保存')
    resetDictEntryForm()
    await loadDictEntries()
  } catch (error) {
    showUserError(error, '保存字段字典项失败')
  } finally {
    endOperation(operation)
  }
}

async function deleteDictEntry(row: PortfolioIntegrationDictEntryVO) {
  const targetId = row.id
  const operation = `dict-entry:delete:${targetId}`
  if (!beginOperation(operation)) return
  const confirmed = await confirmAsync({
    title: '删除字段字典项？',
    content: `${row.dictionaryCode} 中 ${row.sourceValue} → ${row.targetValue} 的转换将停止生效`,
    type: 'error',
  })
  if (!confirmed) {
    endOperation(operation)
    return
  }
  try {
    await portfolioIntegrationApi.deleteDictEntry(targetId)
    message.success('字段字典项已删除')
    await loadDictEntries()
  } catch (error) {
    showUserError(error, '删除字段字典项失败')
  } finally {
    endOperation(operation)
  }
}

function changeFailedMessageDatasource() {
  failedMessageQuery.pageNum = 1
  void loadFailedMessages()
}

function searchCleanLogs() {
  cleanLogQuery.pageNum = 1
  void loadCleanLogs()
}

function searchCourseCodeMaps() {
  courseCodeMapQuery.pageNum = 1
  void loadCourseCodeMaps()
}

function searchDictEntries() {
  dictEntryQuery.pageNum = 1
  void loadDictEntries()
}

function onDatasourcePageChange(page: { current: number; pageSize: number }) {
  datasourceQuery.pageNum = page.current
  datasourceQuery.pageSize = page.pageSize
  void loadDatasources()
}

function onSyncTaskPageChange(page: { current: number; pageSize: number }) {
  syncTaskQuery.pageNum = page.current
  syncTaskQuery.pageSize = page.pageSize
  void loadSyncTasks()
}

function onUnmatchedPageChange(page: { current: number; pageSize: number }) {
  unmatchedQuery.pageNum = page.current
  unmatchedQuery.pageSize = page.pageSize
  void loadUnmatched()
}

function onConflictPageChange(page: { current: number; pageSize: number }) {
  conflictQuery.pageNum = page.current
  conflictQuery.pageSize = page.pageSize
  void loadConflicts()
}

function onFailedMessagePageChange(page: { current: number; pageSize: number }) {
  failedMessageQuery.pageNum = page.current
  failedMessageQuery.pageSize = page.pageSize
  void loadFailedMessages()
}

function onCleanLogPageChange(page: { current: number; pageSize: number }) {
  cleanLogQuery.pageNum = page.current
  cleanLogQuery.pageSize = page.pageSize
  void loadCleanLogs()
}

function onCourseCodeMapPageChange(page: { current: number; pageSize: number }) {
  courseCodeMapQuery.pageNum = page.current
  courseCodeMapQuery.pageSize = page.pageSize
  void loadCourseCodeMaps()
}

function onDictEntryPageChange(page: { current: number; pageSize: number }) {
  dictEntryQuery.pageNum = page.current
  dictEntryQuery.pageSize = page.pageSize
  void loadDictEntries()
}

onMounted(async () => {
  await Promise.all([loadTeachers(), loadDatasources(), loadArchiveCategories()])
  await Promise.all([
    loadMappings(),
    loadSyncTasks(),
    loadUnmatched(),
    loadConflicts(),
    loadHealth(),
    loadCleanLogs(),
    loadCourseCodeMaps(),
    loadDictEntries(),
  ])
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="数据集成中心" subtitle="八渠道配置、同步监控与渠道健康" />
    <UiSectionTabs v-model:active-key="activeTab" :items="tabItems" />

    <UiCard v-if="activeTab === 'datasource'" title="数据源配置" style="margin-top: 16px">
      <div class="integration-dashboard__preset-bar">
        <span class="integration-dashboard__preset-label">全国教师系统</span>
        <UiButton size="sm" :disabled="writing" @click="applyNationalTeacherPreset('OUTBOUND')">
          上报配置
        </UiButton>
        <UiButton size="sm" :disabled="writing" @click="applyNationalTeacherPreset('INBOUND')">
          回流配置
        </UiButton>
      </div>
      <div class="integration-dashboard__form">
        <label>渠道</label>
        <a-select
          v-model:value="dsForm.channelCode"
          :options="datasourceChannelOptions"
          :disabled="writing"
          @change="changeDatasourceChannel"
        />
        <label>通路</label>
        <a-select
          v-model:value="dsForm.pathwayCode"
          :options="datasourcePathwayOptions"
          :disabled="writing"
        />
        <label>名称</label>
        <input
          v-model="dsForm.datasourceName"
          class="integration-dashboard__input"
          :disabled="writing"
        />
        <label>连接配置</label>
        <input
          v-model="dsForm.connectionConfigJson"
          class="integration-dashboard__input integration-dashboard__input--wide"
          :disabled="writing"
          placeholder='{"syncDirection":"OUTBOUND"}'
        />
        <UiButton
          tone="primary"
          :loading="operationKey === 'datasource:save'"
          :disabled="writing"
          @click="saveDatasource"
        >
          保存数据源
        </UiButton>
      </div>
      <UiDataTable
        v-model:current="datasourceQuery.pageNum"
        v-model:page-size="datasourceQuery.pageSize"
        row-key="id"
        :columns="dsColumns"
        :data-source="datasources"
        :loading="loadState.datasources"
        :load-error="Boolean(loadError.datasources)"
        pagination-mode="server"
        :total="datasourceTotal"
        style="margin-top: 16px"
        @page-change="onDatasourcePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              size="sm"
              :loading="operationKey === `sync:trigger:${record.id}`"
              :disabled="writing"
              @click="triggerSync(record)"
            >
              触发同步
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard v-else-if="activeTab === 'mapping'" title="字段映射" style="margin-top: 16px">
      <div class="integration-dashboard__mapping-bar">
        <label>数据源</label>
        <select
          v-model="selectedDatasourceId"
          class="integration-dashboard__select"
          :disabled="writing"
          @change="loadMappings"
        >
          <option v-for="item in datasourceOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>
      <div class="integration-dashboard__form integration-dashboard__form--mapping">
        <label>源字段</label>
        <input
          v-model="mappingForm.sourceFieldCode"
          class="integration-dashboard__input"
          :disabled="writing"
        />
        <label>分类</label>
        <a-select
          :value="mappingForm.targetCategoryCode || undefined"
          allow-clear
          :options="archiveCategoryOptions"
          :disabled="writing"
          placeholder="不入档时留空"
          @change="changeMappingCategory"
        />
        <label>目标字段</label>
        <a-select
          v-if="mappingForm.targetCategoryCode"
          v-model:value="mappingForm.targetFieldCode"
          :options="archiveFieldOptions"
          :disabled="writing"
          placeholder="选择已发布字段"
        />
        <input
          v-else
          v-model="mappingForm.targetFieldCode"
          class="integration-dashboard__input"
          :disabled="writing"
        />
        <label>字典</label>
        <input
          v-model="mappingForm.dictionaryCode"
          class="integration-dashboard__input"
          :disabled="writing"
        />
        <label>转换</label>
        <a-select
          v-model:value="mappingForm.transformType"
          :options="mappingTransformOptions"
          :disabled="writing"
        />
        <label v-if="mappingTransformExprPlaceholder">转换参数</label>
        <a-input
          v-if="mappingTransformExprPlaceholder"
          v-model:value="mappingForm.transformExpr"
          :placeholder="mappingTransformExprPlaceholder"
          :disabled="writing"
        />
        <UiButton
          tone="primary"
          :loading="operationKey.startsWith('mapping:save:')"
          :disabled="writing"
          @click="saveMapping"
        >
          保存映射
        </UiButton>
      </div>
      <UiDataTable
        row-key="id"
        :columns="mappingColumns"
        :data-source="mappings"
        :loading="loadState.mappings"
        :load-error="Boolean(loadError.mappings)"
        style="margin-top: 16px"
      >
        <template #bodyCell="{ column, record }">
          <UiTag v-if="column.key === 'enabled'" :tone="record.enabled ? 'green' : 'gray'">
            {{ record.enabled ? '启用' : '停用' }}
          </UiTag>
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard v-else-if="activeTab === 'course-map'" title="课程编码对照" style="margin-top: 16px">
      <div class="integration-dashboard__filter-bar">
        <a-input
          v-model:value="courseCodeMapQuery.sourceSystemCode"
          placeholder="来源系统编码"
          allow-clear
          :disabled="writing"
        />
        <a-input
          v-model:value="courseCodeMapQuery.keyword"
          placeholder="课程编码或名称"
          allow-clear
          :disabled="writing"
        />
        <UiButton
          size="sm"
          :loading="loadState.courseCodeMaps"
          :disabled="writing"
          @click="searchCourseCodeMaps"
          >查询</UiButton
        >
      </div>
      <div class="integration-dashboard__config-grid">
        <a-input
          v-model:value="courseCodeMapForm.sourceSystemCode"
          placeholder="来源系统编码"
          :disabled="writing"
        />
        <a-input
          v-model:value="courseCodeMapForm.sourceCourseCode"
          placeholder="源课程编码"
          :disabled="writing"
        />
        <a-input
          v-model:value="courseCodeMapForm.sourceCourseName"
          placeholder="源课程名称（可选）"
          :disabled="writing"
        />
        <a-input
          v-model:value="courseCodeMapForm.canonicalCourseCode"
          placeholder="校内规范课程编码"
          :disabled="writing"
        />
        <a-input
          v-model:value="courseCodeMapForm.canonicalCourseName"
          placeholder="校内规范课程名称"
          :disabled="writing"
        />
        <a-input
          v-model:value="courseCodeMapForm.remark"
          placeholder="备注（可选）"
          :disabled="writing"
        />
        <a-switch
          v-model:checked="courseCodeMapForm.enabled"
          checked-children="启用"
          un-checked-children="停用"
          :disabled="writing"
        />
        <UiButton
          variant="primary"
          :loading="operationKey.startsWith('course-code-map:save:')"
          :disabled="writing"
          @click="saveCourseCodeMap"
        >
          {{ courseCodeMapForm.id ? '保存修改' : '新增对照' }}
        </UiButton>
        <UiButton
          v-if="courseCodeMapForm.id"
          variant="ghost"
          :disabled="writing"
          @click="resetCourseCodeMapForm"
        >
          取消编辑
        </UiButton>
      </div>
      <UiDataTable
        v-model:current="courseCodeMapQuery.pageNum"
        v-model:page-size="courseCodeMapQuery.pageSize"
        row-key="id"
        :columns="courseCodeMapColumns"
        :data-source="courseCodeMaps"
        :loading="loadState.courseCodeMaps"
        :load-error="Boolean(loadError.courseCodeMaps)"
        pagination-mode="server"
        :total="courseCodeMapTotal"
        @page-change="onCourseCodeMapPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sourceCourse'">
            {{ record.sourceCourseCode }} · {{ record.sourceCourseName || '未提供名称' }}
          </template>
          <template v-else-if="column.key === 'canonicalCourse'">
            {{ record.canonicalCourseCode }} · {{ record.canonicalCourseName }}
          </template>
          <UiTag v-else-if="column.key === 'enabled'" :tone="record.enabled ? 'green' : 'gray'">
            {{ record.enabled ? '启用' : '停用' }}
          </UiTag>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              size="sm"
              variant="ghost"
              :disabled="writing"
              @click="editCourseCodeMap(record)"
              >编辑</UiButton
            >
            <UiButton
              size="sm"
              variant="ghost"
              status="danger"
              :loading="operationKey === `course-code-map:delete:${record.id}`"
              :disabled="writing"
              @click="deleteCourseCodeMap(record)"
            >
              删除
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard v-else-if="activeTab === 'dictionary'" title="字段转换字典" style="margin-top: 16px">
      <div class="integration-dashboard__filter-bar">
        <a-input
          v-model:value="dictEntryQuery.dictionaryCode"
          placeholder="字典编码"
          allow-clear
          :disabled="writing"
        />
        <UiButton
          size="sm"
          :loading="loadState.dictEntries"
          :disabled="writing"
          @click="searchDictEntries"
          >查询</UiButton
        >
      </div>
      <div class="integration-dashboard__config-grid">
        <a-input
          v-model:value="dictEntryForm.dictionaryCode"
          placeholder="字典编码"
          :disabled="writing"
        />
        <a-input
          v-model:value="dictEntryForm.sourceValue"
          placeholder="源系统原始值"
          :disabled="writing"
        />
        <a-input
          v-model:value="dictEntryForm.targetValue"
          placeholder="规范目标值"
          :disabled="writing"
        />
        <a-input
          v-model:value="dictEntryForm.remark"
          placeholder="备注（可选）"
          :disabled="writing"
        />
        <a-switch
          v-model:checked="dictEntryForm.enabled"
          checked-children="启用"
          un-checked-children="停用"
          :disabled="writing"
        />
        <UiButton
          variant="primary"
          :loading="operationKey.startsWith('dict-entry:save:')"
          :disabled="writing"
          @click="saveDictEntry"
        >
          {{ dictEntryForm.id ? '保存修改' : '新增字典项' }}
        </UiButton>
        <UiButton
          v-if="dictEntryForm.id"
          variant="ghost"
          :disabled="writing"
          @click="resetDictEntryForm"
        >
          取消编辑
        </UiButton>
      </div>
      <UiDataTable
        v-model:current="dictEntryQuery.pageNum"
        v-model:page-size="dictEntryQuery.pageSize"
        row-key="id"
        :columns="dictEntryColumns"
        :data-source="dictEntries"
        :loading="loadState.dictEntries"
        :load-error="Boolean(loadError.dictEntries)"
        pagination-mode="server"
        :total="dictEntryTotal"
        @page-change="onDictEntryPageChange"
      >
        <template #bodyCell="{ column, record }">
          <UiTag v-if="column.key === 'enabled'" :tone="record.enabled ? 'green' : 'gray'">
            {{ record.enabled ? '启用' : '停用' }}
          </UiTag>
          <template v-else-if="column.key === 'actions'">
            <UiButton size="sm" variant="ghost" :disabled="writing" @click="editDictEntry(record)"
              >编辑</UiButton
            >
            <UiButton
              size="sm"
              variant="ghost"
              status="danger"
              :loading="operationKey === `dict-entry:delete:${record.id}`"
              :disabled="writing"
              @click="deleteDictEntry(record)"
            >
              删除
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard v-else-if="activeTab === 'sync'" title="同步任务" style="margin-top: 16px">
      <UiDataTable
        v-model:current="syncTaskQuery.pageNum"
        v-model:page-size="syncTaskQuery.pageSize"
        row-key="id"
        :columns="syncColumns"
        :data-source="syncTasks"
        :loading="loadState.syncTasks"
        :load-error="Boolean(loadError.syncTasks)"
        pagination-mode="server"
        :total="syncTaskTotal"
        @page-change="onSyncTaskPageChange"
      />
    </UiCard>

    <UiCard v-else-if="activeTab === 'clean-log'" title="字段清洗日志" style="margin-top: 16px">
      <div class="integration-dashboard__filter-bar">
        <a-select
          v-model:value="cleanLogDatasourceId"
          allow-clear
          placeholder="全部数据源"
          :options="datasourceOptions"
          :disabled="writing"
        />
        <UiButton
          size="sm"
          :loading="loadState.cleanLogs"
          :disabled="writing"
          @click="searchCleanLogs"
          >查询</UiButton
        >
      </div>
      <UiDataTable
        v-model:current="cleanLogQuery.pageNum"
        v-model:page-size="cleanLogQuery.pageSize"
        row-key="id"
        :columns="cleanLogColumns"
        :data-source="cleanLogs"
        :loading="loadState.cleanLogs"
        :load-error="Boolean(loadError.cleanLogs)"
        pagination-mode="server"
        :total="cleanLogTotal"
        @page-change="onCleanLogPageChange"
      />
    </UiCard>

    <UiCard v-else-if="activeTab === 'queue'" title="待匹配与冲突" style="margin-top: 16px">
      <h4 class="integration-dashboard__sub-title">身份待匹配</h4>
      <UiDataTable
        v-model:current="unmatchedQuery.pageNum"
        v-model:page-size="unmatchedQuery.pageSize"
        row-key="id"
        :columns="unmatchedColumns"
        :data-source="unmatched"
        :loading="loadState.unmatched"
        :load-error="Boolean(loadError.unmatched)"
        pagination-mode="server"
        :total="unmatchedTotal"
        @page-change="onUnmatchedPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions' && record.status === 'PENDING'">
            <template v-if="identityResolveRowId === record.id">
              <a-select
                v-model:value="identityResolveTeacherId"
                class="integration-dashboard__teacher-select"
                placeholder="选择本地教师"
                :options="teacherOptions"
                show-search
                :filter-option="false"
                option-label-prop="label"
                :disabled="writing"
                @focus="() => loadTeachers()"
                @search="handleTeacherSearch"
              />
              <input
                v-if="needsTeacherNumber(record)"
                v-model="identityResolveTeacherNumber"
                class="integration-dashboard__input"
                placeholder="补录工号"
                :disabled="writing"
              />
            </template>
            <UiButton
              v-if="identityResolveRowId !== record.id"
              size="sm"
              :disabled="writing"
              @click="
                () => {
                  identityResolveRowId = record.id
                  identityResolveTeacherId = ''
                  identityResolveTeacherNumber = ''
                }
              "
            >
              绑定
            </UiButton>
            <UiButton
              v-else
              size="sm"
              :loading="operationKey === `identity:${record.id}:RESOLVED`"
              :disabled="writing"
              @click="resolveIdentityUnmatched(record, 'RESOLVED')"
            >
              确认绑定
            </UiButton>
            <UiButton
              size="sm"
              variant="ghost"
              :loading="operationKey === `identity:${record.id}:IGNORED`"
              :disabled="writing"
              @click="resolveIdentityUnmatched(record, 'IGNORED')"
            >
              忽略
            </UiButton>
          </template>
        </template>
      </UiDataTable>
      <h4 class="integration-dashboard__sub-title">冲突单</h4>
      <UiDataTable
        v-model:current="conflictQuery.pageNum"
        v-model:page-size="conflictQuery.pageSize"
        row-key="id"
        :columns="conflictColumns"
        :data-source="conflicts"
        :loading="loadState.conflicts"
        :load-error="Boolean(loadError.conflicts)"
        pagination-mode="server"
        :total="conflictTotal"
        @page-change="onConflictPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions' && record.ticketStatus === 'OPEN'">
            <UiButton
              size="sm"
              :loading="operationKey === `conflict:${record.id}:RESOLVED_USE_LOCAL`"
              :disabled="writing"
              @click="resolveConflict(record, 'RESOLVED_USE_LOCAL')"
            >
              保留本地
            </UiButton>
            <UiButton
              size="sm"
              :loading="operationKey === `conflict:${record.id}:RESOLVED_USE_EXTERNAL`"
              :disabled="writing"
              @click="resolveConflict(record, 'RESOLVED_USE_EXTERNAL')"
            >
              采用外部
            </UiButton>
            <UiButton
              size="sm"
              variant="ghost"
              :loading="operationKey === `conflict:${record.id}:IGNORED`"
              :disabled="writing"
              @click="resolveConflict(record, 'IGNORED')"
            >
              忽略
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard
      v-else-if="activeTab === 'failed-message'"
      title="消息异常重放"
      style="margin-top: 16px"
    >
      <div class="integration-dashboard__filter-bar">
        <a-select
          v-model:value="failedMessageDatasourceId"
          placeholder="选择消息推送数据源"
          :options="messageDatasourceOptions"
          :disabled="writing"
          @change="changeFailedMessageDatasource"
        />
        <UiButton
          size="sm"
          :loading="loadState.failedMessages"
          :disabled="writing"
          @click="loadFailedMessages"
          >刷新</UiButton
        >
      </div>
      <UiDataTable
        v-model:current="failedMessageQuery.pageNum"
        v-model:page-size="failedMessageQuery.pageSize"
        row-key="id"
        :columns="failedMessageColumns"
        :data-source="failedMessages"
        :loading="loadState.failedMessages"
        :load-error="Boolean(loadError.failedMessages)"
        pagination-mode="server"
        :total="failedMessageTotal"
        @page-change="onFailedMessagePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <UiButton
              size="sm"
              variant="ghost"
              :loading="operationKey === `failed-message:${record.id}`"
              :disabled="writing"
              @click="requeueFailedMessage(record)"
            >
              原载荷重试
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :disabled="writing"
              @click="openFailedMessageFix(record)"
              >修正重放</UiButton
            >
          </template>
        </template>
        <template #empty>
          <UiEmpty
            :description="
              failedMessageDatasourceId ? '当前数据源没有异常消息' : '请先选择消息推送数据源'
            "
          />
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard
      v-else-if="activeTab === 'health'"
      title="渠道健康看板"
      :loading="loadState.health"
      style="margin-top: 16px"
    >
      <p v-if="health?.computedTime" class="integration-dashboard__hint">
        计算时间 {{ health.computedTime }}
      </p>
      <UiEmpty v-if="loadError.health" :description="loadError.health" />
      <UiEmpty v-else-if="!health?.channels.length" description="暂无渠道健康数据" />
      <ul v-else class="integration-dashboard__health-list">
        <li v-for="item in health.channels" :key="`${item.channelCode}-${item.pathwayCode}`">
          <strong>{{ item.channelCode }}</strong> / {{ item.pathwayCode }}
          <UiTag :tone="item.healthStatus === 'HEALTHY' ? 'green' : 'orange'">
            {{ item.healthStatus }}
          </UiTag>
          <span v-if="item.maturityScore">成熟度 {{ item.maturityScore }}</span>
        </li>
      </ul>
    </UiCard>
  </StageWorkbenchShell>

  <UiDrawer
    v-model:open="failedMessageDrawerOpen"
    title="修正异常消息载荷"
    width="640"
    :hide-footer="false"
    :closable="!writing"
    :mask-closable="!writing"
    :confirm-loading="operationKey.startsWith('failed-message:')"
    ok-text="修正并重放"
    @ok="selectedFailedMessage && requeueFailedMessage(selectedFailedMessage, true)"
  >
    <div v-if="selectedFailedMessage" class="integration-dashboard__failed-message-editor">
      <UiTag tone="red">{{ selectedFailedMessage.channelCode }}</UiTag>
      <strong>{{ selectedFailedMessage.messageKey }}</strong>
      <span>{{ selectedFailedMessage.processMessage }}</span>
      <label>修正说明</label>
      <a-input
        v-model:value="requeueMessage"
        placeholder="说明修正内容与重放依据"
        :disabled="writing"
      />
      <label>消息载荷 JSON</label>
      <UiTextarea v-model="correctedPayloadJson" :rows="16" :disabled="writing" />
    </div>
  </UiDrawer>
</template>

<style scoped>
.integration-dashboard__form {
  display: grid;
  grid-template-columns: 80px 1fr 80px 1fr 96px 1fr auto;
  gap: 8px 12px;
  align-items: center;
  max-width: none;
}
.integration-dashboard__input--wide {
  min-width: 280px;
}
.integration-dashboard__preset-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.integration-dashboard__preset-label {
  font-size: 13px;
  color: var(--nybc-text-secondary);
}
.integration-dashboard__form--mapping {
  grid-template-columns: 64px 1fr 80px 1fr 64px 1fr 64px 1fr auto;
  max-width: none;
}
.integration-dashboard__mapping-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.integration-dashboard__filter-bar {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 280px)) auto;
  gap: var(--dp-space-3);
  align-items: center;
  margin-bottom: var(--dp-space-4);
}
.integration-dashboard__config-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: var(--dp-space-3);
  align-items: center;
  margin-bottom: var(--dp-space-4);
  padding-bottom: var(--dp-space-4);
  border-bottom: 1px solid var(--dp-border);
}
.integration-dashboard__failed-message-editor {
  display: grid;
  gap: var(--dp-space-3);
  color: var(--dp-text-secondary);
}
.integration-dashboard__failed-message-editor strong,
.integration-dashboard__failed-message-editor label {
  color: var(--dp-text-primary);
}
.integration-dashboard__input,
.integration-dashboard__select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--nybc-border);
  border-radius: 4px;
}
.integration-dashboard__select {
  min-width: 240px;
}
.integration-dashboard__teacher-select {
  min-width: 220px;
  margin-right: 8px;
}
.integration-dashboard__hint {
  margin: 0 0 12px;
  color: var(--nybc-text-secondary);
  font-size: 13px;
}
.integration-dashboard__sub-title {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.integration-dashboard__health-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.integration-dashboard__health-list li {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--nybc-border);
}
@media (max-width: 960px) {
  .integration-dashboard__filter-bar,
  .integration-dashboard__config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
