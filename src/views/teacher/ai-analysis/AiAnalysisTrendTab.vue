<script setup lang="ts">
import { computed } from 'vue'
import AiAnalysisOrgTermScopePanel from '@/components/mark/analysis/AiAnalysisOrgTermScopePanel.vue'
import { useAiAnalysisScopeContext } from '@/composables/useAiAnalysisScope'
import { formatSemester } from '@/types/enums/semester-enum'
import CourseAchievementCard from '@/views/teacher/ai-analysis/cards/CourseAchievementCard.vue'
import CrossExamTrendCard from '@/views/teacher/ai-analysis/cards/CrossExamTrendCard.vue'
import SemesterGrowthCard from '@/views/teacher/ai-analysis/cards/SemesterGrowthCard.vue'

const {
  referenceDepartmentId,
  scopeCourseId,
  classId,
  classLabel,
  academicYear,
  semester,
} = useAiAnalysisScopeContext()

const termLabel = computed(() => {
  const year = academicYear.value
  const semesterCode = semester.value
  if (!year || !semesterCode) {
    return ''
  }
  return `${year} · ${formatSemester(semesterCode)}`
})
</script>

<template>
  <div class="ai-analysis-trend-tab">
    <AiAnalysisOrgTermScopePanel />
    <CrossExamTrendCard
      :scope-reference-department-id="referenceDepartmentId"
      :scope-org-course-id="scopeCourseId"
      :scope-org-class-id="classId"
      :drill-class-id="classId"
      :drill-class-label="classLabel"
      :scope-academic-year="academicYear"
      :scope-semester="semester"
      :scope-term-label="termLabel"
    />
    <SemesterGrowthCard
      :scope-reference-department-id="referenceDepartmentId"
      :scope-org-course-id="scopeCourseId"
      :scope-org-class-id="classId"
      :drill-class-id="classId"
      :drill-class-label="classLabel"
      :scope-academic-year="academicYear"
      :scope-semester="semester"
    />
    <CourseAchievementCard
      :scope-reference-department-id="referenceDepartmentId"
      :scope-org-course-id="scopeCourseId"
      :scope-org-class-id="classId"
      :scope-academic-year="academicYear"
      :scope-semester="semester"
    />
  </div>
</template>

<style scoped lang="scss">
.ai-analysis-trend-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
