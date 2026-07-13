<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ScannerOpsDeptTimingVO } from '@/apis/mark/scanner-ops'
import type { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadScannerOpsDashboard } from '@/apis/mark/scanner-ops'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  buildSuspectedMixedScanQueueRoute,
  fetchArchiveSuspectedMixedPendingTotal,
} from '@/utils/archive-suspected-mixed-navigation'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'ScanOpsPanel' })

const props = defineProps<{
  taskKind: ScanTaskKindCode
}>()

const emit = defineEmits<{
  'switch-tab': [tab: 'exception']
}>()

const router = useRouter()
const loading = ref(false)
const loadFailed = ref(false)
const dateRange = ref<[string, string] | null>(null)
const dashboard = ref<Awaited<ReturnType<typeof loadScannerOpsDashboard>> | null>(null)
const archiveMixedPendingTotal = ref<number | null>(null)

const deptColumns: ColumnsType<ScannerOpsDeptTimingVO> = [
  { title: '院系', key: 'departmentName', dataIndex: 'departmentName' },
  {
    title: '工单数',
    key: 'workOrderCount',
    dataIndex: 'workOrderCount',
    align: 'right',
    width: 96,
  },
  {
    title: '平均扫描(分钟)',
    key: 'avgScanDurationSeconds',
    dataIndex: 'avgScanDurationSeconds',
    align: 'right',
    width: 140,
  },
]

function toRatePercent(rate?: number) {
  if (rate == null) {
    return 0
  }
  return rate * 100
}

function toDurationMinutes(seconds?: number) {
  if (seconds == null) {
    return null
  }
  return seconds / 60
}

const signalMetrics = computed<SignalMetric[]>(() => {
  const d = dashboard.value
  if (!d) {
    return []
  }
  const failureRatePercent = toRatePercent(d.failureRate)
  const mixedRatePercent = toRatePercent(d.mixedRate)
  return [
    {
      key: 'scan-pages',
      label: '扫描页数',
      value: String(d.totalPages ?? 0),
      tone: 'blue',
    },
    {
      key: 'work-orders',
      label: '工单总数',
      value: String(d.totalWorkOrders ?? 0),
      tone: 'gray',
    },
    {
      key: 'failure-rate',
      label: '失败率',
      value: `${failureRatePercent.toFixed(1)}%`,
      tone: failureRatePercent > 0 ? 'red' : 'green',
      helper: `${d.failedWorkOrders ?? 0} 个失败`,
    },
    {
      key: 'mixed-rate',
      label: '混扫率',
      value: `${mixedRatePercent.toFixed(1)}%`,
      tone: mixedRatePercent > 0 ? 'orange' : 'green',
      helper:
        archiveMixedPendingTotal.value != null
          ? `${archiveMixedPendingTotal.value} 个待复核（归档待办）`
          : undefined,
    },
  ]
})

const opsConclusion = computed(() => {
  if (loadFailed.value) {
    return {
      tone: 'error' as const,
      title: '运营体检加载失败',
      description: '无法汇总本时段吞吐与混扫。可返回异常处置继续共享队列结案。',
      actionLabel: '返回异常处置',
      actionKey: 'exception' as const,
    }
  }
  const d = dashboard.value
  if (!d) {
    return null
  }
  const pages = d.totalPages ?? 0
  const orders = d.totalWorkOrders ?? 0
  const failed = d.failedWorkOrders ?? 0
  const failureRatePercent = toRatePercent(d.failureRate)
  const mixedRatePercent = toRatePercent(d.mixedRate)
  const mixedPending = archiveMixedPendingTotal.value ?? 0
  const deptCount = d.deptTimings?.length ?? 0

  if (pages === 0 && orders === 0) {
    return {
      tone: 'info' as const,
      title: '本时段尚无扫描吞吐',
      description: '当前时间窗没有工单与页数。可调整日期，或回到异常处置处理既有阻断。',
      actionLabel: '返回异常处置',
      actionKey: 'exception' as const,
    }
  }

  if (mixedRatePercent > 0 || mixedPending > 0) {
    return {
      tone: 'warning' as const,
      title:
        `混扫需关注：混扫率 ${mixedRatePercent.toFixed(1)}%`
        + (mixedPending > 0 ? `，待复核 ${mixedPending}` : ''),
      description: `本时段 ${pages} 页 / ${orders} 工单；失败 ${failed}（${failureRatePercent.toFixed(1)}%）。混扫待办全组可见，可进入复核或返回异常队列。`,
      actionLabel: mixedPending > 0 ? '打开混扫复核' : '返回异常处置',
      actionKey: mixedPending > 0 ? ('mixed' as const) : ('exception' as const),
    }
  }

  if (failureRatePercent > 0) {
    return {
      tone: 'warning' as const,
      title: `失败需关注：失败率 ${failureRatePercent.toFixed(1)}%`,
      description: `本时段 ${pages} 页 / ${orders} 工单，失败 ${failed}。建议回到异常处置与失败派单分工结案。`,
      actionLabel: '返回异常处置',
      actionKey: 'exception' as const,
    }
  }

  return {
    tone: 'success' as const,
    title: `本时段吞吐正常：${pages} 页 / ${orders} 工单`,
    description:
      deptCount > 0
        ? `已汇总 ${deptCount} 个院系时效，可继续下钻院系表。`
        : '院系时效切片未返回数据；若业务需要院系维度，请确认后端聚合结果。',
    actionLabel: '返回异常处置',
    actionKey: 'exception' as const,
  }
})

