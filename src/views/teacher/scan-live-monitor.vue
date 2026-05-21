<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="scan-live__context">
        <div class="scan-live__context-info">
          <h2 class="scan-live__title">阅卷交付 - 扫描识别实时工作台</h2>
          <a-select
            :value="selectedExamId"
            class="scan-live__exam-select"
            placeholder="选择考试（不选则不过滤）"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
        </div>
        <div class="scan-live__context-actions">
          <UiTag :tone="connectionTone" size="sm">
            <span class="scan-live__conn-dot" :class="`scan-live__conn-dot--${connectionTone}`" />
            {{ connectionLabel }}
          </UiTag>
          <UiButton
            variant="outline"
            size="sm"
            :loading="!isStreaming && !ready"
            @click="handleRefresh"
          >
            重新订阅
          </UiButton>
        </div>
      </div>
    </template>

    <!-- 实时监控概览 -->
    <div class="scan-live__overview">
      <div class="scan-live__health-ring">
        <UiRingProgress :percent="healthPercent" size="lg" :color="healthColor" label="健康度" />
      </div>
      <UiStatPanel
        :items="statMetrics"
        :columns="3"
        variant="grid"
        compact
        class="scan-live__stats"
      />
    </div>

    <section class="scan-live__filter">
      <header class="scan-live__panel-header">
        <h3 class="scan-live__panel-title">
          <FilterOutlined />
          过滤条件
        </h3>
      </header>
      <a-form layout="inline" :model="filterForm">
        <a-form-item label="工位机 ID">
          <a-input
            v-model:value="filterForm.scannerStationId"
            placeholder="按工位机 ID 精确过滤"
            allow-clear
            class="scan-live__filter-input"
            @change="handleFilterChange"
            @press-enter="handleFilterChange"
          />
        </a-form-item>
        <a-form-item label="扫描设备 ID">
          <a-input
            v-model:value="filterForm.scannerDeviceId"
            placeholder="按扫描设备 ID 精确过滤"
            allow-clear
            class="scan-live__filter-input"
            @change="handleFilterChange"
            @press-enter="handleFilterChange"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <UiButton size="sm" @click="handleFilterChange"> 应用过滤 </UiButton>
            <UiButton size="sm" variant="outline" @click="resetFilter"> 重置 </UiButton>
          </a-space>
        </a-form-item>
      </a-form>
    </section>

    <section class="scan-live__panel">
      <header class="scan-live__panel-header">
        <h3 class="scan-live__panel-title">
          <ThunderboltOutlined />
          实时事件流
        </h3>
        <span class="scan-live__panel-meta">
          {{ groupedByStation.length }} 个工位机 · 最新在前
        </span>
      </header>

      <UiEmpty
        v-if="events.length === 0"
        description="暂无扫描事件，等待扫描端推送中..."
        class="scan-live__empty"
      />

      <div v-else class="scan-live__station-grid">
        <article
          v-for="group in groupedByStation"
          :key="group.stationId"
          class="scan-live__station"
        >
          <header class="scan-live__station-header">
            <DesktopOutlined />
            <span class="scan-live__station-id">{{ group.stationId }}</span>
            <UiBadge tone="blue">
              {{ group.list.length }}
            </UiBadge>
            <span class="scan-live__station-time">
              最近：{{ formatTime(group.list[0]?.scanEndTime) }}
            </span>
          </header>
          <transition-group tag="div" name="event-fade" class="scan-live__event-list">
            <div
              v-for="event in group.list"
              :key="event.eventId"
              class="scan-live__event-row"
              @click="openDetail(event)"
            >
              <div class="scan-live__event-main">
                <UiTag :tone="event.status === 'BATCHED' ? 'green' : 'orange'" size="sm">
                  {{ event.status === 'BATCHED' ? '已聚合' : '待聚合' }}
                </UiTag>
                <span class="scan-live__event-device">{{ event.scannerDeviceId || '-' }}</span>
                <span class="scan-live__hint">·</span>
                <span>{{ event.pageCount ?? 0 }} 页</span>
              </div>
              <div class="scan-live__event-meta">
                <span class="scan-live__event-time">{{
                  formatTime(event.scanEndTime || event.createTime)
                }}</span>
                <span v-if="event.scannerIp" class="scan-live__hint">{{ event.scannerIp }}</span>
              </div>
            </div>
          </transition-group>
        </article>
      </div>
    </section>

    <UiDrawer
      :open="drawerOpen"
      :title="`扫描事件 #${currentEvent?.eventId ?? ''}`"
      :width="520"
      hide-footer
      @update:open="(v: boolean) => (drawerOpen = v)"
      @close="drawerOpen = false"
    >
      <a-descriptions v-if="currentEvent" :column="1" size="small" bordered>
        <a-descriptions-item label="事件ID">{{ currentEvent.eventId }}</a-descriptions-item>
        <a-descriptions-item label="考试ID">{{ currentEvent.examId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="工位机">
          {{ currentEvent.scannerStationId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描设备">
          {{ currentEvent.scannerDeviceId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="设备IP">
          {{ currentEvent.scannerIp || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="页数">{{ currentEvent.pageCount ?? 0 }}</a-descriptions-item>
        <a-descriptions-item label="状态">
          <UiTag :tone="currentEvent.status === 'BATCHED' ? 'green' : 'orange'" size="sm">
            {{ currentEvent.status || '-' }}
          </UiTag>
        </a-descriptions-item>
        <a-descriptions-item label="扫描批次ID">
          {{ currentEvent.scanBatchId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描端报告ID">
          {{ currentEvent.reportId || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描端批次号">
          {{ currentEvent.batchExternalNo || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="来源文件">
          <span v-if="!currentEvent.sourceFileIds?.length" class="scan-live__hint">-</span>
          <a-space v-else wrap>
            <UiTag v-for="fileId in currentEvent.sourceFileIds" :key="fileId" tone="blue" size="sm">
              {{ fileId }}
            </UiTag>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="扫描开始时间">
          {{ formatTime(currentEvent.scanStartTime) }}
        </a-descriptions-item>
        <a-descriptions-item label="扫描结束时间">
          {{ formatTime(currentEvent.scanEndTime) }}
        </a-descriptions-item>
        <a-descriptions-item label="入库时间">
          {{ formatTime(currentEvent.createTime) }}
        </a-descriptions-item>
      </a-descriptions>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
/**
 * 阅卷交付 - 扫描识别实时工作台
 *
 * 后端契约：
 * - useScanLiveStream：SSE 实时事件流，过滤条件 examId / scannerStationId / scannerDeviceId
 * - useMarkExamSelector：考试选择器（不同步 URL）
 */
import type { ScanLiveEventVO } from '@/apis/mark/scan-live'
import DesktopOutlined from '@ant-design/icons-vue/DesktopOutlined'
import FilterOutlined from '@ant-design/icons-vue/FilterOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  UiBadge,
  UiButton,
  UiDrawer,
  UiEmpty,
  UiRingProgress,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useScanLiveStream } from '@/composables/useScanLiveStream'

defineOptions({ name: 'TeacherScanLiveMonitor' })

type ConnectionTone = 'green' | 'orange' | 'red' | 'gray'

const filterForm = reactive({
  scannerStationId: '',
  scannerDeviceId: '',
})

const drawerOpen = ref(false)
const currentEvent = ref<ScanLiveEventVO | null>(null)

const {
  selectedExamId,
  examOptions,
  loading: examLoading,
  init: initExamSelector,
  onExamChange: onExamSelectorChange,
} = useMarkExamSelector({ syncUrl: false })

const { events, ready, isStreaming, error, start, stop, refresh } = useScanLiveStream({
  filter: () => ({
    examId: selectedExamId.value || undefined,
    scannerStationId: filterForm.scannerStationId.trim() || undefined,
    scannerDeviceId: filterForm.scannerDeviceId.trim() || undefined,
  }),
  initialLimit: 50,
  maxEvents: 200,
})

const connectionTone = computed<ConnectionTone>(() => {
  if (error.value) return 'red'
  if (ready.value) return 'green'
  if (isStreaming.value) return 'orange'
  return 'gray'
})

const connectionLabel = computed(() => {
  if (error.value) return '连接异常'
  if (ready.value) return '实时连接中'
  if (isStreaming.value) return '正在建立连接'
  return '未连接'
})

const batchedCount = computed(() => events.value.filter((e) => e.status === 'BATCHED').length)
const pendingCount = computed(() => events.value.filter((e) => e.status !== 'BATCHED').length)

const totalPageCount = computed(() => events.value.reduce((sum, e) => sum + (e.pageCount ?? 0), 0))

const healthPercent = computed(() => {
  if (!ready.value && !isStreaming.value) return 0
  if (error.value) return 20
  if (!ready.value) return 50
  const total = events.value.length
  if (total === 0) return 100
  const batchedRatio = total > 0 ? (batchedCount.value / total) * 100 : 100
  return Math.round(batchedRatio)
})

const healthColor = computed(() => {
  if (healthPercent.value >= 80) return '#16a34a'
  if (healthPercent.value >= 50) return '#3b82f6'
  if (healthPercent.value >= 30) return '#f59e0b'
  return '#dc2626'
})

const statMetrics = computed(() => [
  {
    label: '当前事件数',
    value: events.value.length,
    unit: '条',
    tone: events.value.length > 0 ? ('blue' as const) : ('gray' as const),
  },
  {
    label: '已聚合',
    value: batchedCount.value,
    unit: '条',
    tone: batchedCount.value > 0 ? ('green' as const) : ('gray' as const),
  },
  {
    label: '待聚合',
    value: pendingCount.value,
    unit: '条',
    tone: pendingCount.value > 0 ? ('orange' as const) : ('gray' as const),
  },
  { label: '总页数', value: totalPageCount.value, unit: '页', tone: 'blue' as const },
  {
    label: '工位机数',
    value: groupedByStation.value.length,
    unit: '个',
    tone: groupedByStation.value.length > 0 ? ('blue' as const) : ('gray' as const),
  },
  {
    label: '连接状态',
    value: connectionLabel.value,
    tone: connectionTone.value as 'green' | 'orange' | 'red' | 'gray',
  },
])

/** 按工位机分组当前事件，工位机内部按 events 顺序（最新在前） */
const groupedByStation = computed(() => {
  const groups = new Map<string, ScanLiveEventVO[]>()
  for (const event of events.value) {
    const key = event.scannerStationId || '(未指定工位机)'
    const list = groups.get(key)
    if (list) {
      list.push(event)
    } else {
      groups.set(key, [event])
    }
  }
  return Array.from(groups, ([stationId, list]) => ({ stationId, list }))
})

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('HH:mm:ss')
}

function openDetail(event: ScanLiveEventVO): void {
  currentEvent.value = event
  drawerOpen.value = true
}

async function onExamChange(value: unknown, option: unknown): Promise<void> {
  // 按 useMarkExamSelector 的同步参数传递选中考试，保持内部 URL 同步逻辑
  onExamSelectorChange(value as never, option as never)
  await refresh()
}

async function handleRefresh(): Promise<void> {
  await refresh()
}

async function handleFilterChange(): Promise<void> {
  await refresh()
}

async function resetFilter(): Promise<void> {
  filterForm.scannerStationId = ''
  filterForm.scannerDeviceId = ''
  await refresh()
}

onMounted(async () => {
  await initExamSelector()
  await start()
})

onBeforeUnmount(() => {
  stop()
})
</script>

<style lang="scss" scoped>
.scan-live {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 280px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__exam-select {
    width: 280px;
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__overview {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__health-ring {
    flex-shrink: 0;
  }

  &__stats {
    flex: 1;
    min-width: 0;
  }

  &__filter,
  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__panel-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__filter-input {
    width: 220px;
  }

  &__empty {
    padding: 48px 0;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__conn-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;

    &--green {
      background: var(--ant-color-success, #16a34a);
      box-shadow: 0 0 6px var(--ant-color-success, #16a34a);
    }

    &--orange {
      background: var(--ant-color-warning, #ea580c);
    }

    &--red {
      background: var(--ant-color-error, #dc2626);
    }

    &--gray {
      background: var(--dp-text-disabled, #94a3b8);
    }
  }

  &__station-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 16px;
  }

  &__station {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border-light, #e2e8f0);
    border-radius: 6px;
    padding: 12px;
  }

  &__station-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--dp-border-light, #f1f5f9);
    font-size: 13px;
    color: var(--dp-text-primary, #0f172a);
  }

  &__station-id {
    font-weight: 600;
  }

  &__station-time {
    margin-left: auto;
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__event-list {
    max-height: 360px;
    overflow-y: auto;
  }

  &__event-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 0;
    border-bottom: 1px solid var(--dp-border-light, #f1f5f9);
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--dp-hover-bg, #f8fafc);
    }
  }

  &__event-main {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  &__event-device {
    font-weight: 500;
    color: var(--dp-text-primary, #0f172a);
  }

  &__event-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__event-time {
    font-variant-numeric: tabular-nums;
  }
}

.event-fade-enter-active {
  transition: all 0.35s ease;
}

.event-fade-leave-active {
  transition: all 0.2s ease;
}

.event-fade-enter-from {
  opacity: 0;
  transform: translateY(-8px);
  background: color-mix(in srgb, var(--ant-color-success, #16a34a) 12%, transparent);
}

.event-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
