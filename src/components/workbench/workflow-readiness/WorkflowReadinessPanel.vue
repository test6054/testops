<template>
  <section class="workflow-readiness-panel">
    <header class="workflow-readiness-panel__head">
      <h3 class="workflow-readiness-panel__title">{{ title }}</h3>
      <div v-if="metrics?.length" class="workflow-readiness-panel__metrics">
        <span v-for="metric in metrics" :key="metric.key" class="workflow-readiness-panel__metric">
          {{ metric.label }} {{ metric.value }}
        </span>
      </div>
    </header>
    <ol v-if="steps.length" class="workflow-readiness-panel__steps">
      <li
        v-for="step in steps"
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
          v-if="showActions && step.status === 'pending' && step.routeName"
          variant="outline"
          size="sm"
          @click="navigate(step)"
        >
          {{ step.actionLabel ?? '前往' }}
        </UiButton>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import type {
  WorkflowReadinessMetric,
  WorkflowReadinessStep,
} from '@/components/workbench/workflow-readiness/types'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'

defineOptions({ name: 'WorkflowReadinessPanel' })

const props = withDefaults(
  defineProps<{
    title: string
    steps: WorkflowReadinessStep[]
    metrics?: WorkflowReadinessMetric[]
    showActions?: boolean
  }>(),
  {
    metrics: () => [],
    showActions: true,
  },
)

const router = useRouter()

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
  margin-bottom: var(--dp-space-3, 12px);
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  border: 1px solid var(--dp-border-light, #eef0f3);
  border-radius: var(--dp-radius-md, 6px);
  background: var(--dp-surface, #fff);
}

.workflow-readiness-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--dp-space-2, 8px);
  margin-bottom: var(--dp-space-3, 12px);
}

.workflow-readiness-panel__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dp-text, #1a1d21);
}

.workflow-readiness-panel__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3, 12px);
}

.workflow-readiness-panel__metric {
  font-size: 12px;
  color: var(--dp-text-4, #8b919a);
}

.workflow-readiness-panel__steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2, 8px);
}

.workflow-readiness-panel__step {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  padding: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border-light, #eef0f3);
  border-radius: var(--dp-radius-sm, 4px);
  background: var(--dp-surface-subtle, #f8fafc);
}

.workflow-readiness-panel__step--completed {
  opacity: 0.72;
}

.workflow-readiness-panel__step-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--dp-text, #1a1d21);
}

.workflow-readiness-panel__step-desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-4, #8b919a);
}

.workflow-readiness-panel__step-main {
  min-width: 0;
  flex: 1;
}
</style>
