<script setup lang="ts">
import type { PortfolioDoubleHighMonitorVO } from '@/apis/portfolio/double-high'
import { portfolioDoubleHighApi } from '@/apis/portfolio/double-high'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import {
  flattenPortfolioOrgOptionsUnderDepartment,
  usePortfolioOrgTree,
} from '@/composables/usePortfolioOrgTree'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { showUserError } from '@/utils/error-handler'

interface MonitorFilterModel extends Record<string, unknown> {
  departmentId?: string
  portfolioOrgId?: string
  constructionPeriodLabel?: string
  baselinePeriodLabel?: string
}

const route = useRoute()
const router = useRouter()
const { loadTree, departmentOptions: loadDepartmentOptions, treeRoots } = usePortfolioOrgTree()
const departmentOptions = computed(() => loadDepartmentOptions())
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const filterForm = reactive<MonitorFilterModel>({})
const monitor = ref<PortfolioDoubleHighMonitorVO | null>(null)
const signals = ref<SignalMetric[]>([])
const syncingFromRoute = ref(false)
const requestToken = ref(0)

const portfolioOrgOptions = computed(() => {
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
    width: 180,
    options: departmentOptions.value,
  },
  {
    key: 'portfolioOrgId',
    type: 'select' as const,
    label: '专业群',
    allowClear: true,
    width: 180,
    options: portfolioOrgOptions.value,
  },
  {
    key: 'constructionPeriodLabel',
    type: 'input' as const,
    label: '建设周期',
    width: 140,
    placeholder: '如 2025-2026',
  },
  {
    key: 'baselinePeriodLabel',
    type: 'input' as const,
    label: '基线周期',
    width: 140,
    placeholder: '院系/校级可选',
  },
])

const pageTitle = computed(() => {
  if (filterForm.portfolioOrgId) {
    return '专业群双高建设指数'
  }
  if (filterForm.departmentId) {
    return '院系双高建设指数'
  }
  return '学校双高建设指数'
})

const dimensionColumns = [
  { title: '维度', dataIndex: 'dimensionName', key: 'dimensionName' },
  { title: '权重%', dataIndex: 'weightPercent', key: 'weightPercent', width: 100 },
  { title: '得分', dataIndex: 'dimensionScore', key: 'dimensionScore', width: 100 },
  { title: '加权分', dataIndex: 'weightedScore', key: 'weightedScore', width: 100 },
]

