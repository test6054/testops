<script setup lang="ts">
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PortfolioTeacherJourneyRail from '@/components/portfolio/PortfolioTeacherJourneyRail.vue'
import PortfolioTeacherOnboardingWizard from '@/components/portfolio/PortfolioTeacherOnboardingWizard.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { usePortfolioTeacherJourneyRail } from '@/composables/usePortfolioTeacherJourneyRail'
import { resolvePortfolioJourneyDefaultRoute } from '@/constants/portfolio-teacher-journey'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const activeJourneyKey: PortfolioTeacherJourneyKey = 'learn'
const { journeyStages, loadFailed, lastSuccessAt } = usePortfolioTeacherJourneyRail(activeJourneyKey)

const blockedByTemplate = computed(() => route.query.blocked === 'template')
const blockedByReadiness = computed(() => route.query.blocked === 'readiness')
const readonlyMode = computed(() => route.query.mode === 'readonly' || route.query.readonly === '1')
const needsTeacherPick = computed(() => canPickTeachers.value && !targetTeacherId.value)

function navigateJourney(journeyKey: PortfolioTeacherJourneyKey) {
  void router.push({
    ...resolvePortfolioJourneyDefaultRoute(journeyKey),
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

const TeacherOnboardingWorkbenchSubtitle = computed(() => {
  const total = journeyStages.value.length
  if (total <= 0) {
    return loadFailed.value ? '旅程加载失败' : '准备启用'
  }
  const done = journeyStages.value.filter((stage) => stage.status === 'completed').length
  return `启用进度 ${done}/${total}`
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        show-title
        layout="workbench"
        title="启用我的教学档案袋"
        :subtitle="TeacherOnboardingWorkbenchSubtitle"
      />
    </template>
    <template v-if="!needsTeacherPick" #rail>
      <PortfolioTeacherJourneyRail
        v-if="journeyStages.length > 0"
        :stages="journeyStages"
        :active-key="activeJourneyKey"
        @select="navigateJourney"
      />
    </template>
    <UiAlertStrip
      v-if="!needsTeacherPick && loadFailed"
      tone="error"
      title="旅程快照加载失败"
    />
    <PortfolioTeacherPickGate v-if="needsTeacherPick" />
    <PortfolioTeacherOnboardingWizard
      v-else
      :blocked-by-template="blockedByTemplate"
      :blocked-by-readiness="blockedByReadiness"
      :readonly-mode="readonlyMode"
    />
  </StageWorkbenchShell>
</template>
