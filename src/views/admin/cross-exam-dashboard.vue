<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="cross-exam-dashboard__context">
        <UiTag tone="purple" size="sm">课程 / 班级 / 学期</UiTag>
      </div>
    </template>

    <UiAlertStrip
      tone="info"
      title="跨考试纵向分析说明"
      description="跨考试纵向分析适用于同一课程或同一班级的多次考试，建议至少选择 2 次考试以体现趋势。"
      dense
      class="cross-exam-dashboard__alert"
    />

    <div class="cross-exam-dashboard__cards">
      <CrossExamTrendCard />
      <SemesterGrowthCard />
      <CourseAchievementCard />
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import { UiAlertStrip, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import CourseAchievementCard from './cross-exam/CourseAchievementCard.vue'
import CrossExamTrendCard from './cross-exam/CrossExamTrendCard.vue'
import SemesterGrowthCard from './cross-exam/SemesterGrowthCard.vue'

defineOptions({ name: 'AdminCrossExamDashboard' })
</script>

<style lang="scss" scoped>
.cross-exam-dashboard {
  &__context {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__alert {
    margin-bottom: 16px;
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}
</style>
