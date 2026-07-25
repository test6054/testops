<script setup lang="ts">
import AiAnalysisOrgTermScopePanel from '@/components/mark/analysis/AiAnalysisOrgTermScopePanel.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
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
    <UiAlertStrip
      tone="info"
      dense
      title="考试质量横向分析"
      description="数据来自已确认考试成绩与阅卷证据；非正式 OBE / 认证「质量评价」工作台。"
    />
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
  gap: var(--dp-space-component);
}
</style>
