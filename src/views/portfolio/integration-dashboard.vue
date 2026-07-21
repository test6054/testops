<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioConflictTicketVO,
  PortfolioCourseCodeMapVO,
  PortfolioIdentityUnmatchedVO,
  PortfolioIntegrationChannelPathwayMatrixVO,
  PortfolioIntegrationCleanLogVO,
  PortfolioIntegrationConnectionConfigDto,
  PortfolioIntegrationDatasourceVO,
  PortfolioIntegrationDictEntryVO,
  PortfolioIntegrationFieldMappingVO,
  PortfolioIntegrationHealthDashboardVO,
  PortfolioIntegrationMessageInboxVO,
  PortfolioIntegrationPayloadFieldDto,
  PortfolioIntegrationSyncTaskVO,
  PortfolioNationalReportIssueVO,
} from '@/apis/portfolio/integration'
import type {
  PortfolioArchiveCategoryTreeNodeVO,
  PortfolioTargetFieldDefinition,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import {
  PORTFOLIO_EXCEL_IMPORT_SCENE_OPTIONS,
  PORTFOLIO_INTEGRATION_PASSWORD_MASK,
  portfolioIntegrationApi,
} from '@/apis/portfolio/integration'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioArchiveWriteGuard } from '@/composables/usePortfolioArchiveWriteGuard'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { PortfolioConflictTicketStatusEnum } from '@/types/enums/portfolio-conflict-ticket-status-enum'
import { PortfolioIdentityUnmatchedStatusEnum } from '@/types/enums/portfolio-identity-unmatched-status-enum'
import { PortfolioIntegrationChannelCodeEnum } from '@/types/enums/portfolio-integration-channel-code-enum'
import { PortfolioIntegrationHealthStatusEnum } from '@/types/enums/portfolio-integration-health-status-enum'
import { PortfolioIntegrationPathwayCodeEnum } from '@/types/enums/portfolio-integration-pathway-code-enum'
import { PortfolioNationalTeacherSyncDirectionEnum } from '@/types/enums/portfolio-national-teacher-sync-direction-enum'
import {
  ALL_PORTFOLIO_SCIENTIFIC_RESEARCH_FACT_KIND_CODES,
  PortfolioScientificResearchFactKindDescription,
} from '@/types/enums/portfolio-scientific-research-fact-kind-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
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
  { key: 'queue', label: '待匹配/冲突/上报' },
  { key: 'failed-message', label: '异常消息' },
  { key: 'health', label: '渠道健康' },
]

const operationKey = ref('')
const writing = computed(() => Boolean(operationKey.value))

/** 冲突/身份处置目标教师：封存写禁预检 */
const actionTeacherId = ref<string | undefined>()
const { assertArchiveWritable, reloadLifecycleState } = usePortfolioArchiveWriteGuard({
  teacherId: actionTeacherId,
  autoLoad: false,
})

async function bindActionTeacherAndAssert(
  teacherId: string | number | undefined | null,
  actionLabel: string,
): Promise<boolean> {
  actionTeacherId.value
    = teacherId != null && String(teacherId).trim() !== '' ? String(teacherId) : undefined
  await reloadLifecycleState()
  return assertArchiveWritable(actionLabel)
}

const loadState = reactive({
  datasources: false,
  mappings: false,
  syncTasks: false,
  unmatched: false,
  conflicts: false,
  nationalIssues: false,
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
  nationalIssues: '',
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
  nationalIssues: 0,
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
const nationalIssues = ref<PortfolioNationalReportIssueVO[]>([])
const failedMessages = ref<PortfolioIntegrationMessageInboxVO[]>([])
const cleanLogs = ref<PortfolioIntegrationCleanLogVO[]>([])
const courseCodeMaps = ref<PortfolioCourseCodeMapVO[]>([])
const dictEntries = ref<PortfolioIntegrationDictEntryVO[]>([])
const health = ref<PortfolioIntegrationHealthDashboardVO | null>(null)
const datasourceTotal = ref(0)
const syncTaskTotal = ref(0)
const unmatchedTotal = ref(0)
const nationalIssueTotal = ref(0)
const conflictTotal = ref(0)
const failedMessageTotal = ref(0)
const cleanLogTotal = ref(0)
const courseCodeMapTotal = ref(0)
const dictEntryTotal = ref(0)

const selectedDatasourceId = ref('')
const datasourceQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const syncTaskQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const unmatchedQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const nationalIssueQuery = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  status: 'OPEN',
})
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
  id: undefined as string | undefined,
  channelCode: PortfolioIntegrationChannelCodeEnum.HR_PERSONNEL,
  pathwayCode: PortfolioIntegrationPathwayCodeEnum.OPENAPI,
  datasourceName: '人事主数据',
  enabled: true,
  jdbcUrl: '',
  username: '',
  password: '',
  querySql: '',
  incremental: false,
  initialWatermark: '',
  passwordConfigured: false,
  endpointUrl: '',
  soapAction: '',
  requestEnvelope: '',
  recordElementLocalName: 'Record',
  readTimeoutSeconds: 60 as number | undefined,
  excelImportSceneKey: 'PORTFOLIO_DEVELOPMENT_RECORD',
  sourceFileNodeId: '',
  importContextFileName: '',
  importContextDefaultRecordType: '',
  importContextDefaultCategoryCode: '',
  importContextDefaultLevelCode: '',
  importContextCommit: true,
  importContextConfirmManualConflicts: false,
  importContextExpectedConfigUpdateToken: '',
  batchSize: 100 as number | undefined,
  syncDirection: PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND,
  inboundRecords: [] as Array<{
    teacherNumber: string
    teacherName: string
    title: string
    employmentStatus: string
  }>,
})

const isHrOpenApi = computed(
  () =>
    dsForm.channelCode === PortfolioIntegrationChannelCodeEnum.HR_PERSONNEL
    && dsForm.pathwayCode === PortfolioIntegrationPathwayCodeEnum.OPENAPI,
)
const isNationalTeacherOpenApi = computed(
  () =>
    dsForm.channelCode === PortfolioIntegrationChannelCodeEnum.NATIONAL_TEACHER_SYSTEM
    && dsForm.pathwayCode === PortfolioIntegrationPathwayCodeEnum.OPENAPI,
)
const isJdbcPathway = computed(
  () => dsForm.pathwayCode === PortfolioIntegrationPathwayCodeEnum.JDBC,
)
const isSoapPathway = computed(
  () => dsForm.pathwayCode === PortfolioIntegrationPathwayCodeEnum.SOAP,
)
const isExcelPathway = computed(
  () => dsForm.pathwayCode === PortfolioIntegrationPathwayCodeEnum.EXCEL_IMPORT,
)
const isMessagePathway = computed(
  () => dsForm.pathwayCode === PortfolioIntegrationPathwayCodeEnum.MESSAGE_PUSH,
)
const isScientificResearchChannel = computed(
  () => dsForm.channelCode === PortfolioIntegrationChannelCodeEnum.SCIENTIFIC_RESEARCH,
)
const scientificResearchFactKindHint = ALL_PORTFOLIO_SCIENTIFIC_RESEARCH_FACT_KIND_CODES.map(
  (code) => `${code}=${PortfolioScientificResearchFactKindDescription[code]}`,
).join('；')
const editingDatasource = computed(() => Boolean(dsForm.id))

/** 渠道×通路矩阵真源（后端 listChannelPathwayMatrix）；未加载前使用空列表。 */
const channelPathwayMatrix = ref<PortfolioIntegrationChannelPathwayMatrixVO | null>(null)

const datasourceChannelOptions = computed(() => {
  const rows = channelPathwayMatrix.value?.channels ?? []
  if (rows.length === 0) {
    return [] as Array<{ value: string, label: string }>
  }
  return rows.map((row) => ({ value: row.channelCode, label: row.channelLabel }))
})

const datasourcePathwayOptions = computed(() => {
  const rows = channelPathwayMatrix.value?.channels ?? []
  const channel = rows.find((item) => item.channelCode === dsForm.channelCode)
  const pathways = (channel?.pathways ?? []).filter((item) => item.configurable !== false)
  return pathways.map((item) => ({ value: item.pathwayCode, label: item.pathwayLabel }))
})

function resetDatasourceForm() {
  dsForm.id = undefined
  dsForm.channelCode = PortfolioIntegrationChannelCodeEnum.HR_PERSONNEL
  dsForm.pathwayCode = PortfolioIntegrationPathwayCodeEnum.OPENAPI
  dsForm.datasourceName = '人事主数据'
  dsForm.enabled = true
  dsForm.jdbcUrl = ''
  dsForm.username = ''
  dsForm.password = ''
  dsForm.querySql = ''
  dsForm.incremental = false
  dsForm.initialWatermark = ''
  dsForm.passwordConfigured = false
  dsForm.endpointUrl = ''
  dsForm.soapAction = ''
  dsForm.requestEnvelope = ''
  dsForm.recordElementLocalName = 'Record'
  dsForm.readTimeoutSeconds = 60
  dsForm.excelImportSceneKey = 'PORTFOLIO_DEVELOPMENT_RECORD'
  dsForm.sourceFileNodeId = ''
  dsForm.importContextFileName = ''
  dsForm.importContextDefaultRecordType = ''
  dsForm.importContextDefaultCategoryCode = ''
  dsForm.importContextDefaultLevelCode = ''
  dsForm.importContextCommit = true
  dsForm.importContextConfirmManualConflicts = false
  dsForm.importContextExpectedConfigUpdateToken = ''
  dsForm.batchSize = 100
  dsForm.syncDirection = PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND
  dsForm.inboundRecords = []
}

