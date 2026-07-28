<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import { computed, watch } from 'vue'
import AiAnalysisExamScopePanel from '@/components/mark/analysis/AiAnalysisExamScopePanel.vue'
import { useAiAnalysisScopeContext } from '@/composables/useAiAnalysisScope'
import { useMarkExamRoster } from '@/composables/useMarkExamRoster'
import ClassWeaknessCard from '@/views/teacher/ai-analysis/cards/ClassWeaknessCard.vue'
import PaperQualityCard from '@/views/teacher/ai-analysis/cards/PaperQualityCard.vue'
import StudentLearningProfileCard from '@/views/teacher/ai-analysis/cards/StudentLearningProfileCard.vue'
import TeachingImprovementCard from '@/views/teacher/ai-analysis/cards/TeachingImprovementCard.vue'

defineProps<{
  reloadToken: number
}>()

const emit = defineEmits<{
  (e: 'class-change', classId?: string, option?: MarkClassOption): void
}>()

const { examId, classId } = useAiAnalysisScopeContext()

const resolvedExamId = computed(() => examId.value ?? '')

const {
  classOptions,
  studentOptions,
  loading: rosterLoading,
  load: loadRoster,
  searchStudents,
  reset: resetRoster,
} = useMarkExamRoster()

watch(
  examId,
  (nextExamId) => {
    resetRoster()
    if (nextExamId) {
      void loadRoster(nextExamId)
    }
  },
  { immediate: true },
)

watch(
  classId,
  (nextClassId) => {
    if (examId.value) {
      void searchStudents('', nextClassId)
    }
  },
)

function handleClassChange(value?: SelectValue): void {
  const nextClassId = typeof value === 'string' ? value : undefined
  const option = classOptions.value.find((item) => item.value === nextClassId)
  emit('class-change', nextClassId, option)
}
</script>

<template>
  <div class="ai-analysis-teaching-tab">
    <AiAnalysisExamScopePanel />
    <TeachingImprovementCard
      :exam-id="resolvedExamId"
      :reload-token="reloadToken"
      :class-id="classId"
      embedded
    />
    <ClassWeaknessCard
      :exam-id="resolvedExamId"
      :reload-token="reloadToken"
      :class-id="classId"
      :class-options="classOptions"
      :roster-loading="rosterLoading"
      embedded
      @class-change="handleClassChange"
    />
    <StudentLearningProfileCard
      :exam-id="resolvedExamId"
      :reload-token="reloadToken"
      :class-id-hint="classId"
      :student-options="studentOptions"
      :roster-loading="rosterLoading"
      :on-student-search="searchStudents"
      embedded
    />
    <PaperQualityCard
      :exam-id="resolvedExamId"
      :reload-token="reloadToken"
      :class-id="classId"
      embedded
    />
  </div>
</template>

<style scoped lang="scss">
.ai-analysis-teaching-tab {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}
</style>
