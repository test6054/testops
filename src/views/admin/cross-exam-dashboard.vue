<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <DrilldownBreadcrumb :levels="drilldownLevels" @navigate="handleDrillNavigate" />
          <ClassSelector
            :value="drillClassId"
            placeholder="钻取到班级"
            :width="200"
            @change="handleClassChange"
          />
          <UiTag tone="purple" size="sm">课程 / 班级 / 学期</UiTag>
        </template>
      </ContextBar>
    </template>

    <div class="cross-exam-dashboard__cards">
      <CrossExamTrendCard
        :default-recent-semester-count="2"
        :drill-class-id="drillClassId"
        :drill-class-label="drillClassLabel"
      />
      <SemesterGrowthCard
        :default-recent-semester-count="2"
        :drill-class-id="drillClassId"
        :drill-class-label="drillClassLabel"
      />
      <CourseAchievementCard :default-recent-semester-count="2" />
    </div>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ClassInfoDto } from '@/apis/edu/class'
import { computed, ref } from 'vue'
import DrilldownBreadcrumb from '@/components/admin/DrilldownBreadcrumb.vue'
import { ClassSelector } from '@/components/quality/selectors'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import CourseAchievementCard from './cross-exam/CourseAchievementCard.vue'
import CrossExamTrendCard from './cross-exam/CrossExamTrendCard.vue'
import SemesterGrowthCard from './cross-exam/SemesterGrowthCard.vue'

defineOptions({ name: 'AdminCrossExamDashboard' })

const drillClassId = ref<string | null>(null)
const drillClassLabel = ref('')

const drilldownLevels = computed(() => {
  const levels = [{ key: 'school', label: '全校' }]
  if (drillClassLabel.value) {
    levels.push({ key: drillClassId.value ?? 'class', label: drillClassLabel.value })
  }
  return levels
})

function handleDrillNavigate(index: number): void {
  if (index === 0) {
    drillClassId.value = null
    drillClassLabel.value = ''
  }
}

function handleClassChange(value: string | null, option?: ClassInfoDto): void {
  drillClassId.value = value
  drillClassLabel.value = option?.className ?? ''
}
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
