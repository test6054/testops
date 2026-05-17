<template>
  <GiPageLayout>
    <div class="scan-live-page">
      <PageHeader title="扫描实时看板">
        <template #tags>
          <UiTag :tone="connectionTone" size="md">
            <span class="status-dot" :class="`status-dot--${connectionTone}`" />
            {{ connectionLabel }}
          </UiTag>
          <UiBadge :tone="events.length > 0 ? 'blue' : 'gray'">
            {{ events.length }} 条事件
          </UiBadge>
        </template>
        <template #actions>
          <a-select
            :value="selectedExamId"
            style="width: 280px"
            placeholder="选择考试（不选则不过滤）"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiButton
            variant="outline"
            size="sm"
            :loading="!isStreaming && !ready"
            @click="handleRefresh"
          >
            <template #icon><ReloadOutlined /></template>
            重新订阅
          </UiButton>
        </template>
      </PageHeader>

      <UiCard class="scan-live-page__filter-card">
        <template #title>
          <FilterOutlined />
          <span>过滤条件</span>
        </template>
        <a-form layout="inline" :model="filterForm">
          <a-form-item label="工位机ID">
            <a-input
              v-model:value="filterForm.scannerStationId"
              placeholder="按工位机ID精确过滤"
              allow-clear
              style="width: 220px"
              @change="handleFilterChange"
              @press-enter="handleFilterChange"
            />
          </a-form-item>
          <a-form-item label="扫描设备ID">
            <a-input
              v-model:value="filterForm.scannerDeviceId"
              placeholder="按扫描设备ID精确过滤"
              allow-clear
              style="width: 220px"
              @change="handleFilterChange"
              @press-enter="handleFilterChange"
            />
          </a-form-item>
          <a-form-item>
            <a-space>
              <UiButton size="sm" @click="handleFilterChange">应用过滤</UiButton>
              <UiButton size="sm" variant="outline" @click="resetFilter">重置</UiButton>
            </a-space>
          </a-form-item>
        </a-form>
      </UiCard>

      <UiCard class="scan-live-page__main-card">
        <template #title>
          <ThunderboltOutlined />
          <span>实时事件流</span>
          <UiTag :tone="ready ? 'green' : 'gray'" size="sm">
            {{ ready ? '已建立连接' : '等待连接' }}
          </UiTag>
        </template>
        <template #extra>
          <span class="muted"> {{ groupedByStation.length }} 个工位机 · 最新在前 </span>
        </template>

        <UiEmpty
          v-if="events.length === 0"
          description="暂无扫描事件，等待扫描端推送中..."
          class="empty-block"
        />

        <div v-else class="station-grid">
          <UiCard v-for="group in groupedByStation" :key="group.stationId" class="station-card">
            <template #title>
              <DesktopOutlined />
              <span>{{ group.stationId }}</span>
              <UiBadge tone="blue">{{ group.list.length }}</UiBadge>
            </template>
            <template #extra>
              <span class="muted">最近：{{ formatTime(group.list[0]?.scanEndTime) }}</span>
            </template>

            <transition-group tag="div" name="event-fade" class="event-list">
              <div
                v-for="event in group.list"
                :key="event.eventId"
                class="event-row"
                @click="openDetail(event)"
              >
                <div class="event-row__main">
                  <UiTag :tone="event.status === 'BATCHED' ? 'green' : 'orange'" size="sm">
                    {{ event.status === 'BATCHED' ? '已聚合' : '待聚合' }}
                  </UiTag>
                  <span class="event-row__device">{{ event.scannerDeviceId || '-' }}</span>
                  <span class="muted">·</span>
                  <span>{{ event.pageCount ?? 0 }} 页</span>
                </div>
                <div class="event-row__meta">
                  <span class="event-row__time">{{
                    formatTime(event.scanEndTime || event.createTime)
                  }}</span>
                  <span v-if="event.scannerIp" class="muted">{{ event.scannerIp }}</span>
                </div>
              </div>
            </transition-group>
          </UiCard>
        </div>
      </UiCard>

      <a-drawer
        :open="drawerOpen"
        :title="`扫描事件 #${currentEvent?.eventId ?? ''}`"
        width="520"
        @close="drawerOpen = false"
      >
        <a-descriptions v-if="currentEvent" :column="1" size="small" bordered>
          <a-descriptions-item label="事件ID">{{ currentEvent.eventId }}</a-descriptions-item>
          <a-descriptions-item label="考试ID">{{ currentEvent.examId || '-' }}</a-descriptions-item>
          <a-descriptions-item label="工位机">{{
            currentEvent.scannerStationId || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="扫描设备">{{
            currentEvent.scannerDeviceId || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="设备IP">{{
            currentEvent.scannerIp || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="页数">{{ currentEvent.pageCount ?? 0 }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <UiTag :tone="currentEvent.status === 'BATCHED' ? 'green' : 'orange'" size="sm">
              {{ currentEvent.status || '-' }}
            </UiTag>
          </a-descriptions-item>
          <a-descriptions-item label="扫描批次ID">{{
            currentEvent.scanBatchId || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="扫描端报告ID">{{
            currentEvent.reportId || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="扫描端批次号">{{
            currentEvent.batchExternalNo || '-'
          }}</a-descriptions-item>
          <a-descriptions-item label="来源文件">
            <span v-if="!currentEvent.sourceFileIds?.length" class="muted">-</span>
            <a-space v-else wrap>
              <UiTag
                v-for="fileId in currentEvent.sourceFileIds"
                :key="fileId"
                tone="blue"
                size="sm"
              >
                {{ fileId }}
              </UiTag>
            </a-space>
          </a-descriptions-item>
          <a-descriptions-item label="扫描开始时间">{{
            formatTime(currentEvent.scanStartTime)
          }}</a-descriptions-item>
          <a-descriptions-item label="扫描结束时间">{{
            formatTime(currentEvent.scanEndTime)
          }}</a-descriptions-item>
          <a-descriptions-item label="入库时间">{{
            formatTime(currentEvent.createTime)
          }}</a-descriptions-item>
        </a-descriptions>
      </a-drawer>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ScanLiveEventVO } from '@/apis/mark/scan-live'
import DesktopOutlined from '@ant-design/icons-vue/DesktopOutlined'
import FilterOutlined from '@ant-design/icons-vue/FilterOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import dayjs from 'dayjs'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
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
  // 兼容 useMarkExamSelector 签名：必须把第二个参数传进去保持其内部 URL 同步逻辑
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

<style lang="less" scoped>
.scan-live-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.scan-live-page__filter-card,
.scan-live-page__main-card {
  margin: 0;
}

.empty-block {
  padding: 48px 0;
}

.muted {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;

  &--green {
    background: #52c41a;
    box-shadow: 0 0 6px rgba(82, 196, 26, 0.7);
  }

  &--orange {
    background: #faad14;
  }

  &--red {
    background: #ff4d4f;
  }

  &--gray {
    background: #bfbfbf;
  }
}

.station-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

.station-card {
  margin: 0;

  :deep(.ant-card-body) {
    padding: 12px 0;
  }
}

.event-list {
  max-height: 360px;
  overflow-y: auto;
  padding: 0 16px;
}

.event-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(24, 144, 255, 0.04);
  }
}

.event-row__main {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.event-row__device {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.event-row__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

.event-row__time {
  font-variant-numeric: tabular-nums;
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
  background: rgba(82, 196, 26, 0.12);
}

.event-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
