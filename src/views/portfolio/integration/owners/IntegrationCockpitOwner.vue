<script setup lang="ts">
import type {
  PortfolioConflictTicketVO,
  PortfolioIdentityUnmatchedVO,
  PortfolioIntegrationDatasourceVO,
  PortfolioIntegrationHealthDashboardVO,
  PortfolioIntegrationMessageInboxVO,
  PortfolioNationalReportIssueVO,
} from '@/apis/portfolio/integration'
import type { SignalMetric } from '@/types/workbench'
import type { PortfolioIntegrationOwner } from '@/views/portfolio/integration/integration-owners'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { portfolioIntegrationApi } from '@/apis/portfolio/integration'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { PortfolioNationalReportIssueStatusCode } from '@/types/enums/portfolio-national-report-issue-status-enum'
import { showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import {
  PORTFOLIO_INTEGRATION_OWNER_ROUTE,
  PORTFOLIO_INTEGRATION_OWNER_SUBTITLE,
  PORTFOLIO_INTEGRATION_OWNER_TITLE,
} from '@/views/portfolio/integration/integration-owners'

defineOptions({ name: 'IntegrationCockpitOwner' })

const router = useRouter()

const loadError = reactive({
  datasources: '',
  syncTasks: '',
  unmatched: '',
  conflicts: '',
  nationalIssues: '',
  failedMessages: '',
  health: '',
})

const requestToken = reactive({
  datasources: 0,
  syncTasks: 0,
  unmatched: 0,
  conflicts: 0,
  nationalIssues: 0,
  failedMessages: 0,
  health: 0,
})

const datasources = ref<PortfolioIntegrationDatasourceVO[]>([])
const unmatched = ref<PortfolioIdentityUnmatchedVO[]>([])
const conflicts = ref<PortfolioConflictTicketVO[]>([])
const nationalIssues = ref<PortfolioNationalReportIssueVO[]>([])
const failedMessages = ref<PortfolioIntegrationMessageInboxVO[]>([])
const health = ref<PortfolioIntegrationHealthDashboardVO | null>(null)

const datasourceQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const syncTaskQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const unmatchedQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const nationalIssueQuery = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  status: PortfolioNationalReportIssueStatusCode.OPEN as PortfolioNationalReportIssueStatusCode | undefined,
})
const conflictQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const failedMessageQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })

const syncTaskTotal = ref(0)
const unmatchedTotal = ref(0)
const nationalIssueTotal = ref(0)
const conflictTotal = ref(0)
const failedMessageTotal = ref(0)

const healthBreachCount = computed(() => {
  if (!health.value) {
    return null
  }
  return health.value.channels.filter((item) => item.slaBreach).length
})

/** 治理 cockpit：只展示阻断信号，点击进入对应 owner 路由。 */
const cockpitSignals = computed<SignalMetric[]>(() =>
  applySpotlightEmphasis(
    [
      {
        key: 'national',
        label: '上报待修正',
        value: loadError.nationalIssues ? '—' : nationalIssueTotal.value,
        tone: nationalIssueTotal.value > 0 ? 'red' : 'blue',
        clickable: true,
        helper: '进入上报与异常',
      },
      {
        key: 'health',
        label: 'SLA 违约渠道',
        value: loadError.health
          ? '—'
          : health.value
            ? healthBreachCount.value ?? 0
            : '—',
        tone: (healthBreachCount.value ?? 0) > 0 ? 'orange' : 'green',
        clickable: true,
        helper: '进入字典与健康',
      },
      {
        key: 'unmatched',
        label: '身份待匹配',
        value: loadError.unmatched ? '—' : unmatchedTotal.value,
        tone: unmatchedTotal.value > 0 ? 'orange' : 'blue',
        clickable: true,
        helper: '进入身份与冲突',
      },
      {
        key: 'conflicts',
        label: '开放冲突',
        value: loadError.conflicts ? '—' : conflictTotal.value,
        tone: conflictTotal.value > 0 ? 'orange' : 'blue',
        clickable: true,
        helper: '进入身份与冲突',
      },
      {
        key: 'failed-message',
        label: '异常消息',
        value: loadError.failedMessages ? '—' : failedMessageTotal.value,
        tone: failedMessageTotal.value > 0 ? 'orange' : 'gray',
        clickable: true,
        helper: '进入上报与异常',
      },
    ],
    {
      primaryKey: nationalIssueTotal.value > 0
        ? 'national'
        : ((healthBreachCount.value ?? 0) > 0
            ? 'health'
            : (unmatchedTotal.value > 0 ? 'unmatched' : 'national')),
      actionLabel: '进入处置',
    },
  ),
)

