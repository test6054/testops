<script setup lang="ts">
import QualityObeJourneyStrip from '@/components/quality/QualityObeJourneyStrip.vue'
import QualityScopeChrome from '@/components/quality/QualityScopeChrome.vue'
/**
 * 质量评价域子 shell：scope chrome + AI 任务条 + 可选 OBE journey strip + router-view。
 * 挂载于 LayoutDefault Main 内；scopeProfile=none 时不渲染 chrome。
 */
import { useQualityScopeProfile } from '@/composables/useQualityScopeProfile'
import QualityAiTaskBar from '@/layout/components/AiTaskRunningBar.vue'

defineOptions({ name: 'QualityWorkspaceLayout' })

const { showQualityChrome, showObeJourneyStrip } = useQualityScopeProfile()

function handleScopeChange(): void {
  // 子页通过 qualityStore.scopeChangeEpoch 监听刷新
}
</script>

<template>
  <div class="quality-workspace-layout">
    <template v-if="showQualityChrome">
      <div class="quality-workspace-layout__scope">
        <QualityScopeChrome @change="handleScopeChange" />
      </div>
      <QualityAiTaskBar />
      <QualityObeJourneyStrip v-if="showObeJourneyStrip" />
    </template>
    <router-view />
  </div>
</template>

<style lang="scss" scoped>
.quality-workspace-layout {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;

  &__scope {
    padding: var(--dp-space-4) 24px 0;
    background: var(--ant-color-bg-container);
    border-bottom: 1px solid var(--ant-color-border-secondary);
  }
}
</style>