function readRouteQueryString(key: string): string {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

function syncScopeFromRoute() {
  syncingFromRoute.value = true
  filterForm.departmentId = readRouteQueryString('departmentId') || undefined
  filterForm.portfolioOrgId = readRouteQueryString('portfolioOrgId') || undefined
  filterForm.constructionPeriodLabel = readRouteQueryString('constructionPeriodLabel') || undefined
  filterForm.baselinePeriodLabel = readRouteQueryString('baselinePeriodLabel') || undefined
  syncingFromRoute.value = false
}

function buildScopeQuery(): Record<string, string> {
  const query: Record<string, string> = {}
  if (filterForm.departmentId) {
    query.departmentId = filterForm.departmentId
  }
  if (filterForm.portfolioOrgId) {
    query.portfolioOrgId = filterForm.portfolioOrgId
  }
  if (filterForm.constructionPeriodLabel?.trim()) {
    query.constructionPeriodLabel = filterForm.constructionPeriodLabel.trim()
  }
  if (filterForm.baselinePeriodLabel?.trim()) {
    query.baselinePeriodLabel = filterForm.baselinePeriodLabel.trim()
  }
  return query
}

function scopeQueryEquals(next: Record<string, string>): boolean {
  const keys = ['departmentId', 'portfolioOrgId', 'constructionPeriodLabel', 'baselinePeriodLabel']
  for (const key of keys) {
    const current = readRouteQueryString(key)
    const expected = next[key] || ''
    if (current !== expected) {
      return false
    }
  }
  return true
}

function syncScopeToRoute() {
  const query = buildScopeQuery()
  if (scopeQueryEquals(query)) {
    void loadMonitor()
    return
  }
  void router.replace({ path: route.path, query })
}

function buildSignals(data: PortfolioDoubleHighMonitorVO) {
  const items: SignalMetric[] = [
    {
      key: 'index',
      label: '建设指数',
      value: data.constructionIndex ?? '0',
      tone: 'blue',
      clickable: true,
      helper: '定位七维贡献',
    },
    {
      key: 'taskTotal',
      label: '任务总数',
      value: data.taskTotalCount ?? 0,
      tone: 'green',
      clickable: true,
      helper: '进入双高任务台账',
    },
    {
      key: 'taskDone',
      label: '验收/归档',
      value: data.taskTerminalCount ?? 0,
      tone: 'blue',
      clickable: true,
      helper: '进入双高任务台账',
    },
    {
      key: 'taskRate',
      label: '完成率',
      value: data.taskCompletionRatePercent ?? '0',
      unit: '%',
      tone: 'orange',
      clickable: true,
      helper: '进入双高任务台账',
    },
  ]
  if (data.baselineConstructionIndex != null) {
    items.push({
      key: 'baseline',
      label: '基线指数',
      value: data.baselineConstructionIndex,
      tone: 'gray',
      clickable: true,
      helper: '定位建设指数概览',
    })
  }
  if (data.periodValueAdded != null) {
    items.push({
      key: 'valueAdded',
      label: '周期增值',
      value: data.periodValueAdded,
      tone: 'blue',
      clickable: true,
      helper: '定位建设指数概览',
    })
  }
  return items
}

/** SignalBand：任务 KPI → 任务台账；指数 KPI → 本页图表 */
function handleShuanggaoSignalClick(key: string): void {
  if (key === 'taskTotal' || key === 'taskDone' || key === 'taskRate') {
    const isDepartment = route.path.includes('/department/')
    void router.push({
      name: isDepartment ? 'PortfolioDepartmentDoubleHighTasks' : 'PortfolioDoubleHighTasks',
      query: {
        ...(filterForm.departmentId ? { departmentId: filterForm.departmentId } : {}),
        ...(filterForm.portfolioOrgId ? { portfolioOrgId: filterForm.portfolioOrgId } : {}),
        ...(filterForm.constructionPeriodLabel
          ? { constructionPeriodLabel: filterForm.constructionPeriodLabel }
          : {}),
      },
    })
    return
  }
  if (key === 'index' || key === 'baseline' || key === 'valueAdded') {
    const el =
      document.querySelector('.shuanggao-monitor__meta')?.closest('.ui-card, .ant-card') ??
      document.querySelector('.shuanggao-monitor__meta')
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

async function loadMonitor() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  beginLoad()
  const constructionPeriodLabel = filterForm.constructionPeriodLabel?.trim() || ''
  const baselinePeriodLabel = filterForm.baselinePeriodLabel?.trim() || ''
  if (baselinePeriodLabel && !constructionPeriodLabel) {
    loading.value = false
    monitor.value = null
    signals.value = []
    message.warning('填写基线周期时必须同时指定建设周期')
    return
  }
  if (baselinePeriodLabel && filterForm.portfolioOrgId) {
    loading.value = false
    monitor.value = null
    signals.value = []
    message.warning('专业群监测暂不支持基线周期对比')
    return
  }
  const request = {
    departmentId: filterForm.departmentId || undefined,
    portfolioOrgId: filterForm.portfolioOrgId || undefined,
    constructionPeriodLabel: constructionPeriodLabel || undefined,
    baselinePeriodLabel: baselinePeriodLabel || undefined,
  }
  loading.value = true
  try {
    const nextMonitor = await portfolioDoubleHighApi.getMonitor(request)
    if (requestToken.value !== currentToken) {
      return
    }
    monitor.value = nextMonitor
    if (!nextMonitor) {
      signals.value = []
      return
    }
    signals.value = buildSignals(nextMonitor)
    okLoad()
  } catch (error) {
    if (requestToken.value !== currentToken) {
      return
    }
    failLoad()
    monitor.value = null
    signals.value = []
    showUserError(error, '加载双高监测失败')
  } finally {
    if (requestToken.value === currentToken) {
      loading.value = false
    }
  }
}

function onSearch() {
  syncScopeToRoute()
}

onMounted(() => {
  void loadTree().then(() => {
    syncScopeFromRoute()
    void loadMonitor()
  })
})

watch(
  () => route.query,
  () => {
    syncScopeFromRoute()
    void loadMonitor()
  },
)

watch(
  () => filterForm.departmentId,
  (next, prev) => {
    if (syncingFromRoute.value || next === prev) {
      return
    }
    filterForm.portfolioOrgId = undefined
  },
)
</script>

<template>
  <StageWorkbenchShell title="双高建设监测">
    <template #context>
      <ContextBar :title="pageTitle" :subtitle="monitor?.dataSourceNote" />
    </template>
    <SignalBand
      v-if="signals.length"
      :metrics="signals"
      compact
      @metric-click="handleShuanggaoSignalClick"
    />
    <UiCard title="监测范围">
      <UiFilterBar v-model="filterModel" :fields="filterFields" @search="onSearch" />
    </UiCard>
    <UiCard v-if="loading" title="加载中" />
    <UiEmpty v-else-if="!monitor" description="暂无监测数据" />
    <template v-else>
      <UiCard title="建设指数概览">
        <p class="shuanggao-monitor__meta">
          统计口径：{{ monitor.statisticScopeLabel }} · 建设周期：{{
            monitor.constructionPeriodLabel || '未指定（全量任务）'
          }}
        </p>
        <p class="shuanggao-monitor__meta">数据截止：{{ monitor.dataCutoffTime }}</p>
        <p v-if="monitor.baselinePeriodLabel" class="shuanggao-monitor__meta">
          基线周期：{{ monitor.baselinePeriodLabel }}
          <template v-if="monitor.periodValueAdded != null">
            · 周期增值：{{ monitor.periodValueAdded }}</template
          >
        </p>
      </UiCard>
      <UiCard title="七维贡献">
        <UiDataTable
          :load-error="loadError"
          row-key="dimensionCode"
          :columns="dimensionColumns"
          :data-source="monitor.dimensionScores"
          :pagination="false"
        />
      </UiCard>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.shuanggao-monitor__meta {
  margin: 0 0 var(--dp-space-2);
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
}

.shuanggao-monitor__meta:last-child {
  margin-bottom: 0;
}
</style>
