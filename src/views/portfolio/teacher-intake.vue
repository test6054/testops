<script setup lang="ts">
import type { PortfolioTeacherJourneyKey } from '@/constants/portfolio-teacher-journey'
import type { SignalMetric } from '@/types/workbench'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PortfolioMaterialIntakePanel from '@/components/portfolio/PortfolioMaterialIntakePanel.vue'
import PortfolioTeacherJourneyRail from '@/components/portfolio/PortfolioTeacherJourneyRail.vue'
import PortfolioTeacherPickGate from '@/components/portfolio/PortfolioTeacherPickGate.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
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

/** 任务工作台副标题：旅程快照规模，禁止说明书。 */
const teacherIntakeWorkbenchSubtitle = computed(() => {
  if (loadFailed.value) {
    return '旅程快照加载失败'
  }
  if (journeyStages.value.length <= 0) {
    return lastSuccessAt.value ? '采集入口' : '旅程加载中'
  }
  return `采集旅程 ${journeyStages.value.length} 段`
})

/** 采集入口 SignalBand：旅程段规模为主信号。 */
const teacherIntakeSignalMetrics = computed((): SignalMetric[] => {
  if (loadFailed.value) {
    return [
      {
        key: 'journey-failed',
        label: '旅程快照',
        value: '加载失败',
        tone: 'red',
        emphasis: 'primary',
      },
    ]
  }
  const total = journeyStages.value.length
  if (total <= 0) {
    return []
  }
  const active = journeyStages.value.find((stage) => stage.key === activeJourneyKey)
  return [
    {
      key: 'stages',
      label: '采集旅程',
      value: total,
      unit: '段',
      tone: 'blue',
      emphasis: 'primary',
      helper: active?.title ? `当前：${active.title}` : '材料采集段',
    },
  ]
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="材料采集" :subtitle="teacherIntakeWorkbenchSubtitle">
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
    <template v-if="teacherIntakeSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="teacherIntakeSignalMetrics"
      />
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
