<template>
  <component :is="embedded ? 'div' : WorkbenchSurfaceCard" flush class="archive-lifecycle-pipe-card">
    <template v-if="!embedded" #head>
      <span class="archive-lifecycle-pipe-card__title">{{ title }}</span>
    </template>
    <template v-if="!embedded && steps.length > 0" #toolbar>
      <span class="archive-lifecycle-pipe-card__progress">{{ doneCount }}/{{ stageTotal }} 阶段</span>
    </template>

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
    <UiEmpty v-else description="暂无生命周期数据" />
  </component>
</template>

<script lang="ts" setup>
import type { ArchiveLifecycleStep } from '@/utils/archive-volume-lifecycle'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { countArchiveLifecycleDoneSteps } from '@/utils/archive-volume-lifecycle'

defineOptions({ name: 'ArchiveLifecyclePipe' })

const props = withDefaults(
  defineProps<{
    steps: ArchiveLifecycleStep[]
    title?: string
    /** 后端 completedLifecycleCount；卷主链须传入，子链/向导留空则由 steps 本地统计 */
    completedCount?: number
    /** 后端 totalLifecycleCount；与 completedCount 成对传入 */
    totalCount?: number
    /** 为 true 时步骤节点可点击并触发 step-click */
    clickable?: boolean
    /** 为 true 时不渲染外层 WorkbenchSurfaceCard，仅输出 pipe 行 */
    embedded?: boolean
  }>(),
  {
    title: '归档生命周期',
    clickable: false,
    embedded: false,
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

const doneCount = computed(() => {
  if (props.completedCount != null) {
    return props.completedCount
  }
  return countArchiveLifecycleDoneSteps(props.steps)
})

const stageTotal = computed(() => {
  if (props.totalCount != null) {
    return props.totalCount
  }
  return props.steps.length
})

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
.archive-lifecycle-pipe-card {
  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__progress {
    font-size: 12px;
    color: var(--dp-text-secondary, #64748b);
  }
}

.archive-lifecycle-pipe {
  display: flex;
  align-items: flex-start;
  gap: 0;
  overflow-x: auto;
  padding: 8px 0 4px;
}

.archive-lifecycle-pipe__node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 80px;
  flex-shrink: 0;
}

.archive-lifecycle-pipe__dot {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;

  &--done {
    background: var(--dp-success, #52c41a);
    color: #fff;
  }

  &--active {
    background: var(--dp-primary, #1677ff);
    color: #fff;
    box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.15);
  }

  &--pending {
    background: var(--dp-surface-sunken, #f1f5f9);
    color: var(--dp-text-tertiary, #94a3b8);
    border: 1.5px solid var(--dp-border, #e2e8f0);
  }

  &--warn {
    background: var(--dp-warning, #faad14);
    color: #fff;
  }
}

.archive-lifecycle-pipe__label {
  font-size: 10px;
  text-align: center;
  white-space: nowrap;
  font-weight: 500;
  color: var(--dp-text-tertiary, #94a3b8);
}

.archive-lifecycle-pipe__node--done .archive-lifecycle-pipe__label {
  color: var(--dp-success, #52c41a);
  font-weight: 600;
}

.archive-lifecycle-pipe__node--active .archive-lifecycle-pipe__label {
  color: var(--dp-primary, #1677ff);
  font-weight: 600;
}

.archive-lifecycle-pipe__node--warn .archive-lifecycle-pipe__label {
  color: var(--dp-warning, #faad14);
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
    background: var(--dp-success, #52c41a);
  }

  &--pending {
    background: var(--dp-border, #e2e8f0);
  }
}
</style>
