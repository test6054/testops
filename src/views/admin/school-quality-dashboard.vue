<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="校级质量分析">
        <template #status>
          <UiTag tone="orange" size="sm">教学 / 命题 / 阅卷</UiTag>
        </template>
      </ContextBar>
    </template>

    <div class="school-quality-dashboard__cards">
      <SchoolQualityCard />
      <ExperienceEffectivenessCard />
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import ExperienceEffectivenessCard from './school-quality/ExperienceEffectivenessCard.vue'
import SchoolQualityCard from './school-quality/SchoolQualityCard.vue'

defineOptions({ name: 'AdminSchoolQualityDashboard' })
</script>

<style lang="scss" scoped>
.school-quality-dashboard {
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
