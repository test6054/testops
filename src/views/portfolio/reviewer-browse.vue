<script setup lang="ts">
/**
 * 评审工作台-只读档案浏览：学校/学院/教研室专员按权限查看教师档案袋，不提供审核处置动作。
 */
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioTeacherPageRequest, PortfolioTeacherSummaryVO } from '@/apis/portfolio/types'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { flattenTeachingGroupOptions, usePortfolioOrgTree } from '@/composables/usePortfolioOrgTree'
import { usePortfolioReviewAccess } from '@/composables/usePortfolioReviewAccess'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { usePortfolioStore } from '@/stores/modules/portfolio'
import { showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const router = useRouter()
const portfolioStore = usePortfolioStore()
const { loadTree, treeRoots, departmentOptions, portfolioOrgOptions } = usePortfolioOrgTree()
const { accessScope, ensureLoaded } = usePortfolioReviewAccess()

const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const list = ref<PortfolioTeacherSummaryVO[]>([])
const total = ref(0)
const ReviewerBrowseSignalMetrics = computed<SignalMetric[]>(() => {
  if (loadError.value && total.value === 0) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'total',
      label: '档案浏览',
      value: total.value,
      clickable: true,
    },
  ]
  return applySpotlightEmphasis(metrics, {
    primaryKey: 'total',
    actionLabel: '刷新',
  })
})

const ReviewerBrowseWorkbenchSubtitle = computed(() => {
  if (loadError.value) {
    return '加载失败'
  }
  return `${total.value} 条`
})

function onReviewerBrowseSignalClick(_key: string) {
  void loadPage()
}
const requestToken = ref(0)

const query = reactive<PortfolioTeacherPageRequest>({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  searchText: '',
  departmentId: undefined,
  portfolioOrgId: undefined,
  teachingGroupId: undefined,
  includeCompletenessMetrics: true,
})

const filterForm = reactive({
  searchText: '',
  departmentId: undefined as string | undefined,
  portfolioOrgId: undefined as string | undefined,
  teachingGroupId: undefined as string | undefined,
})

const scopeHint = computed(() => {
  const scope = accessScope.value
  if (!scope) {
    return '正在加载评审范围…'
  }
  if (scope.tenantWide) {
    return '当前范围：学校级（全校教师只读浏览）'
  }
  if (scope.teachingGroupLeader) {
    return '当前范围：教研室级（所辖教研室教师只读浏览）'
  }
  return '当前账号具备评审访问权限，仅可只读浏览权限范围内教师档案'
})

const filterFields = computed<FilterField[]>(() => {
  const fields: FilterField[] = [
    { key: 'searchText', label: '关键词', type: 'input', placeholder: '工号/姓名' },
  ]
  if (accessScope.value?.tenantWide) {
    fields.push({
      key: 'departmentId',
      label: '院系',
      type: 'select',
      options: departmentOptions().map((item) => ({ label: item.label, value: item.value })),
      allowClear: true,
    })
  }
  fields.push({
    key: 'portfolioOrgId',
    label: '档案组织',
    type: 'select',
    options: portfolioOrgOptions().map((item) => ({ label: item.label, value: item.value })),
    allowClear: true,
  })
  if (
    accessScope.value?.teachingGroupLeader
    && (accessScope.value.managedTeachingGroupIds?.length ?? 0) > 1
  ) {
    const groupOptions = flattenTeachingGroupOptions(
      treeRoots.value,
      accessScope.value.managedTeachingGroupIds,
      accessScope.value.reviewerDepartmentId,
    )
    fields.push({
      key: 'teachingGroupId',
      label: '教研室',
      type: 'select',
      options: groupOptions.map((item) => ({ label: item.label, value: item.value })),
      allowClear: true,
    })
  }
  return fields
})

const columns: ColumnsType = [
  { title: '工号', dataIndex: 'teacherNumber', key: 'teacherNumber', width: 120 },
  { title: '姓名', dataIndex: 'nickName', key: 'nickName', width: 120 },
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName', width: 160 },
  { title: '职称', dataIndex: 'title', key: 'title', width: 120 },
  { title: '完整度', key: 'completeness', width: 120 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '主行动', key: 'actions', width: 280, fixed: 'right' },
]

