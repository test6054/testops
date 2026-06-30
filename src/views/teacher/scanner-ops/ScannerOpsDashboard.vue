<script setup lang="ts">
import type { SignalMetric } from '@/types/workbench'
import { computed, onMounted, ref } from 'vue'
import { loadScannerOpsDashboard } from '@/apis/mark/scanner-ops'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiLoadFailure from '@/components/ui-guide/ui/UiLoadFailure.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePageLoadFailure } from '@/composables/usePageLoadFailure'

defineOptions({ name: 'ScannerOpsDashboard' })

const loading = ref(false)
const { loadError, captureLoadFailure, clearLoadFailure } = usePageLoadFailure()
const dateRange = ref<[string, string] | null>(null)
const dashboard = ref<Awaited<ReturnType<typeof loadScannerOpsDashboard>> | null>(null)

const deptColumns = [
  { title: '院系', key: 'departmentName', dataIndex: 'departmentName' },
  { title: '工单数', key: 'workOrderCount', dataIndex: 'workOrderCount', align: 'right' as const, width: 96 },
  { title: '平均扫描(分钟)', key: 'avgScanDurationSeconds', dataIndex: 'avgScanDurationSeconds', align: 'right' as const, width: 140 },
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
      helper: `${d.suspectedMixedBatches ?? 0} 个疑似混扫`,
    },
  ]
})

async function loadDashboard() {
  loading.value = true
  clearLoadFailure()
  try {
    dashboard.value = await loadScannerOpsDashboard({
      startTime: dateRange.value?.[0] ? `${dateRange.value[0]}T00:00:00` : undefined,
      endTime: dateRange.value?.[1] ? `${dateRange.value[1]}T23:59:59` : undefined,
    })
  }
  catch (error) {
    dashboard.value = null
    captureLoadFailure(error, '扫描运营看板加载失败')
  }
  finally {
    loading.value = false
  }
}

function handleDateChange(_: unknown, dateStrings: [string, string]) {
  dateRange.value = dateStrings[0] && dateStrings[1] ? dateStrings : null
  void loadDashboard()
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        title="扫描运营看板"
        subtitle="扫描量、失败率、院系时效与混扫率"
      >
        <template #actions>
          <a-range-picker
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
          <UiButton size="sm" variant="outline" :loading="loading" @click="() => loadDashboard()">
            刷新
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="!loadError && signalMetrics.length" #signal>
      <SignalBand :metrics="signalMetrics" variant="panel" />
    </template>

    <UiLoadFailure
      v-if="loadError"
      title="扫描运营看板加载失败"
      :description="loadError"
    />

    <section v-else class="scanner-ops-dashboard__section">
      <h3 class="scanner-ops-dashboard__section-title">院系时效</h3>
      <UiDataTable
        pagination-mode="none"
        :columns="deptColumns"
        :data-source="dashboard?.deptTimings ?? []"
        :loading="loading"
        :show-pagination="false"
        row-key="departmentId"
        size="middle"
        flat
        empty-description="暂无院系统计数据"
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
            {{ record.workOrderCount ?? 0 }}
          </template>
        </template>
      </UiDataTable>
    </section>
  </StageWorkbenchShell>
</template>

<style scoped>
.scanner-ops-dashboard__section {
  margin-top: 8px;
}
.scanner-ops-dashboard__section-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}
</style>
