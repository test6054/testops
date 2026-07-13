<script setup lang="ts">
import AiAnalysisOrgTermScopePanel from '@/components/mark/analysis/AiAnalysisOrgTermScopePanel.vue'
import { useAiAnalysisScopeContext } from '@/composables/useAiAnalysisScope'
import ExperienceEffectivenessCard from '@/views/teacher/ai-analysis/cards/ExperienceEffectivenessCard.vue'
import SchoolQualityCard from '@/views/teacher/ai-analysis/cards/SchoolQualityCard.vue'

const {
  referenceDepartmentId,
  scopeCourseId,
  classId,
  academicYear,
  semester,
} = useAiAnalysisScopeContext()
</script>

<template>
  <div class="ai-analysis-school-tab">
    <AiAnalysisOrgTermScopePanel />
    <SchoolQualityCard
      :scope-reference-department-id="referenceDepartmentId"
      :scope-org-course-id="scopeCourseId"
      :scope-org-class-id="classId"
      :scope-academic-year="academicYear"
      :scope-semester="semester"
    />
    <ExperienceEffectivenessCard
      :scope-reference-department-id="referenceDepartmentId"
      :scope-org-course-id="scopeCourseId"
      :scope-org-class-id="classId"
    />
  </div>
</template>

<style scoped lang="scss">
.ai-analysis-school-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