const ownerEntries = computed(() => [
  {
    owner: 'connection' as const,
    title: PORTFOLIO_INTEGRATION_OWNER_TITLE.connection,
    nextAction: '维护数据源与映射',
    readiness: loadError.datasources ? '数据源读取失败' : `${datasources.value.length} 条数据源`,
  },
  {
    owner: 'sync' as const,
    title: PORTFOLIO_INTEGRATION_OWNER_TITLE.sync,
    nextAction: '查看同步与清洗证据',
    readiness: loadError.syncTasks ? '同步日志读取失败' : `最近 ${syncTaskTotal.value} 条任务`,
  },
  {
    owner: 'identity' as const,
    title: PORTFOLIO_INTEGRATION_OWNER_TITLE.identity,
    nextAction: unmatchedTotal.value > 0 || conflictTotal.value > 0 ? '处置待匹配/冲突' : '巡检身份队列',
    readiness: loadError.unmatched || loadError.conflicts
      ? '队列读取失败'
      : `待匹配 ${unmatchedTotal.value} / 冲突 ${conflictTotal.value}`,
  },
  {
    owner: 'report' as const,
    title: PORTFOLIO_INTEGRATION_OWNER_TITLE.report,
    nextAction: nationalIssueTotal.value > 0 || failedMessageTotal.value > 0 ? '处理上报阻断' : '巡检上报与入站',
    readiness: loadError.nationalIssues || loadError.failedMessages
      ? '上报/异常读取失败'
      : `待修正 ${nationalIssueTotal.value} / 异常 ${failedMessageTotal.value}`,
  },
  {
    owner: 'dictionary' as const,
    title: PORTFOLIO_INTEGRATION_OWNER_TITLE.dictionary,
    nextAction: (healthBreachCount.value ?? 0) > 0 ? '处理 SLA 违约' : '维护字典与健康',
    readiness: loadError.health
      ? '健康读取失败'
      : `SLA 违约 ${(healthBreachCount.value ?? 0)}`,
  },
])

function openIntegrationOwner(
  owner: Exclude<PortfolioIntegrationOwner, 'cockpit'>,
  section?: string,
) {
  void router.push({
    name: PORTFOLIO_INTEGRATION_OWNER_ROUTE[owner],
    query: section ? { section } : undefined,
  })
}

function openCockpitMetric(key: string) {
  if (key === 'health') {
    openIntegrationOwner('dictionary', 'health')
    return
  }
  if (key === 'unmatched') {
    openIntegrationOwner('identity', 'unmatched')
    return
  }
  if (key === 'conflicts') {
    openIntegrationOwner('identity', 'conflicts')
    return
  }
  if (key === 'national') {
    openIntegrationOwner('report', 'national')
    return
  }
  if (key === 'failed-message') {
    openIntegrationOwner('report', 'failed-message')
  }
}

async function loadDatasources() {
  const currentToken = ++requestToken.datasources
  try {
    const res = await portfolioIntegrationApi.pageDatasource({
      pageNum: datasourceQuery.pageNum,
      pageSize: datasourceQuery.pageSize,
    })
    if (requestToken.datasources !== currentToken) return
    datasources.value = res.list ?? []
    loadError.datasources = ''
  } catch (error) {
    if (requestToken.datasources !== currentToken) return
    datasources.value = []
    loadError.datasources = '数据源加载失败，请重试'
    showUserError(error, '加载数据源失败')
  }
}

async function loadSyncTasks() {
  const currentToken = ++requestToken.syncTasks
  try {
    const res = await portfolioIntegrationApi.pageSyncLog({
      pageNum: syncTaskQuery.pageNum,
      pageSize: syncTaskQuery.pageSize,
    })
    if (requestToken.syncTasks !== currentToken) return
    syncTaskTotal.value = res.total ?? 0
    loadError.syncTasks = ''
  } catch (error) {
    if (requestToken.syncTasks !== currentToken) return
    syncTaskTotal.value = 0
    loadError.syncTasks = '同步日志加载失败'
    showUserError(error, '加载同步日志失败')
  }
}

async function loadUnmatched() {
  const currentToken = ++requestToken.unmatched
  try {
    const res = await portfolioIntegrationApi.pageIdentityUnmatched({
      pageNum: unmatchedQuery.pageNum,
      pageSize: unmatchedQuery.pageSize,
    })
    if (requestToken.unmatched !== currentToken) return
    unmatched.value = res.list ?? []
    unmatchedTotal.value = res.total ?? 0
    loadError.unmatched = ''
  } catch (error) {
    if (requestToken.unmatched !== currentToken) return
    unmatchedTotal.value = 0
    loadError.unmatched = '身份待匹配加载失败'
    showUserError(error, '加载身份待匹配失败')
  }
}

