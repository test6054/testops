<script setup lang="ts">
import { inject } from 'vue'
import AnalysisOrgScopeBar from '@/components/mark/AnalysisOrgScopeBar.vue'
import {
  AI_ANALYSIS_CLASS_ID_KEY,
  AI_ANALYSIS_COURSE_ID_KEY,
  AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY,
} from '@/composables/useAiAnalysisScope'
import ExperienceEffectivenessCard from '@/views/teacher/ai-analysis/cards/ExperienceEffectivenessCard.vue'
import SchoolQualityCard from '@/views/teacher/ai-analysis/cards/SchoolQualityCard.vue'

const referenceDepartmentId = inject(AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY, null)
const scopeCourseId = inject(AI_ANALYSIS_COURSE_ID_KEY, null)
const scopeClassId = inject(AI_ANALYSIS_CLASS_ID_KEY, null)
if (!referenceDepartmentId || !scopeCourseId || !scopeClassId) {
  throw new Error('AI 分析中心未提供 scope')
}
</script>

<template>
  <div class="ai-analysis-school-tab">
    <div class="ai-analysis-tab__scope-bar">
      <AnalysisOrgScopeBar
        v-model:department-id="referenceDepartmentId"
        v-model:course-id="scopeCourseId"
        v-model:class-id="scopeClassId"
      />
    </div>
    <div class="ai-analysis-school-tab__cards">
      <SchoolQualityCard
        :scope-reference-department-id="referenceDepartmentId"
        :scope-org-course-id="scopeCourseId"
        :scope-org-class-id="scopeClassId"
      />
      <ExperienceEffectivenessCard
        :scope-reference-department-id="referenceDepartmentId"
        :scope-org-course-id="scopeCourseId"
        :scope-org-class-id="scopeClassId"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.ai-analysis-tab__scope-bar {
  margin-bottom: 16px;
}

.ai-analysis-school-tab__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