async function loadPage() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  const request = { ...query }
  beginLoad()
  loading.value = true
  try {
    const page = await portfolioTeacherApi.page(request)
    if (requestToken.value !== currentToken) {
      return
    }
    list.value = page.list ?? []
    total.value = page.total ?? 0
    okLoad()
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    list.value = []
    total.value = 0
    failLoad()
    showUserError(error, '加载失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

function handleSearch(values: Record<string, unknown>) {
  filterForm.searchText = typeof values.searchText === 'string' ? values.searchText : ''
  filterForm.departmentId
    = typeof values.departmentId === 'string' ? values.departmentId : undefined
  filterForm.portfolioOrgId
    = typeof values.portfolioOrgId === 'string' ? values.portfolioOrgId : undefined
  filterForm.teachingGroupId
    = typeof values.teachingGroupId === 'string' ? values.teachingGroupId : undefined
  query.pageNum = 1
  query.searchText = filterForm.searchText || undefined
  query.departmentId = filterForm.departmentId
  query.portfolioOrgId = filterForm.portfolioOrgId
  query.teachingGroupId = filterForm.teachingGroupId
  void loadPage()
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadPage()
}

function rowActions(_record: PortfolioTeacherSummaryVO): UiTableRowActionItem[] {
  return [
    { key: 'masterpiece', label: '读整袋' },
    { key: 'home', label: '首页' },
    { key: 'archive', label: '档案' },
    { key: 'course', label: '课程档案' },
    { key: 'profile', label: '个人资料' },
    { key: 'philosophy', label: '教学理念' },
    { key: 'honor', label: '获奖' },
    { key: 'extension', label: '拓展活动' },
    { key: 'portrait', label: '画像' },
  ]
}

function openTeacherPage(path: string, teacherId: string) {
  portfolioStore.setTeacher(teacherId)
  void router.push({ path, query: { teacherId } })
}

function handleAction(key: string, record: PortfolioTeacherSummaryVO) {
  const teacherId = record.userId
  switch (key) {
    case 'masterpiece':
      openTeacherPage('/portfolio/teacher/masterpiece', teacherId)
      break
    case 'home':
      openTeacherPage('/portfolio/teacher/home', teacherId)
      break
    case 'archive':
      openTeacherPage('/portfolio/teacher/archive', teacherId)
      break
    case 'course':
      openTeacherPage('/portfolio/teacher/course-archive', teacherId)
      break
    case 'profile':
      openTeacherPage('/portfolio/teacher/profile', teacherId)
      break
    case 'philosophy':
      openTeacherPage('/portfolio/teacher/philosophy', teacherId)
      break
    case 'honor':
      openTeacherPage('/portfolio/teacher/honor', teacherId)
      break
    case 'extension':
      openTeacherPage('/portfolio/teacher/extension-activity', teacherId)
      break
    case 'portrait':
      openTeacherPage('/portfolio/teacher/portrait', teacherId)
      break
  }
}

onMounted(async () => {
  await ensureLoaded()
  await loadTree(false)
  const requestedDepartmentId
    = typeof route.query.departmentId === 'string' ? route.query.departmentId : undefined
  if (accessScope.value?.tenantWide && requestedDepartmentId) {
    query.departmentId = requestedDepartmentId
    filterForm.departmentId = requestedDepartmentId
  } else if (accessScope.value?.teachingGroupLeader && accessScope.value.reviewerDepartmentId) {
    query.departmentId = accessScope.value.reviewerDepartmentId
    filterForm.departmentId = accessScope.value.reviewerDepartmentId
  }
  if (
    accessScope.value?.teachingGroupLeader
    && (accessScope.value.managedTeachingGroupIds?.length ?? 0) === 1
  ) {
    query.teachingGroupId = accessScope.value.managedTeachingGroupIds![0]
    filterForm.teachingGroupId = accessScope.value.managedTeachingGroupIds![0]
  }
  await loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="评审工作台 · 档案浏览" :subtitle="ReviewerBrowseWorkbenchSubtitle" />
    </template>
    <template v-if="ReviewerBrowseSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="ReviewerBrowseSignalMetrics"
        @metric-click="onReviewerBrowseSignalClick"
      />
    </template>

    <UiAlertStrip tone="info" :message="scopeHint" style="margin-bottom: var(--dp-space-component)" />
    <p class="reviewer-browse__note">
      本页仅支持按权限只读查看教师教学档案袋内容，审核通过/退回请使用「院系审核台」。
    </p>

    <UiCard title="权限范围内教师">
      <UiFilterBar :fields="filterFields" :model="filterForm" @search="handleSearch" />
      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        row-key="userId"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        :load-error="loadError"
        pagination-mode="server"
        :total="total"
        style="margin-top: var(--dp-space-component)"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'completeness'">
            <UiTag v-if="record.completenessLevel" tone="blue">
              {{ record.completenessPercent ?? '—' }}%
            </UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'identityLayers'">
            <PortfolioOwnerIdentityLayersCell
              :layers="record.ownerIdentityLayers"
              :note="record.ownerMultiIdentityNote"
              :row-key="record.id || record.teacherId || record.teacherUserId || record.userId"
            />
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :max-visible="2"
              :items="rowActions(record)"
              @action="(key) => handleAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.reviewer-browse__note {
  margin: 0 0 var(--dp-space-component);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}
</style>
