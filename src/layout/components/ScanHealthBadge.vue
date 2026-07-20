<template>
  <button
    type="button"
    class="scan-health-badge"
    :class="`scan-health-badge--${tone}`"
    :aria-label="`扫描健康状态：${toneLabel}`"
    :title="`扫描健康：${toneLabel}`"
    @click="drawerVisible = true"
  >
    <ScanOutlined class="scan-health-badge__icon" />
    <span class="scan-health-badge__dot" />
  </button>

  <UiDrawer
    v-model:open="drawerVisible"
    title="扫描异常待办"
    placement="right"
    :width="420"
  >
    <div v-if="loading" class="scan-health-drawer__loading">
      <UiSpin />
    </div>
    <div v-else-if="!hasAttention" class="scan-health-drawer__empty">
      <UiEmpty title="一切正常" description="当前无扫描异常待处理" />
    </div>
    <div v-else class="scan-health-drawer__list">
      <div
        v-for="item in attentionItems"
        :key="item.key"
        class="scan-health-drawer__item"
      >
        <span class="scan-health-drawer__item-dot" :class="`scan-health-drawer__item-dot--${item.tone}`" />
        <div class="scan-health-drawer__item-body">
          <span class="scan-health-drawer__item-label">{{ item.label }}</span>
          <span class="scan-health-drawer__item-value">{{ item.count }}</span>
        </div>
        <UiButton size="sm" variant="outline" @click="goScanOps">
          处理
        </UiButton>
      </div>
    </div>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { ScanOpsOverviewResponse } from '@/apis/mark/scan-ops'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loadArchiveScanOpsOverview } from '@/apis/mark/scan-ops'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'

defineOptions({ name: 'ScanHealthBadge' })

const router = useRouter()
const drawerVisible = ref(false)
const loading = ref(false)
const overview = ref<ScanOpsOverviewResponse | null>(null)

type SignalTone = 'green' | 'blue' | 'orange' | 'red' | 'gray'

const tone = computed<SignalTone>(() => {
  const data = overview.value
  if (!data) return 'gray'
  if ((data.failedTicketCount ?? 0) > 0 || (data.pageRegisterBlockedCount ?? 0) > 0) return 'red'
  if ((data.failedWorkOrderCount ?? 0) > 0 || (data.partialTailPendingCount ?? 0) > 0) return 'orange'
  if ((data.committingWorkOrderCount ?? 0) > 0 || (data.pendingDispatchCount ?? 0) > 0 || (data.processingDispatchCount ?? 0) > 0) return 'blue'
  return 'green'
})

const toneLabel = computed(() => {
  const map: Record<SignalTone, string> = {
    red: '严重异常',
    orange: '需关注',
    blue: '进行中',
    green: '正常',
    gray: '无数据',
  }
  return map[tone.value]
})

interface AttentionItem {
  key: string
  label: string
  count: number
  tone: 'red' | 'orange' | 'blue'
}

const attentionItems = computed<AttentionItem[]>(() => {
  const data = overview.value
  if (!data) return []
  const items: AttentionItem[] = []
  if ((data.failedTicketCount ?? 0) > 0) {
    items.push({ key: 'failedTicket', label: '失败工单', count: data.failedTicketCount!, tone: 'red' })
  }
  if ((data.pageRegisterBlockedCount ?? 0) > 0) {
    items.push({ key: 'pageRegisterBlocked', label: '页登记阻塞', count: data.pageRegisterBlockedCount!, tone: 'red' })
  }
  if ((data.failedWorkOrderCount ?? 0) > 0) {
    items.push({ key: 'failedWorkOrder', label: '失败任务', count: data.failedWorkOrderCount!, tone: 'orange' })
  }
  if ((data.partialTailPendingCount ?? 0) > 0) {
    items.push({ key: 'partialTail', label: '待处置切卷余页', count: data.partialTailPendingCount!, tone: 'orange' })
  }
  if ((data.pendingDispatchCount ?? 0) > 0) {
    items.push({ key: 'pendingDispatch', label: '待分派', count: data.pendingDispatchCount!, tone: 'blue' })
  }
  if ((data.processingDispatchCount ?? 0) > 0) {
    items.push({ key: 'processingDispatch', label: '分派处理中', count: data.processingDispatchCount!, tone: 'blue' })
  }
  if ((data.suspendedDispatchCount ?? 0) > 0) {
    items.push({ key: 'suspendedDispatch', label: '已挂起分派', count: data.suspendedDispatchCount!, tone: 'orange' })
  }
  return items
})

const hasAttention = computed(() => attentionItems.value.length > 0)

async function loadOverview() {
  loading.value = true
  try {
    const res = await loadArchiveScanOpsOverview()
    overview.value = res.data ?? res
  }
  catch {
    overview.value = null
  }
  finally {
    loading.value = false
  }
}

function goScanOps() {
  drawerVisible.value = false
  void router.push('/teacher/archive-volumes/scan-ops')
}

onMounted(() => {
  void loadOverview()
})
</script>

<style lang="scss" scoped>
.scan-health-badge {
  position: relative;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dp-text-muted);
  cursor: pointer;
  padding: 0;
  transition:
    background var(--dp-duration-fast, 150ms) ease,
    color var(--dp-duration-fast, 150ms) ease;

  &:hover {
    background: var(--dp-fill-tertiary);
    color: var(--dp-text-primary);
  }

  &__icon {
    font-size: 15px;
  }

  &__dot {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: 1.5px solid var(--dp-surface);
    transition: background var(--dp-duration-fast, 150ms) ease;
  }

  &--green .scan-health-badge__dot {
    background: var(--dp-green-500);
  }

  &--blue .scan-health-badge__dot {
    background: var(--dp-color-primary);
  }

  &--orange .scan-health-badge__dot {
    background: var(--dp-orange-500);
  }

  &--red .scan-health-badge__dot {
    background: var(--dp-red-500);
    animation: scan-health-pulse 2s ease-in-out infinite;
  }

  &--gray .scan-health-badge__dot {
    background: var(--dp-gray-300);
  }
}

@keyframes scan-health-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (prefers-reduced-motion: reduce) {
  .scan-health-badge--red .scan-health-badge__dot {
    animation: none;
  }
}

.scan-health-drawer {
  &__loading {
    display: flex;
    justify-content: center;
    padding: var(--dp-space-10, 40px) 0;
  }

  &__empty {
    padding: var(--dp-space-10, 40px) 0;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-2, 8px);
  }

  &__item {
    display: flex;
    align-items: center;
    gap: var(--dp-space-3, 12px);
    padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-panel, 8px);
    background: var(--dp-surface);
    transition: border-color var(--dp-duration-fast, 150ms) ease;

    &:hover {
      border-color: var(--dp-border-hover);
    }
  }

  &__item-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &--red { background: var(--dp-red-500); }
    &--orange { background: var(--dp-orange-500); }
    &--blue { background: var(--dp-color-primary); }
  }

  &__item-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }

  &__item-label {
    font-size: var(--dp-font-size-md, 14px);
    color: var(--dp-text-primary);
  }

  &__item-value {
    font-size: var(--dp-font-size-lg, 16px);
    font-weight: var(--dp-font-weight-metric, 700);
    font-variant-numeric: tabular-nums;
    color: var(--dp-text-primary);
  }
}
</style>
