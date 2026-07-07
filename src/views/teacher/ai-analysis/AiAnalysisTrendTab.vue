<script setup lang="ts">
import type { ClassInfoDto } from '@/apis/edu/class'
import type { TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { computed, inject, ref } from 'vue'
import DrilldownBreadcrumb from '@/components/admin/DrilldownBreadcrumb.vue'
import AnalysisOrgScopeBar from '@/components/mark/AnalysisOrgScopeBar.vue'
import {
  AI_ANALYSIS_CLASS_ID_KEY,
  AI_ANALYSIS_CLASS_LABEL_KEY,
  AI_ANALYSIS_COURSE_ID_KEY,
  AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY,
} from '@/composables/useAiAnalysisScope'
import CourseAchievementCard from '@/views/teacher/ai-analysis/cards/CourseAchievementCard.vue'
import CrossExamTrendCard from '@/views/teacher/ai-analysis/cards/CrossExamTrendCard.vue'
import SemesterGrowthCard from '@/views/teacher/ai-analysis/cards/SemesterGrowthCard.vue'

const injectedReferenceDepartmentId = inject(AI_ANALYSIS_REFERENCE_DEPARTMENT_ID_KEY, null)
const injectedScopeCourseId = inject(AI_ANALYSIS_COURSE_ID_KEY, null)
const injectedScopeClassId = inject(AI_ANALYSIS_CLASS_ID_KEY, null)
const injectedScopeClassLabel = inject(AI_ANALYSIS_CLASS_LABEL_KEY, null)
if (!injectedReferenceDepartmentId || !injectedScopeCourseId || !injectedScopeClassId || !injectedScopeClassLabel) {
  throw new Error('AI 分析中心未提供 scope')
}
const referenceDepartmentId = injectedReferenceDepartmentId
const scopeCourseId = injectedScopeCourseId
const scopeClassId = injectedScopeClassId
const scopeClassLabel = injectedScopeClassLabel
const scopeDepartmentLabel = ref('')

const drilldownLevels = computed(() => {
  const levels = [{ key: 'school', label: '全校' }]
  if (scopeDepartmentLabel.value) {
    levels.push({ key: referenceDepartmentId.value ?? 'department', label: scopeDepartmentLabel.value })
  }
  if (scopeClassLabel.value) {
    levels.push({ key: scopeClassId.value ?? 'class', label: scopeClassLabel.value })
  }
  return levels
})

function handleDrillNavigate(index: number): void {
  if (index === 0) {
    referenceDepartmentId.value = undefined
    scopeCourseId.value = undefined
    scopeClassId.value = undefined
    scopeDepartmentLabel.value = ''
    scopeClassLabel.value = ''
    return
  }
  if (index === 1 && scopeClassLabel.value) {
    scopeClassId.value = undefined
    scopeClassLabel.value = ''
  }
}

function handleDepartmentChange(value: string | null, option?: TenantSchoolDepartmentDto): void {
  scopeDepartmentLabel.value = option?.deptName ?? ''
  if (!value) {
    scopeDepartmentLabel.value = ''
  }
}

function handleClassChange(value: string | null, option?: ClassInfoDto): void {
  scopeClassLabel.value = option?.className ?? ''
  if (!value) {
    scopeClassLabel.value = ''
  }
}
</script>

<template>
  <div class="ai-analysis-trend-tab">
    <div class="ai-analysis-tab__scope-bar">
      <DrilldownBreadcrumb :levels="drilldownLevels" @navigate="handleDrillNavigate" />
      <AnalysisOrgScopeBar
        v-model:department-id="referenceDepartmentId"
        v-model:course-id="scopeCourseId"
        v-model:class-id="scopeClassId"
        @department-change="handleDepartmentChange"
        @class-change="handleClassChange"
      />
    </div>
    <CrossExamTrendCard
      :scope-reference-department-id="referenceDepartmentId"
      :scope-org-course-id="scopeCourseId"
      :scope-org-class-id="scopeClassId"
      :drill-class-id="scopeClassId"
      :drill-class-label="scopeClassLabel"
    />
    <SemesterGrowthCard
      :default-recent-semester-count="2"
      :scope-reference-department-id="referenceDepartmentId"
      :scope-org-course-id="scopeCourseId"
      :scope-org-class-id="scopeClassId"
      :drill-class-id="scopeClassId"
      :drill-class-label="scopeClassLabel"
    />
    <CourseAchievementCard
      :scope-reference-department-id="referenceDepartmentId"
      :scope-org-course-id="scopeCourseId"
      :scope-org-class-id="scopeClassId"
    />
  </div>
</template>

<style scoped lang="scss">
.ai-analysis-tab__scope-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px 16px;
  margin-bottom: 16px;
}
</style>
