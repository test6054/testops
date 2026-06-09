<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="purple" size="sm">课程 / 班级 / 学期</UiTag>
        </template>
      </ContextBar>
    </template>

    <div class="cross-exam-dashboard__cards">
      <CrossExamTrendCard />
      <SemesterGrowthCard />
      <CourseAchievementCard />
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import { UiTag } from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import CourseAchievementCard from './cross-exam/CourseAchievementCard.vue'
import CrossExamTrendCard from './cross-exam/CrossExamTrendCard.vue'
import SemesterGrowthCard from './cross-exam/SemesterGrowthCard.vue'

defineOptions({ name: 'AdminCrossExamDashboard' })
</script>

<style lang="scss" scoped>
.cross-exam-dashboard {
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
