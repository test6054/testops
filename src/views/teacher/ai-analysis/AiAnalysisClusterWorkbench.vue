<script setup lang="ts">
import type { AiAnalysisClusterSignalResponse } from '@/apis/mark/analysis-center'
import { computed, ref, watch } from 'vue'
import UiCollapse from '@/components/ui-guide/ui/UiCollapse.vue'
import UiCollapsePanel from '@/components/ui-guide/ui/UiCollapsePanel.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkflowReadinessPanel from '@/components/workbench/workflow-readiness/WorkflowReadinessPanel.vue'
import {
  buildAiAnalysisClusterReadinessSteps,
  buildAiAnalysisClusterSignalMetrics,
  resolveClusterGovernanceDefaultKeys,
} from '@/utils/ai-analysis-cluster-signals'
import ErrorCauseClusterCard from '@/views/teacher/ai-analysis/cards/ErrorCauseClusterCard.vue'
import ExamQuestionCourseGoalMappingCard from '@/views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingCard.vue'
import QuestionAnalysisCard from '@/views/teacher/ai-analysis/cards/QuestionAnalysisCard.vue'
import RejudgePlanCard from '@/views/teacher/ai-analysis/cards/RejudgePlanCard.vue'

const props = defineProps<{
  examId?: string
  reloadToken: number
  classId?: string
  clusterSignal?: AiAnalysisClusterSignalResponse | null
}>()

const emit = defineEmits<{
  changed: []
}>()

const governanceActiveKeys = ref<string[]>([])

const clusterSignalMetrics = computed(() =>
  buildAiAnalysisClusterSignalMetrics(props.clusterSignal, Boolean(props.examId?.trim())),
)

const readinessSteps = computed(() =>
  buildAiAnalysisClusterReadinessSteps(props.clusterSignal, props.examId),
)

const showReadinessPanel = computed(() =>
  readinessSteps.value.some((step) => step.status === 'pending'),
)

watch(
  () => props.clusterSignal,
  (signal) => {
    if (governanceActiveKeys.value.length === 0) {
      governanceActiveKeys.value = resolveClusterGovernanceDefaultKeys(signal)
    }
  },
  { immediate: true },
)

function handleClusterDataChanged(): void {
  emit('changed')
}
</script>

<template>
  <div class="ai-analysis-cluster-workbench">
    <SignalBand layout="spotlight" :metrics="clusterSignalMetrics" compact variant="inline" />

    <WorkflowReadinessPanel
      v-if="showReadinessPanel"
      title="错因聚类与题目治理前置"
      :steps="readinessSteps"
      :show-actions="true"
      compact
    />

    <div class="ai-analysis-cluster-workbench__diagnostic">
      <ErrorCauseClusterCard
        :exam-id="props.examId ?? ''"
        :reload-token="props.reloadToken"
        :class-id="props.classId"
        embedded
        @changed="handleClusterDataChanged"
      />
    </div>

    <QuestionAnalysisCard
      :exam-id="props.examId ?? ''"
      :reload-token="props.reloadToken"
      :class-id="props.classId"
      embedded
      @generated="handleClusterDataChanged"
    />

    <UiCollapse
      v-model:active-key="governanceActiveKeys"
      :bordered="false"
      class="ai-analysis-cluster-workbench__governance"
    >
      <UiCollapsePanel key="mapping">
        <template #header>
          <span class="ai-analysis-cluster-workbench__panel-title">试题-课程目标映射</span>
          <span
            v-if="(clusterSignal?.unmappedQuestionCount ?? 0) > 0"
            class="ai-analysis-cluster-workbench__panel-badge"
          >
            未映射 {{ clusterSignal?.unmappedQuestionCount }}
          </span>
        </template>
        <ExamQuestionCourseGoalMappingCard
          :exam-id="props.examId ?? ''"
          :reload-token="props.reloadToken"
          embedded
          @changed="handleClusterDataChanged"
        />
      </UiCollapsePanel>
      <UiCollapsePanel key="rejudge">
        <template #header>
          <span class="ai-analysis-cluster-workbench__panel-title">重判计划</span>
          <span
            v-if="
              (clusterSignal?.pendingRejudgePlanCount ?? 0) +
                (clusterSignal?.approvedRejudgePlanCount ?? 0) >
              0
            "
            class="ai-analysis-cluster-workbench__panel-badge ai-analysis-cluster-workbench__panel-badge--warn"
          >
            待处理
            {{
              (clusterSignal?.pendingRejudgePlanCount ?? 0) +
              (clusterSignal?.approvedRejudgePlanCount ?? 0)
            }}
          </span>
        </template>
        <RejudgePlanCard
          :exam-id="props.examId ?? ''"
          :reload-token="props.reloadToken"
          embedded
          @changed="handleClusterDataChanged"
        />
      </UiCollapsePanel>
    </UiCollapse>
  </div>
</template>
