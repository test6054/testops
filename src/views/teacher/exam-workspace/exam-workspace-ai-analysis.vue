<script lang="ts" setup>
import { computed, provide } from 'vue'
import {
  AI_ANALYSIS_LOCK_EXAM_ID_KEY,
  AI_ANALYSIS_LOCK_TERM_KEY,
  AI_ANALYSIS_WORKSPACE_CHROME_KEY,
} from '@/composables/useAiAnalysisScope'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import TeacherAiAnalysisCenter from '@/views/teacher/ai-analysis-center.vue'

defineOptions({ name: 'TeacherExamWorkspaceAiAnalysis' })

const { examId } = useWorkspaceExamId()
const { examDetail } = useMarkWorkbenchContext()
const { contextBarTitle, contextBarSubtitle } = useExamJourneyContextBar('AI 分析')

provide(AI_ANALYSIS_LOCK_EXAM_ID_KEY, examId)

const lockTerm = computed(() => {
  const detail = examDetail?.value
  if (!detail) {
    return null
  }
  return {
    academicYear: detail.academicYear,
    semester: detail.semester,
    courseId: detail.courseId,
  }
})

provide(AI_ANALYSIS_LOCK_TERM_KEY, lockTerm)

const workspaceChrome = computed(() => ({
  title: contextBarTitle.value,
  subtitle: contextBarSubtitle.value,
}))

provide(AI_ANALYSIS_WORKSPACE_CHROME_KEY, workspaceChrome)
</script>

<template>
  <TeacherAiAnalysisCenter />
</template>
