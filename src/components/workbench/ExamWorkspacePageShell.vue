<template>
  <StageWorkbenchShell>
    <template v-if="showPageHeading" #context>
      <header class="exam-workspace-page-heading">
        <div class="exam-workspace-page-heading__main">
          <h2 v-if="pageTitle" class="exam-workspace-page-heading__title">{{ pageTitle }}</h2>
          <p v-if="pageSubtitle" class="exam-workspace-page-heading__subtitle">
            {{ pageSubtitle }}
          </p>
        </div>
        <div v-if="$slots.toolbar" class="exam-workspace-page-heading__toolbar">
          <slot name="toolbar" />
        </div>
        <div v-if="$slots.actions" class="exam-workspace-page-heading__actions">
          <slot name="actions" />
        </div>
      </header>
    </template>

    <template v-if="resolvedMetrics.length > 0" #signal>
      <SignalBand
        :metrics="resolvedMetrics"
        compact
        @metric-click="(key) => emit('metric-click', key)"
      />
    </template>

    <slot />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { SignalMetric } from '@/types/workbench'
import { computed, useSlots } from 'vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'

defineOptions({ name: 'ExamWorkspacePageShell' })

const props = withDefaults(
  defineProps<{
    pageTitle?: string
    pageSubtitle?: string
    signalMetrics?: SignalMetric[]
  }>(),
  {
    pageTitle: '',
    pageSubtitle: '',
    signalMetrics: () => [],
  },
)

const emit = defineEmits<{
  'metric-click': [key: string]
}>()

const slots = useSlots()

const resolvedMetrics = computed(() => props.signalMetrics)

const showPageHeading = computed(() =>
  Boolean(props.pageTitle || props.pageSubtitle || slots.toolbar || slots.actions),
)
</script>

<style scoped lang="scss">
.exam-workspace-page-heading {
  display: flex;
  align-items: flex-start;
  gap: var(--dp-space-4, 16px);
  flex-wrap: wrap;

  &__main {
    flex: 1;
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--dp-text-primary, #0f172a);
  }

  &__subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--dp-text-secondary, #64748b);
  }

  &__toolbar,
  &__actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2, 8px);
    flex-shrink: 0;
  }
}
</style>
