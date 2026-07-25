<template>
  <StageWorkbenchShell>
    <template v-if="snapshot" #context>
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
          <UiTag v-if="detail?.examKind" :tone="examKindTone(detail.examKind)" size="sm">
            {{ examKindLabel(detail) }}
          </UiTag>
          <UiTag v-if="showConfidentialTag" tone="purple" size="sm">涉密考试</UiTag>
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
        </template>
      </ContextBar>
      <UiAlertStrip
        v-if="detailError"
        tone="error"
        title="考试详情加载失败"
        :description="detailError"
        dense
        class="exam-overview__detail-error"
      />
    </template>

    <UiEmpty
      v-if="!examId || !snapshot"
      size="sm"
      description="考试概览暂不可用，请从考试列表重新进入"
      class="exam-overview__empty"
    />

    <ExamWorkbenchOverviewDashboard
      v-else
      ref="overviewDashboardRef"
      :exam-id="examId"
      :detail="detail"
      :recommended-primary-label="recommendedPrimaryLabel"
      :recommended-secondary-label="recommendedSecondaryLabel"
      :recommended-secondary-visible="recommendedSecondaryVisible"
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
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_KIND_TONE, ExamKindDescription, ExamStatusCode } from '@/apis/mark/exam'
import ExamEditDrawer from '@/components/mark/ExamEditDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { isExamConfidentialFlag } from '@/composables/useConfidentialWatermark'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useExamWorkbenchRecommendedActions } from '@/composables/useExamWorkbenchRecommendedActions'
import { useMarkWorkbenchContext } from '@/composables/useMarkWorkbenchContext'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { navigateExamWorkspaceRoute } from '@/utils/exam-workspace-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ExamWorkbenchOverviewDashboard from '@/views/teacher/exam-workspace/ExamWorkbenchOverviewDashboard.vue'

defineOptions({ name: 'TeacherExamWorkspaceOverview' })

const router = useRouter()
const {
  examId,
  examDetail,
  detailError,
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

const overviewDashboardRef = ref<InstanceType<typeof ExamWorkbenchOverviewDashboard> | null>(null)

const editDrawerOpen = ref(false)
const canEditExam = computed(
  () =>
    !!detail.value
    && detail.value.status !== ExamStatusCode.CLOSED
    && detail.value.canManageOwnerExamLifecycleWrites === true,
)

const showConfidentialTag = computed(
  () => isExamConfidentialFlag(detail.value?.confidential) || isExamConfidentialFlag(snapshot.value?.confidential),
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

const nextActions = computed(() => snapshot.value?.nextActions ?? [])

const {
  recommendedPrimaryLabel,
  recommendedSecondaryLabel,
  recommendedSecondaryVisible,
  runRecommendedPrimaryAction,
  runRecommendedSecondaryAction,
} = useExamWorkbenchRecommendedActions({
  router,
  examId,
  nextActions,
  markingProgress: computed(() => markingProgress?.value ?? null),
  suggestedStageKey,
  orderedStages,
})

function examKindTone(examKind: ExamDetailResponse['examKind']): BadgeTone {
  return strictEnumTone(EXAM_KIND_TONE, examKind, '考试性质')
}

function examKindLabel(exam: ExamDetailResponse): string {
  if (exam.examKindMessage?.trim()) return exam.examKindMessage.trim()
  return strictEnumLabel(ExamKindDescription, exam.examKind, '考试性质')
}

function goPrepWorkbench(): void {
  navigateExamWorkspaceRoute(
    router,
    'TeacherExamWorkspacePrep',
    { examId: examId.value },
    '准备工作台入口',
  )
}

function handlePrepStepNavigate(_stepKey: string): void {
  goPrepWorkbench()
}

function goMarkQuality(): void {
  navigateExamWorkspaceRoute(
    router,
    'TeacherExamWorkspaceMarkingQuality',
    { examId: examId.value },
    '质量概览入口',
  )
}

function handleTodoNavigate(routeName: string | undefined, targetExamId: string | undefined): void {
  navigateExamWorkspaceRoute(
    router,
    routeName,
    { examId: targetExamId ?? examId.value },
    '考试待办入口',
  )
}
</script>

<style lang="scss" scoped>
.exam-overview__detail-error {
  margin-top: var(--dp-space-component);
}

.exam-overview__empty {
  padding: var(--dp-space-block) 0;
}
</style>
