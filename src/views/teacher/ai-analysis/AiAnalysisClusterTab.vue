<script setup lang="ts">
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import ErrorCauseClusterCard from '@/views/teacher/ai-analysis/cards/ErrorCauseClusterCard.vue'
import ExamQuestionCourseGoalMappingCard from '@/views/teacher/ai-analysis/cards/ExamQuestionCourseGoalMappingCard.vue'
import QuestionAnalysisCard from '@/views/teacher/ai-analysis/cards/QuestionAnalysisCard.vue'
import RejudgePlanCard from '@/views/teacher/ai-analysis/cards/RejudgePlanCard.vue'

defineProps<{
  examId?: string
  reloadToken: number
  classId?: string
}>()

const emit = defineEmits<{
  changed: []
}>()

function handleClusterDataChanged(): void {
  emit('changed')
}
</script>

<template>
  <UiEmpty v-if="!examId" description="请选择考试后查看错因聚类与题目分析" />
  <div v-else class="ai-analysis-cluster-tab">
    <ErrorCauseClusterCard
      :exam-id="examId"
      :reload-token="reloadToken"
      :class-id="classId"
      embedded
    />
    <QuestionAnalysisCard
      :exam-id="examId"
      :reload-token="reloadToken"
      :class-id="classId"
      embedded
      @generated="handleClusterDataChanged"
    />
    <ExamQuestionCourseGoalMappingCard
      :exam-id="examId"
      :reload-token="reloadToken"
      embedded
    />
    <RejudgePlanCard
      :exam-id="examId"
      :reload-token="reloadToken"
      embedded
      @changed="handleClusterDataChanged"
    />
  </div>
</template>
