<script setup lang="ts">
import type { ArchiveEvaluationCampaignScopeSummaryVO } from '@/apis/mark/archive-volume'
import { computed } from 'vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'

const props = defineProps<{
  campaignName: string
  scopeSummary: ArchiveEvaluationCampaignScopeSummaryVO | null
  listTotalVolumeCount?: number
  panelTotal?: number
}>()

const countMismatch = computed(() => {
  if (props.listTotalVolumeCount == null || props.panelTotal == null) {
    return false
  }
  return props.listTotalVolumeCount !== props.panelTotal
    || props.listTotalVolumeCount !== (props.scopeSummary?.totalVolumeCount ?? props.panelTotal)
})
</script>

<template>
  <div v-if="scopeSummary" class="eval-scope-summary">
    <p class="eval-scope-summary__line">
      <strong>【{{ campaignName }}】</strong>
      共 {{ scopeSummary.totalVolumeCount }} 卷 · 就绪 {{ scopeSummary.readyVolumeCount }} 卷 ·
      {{ scopeSummary.readinessRatePercent }}%
      <span v-if="panelTotal != null" class="eval-scope-summary__sub">
        · 面板 total {{ panelTotal }}
      </span>
    </p>
    <UiAlertStrip
      v-if="countMismatch"
      tone="error"
      title="批次卷数与面板分页不一致"
      description="请刷新重试，勿以单侧数字为准。"
      dense
    />
  </div>
</template>

<style scoped lang="scss">
.eval-scope-summary {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);

  &__line {
    margin: 0;
    font-size: var(--dp-font-size-md);
    line-height: 1.5;
  }

  &__sub {
    color: var(--dp-text-secondary);
  }
}
</style>
