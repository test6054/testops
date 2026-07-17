<script setup lang="ts">
/**
 * 数据接入 Hub 布局：Tab + router-view，聚合五类接入页。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ConfirmationStatusCode } from '@/apis/quality/types'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import { useQualityStore } from '@/stores/modules/quality'

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
</script>

<template>
  <div class="ingest-hub-layout">
    <QualityPageContextBar show-title title="数据接入" />
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
  gap: var(--dp-space-4);
}

.ingest-hub-layout__tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }
}
</style>
