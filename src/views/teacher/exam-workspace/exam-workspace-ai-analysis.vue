<script lang="ts" setup>
import { computed, provide } from 'vue'
import {
  AI_ANALYSIS_LOCK_EXAM_ID_KEY,
  AI_ANALYSIS_LOCK_TERM_KEY,
} from '@/composables/useAiAnalysisScope'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import TeacherAiAnalysisCenter from '@/views/teacher/ai-analysis-center.vue'

defineOptions({ name: 'TeacherExamWorkspaceAiAnalysis' })

const { examId } = useWorkspaceExamId()
const { examDetail } = useMarkWorkbenchContext()

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
    referenceDepartmentId: detail.referenceDepartmentId,
    referenceDepartmentName: detail.referenceDepartmentName ?? detail.departmentName,
    courseName: detail.courseName,
  }
})

provide(AI_ANALYSIS_LOCK_TERM_KEY, lockTerm)
</script>

<template>
  <TeacherAiAnalysisCenter />
</template>