function clearPathwayConfigFields() {
  dsForm.jdbcUrl = ''
  dsForm.username = ''
  dsForm.password = ''
  dsForm.querySql = ''
  dsForm.incremental = false
  dsForm.initialWatermark = ''
  dsForm.passwordConfigured = false
  dsForm.endpointUrl = ''
  dsForm.soapAction = ''
  dsForm.requestEnvelope = ''
  dsForm.recordElementLocalName = 'Record'
  dsForm.readTimeoutSeconds = 60
  dsForm.excelImportSceneKey = 'PORTFOLIO_DEVELOPMENT_RECORD'
  dsForm.sourceFileNodeId = ''
  dsForm.importContextFileName = ''
  dsForm.importContextDefaultRecordType = ''
  dsForm.importContextDefaultCategoryCode = ''
  dsForm.importContextDefaultLevelCode = ''
  dsForm.importContextCommit = true
  dsForm.importContextConfirmManualConflicts = false
  dsForm.importContextExpectedConfigUpdateToken = ''
  dsForm.batchSize = 100
  dsForm.syncDirection = PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND
  dsForm.inboundRecords = []
}

function changeDatasourceChannel(value: SelectValue) {
  const channelCode = value as PortfolioIntegrationChannelCodeEnum
  dsForm.channelCode = channelCode
  const pathways
    = (channelPathwayMatrix.value?.channels ?? [])
      .find((item) => item.channelCode === channelCode)
      ?.pathways
?.filter((item) => item.configurable !== false) ?? []
  dsForm.pathwayCode = pathways[0]?.pathwayCode ?? PortfolioIntegrationPathwayCodeEnum.OPENAPI
  clearPathwayConfigFields()
}

function changeDatasourcePathway(value: SelectValue) {
  dsForm.pathwayCode = value as PortfolioIntegrationPathwayCodeEnum
  clearPathwayConfigFields()
  if (
    dsForm.channelCode === PortfolioIntegrationChannelCodeEnum.SCIENTIFIC_RESEARCH
    && dsForm.pathwayCode === PortfolioIntegrationPathwayCodeEnum.EXCEL_IMPORT
  ) {
    dsForm.excelImportSceneKey = 'PORTFOLIO_SCIENTIFIC_RESEARCH_FACT'
  }
}

function applyNationalTeacherPreset(direction: PortfolioNationalTeacherSyncDirectionEnum) {
  const existed = datasources.value.find(
    (item) =>
      item.channelCode === PortfolioIntegrationChannelCodeEnum.NATIONAL_TEACHER_SYSTEM
      && item.pathwayCode === PortfolioIntegrationPathwayCodeEnum.OPENAPI,
  )
  if (existed) {
    fillDatasourceForm(existed)
    dsForm.syncDirection = direction
    dsForm.datasourceName
      = direction === PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND
        ? '全国教师系统上报'
        : '全国教师系统回流'
    if (
      direction === PortfolioNationalTeacherSyncDirectionEnum.INBOUND
      && dsForm.inboundRecords.length === 0
    ) {
      dsForm.inboundRecords = [
        { teacherNumber: '', teacherName: '', title: '', employmentStatus: '' },
      ]
    }
    void message.info(
      '全国教师系统同一渠道仅允许一条 OPENAPI 配置，已切换为编辑现有数据源并设置方向',
    )
    return
  }
  resetDatasourceForm()
  dsForm.channelCode = PortfolioIntegrationChannelCodeEnum.NATIONAL_TEACHER_SYSTEM
  dsForm.pathwayCode = PortfolioIntegrationPathwayCodeEnum.OPENAPI
  dsForm.datasourceName
    = direction === PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND
      ? '全国教师系统上报'
      : '全国教师系统回流'
  dsForm.syncDirection = direction
  dsForm.inboundRecords
    = direction === PortfolioNationalTeacherSyncDirectionEnum.INBOUND
      ? [{ teacherNumber: '', teacherName: '', title: '', employmentStatus: '' }]
      : []
}

function addInboundRecord() {
  dsForm.inboundRecords.push({
    teacherNumber: '',
    teacherName: '',
    title: '',
    employmentStatus: '',
  })
}

function removeInboundRecord(index: number) {
  dsForm.inboundRecords.splice(index, 1)
}

function buildConnectionConfig(): PortfolioIntegrationConnectionConfigDto | undefined {
  if (isHrOpenApi.value) {
    return undefined
  }
  if (isNationalTeacherOpenApi.value) {
    if (dsForm.syncDirection === PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND) {
      return { syncDirection: PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND }
    }
    return {
      syncDirection: PortfolioNationalTeacherSyncDirectionEnum.INBOUND,
      inboundRecords: dsForm.inboundRecords
        .filter((item) => item.teacherNumber.trim())
        .map((item) => ({
          teacherNumber: item.teacherNumber.trim(),
          teacherName: item.teacherName.trim() || undefined,
          title: item.title.trim() || undefined,
          employmentStatus: item.employmentStatus.trim() || undefined,
        })),
    }
  }
  if (isJdbcPathway.value) {
    const password = dsForm.password.trim()
    return {
      jdbcUrl: dsForm.jdbcUrl.trim(),
      username: dsForm.username.trim(),
      password: password || (dsForm.passwordConfigured ? PORTFOLIO_INTEGRATION_PASSWORD_MASK : ''),
      querySql: dsForm.querySql.trim(),
      incremental: dsForm.incremental,
      initialWatermark: dsForm.initialWatermark.trim() || undefined,
    }
  }
  if (isSoapPathway.value) {
    return {
      endpointUrl: dsForm.endpointUrl.trim(),
      soapAction: dsForm.soapAction.trim() || undefined,
      requestEnvelope: dsForm.requestEnvelope.trim(),
      recordElementLocalName: dsForm.recordElementLocalName.trim() || 'Record',
      readTimeoutSeconds: dsForm.readTimeoutSeconds || undefined,
    }
  }
  if (isExcelPathway.value) {
    const importContext = {
      fileName: dsForm.importContextFileName.trim() || undefined,
      defaultRecordType: dsForm.importContextDefaultRecordType.trim() || undefined,
      defaultCategoryCode: dsForm.importContextDefaultCategoryCode.trim() || undefined,
      defaultLevelCode: dsForm.importContextDefaultLevelCode.trim() || undefined,
      commit: dsForm.importContextCommit,
      confirmManualConflicts: dsForm.importContextConfirmManualConflicts || undefined,
      expectedConfigUpdateToken: dsForm.importContextExpectedConfigUpdateToken.trim() || undefined,
    }
    const hasImportContext = Boolean(
      importContext.fileName
      || importContext.defaultRecordType
      || importContext.defaultCategoryCode
      || importContext.defaultLevelCode
      || importContext.confirmManualConflicts
      || importContext.expectedConfigUpdateToken
      || importContext.commit === false,
    )
    return {
      excelImportSceneKey: dsForm.excelImportSceneKey,
      sourceFileNodeId: dsForm.sourceFileNodeId.trim() || undefined,
      importContext: hasImportContext ? importContext : undefined,
    }
  }
  if (isMessagePathway.value) {
    return {
      batchSize: dsForm.batchSize && dsForm.batchSize > 0 ? dsForm.batchSize : 100,
    }
  }
  return undefined
}

