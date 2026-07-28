<template>
  <UiEmpty :title="model.title" :description="model.description" size="sm">
    <ol v-if="model.steps?.length" class="workflow-prerequisite-empty__steps">
      <li v-for="step in model.steps" :key="step.code" class="workflow-prerequisite-empty__step">
        {{ step.label }}
      </li>
    </ol>
    <template v-if="model.primaryAction || model.secondaryAction" #action>
      <div class="workflow-prerequisite-empty__actions">
        <UiButton
          v-if="model.primaryAction"
          variant="primary"
          size="sm"
          @click="navigate(model.primaryAction)"
        >
          {{ model.primaryAction.label }}
        </UiButton>
        <UiButton
          v-if="model.secondaryAction"
          variant="outline"
          size="sm"
          @click="navigate(model.secondaryAction)"
        >
          {{ model.secondaryAction.label }}
        </UiButton>
      </div>
    </template>
  </UiEmpty>
</template>

<script setup lang="ts">
import type {
  WorkflowPrerequisiteEmptyViewModel,
  WorkflowReadinessAction,
} from '@/components/workbench/workflow-readiness/types'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'

defineOptions({ name: 'WorkflowPrerequisiteEmpty' })

defineProps<{
  model: WorkflowPrerequisiteEmptyViewModel
}>()

const router = useRouter()

function navigate(action: WorkflowReadinessAction): void {
  void router.push({
    name: action.routeName,
    params: action.routeParams,
    query: action.routeQuery,
  })
}
</script>

<style scoped>
.workflow-prerequisite-empty__steps {
  margin: var(--dp-space-component) 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
  max-width: 360px;
}

.workflow-prerequisite-empty__step {
  position: relative;
  padding-left: var(--dp-space-block);
  font-size: var(--dp-font-size-sm);
  line-height: 1.6;
  color: var(--dp-text-secondary);
}

.workflow-prerequisite-empty__step::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dp-border);
}

.workflow-prerequisite-empty__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--dp-space-component-tight);
}
</style>
