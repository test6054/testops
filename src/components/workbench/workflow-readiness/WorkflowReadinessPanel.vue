<template>
  <section
    class="workflow-readiness-panel"
    :class="{ 'workflow-readiness-panel--compact': compact }"
  >
    <header class="workflow-readiness-panel__head">
      <h3 class="workflow-readiness-panel__title">{{ title }}</h3>
      <span v-if="compact" class="workflow-readiness-panel__summary">
        {{ pendingStepCount }} 项待处理
      </span>
      <div v-if="metrics?.length" class="workflow-readiness-panel__metrics">
        <span v-for="metric in metrics" :key="metric.key" class="workflow-readiness-panel__metric">
          {{ metric.label }} {{ metric.value }}
        </span>
      </div>
    </header>
    <ol v-if="displayedSteps.length" class="workflow-readiness-panel__steps">
      <li
        v-for="step in displayedSteps"
        :key="step.code"
        class="workflow-readiness-panel__step"
        :class="`workflow-readiness-panel__step--${step.status}`"
      >
        <div class="workflow-readiness-panel__step-main">
          <span class="workflow-readiness-panel__step-label">{{ step.label }}</span>
          <p
            v-if="step.description && step.description !== step.label"
            class="workflow-readiness-panel__step-desc"
          >
            {{ step.description }}
          </p>
        </div>
        <UiButton
          v-if="showActions && step.status === 'pending' && step.routeName && step.actionLabel"
          variant="outline"
          size="sm"
          @click="navigate(step)"
        >
          {{ step.actionLabel }}
        </UiButton>
      </li>
    </ol>
    <UiCollapse
      v-if="compact && remainingSteps.length"
      :bordered="false"
      class="workflow-readiness-panel__remaining"
    >
      <UiCollapsePanel key="remaining">
        <template #header>其余 {{ remainingSteps.length }} 项待处理</template>
        <ol class="workflow-readiness-panel__steps">
          <li
            v-for="step in remainingSteps"
            :key="step.code"
            class="workflow-readiness-panel__step"
            :class="`workflow-readiness-panel__step--${step.status}`"
          >
            <div class="workflow-readiness-panel__step-main">
              <span class="workflow-readiness-panel__step-label">{{ step.label }}</span>
              <p
                v-if="step.description && step.description !== step.label"
                class="workflow-readiness-panel__step-desc"
              >
                {{ step.description }}
              </p>
            </div>
            <UiButton
              v-if="showActions && step.status === 'pending' && step.routeName && step.actionLabel"
              variant="outline"
              size="sm"
              @click="navigate(step)"
            >
              {{ step.actionLabel }}
            </UiButton>
          </li>
        </ol>
      </UiCollapsePanel>
    </UiCollapse>
  </section>
</template>

<script setup lang="ts">
import type {
  WorkflowReadinessMetric,
  WorkflowReadinessStep,
} from '@/components/workbench/workflow-readiness/types'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCollapse from '@/components/ui-guide/ui/UiCollapse.vue'
import UiCollapsePanel from '@/components/ui-guide/ui/UiCollapsePanel.vue'

defineOptions({ name: 'WorkflowReadinessPanel' })

const props = withDefaults(
  defineProps<{
    title: string
    steps: WorkflowReadinessStep[]
    metrics?: WorkflowReadinessMetric[]
    showActions?: boolean
    /** 紧凑模式只展示首项待办，其余事项按需展开，避免工作台首屏被说明占据。 */
    compact?: boolean
  }>(),
  {
    metrics: () => [],
    showActions: true,
    compact: false,
  },
)

const router = useRouter()

const pendingStepCount = computed(
  () => props.steps.filter((step) => step.status === 'pending').length,
)

const displayedSteps = computed(() => (props.compact ? props.steps.slice(0, 1) : props.steps))

const remainingSteps = computed(() => (props.compact ? props.steps.slice(1) : []))

function navigate(step: WorkflowReadinessStep): void {
  if (!step.routeName) {
    return
  }
  void router.push({
    name: step.routeName,
    params: step.routeParams,
    query: step.routeQuery,
  })
}
</script>

<style scoped>
.workflow-readiness-panel {
  margin-bottom: var(--dp-space-component);
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-control);
  background: var(--dp-surface);
}

.workflow-readiness-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-component);
}

.workflow-readiness-panel__summary {
  flex: none;
  padding: 0 var(--dp-space-component-tight);
  border-radius: var(--dp-radius-full);
  background: var(--dp-surface-chrome);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
  line-height: 22px;
  white-space: nowrap;
}

.workflow-readiness-panel__title {
  margin: 0;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.workflow-readiness-panel__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component);
}

.workflow-readiness-panel__metric {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-quaternary);
}

.workflow-readiness-panel__steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.workflow-readiness-panel__step {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-surface-subtle);
}

.workflow-readiness-panel__step--completed {
  opacity: 0.72;
}

.workflow-readiness-panel__step-label {
  font-size: var(--dp-font-size-md);
  font-weight: 500;
  color: var(--dp-text-primary);
}

.workflow-readiness-panel__step-desc {
  margin: var(--dp-space-component-xs) 0 0;
  font-size: var(--dp-font-size-xs);
  line-height: 1.5;
  color: var(--dp-text-quaternary);
}

.workflow-readiness-panel__step-main {
  min-width: 0;
  flex: 1;
}

.workflow-readiness-panel__remaining {
  margin-top: var(--dp-space-component-tight);
}

.workflow-readiness-panel--compact {
  margin-bottom: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
}

.workflow-readiness-panel--compact .workflow-readiness-panel__head {
  margin-bottom: var(--dp-space-component-tight);
}

.workflow-readiness-panel--compact .workflow-readiness-panel__title {
  font-size: var(--dp-font-size-sm);
}

.workflow-readiness-panel--compact .workflow-readiness-panel__step {
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
}

.workflow-readiness-panel--compact .workflow-readiness-panel__step-desc {
  display: none;
}

.workflow-readiness-panel--compact
  .workflow-readiness-panel__remaining
  :deep(.ant-collapse-header) {
  padding: var(--dp-space-component-tight) 0 !important;
  font-size: var(--dp-font-size-xs);
  font-weight: 500;
  color: var(--dp-text-secondary);
}

.workflow-readiness-panel--compact
  .workflow-readiness-panel__remaining
  :deep(.ant-collapse-content-box) {
  padding: var(--dp-space-component-tight) 0 0 !important;
}

@media (max-width: 640px) {
  .workflow-readiness-panel--compact .workflow-readiness-panel__step {
    align-items: flex-start;
  }

  .workflow-readiness-panel--compact .workflow-readiness-panel__step :deep(.ui-button) {
    flex: none;
  }
}
</style>
