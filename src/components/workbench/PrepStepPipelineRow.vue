<script lang="ts" setup>
import type { Component } from 'vue'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import AimOutlined from '@ant-design/icons-vue/AimOutlined'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import FilePdfOutlined from '@ant-design/icons-vue/FilePdfOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { WORKSPACE_STAGE_STATUS_TONE } from '@/constants/mark-workspace-nav'
import { strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'PrepStepPipelineRow' })

const props = withDefaults(
  defineProps<{
    steps: PrepStepCard[]
    currentStepKey?: string | null
    locked?: boolean
    /** 准备步骤区轻量提示：软建议、保存前置条件等，不用 Alert 条。 */
    hint?: string
    /** default：考试准备页完整卡片；compact：制卷设计器单行 chip，节省垂直空间。 */
    variant?: 'default' | 'compact'
  }>(),
  { variant: 'default', locked: false },
)

const emit = defineEmits<{
  select: [step: PrepStepCard]
}>()

const ICON_MAP: Record<string, Component> = {
  materialLayout: ContainerOutlined,
  candidateRoster: TeamOutlined,
  paperTemplate: ProfileOutlined,
  layoutDesign: FilePdfOutlined,
  printPackage: ContainerOutlined,
  experienceAssist: AimOutlined,
}

function resolveIcon(key: string): Component {
  return ICON_MAP[key] ?? ProfileOutlined
}

function stepTone(step: PrepStepCard) {
  return strictEnumTone(WORKSPACE_STAGE_STATUS_TONE, step.status, '考试准备阶段状态')
}

function handleSelect(step: PrepStepCard): void {
  if (props.locked === true && step.key !== 'materialLayout') {
    return
  }
  emit('select', step)
}
</script>

<template>
  <WorkbenchSurfaceCard
    class="prep-step-pipeline"
    :class="{ 'prep-step-pipeline--compact': props.variant === 'compact' }"
  >
    <template #head>
      <div class="prep-step-pipeline__head">
        <div class="prep-step-pipeline__head-main">
          <span class="prep-step-pipeline__title">{{
            props.variant === 'compact' ? '准备' : '准备步骤'
          }}</span>
          <span class="prep-step-pipeline__meta">
            {{ steps.filter((item) => item.status === 'completed').length }} /
            {{ steps.length }} 已完成
          </span>
          <span
            v-if="props.variant === 'compact' && hint"
            class="prep-step-pipeline__hint-inline"
          >{{ hint }}</span>
        </div>
        <div v-if="$slots.actions" class="prep-step-pipeline__head-actions">
          <slot name="actions" />
        </div>
      </div>
    </template>
    <p v-if="props.variant !== 'compact' && hint" class="prep-step-pipeline__hint">{{ hint }}</p>
    <div class="prep-step-pipeline__track">
      <button
        v-for="(step, index) in steps"
        :key="step.key"
        type="button"
        class="prep-step-pipeline__step"
        :class="[
          `prep-step-pipeline__step--${step.status}`,
          {
            'prep-step-pipeline__step--current': currentStepKey === step.key,
            'prep-step-pipeline__step--locked': locked === true && step.key !== 'materialLayout',
            'prep-step-pipeline__step--chip': props.variant === 'compact',
          },
        ]"
        @click="handleSelect(step)"
      >
        <span
          v-if="props.variant !== 'compact' && index < steps.length - 1"
          class="prep-step-pipeline__connector"
          aria-hidden="true"
        />
        <span class="prep-step-pipeline__step-head">
          <component :is="resolveIcon(step.key)" class="prep-step-pipeline__icon" />
          <span class="prep-step-pipeline__label">{{ step.title }}</span>
        </span>
        <p v-if="props.variant !== 'compact'" class="prep-step-pipeline__desc">
          {{ step.description }}
        </p>
        <UiTag :tone="stepTone(step)" size="sm">{{ step.statusText }}</UiTag>
      </button>
    </div>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.prep-step-pipeline {
  &__head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--dp-space-2, 8px);
    width: 100%;
  }

  &__head-main {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2, 8px);
    min-width: 0;
  }

  &__head-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--dp-space-2, 8px);
    margin-left: auto;
  }

  &__title {
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__meta {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__hint-inline {
    font-size: var(--dp-font-size-xs);
    line-height: 1.4;
    color: var(--dp-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: min(420px, 40vw);
  }

  &--compact {
    :deep(.workbench-surface-card__body) {
      padding-top: 0;
    }

    .prep-step-pipeline__track {
      gap: 8px;
      padding-bottom: 0;
    }

    .prep-step-pipeline__step--chip {
      flex: 0 0 auto;
      min-width: 0;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      padding: 4px 10px;
      border-radius: 6px;
    }

    .prep-step-pipeline__step--chip .prep-step-pipeline__step-head {
      gap: 6px;
    }

    .prep-step-pipeline__step--chip .prep-step-pipeline__icon {
      font-size: var(--dp-font-size-md);
    }

    .prep-step-pipeline__step--chip .prep-step-pipeline__label {
      font-size: var(--dp-font-size-sm);
      font-weight: 500;
      white-space: nowrap;
    }
  }

  &__hint {
    margin: 0 0 var(--dp-space-2, 8px);
    font-size: var(--dp-font-size-xs);
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }

  &__track {
    display: flex;
    gap: var(--dp-space-2, 8px);
    align-items: stretch;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  &__step {
    position: relative;
    flex: 1;
    min-width: 160px;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-2, 8px);
    padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
    text-align: left;
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;

    &:hover:not(:disabled) {
      border-color: var(--dp-blue-500, var(--dp-color-primary));
    }

    &--completed {
      border-color: var(--dp-success-border);
      background: var(--dp-success-bg);
    }

    &--active,
    &--warning {
      border-color: var(--dp-color-primary-border);
      background: var(--dp-color-primary-bg);
    }

    &--current {
      border-color: var(--dp-blue-500, var(--dp-color-primary));
      box-shadow: 0 0 0 1px var(--dp-blue-500, var(--dp-color-primary));
    }

    &--locked {
      opacity: 0.65;
      cursor: not-allowed;
    }
  }

  &__connector {
    position: absolute;
    right: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 2px;
    background: var(--dp-border);
    z-index: 1;
  }

  &__step-head {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__icon {
    font-size: var(--dp-font-size-lg);
    color: var(--dp-blue-500, var(--dp-color-primary));
  }

  &__label {
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__desc {
    margin: 0;
    font-size: var(--dp-font-size-xs);
    line-height: 1.5;
    color: var(--dp-text-muted);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
</style>
