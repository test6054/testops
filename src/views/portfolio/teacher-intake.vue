<script setup lang="ts">
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import type { WorkbenchStage } from '@/types/workbench'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PortfolioMaterialIntakePanel from '@/components/portfolio/PortfolioMaterialIntakePanel.vue'
import PortfolioTeacherJourneyRail from '@/components/portfolio/PortfolioTeacherJourneyRail.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
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

const journeyStages = computed((): WorkbenchStage[] =>
  PORTFOLIO_TEACHER_JOURNEY_STEPS.map((step) => ({
    key: step.key,
    title: step.title,
    status: step.key === 'collect' ? 'active' : 'pending',
  })),
)

function navigateJourney(journeyKey: PortfolioTeacherJourneyKey) {
  void router.push({
    ...resolvePortfolioJourneyDefaultRoute(journeyKey),
    query: targetTeacherId.value ? { teacherId: targetTeacherId.value } : {},
  })
}

function handleSubmitted(recordId: string) {
  void router.push({
    path: '/portfolio/teacher/review-status',
    query: {
      ...(targetTeacherId.value ? { teacherId: targetTeacherId.value } : {}),
      highlightRecordId: recordId,
    },
  })
}

function openArchiveCategory() {
  const categoryId = typeof route.query.categoryId === 'string' ? route.query.categoryId : ''
  if (!categoryId) {
    return
  }
  const query: Record<string, string> = {}
  if (targetTeacherId.value) {
    query.teacherId = targetTeacherId.value
  }
  if (typeof route.query.recordId === 'string' && route.query.recordId) {
    query.recordId = route.query.recordId
  }
  void router.push({
    path: `/portfolio/teacher/archive/${categoryId}`,
    query,
  })
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="材料采集">
        <template #actions>
          <UiButton
            v-if="route.query.categoryId"
            variant="outline"
            size="sm"
            @click="openArchiveCategory"
          >
            打开完整档案
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template #rail>
      <PortfolioTeacherJourneyRail
        :stages="journeyStages"
        active-key="collect"
        @select="navigateJourney"
      />
    </template>
    <PortfolioMaterialIntakePanel @submitted="handleSubmitted" />
  </StageWorkbenchShell>
</template>
