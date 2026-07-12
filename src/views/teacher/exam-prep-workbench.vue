<script lang="ts" setup>
/**
 * 考试准备聚合工作台：Signal 五 KPI、信息双栏、横向步骤流水线（含主操作）、制卷形态配置。
 */
import type { ExamPrintSourceModeCode } from '@/apis/mark/exam'
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type { SignalMetric } from '@/types/workbench'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import message from 'ant-design-vue/es/message'
import { computed, inject, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ExamMaterialLayoutModeCode, saveMaterialLayout } from '@/apis/mark/exam'
import { loadExamLayoutDesign } from '@/apis/mark/exam-layout-design'
import { WorkbenchNextActionKeyCode } from '@/apis/mark/exam-progress'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ExamPrepInfoPanels from '@/components/workbench/ExamPrepInfoPanels.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import MaterialLayoutConfigModal from '@/components/workbench/MaterialLayoutConfigModal.vue'
import PrepStepPipelineRow from '@/components/workbench/PrepStepPipelineRow.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { buildPrepStepCards, resolvePrepStepRouteLocation } from '@/utils/exam-prep-step-ui'
import {
  canEnterReviewBatch,
  canStartScanRegistration,
  findWorkbenchNextAction,
  resolveNextActionDisabledReason,
  resolveNextActionRouteName,
} from '@/utils/exam-workspace-entry-gates'

defineOptions({ name: 'TeacherExamPrepWorkbench' })

const router = useRouter()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { selectedExamId } = useMarkExamContext()
const { examDetail, examDetailLoading } = useExamJourneyContextBar('考试准备', 'hub')

const layoutSaving = ref(false)
const layoutModalOpen = ref(false)
const draftLayoutMode = ref<ExamMaterialLayoutModeCode | undefined>()
const draftPrintSource = ref<ExamPrintSourceModeCode | undefined>()
const examFullScore = ref<number | null>(null)

const snapshot = computed(() => workbenchContext?.snapshot.value ?? null)
const nextActions = computed(() => snapshot.value?.nextActions ?? [])
const markingProgress = computed(
  () => workbenchContext?.markingProgress?.value ?? snapshot.value?.markingProgress ?? null,
)
const prepBlockingReasons = computed(() => snapshot.value?.prepBlockingReasons ?? [])

const startScanAction = computed(() =>
  findWorkbenchNextAction(nextActions.value, WorkbenchNextActionKeyCode.START_SCAN),
)
const enterReviewAction = computed(() =>
  findWorkbenchNextAction(nextActions.value, WorkbenchNextActionKeyCode.ENTER_REVIEW),
)

const scanEntryEnabled = computed(() =>
  canStartScanRegistration(prepBlockingReasons.value, nextActions.value),
)
const scanEntryDisabledReason = computed(
  () =>
    resolveNextActionDisabledReason(nextActions.value, WorkbenchNextActionKeyCode.START_SCAN)
    ?? prepBlockingReasons.value[0],
)
const reviewEntryEnabled = computed(() =>
  canEnterReviewBatch(nextActions.value, markingProgress.value),
)

const prepSteps = computed<PrepStepCard[]>(() => {
  const backendSteps = snapshot.value?.prepSteps
  const detail = examDetail.value
  if (!backendSteps?.length || !detail) {
    return []
  }
  return buildPrepStepCards(backendSteps, detail)
})

const completedPrepCount = computed(
  () => prepSteps.value.filter((step) => step.status === 'completed').length,
)

const firstPendingPrepStep = computed(
  () => prepSteps.value.find((item) => item.status !== 'completed') ?? null,
)

const materialLayoutStep = computed(
  () => prepSteps.value.find((step) => step.key === 'materialLayout') ?? null,
)
computed(() => {
  if (prepSteps.value.length === 0) {
    return 0
  }
  return Math.round((completedPrepCount.value / prepSteps.value.length) * 100)
})
const prepSignalMetrics = computed((): SignalMetric[] => {
  const detail = examDetail.value
  const total = prepSteps.value.length
  if (!detail) {
    return []
  }

  return [
    {
      key: 'candidates',
      label: '考生数',
      value: detail.candidateCount,
      tone: detail.candidateCount > 0 ? 'blue' : 'orange',
    },
    {
      key: 'questions',
      label: '题目数',
      value: detail.questionCount,
      tone: detail.questionCount > 0 ? 'green' : 'orange',
    },
    {
      key: 'pages',
      label: '页数',
      value: detail.totalPages ?? 0,
      tone: (detail.totalPages ?? 0) > 0 ? 'blue' : 'gray',
    },
    {
      key: 'full-score',
      label: '满分',
      value: examFullScore.value ?? '—',
      tone: examFullScore.value != null ? 'gray' : 'orange',
    },
    {
      key: 'progress',
      label: '准备进度',
      value: `${completedPrepCount.value}/${total}`,
      tone: completedPrepCount.value >= total && total > 0 ? 'green' : 'blue',
    },
  ]
})

