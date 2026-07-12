<template>
  <StageWorkbenchShell>
    <template v-if="detail" #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="contextBarSubtitle"
      >
        <template #status>
          <UiTag v-if="chromeExamStatusLabel" :tone="chromeExamStatusTone" size="sm">
            {{ chromeExamStatusLabel }}
          </UiTag>
          <UiTag v-if="detail.examKind" :tone="examKindTone(detail.examKind)" size="sm">
            {{ examKindLabel(detail) }}
          </UiTag>
          <UiTag v-if="detail.confidential" tone="purple" size="sm">涉密考试</UiTag>
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
      description="当前没有可展示的考试概览"
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
      :recommended-primary-label="recommendedPrimaryLabel"
      :recommended-secondary-label="recommendedSecondaryLabel"
      :recommended-primary-disabled="recommendedPrimaryDisabled"
      :recommended-primary-disabled-reason="recommendedPrimaryDisabledReason"
      @stage-click="handleStageClick"
      @primary-action="runRecommendedPrimaryAction"
      @secondary-action="runRecommendedSecondaryAction"
      @enter-quality="goMarkQuality"
      @todo-navigate="handleTodoNavigate"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ExamDetailResponse } from '@/apis/mark/exam'
import { EXAM_KIND_TONE, ExamKindDescription } from '@/apis/mark/exam'
import type { ExamWorkbenchStageKeyCode } from '@/apis/mark/exam-progress'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import { storeToRefs } from 'pinia'
import { computed, onActivated } from 'vue'
import { useRouter } from 'vue-router'
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
import { WorkbenchNextActionKeyCode } from '@/types/enums/exam-workbench-next-action-key-enum'
import {
  countBlockingScanAttention,
  hasPrepHardBlocking,
  resolveNextActionRouteName,
  resolvePrimaryEnabledNextAction,
} from '@/utils/exam-workspace-entry-gates'
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
} = useExamJourneyContextBar('考试概览', 'hub')

const markStageStore = useMarkStageStore()
const { suggestedStageKey, orderedStages } = storeToRefs(markStageStore)

const detail = computed(() => examDetail?.value ?? null)
const pageLoading = computed(
  () =>
    (snapshotLoading.value && !snapshot.value) ||
    (examDetailLoading?.value === true && !detail.value),
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

const prepBlockingReasons = computed(() => snapshot.value?.prepBlockingReasons ?? [])
const nextActions = computed(() => snapshot.value?.nextActions ?? [])
const primaryNextAction = computed(() =>
  resolvePrimaryEnabledNextAction(nextActions.value, suggestedStageKey.value),
)

const recommendedPrimaryLabel = computed(() => {
  if (hasPrepHardBlocking(prepBlockingReasons.value)) {
    return '处理准备阻断'
  }
  const progress = markingProgress?.value
  if (
    progress &&
    countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
  ) {
    return '处理扫描异常'
  }
  if (primaryNextAction.value?.label?.trim()) {
    return primaryNextAction.value.label.trim()
  }
  if (suggestedStage.value?.title) {
    return `前往${suggestedStage.value.title}`
  }
  return '进入阅卷'
})

const recommendedSecondaryLabel = computed(() => {
  if (hasPrepHardBlocking(prepBlockingReasons.value)) {
    return '查看概览'
  }
  const progress = markingProgress?.value
  if (
    progress &&
    countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
  ) {
    return '扫描批次'
  }
  if (primaryNextAction.value?.actionKey === WorkbenchNextActionKeyCode.START_SCAN) {
    return '准备工作台'
  }
  return '扫描中心'
})

const recommendedPrimaryDisabled = computed(() => false)
const recommendedPrimaryDisabledReason = computed(() => '')

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

function examKindTone(examKind: ExamDetailResponse['examKind']): BadgeTone {
  return strictEnumTone(EXAM_KIND_TONE, examKind, '考试性质')
}

function examKindLabel(exam: ExamDetailResponse): string {
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
  void router.push({
    name: 'TeacherExamWorkspaceMarkingTaskPool',
    params: { examId: examId.value },
  })
}

function goScanBatches(): void {
  void router.push({ name: 'TeacherExamWorkspaceScanBatches', params: { examId: examId.value } })
}

function goPrepWorkbench(): void {
  void router.push({ name: 'TeacherExamWorkspacePrep', params: { examId: examId.value } })
}

function goScanMonitor(): void {
  void router.push({ name: 'TeacherExamWorkspaceScanMonitor', params: { examId: examId.value } })
}

/** 概览主按钮：阻断 > 扫描异常 > 后端 nextAction > 建议阶段 > 阅卷任务池 */
function runRecommendedPrimaryAction(): void {
  if (!examId.value) {
    return
  }
  if (hasPrepHardBlocking(prepBlockingReasons.value)) {
    goPrepWorkbench()
    return
  }
  const progress = markingProgress?.value
  if (
    progress &&
    countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
  ) {
    goScanMonitor()
    return
  }
  const action = primaryNextAction.value
  if (action) {
    void router.push({
      name: resolveNextActionRouteName(
        action.actionKey,
        examId.value,
        progress?.scanAttentionCount,
      ),
      params: { examId: examId.value },
    })
    return
  }
  if (suggestedStageKey.value) {
    goSuggestedStage()
    return
  }
  goMarkingTaskPool()
}

function runRecommendedSecondaryAction(): void {
  if (!examId.value) {
    return
  }
  if (hasPrepHardBlocking(prepBlockingReasons.value)) {
    return
  }
  const progress = markingProgress?.value
  if (
    progress &&
    countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
  ) {
    goScanBatches()
    return
  }
  if (primaryNextAction.value?.actionKey === WorkbenchNextActionKeyCode.START_SCAN) {
    goPrepWorkbench()
    return
  }
  goScanBatches()
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
    void router.push({
      name: 'TeacherExamWorkspaceMarkingProgress',
      params: { examId: examId.value },
    })
    return
  }
  if (key === 'scanAttention') {
    goScanMonitor()
    return
  }
  if (key === 'arbitration') {
    void router.push({
      name: 'TeacherExamWorkspaceMarkingArbitration',
      params: { examId: examId.value },
    })
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
