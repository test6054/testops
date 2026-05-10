<template>
  <GiPageLayout>
    <div class="dashboard-page">
      <PageHeader title="AI 校级质量分析">
        <template #tags>
          <UiTag tone="orange" size="md">教学 / 命题 / 阅卷</UiTag>
        </template>
      </PageHeader>

      <a-alert
        type="info"
        show-icon
        message="校级质量分析按维度（课程 / 教师 / 班级 / 学院 / 学期）评估教学、命题和阅卷质量；经验有效性评估检测已沉淀经验在新考试中的模型漂移。"
        class="dashboard-page__alert"
      />

      <div class="dashboard-page__cards">
        <SchoolQualityCard />
        <ExperienceEffectivenessCard />
      </div>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import PageHeader from '@/components/common/PageHeader.vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiTag } from '@/components/ui-guide/ui'
import ExperienceEffectivenessCard from './school-quality/ExperienceEffectivenessCard.vue'
import SchoolQualityCard from './school-quality/SchoolQualityCard.vue'

defineOptions({ name: 'AdminSchoolQualityDashboard' })
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
