<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioExpertAssignmentVO } from '@/apis/portfolio/expert-assignment'
import type { UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioExpertAssignmentApi } from '@/apis/portfolio/expert-assignment'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useUserStore } from '@/stores/modules/user'
import {
  PortfolioExpertAssignmentStatusCode,
  PortfolioExpertAssignmentStatusDescription,
} from '@/types/enums/portfolio-expert-assignment-status-enum'
import { showUserError } from '@/utils/error-handler'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'

/**
 * 外部专家工作台：默认列出本人有效授权；站内信 assignmentId 深链可命中吊销/过期态（PF-P0-400）。
 */
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const requestToken = ref(0)
const rows = ref<PortfolioExpertAssignmentVO[]>([])
const total = ref(0)

const pageActiveAssignmentCount = computed(() =>
  rows.value.filter((row) => row.assignmentStatus === PortfolioExpertAssignmentStatusCode.ACTIVE)
    .length,
)

const expertSignalMetrics = computed<SignalMetric[]>(() => {
  if (loadError.value && total.value === 0) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'total',
      label: '专家授权',
      value: total.value,
      clickable: true,
    },
  ]
  if (rows.value.length > 0) {
    metrics.push({
      key: 'page-active',
      label: '本页有效',
      value: pageActiveAssignmentCount.value,
      helper: '仅当前页',
    })
  }
  return applySpotlightEmphasis(metrics, {
    primaryKey: 'total',
    actionLabel: '刷新',
  })
})

const expertWorkbenchSubtitle = computed(() => {
  if (loadError.value) {
    return '加载失败'
  }
  if (pageActiveAssignmentCount.value > 0) {
    return `${total.value} 条授权 · 本页有效 ${pageActiveAssignmentCount.value}`
  }
  return `${total.value} 条授权`
})

function onExpertSignalClick(_key: string) {
  void loadAssignments()
}

const focusedAssignmentId = ref('')
const deepLinkNoticeVisible = ref(true)
const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const columns: ColumnsType = [
  { title: '评价任务', dataIndex: 'evaluationTaskName', key: 'evaluationTaskName', ellipsis: true },
  { title: '任务 ID', dataIndex: 'evaluationTaskId', key: 'evaluationTaskId', width: 140 },
  { title: '状态', key: 'assignmentStatus', width: 100 },
  { title: '过期时间', dataIndex: 'expireTime', key: 'expireTime', width: 180 },
  { title: '脱敏', key: 'maskRequired', width: 90 },
  { title: '主行动', key: 'actions', width: 220 },
]

function readRouteStringParam(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0].trim()
  }
  return ''
}

function statusLabel(code?: PortfolioExpertAssignmentStatusCode | string): string {
  return strictEnumLabel(
    PortfolioExpertAssignmentStatusDescription,
    code as PortfolioExpertAssignmentStatusCode,
    '专家授权状态',
  )
}

function statusTone(code?: string): 'green' | 'gray' | 'orange' | 'red' {
  if (code === PortfolioExpertAssignmentStatusCode.ACTIVE) return 'green'
  if (code === PortfolioExpertAssignmentStatusCode.EXPIRED) return 'orange'
  if (code === PortfolioExpertAssignmentStatusCode.REVOKED) return 'red'
  return 'gray'
}

const focusedAssignment = computed(() => {
  if (!focusedAssignmentId.value) {
    return null
  }
  return rows.value.find((row) => String(row.id) === focusedAssignmentId.value) ?? null
})

const deepLinkAlert = computed(() => {
  const row = focusedAssignment.value
  if (!row) {
    return null
  }
  const taskName = row.evaluationTaskName || `评价任务#${row.evaluationTaskId || ''}`
  const status = statusLabel(row.assignmentStatus)
  if (row.assignmentStatus === PortfolioExpertAssignmentStatusCode.REVOKED) {
    return {
      tone: 'warning' as const,
      title: '评审授权已吊销',
      description: `「${taskName}」授权状态：${status}。请停止审阅与填报；如需继续请联系评价组织方。`,
    }
  }
  if (row.assignmentStatus === PortfolioExpertAssignmentStatusCode.EXPIRED) {
    return {
      tone: 'warning' as const,
      title: '评审授权已过期',
      description: `「${taskName}」授权状态：${status}。请停止审阅与填报；如需继续请联系评价组织方重新授权。`,
    }
  }
  return {
    tone: 'info' as const,
    title: '站内信定位授权',
    description: `「${taskName}」授权状态：${status}。可进入脱敏审阅或评价填报。`,
  }
})

function assignmentRowClassName(record: PortfolioExpertAssignmentVO): string {
  if (focusedAssignmentId.value && String(record.id) === focusedAssignmentId.value) {
    return 'expert-workbench__row--focus'
  }
  return ''
}

function canEnterReview(row: PortfolioExpertAssignmentVO): boolean {
  return row.assignmentStatus === PortfolioExpertAssignmentStatusCode.ACTIVE
}

