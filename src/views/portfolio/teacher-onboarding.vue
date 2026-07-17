<script setup lang="ts">
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import type { WorkbenchStage } from '@/types/workbench'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PortfolioTeacherJourneyRail from '@/components/portfolio/PortfolioTeacherJourneyRail.vue'
import PortfolioTeacherOnboardingWizard from '@/components/portfolio/PortfolioTeacherOnboardingWizard.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import {
  PORTFOLIO_TEACHER_JOURNEY_STEPS,
  resolvePortfolioJourneyDefaultRoute,
} from '@/constants/portfolio-teacher-journey'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()

const blockedByTemplate = computed(() => route.query.blocked === 'template')
const blockedByReadiness = computed(() => route.query.blocked === 'readiness')
const readonlyMode = computed(() => route.query.mode === 'readonly' || route.query.readonly === '1')
const needsTeacherPick = computed(() => canPickTeachers.value && !targetTeacherId.value)

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
      <ContextBar show-title layout="workbench" title="启用我的教学档案袋" />
    </template>
    <template v-if="!needsTeacherPick" #rail>
      <PortfolioTeacherJourneyRail
        :stages="journeyStages"
        active-key="learn"
        @select="navigateJourney"
      />
    </template>
    <PortfolioTeacherPickGate v-if="needsTeacherPick" />
    <PortfolioTeacherOnboardingWizard
      v-else
      :blocked-by-template="blockedByTemplate"
      :blocked-by-readiness="blockedByReadiness"
      :readonly-mode="readonlyMode"
    />
  </StageWorkbenchShell>
</template>
