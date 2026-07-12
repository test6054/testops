<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioConflictTicketVO,
  PortfolioIdentityUnmatchedVO,
  PortfolioIntegrationDatasourceVO,
  PortfolioIntegrationFieldMappingVO,
  PortfolioIntegrationHealthDashboardVO,
  PortfolioIntegrationSyncTaskVO,
} from '@/apis/portfolio/integration'
import type {
  PortfolioArchiveCategoryTreeNodeVO,
  PortfolioTargetFieldDefinition,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { portfolioIntegrationApi } from '@/apis/portfolio/integration'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  QUALITY_SELECTOR_PAGE_SIZE,
  QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS,
} from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { portfolioTeacherSelectOptionsFromSummaries } from '@/utils/portfolio-teacher-display'

const IDENTITY_HINT_MISSING_TEACHER_NUMBER = '缺少工号'

const activeTab = ref('datasource')
const tabItems = [
  { key: 'datasource', label: '数据源' },
  { key: 'mapping', label: '字段映射' },
  { key: 'sync', label: '同步日志' },
  { key: 'queue', label: '待匹配/冲突' },
  { key: 'health', label: '渠道健康' },
]

const loading = ref(false)
const datasources = ref<PortfolioIntegrationDatasourceVO[]>([])
const mappings = ref<PortfolioIntegrationFieldMappingVO[]>([])
const archiveCategories = ref<PortfolioArchiveCategoryTreeNodeVO[]>([])
const archiveFields = ref<PortfolioTargetFieldDefinition[]>([])
const syncTasks = ref<PortfolioIntegrationSyncTaskVO[]>([])
const unmatched = ref<PortfolioIdentityUnmatchedVO[]>([])
const conflicts = ref<PortfolioConflictTicketVO[]>([])
const health = ref<PortfolioIntegrationHealthDashboardVO | null>(null)
const datasourceTotal = ref(0)
const syncTaskTotal = ref(0)
const unmatchedTotal = ref(0)
const conflictTotal = ref(0)

const selectedDatasourceId = ref('')
const datasourceQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const syncTaskQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const unmatchedQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const conflictQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
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
  if (dsForm.channelCode !== 'HR_PERSONNEL' && dsForm.channelCode !== 'NATIONAL_TEACHER_SYSTEM') {
    return [{ value: 'JDBC', label: '中间库 JDBC' }]
  }
  return [{ value: 'OPENAPI', label: 'OpenAPI/REST' }]
})

function changeDatasourceChannel(value: SelectValue) {
  const channelCode = typeof value === 'string' ? value : String(value ?? '')
  dsForm.channelCode = channelCode
  dsForm.pathwayCode
    = channelCode === 'HR_PERSONNEL' || channelCode === 'NATIONAL_TEACHER_SYSTEM' ? 'OPENAPI' : 'JDBC'
}

function applyNationalTeacherPreset(direction: 'OUTBOUND' | 'INBOUND') {
  dsForm.channelCode = 'NATIONAL_TEACHER_SYSTEM'
  dsForm.pathwayCode = 'OPENAPI'
  dsForm.datasourceName = direction === 'OUTBOUND' ? '全国教师系统上报' : '全国教师系统回流'
  dsForm.connectionConfigJson
    = direction === 'OUTBOUND'
      ? JSON.stringify({ syncDirection: 'OUTBOUND' })
      : JSON.stringify({ syncDirection: 'INBOUND', inboundRecords: [] })
}
const mappingForm = reactive({
  sourceFieldCode: '',
  targetFieldCode: '',
  targetCategoryCode: '',
  dictionaryCode: '',
})

const datasourceOptions = computed(() =>
  datasources.value.map((item) => ({ value: item.id, label: item.datasourceName })),
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

const identityResolveTeacherId = ref('')
const identityResolveTeacherNumber = ref('')
const identityResolveRowId = ref('')
const teachers = ref<PortfolioTeacherSummaryVO[]>([])

const teacherOptions = computed(() => portfolioTeacherSelectOptionsFromSummaries(teachers.value))
const datasourcePagination = computed(() => ({
  current: datasourceQuery.pageNum,
  pageSize: datasourceQuery.pageSize,
  total: datasourceTotal.value,
  showSizeChanger: true,
}))
const syncTaskPagination = computed(() => ({
  current: syncTaskQuery.pageNum,
  pageSize: syncTaskQuery.pageSize,
  total: syncTaskTotal.value,
  showSizeChanger: true,
}))
const unmatchedPagination = computed(() => ({
  current: unmatchedQuery.pageNum,
  pageSize: unmatchedQuery.pageSize,
  total: unmatchedTotal.value,
  showSizeChanger: true,
}))
const conflictPagination = computed(() => ({
  current: conflictQuery.pageNum,
  pageSize: conflictQuery.pageSize,
  total: conflictTotal.value,
  showSizeChanger: true,
}))
let teacherSearchTimer: ReturnType<typeof setTimeout> | null = null

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
  try {
    archiveCategories.value = await portfolioArchiveTemplateApi.listCategoryTree()
  } catch (error) {
    showUserError(error, '加载档案分类失败')
  }
}

