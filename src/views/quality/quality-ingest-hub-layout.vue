<script setup lang="ts">
/**
 * 数据接入 Hub 布局：Tab + router-view，聚合五类接入页。
 */
import { computed, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { qualityIngestEmbeddedKey } from '@/composables/quality-layout-context'
import { useQualityStore } from '@/stores/modules/quality'

const route = useRoute()
const router = useRouter()
const qualityStore = useQualityStore()

const ingestEmbedded = ref(true)
provide(qualityIngestEmbeddedKey, ingestEmbedded)

const tabs = [
  { key: 'score-batch', label: '成绩 Excel 导入', path: '/quality/ingest-hub/score-batch' },
  { key: 'score-record', label: '成绩明细核对', path: '/quality/ingest-hub/score-record' },
  { key: 'process-evaluation', label: '过程性评价', path: '/quality/ingest-hub/process-evaluation' },
  { key: 'indirect-evaluation', label: '间接评价', path: '/quality/ingest-hub/indirect-evaluation' },
  { key: 'external-pull', label: '外部数据拔取', path: '/quality/ingest-hub/external-pull' },
] as const

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
</script>

<template>
  <div class="ingest-hub-layout">
    <QualityPageContextBar show-title title="数据接入" />
    <a-tabs :active-key="activeTab" class="ingest-hub-layout__tabs" @change="handleTabChange">
      <a-tab-pane v-for="item in tabs" :key="item.key" :tab="item.label" />
    </a-tabs>
    <UiEmpty
      v-if="!qualityStore.currentTrainingPlanId"
      description="请选择培养方案后进入数据接入"
    />
    <router-view
      v-else
      :key="`${route.path}-${qualityStore.scopeChangeEpoch}`"
    />
  </div>
</template>

<style lang="scss" scoped>
.ingest-hub-layout {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4, 16px);
}

.ingest-hub-layout__tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }
}
</style>
