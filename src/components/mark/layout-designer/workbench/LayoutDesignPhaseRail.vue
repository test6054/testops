<script setup lang="ts">
import UiButton from '@/components/ui-guide/ui/Button.vue'
import {
  LayoutDesignPhaseCode,
  LayoutDesignPhaseDescription,
} from '@/types/enums/layout-design-phase-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = withDefaults(
  defineProps<{
    phase: LayoutDesignPhaseCode
    isPhaseAccessible: (phase: LayoutDesignPhaseCode) => boolean
    phaseLockReason: (phase: LayoutDesignPhaseCode) => string | undefined
    /** 嵌入 toolbar band 时去掉底部外边距。 */
    embedded?: boolean
    /** 展示「制卷设计」主流程标题，强调在线制卷阶段导航。 */
    showTitle?: boolean
  }>(),
  { embedded: false, showTitle: false },
)

const emit = defineEmits<{
  select: [phase: LayoutDesignPhaseCode]
}>()

const phaseItems = [
  LayoutDesignPhaseCode.SOURCE,
  LayoutDesignPhaseCode.QUESTIONS,
  LayoutDesignPhaseCode.LAYOUT,
  LayoutDesignPhaseCode.REVIEW,
] as const

function handleSelect(nextPhase: LayoutDesignPhaseCode): void {
  if (!props.isPhaseAccessible(nextPhase)) {
    return
  }
  emit('select', nextPhase)
}
</script>

<template>
  <div
    class="layout-design-phase-rail-wrap"
    :class="{ 'layout-design-phase-rail-wrap--embedded': props.embedded }"
  >
    <div v-if="props.showTitle" class="layout-design-phase-rail__title-block">
      <span class="layout-design-phase-rail__title">制卷设计</span>
      <span class="layout-design-phase-rail__subtitle"
        >在线制卷 · 上传识别或生成答题卡后划区校验</span
      >
    </div>
    <nav
      class="layout-design-phase-rail"
      :class="{ 'layout-design-phase-rail--embedded': props.embedded }"
      aria-label="制卷设计阶段"
    >
      <UiButton
        v-for="item in phaseItems"
        :key="item"
        size="sm"
        :variant="phase === item ? 'primary' : 'outline'"
        :disabled="!isPhaseAccessible(item)"
        :title="phaseLockReason(item)"
        @click="handleSelect(item)"
      >
        {{ strictEnumLabel(LayoutDesignPhaseDescription, item, '制卷设计阶段') }}
      </UiButton>
    </nav>
  </div>
</template>

<style scoped lang="scss">
.layout-design-phase-rail-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;

  &--embedded {
    margin-bottom: 0;
    flex: 1 1 420px;
    min-width: 0;
  }
}

.layout-design-phase-rail__title-block {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.layout-design-phase-rail__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.layout-design-phase-rail__subtitle {
  font-size: 12px;
  color: var(--dp-text-muted);
  line-height: 1.4;
}

.layout-design-phase-rail {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;

  &--embedded {
    margin-bottom: 0;
    justify-content: flex-end;
  }
}
</style>