async function changeMappingCategory(value: SelectValue) {
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
    archiveFields.value = published.targetFields
  } catch (error) {
    showUserError(error, '加载已发布档案字段失败')
  }
}

async function loadTeachers(keyword?: string) {
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: QUALITY_SELECTOR_PAGE_SIZE,
      searchText: keyword || undefined,
    })
    mergeTeacherOptions(page.list ?? [])
  } catch (error) {
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
  loading.value = true
  try {
    const res = await portfolioIntegrationApi.pageDatasource({
      pageNum: datasourceQuery.pageNum,
      pageSize: datasourceQuery.pageSize,
    })
    datasources.value = res.list ?? []
    datasourceTotal.value = res.total ?? 0
    if (
      selectedDatasourceId.value
      && !datasources.value.some((item) => item.id === selectedDatasourceId.value)
    ) {
      selectedDatasourceId.value = ''
      mappings.value = []
    }
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadMappings() {
  if (!selectedDatasourceId.value) {
    mappings.value = []
    return
  }
  loading.value = true
  try {
    mappings.value = await portfolioIntegrationApi.listFieldMappings({
      datasourceConfigId: selectedDatasourceId.value,
    })
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadSyncTasks() {
  loading.value = true
  try {
    const res = await portfolioIntegrationApi.pageSyncLog({
      pageNum: syncTaskQuery.pageNum,
      pageSize: syncTaskQuery.pageSize,
    })
    syncTasks.value = res.list ?? []
    syncTaskTotal.value = res.total ?? 0
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadQueues() {
  loading.value = true
  try {
    const [unmatchedRes, conflictRes] = await Promise.all([
      portfolioIntegrationApi.pageIdentityUnmatched({
        pageNum: unmatchedQuery.pageNum,
        pageSize: unmatchedQuery.pageSize,
      }),
      portfolioIntegrationApi.pageConflict({
        pageNum: conflictQuery.pageNum,
        pageSize: conflictQuery.pageSize,
      }),
    ])
    unmatched.value = unmatchedRes.list ?? []
    conflicts.value = conflictRes.list ?? []
    unmatchedTotal.value = unmatchedRes.total ?? 0
    conflictTotal.value = conflictRes.total ?? 0
    if (!unmatched.value.some((item) => item.id === identityResolveRowId.value)) {
      identityResolveRowId.value = ''
      identityResolveTeacherId.value = ''
      identityResolveTeacherNumber.value = ''
    }
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function loadHealth() {
  loading.value = true
  try {
    health.value = await portfolioIntegrationApi.healthDashboard()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function saveDatasource() {
  loading.value = true
  try {
    await portfolioIntegrationApi.saveDatasource({
      channelCode: dsForm.channelCode,
      pathwayCode: dsForm.pathwayCode,
      datasourceName: dsForm.datasourceName,
      enabled: true,
      connectionConfigJson: dsForm.connectionConfigJson || undefined,
    })
    message.success('数据源已保存')
    datasourceQuery.pageNum = 1
    await loadDatasources()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function saveMapping() {
  if (!selectedDatasourceId.value) {
    message.warning('请先选择数据源')
    return
  }
  loading.value = true
  try {
    await portfolioIntegrationApi.saveFieldMapping({
      datasourceConfigId: selectedDatasourceId.value,
      sourceFieldCode: mappingForm.sourceFieldCode,
      targetFieldCode: mappingForm.targetFieldCode,
      targetCategoryCode: mappingForm.targetCategoryCode || undefined,
      dictionaryCode: mappingForm.dictionaryCode || undefined,
      enabled: true,
    })
    message.success('字段映射已保存')
    mappingForm.sourceFieldCode = ''
    mappingForm.targetFieldCode = ''
    mappingForm.targetCategoryCode = ''
    mappingForm.dictionaryCode = ''
    await loadMappings()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function triggerSync(row: PortfolioIntegrationDatasourceVO) {
  loading.value = true
  try {
    await portfolioIntegrationApi.triggerSync({ datasourceConfigId: row.id })
    message.success('同步已触发')
    await Promise.all([loadSyncTasks(), loadDatasources(), loadHealth(), loadQueues()])
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function resolveConflict(row: PortfolioConflictTicketVO, action: string) {
  loading.value = true
  try {
    await portfolioIntegrationApi.resolveConflict({
      conflictTicketId: row.id,
      action,
      resolveRemark: action === 'IGNORED' ? '管理端忽略冲突' : '管理端确认处置',
    })
    message.success('冲突已处理')
    conflictQuery.pageNum = 1
    await loadQueues()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function resolveIdentityUnmatched(
  row: PortfolioIdentityUnmatchedVO,
  action: 'RESOLVED' | 'IGNORED',
) {
  if (action === 'RESOLVED' && !identityResolveTeacherId.value) {
    message.warning('绑定本地教师须选择教师')
    return
  }
  if (
    action === 'RESOLVED'
    && needsTeacherNumber(row)
    && !identityResolveTeacherNumber.value.trim()
  ) {
    message.warning('缺少工号待匹配须补录工号')
    return
  }
  loading.value = true
  try {
    await portfolioIntegrationApi.resolveIdentityUnmatched({
      identityUnmatchedId: row.id,
      action,
      resolvedTeacherId: action === 'RESOLVED' ? identityResolveTeacherId.value : undefined,
      resolvedTeacherNumber:
        action === 'RESOLVED' && needsTeacherNumber(row)
          ? identityResolveTeacherNumber.value.trim()
          : undefined,
      resolveRemark: action === 'RESOLVED' ? '管理端绑定本地教师' : '管理端忽略待匹配',
    })
    message.success('身份待匹配已处置')
    identityResolveTeacherId.value = ''
    identityResolveTeacherNumber.value = ''
    identityResolveRowId.value = ''
    unmatchedQuery.pageNum = 1
    await loadQueues()
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

function onDatasourceTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  datasourceQuery.pageNum = pageNum
  datasourceQuery.pageSize = pageSize
  void loadDatasources()
}

function onSyncTaskTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  syncTaskQuery.pageNum = pageNum
  syncTaskQuery.pageSize = pageSize
  void loadSyncTasks()
}

function onUnmatchedTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  unmatchedQuery.pageNum = pageNum
  unmatchedQuery.pageSize = pageSize
  void loadQueues()
}

function onConflictTableChange(changeEvent: UiDataTableChangeEvent) {
  const { pageNum, pageSize } = readUiDataTablePagination(changeEvent, DEFAULT_LIST_PAGE_SIZE)
  conflictQuery.pageNum = pageNum
  conflictQuery.pageSize = pageSize
  void loadQueues()
}

onMounted(async () => {
  await Promise.all([loadTeachers(), loadDatasources(), loadArchiveCategories()])
  await Promise.all([loadMappings(), loadSyncTasks(), loadQueues(), loadHealth()])
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="数据集成中心" subtitle="八渠道配置、同步监控与渠道健康" />
    <UiSectionTabs v-model:active-key="activeTab" :items="tabItems" />

    <UiCard v-if="activeTab === 'datasource'" title="数据源配置" style="margin-top: 16px">
      <div class="integration-dashboard__preset-bar">
        <span class="integration-dashboard__preset-label">全国教师系统</span>
        <UiButton size="sm" @click="applyNationalTeacherPreset('OUTBOUND')"> 上报配置 </UiButton>
        <UiButton size="sm" @click="applyNationalTeacherPreset('INBOUND')"> 回流配置 </UiButton>
      </div>
      <div class="integration-dashboard__form">
        <label>渠道</label>
        <a-select
          v-model:value="dsForm.channelCode"
          :options="datasourceChannelOptions"
          @change="changeDatasourceChannel"
        />
        <label>通路</label>
        <a-select v-model:value="dsForm.pathwayCode" :options="datasourcePathwayOptions" />
        <label>名称</label>
        <input v-model="dsForm.datasourceName" class="integration-dashboard__input" />
        <label>连接配置</label>
        <input
          v-model="dsForm.connectionConfigJson"
          class="integration-dashboard__input integration-dashboard__input--wide"
          placeholder="{&quot;syncDirection&quot;:&quot;OUTBOUND&quot;}"
        />
        <UiButton tone="primary" :loading="loading" @click="saveDatasource"> 保存数据源 </UiButton>
      </div>
      <UiDataTable
        row-key="id"
        :columns="dsColumns"
        :data-source="datasources"
        :loading="loading"
        :pagination="datasourcePagination"
        style="margin-top: 16px"
        @change="onDatasourceTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiButton size="sm" :loading="loading" @click="triggerSync(record)">
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
          @change="loadMappings"
        >
          <option v-for="item in datasourceOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>
      <div class="integration-dashboard__form integration-dashboard__form--mapping">
        <label>源字段</label>
        <input v-model="mappingForm.sourceFieldCode" class="integration-dashboard__input" />
        <label>分类</label>
        <a-select
          :value="mappingForm.targetCategoryCode || undefined"
          allow-clear
          :options="archiveCategoryOptions"
          placeholder="不入档时留空"
          @change="changeMappingCategory"
        />
        <label>目标字段</label>
        <a-select
          v-if="mappingForm.targetCategoryCode"
          v-model:value="mappingForm.targetFieldCode"
          :options="archiveFieldOptions"
          placeholder="选择已发布字段"
        />
        <input v-else v-model="mappingForm.targetFieldCode" class="integration-dashboard__input" />
        <label>字典</label>
        <input v-model="mappingForm.dictionaryCode" class="integration-dashboard__input" />
        <UiButton tone="primary" :loading="loading" @click="saveMapping"> 保存映射 </UiButton>
      </div>
      <UiDataTable
        row-key="id"
        :columns="mappingColumns"
        :data-source="mappings"
        :loading="loading"
        style="margin-top: 16px"
      >
        <template #bodyCell="{ column, record }">
          <UiTag v-if="column.key === 'enabled'" :tone="record.enabled ? 'green' : 'gray'">
            {{ record.enabled ? '启用' : '停用' }}
          </UiTag>
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard v-else-if="activeTab === 'sync'" title="同步任务" style="margin-top: 16px">
      <UiDataTable
        row-key="id"
        :columns="syncColumns"
        :data-source="syncTasks"
        :loading="loading"
        :pagination="syncTaskPagination"
        @change="onSyncTaskTableChange"
      />
    </UiCard>

    <UiCard v-else-if="activeTab === 'queue'" title="待匹配与冲突" style="margin-top: 16px">
      <h4 class="integration-dashboard__sub-title">身份待匹配</h4>
      <UiDataTable
        row-key="id"
        :columns="unmatchedColumns"
        :data-source="unmatched"
        :loading="loading"
        :pagination="unmatchedPagination"
        @change="onUnmatchedTableChange"
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
                @focus="() => loadTeachers()"
                @search="handleTeacherSearch"
              />
              <input
                v-if="needsTeacherNumber(record)"
                v-model="identityResolveTeacherNumber"
                class="integration-dashboard__input"
                placeholder="补录工号"
              />
            </template>
            <UiButton
              v-if="identityResolveRowId !== record.id"
              size="sm"
              :loading="loading"
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
              :loading="loading"
              @click="resolveIdentityUnmatched(record, 'RESOLVED')"
            >
              确认绑定
            </UiButton>
            <UiButton
              size="sm"
              variant="ghost"
              :loading="loading"
              @click="resolveIdentityUnmatched(record, 'IGNORED')"
            >
              忽略
            </UiButton>
          </template>
        </template>
      </UiDataTable>
      <h4 class="integration-dashboard__sub-title">冲突单</h4>
      <UiDataTable
        row-key="id"
        :columns="conflictColumns"
        :data-source="conflicts"
        :loading="loading"
        :pagination="conflictPagination"
        @change="onConflictTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions' && record.ticketStatus === 'OPEN'">
            <UiButton
              size="sm"
              :loading="loading"
              @click="resolveConflict(record, 'RESOLVED_USE_LOCAL')"
            >
              保留本地
            </UiButton>
            <UiButton
              size="sm"
              :loading="loading"
              @click="resolveConflict(record, 'RESOLVED_USE_EXTERNAL')"
            >
              采用外部
            </UiButton>
            <UiButton
              size="sm"
              variant="ghost"
              :loading="loading"
              @click="resolveConflict(record, 'IGNORED')"
            >
              忽略
            </UiButton>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard v-else title="渠道健康看板" style="margin-top: 16px">
      <p v-if="health?.computedTime" class="integration-dashboard__hint">
        计算时间 {{ health.computedTime }}
      </p>
      <UiEmpty v-if="!health?.channels.length" description="暂无渠道健康数据" />
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
</style>
