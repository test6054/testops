<script setup lang="ts">
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type { LayoutDesignPhaseCode } from '@/types/enums/layout-design-phase-enum'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import LockOutlined from '@ant-design/icons-vue/LockOutlined'
import { computed } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import { buildLayoutDesignPhaseSteps } from '@/utils/layout-design-workflow'

const props = withDefaults(
  defineProps<{
    phase: LayoutDesignPhaseCode
    document: ExamLayoutDocument | null
    examDetail: ExamDetailResponse | null | undefined
    layoutWritable: boolean
    /** 嵌在 SurfaceCard toolbar 时去掉外框与底边距 */
    embedded?: boolean
  }>(),
  {
    embedded: false,
  },
)

const emit = defineEmits<{
  select: [phase: LayoutDesignPhaseCode]
}>()

const steps = computed(() =>
  buildLayoutDesignPhaseSteps(props.phase, props.document, props.examDetail),
)

const completedCount = computed(
  () => steps.value.filter((step) => step.status === 'completed').length,
)

function handleSelect(phase: LayoutDesignPhaseCode, accessible: boolean): void {
  if (!accessible) {
    return
  }
  emit('select', phase)
}
</script>

<template>
  <section
    class="layout-design-workflow-rail"
    :class="{ 'layout-design-workflow-rail--embedded': embedded }"
    aria-label="制卷设计阶段"
  >
    <div class="layout-design-workflow-rail__bar">
      <span class="layout-design-workflow-rail__label">制卷流程</span>
      <span class="layout-design-workflow-rail__meta">{{ completedCount }}/{{ steps.length }}</span>
      <UiTag v-if="layoutWritable !== true" tone="gray" size="sm">只读</UiTag>
      <nav class="layout-design-workflow-rail__track">
        <UiTooltip
          v-for="step in steps"
          :key="step.phase"
          :title="step.lockReason ?? (step.phase === phase ? step.guide : step.summary)"
        >
          <button
            type="button"
            class="layout-design-workflow-rail__step"
            :class="[`layout-design-workflow-rail__step--${step.status}`]"
            :disabled="!step.accessible"
            :aria-current="step.phase === phase ? 'step' : undefined"
            :aria-label="
              step.lockReason
                ? `${step.label}：${step.lockReason}`
                : `${step.label}，${step.summary}`
            "
            @click="handleSelect(step.phase, step.accessible)"
          >
            <span class="layout-design-workflow-rail__step-icon">
              <CheckOutlined v-if="step.status === 'completed'" />
              <LockOutlined v-else-if="step.status === 'locked'" />
              <span v-else>{{ step.index }}</span>
            </span>
            <span class="layout-design-workflow-rail__step-label">{{ step.label }}</span>
          </button>
        </UiTooltip>
      </nav>
    </div>
  </section>
</template>

<style scoped lang="scss">
.layout-design-workflow-rail {
  width: 100%;
  margin-bottom: var(--dp-space-component-tight);

  &--embedded {
    margin-bottom: 0;
  }

  &--embedded &__bar {
    border: none;
    border-radius: 0;
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    background: var(--dp-surface-chrome);
  }

  &__bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--dp-space-component-tight);
    padding: var(--dp-space-component-xs) var(--dp-space-component-tight);
    border: 1px solid var(--dp-border-subtle);
    border-radius: 6px;
    background: var(--dp-surface);
  }

  &__label {
    font-size: var(--dp-font-size-xs);
    font-weight: 600;
    color: var(--dp-text-primary);
    white-space: nowrap;
  }

  &__meta {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
    white-space: nowrap;
  }

  &__track {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: wrap;
    gap: var(--dp-space-component-xs);
    min-width: 0;
  }

  &__step {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    min-height: 32px;
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-xs);
    background: var(--dp-surface);
    font-size: var(--dp-font-size-xs);
    line-height: 1.4;
    color: var(--dp-text-primary);
    cursor: pointer;
    transition:
      border-color var(--dp-duration-normal) var(--dp-ease-default),
      background-color var(--dp-duration-normal) var(--dp-ease-default);

    &:focus-visible {
      outline: 2px solid var(--dp-color-primary);
      outline-offset: 2px;
    }

    &:hover:not(:disabled) {
      border-color: var(--dp-color-primary);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    &--active {
      border-color: var(--dp-color-primary);
      background: var(--dp-color-primary-bg);
      color: var(--dp-color-primary);
      font-weight: 600;
    }

    &--completed {
      border-color: var(--dp-success-border);
      background: var(--dp-success-bg);
    }
  }

  &__step-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-size: 11px;
  }

  &__step-label {
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  .layout-design-workflow-rail__step {
    min-height: 44px;
    padding: var(--dp-space-component);
  }
}

@media (prefers-reduced-motion: reduce) {
  .layout-design-workflow-rail__step {
    transition: none;
  }
}
</style>
