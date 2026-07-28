<script setup lang="ts">
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import { useRoute, useRouter } from 'vue-router'
import PortfolioMaterialIntakePanel from '@/components/portfolio/PortfolioMaterialIntakePanel.vue'
import PortfolioTeacherJourneyRail from '@/components/portfolio/PortfolioTeacherJourneyRail.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { usePortfolioTeacherJourneyRail } from '@/composables/usePortfolioTeacherJourneyRail'
import { resolvePortfolioJourneyDefaultRoute } from '@/constants/portfolio-teacher-journey'

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers } = usePortfolioPageScope()
const activeJourneyKey: PortfolioTeacherJourneyKey = 'collect'
const { journeyStages, loadFailed, lastSuccessAt } = usePortfolioTeacherJourneyRail(activeJourneyKey)

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
        v-if="journeyStages.length > 0"
        :stages="journeyStages"
        :active-key="activeJourneyKey"
        @select="navigateJourney"
      />
    </template>
    <UiAlertStrip
      v-if="loadFailed"
      tone="error"
      title="旅程快照加载失败"
    />
    <PortfolioTeacherPickGate v-if="canPickTeachers && !targetTeacherId" />
    <PortfolioMaterialIntakePanel v-else @submitted="handleSubmitted" />
  </StageWorkbenchShell>
</template>