const contextPrimaryAction = computed(() => {
  if (scanEntryEnabled.value) {
    return {
      label: startScanAction.value?.label ?? '开始扫描录入',
      disabled: false,
      tooltip: undefined,
      handler: goScanEntry,
      loading: false,
    }
  }
  if (layoutDirty.value && !layoutModeLocked.value && draftLayoutMode.value) {
    return {
      label: '保存制卷形态',
      disabled: false,
      tooltip: undefined,
      handler: handleSaveLayoutMode,
      loading: layoutSaving.value,
    }
  }
  const step = firstPendingPrepStep.value
  if (step && step.key !== 'materialLayout') {
    return {
      label: step.primaryAction,
      disabled: !examDetail.value?.materialLayoutMode,
      tooltip: !examDetail.value?.materialLayoutMode ? '请先保存制卷形态' : undefined,
      handler: goFirstPendingPrepStep,
      loading: false,
    }
  }
  return null
})

const layoutModeLocked = computed(() => examDetail.value?.layoutModeLocked === true)
const layoutDirty = computed(() => {
  const detail = examDetail.value
  if (!detail) {
    return false
  }
  return (
    draftLayoutMode.value !== detail.materialLayoutMode
    || (draftLayoutMode.value === ExamMaterialLayoutModeCode.FULL_PAPER
      && draftPrintSource.value !== detail.printSourceMode)
  )
})

const pageLoading = computed(
  () => examDetailLoading.value || (workbenchContext?.loading.value && !snapshot.value),
)

async function loadExamFullScore(examId: string): Promise<void> {
  try {
    const response = await loadExamLayoutDesign({ examId })
    const questions = response.document?.questions ?? []
    if (questions.length === 0) {
      examFullScore.value = null
      return
    }
    examFullScore.value = questions.reduce((sum, question) => sum + (question.fullScore ?? 0), 0)
  } catch {
    examFullScore.value = null
  }
}

async function handleSaveLayoutMode(): Promise<void> {
  if (!selectedExamId.value || !draftLayoutMode.value) {
    return
  }
  if (draftLayoutMode.value === ExamMaterialLayoutModeCode.FULL_PAPER && !draftPrintSource.value) {
    message.warning('整卷作答需选择印刷来源')
    return
  }
  layoutSaving.value = true
  try {
    await saveMaterialLayout({
      examId: selectedExamId.value,
      materialLayoutMode: draftLayoutMode.value,
      printSourceMode:
        draftLayoutMode.value === ExamMaterialLayoutModeCode.FULL_PAPER
          ? draftPrintSource.value
          : undefined,
    })
    message.success('制卷形态已保存')
    layoutModalOpen.value = false
    await workbenchContext?.refreshChrome?.()
    await loadExamFullScore(selectedExamId.value)
  } catch (error) {
    showUserError(error, '保存制卷形态失败')
  } finally {
    layoutSaving.value = false
  }
}

async function goPrepStep(step: PrepStepCard): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  if (step.key === 'materialLayout') {
    layoutModalOpen.value = true
    return
  }
  if (!examDetail.value?.materialLayoutMode) {
    layoutModalOpen.value = true
    return
  }
  let layoutDocument: ExamLayoutDocument | null = null
  if (step.routeName === 'TeacherExamWorkspaceLayoutDesigner') {
    try {
      const response = await loadExamLayoutDesign({ examId: selectedExamId.value })
      layoutDocument = response.document ?? null
    } catch (error) {
      showUserError(error, '加载制卷设计状态失败，无法跳转')
      return
    }
  }
  const location = resolvePrepStepRouteLocation(step.key, examDetail.value, layoutDocument)
  void router.push({
    name: location.name,
    params: { examId: selectedExamId.value },
    query: location.query,
  })
}