const deptEmptyDescription = computed(() => {
  if (loadFailed.value) {
    return '运营体检加载失败，院系时效不可用'
  }
  if (!dashboard.value) {
    return '正在准备院系时效切片'
  }
  const pages = dashboard.value.totalPages ?? 0
  const orders = dashboard.value.totalWorkOrders ?? 0
  if (pages === 0 && orders === 0) {
    return '本时段无扫描吞吐，院系时效无可汇总条目'
  }
  return '本时段有吞吐，但未返回院系时效切片；请确认后端是否聚合 department 维度'
})

async function loadArchiveMixedPendingTotal() {
  const total = await fetchArchiveSuspectedMixedPendingTotal().catch(() => 0)
  archiveMixedPendingTotal.value = total > 0 ? total : null
}

async function loadDashboard() {
  loading.value = true
  loadFailed.value = false
  try {
    const [nextDashboard] = await Promise.all([
      loadScannerOpsDashboard({
        taskKind: props.taskKind,
        startTime: dateRange.value?.[0] ? `${dateRange.value[0]}T00:00:00` : undefined,
        endTime: dateRange.value?.[1] ? `${dateRange.value[1]}T23:59:59` : undefined,
      }),
      loadArchiveMixedPendingTotal(),
    ])
    dashboard.value = nextDashboard
  } catch (error) {
    dashboard.value = null
    loadFailed.value = true
    showUserError(error, '扫描运营看板加载失败')
  } finally {
    loading.value = false
  }
}

function handleDateChange(_: unknown, dateStrings: [string, string]) {
  dateRange.value = dateStrings[0] && dateStrings[1] ? dateStrings : null
  void loadDashboard()
}

function handleConclusionAction(actionKey: 'exception' | 'mixed') {
  if (actionKey === 'mixed') {
    void router.push(buildSuspectedMixedScanQueueRoute())
    return
  }
  emit('switch-tab', 'exception')
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <div class="scan-ops-panel">
    <div class="scan-ops-panel__toolbar">
      <a-range-picker value-format="YYYY-MM-DD" @change="handleDateChange" />
      <UiButton size="sm" variant="outline" :loading="loading" @click="() => loadDashboard()">
        刷新
      </UiButton>
    </div>

    <UiAlertStrip
      v-if="opsConclusion"
      dense
      :tone="opsConclusion.tone"
      :title="opsConclusion.title"
      :description="opsConclusion.description"
      class="scan-ops-panel__conclusion"
    >
      <template #actions>
        <UiButton
          size="sm"
          variant="outline"
          @click="handleConclusionAction(opsConclusion.actionKey)"
        >
          {{ opsConclusion.actionLabel }}
        </UiButton>
      </template>
    </UiAlertStrip>

    <SignalBand
      v-if="signalMetrics.length"
      variant="panel"
      :metrics="signalMetrics"
      compact
      class="scan-ops-panel__signal"
    />

    <WorkbenchSurfaceCard flush>
      <template #head>院系时效</template>
      <UiDataTable
        pagination-mode="none"
        :columns="deptColumns"
        :data-source="dashboard?.deptTimings ?? []"
        :loading="loading"
        :show-pagination="false"
        row-key="departmentId"
        size="middle"
        flat
        :empty-description="deptEmptyDescription"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'departmentName'">
            {{ record.departmentName || record.departmentId || '—' }}
          </template>
          <template v-else-if="column.key === 'avgScanDurationSeconds'">
            {{
              toDurationMinutes(record.avgScanDurationSeconds) != null
                ? toDurationMinutes(record.avgScanDurationSeconds)!.toFixed(1)
                : '—'
            }}
          </template>
          <template v-else-if="column.key === 'workOrderCount'">
            {{ record.workOrderCount == null ? '—' : record.workOrderCount }}
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
  </div>
</template>

<style scoped>
.scan-ops-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.scan-ops-panel__conclusion {
  margin-bottom: 12px;
}

.scan-ops-panel__signal {
  margin-bottom: 12px;
}
</style>
