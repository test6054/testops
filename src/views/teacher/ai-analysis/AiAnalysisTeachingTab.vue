<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { MarkClassOption } from '@/composables/useMarkExamRoster'
import { watch } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { useMarkExamRoster } from '@/composables/useMarkExamRoster'
import ClassWeaknessCard from '@/views/teacher/ai-analysis/cards/ClassWeaknessCard.vue'
import PaperQualityCard from '@/views/teacher/ai-analysis/cards/PaperQualityCard.vue'
import StudentLearningProfileCard from '@/views/teacher/ai-analysis/cards/StudentLearningProfileCard.vue'
import TeachingImprovementCard from '@/views/teacher/ai-analysis/cards/TeachingImprovementCard.vue'

const props = defineProps<{
  examId?: string
  reloadToken: number
  classId?: string
}>()

const emit = defineEmits<{
  (e: 'class-change', classId?: string, option?: MarkClassOption): void
}>()

const {
  classOptions,
  studentOptions,
  loading: rosterLoading,
  load: loadRoster,
  reset: resetRoster,
} = useMarkExamRoster()

watch(
  () => props.examId,
  (examId) => {
    resetRoster()
    if (examId) {
      void loadRoster(examId)
    }
  },
  { immediate: true },
)

function handleClassChange(value?: SelectValue): void {
  const nextClassId = typeof value === 'string' ? value : undefined
  const option = classOptions.value.find(item => item.value === nextClassId)
  emit('class-change', nextClassId, option)
}
</script>

<template>
  <UiEmpty v-if="!examId" description="请选择考试后查看教学分析" />
  <div v-else class="ai-analysis-teaching-tab">
    <TeachingImprovementCard
      :exam-id="examId"
      :reload-token="reloadToken"
      :class-id="classId"
      embedded
    />
    <ClassWeaknessCard
      :exam-id="examId"
      :reload-token="reloadToken"
      :class-id="classId"
      :class-options="classOptions"
      :roster-loading="rosterLoading"
      embedded
      @class-change="handleClassChange"
    />
    <StudentLearningProfileCard
      :exam-id="examId"
      :reload-token="reloadToken"
      :class-id-hint="classId"
      :student-options="studentOptions"
      :roster-loading="rosterLoading"
      embedded
    />
    <PaperQualityCard
      :exam-id="examId"
      :reload-token="reloadToken"
      :class-id="classId"
      embedded
    />
  </div>
</template>
