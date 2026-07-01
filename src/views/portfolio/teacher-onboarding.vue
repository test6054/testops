<script setup lang="ts">
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import type { WorkbenchStage } from '@/types/workbench'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PortfolioTeacherJourneyRail from '@/components/portfolio/PortfolioTeacherJourneyRail.vue'
import PortfolioTeacherOnboardingWizard from '@/components/portfolio/PortfolioTeacherOnboardingWizard.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import {
  PORTFOLIO_TEACHER_JOURNEY_STEPS,
  resolvePortfolioJourneyDefaultRoute,
} from '@/constants/portfolio-teacher-journey'

const route = useRoute()
const router = useRouter()
const { targetTeacherId } = usePortfolioPageScope()

const blockedByTemplate = computed(() => route.query.blocked === 'template')
const blockedByReadiness = computed(() => route.query.blocked === 'readiness')
const readonlyMode = computed(() => route.query.mode === 'readonly' || route.query.readonly === '1')

const journeyStages = computed((): WorkbenchStage[] =>
  PORTFOLIO_TEACHER_JOURNEY_STEPS.map((step) => ({
    key: step.key,
    title: step.title,
    status: step.key === 'learn' ? 'active' : 'pending',
  })),
)

function navigateJourney(journeyKey: PortfolioTeacherJourneyKey) {
  void router.push({
    ...resolvePortfolioJourneyDefaultRoute(journeyKey),
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="认识档案" />
    </template>
    <template #rail>
      <PortfolioTeacherJourneyRail
        :stages="journeyStages"
        active-key="learn"
        @select="navigateJourney"
      />
    </template>
    <PortfolioTeacherOnboardingWizard
      :blocked-by-template="blockedByTemplate"
      :blocked-by-readiness="blockedByReadiness"
      :readonly-mode="readonlyMode"
    />
  </StageWorkbenchShell>
</template>
