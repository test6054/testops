<script lang="ts" setup>
/**
 * 考试准备聚合工作台：Signal 五 KPI、信息双栏、横向步骤流水线（含主操作）、制卷形态配置。
 */
import type { ExamPrintSourceModeCode } from '@/apis/mark/exam'
import { ExamMaterialLayoutModeCode, saveMaterialLayout } from '@/apis/mark/exam'
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { loadExamLayoutDesign } from '@/apis/mark/exam-layout-design'
import type { AnswerBookletSourceModeCode } from '@/types/enums/answer-booklet-source-mode-enum'
import type { SignalMetric } from '@/types/workbench'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import { buildPrepStepCards, resolvePrepStepRouteLocation } from '@/utils/exam-prep-step-ui'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import message from 'ant-design-vue/es/message'
import { computed, inject, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { WorkbenchNextActionKeyCode } from '@/apis/mark/exam-progress'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamPrepInfoPanels from '@/components/workbench/ExamPrepInfoPanels.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import MaterialLayoutConfigModal from '@/components/workbench/MaterialLayoutConfigModal.vue'
import PrepStepPipelineRow from '@/components/workbench/PrepStepPipelineRow.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { ExamScanMaterialScopeCode } from '@/types/enums/exam-scan-material-scope-enum'
import { ExamWorkbenchPrepStepKeyCode as PrepStepKey } from '@/types/enums/exam-workbench-prep-step-key-enum'
import { showUserError } from '@/utils/error-handler'
import {
  canEnterReviewBatch,
  canStartScanRegistration,
  findWorkbenchNextAction,
  resolveNextActionDisabledReason,
  resolveWorkbenchNextActionRouteName,
} from '@/utils/exam-workspace-entry-gates'

defineOptions({ name: 'TeacherExamPrepWorkbench' })

const router = useRouter()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { selectedExamId } = useMarkExamContext()
const { examDetail, examDetailLoading } = useExamJourneyContextBar('考试准备', 'hub')
/** MVR-326/354：仅认 BE examDetail.canManageOwnerExamPrepWrites===true（主考+ACTIVE） */
const canManageOwnerExamPrepWrites = computed(
  () => examDetail.value?.canManageOwnerExamPrepWrites === true,
)

const layoutSaving = ref(false)
const layoutModalOpen = ref(false)
const draftLayoutMode = ref<ExamMaterialLayoutModeCode | undefined>()
const draftPrintSource = ref<ExamPrintSourceModeCode | undefined>()
const draftScanMaterialScope = ref<ExamScanMaterialScopeCode | undefined>()
const draftAnswerBookletSourceMode = ref<AnswerBookletSourceModeCode | undefined>()
const examFullScore = ref<number | null>(null)
/** 满分加载代际：切换考试时丢弃过期 layout 响应 */
let examFullScoreLoadGeneration = 0

const snapshot = computed(() => workbenchContext?.snapshot.value ?? null)
const nextActions = computed(() => snapshot.value?.nextActions ?? [])
const markingProgress = computed(
  () => workbenchContext?.markingProgress?.value ?? snapshot.value?.markingProgress ?? null,
)
const prepAdvisoryReasons = computed(() => snapshot.value?.prepAdvisoryReasons ?? [])
const prepAdvisoryDescription = computed(() => prepAdvisoryReasons.value.join('；'))

const startScanAction = computed(() =>
  findWorkbenchNextAction(nextActions.value, WorkbenchNextActionKeyCode.START_SCAN),
)
const enterReviewAction = computed(() =>
  findWorkbenchNextAction(nextActions.value, WorkbenchNextActionKeyCode.ENTER_REVIEW),
)

const scanEntryEnabled = computed(() => canStartScanRegistration(nextActions.value))
const scanEntryDisabledReason = computed(() =>
  resolveNextActionDisabledReason(nextActions.value, WorkbenchNextActionKeyCode.START_SCAN),
)
const reviewEntryEnabled = computed(() =>
  canEnterReviewBatch(nextActions.value, markingProgress.value),
)

const prepSteps = computed<PrepStepCard[]>(() => {
  const backendSteps = snapshot.value?.prepSteps
  if (!backendSteps?.length) {
    return []
  }
  return buildPrepStepCards(backendSteps, examDetail.value)
})

const detailError = computed(() => workbenchContext?.detailError?.value ?? null)
const snapshotPrepReady = computed(() => (snapshot.value?.prepSteps?.length ?? 0) > 0)

const completedPrepCount = computed(
  () => prepSteps.value.filter((step) => step.status === 'completed').length,
)

const firstPendingPrepStep = computed(
  () => prepSteps.value.find((item) => item.status !== 'completed') ?? null,
)

const materialLayoutStep = computed(
  () => prepSteps.value.find((step) => step.key === PrepStepKey.MATERIAL_LAYOUT) ?? null,
)

/** 任务工作台标题：优先考试名。 */
const examPrepWorkbenchTitle = computed(() => examDetail.value?.examName || '考试准备')

/** 任务工作台副标题：备考进度 + 考试编号。 */
const examPrepWorkbenchSubtitle = computed(() => {
  const total = prepSteps.value.length
  const progress = total > 0 ? `已完成 ${completedPrepCount.value}/${total} 步` : '备考步骤加载中'
  const examNo = examDetail.value?.examNo
  return examNo ? `${progress} · #${examNo}` : progress
})

const prepSignalMetrics = computed((): SignalMetric[] => {
  const detail = examDetail.value
  const total = prepSteps.value.length
  if (!detail) {
    return []
  }

  const progressComplete = completedPrepCount.value >= total && total > 0
  const primary: SignalMetric = {
    key: 'progress',
    label: '准备进度',
    value: total > 0 ? `${completedPrepCount.value}/${total}` : '—',
    tone: progressComplete ? 'green' : 'blue',
    emphasis: 'primary',
    actionLabel: progressComplete ? '进入扫描' : '继续准备',
    helper: progressComplete ? '备考步骤已完成' : '按步骤完成备考',
    showProgress: total > 0,
    progress: total > 0 ? Math.round((completedPrepCount.value / total) * 100) : undefined,
  }
  const secondaryPool: SignalMetric[] = [
    {
      key: 'candidates',
      label: '考生数',
      value: detail.candidateCount,
      tone: detail.candidateCount > 0 ? 'blue' : 'orange',
      emphasis: 'secondary',
    },
    {
      key: 'questions',
      label: '题目数',
      value: detail.questionCount,
      tone: detail.questionCount > 0 ? 'green' : 'orange',
      emphasis: 'secondary',
    },
    {
      key: 'pages',
      label: '页数',
      value: detail.totalPages == null ? '—' : detail.totalPages,
      tone: detail.totalPages != null && detail.totalPages > 0 ? 'blue' : 'gray',
      emphasis: 'secondary',
    },
    {
      key: 'full-score',
      label: '满分',
      value: examFullScore.value ?? '—',
      tone: examFullScore.value != null ? 'gray' : 'orange',
      emphasis: 'secondary',
    },
  ]
  return [primary, ...secondaryPool.slice(0, 3)]
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
  // MVR-267：保存制卷形态仅主考；与 BE requireExamOwnerPermission 对齐
  if (
    canManageOwnerExamPrepWrites.value === true &&
    layoutDirty.value &&
    layoutModeLocked.value !== true &&
    draftLayoutMode.value
  ) {
    return {
      label: '保存制卷形态',
      disabled: false,
      tooltip: undefined,
      handler: handleSaveLayoutMode,
      loading: layoutSaving.value,
    }
  }
  const step = firstPendingPrepStep.value
  if (step && step.key !== PrepStepKey.MATERIAL_LAYOUT) {
    return {
      label: step.primaryAction,
      disabled: false,
      tooltip: undefined,
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
    draftLayoutMode.value !== detail.materialLayoutMode ||
    draftScanMaterialScope.value !== detail.scanMaterialScope ||
    draftAnswerBookletSourceMode.value !== detail.answerBookletSourceMode ||
    (draftLayoutMode.value === ExamMaterialLayoutModeCode.FULL_PAPER &&
      draftPrintSource.value !== detail.printSourceMode)
  )
})

const pageLoading = computed(
  () =>
    examDetailLoading.value === true ||
    (workbenchContext?.loading.value === true && !snapshot.value),
)

async function loadExamFullScore(examId: string): Promise<void> {
  const generation = ++examFullScoreLoadGeneration
  try {
    const response = await loadExamLayoutDesign({ examId })
    if (generation !== examFullScoreLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    const questions = response.document?.questions ?? []
    if (questions.length === 0) {
      examFullScore.value = null
      return
    }
    let sum = 0
    for (const question of questions) {
      if (question.fullScore == null || !Number.isFinite(question.fullScore)) {
        examFullScore.value = null
        return
      }
      sum += question.fullScore
    }
    examFullScore.value = sum
  } catch (error) {
    if (generation !== examFullScoreLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    examFullScore.value = null
    showUserError(error, '考试满分加载失败')
  }
}

async function handleSaveLayoutMode(): Promise<void> {
  if (layoutSaving.value === true) {
    return
  }
  if (canManageOwnerExamPrepWrites.value !== true) {
    return
  }
  if (!selectedExamId.value || !draftLayoutMode.value) {
    return
  }
  if (draftLayoutMode.value === ExamMaterialLayoutModeCode.FULL_PAPER && !draftPrintSource.value) {
    void message.warning('单独试卷需选择印刷来源')
    return
  }
  if (
    draftLayoutMode.value === ExamMaterialLayoutModeCode.FULL_PAPER &&
    draftScanMaterialScope.value !== ExamScanMaterialScopeCode.QUESTION_PAPER_ONLY
  ) {
    void message.warning('单独试卷只能选择仅扫描试题卷')
    return
  }
  if (!draftScanMaterialScope.value) {
    void message.warning('请选择考后实际扫描材料')
    return
  }
  if (
    draftLayoutMode.value === ExamMaterialLayoutModeCode.ANSWER_SHEET &&
    !draftAnswerBookletSourceMode.value
  ) {
    void message.warning('请选择答题纸来源')
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
      scanMaterialScope: draftScanMaterialScope.value,
      answerBookletSourceMode:
        draftLayoutMode.value === ExamMaterialLayoutModeCode.ANSWER_SHEET
          ? draftAnswerBookletSourceMode.value
          : undefined,
    })
    void message.success('制卷形态已保存')
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
  if (step.key === PrepStepKey.MATERIAL_LAYOUT) {
    if (!examDetail.value) {
      showUserError(null, '考试详情未加载，无法配置制卷形态')
      return
    }
    layoutModalOpen.value = true
    return
  }
  if (!examDetail.value) {
    void router.push({
      name: step.routeName,
      params: { examId: selectedExamId.value },
    })
    return
  }
  // 仅制卷设计器需要已保存形态；名册/印刷等步骤与开扫不依赖制卷形态
  if (
    step.routeName === 'TeacherExamWorkspaceLayoutDesigner' &&
    !examDetail.value.materialLayoutMode
  ) {
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
  const location = resolvePrepStepRouteLocation(step, examDetail.value, layoutDocument)
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
  if (!selectedExamId.value) {
    return
  }
  if (startScanAction.value?.enabled !== true) {
    showUserError(null, scanEntryDisabledReason.value ?? '扫描登记入口不可用，等待工作台合同确认')
    return
  }
  const routeName = resolveWorkbenchNextActionRouteName(startScanAction.value)
  void router.push({ name: routeName, params: { examId: selectedExamId.value } })
}

function goReviewEntry(): void {
  if (!selectedExamId.value) {
    return
  }
  if (enterReviewAction.value?.enabled !== true) {
    showUserError(null, '阅卷复核入口不可用，等待工作台合同确认')
    return
  }
  const routeName = resolveWorkbenchNextActionRouteName(enterReviewAction.value)
  void router.push({ name: routeName, params: { examId: selectedExamId.value } })
}

watch(
  examDetail,
  (detail) => {
    if (!detail) {
      draftLayoutMode.value = undefined
      draftPrintSource.value = undefined
      draftScanMaterialScope.value = undefined
      draftAnswerBookletSourceMode.value = undefined
      return
    }
    draftLayoutMode.value = detail.materialLayoutMode
    draftPrintSource.value = detail.printSourceMode
    draftScanMaterialScope.value = detail.scanMaterialScope
    draftAnswerBookletSourceMode.value = detail.answerBookletSourceMode
  },
  { immediate: true },
)

watch(
  selectedExamId,
  (examId) => {
    examFullScore.value = null
    if (!examId) {
      examFullScoreLoadGeneration += 1
      return
    }
    void loadExamFullScore(examId)
  },
  { immediate: true },
)
</script>

<template>
  <ExamSelectGateStrip v-if="!selectedExamId" class="exam-prep__empty" />

  <StageWorkbenchShell v-else>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="examPrepWorkbenchTitle"
        :subtitle="examPrepWorkbenchSubtitle"
      />
    </template>
    <template v-if="prepSignalMetrics.length > 0" #signal>
      <SignalBand layout="spotlight" compact variant="panel" :metrics="prepSignalMetrics" />
    </template>

    <ExamWorkspaceJourneySubNav />

    <UiSkeletonState v-if="pageLoading" variant="card" compact />

    <template v-else>
      <UiAlertStrip
        v-if="detailError"
        tone="warning"
        title="考试详情加载失败"
        :description="detailError"
        class="exam-prep__detail-error"
      />

      <UiEmpty
        v-if="!snapshotPrepReady"
        size="sm"
        description="准备步骤快照未加载，可离开后再进入或使用页面刷新"
      />

      <template v-else-if="prepSteps.length > 0">
        <ExamPrepInfoPanels
          v-if="examDetail"
          :detail="examDetail"
          :exam-full-score="examFullScore"
          :alert-tone="prepAdvisoryReasons.length > 0 ? 'warning' : undefined"
          :alert-title="prepAdvisoryReasons.length > 0 ? '准备项待完善' : undefined"
          :alert-description="prepAdvisoryReasons.length > 0 ? prepAdvisoryDescription : undefined"
          class="exam-prep__info"
        >
          <template v-if="prepAdvisoryReasons.length > 0" #alert-actions>
            <UiButton
              v-if="firstPendingPrepStep"
              size="sm"
              variant="outline"
              @click="goFirstPendingPrepStep"
            >
              去补齐
            </UiButton>
          </template>
        </ExamPrepInfoPanels>

        <PrepStepPipelineRow
          class="exam-prep__pipeline-row"
          :steps="prepSteps"
          :current-step-key="firstPendingPrepStep?.key"
          @select="goPrepStep"
        >
          <template #actions>
            <UiButton v-if="reviewEntryEnabled" size="sm" variant="outline" @click="goReviewEntry">
              <template #icon><EditOutlined /></template>
              {{ enterReviewAction?.label ?? '进入阅卷复核' }}
            </UiButton>
            <UiTooltip
              :title="
                contextPrimaryAction?.tooltip ??
                (contextPrimaryAction?.disabled ? scanEntryDisabledReason : undefined)
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
            </UiTooltip>
          </template>
        </PrepStepPipelineRow>

        <MaterialLayoutConfigModal
          v-if="materialLayoutStep && examDetail"
          v-model:open="layoutModalOpen"
          v-model:draft-layout-mode="draftLayoutMode"
          v-model:draft-print-source="draftPrintSource"
          v-model:draft-scan-material-scope="draftScanMaterialScope"
          v-model:draft-answer-booklet-source-mode="draftAnswerBookletSourceMode"
          :layout-mode-locked="layoutModeLocked"
          :layout-dirty="layoutDirty"
          :layout-saving="layoutSaving"
          :material-layout-saved="Boolean(examDetail.materialLayoutMode)"
          :can-manage-owner-writes="canManageOwnerExamPrepWrites"
          :description="materialLayoutStep.description"
          :advisory-reason="materialLayoutStep.advisoryReason"
          @save="handleSaveLayoutMode"
        />
      </template>
    </template>
  </StageWorkbenchShell>
</template>
