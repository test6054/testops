<script setup lang="ts">
/**
 * 数据接入 Hub 布局：Tab + router-view，聚合五类接入页。
 */
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ConfirmationStatusCode } from '@/apis/quality/types'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useQualityStore } from '@/stores/modules/quality'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'

const route = useRoute()
const router = useRouter()
const qualityStore = useQualityStore()

interface QualityIngestHubTab {
  key: string
  label: string
  path: string
}

const tabs: QualityIngestHubTab[] = [
  { key: 'score-batch', label: '成绩 Excel 导入', path: '/quality/ingest-hub/score-batch' },
  { key: 'score-record', label: '成绩明细核对', path: '/quality/ingest-hub/score-record' },
  {
    key: 'process-evaluation',
    label: '过程性评价',
    path: '/quality/ingest-hub/process-evaluation',
  },
  {
    key: 'indirect-evaluation',
    label: '间接评价',
    path: '/quality/ingest-hub/indirect-evaluation',
  },
  { key: 'external-pull', label: '外部数据拔取', path: '/quality/ingest-hub/external-pull' },
]

const activeTab = computed(() => {
  const matched = tabs.find((item) => route.path.startsWith(item.path))
  return matched?.key ?? 'score-batch'
})

function handleTabChange(key: string | number) {
  const target = tabs.find((item) => item.key === key)
  if (target) {
    void router.push(target.path)
  }
}

const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (!qualityStore.currentTrainingPlanId) {
    return 'need-plan'
  }
  if (qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED) {
    return 'need-confirm'
  }
  return null
})

const IngestHubSignalMetrics = computed<SignalMetric[]>(() => {
  return applySpotlightEmphasis([
    {
      key: 'channels',
      label: '接入通道',
      value: tabs.length,
      clickable: true,
    },
    {
      key: 'active',
      label: '当前通道',
      value: tabs.find((item) => item.key === activeTab.value)?.label ?? activeTab.value,
    },
  ], { primaryKey: 'channels', actionLabel: '定位通道' })
})

function onIngestHubSignalClick(_key: string) {
  const current = tabs.find((item) => item.key === activeTab.value)
  if (current && route.path !== current.path) {
    void router.push(current.path)
  }
}

/** 任务工作台副标题：通道规模与当前通道。 */
const ingestHubWorkbenchSubtitle = computed(() => {
  const current = tabs.find((item) => item.key === activeTab.value)?.label ?? activeTab.value
  return `${tabs.length} 个接入通道 · 当前 ${current}`
})
</script>

<template>
  <div class="ingest-hub-layout">
    <QualityPageContextBar show-title title="数据接入" :subtitle="ingestHubWorkbenchSubtitle" />
    <SignalBand
      v-if="IngestHubSignalMetrics.length > 0"
      layout="spotlight"
      variant="inline"
      compact
      :metrics="IngestHubSignalMetrics"
      @metric-click="onIngestHubSignalClick"
    />
    <UiSectionTabs
      :model-value="activeTab"
      :items="tabs"
      compact
      divided
      class="ingest-hub-layout__tabs"
      @change="handleTabChange"
    />
    <QualityPlanGateStrip
      v-if="planGateMode"
      :mode="planGateMode"
    />
    <router-view v-else :key="`${route.path}-${qualityStore.scopeChangeEpoch}`" />
  </div>
</template>

<style lang="scss" scoped>
.ingest-hub-layout {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}

.ingest-hub-layout__tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }
}
</style>