async function loadAssignments() {
  const expertUserId = userStore.userInfo.userId
  if (!expertUserId) {
    rows.value = []
    total.value = 0
    failLoad()
    showUserError(new Error('当前会话缺少用户身份，无法加载专家授权'), '加载失败')
    return
  }
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  beginLoad()
  loading.value = true
  try {
    const deepId = focusedAssignmentId.value
    const result = await portfolioExpertAssignmentApi.page({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      id: deepId || undefined,
      expertUserId: String(expertUserId),
      // 深链精确命中时不限 ACTIVE，否则吊销/过期授权永远不在列表
      assignmentStatus: deepId ? undefined : PortfolioExpertAssignmentStatusCode.ACTIVE,
    })
    if (requestToken.value !== currentToken) return
    rows.value = result.list ?? []
    total.value = result.total ?? 0
    if (deepId) {
      const hit = rows.value.some((row) => String(row.id) === deepId)
      if (!hit) {
        void message.warning(`未找到授权 assignmentId=${deepId}，请确认是否属于当前专家账号`)
      }
    }
    okLoad()
  } catch (error) {
    if (requestToken.value !== currentToken) return
    failLoad()
    showUserError(error, '加载专家授权失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

/**
 * PF-P0-400：消费站内信 jumpUrl `/portfolio/expert/workbench?assignmentId=`
 * 吊销/过期通知须能命中对应授权并展示状态，禁止落到空白有效列表。
 */
async function applyAssignmentDeepLink() {
  const assignmentId = readRouteStringParam(route.query.assignmentId)
  focusedAssignmentId.value = assignmentId
  deepLinkNoticeVisible.value = true
  if (assignmentId) {
    pagination.current = 1
  }
  await loadAssignments()
}

function onPageChange(page: { current: number, pageSize: number }) {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  if (focusedAssignmentId.value) {
    focusedAssignmentId.value = ''
  }
  void loadAssignments()
}

/** 专家任务行：评价填报为主行动 */
function buildAssignmentRowActions(record: PortfolioExpertAssignmentVO): UiTableRowActionItem[] {
  const disabled = !canEnterReview(record)
  return [
    { key: 'fill', label: '评价填报', tone: 'primary', disabled },
    { key: 'review', label: '脱敏审阅', disabled },
  ]
}

function handleAssignmentRowAction(key: string, record: PortfolioExpertAssignmentVO): void {
  if (key === 'fill') {
    goFill(record)
    return
  }
  if (key === 'review') {
    goReview(record)
  }
}
function goReview(row: PortfolioExpertAssignmentVO) {
  if (!canEnterReview(row)) {
    void message.warning('当前授权不可进入脱敏审阅（已吊销或已过期）')
    return
  }
  void router.push({
    path: '/portfolio/expert/review',
    query: { assignmentId: row.id },
  })
}

function goFill(row: PortfolioExpertAssignmentVO) {
  if (!canEnterReview(row)) {
    void message.warning('当前授权不可进入评价填报（已吊销或已过期）')
    return
  }
  void router.push({
    path: '/portfolio/expert/evaluation-fill',
    query: {
      evaluationTaskId: row.evaluationTaskId,
      assignmentId: row.id,
    },
  })
}

onMounted(() => {
  void applyAssignmentDeepLink()
})

watch(
  () => route.query.assignmentId,
  (next, prev) => {
    if (next === prev) {
      return
    }
    void applyAssignmentDeepLink()
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="专家评审工作台"
        :subtitle="expertWorkbenchSubtitle"
      />
    </template>

    <template v-if="expertSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="expertSignalMetrics"
        @metric-click="onExpertSignalClick"
      />
    </template>

    <UiAlertStrip
      v-if="deepLinkAlert && deepLinkNoticeVisible"
      class="expert-workbench__deeplink"
      :tone="deepLinkAlert.tone"
      size="sm"
      dense
      closable
      :title="deepLinkAlert.title"
      :description="deepLinkAlert.description"
      @close="deepLinkNoticeVisible = false"
    />
    <UiCard :loading="loading">
      <UiDataTable
        :load-error="loadError"
        :columns="columns"
        :data-source="rows"
        :total="total"
        :current="pagination.current"
        :page-size="pagination.pageSize"
        :row-class-name="assignmentRowClassName"
        row-key="id"
        flat
        empty-kind="first-run"
        empty-description="暂无有效外部专家授权。请等待学校管理员分派评审任务，或使用免登审阅链接。"
        @page-change="onPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'assignmentStatus'">
            <UiTag :tone="statusTone(record.assignmentStatus)">
              {{ statusLabel(record.assignmentStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'maskRequired'">
            <UiTag :tone="record.maskRequired ? 'green' : 'gray'">
              {{ record.maskRequired ? '已脱敏' : '未脱敏' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :max-visible="2"
              class="expert-workbench__fill"
              :items="buildAssignmentRowActions(record)"
              split
              @action="(key) => handleAssignmentRowAction(key, record)"
            />
          </template>
        </template>
        <template #emptyText>
          <UiEmpty
            size="sm"
            title="暂无授权记录"
            :description="
              focusedAssignmentId
                ? '深链授权不存在或不属于当前专家。'
                : '当前账号没有 ACTIVE 且未过期的外部专家授权。'
            "
          />
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.expert-workbench__fill {
  margin-left: var(--dp-space-component-tight);
}

.expert-workbench__deeplink {
  margin-bottom: var(--dp-space-component);
}

:deep(.expert-workbench__row--focus > td) {
  background: color-mix(in srgb, var(--dp-color-primary) 10%, transparent);
}
</style>
