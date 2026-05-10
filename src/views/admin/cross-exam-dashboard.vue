<template>
  <GiPageLayout>
    <div class="dashboard-page">
      <PageHeader title="AI 跨考试纵向分析">
        <template #tags>
          <UiTag tone="purple" size="md">课程 / 班级 / 学期</UiTag>
        </template>
      </PageHeader>

      <a-alert
        type="info"
        show-icon
        message="跨考试纵向分析适用于同一课程或同一班级的多次考试，建议至少选择 2 次考试以体现趋势。"
        class="dashboard-page__alert"
      />

      <div class="dashboard-page__cards">
        <CrossExamTrendCard />
        <SemesterGrowthCard />
        <CourseAchievementCard />
      </div>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiTag } from '@/components/ui-guide/ui'
import CourseAchievementCard from './cross-exam/CourseAchievementCard.vue'
import CrossExamTrendCard from './cross-exam/CrossExamTrendCard.vue'
import SemesterGrowthCard from './cross-exam/SemesterGrowthCard.vue'

defineOptions({ name: 'AdminCrossExamDashboard' })
</script>

<style lang="scss" scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.dashboard-page__alert {
  margin-bottom: 0;
}

.dashboard-page__cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
