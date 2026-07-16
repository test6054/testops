<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
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
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  portfolioTeacherLibraryApi,
  portfolioTeacherSalaryApi,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { getUserStatusLabel, USER_STATUS_FILTER_OPTIONS } from '@/types/enums/user-status'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

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
const detailRequestToken = ref(0)

const identityVisible = ref(false)
const identityMode = ref<'create' | 'edit'>('create')
const interactionLocked = computed(() => writing.value || identityVisible.value)
const identityEditor = reactive<PortfolioTeacherIdentitySaveRequest>({
  teacherUserId: undefined,
  identityType: PortfolioTeacherIdentityTypeCode.INDUSTRY_MENTOR,
  identityStatus: PortfolioTeacherIdentityStatusCode.ACTIVE,
  appointmentNo: '',
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
    { key: 'detail', label: '详情' },
    { key: 'home', label: '首页' },
    { key: 'archive', label: '档案' },
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

async function openDetail(row: PortfolioTeacherSummaryVO) {
  const requestToken = detailRequestToken.value + 1
  detailRequestToken.value = requestToken
  detail.value = null
  salarySummary.value = ''
  librarySummary.value = ''
  extensionLoadError.value = false
  try {
    const nextDetail = await portfolioTeacherApi.get(row.userId)
    if (detailRequestToken.value !== requestToken) {
      return
    }
    detail.value = nextDetail
    detailVisible.value = true
    await loadTeacherExtensions(row.userId, requestToken)
  } catch (error) {
    if (detailRequestToken.value !== requestToken) {
      return
    }
    showUserError(error, '加载教师详情失败')
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
  identityMode.value = 'create'
  identityEditor.teacherUserId = context.userId
  identityEditor.id = undefined
  identityEditor.identityType = PortfolioTeacherIdentityTypeCode.INDUSTRY_MENTOR
  identityEditor.identityStatus = PortfolioTeacherIdentityStatusCode.ACTIVE
  identityEditor.appointmentNo = ''
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
  identityMode.value = 'edit'
  identityEditor.teacherUserId = detail.value.userId
  identityEditor.id = identity.id
  identityEditor.identityType = identity.identityType
  identityEditor.identityStatus = identity.identityStatus
  identityEditor.appointmentNo = identity.appointmentNo ?? ''
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
  const operation = `identity:save:${targetId}`
  if (!beginOperation(operation)) return
  const request: PortfolioTeacherIdentitySaveRequest = {
    id: identityEditor.id,
    teacherUserId,
    identityType: identityEditor.identityType,
    identityStatus: identityEditor.identityStatus,
    appointmentNo: identityEditor.appointmentNo?.trim() || undefined,
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
    message.success(identityMode.value === 'edit' ? '身份已更新' : '身份已保存')
    identityVisible.value = false
    await loadPage()
    if (detailVisible.value && detail.value?.userId === teacherUserId) {
      await reloadDetail()
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

async function exportRoster() {
  const operation = 'roster:export'
  if (!beginOperation(operation)) return
  const request = { ...query }
  try {
    const result = await portfolioTeacherApi.exportRoster(request)
    await downloadPortfolioExcelExport(result)
    message.success(`已导出 ${result.rowCount} 条`)
  } catch (error) {
    showUserError(error, '导出教师名册失败')
  } finally {
    endOperation(operation)
  }
}

onMounted(async () => {
  await loadTree(false)
  const routeLevel = readCompletenessLevelParam(route.query.completenessLevel)
  if (routeLevel) {
    filterForm.completenessLevel = routeLevel
    query.completenessLevel = routeLevel
  }
  await loadPage()
})
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
        <UiButton :loading="exporting" :disabled="interactionLocked" @click="exportRoster">
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
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="工号">
            {{ detail.teacherNumber ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="姓名">
            {{ detail.nickName }}
          </a-descriptions-item>
          <a-descriptions-item label="账号">
            {{ detail.userName ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="院系">
            {{ detail.departmentName ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="职称">
            {{ detail.title ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="手机">
            {{ detail.mobile ?? '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="邮箱" :span="2">
            {{ detail.email ?? '—' }}
          </a-descriptions-item>
        </a-descriptions>
        <a-descriptions
          v-if="salarySummary || librarySummary"
          :column="1"
          size="small"
          bordered
          style="margin-top: 16px"
        >
          <a-descriptions-item v-if="salarySummary" label="工资摘要">
            {{ salarySummary }}
          </a-descriptions-item>
          <a-descriptions-item v-if="librarySummary" label="图书借阅">
            {{ librarySummary }}
          </a-descriptions-item>
        </a-descriptions>
        <p v-if="extensionLoadError" class="teacher-directory__extension-error">
          工资与借阅摘要加载失败，主档案信息不受影响。
        </p>
        <div class="teacher-directory__identity-header">
          <h4>扩展身份</h4>
          <UiButton
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
                :items="[{ key: 'edit', label: '编辑', disabled: interactionLocked }]"
                split
                @action="() => openIdentityEdit(record)"
              />
            </template>
          </template>
          <template #empty>
            <UiEmpty description="暂无扩展身份" />
          </template>
        </UiDataTable>
      </template>
    </UiDrawer>
    <a-modal
      v-model:open="identityVisible"
      :title="identityMode === 'edit' ? '编辑教师身份' : '新增教师身份'"
      :confirm-loading="operationKey.startsWith('identity:save:')"
      :closable="!writing"
      :mask-closable="!writing"
      :keyboard="!writing"
      :cancel-button-props="{ disabled: writing }"
      @ok="submitIdentity"
    >
      <a-form layout="vertical">
        <a-form-item label="身份类型" required>
          <a-select
            v-model:value="identityEditor.identityType"
            :options="PORTFOLIO_TEACHER_IDENTITY_TYPE_OPTIONS"
            :disabled="writing"
          />
        </a-form-item>
        <a-form-item label="身份状态" required>
          <a-select
            v-model:value="identityEditor.identityStatus"
            :options="PORTFOLIO_TEACHER_IDENTITY_STATUS_OPTIONS"
            :disabled="writing"
          />
        </a-form-item>
        <a-form-item label="聘任编号">
          <a-input v-model:value="identityEditor.appointmentNo" :disabled="writing" />
        </a-form-item>
        <a-form-item label="展示名称">
          <a-input v-model:value="identityEditor.displayName" :disabled="writing" />
        </a-form-item>
        <a-form-item label="企业/单位">
          <a-input v-model:value="identityEditor.enterpriseName" :disabled="writing" />
        </a-form-item>
        <a-form-item label="归属院系">
          <a-select
            v-model:value="identityEditor.anchorDepartmentId"
            allow-clear
            :options="departmentOptions()"
            :disabled="writing"
          />
        </a-form-item>
        <a-form-item label="归属扩展组织编号">
          <a-select
            v-model:value="identityEditor.anchorPortfolioOrgId"
            allow-clear
            :options="portfolioOrgOptions()"
            :disabled="writing"
          />
        </a-form-item>
        <a-form-item label="该身份下职称/职务">
          <a-input v-model:value="identityEditor.titleAtIdentity" :disabled="writing" />
        </a-form-item>
        <a-form-item label="有效起始">
          <a-input
            v-model:value="identityEditor.validFrom"
            placeholder="年-月-日，例如 2026-07-16"
            :disabled="writing"
          />
        </a-form-item>
        <a-form-item label="有效截止">
          <a-input
            v-model:value="identityEditor.validTo"
            placeholder="年-月-日，例如 2026-07-16"
            :disabled="writing"
          />
        </a-form-item>
      </a-form>
    </a-modal>
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
    font-size: 16px;
    font-weight: 600;
  }
}
.teacher-directory__extension-error {
  margin: 12px 0 0;
  color: var(--ant-color-error);
  font-size: 13px;
}
</style>