async function loadConflicts() {
  const currentToken = ++requestToken.conflicts
  try {
    const res = await portfolioIntegrationApi.pageConflict({
      pageNum: conflictQuery.pageNum,
      pageSize: conflictQuery.pageSize,
    })
    if (requestToken.conflicts !== currentToken) return
    conflicts.value = res.list ?? []
    conflictTotal.value = res.total ?? 0
    loadError.conflicts = ''
  } catch (error) {
    if (requestToken.conflicts !== currentToken) return
    conflictTotal.value = 0
    loadError.conflicts = '冲突单加载失败'
    showUserError(error, '加载冲突单失败')
  }
}

async function loadNationalIssues() {
  const currentToken = ++requestToken.nationalIssues
  try {
    const res = await portfolioIntegrationApi.pageNationalReportIssues({
      pageNum: nationalIssueQuery.pageNum,
      pageSize: nationalIssueQuery.pageSize,
      status: nationalIssueQuery.status,
    })
    if (requestToken.nationalIssues !== currentToken) return
    nationalIssues.value = res.list ?? []
    nationalIssueTotal.value = res.total ?? 0
    loadError.nationalIssues = ''
  } catch (error) {
    if (requestToken.nationalIssues !== currentToken) return
    nationalIssueTotal.value = 0
    loadError.nationalIssues = '上报待修正加载失败'
    showUserError(error, '加载上报待修正失败')
  }
}

async function loadHealth() {
  const currentToken = ++requestToken.health
  try {
    health.value = await portfolioIntegrationApi.healthDashboard()
    if (requestToken.health !== currentToken) return
    loadError.health = ''
  } catch (error) {
    if (requestToken.health !== currentToken) return
    health.value = null
    loadError.health = '健康看板加载失败'
    showUserError(error, '加载渠道健康失败')
  }
}

/** 与原 monolith 一致：未选 MESSAGE_PUSH 数据源时异常消息计数为 0，不误报。 */
async function loadFailedMessages() {
  failedMessages.value = []
  failedMessageTotal.value = 0
  loadError.failedMessages = ''
}

onMounted(async () => {
  await Promise.all([
    loadDatasources(),
    loadSyncTasks(),
    loadUnmatched(),
    loadConflicts(),
    loadNationalIssues(),
    loadHealth(),
    loadFailedMessages(),
  ])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="PORTFOLIO_INTEGRATION_OWNER_TITLE.cockpit"
        :subtitle="PORTFOLIO_INTEGRATION_OWNER_SUBTITLE.cockpit"
      />
    </template>

    <SignalBand
      layout="spotlight"
      :metrics="cockpitSignals"
      variant="panel"
      compact
      class="integration-dashboard__cockpit"
      @metric-click="openCockpitMetric"
    />
    <WorkbenchSurfaceCard class="integration-dashboard__panel">
      <template #head>
        <span class="integration-dashboard__panel-title">域 Owner</span>
      </template>
      <ul class="integration-dashboard__owner-list">
        <li
          v-for="entry in ownerEntries"
          :key="entry.owner"
          class="integration-dashboard__owner-item"
        >
          <div class="integration-dashboard__owner-copy">
            <strong>{{ entry.title }}</strong>
            <span>{{ entry.readiness }}</span>
            <span class="integration-dashboard__hint">{{ entry.nextAction }}</span>
          </div>
          <UiButton
            size="sm"
            variant="primary"
            @click="openIntegrationOwner(entry.owner)"
          >
            进入
          </UiButton>
        </li>
      </ul>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.integration-dashboard__cockpit {
  margin-bottom: var(--dp-space-component);
}

.integration-dashboard__panel {
  margin-bottom: var(--dp-space-component);
}

.integration-dashboard__panel-title {
  margin: 0;
  /* 字号/字重继承 WorkbenchSurfaceCard__head */
}

.integration-dashboard__owner-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.integration-dashboard__owner-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px solid var(--dp-border-subtle);
  border-radius: 6px;
}

.integration-dashboard__owner-copy {
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    color: var(--dp-text-primary);
    font-weight: 600;
  }

  span {
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
  }
}

.integration-dashboard__hint {
  color: var(--dp-text-muted) !important;
  font-size: var(--dp-font-size-xs) !important;
}
</style>
