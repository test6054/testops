<script lang="ts" setup>
/**
 * 培养方案未选/未确认主区 B 钉条：替代大插画 Empty，门禁业务不放宽。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import {
  buildQualityPlanWorkbenchLocation,
  QUALITY_PLAN_GATE_REASON_NO_PLAN,
  QUALITY_PLAN_GATE_REASON_UNCONFIRMED,
} from '@/utils/quality-plan-guard'

defineOptions({ name: 'QualityPlanGateStrip' })

const props = defineProps<{
  mode: 'need-plan' | 'need-confirm'
}>()

const router = useRouter()

const titleText = computed(() =>
  props.mode === 'need-plan' ? '未选择培养方案' : '培养方案待确认',
)

const bodyText = computed(() =>
  props.mode === 'need-plan'
    ? '请先选择培养方案后再办理本页'
    : '方案未确认，不能生成正式结论',
)

const ctaLabel = computed(() =>
  props.mode === 'need-plan' ? '去培养方案工作台' : '去确认方案',
)

function goPlanWorkbench() {
  void router.push(
    buildQualityPlanWorkbenchLocation(
      props.mode === 'need-confirm'
        ? QUALITY_PLAN_GATE_REASON_UNCONFIRMED
        : QUALITY_PLAN_GATE_REASON_NO_PLAN,
    ),
  )
}
</script>

<template>
  <UiAlertStrip
    :tone="mode === 'need-confirm' ? 'warning' : 'info'"
    size="sm"
    dense
    inline
    :show-icon="false"
    class="quality-plan-gate-strip"
  >
    <template #default>
      <span class="quality-plan-gate-strip__row">
        <UiTag :tone="mode === 'need-confirm' ? 'orange' : 'blue'" size="sm">
          {{ titleText }}
        </UiTag>
        <span class="quality-plan-gate-strip__text">{{ bodyText }}</span>
      </span>
    </template>
    <template #actions>
      <UiButton size="sm" variant="primary" @click="goPlanWorkbench">
        {{ ctaLabel }}
      </UiButton>
    </template>
  </UiAlertStrip>
</template>

<style scoped lang="scss">
.quality-plan-gate-strip {
  margin: var(--dp-space-component-tight) 0; max-height: 48px;
}

.quality-plan-gate-strip__row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  flex: 1;
}

.quality-plan-gate-strip__text {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
