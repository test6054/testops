<template>
  <div v-if="steps.length > 0" class="archive-lifecycle-pipe" role="list" aria-label="归档生命周期">
    <template v-for="(step, index) in steps" :key="step.key">
      <div
        v-if="index > 0"
        class="archive-lifecycle-pipe__connector"
        :class="connectorClass(index)"
        aria-hidden="true"
      />
      <div
        class="archive-lifecycle-pipe__node"
        :class="[
          `archive-lifecycle-pipe__node--${step.status}`,
          { 'archive-lifecycle-pipe__node--clickable': clickable },
        ]"
        role="listitem"
        :tabindex="clickable ? 0 : undefined"
        @click="handleStepClick(step.key)"
        @keydown.enter="handleStepClick(step.key)"
      >
        <div
          class="archive-lifecycle-pipe__dot"
          :class="`archive-lifecycle-pipe__dot--${step.status}`"
        >
          <CheckOutlined v-if="step.status === 'done'" />
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="archive-lifecycle-pipe__label">{{ step.label }}</div>
      </div>
    </template>
  </div>
  <UiEmpty size="sm" v-else description="暂无生命周期数据" />
</template>

<script lang="ts" setup>
import type { ArchiveLifecycleStep } from '@/utils/archive-volume-lifecycle'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'

defineOptions({ name: 'ArchiveLifecyclePipeTrack' })

const props = withDefaults(
  defineProps<{
    steps: ArchiveLifecycleStep[]
    clickable?: boolean
  }>(),
  {
    clickable: false,
  },
)

const emit = defineEmits<{
  'step-click': [stepKey: string]
}>()

function handleStepClick(stepKey: string): void {
  if (!props.clickable) {
    return
  }
  emit('step-click', stepKey)
}

function connectorClass(index: number): string {
  const previous = props.steps[index - 1]
  if (!previous) {
    return 'archive-lifecycle-pipe__connector--pending'
  }
  return previous.status === 'done'
    ? 'archive-lifecycle-pipe__connector--done'
    : 'archive-lifecycle-pipe__connector--pending'
}
</script>

<style lang="scss" scoped>
.archive-lifecycle-pipe {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding: var(--dp-space-component-tight) 0 var(--dp-space-component-xs);
}

.archive-lifecycle-pipe__node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dp-space-component-xs);
  min-width: 80px;
  flex-shrink: 0;
}

.archive-lifecycle-pipe__dot {
  width: 32px;
  height: 32px;
  border-radius: var(--dp-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--dp-font-size-xs);
  font-weight: 700;
  transition:
    background-color var(--dp-duration-normal) var(--dp-ease-default),
    color var(--dp-duration-normal) var(--dp-ease-default),
    box-shadow var(--dp-duration-normal) var(--dp-ease-default);

  &--done {
    background: var(--dp-success);
    color: var(--dp-text-inverse);
  }

  &--active {
    background: var(--dp-color-primary);
    color: var(--dp-text-inverse);
    box-shadow: 0 0 0 3px var(--dp-focus-ring);
  }

  &--pending {
    background: var(--dp-bg-muted);
    color: var(--dp-text-muted);
    border: 1.5px solid var(--dp-border);
  }

  &--warn {
    background: var(--dp-warning);
    color: var(--dp-text-inverse);
  }
}

.archive-lifecycle-pipe__label {
  font-size: var(--dp-font-size-xs);
  text-align: center;
  white-space: nowrap;
  font-weight: 500;
  color: var(--dp-text-muted);
}

.archive-lifecycle-pipe__node--done .archive-lifecycle-pipe__label {
  color: var(--dp-success);
  font-weight: 600;
}

.archive-lifecycle-pipe__node--active .archive-lifecycle-pipe__label {
  color: var(--dp-color-primary);
  font-weight: 600;
}

.archive-lifecycle-pipe__node--warn .archive-lifecycle-pipe__label {
  color: var(--dp-warning);
  font-weight: 600;
}

.archive-lifecycle-pipe__node--clickable {
  cursor: pointer;
}

.archive-lifecycle-pipe__connector {
  width: 28px;
  height: 2px;
  flex-shrink: 0;
  margin-top: 15px;

  &--done {
    background: var(--dp-success);
  }

  &--pending {
    background: var(--dp-border);
  }
}
</style>