function goFirstPendingPrepStep(): void {
  const step = firstPendingPrepStep.value
  if (!step) {
    return
  }
  goPrepStep(step)
}

function goScanEntry(): void {
  if (!selectedExamId.value || !startScanAction.value?.enabled) {
    return
  }
  const routeName = resolveNextActionRouteName(
    startScanAction.value.actionKey,
    selectedExamId.value,
    markingProgress.value?.scanAttentionCount,
  )
  void router.push({ name: routeName, params: { examId: selectedExamId.value } })
}

function goReviewEntry(): void {
  if (!selectedExamId.value || !enterReviewAction.value?.enabled) {
    return
  }
  const routeName = resolveNextActionRouteName(
    enterReviewAction.value.actionKey,
    selectedExamId.value,
    markingProgress.value?.scanAttentionCount,
  )
  void router.push({ name: routeName, params: { examId: selectedExamId.value } })
}

watch(
  examDetail,
  (detail) => {
    if (!detail) {
      draftLayoutMode.value = undefined
      draftPrintSource.value = undefined
      return
    }
    draftLayoutMode.value = detail.materialLayoutMode
    draftPrintSource.value = detail.printSourceMode
  },
  { immediate: true },
)

watch(
  selectedExamId,
  (examId) => {
    examFullScore.value = null
    if (examId) {
      void loadExamFullScore(examId)
    }
  },
  { immediate: true },
)
</script>

<template>
  <UiEmpty v-if="!selectedExamId" description="请选择考试" class="exam-prep__empty" />

  <StageWorkbenchShell v-else>
    <template v-if="prepSignalMetrics.length > 0" #signal>
      <SignalBand variant="tiles" compact :metrics="prepSignalMetrics" />
    </template>

    <ExamWorkspaceJourneySubNav />

    <UiSkeletonState v-if="pageLoading" variant="card" compact />

    <template v-else>
      <UiEmpty
        v-if="!snapshot?.prepSteps?.length"
        description="准备诊断未加载完成，请返回考试列表后重新进入"
      />

      <template v-else-if="examDetail && prepSteps.length > 0">
        <ExamPrepInfoPanels
          :detail="examDetail"
          :exam-full-score="examFullScore"
          class="exam-prep__info"
        />

        <PrepStepPipelineRow
          class="exam-prep__pipeline-row"
          :steps="prepSteps"
          :current-step-key="firstPendingPrepStep?.key"
          :locked="!examDetail.materialLayoutMode"
          @select="goPrepStep"
        >
          <template #actions>
            <UiButton v-if="reviewEntryEnabled" size="sm" variant="outline" @click="goReviewEntry">
              <template #icon><EditOutlined /></template>
              {{ enterReviewAction?.label ?? '进入阅卷复核' }}
            </UiButton>
            <a-tooltip
              :title="
                contextPrimaryAction?.tooltip
                  ?? (contextPrimaryAction?.disabled ? scanEntryDisabledReason : undefined)
              "
            >
              <UiButton
                v-if="contextPrimaryAction"
                size="sm"
                variant="primary"
                :disabled="contextPrimaryAction.disabled"
                :loading="contextPrimaryAction.loading"
                @click="contextPrimaryAction.handler()"
              >
                <template v-if="scanEntryEnabled" #icon><ScanOutlined /></template>
                {{ contextPrimaryAction.label }}
              </UiButton>
            </a-tooltip>
          </template>
        </PrepStepPipelineRow>

        <MaterialLayoutConfigModal
          v-if="materialLayoutStep"
          v-model:open="layoutModalOpen"
          v-model:draft-layout-mode="draftLayoutMode"
          v-model:draft-print-source="draftPrintSource"
          :layout-mode-locked="layoutModeLocked"
          :layout-dirty="layoutDirty"
          :layout-saving="layoutSaving"
          :material-layout-saved="Boolean(examDetail.materialLayoutMode)"
          :description="materialLayoutStep.description"
          :advisory-reason="materialLayoutStep.advisoryReason"
          @save="handleSaveLayoutMode"
        />
      </template>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.exam-prep {
  &__empty {
    margin-top: 32px;
  }

  &__blocking-strip {
    margin-bottom: 16px;
  }

  &__info,
  &__pipeline-row {
    margin-bottom: 16px;
  }
}
</style>
