<script lang="ts" setup>
/**
 * 考试准备聚合工作台：原型对齐 — ContextBar 考试名、Signal 五 KPI、信息双栏、横向步骤流水线、制卷形态配置。
 */
import type { Component } from 'vue'
import type { ExamPrintSourceModeCode } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric, WorkbenchStageStatus } from '@/types/workbench'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FilePdfOutlined from '@ant-design/icons-vue/FilePdfOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import message from 'ant-design-vue/es/message'
import { computed, inject, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_PRINT_SOURCE_MODE_OPTIONS, ExamMaterialLayoutModeCode, saveMaterialLayout } from '@/apis/mark/exam'
import { loadExamLayoutDesign } from '@/apis/mark/exam-layout-design'
import { WorkbenchNextActionKeyCode } from '@/apis/mark/exam-progress'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamPrepInfoPanels from '@/components/workbench/ExamPrepInfoPanels.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import PrepStepPipelineRow from '@/components/workbench/PrepStepPipelineRow.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { WORKSPACE_STAGE_STATUS_TONE } from '@/constants/mark-workspace-nav'
import { showUserError } from '@/utils/error-handler'
import { buildPrepStepCards } from '@/utils/exam-prep-step-ui'
import {
  canEnterReviewBatch,
  canStartScanRegistration,
  findWorkbenchNextAction,
  resolveNextActionDisabledReason,
  resolveNextActionRouteName,
} from '@/utils/exam-workspace-entry-gates'
import { strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamPrepWorkbench' })

const ICON_MAP: Record<string, Component> = {
  materialLayout: ContainerOutlined,
  candidateRoster: TeamOutlined,
  paperTemplate: ProfileOutlined,
  layoutDesign: FilePdfOutlined,
  printPackage: ContainerOutlined,
}

function resolveTone(status: WorkbenchStageStatus): BadgeTone {
  return strictEnumTone(WORKSPACE_STAGE_STATUS_TONE, status, '考试准备阶段状态')
}

function resolveIcon(key: string): Component {
  return ICON_MAP[key] ?? ProfileOutlined
}

const printSourceOptions = EXAM_PRINT_SOURCE_MODE_OPTIONS

const router = useRouter()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { selectedExamId } = useMarkExamContext()
const {
  contextBarTitle,
  contextBarSubtitle,
  examStatusLabel,
  examStatusTone,
  examDetail,
  examDetailLoading,
} = useExamJourneyContextBar('考试准备')

const layoutSaving = ref(false)
const draftLayoutMode = ref<ExamMaterialLayoutModeCode | undefined>()
const draftPrintSource = ref<ExamPrintSourceModeCode | undefined>()
const examFullScore = ref<number | null>(null)
const layoutSectionRef = ref<HTMLElement | null>(null)

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

const prepProgressPercent = computed(() => {
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
  const metrics: SignalMetric[] = [
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
  return metrics
})

const prepStatusTag = computed((): { tone: BadgeTone, label: string } => {
  if (prepBlockingReasons.value.length > 0) {
    return { tone: 'orange', label: '扫描未解锁' }
  }
  if (!examDetail.value?.materialLayoutMode) {
    return { tone: 'orange', label: '待保存形态' }
  }
  if (scanEntryEnabled.value) {
    return { tone: 'green', label: '可开始扫描' }
  }
  return { tone: 'gray', label: `${completedPrepCount.value}/${prepSteps.value.length}` }
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
    || (
      draftLayoutMode.value === ExamMaterialLayoutModeCode.FULL_PAPER
      && draftPrintSource.value !== detail.printSourceMode
    )
  )
})

const pageLoading = computed(
  () =>
    examDetailLoading.value
    || (workbenchContext?.loading.value && !snapshot.value),
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
      printSourceMode: draftLayoutMode.value === ExamMaterialLayoutModeCode.FULL_PAPER
        ? draftPrintSource.value
        : undefined,
    })
    message.success('制卷形态已保存')
    await workbenchContext?.refreshChrome?.()
    await loadExamFullScore(selectedExamId.value)
  } catch (error) {
    showUserError(error, '保存制卷形态失败')
  } finally {
    layoutSaving.value = false
  }
}

