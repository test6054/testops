<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="school-quality-dashboard__context">
        <UiTag tone="orange" size="sm">教学 / 命题 / 阅卷</UiTag>
      </div>
    </template>

    <UiAlertStrip
      tone="info"
      title="校级质量分析说明"
      description="校级质量分析按维度（课程 / 教师 / 班级 / 学院 / 学期）评估教学、命题和阅卷质量；经验有效性评估检测已沉淀经验在新考试中的模型漂移。"
      dense
      class="school-quality-dashboard__alert"
    />

    <div class="school-quality-dashboard__cards">
      <SchoolQualityCard />
      <ExperienceEffectivenessCard />
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import { UiAlertStrip, UiTag } from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import ExperienceEffectivenessCard from './school-quality/ExperienceEffectivenessCard.vue'
import SchoolQualityCard from './school-quality/SchoolQualityCard.vue'

defineOptions({ name: 'AdminSchoolQualityDashboard' })
</script>

<style lang="scss" scoped>
.school-quality-dashboard {
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
