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
          <UiTag v-if="showConfidentialTag === true" tone="purple" size="sm">涉密考试</UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="canEditExam === true"
            size="sm"
            variant="outline"
            @click="openEditDrawer"
          >
            编辑考试
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiAlertStrip
      v-if="detailError"
      tone="error"
      title="考试详情加载失败"
      :description="detailError"
      dense
    />

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
import type { ExamWorkbenchPrepStepResponse } from '@/apis/mark/exam-progress'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
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
import { resolvePrepStepRouteLocation } from '@/utils/exam-prep-step-ui'
import { navigateExamWorkspaceRoute } from '@/utils/exam-workspace-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ExamWorkbenchOverviewDashboard from '@/views/teacher/exam-workspace/ExamWorkbenchOverviewDashboard.vue'

defineOptions({ name: 'TeacherExamWorkspaceOverview' })

// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
const router = useRouter()
const {
  examId,
  examDetail,
  detailError,
  snapshot,
  refreshChrome,
} = useMarkWorkbenchContext()

const {
  contextBarTitle,
  contextBarSubtitle,
  examStatusLabel: chromeExamStatusLabel,
  examStatusTone: chromeExamStatusTone,
} = useExamJourneyContextBar('考试概览', 'hub')

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
  if (!examId.value || canEditExam.value !== true) return
  editDrawerOpen.value = true
}

async function handleExamEdited(): Promise<void> {
  if (refreshChrome) {
    await refreshChrome()
  }
  await overviewDashboardRef.value?.reload?.()
}

const {
  recommendedPrimaryLabel,
  recommendedSecondaryLabel,
  recommendedSecondaryVisible,
  runRecommendedPrimaryAction,
  runRecommendedSecondaryAction,
} = useExamWorkbenchRecommendedActions({
  router,
  examId,
  workspaceRouteName: computed(() => snapshot.value?.workspaceRouteName),
  enterActionLabel: computed(() => snapshot.value?.enterActionLabel),
  secondaryWorkspaceRouteName: computed(() => snapshot.value?.secondaryWorkspaceRouteName),
  secondaryEnterActionLabel: computed(() => snapshot.value?.secondaryEnterActionLabel),
})

function examKindTone(examKind: ExamDetailResponse['examKind']): BadgeTone {
  return strictEnumTone(EXAM_KIND_TONE, examKind, '考试性质')
}

function examKindLabel(exam: ExamDetailResponse): string {
  if (exam.examKindMessage?.trim()) return exam.examKindMessage.trim()
  return strictEnumLabel(ExamKindDescription, exam.examKind, '考试性质')
}

function handlePrepStepNavigate(step: ExamWorkbenchPrepStepResponse): void {
  const routeName = step.workspaceRouteName?.trim()
  if (!detail.value || routeName !== 'TeacherExamWorkspaceLayoutDesigner') {
    navigateExamWorkspaceRoute(
      router,
      routeName,
      { examId: examId.value },
      `准备步骤「${step.title}」入口`,
    )
    return
  }
  const location = resolvePrepStepRouteLocation(
    { key: step.key, routeName },
    detail.value,
  )
  navigateExamWorkspaceRoute(
    router,
    location.name,
    { examId: examId.value },
    `准备步骤「${step.title}」入口`,
    location.query,
  )
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
.exam-overview__empty {
  padding: var(--dp-space-block) 0;
}
</style>
