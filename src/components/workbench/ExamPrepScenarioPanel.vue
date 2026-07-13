<script lang="ts" setup>
import type { ExamPrepScenarioGuideResponse } from '@/apis/mark/exam'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'

defineOptions({ name: 'ExamPrepScenarioPanel' })

defineProps<{
  guide: ExamPrepScenarioGuideResponse
}>()
</script>

<template>
  <WorkbenchSurfaceCard class="exam-prep-scenario">
    <template #head>
      <span class="exam-prep-scenario__title">{{ guide.scenarioTitle }}</span>
    </template>
    <p class="exam-prep-scenario__summary">{{ guide.scenarioSummary }}</p>
    <ol class="exam-prep-scenario__steps">
      <li v-for="(step, index) in guide.operationalSteps" :key="index">{{ step }}</li>
    </ol>
    <dl class="exam-prep-scenario__hints">
      <div class="exam-prep-scenario__hint-row">
        <dt>扫描登记</dt>
        <dd>{{ guide.scanGuidance }}</dd>
      </div>
      <div v-if="guide.printGuidance" class="exam-prep-scenario__hint-row">
        <dt>印刷环节</dt>
        <dd>{{ guide.printGuidance }}</dd>
      </div>
    </dl>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.exam-prep-scenario {
  &__title {
    font-size: 14px;
    font-weight: 600;
  }

  &__summary {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dp-text-secondary);
  }

  &__steps {
    margin: 0 0 12px;
    padding-left: 20px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dp-text-primary);
  }

  &__hints {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__hint-row {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 12px;
    font-size: 13px;
    line-height: 1.5;

    dt {
      margin: 0;
      color: var(--dp-text-muted);
    }

    dd {
      margin: 0;
      color: var(--dp-text-secondary);
    }
  }
}
</style>
