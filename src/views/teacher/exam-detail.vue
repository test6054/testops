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
        <template #actions>
          <UiButton
            v-if="canEditExam"
            size="sm"
            variant="outline"
            @click="openEditDrawer"
          >
            编辑考试
          </UiButton>
          <UiButton v-if="suggestedStage" size="sm" variant="primary" @click="goSuggestedStage">
            前往{{ suggestedStage.title }}
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <UiSkeletonState
      v-if="pageLoading"
      variant="card"
      :card-count="3"
      compact
      class="exam-overview__loading"
    />

    <UiEmpty
      v-else-if="!detail || !examId"
      size="sm"
      description="考试概览暂不可用，请刷新或从考试列表重新进入"
      class="exam-overview__empty"
    />

    <ExamWorkbenchOverviewDashboard
      v-else
      ref="overviewDashboardRef"
      :exam-id="examId"
      :detail="detail"
      :recommended-primary-label="recommendedPrimaryLabel"
      :recommended-secondary-label="recommendedSecondaryLabel"
      @primary-action="runRecommendedPrimaryAction"
      @secondary-action="runRecommendedSecondaryAction"
      @enter-quality="goMarkQuality"
      @todo-navigate="handleTodoNavigate"
      @prep-step-navigate="handlePrepStepNavigate"
    />
  </StageWorkbenchShell>

  <ExamEditDrawer
    v-model:open="editDrawerOpen"
    :exam-id="examId"
    @saved="handleExamEdited"
  />
</template>

<script lang="ts" setup>
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { WorkbenchStage } from '@/types/workbench'
import { storeToRefs } from 'pinia'
import { computed, onActivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_KIND_TONE, ExamKindDescription, ExamStatusCode } from '@/apis/mark/exam'
import ExamEditDrawer from '@/components/mark/ExamEditDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
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
  () => examDetailLoading?.value === true && !detail.value,
)

const overviewDashboardRef = ref<InstanceType<typeof ExamWorkbenchOverviewDashboard> | null>(null)

const editDrawerOpen = ref(false)
// MVR-328：编辑考试仅主考；仅认 BE canManageOwnerExamLifecycleWrites===true
const canEditExam = computed(
  () =>
    !!detail.value
    && detail.value.status !== ExamStatusCode.CLOSED
    && detail.value.canManageOwnerExamLifecycleWrites === true,
)

function openEditDrawer(): void {
  if (!examId.value || !canEditExam.value) return
  editDrawerOpen.value = true
}

async function handleExamEdited(): Promise<void> {
  if (refreshChrome) {
    await refreshChrome()
  }
  await overviewDashboardRef.value?.reload?.()
}

const suggestedStage = computed<WorkbenchStage | null>(() => {
  const key = suggestedStageKey.value
  if (!key) return null
  return orderedStages.value.find((stage) => stage.key === key) ?? null
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
    progress
    && countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
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
    progress
    && countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
  ) {
    return '扫描批次'
  }
  if (primaryNextAction.value?.actionKey === WorkbenchNextActionKeyCode.START_SCAN) {
    return '准备工作台'
  }
  return '扫描运营'
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

function handlePrepStepNavigate(_stepKey: string): void {
  goPrepWorkbench()
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
    progress
    && countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
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
    progress
    && countBlockingScanAttention(progress.scanAttentionCount, progress.needReviewGradeResultCount) > 0
  ) {
    goScanBatches()
    return
  }
  if (primaryNextAction.value?.actionKey === WorkbenchNextActionKeyCode.START_SCAN) {
    goPrepWorkbench()
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScanOps',
    params: { examId: examId.value },
  })
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

onActivated(() => {
  if (!examId.value) {
    return
  }
  if (refreshChrome) {
    void refreshChrome()
  }
  void overviewDashboardRef.value?.reload?.()
})
</script>

<style lang="scss" scoped>
.exam-overview__loading {
  padding: var(--dp-space-4) 0;
}

.exam-overview__empty {
  padding: 20px 0;
}
</style>
