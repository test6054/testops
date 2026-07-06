<template>
  <StageWorkbenchShell>
    <template v-if="detail" #context>
      <ContextBar layout="workbench" show-title :title="contextBarTitle || detail.examName" :subtitle="contextBarSubtitle">
        <template #status>
          <UiTag v-if="chromeExamStatusLabel" :tone="chromeExamStatusTone" size="sm">
            {{ chromeExamStatusLabel }}
          </UiTag>
          <UiTag v-if="detail.examKind" :tone="examKindTone(detail.examKind)" size="sm">
            {{ examKindLabel(detail) }}
          </UiTag>
          <UiTag v-if="detail.confidential" tone="red" size="sm">涉密考试</UiTag>
        </template>
        <template v-if="suggestedStage" #actions>
          <UiButton size="sm" variant="primary" @click="goSuggestedStage">
            前往{{ suggestedStage.title }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="detail && overviewSignalMetrics.length > 0" #signal>
      <SignalBand
        variant="tiles"
        compact
        :metrics="overviewSignalMetrics"
        @metric-click="handleOverviewMetricClick"
      />
    </template>

    <UiSkeletonState
      v-if="pageLoading"
      variant="card"
      :card-count="3"
      compact
      class="exam-overview__loading"
    />

    <UiEmpty
      v-else-if="!detail || !snapshot?.dashboardPanel"
      description="暂无考试概览数据"
      class="exam-overview__empty"
    />

    <ExamWorkbenchOverviewDashboard
      v-else
      :detail="detail"
      :marking-progress="markingProgress ?? null"
      :stages="snapshot.stages"
      :dashboard-panel="snapshot.dashboardPanel"
      :suggested-stage-title="suggestedStage?.title"
      :suggested-stage-status="suggestedStageStatus"
      @stage-click="handleStageClick"
      @enter-marking="goMarkingTaskPool"
      @enter-scan="goScanBatches"
      @enter-quality="goMarkQuality"
      @todo-navigate="handleTodoNavigate"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ExamDetailVO } from '@/apis/mark/exam'
import type { ExamWorkbenchStageKeyCode } from '@/apis/mark/exam-progress'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import { storeToRefs } from 'pinia'
import { computed, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_KIND_TONE, ExamKindDescription } from '@/apis/mark/exam'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { navigateToMarkStage } from '@/utils/mark-stage-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ExamWorkbenchOverviewDashboard from '@/views/teacher/exam-workspace/ExamWorkbenchOverviewDashboard.vue'

defineOptions({ name: 'TeacherExamWorkspaceOverview' })

const router = useRouter()
const {
  examId,
  examDetail,
  examDetailLoading,
  markingProgress,
  snapshot,
  loading: snapshotLoading,
  refreshChrome,
} = useMarkWorkbenchContext()

const {
  contextBarTitle,
  contextBarSubtitle,
  examStatusLabel: chromeExamStatusLabel,
  examStatusTone: chromeExamStatusTone,
} = useExamJourneyContextBar('考试概览')

const markStageStore = useMarkStageStore()
const { suggestedStageKey, orderedStages } = storeToRefs(markStageStore)

const detail = computed(() => examDetail?.value ?? null)
const pageLoading = computed(() =>
  (snapshotLoading.value && !snapshot.value)
  || (examDetailLoading?.value === true && !detail.value),
)

const suggestedStage = computed<WorkbenchStage | null>(() => {
  const key = suggestedStageKey.value
  if (!key) return null
  return orderedStages.value.find((stage) => stage.key === key) ?? null
})

const suggestedStageStatus = computed(() => {
  const key = suggestedStageKey.value
  if (!key || !snapshot.value) return undefined
  return snapshot.value.stages.find((stage) => stage.key === key)?.status
})

const markingPercent = computed(() => {
  const progress = markingProgress?.value
  if (!progress || progress.totalQuestionGradeCount <= 0) return 0
  return Math.round((progress.confirmedQuestionGradeCount / progress.totalQuestionGradeCount) * 100)
})

const overviewSignalMetrics = computed((): SignalMetric[] => {
  const metrics: SignalMetric[] = []
  const progress = markingProgress?.value
  if (progress && progress.totalQuestionGradeCount > 0) {
    metrics.push({
      key: 'marking',
      label: '批阅完成率',
      value: markingPercent.value,
      unit: '%',
      tone: markingPercent.value >= 100 ? 'green' : 'blue',
      clickable: true,
    })
  }
  if (progress && progress.scanAttentionCount > 0) {
    metrics.push({
      key: 'scanAttention',
      label: '扫描待处理',
      value: progress.scanAttentionCount,
      unit: '项',
      tone: 'orange',
      clickable: true,
    })
  }
  const panel = snapshot.value?.dashboardPanel
  if (panel && panel.quickStats.arbitrationPendingCount > 0) {
    metrics.push({
      key: 'arbitration',
      label: '仲裁待审核',
      value: panel.quickStats.arbitrationPendingCount,
      unit: '项',
      tone: 'orange',
      clickable: true,
    })
  }
  return metrics.slice(0, 6)
})

function examKindTone(examKind: ExamDetailVO['examKind']): BadgeTone {
  return strictEnumTone(EXAM_KIND_TONE, examKind, '考试性质')
}

function examKindLabel(exam: ExamDetailVO): string {
  if (exam.examKindMessage?.trim()) return exam.examKindMessage.trim()
  return strictEnumLabel(ExamKindDescription, exam.examKind, '考试性质')
}

function goSuggestedStage(): void {
  const key = suggestedStageKey.value
  if (!key || !examId.value) return
  navigateToMarkStage(router, key, examId.value, {
    scanAttentionCount: markingProgress?.value?.scanAttentionCount,
  })
}

function handleStageClick(key: ExamWorkbenchStageKeyCode): void {
  if (!examId.value) return
  navigateToMarkStage(router, key, examId.value, {
    scanAttentionCount: markingProgress?.value?.scanAttentionCount,
  })
}

function goMarkingTaskPool(): void {
  void router.push({ name: 'TeacherExamWorkspaceMarkingTaskPool', params: { examId: examId.value } })
}

function goScanBatches(): void {
  void router.push({ name: 'TeacherExamWorkspaceScanBatches', params: { examId: examId.value } })
}

function goMarkQuality(): void {
  void router.push({ name: 'TeacherExamWorkspaceMarkingQuality', params: { examId: examId.value } })
}

function handleTodoNavigate(routeName: string | undefined, targetExamId: string | undefined): void {
  if (!routeName) return
  void router.push({
    name: routeName,
    params: { examId: targetExamId ?? examId.value },
  })
}

function handleOverviewMetricClick(key: string): void {
  if (key === 'marking') {
    void router.push({ name: 'TeacherExamWorkspaceMarkingProgress', params: { examId: examId.value } })
    return
  }
  if (key === 'scanAttention') {
    goScanBatches()
    return
  }
  if (key === 'arbitration') {
    void router.push({ name: 'TeacherExamWorkspaceMarkingArbitration', params: { examId: examId.value } })
  }
}

onActivated(() => {
  if (examId.value && refreshChrome) {
    void refreshChrome()
  }
})
</script>

<style lang="scss" scoped>
.exam-overview__loading {
  padding: var(--dp-space-4) 0;
}

.exam-overview__empty {
  padding: 48px 0;
}
</style>