function goPrepStep(step: PrepStepCard): void {
  if (!selectedExamId.value) {
    return
  }
  if (step.key === 'materialLayout') {
    layoutSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }
  if (!examDetail.value?.materialLayoutMode) {
    return
  }
  void router.push({ name: step.routeName, params: { examId: selectedExamId.value } })
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
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="contextBarSubtitle"
      >
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <UiTag :tone="prepStatusTag.tone" size="sm">{{ prepStatusTag.label }}</UiTag>
        </template>
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
      </ContextBar>
    </template>

    <template v-if="prepSignalMetrics.length > 0" #signal>
      <SignalBand variant="tiles" compact :metrics="prepSignalMetrics" />
    </template>

    <ExamWorkspaceJourneySubNav />

    <UiSkeletonState v-if="pageLoading" variant="card" compact />

    <template v-else>
      <UiAlertStrip
        v-if="prepBlockingReasons.length > 0"
        tone="warning"
        title="考试准备硬阻断"
        :description="prepBlockingReasons.join('；')"
        dense
        class="exam-prep__blocking-strip"
      />

      <UiEmpty
        v-if="!snapshot?.prepSteps?.length"
        description="准备诊断加载失败，请刷新后重试"
      />

      <template v-else-if="examDetail && prepSteps.length > 0">
        <ExamPrepInfoPanels :detail="examDetail" :exam-full-score="examFullScore" class="exam-prep__info" />

        <PrepStepPipelineRow
          class="exam-prep__pipeline-row"
          :steps="prepSteps"
          :current-step-key="firstPendingPrepStep?.key"
          :locked="!examDetail.materialLayoutMode"
          @select="goPrepStep"
        />

        <WorkbenchSurfaceCard
          v-if="materialLayoutStep"
          class="exam-prep__layout"
          :class="`exam-prep__layout--${materialLayoutStep.status}`"
        >
          <template #head>
            <div class="exam-prep__step-head">
              <component :is="resolveIcon(materialLayoutStep.key)" />
              <span class="exam-prep__step-title">{{ materialLayoutStep.title }}</span>
              <UiTag :tone="resolveTone(materialLayoutStep.status)" size="sm">
                {{ materialLayoutStep.statusText }}
              </UiTag>
            </div>
          </template>
          <div ref="layoutSectionRef">
            <p class="exam-prep__desc">{{ materialLayoutStep.description }}</p>
            <div class="exam-prep__mode-options">
              <button
                type="button"
                class="exam-prep__mode-option"
                :class="{ 'exam-prep__mode-option--active': draftLayoutMode === ExamMaterialLayoutModeCode.ANSWER_SHEET }"
                :disabled="layoutModeLocked"
                @click="draftLayoutMode = ExamMaterialLayoutModeCode.ANSWER_SHEET"
              >
                <span class="exam-prep__mode-option-title">答卷页模式</span>
                <span class="exam-prep__mode-option-desc">
                  适合外部试卷或答题卡；后续处理身份绑定、题目区域与成绩确认。
                </span>
              </button>
              <button
                type="button"
                class="exam-prep__mode-option"
                :class="{ 'exam-prep__mode-option--active': draftLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER }"
                :disabled="layoutModeLocked"
                @click="draftLayoutMode = ExamMaterialLayoutModeCode.FULL_PAPER"
              >
                <span class="exam-prep__mode-option-title">整卷模式</span>
                <span class="exam-prep__mode-option-desc">
                  使用整卷 PDF 母版，配置身份区与客观题区，适合系统拆页与印刷包。
                </span>
              </button>
            </div>
            <a-form
              v-if="draftLayoutMode === ExamMaterialLayoutModeCode.FULL_PAPER"
              layout="inline"
              class="exam-prep__print-form"
            >
              <a-form-item label="印刷来源">
                <a-select
                  v-model:value="draftPrintSource"
                  :disabled="layoutModeLocked"
                  placeholder="选择印刷来源"
                  :options="printSourceOptions"
                  style="width: 200px"
                />
              </a-form-item>
            </a-form>
            <div class="exam-prep__layout-actions">
              <UiButton
                size="sm"
                :variant="layoutDirty && !layoutModeLocked ? 'primary' : 'outline'"
                :disabled="!draftLayoutMode || layoutModeLocked || !layoutDirty"
                :loading="layoutSaving"
                @click="handleSaveLayoutMode"
              >
                保存制卷形态
              </UiButton>
              <p v-if="layoutModeLocked" class="exam-prep__hint">已开印或已扫描，制卷形态不可修改</p>
              <p v-else-if="!examDetail.materialLayoutMode" class="exam-prep__hint">
                保存形态后解锁名册、制卷设计与印刷包配置
              </p>
            </div>
            <p v-if="materialLayoutStep.advisoryReason" class="exam-prep__advisory">
              {{ materialLayoutStep.advisoryReason }}
            </p>
          </div>
        </WorkbenchSurfaceCard>
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
  &__pipeline-row,
  &__layout {
    margin-bottom: 16px;
  }

  &__step-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }

  &__step-title {
    font-size: 16px;
    font-weight: var(--dp-font-weight-title, 600);
    line-height: 1.5;
  }

  &__mode-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 12px 0;
  }

  &__mode-option {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 88px;
    padding: 12px 16px;
    text-align: left;
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;

    &:hover:not(:disabled) {
      border-color: var(--ant-color-primary, #1677ff);
      background: var(--dp-surface-subtle, #f8fafc);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    &--active {
      border-color: var(--ant-color-primary, #1677ff);
      background: var(--ant-color-primary-bg, #eff6ff);
    }
  }

  &__mode-option-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__mode-option-desc {
    font-size: 13px;
    line-height: 1.5;
    color: var(--dp-text-secondary, #475569);
  }

  &__print-form {
    margin-bottom: 8px;
  }

  &__layout-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__hint {
    margin: 0;
    font-size: 13px;
    color: var(--dp-text-muted, #64748b);
  }

  &__desc {
    margin: 0 0 8px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dp-text-muted, #64748b);
  }

  &__advisory {
    margin: 8px 0 0;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ant-color-warning, #d97706);
    background: var(--ant-color-warning-bg, #fffbeb);
    border-radius: 6px;
  }
}

@media (max-width: 640px) {
  .exam-prep__mode-options {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