function fillDatasourceForm(row: PortfolioIntegrationDatasourceVO) {
  resetDatasourceForm()
  dsForm.id = row.id
  dsForm.channelCode = row.channelCode
  dsForm.pathwayCode = row.pathwayCode
  dsForm.datasourceName = row.datasourceName
  dsForm.enabled = row.enabled
  dsForm.passwordConfigured = Boolean(row.passwordConfigured)
  const config = row.connectionConfig
  if (!config) {
    return
  }
  if (row.pathwayCode === PortfolioIntegrationPathwayCodeEnum.JDBC) {
    dsForm.jdbcUrl = config.jdbcUrl ?? ''
    dsForm.username = config.username ?? ''
    dsForm.password = config.password ?? PORTFOLIO_INTEGRATION_PASSWORD_MASK
    dsForm.querySql = config.querySql ?? ''
    dsForm.incremental = Boolean(config.incremental)
    dsForm.initialWatermark = config.initialWatermark ?? ''
    return
  }
  if (row.pathwayCode === PortfolioIntegrationPathwayCodeEnum.SOAP) {
    dsForm.endpointUrl = config.endpointUrl ?? ''
    dsForm.soapAction = config.soapAction ?? ''
    dsForm.requestEnvelope = config.requestEnvelope ?? ''
    dsForm.recordElementLocalName = config.recordElementLocalName ?? 'Record'
    dsForm.readTimeoutSeconds = config.readTimeoutSeconds ?? 60
    return
  }
  if (row.pathwayCode === PortfolioIntegrationPathwayCodeEnum.EXCEL_IMPORT) {
    dsForm.excelImportSceneKey
      = config.excelImportSceneKey
        ?? (row.channelCode === PortfolioIntegrationChannelCodeEnum.SCIENTIFIC_RESEARCH
        ? 'PORTFOLIO_SCIENTIFIC_RESEARCH_FACT'
        : 'PORTFOLIO_DEVELOPMENT_RECORD')
    dsForm.sourceFileNodeId = config.sourceFileNodeId ?? ''
    const importContext = config.importContext
    dsForm.importContextFileName = importContext?.fileName ?? ''
    dsForm.importContextDefaultRecordType = importContext?.defaultRecordType ?? ''
    dsForm.importContextDefaultCategoryCode = importContext?.defaultCategoryCode ?? ''
    dsForm.importContextDefaultLevelCode = importContext?.defaultLevelCode ?? ''
    dsForm.importContextCommit = importContext?.commit !== false
    dsForm.importContextConfirmManualConflicts = Boolean(importContext?.confirmManualConflicts)
    dsForm.importContextExpectedConfigUpdateToken = importContext?.expectedConfigUpdateToken ?? ''
    return
  }
  if (row.pathwayCode === PortfolioIntegrationPathwayCodeEnum.MESSAGE_PUSH) {
    dsForm.batchSize = config.batchSize ?? 100
    return
  }
  if (row.channelCode === PortfolioIntegrationChannelCodeEnum.NATIONAL_TEACHER_SYSTEM) {
    dsForm.syncDirection
      = config.syncDirection === PortfolioNationalTeacherSyncDirectionEnum.INBOUND
        ? PortfolioNationalTeacherSyncDirectionEnum.INBOUND
        : PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND
    dsForm.inboundRecords = (config.inboundRecords ?? []).map((item) => ({
      teacherNumber: item.teacherNumber ?? '',
      teacherName: item.teacherName ?? '',
      title: item.title ?? '',
      employmentStatus: item.employmentStatus ?? '',
    }))
  }
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
  { value: 'REPLACE', label: '全文替换' },
  { value: 'CONDITIONAL_ASSIGN', label: '条件赋值' },
]
const mappingTransformExprPlaceholder = computed(() => {
  if (mappingForm.transformType === 'SUBSTRING') return '起始位置,长度，例如 0,8'
  if (mappingForm.transformType === 'PREFIX_SUFFIX') return '前缀|后缀，例如 工号-| -2026'
  if (mappingForm.transformType === 'LOOKUP_COURSE_CODE') return '来源系统编码；留空使用数据源渠道'
  if (mappingForm.transformType === 'REPLACE') return '原串|新串，例如 旧-|新-'
  if (mappingForm.transformType === 'CONDITIONAL_ASSIGN') return 'A=>甲;B=>乙;*=>默认'
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
const payloadFieldEdits = ref<PortfolioIntegrationPayloadFieldDto[]>([])
const requeueMessage = ref('管理员修正字段后重入队')
const messageEnqueueForm = reactive({
  datasourceConfigId: '',
  messageKey: '',
  teacherNumber: '',
  teacherCode: '',
  teacherName: '',
  externalRecordKey: '',
  fields: [
    { fieldCode: 'achievement_title', fieldValue: '' },
  ] as PortfolioIntegrationPayloadFieldDto[],
})
const requeueEnvelope = reactive({
  teacherNumber: '',
  teacherCode: '',
  teacherName: '',
  externalRecordKey: '',
})

const datasourceOptions = computed(() =>
  datasources.value.map((item) => ({ value: item.id, label: item.datasourceName })),
)
const messageDatasourceOptions = computed(() =>
  datasources.value
    .filter((item) => item.pathwayCode === PortfolioIntegrationPathwayCodeEnum.MESSAGE_PUSH)
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
  { title: '操作', key: 'actions', width: 200 },
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
  { title: '教师编号', dataIndex: 'teacherId', key: 'teacherId', width: 120 },
  { title: '外部值', dataIndex: 'externalValue', key: 'externalValue', ellipsis: true },
  { title: '本地值', dataIndex: 'localValue', key: 'localValue', ellipsis: true },
  { title: '状态', dataIndex: 'ticketStatus', key: 'ticketStatus', width: 120 },
  { title: '操作', key: 'actions', width: 280 },
]

const failedMessageColumns: ColumnsType = [
  { title: '渠道', dataIndex: 'channelCode', key: 'channelCode', width: 130 },
  { title: '消息键', dataIndex: 'messageKey', key: 'messageKey', width: 210, ellipsis: true },
  { title: '契约', key: 'payloadContract', width: 90 },
  { title: '重试次数', dataIndex: 'retryCount', key: 'retryCount', width: 90 },
  { title: '失败原因', dataIndex: 'processMessage', key: 'processMessage', ellipsis: true },
  { title: '失败时间', dataIndex: 'processedTime', key: 'processedTime', width: 170 },
  { title: '操作', key: 'actions', width: 190, fixed: 'right' },
]

const MESSAGE_ENVELOPE_RESERVED_FIELD_CODES = new Set([
  'teacher_number',
  'teacher_code',
  'teacher_name',
  'external_record_key',
])

function hasReservedBagFieldCode(fields: Array<{ fieldCode: string }>) {
  return fields.some((item) => MESSAGE_ENVELOPE_RESERVED_FIELD_CODES.has(item.fieldCode.trim()))
}

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

const nationalIssueColumns: ColumnsType = [
  { title: '工号', dataIndex: 'teacherNumber', key: 'teacherNumber', width: 120 },
  { title: '姓名', dataIndex: 'teacherName', key: 'teacherName', width: 120 },
  { title: '问题编码', dataIndex: 'issueCodes', key: 'issueCodes', width: 200 },
  { title: '明细', key: 'issueDetails', ellipsis: true },
  { title: '状态', dataIndex: 'statusLabel', key: 'statusLabel', width: 100 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
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
  return Boolean(row.matchHints?.includes(IDENTITY_HINT_MISSING_TEACHER_NUMBER))
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
      requestToken.archiveFields !== currentToken
      || mappingForm.targetCategoryCode !== categoryCode
    ) {
      return
    }
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
      selectedDatasourceId.value
      && !datasources.value.some((item) => item.id === selectedDatasourceId.value)
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

async function loadNationalIssues() {
  const currentToken = ++requestToken.nationalIssues
  const request = {
    pageNum: nationalIssueQuery.pageNum,
    pageSize: nationalIssueQuery.pageSize,
    status: nationalIssueQuery.status || undefined,
  }
  loadState.nationalIssues = true
  loadError.nationalIssues = ''
  try {
    const res = await portfolioIntegrationApi.pageNationalReportIssues(request)
    if (requestToken.nationalIssues !== currentToken) return
    nationalIssues.value = res.list ?? []
    nationalIssueTotal.value = res.total ?? 0
  } catch (error) {
    if (requestToken.nationalIssues !== currentToken) return
    nationalIssues.value = []
    nationalIssueTotal.value = 0
    loadError.nationalIssues = '全国上报待修正加载失败，请重试'
    showUserError(error, '加载全国上报待修正失败')
  } finally {
    if (requestToken.nationalIssues === currentToken) {
      loadState.nationalIssues = false
    }
  }
}

async function fixNationalReportIssue(row: PortfolioNationalReportIssueVO) {
  const operation = `national-issue:${row.id}`
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      title: '确认已修正并关闭？',
      content:
        '将复检教师名册必填项；仍失败则刷新明细并拒绝关闭。请先在人事主数据补齐工号/姓名/职称/院系/出生日期/学历/性别。',
      type: 'warning',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    await portfolioIntegrationApi.fixNationalReportIssue({
      issueId: row.id,
      fixRemark: '管理端确认已修正',
    })
    void message.success('上报待修正已关闭')
    await loadNationalIssues()
  } catch (error) {
    showUserError(error, '关闭上报待修正失败')
    await loadNationalIssues()
  } finally {
    endOperation(operation)
  }
}

function onNationalIssuePageChange(page: { current: number, pageSize: number }) {
  nationalIssueQuery.pageNum = page.current
  nationalIssueQuery.pageSize = page.pageSize
  void loadNationalIssues()
}

function searchNationalIssues() {
  nationalIssueQuery.pageNum = 1
  void loadNationalIssues()
}

async function exportNationalReportForIssue(row: PortfolioNationalReportIssueVO) {
  if (!row.syncTaskId) {
    showFormValidationMessage('该待修正未关联同步任务，无法导出批次包')
    return
  }
  const operation = `national-export:${row.syncTaskId}`
  if (!beginOperation(operation)) return
  try {
    const res = await portfolioIntegrationApi.exportNationalReportPackage({
      syncTaskId: String(row.syncTaskId),
      maskMode: true,
    })
    void message.success(`上报包已导出：${res.fileName || res.fileNodeId}`)
  } catch (error) {
    showUserError(error, '导出全国上报包失败（须批次存在校验通过记录）')
  } finally {
    endOperation(operation)
  }
}

async function retransmitNationalReportIssues() {
  const nationalDatasource = datasources.value.find(
    (item) =>
      item.channelCode === PortfolioIntegrationChannelCodeEnum.NATIONAL_TEACHER_SYSTEM
      && item.pathwayCode === PortfolioIntegrationPathwayCodeEnum.OPENAPI,
  )
  if (!nationalDatasource) {
    showFormValidationMessage('请先配置并启用全国教师系统 OPENAPI 数据源')
    return
  }
  const operation = 'national-retransmit'
  if (!beginOperation(operation)) return
  if (
    !(await confirmAsync({
      title: '确认重传全部待修正？',
      content: '将复检当前 OPEN 待修正教师；通过的自动关闭并生成新批次包，仍失败则刷新明细。',
      type: 'warning',
    }))
  ) {
    endOperation(operation)
    return
  }
  try {
    const batch = await portfolioIntegrationApi.retransmitNationalReportIssues({
      datasourceConfigId: nationalDatasource.id,
    })
    void message.success(
      `重传完成：成功 ${batch.successCount ?? 0}，失败 ${batch.failedCount ?? 0}`,
    )
    await Promise.all([loadNationalIssues(), loadSyncTasks()])
  } catch (error) {
    showUserError(error, '重传全国上报失败记录失败')
    await loadNationalIssues()
  } finally {
    endOperation(operation)
  }
}

async function loadChannelPathwayMatrix() {
  channelPathwayMatrix.value = await portfolioIntegrationApi.channelPathwayMatrix()
  // 当前渠道无通路时回落到矩阵首项
  const options = datasourcePathwayOptions.value
  if (options.length > 0 && !options.some((item) => item.value === dsForm.pathwayCode)) {
    dsForm.pathwayCode = options[0].value
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
      requestToken.failedMessages !== currentToken
      || failedMessageDatasourceId.value !== datasourceConfigId
    ) {
      return
    }
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

/** 管理员向 MESSAGE_PUSH 数据源投递测试/补录消息，进入收件箱待同步。 */
async function enqueueInboundMessage() {
  const datasourceConfigId = messageEnqueueForm.datasourceConfigId.trim()
  const messageKey = messageEnqueueForm.messageKey.trim()
  const teacherNumber = messageEnqueueForm.teacherNumber.trim()
  const teacherCode = messageEnqueueForm.teacherCode.trim()
  const teacherName = messageEnqueueForm.teacherName.trim()
  const externalRecordKey = messageEnqueueForm.externalRecordKey.trim()
  const fields = messageEnqueueForm.fields
    .map((item) => ({
      fieldCode: item.fieldCode.trim(),
      fieldValue: item.fieldValue.trim(),
    }))
    .filter((item) => item.fieldCode && item.fieldValue)
  if (!datasourceConfigId) {
    showFormValidationMessage('请选择消息推送数据源')
    return
  }
  if (!messageKey) {
    showFormValidationMessage('请填写消息幂等键')
    return
  }
  if (!teacherNumber && !teacherCode) {
    showFormValidationMessage('信封须填写教师工号或教师编码')
    return
  }
  if (!fields.length) {
    showFormValidationMessage('业务字段袋不能为空')
    return
  }
  if (hasReservedBagFieldCode(fields)) {
    showFormValidationMessage(
      '字段袋不得包含 teacher_number/teacher_code/teacher_name/external_record_key',
    )
    return
  }
  const operation = 'message:enqueue'
  if (!beginOperation(operation)) return
  try {
    const inboxId = await portfolioIntegrationApi.enqueueMessage({
      datasourceConfigId,
      messageKey,
      teacherNumber: teacherNumber || undefined,
      teacherCode: teacherCode || undefined,
      teacherName: teacherName || undefined,
      externalRecordKey: externalRecordKey || undefined,
      fields,
    })
    void message.success(`消息已入站，收件箱 ID：${inboxId}`)
    if (!failedMessageDatasourceId.value) {
      failedMessageDatasourceId.value = datasourceConfigId
    }
    if (failedMessageDatasourceId.value === datasourceConfigId) {
      await loadFailedMessages()
    }
  } catch (error) {
    showUserError(error, '消息入站失败')
  } finally {
    endOperation(operation)
  }
}

function addEnqueuePayloadField() {
  messageEnqueueForm.fields.push({ fieldCode: '', fieldValue: '' })
}

function removeEnqueuePayloadField(index: number) {
  if (messageEnqueueForm.fields.length <= 1) {
    showFormValidationMessage('至少保留一个业务字段')
    return
  }
  messageEnqueueForm.fields.splice(index, 1)
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
  if (!dsForm.datasourceName.trim()) {
    endOperation(operation)
    showFormValidationMessage('请填写数据源名称')
    return
  }
  if (
    isNationalTeacherOpenApi.value
    && dsForm.syncDirection === PortfolioNationalTeacherSyncDirectionEnum.INBOUND
  ) {
    const validRows = dsForm.inboundRecords.filter((item) => item.teacherNumber.trim())
    if (validRows.length === 0) {
      endOperation(operation)
      showFormValidationMessage('回流配置须至少填写一条教师工号')
      return
    }
  }
  if (isJdbcPathway.value) {
    if (!dsForm.jdbcUrl.trim() || !dsForm.username.trim() || !dsForm.querySql.trim()) {
      endOperation(operation)
      showFormValidationMessage('JDBC 须填写连接地址、用户名与查询 SQL')
      return
    }
    if (!dsForm.password.trim() && !dsForm.passwordConfigured) {
      endOperation(operation)
      showFormValidationMessage('新建 JDBC 数据源必须填写密码')
      return
    }
  }
  if (isSoapPathway.value) {
    if (!dsForm.endpointUrl.trim() || !dsForm.requestEnvelope.trim()) {
      endOperation(operation)
      showFormValidationMessage('SOAP 须填写端点 URL 与 Envelope')
      return
    }
  }
  if (isExcelPathway.value) {
    if (!dsForm.sourceFileNodeId.trim()) {
      endOperation(operation)
      showFormValidationMessage('Excel 导入须填写文件节点 ID')
      return
    }
  }
  const request = {
    id: dsForm.id,
    channelCode: dsForm.channelCode,
    pathwayCode: dsForm.pathwayCode,
    datasourceName: dsForm.datasourceName.trim(),
    enabled: dsForm.enabled,
    connectionConfig: buildConnectionConfig(),
  }
  try {
    await portfolioIntegrationApi.saveDatasource(request)
    void message.success(editingDatasource.value ? '数据源已更新' : '数据源已保存')
    resetDatasourceForm()
    datasourceQuery.pageNum = 1
    await loadDatasources()
  } catch (error) {
    showUserError(error, '保存数据源失败')
  } finally {
    endOperation(operation)
  }
}

async function saveMapping() {
  const datasourceConfigId = selectedDatasourceId.value
  if (!datasourceConfigId) {
    showFormValidationMessage('请先选择数据源')
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
    void message.success('字段映射已保存')
    mappingForm.sourceFieldCode = ''
    mappingForm.targetFieldCode = ''
    mappingForm.targetCategoryCode = ''
    mappingForm.dictionaryCode = ''
    mappingForm.transformType = 'NONE'
    mappingForm.transformExpr = ''
    if (selectedDatasourceId.value === datasourceConfigId) await loadMappings()
  } catch (error) {
    showUserError(error, '保存字段映射失败')
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
    void message.success('同步已触发')
    await Promise.all([
      loadSyncTasks(),
      loadDatasources(),
      loadHealth(),
      loadUnmatched(),
      loadConflicts(),
      loadNationalIssues(),
    ])
  } catch (error) {
    showUserError(error, '触发同步失败')
  } finally {
    endOperation(operation)
  }
}

async function resolveConflict(
  row: PortfolioConflictTicketVO,
  action: PortfolioConflictTicketStatusEnum,
) {
  const conflictTicketId = row.id
  const operation = `conflict:${conflictTicketId}:${action}`
  if (!beginOperation(operation)) return
  const actionLabel
    = action === PortfolioConflictTicketStatusEnum.RESOLVED_USE_EXTERNAL
      ? '冲突采用外部'
      : action === PortfolioConflictTicketStatusEnum.RESOLVED_USE_LOCAL
        ? '冲突保留本地'
        : '忽略冲突单'
  if (!(await bindActionTeacherAndAssert(row.teacherId, actionLabel))) {
    endOperation(operation)
    return
  }
  if (
    action === PortfolioConflictTicketStatusEnum.IGNORED
    && !(await confirmAsync({
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
      resolveRemark:
        action === PortfolioConflictTicketStatusEnum.IGNORED ? '管理端忽略冲突' : '管理端确认处置',
    })
    void message.success('冲突已处理')
    conflictQuery.pageNum = 1
    await loadConflicts()
  } catch (error) {
    showUserError(error, '处理冲突单失败')
  } finally {
    endOperation(operation)
  }
}

async function resolveIdentityUnmatched(
  row: PortfolioIdentityUnmatchedVO,
  action: PortfolioIdentityUnmatchedStatusEnum,
) {
  const identityUnmatchedId = row.id
  if (action === PortfolioIdentityUnmatchedStatusEnum.RESOLVED && !identityResolveTeacherId.value) {
    showFormValidationMessage('绑定本地教师须选择教师')
    return
  }
  if (
    action === PortfolioIdentityUnmatchedStatusEnum.RESOLVED
    && needsTeacherNumber(row)
    && !identityResolveTeacherNumber.value.trim()
  ) {
    showFormValidationMessage('缺少工号待匹配须补录工号')
    return
  }
  const operation = `identity:${identityUnmatchedId}:${action}`
  if (!beginOperation(operation)) return
  if (action === PortfolioIdentityUnmatchedStatusEnum.RESOLVED) {
    if (!(await bindActionTeacherAndAssert(identityResolveTeacherId.value, '身份绑定本地教师'))) {
      endOperation(operation)
      return
    }
  }
  if (
    action === PortfolioIdentityUnmatchedStatusEnum.IGNORED
    && !(await confirmAsync({
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
      resolvedTeacherId:
        action === PortfolioIdentityUnmatchedStatusEnum.RESOLVED ? resolvedTeacherId : undefined,
      resolvedTeacherNumber:
        action === PortfolioIdentityUnmatchedStatusEnum.RESOLVED && needsTeacherNumber(row)
          ? resolvedTeacherNumber
          : undefined,
      resolveRemark:
        action === PortfolioIdentityUnmatchedStatusEnum.RESOLVED
          ? '管理端绑定本地教师'
          : '管理端忽略待匹配',
    })
    void message.success('身份待匹配已处置')
    identityResolveTeacherId.value = ''
    identityResolveTeacherNumber.value = ''
    identityResolveRowId.value = ''
    unmatchedQuery.pageNum = 1
    await loadUnmatched()
  } catch (error) {
    showUserError(error, '处置身份待匹配失败')
  } finally {
    endOperation(operation)
  }
}

function openFailedMessageFix(row: PortfolioIntegrationMessageInboxVO) {
  selectedFailedMessage.value = row
  requeueEnvelope.teacherNumber = row.teacherNumber ?? ''
  requeueEnvelope.teacherCode = row.teacherCode ?? ''
  requeueEnvelope.teacherName = row.teacherName ?? ''
  requeueEnvelope.externalRecordKey = row.externalRecordKey ?? ''
  const sourceFields
    = row.payloadContractValid === false
      ? [{ fieldCode: 'achievement_title', fieldValue: '' }]
      : (row.fields ?? [])
  payloadFieldEdits.value = sourceFields.map((item) => ({
    fieldCode: item.fieldCode,
    fieldValue: item.fieldValue ?? '',
  }))
  requeueMessage.value
    = row.payloadContractValid === false ? '管理员整包替换非法载荷后重入队' : '管理员修正字段后重入队'
  failedMessageDrawerOpen.value = true
}

function addRequeuePayloadField() {
  payloadFieldEdits.value.push({ fieldCode: '', fieldValue: '' })
}

function removeRequeuePayloadField(index: number) {
  if (payloadFieldEdits.value.length <= 1) {
    showFormValidationMessage('至少保留一个业务字段')
    return
  }
  payloadFieldEdits.value.splice(index, 1)
}

async function requeueFailedMessage(row: PortfolioIntegrationMessageInboxVO, corrected = false) {
  const messageInboxId = row.id
  const datasourceConfigId = row.datasourceConfigId
  if (!corrected && row.payloadContractValid === false) {
    showFormValidationMessage('非法载荷不可原样重试，请打开修正重放并整包替换信封与字段袋')
    return
  }
  let fieldCorrections: Array<{ fieldCode: string, fieldValue: string }> | undefined
  let teacherNumber: string | undefined
  let teacherCode: string | undefined
  let teacherName: string | undefined
  let externalRecordKey: string | undefined
  if (corrected) {
    teacherNumber = requeueEnvelope.teacherNumber.trim() || undefined
    teacherCode = requeueEnvelope.teacherCode.trim() || undefined
    teacherName = requeueEnvelope.teacherName.trim() || undefined
    externalRecordKey = requeueEnvelope.externalRecordKey.trim() || undefined
    fieldCorrections = payloadFieldEdits.value
      .map((item) => ({
        fieldCode: item.fieldCode.trim(),
        fieldValue: item.fieldValue.trim(),
      }))
      .filter((item) => item.fieldCode && item.fieldValue)
    if (row.payloadContractValid === false) {
      if (!teacherNumber && !teacherCode) {
        showFormValidationMessage('非法载荷须整包替换：请填写教师工号或教师编码')
        return
      }
      if (!fieldCorrections.length) {
        showFormValidationMessage('非法载荷须整包替换：请填写完整业务字段袋')
        return
      }
    } else if (
      !teacherNumber
      && !teacherCode
      && !teacherName
      && !externalRecordKey
      && !fieldCorrections.length
    ) {
      showFormValidationMessage('请至少修正信封身份键或一个业务字段')
      return
    }
    if (fieldCorrections.length && hasReservedBagFieldCode(fieldCorrections)) {
      showFormValidationMessage(
        '字段袋不得包含 teacher_number/teacher_code/teacher_name/external_record_key',
      )
      return
    }
  }
  const operation = `failed-message:${messageInboxId}`
  if (!beginOperation(operation)) return
  if (
    !corrected
    && !(await confirmAsync({
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
      teacherNumber,
      teacherCode,
      teacherName,
      externalRecordKey,
      fieldCorrections,
      triggerSync: true,
    })
    void message.success('异常消息已重放并触发同步')
    failedMessageDrawerOpen.value = false
    selectedFailedMessage.value = null
    payloadFieldEdits.value = []
    const reloads = [
      await loadSyncTasks(),
      await loadHealth(),
      await loadUnmatched(),
      await loadConflicts(),
      await loadNationalIssues(),
    ]
    if (failedMessageDatasourceId.value === datasourceConfigId)
      reloads.push(await loadFailedMessages())
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
    !courseCodeMapForm.sourceSystemCode.trim()
    || !courseCodeMapForm.sourceCourseCode.trim()
    || !courseCodeMapForm.canonicalCourseCode.trim()
    || !courseCodeMapForm.canonicalCourseName.trim()
  ) {
    showFormValidationMessage('请填写来源系统、源课程编码和规范课程编码/名称')
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
    void message.success('课程编码对照已保存')
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
    void message.success('课程编码对照已删除')
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
    !dictEntryForm.dictionaryCode.trim()
    || !dictEntryForm.sourceValue.trim()
    || !dictEntryForm.targetValue.trim()
  ) {
    showFormValidationMessage('请填写字典编码、源值和规范值')
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
    void message.success('字段字典项已保存')
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
    void message.success('字段字典项已删除')
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

function onDatasourcePageChange(page: { current: number, pageSize: number }) {
  datasourceQuery.pageNum = page.current
  datasourceQuery.pageSize = page.pageSize
  void loadDatasources()
}

function onSyncTaskPageChange(page: { current: number, pageSize: number }) {
  syncTaskQuery.pageNum = page.current
  syncTaskQuery.pageSize = page.pageSize
  void loadSyncTasks()
}

function onUnmatchedPageChange(page: { current: number, pageSize: number }) {
  unmatchedQuery.pageNum = page.current
  unmatchedQuery.pageSize = page.pageSize
  void loadUnmatched()
}

function onConflictPageChange(page: { current: number, pageSize: number }) {
  conflictQuery.pageNum = page.current
  conflictQuery.pageSize = page.pageSize
  void loadConflicts()
}

function onFailedMessagePageChange(page: { current: number, pageSize: number }) {
  failedMessageQuery.pageNum = page.current
  failedMessageQuery.pageSize = page.pageSize
  void loadFailedMessages()
}

function onCleanLogPageChange(page: { current: number, pageSize: number }) {
  cleanLogQuery.pageNum = page.current
  cleanLogQuery.pageSize = page.pageSize
  void loadCleanLogs()
}

function onCourseCodeMapPageChange(page: { current: number, pageSize: number }) {
  courseCodeMapQuery.pageNum = page.current
  courseCodeMapQuery.pageSize = page.pageSize
  void loadCourseCodeMaps()
}

function onDictEntryPageChange(page: { current: number, pageSize: number }) {
  dictEntryQuery.pageNum = page.current
  dictEntryQuery.pageSize = page.pageSize
  void loadDictEntries()
}

onMounted(async () => {
  // 矩阵优先：数据源表单渠道/通路选项依赖后端真源
  await loadChannelPathwayMatrix()
  await Promise.all([loadTeachers(), loadDatasources(), loadArchiveCategories()])
  await Promise.all([
    loadMappings(),
    loadSyncTasks(),
    loadUnmatched(),
    loadConflicts(),
    loadNationalIssues(),
    loadHealth(),
    loadCleanLogs(),
    loadCourseCodeMaps(),
    loadDictEntries(),
  ])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="数据集成中心"
        subtitle="八渠道配置、同步监控与渠道健康"
      />
    </template>
    <UiSectionTabs v-model:active-key="activeTab" :items="tabItems" />

    <WorkbenchSurfaceCard v-if="activeTab === 'datasource'" class="integration-dashboard__panel">
      <template #head>
        <span class="integration-dashboard__panel-title">数据源配置</span>
      </template>
      <div class="integration-dashboard__preset-bar">
        <span class="integration-dashboard__preset-label">全国教师系统（同渠道仅一条 OPENAPI，切换方向即编辑现有配置）</span>
        <UiButton
          size="sm"
          :disabled="writing || editingDatasource"
          @click="applyNationalTeacherPreset(PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND)"
        >
          上报方向
        </UiButton>
        <UiButton
          size="sm"
          :disabled="writing || editingDatasource"
          @click="applyNationalTeacherPreset(PortfolioNationalTeacherSyncDirectionEnum.INBOUND)"
        >
          回流方向
        </UiButton>
        <UiButton
          v-if="editingDatasource"
          size="sm"
          :disabled="writing"
          @click="resetDatasourceForm"
        >
          取消编辑
        </UiButton>
      </div>
      <div class="integration-dashboard__form">
        <label>渠道</label>
        <UiSelect
          size="sm"
          v-model="dsForm.channelCode"
          :options="datasourceChannelOptions"
          :disabled="writing || editingDatasource"
          @change="changeDatasourceChannel"
        />
        <label>通路</label>
        <UiSelect
          size="sm"
          v-model="dsForm.pathwayCode"
          :options="datasourcePathwayOptions"
          :disabled="writing || editingDatasource"
          @change="changeDatasourcePathway"
        />
        <label>名称</label>
        <input
          v-model="dsForm.datasourceName"
          class="integration-dashboard__input"
          :disabled="writing"
        />
        <label>启用</label>
        <label class="integration-dashboard__inline-check">
          <input v-model="dsForm.enabled" type="checkbox" :disabled="writing" />
          {{ dsForm.enabled ? '已启用' : '已停用' }}
        </label>
      </div>

      <p v-if="isHrOpenApi" class="integration-dashboard__hint">
        人事开放接口读取本租户 edu-user 教师名册，无需填写连接配置。
      </p>
      <p v-if="isScientificResearchChannel" class="integration-dashboard__hint">
        科研系统专用域必须提供 fact_kind（{{ scientificResearchFactKindHint }}）。 荣誉写入发展记录
        HONOR；论文/项目写入 ACHIEVEMENT。 论文/项目落库外源键自动规范为 PUBLICATION:原始ID /
        PROJECT:原始ID，同渠道同号互不覆盖。 category_code 须为租户启用档案分类，供职称
        PUBLICATION_COUNT / PROJECT_COUNT 自动核验。
      </p>

      <div v-if="isNationalTeacherOpenApi" class="integration-dashboard__config-panel">
        <label>同步方向</label>
        <UiSelect
          size="sm"
          v-model="dsForm.syncDirection"
          :options="[
            { value: PortfolioNationalTeacherSyncDirectionEnum.OUTBOUND, label: '上报校验' },
            { value: PortfolioNationalTeacherSyncDirectionEnum.INBOUND, label: '回流比对' },
          ]"
          :disabled="writing"
        />
        <template v-if="dsForm.syncDirection === PortfolioNationalTeacherSyncDirectionEnum.INBOUND">
          <div class="integration-dashboard__inbound-head">
            <strong>回流记录</strong>
            <UiButton variant="primary" size="sm" :disabled="writing" @click="addInboundRecord">
              添加行
            </UiButton>
          </div>
          <div
            v-for="(item, index) in dsForm.inboundRecords"
            :key="index"
            class="integration-dashboard__inbound-row"
          >
            <input
              v-model="item.teacherNumber"
              class="integration-dashboard__input"
              placeholder="工号*"
              :disabled="writing"
            />
            <input
              v-model="item.teacherName"
              class="integration-dashboard__input"
              placeholder="姓名"
              :disabled="writing"
            />
            <input
              v-model="item.title"
              class="integration-dashboard__input"
              placeholder="职称"
              :disabled="writing"
            />
            <input
              v-model="item.employmentStatus"
              class="integration-dashboard__input"
              placeholder="在岗状态"
              :disabled="writing"
            />
            <UiButton size="sm" :disabled="writing" @click="removeInboundRecord(index)">
              删除
            </UiButton>
          </div>
        </template>
      </div>

      <div v-else-if="isJdbcPathway" class="integration-dashboard__config-panel">
        <label>JDBC URL</label>
        <input
          v-model="dsForm.jdbcUrl"
          class="integration-dashboard__input integration-dashboard__input--wide"
          :disabled="writing"
          placeholder="jdbc:postgresql://host:5432/db"
        />
        <label>用户名</label>
        <input v-model="dsForm.username" class="integration-dashboard__input" :disabled="writing" />
        <label>密码</label>
        <input
          v-model="dsForm.password"
          type="password"
          class="integration-dashboard__input"
          :disabled="writing"
          :placeholder="dsForm.passwordConfigured ? '留空或********表示保留原密码' : '必填'"
        />
        <label>查询 SQL</label>
        <textarea
          v-model="dsForm.querySql"
          class="integration-dashboard__textarea"
          :disabled="writing"
          placeholder="须返回 teacher_code 或 teacher_number；增量时含 ${lastSyncTime}"
        />
        <label class="integration-dashboard__inline-check">
          <input v-model="dsForm.incremental" type="checkbox" :disabled="writing" />
          增量同步
        </label>
        <template v-if="dsForm.incremental">
          <label>初始水位</label>
          <input
            v-model="dsForm.initialWatermark"
            class="integration-dashboard__input"
            :disabled="writing"
            placeholder="yyyy-MM-dd HH:mm:ss"
          />
        </template>
      </div>

      <div v-else-if="isSoapPathway" class="integration-dashboard__config-panel">
        <label>端点 URL</label>
        <input
          v-model="dsForm.endpointUrl"
          class="integration-dashboard__input integration-dashboard__input--wide"
          :disabled="writing"
        />
        <label>SOAPAction</label>
        <input
          v-model="dsForm.soapAction"
          class="integration-dashboard__input integration-dashboard__input--wide"
          :disabled="writing"
          placeholder="可空"
        />
        <label>Envelope</label>
        <textarea
          v-model="dsForm.requestEnvelope"
          class="integration-dashboard__textarea"
          :disabled="writing"
        />
        <label>记录元素名</label>
        <input
          v-model="dsForm.recordElementLocalName"
          class="integration-dashboard__input"
          :disabled="writing"
          placeholder="默认 Record"
        />
        <label>读超时(秒)</label>
        <input
          v-model.number="dsForm.readTimeoutSeconds"
          type="number"
          min="1"
          class="integration-dashboard__input"
          :disabled="writing"
        />
      </div>

      <div v-else-if="isExcelPathway" class="integration-dashboard__config-panel">
        <label>导入 Scene</label>
        <UiSelect
          size="sm"
          v-model="dsForm.excelImportSceneKey"
          :options="
            isScientificResearchChannel
              ? PORTFOLIO_EXCEL_IMPORT_SCENE_OPTIONS.filter(
                (item) => item.value === 'PORTFOLIO_SCIENTIFIC_RESEARCH_FACT',
              )
              : PORTFOLIO_EXCEL_IMPORT_SCENE_OPTIONS.filter(
                (item) => item.value !== 'PORTFOLIO_SCIENTIFIC_RESEARCH_FACT',
              )
          "
          :disabled="writing || isScientificResearchChannel"
        />
        <label>文件节点 ID</label>
        <input
          v-model="dsForm.sourceFileNodeId"
          class="integration-dashboard__input"
          :disabled="writing"
          placeholder="平台存储 fileNodeId"
        />
        <label>导入文件名</label>
        <input
          v-model="dsForm.importContextFileName"
          class="integration-dashboard__input integration-dashboard__input--wide"
          :disabled="writing"
          placeholder="可选"
        />
        <label>默认记录类型</label>
        <input
          v-model="dsForm.importContextDefaultRecordType"
          class="integration-dashboard__input"
          :disabled="writing"
          placeholder="发展记录导入"
        />
        <label>默认类目编码</label>
        <input
          v-model="dsForm.importContextDefaultCategoryCode"
          class="integration-dashboard__input"
          :disabled="writing"
        />
        <label>默认层级编码</label>
        <input
          v-model="dsForm.importContextDefaultLevelCode"
          class="integration-dashboard__input"
          :disabled="writing"
        />
        <label>立即提交</label>
        <UiSwitch size="sm" v-model="dsForm.importContextCommit" :disabled="writing" />
        <label>确认人工冲突</label>
        <UiSwitch
          size="sm"
          v-model="dsForm.importContextConfirmManualConflicts"
          :disabled="writing"
        />
        <label>配置更新令牌</label>
        <input
          v-model="dsForm.importContextExpectedConfigUpdateToken"
          class="integration-dashboard__input integration-dashboard__input--wide"
          :disabled="writing"
          placeholder="发展计划历史导入可选"
        />
      </div>

      <div v-else-if="isMessagePathway" class="integration-dashboard__config-panel">
        <label>单批条数</label>
        <input
          v-model.number="dsForm.batchSize"
          type="number"
          min="1"
          class="integration-dashboard__input"
          :disabled="writing"
        />
      </div>

      <div class="integration-dashboard__form-actions">
        <UiButton
          size="sm"
          variant="primary"
          :loading="operationKey === 'datasource:save'"
          :disabled="writing"
          @click="saveDatasource"
        >
          {{ editingDatasource ? '更新数据源' : '保存数据源' }}
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
            <div class="integration-dashboard__row-actions">
              <UiButton size="sm" :disabled="writing" @click="fillDatasourceForm(record)">
                编辑
              </UiButton>
              <UiButton
                variant="primary"
                size="sm"
                :loading="operationKey === `sync:trigger:${record.id}`"
                :disabled="writing"
                @click="triggerSync(record)"
              >
                触发同步
              </UiButton>
            </div>
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard v-else-if="activeTab === 'mapping'" class="integration-dashboard__panel">
      <template #head>
        <span class="integration-dashboard__panel-title">字段映射</span>
      </template>
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
        <UiSelect
          size="sm"
          :model-value="mappingForm.targetCategoryCode || undefined"
          allow-clear
          :options="archiveCategoryOptions"
          :disabled="writing"
          placeholder="不入档时留空"
          @change="changeMappingCategory"
        />
        <label>目标字段</label>
        <UiSelect
          size="sm"
          v-if="mappingForm.targetCategoryCode"
          v-model="mappingForm.targetFieldCode"
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
        <UiSelect
          size="sm"
          v-model="mappingForm.transformType"
          :options="mappingTransformOptions"
          :disabled="writing"
        />
        <label v-if="mappingTransformExprPlaceholder">转换参数</label>
        <UiInput
          size="sm"
          v-if="mappingTransformExprPlaceholder"
          v-model="mappingForm.transformExpr"
          :placeholder="mappingTransformExprPlaceholder"
          :disabled="writing"
        />
        <UiButton
          variant="primary"
          size="sm"
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
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard
      v-else-if="activeTab === 'course-map'"
      class="integration-dashboard__panel"
    >
      <template #head>
        <span class="integration-dashboard__panel-title">课程编码对照</span>
      </template>
      <div class="integration-dashboard__filter-bar">
        <UiInput
          size="sm"
          v-model="courseCodeMapQuery.sourceSystemCode"
          placeholder="来源系统编码"
          clearable
          :disabled="writing"
        />
        <UiInput
          size="sm"
          v-model="courseCodeMapQuery.keyword"
          placeholder="课程编码或名称"
          clearable
          :disabled="writing"
        />
        <UiButton
          size="sm"
          :loading="loadState.courseCodeMaps"
          :disabled="writing"
          @click="searchCourseCodeMaps"
        >
          查询
        </UiButton>
      </div>
      <div class="integration-dashboard__config-grid">
        <UiInput
          size="sm"
          v-model="courseCodeMapForm.sourceSystemCode"
          placeholder="来源系统编码"
          :disabled="writing"
        />
        <UiInput
          size="sm"
          v-model="courseCodeMapForm.sourceCourseCode"
          placeholder="源课程编码"
          :disabled="writing"
        />
        <UiInput
          size="sm"
          v-model="courseCodeMapForm.sourceCourseName"
          placeholder="源课程名称（可选）"
          :disabled="writing"
        />
        <UiInput
          size="sm"
          v-model="courseCodeMapForm.canonicalCourseCode"
          placeholder="校内规范课程编码"
          :disabled="writing"
        />
        <UiInput
          size="sm"
          v-model="courseCodeMapForm.canonicalCourseName"
          placeholder="校内规范课程名称"
          :disabled="writing"
        />
        <UiInput
          size="sm"
          v-model="courseCodeMapForm.remark"
          placeholder="备注（可选）"
          :disabled="writing"
        />
        <UiSwitch
          size="sm"
          v-model="courseCodeMapForm.enabled"
          checked-children="启用"
          un-checked-children="停用"
          :disabled="writing"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="operationKey.startsWith('course-code-map:save:')"
          :disabled="writing"
          @click="saveCourseCodeMap"
        >
          {{ courseCodeMapForm.id ? '保存修改' : '新增对照' }}
        </UiButton>
        <UiButton
          size="sm"
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
            >
              编辑
            </UiButton>
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
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard
      v-else-if="activeTab === 'dictionary'"
      class="integration-dashboard__panel"
    >
      <template #head>
        <span class="integration-dashboard__panel-title">字段转换字典</span>
      </template>
      <div class="integration-dashboard__filter-bar">
        <UiInput
          size="sm"
          v-model="dictEntryQuery.dictionaryCode"
          placeholder="字典编码"
          clearable
          :disabled="writing"
        />
        <UiButton
          size="sm"
          :loading="loadState.dictEntries"
          :disabled="writing"
          @click="searchDictEntries"
        >
          查询
        </UiButton>
      </div>
      <div class="integration-dashboard__config-grid">
        <UiInput
          size="sm"
          v-model="dictEntryForm.dictionaryCode"
          placeholder="字典编码"
          :disabled="writing"
        />
        <UiInput
          size="sm"
          v-model="dictEntryForm.sourceValue"
          placeholder="源系统原始值"
          :disabled="writing"
        />
        <UiInput
          size="sm"
          v-model="dictEntryForm.targetValue"
          placeholder="规范目标值"
          :disabled="writing"
        />
        <UiInput
          size="sm"
          v-model="dictEntryForm.remark"
          placeholder="备注（可选）"
          :disabled="writing"
        />
        <UiSwitch
          size="sm"
          v-model="dictEntryForm.enabled"
          checked-children="启用"
          un-checked-children="停用"
          :disabled="writing"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="operationKey.startsWith('dict-entry:save:')"
          :disabled="writing"
          @click="saveDictEntry"
        >
          {{ dictEntryForm.id ? '保存修改' : '新增字典项' }}
        </UiButton>
        <UiButton
          size="sm"
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
            <UiButton size="sm" variant="ghost" :disabled="writing" @click="editDictEntry(record)">
              编辑
            </UiButton>
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
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard
      v-else-if="activeTab === 'sync'"
      flush
      class="integration-dashboard__panel"
    >
      <template #head>
        <span class="integration-dashboard__panel-title">同步任务</span>
      </template>
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
        flat
        @page-change="onSyncTaskPageChange"
      />
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard
      v-else-if="activeTab === 'clean-log'"
      class="integration-dashboard__panel"
    >
      <template #head>
        <span class="integration-dashboard__panel-title">字段清洗日志</span>
      </template>
      <div class="integration-dashboard__filter-bar">
        <UiSelect
          size="sm"
          v-model="cleanLogDatasourceId"
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
        >
          查询
        </UiButton>
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
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard v-else-if="activeTab === 'queue'" class="integration-dashboard__panel">
      <template #head>
        <span class="integration-dashboard__panel-title">待匹配、冲突与全国上报</span>
      </template>
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
          <template
            v-if="
              column.key === 'actions'
                && record.status === PortfolioIdentityUnmatchedStatusEnum.PENDING
            "
          >
            <template v-if="identityResolveRowId === record.id">
              <UiSelect
                size="sm"
                v-model="identityResolveTeacherId"
                class="integration-dashboard__teacher-select"
                placeholder="选择本地教师"
                :options="teacherOptions"
                allow-search
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
              variant="primary"
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
              variant="primary"
              size="sm"
              :loading="operationKey === `identity:${record.id}:RESOLVED`"
              :disabled="writing"
              @click="
                resolveIdentityUnmatched(record, PortfolioIdentityUnmatchedStatusEnum.RESOLVED)
              "
            >
              确认绑定
            </UiButton>
            <UiButton
              size="sm"
              variant="ghost"
              :loading="operationKey === `identity:${record.id}:IGNORED`"
              :disabled="writing"
              @click="
                resolveIdentityUnmatched(record, PortfolioIdentityUnmatchedStatusEnum.IGNORED)
              "
            >
              忽略
            </UiButton>
          </template>
        </template>
      </UiDataTable>
      <h4 class="integration-dashboard__sub-title">全国教师上报待修正</h4>
      <div class="integration-dashboard__filter-bar">
        <UiSelect
          size="sm"
          v-model="nationalIssueQuery.status"
          allow-clear
          placeholder="全部状态"
          :options="[
            { label: '待修正', value: 'OPEN' },
            { label: '已修正', value: 'FIXED' },
          ]"
          :disabled="writing"
        />
        <UiButton
          size="sm"
          :loading="loadState.nationalIssues"
          :disabled="writing"
          @click="searchNationalIssues"
        >
          查询
        </UiButton>
        <UiButton
          size="sm"
          tone="primary"
          :loading="operationKey === 'national-retransmit'"
          :disabled="writing"
          @click="retransmitNationalReportIssues"
        >
          重传待修正
        </UiButton>
      </div>
      <UiDataTable
        v-model:current="nationalIssueQuery.pageNum"
        v-model:page-size="nationalIssueQuery.pageSize"
        row-key="id"
        :columns="nationalIssueColumns"
        :data-source="nationalIssues"
        :loading="loadState.nationalIssues"
        :load-error="Boolean(loadError.nationalIssues)"
        pagination-mode="server"
        :total="nationalIssueTotal"
        @page-change="onNationalIssuePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'issueDetails'">
            {{ (record.issueDetails || []).join('；') }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              v-if="record.status === 'OPEN'"
              variant="primary"
              size="sm"
              :loading="operationKey === `national-issue:${record.id}`"
              :disabled="writing"
              @click="fixNationalReportIssue(record)"
            >
              确认已修正
            </UiButton>
            <UiButton
              v-if="record.syncTaskId"
              size="sm"
              variant="ghost"
              :loading="operationKey === `national-export:${record.syncTaskId}`"
              :disabled="writing"
              @click="exportNationalReportForIssue(record)"
            >
              导出批次包
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
          <template
            v-if="
              column.key === 'actions'
                && record.ticketStatus === PortfolioConflictTicketStatusEnum.OPEN
            "
          >
            <UiButton
              size="sm"
              :loading="
                operationKey
                  === `conflict:${record.id}:${PortfolioConflictTicketStatusEnum.RESOLVED_USE_LOCAL}`
              "
              :disabled="writing"
              @click="resolveConflict(record, PortfolioConflictTicketStatusEnum.RESOLVED_USE_LOCAL)"
            >
              保留本地
            </UiButton>
            <UiButton
              size="sm"
              :loading="
                operationKey
                  === `conflict:${record.id}:${PortfolioConflictTicketStatusEnum.RESOLVED_USE_EXTERNAL}`
              "
              :disabled="writing"
              @click="
                resolveConflict(record, PortfolioConflictTicketStatusEnum.RESOLVED_USE_EXTERNAL)
              "
            >
              采用外部
            </UiButton>
            <UiButton
              size="sm"
              variant="ghost"
              :loading="
                operationKey
                  === `conflict:${record.id}:${PortfolioConflictTicketStatusEnum.IGNORED}`
              "
              :disabled="writing"
              @click="resolveConflict(record, PortfolioConflictTicketStatusEnum.IGNORED)"
            >
              忽略
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard
      v-else-if="activeTab === 'failed-message'"
      class="integration-dashboard__panel"
    >
      <template #head>
        <span class="integration-dashboard__panel-title">消息推送入站与异常重放</span>
      </template>
      <div class="integration-dashboard__form integration-dashboard__message-enqueue">
        <label>入站数据源</label>
        <UiSelect
          size="sm"
          v-model="messageEnqueueForm.datasourceConfigId"
          placeholder="选择 MESSAGE_PUSH 数据源"
          :options="messageDatasourceOptions"
          :disabled="writing"
        />
        <label>消息幂等键</label>
        <UiInput
          size="sm"
          v-model="messageEnqueueForm.messageKey"
          placeholder="外部系统消息唯一键，重复投递返回同一收件箱"
          :disabled="writing"
        />
        <label>教师工号</label>
        <UiInput
          size="sm"
          v-model="messageEnqueueForm.teacherNumber"
          placeholder="信封身份键 teacherNumber"
          :disabled="writing"
        />
        <label>教师编码</label>
        <UiInput
          size="sm"
          v-model="messageEnqueueForm.teacherCode"
          placeholder="可选，与工号二选一"
          :disabled="writing"
        />
        <label>教师姓名</label>
        <UiInput
          size="sm"
          v-model="messageEnqueueForm.teacherName"
          placeholder="可选"
          :disabled="writing"
        />
        <label>外部记录键</label>
        <UiInput
          size="sm"
          v-model="messageEnqueueForm.externalRecordKey"
          placeholder="可选，缺省用消息幂等键"
          :disabled="writing"
        />
        <label>业务字段袋</label>
        <div class="integration-dashboard__payload-editor">
          <div
            v-for="(item, index) in messageEnqueueForm.fields"
            :key="`enqueue-field-${index}`"
            class="integration-dashboard__payload-field"
          >
            <UiInput
              size="sm"
              v-model="item.fieldCode"
              placeholder="字段编码"
              :disabled="writing"
            />
            <UiInput size="sm" v-model="item.fieldValue" placeholder="字段值" :disabled="writing" />
            <UiButton
              size="sm"
              variant="ghost"
              :disabled="writing"
              @click="removeEnqueuePayloadField(index)"
            >
              删除
            </UiButton>
          </div>
          <UiButton size="sm" variant="ghost" :disabled="writing" @click="addEnqueuePayloadField">
            添加字段
          </UiButton>
        </div>
        <UiButton
          variant="primary"
          size="sm"
          :loading="operationKey === 'message:enqueue'"
          :disabled="writing"
          @click="enqueueInboundMessage"
        >
          投递入站
        </UiButton>
      </div>
      <div class="integration-dashboard__filter-bar" style="margin-top: 16px">
        <UiSelect
          size="sm"
          v-model="failedMessageDatasourceId"
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
        >
          刷新异常队列
        </UiButton>
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
          <template v-if="column.key === 'payloadContract'">
            <UiTag :tone="record.payloadContractValid === false ? 'red' : 'green'">
              {{ record.payloadContractValid === false ? '非法' : '合法' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton
              size="sm"
              variant="ghost"
              :loading="operationKey === `failed-message:${record.id}`"
              :disabled="writing || record.payloadContractValid === false"
              @click="requeueFailedMessage(record)"
            >
              原载荷重试
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :disabled="writing"
              @click="openFailedMessageFix(record)"
            >
              {{ record.payloadContractValid === false ? '整包替换' : '修正重放' }}
            </UiButton>
          </template>
        </template>
        <template #empty>
          <WorkbenchContextGateStrip
            v-if="!failedMessageDatasourceId"
            tag="未选择"
            body="请先选择消息推送数据源后再查看异常重放"
            hide-cta
          />
          <UiEmpty v-else size="sm" description="当前数据源没有异常消息" />
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>

    <WorkbenchSurfaceCard v-else-if="activeTab === 'health'" class="integration-dashboard__panel">
      <template #head>
        <span class="integration-dashboard__panel-title">渠道健康看板</span>
      </template>
      <p v-if="loadState.health" class="integration-dashboard__hint">加载中…</p>
      <p v-else-if="health?.computedTime" class="integration-dashboard__hint">
        计算时间 {{ health.computedTime }}
      </p>
      <UiEmpty
        size="sm"
        v-if="!loadState.health && loadError.health"
        :description="loadError.health"
      />
      <UiEmpty
        size="sm"
        v-else-if="!loadState.health && !health?.channels.length"
        description="暂无渠道健康数据"
      />
      <ul v-else-if="health && !loadState.health" class="integration-dashboard__health-list">
        <li v-for="item in health.channels" :key="`${item.channelCode}-${item.pathwayCode}`">
          <strong>{{ item.channelCode }}</strong> / {{ item.pathwayCode }}
          <UiTag
            :tone="
              item.healthStatus === PortfolioIntegrationHealthStatusEnum.HEALTHY
                ? 'green'
                : 'orange'
            "
          >
            {{ item.healthStatus }}
          </UiTag>
          <span v-if="item.maturityScore">成熟度 {{ item.maturityScore }}</span>
        </li>
      </ul>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>

  <UiDrawer
    v-model:open="failedMessageDrawerOpen"
    title="修正异常消息字段"
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
      <span
        v-if="selectedFailedMessage.payloadContractValid === false"
        class="integration-dashboard__hint"
      >
        载荷契约非法：{{
          selectedFailedMessage.payloadContractMessage
        }}；须整包替换信封与字段袋，禁止原样重试。
      </span>
      <label>修正说明</label>
      <UiInput
        size="sm"
        v-model="requeueMessage"
        placeholder="说明修正内容与重放依据"
        :disabled="writing"
      />
      <label>教师工号</label>
      <UiInput size="sm" v-model="requeueEnvelope.teacherNumber" :disabled="writing" />
      <label>教师编码</label>
      <UiInput size="sm" v-model="requeueEnvelope.teacherCode" :disabled="writing" />
      <label>教师姓名</label>
      <UiInput size="sm" v-model="requeueEnvelope.teacherName" :disabled="writing" />
      <label>外部记录键</label>
      <UiInput size="sm" v-model="requeueEnvelope.externalRecordKey" :disabled="writing" />
      <label>业务字段袋</label>
      <div class="integration-dashboard__payload-editor">
        <div
          v-for="(item, index) in payloadFieldEdits"
          :key="`requeue-field-${index}`"
          class="integration-dashboard__payload-field"
        >
          <UiInput
            size="sm"
            v-model="item.fieldCode"
            placeholder="字段编码"
            :disabled="writing || selectedFailedMessage.payloadContractValid !== false"
          />
          <UiInput size="sm" v-model="item.fieldValue" placeholder="字段值" :disabled="writing" />
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="writing || selectedFailedMessage.payloadContractValid !== false"
            @click="removeRequeuePayloadField(index)"
          >
            删除
          </UiButton>
        </div>
        <UiButton
          v-if="selectedFailedMessage.payloadContractValid === false"
          size="sm"
          variant="ghost"
          :disabled="writing"
          @click="addRequeuePayloadField"
        >
          添加字段
        </UiButton>
      </div>
    </div>
  </UiDrawer>
</template>

<style scoped>
.integration-dashboard__panel {
  margin-top: var(--dp-space-4);
}
.integration-dashboard__panel-title {
  font-size: var(--dp-font-size-md, 15px);
  font-weight: 600;
  color: var(--dp-text-primary);
}
.integration-dashboard__form {
  display: grid;
  grid-template-columns: 80px 1fr 80px 1fr 80px 1fr;
  gap: 8px 12px;
  align-items: center;
  max-width: none;
  margin-bottom: 12px;
}
.integration-dashboard__message-enqueue {
  grid-template-columns: 100px 1fr;
  max-width: 720px;
  padding: 12px;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
}
.integration-dashboard__message-enqueue .ant-input,
.integration-dashboard__message-enqueue .ant-select,
.integration-dashboard__message-enqueue .integration-dashboard__payload-editor {
  grid-column: 2;
}
.integration-dashboard__payload-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.integration-dashboard__input--wide {
  min-width: 280px;
  grid-column: span 3;
}
.integration-dashboard__config-panel {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px 12px;
  align-items: start;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
}
.integration-dashboard__config-panel .integration-dashboard__input--wide,
.integration-dashboard__config-panel .integration-dashboard__textarea {
  grid-column: 2;
}
.integration-dashboard__textarea {
  min-height: 96px;
  padding: 8px;
  border: 1px solid var(--dp-border);
  border-radius: 4px;
  font-family: inherit;
  resize: vertical;
}
.integration-dashboard__inline-check {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}
.integration-dashboard__form-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.integration-dashboard__row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.integration-dashboard__inbound-head {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
}
.integration-dashboard__inbound-row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 8px;
  align-items: center;
}
.integration-dashboard__preset-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.integration-dashboard__preset-label {
  font-size: 13px;
  color: var(--dp-text-secondary);
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
.integration-dashboard__payload-field {
  display: grid;
  grid-template-columns: minmax(140px, 180px) 1fr auto;
  gap: 8px;
  align-items: center;
}
.integration-dashboard__failed-message-editor .integration-dashboard__payload-field {
  grid-template-columns: 160px 1fr;
}
.integration-dashboard__input,
.integration-dashboard__select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--dp-border);
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
  color: var(--dp-text-secondary);
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
  border-bottom: 1px solid var(--dp-border);
}
@media (max-width: 960px) {
  .integration-dashboard__filter-bar,
  .integration-dashboard__config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
