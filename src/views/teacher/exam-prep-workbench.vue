<script lang="ts" setup>
/**
 * 考试准备聚合工作台：步骤流水线为唯一信息面，ContextBar 仅保留一个主操作。
 */
import type { Component } from 'vue'
import { computed, inject, ref, watch } from 'vue'
import type {
  ExamDetailVO,
  ExamMaterialLayoutModeCode,
  ExamPrintSourceModeCode,
} from '@/apis/mark/exam'
import { EXAM_PRINT_SOURCE_MODE_LABEL, getExamDetail, saveMaterialLayout } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { WorkbenchStageStatus } from '@/types/workbench'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import { buildPrepStepCards } from '@/utils/exam-prep-step-ui'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FilePdfOutlined from '@ant-design/icons-vue/FilePdfOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import message from 'ant-design-vue/es/message'
import { useRouter } from 'vue-router'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { WORKSPACE_STAGE_STATUS_TONE } from '@/constants/mark-workspace-nav'
import { showUserError } from '@/utils/error-handler'
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

const printSourceOptions = (
  Object.entries(EXAM_PRINT_SOURCE_MODE_LABEL) as Array<[ExamPrintSourceModeCode, string]>
).map(([value, label]) => ({ value, label }))

function resolveIcon(key: string): Component {
  return ICON_MAP[key] ?? ProfileOutlined
}

const router = useRouter()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { selectedExamId } = useMarkExamContext()

const detail = ref<ExamDetailVO | null>(null)
const detailLoading = ref(false)
const layoutSaving = ref(false)
const draftLayoutMode = ref<ExamMaterialLayoutModeCode | undefined>()
const draftPrintSource = ref<ExamPrintSourceModeCode | undefined>()

const snapshot = computed(() => workbenchContext?.snapshot.value ?? null)
const nextActions = computed(() => snapshot.value?.nextActions ?? [])
const markingProgress = computed(
  () => workbenchContext?.markingProgress?.value ?? snapshot.value?.markingProgress ?? null,
)
const prepBlockingReasons = computed(() => snapshot.value?.prepBlockingReasons ?? [])

const startScanAction = computed(() => findWorkbenchNextAction(nextActions.value, 'START_SCAN'))
const enterReviewAction = computed(() => findWorkbenchNextAction(nextActions.value, 'ENTER_REVIEW'))

const scanEntryEnabled = computed(() =>
  canStartScanRegistration(prepBlockingReasons.value, nextActions.value),
)
const scanEntryDisabledReason = computed(
  () =>
    resolveNextActionDisabledReason(nextActions.value, 'START_SCAN') ??
    prepBlockingReasons.value[0],
)
const reviewEntryEnabled = computed(() =>
  canEnterReviewBatch(nextActions.value, markingProgress.value),
)

const prepSteps = computed<PrepStepCard[]>(() => {
  const backendSteps = snapshot.value?.prepSteps
  if (!backendSteps?.length) {
    return []
  }
  const d = detail.value
  if (!d) {
    return backendSteps.map((step) => ({
      key: step.key,
      title: step.title,
      description: step.statusText,
      status: step.status,
      statusText: step.statusText,
      routeName: 'TeacherExamWorkspacePrep',
      primaryAction: step.status === 'completed' ? '查看' : '前往配置',
      advisoryReason: step.advisoryReason ?? undefined,
    }))
  }
  return buildPrepStepCards(backendSteps, d)
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

const followUpPrepSteps = computed(() =>
  prepSteps.value.filter((step) => step.key !== 'materialLayout'),
)

const prepProgressPercent = computed(() => {
  if (prepSteps.value.length === 0) {
    return 0
  }
  return Math.round((completedPrepCount.value / prepSteps.value.length) * 100)
})

function prepStepButtonVariant(step: PrepStepCard): 'primary' | 'outline' {
  if (step.status === 'completed') return 'outline'
  return firstPendingPrepStep.value?.key === step.key ? 'primary' : 'outline'
}

const prepStatusTag = computed((): { tone: BadgeTone; label: string } => {
  if (prepBlockingReasons.value.length > 0) {
    return { tone: 'orange', label: '扫描未解锁' }
  }
  if (!detail.value?.materialLayoutMode) {
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
      tooltip: undefined as string | undefined,
      handler: goScanEntry,
      loading: false,
    }
  }
  if (layoutDirty.value && !layoutModeLocked.value && draftLayoutMode.value) {
    return {
      label: '保存制卷形态',
      disabled: false,
      tooltip: undefined as string | undefined,
      handler: handleSaveLayoutMode,
      loading: layoutSaving.value,
    }
  }
  const step = firstPendingPrepStep.value
  if (step && step.key !== 'materialLayout') {
    return {
      label: step.primaryAction,
      disabled: !detail.value?.materialLayoutMode,
      tooltip: !detail.value?.materialLayoutMode ? '请先保存制卷形态' : undefined,
      handler: goFirstPendingPrepStep,
      loading: false,
    }
  }
  return null
})

async function loadDetail(examId: string | undefined) {
  if (!examId) {
    detail.value = null
    return
  }
  detailLoading.value = true
  try {
    detail.value = await getExamDetail(examId)
    draftLayoutMode.value = detail.value.materialLayoutMode
    draftPrintSource.value = detail.value.printSourceMode
  } catch (error) {
    detail.value = null
    showUserError(error, '考试准备信息加载失败')
  } finally {
    detailLoading.value = false
  }
}

const layoutModeLocked = computed(() => detail.value?.layoutModeLocked === true)
const showPrintSource = computed(() => draftLayoutMode.value === 'FULL_PAPER')

const layoutDirty = computed(() => {
  const d = detail.value
  if (!d) return false
  return (
    draftLayoutMode.value !== d.materialLayoutMode ||
    (draftLayoutMode.value === 'FULL_PAPER' && draftPrintSource.value !== d.printSourceMode)
  )
})

async function handleSaveLayoutMode() {
  if (!selectedExamId.value || !draftLayoutMode.value) return
  if (draftLayoutMode.value === 'FULL_PAPER' && !draftPrintSource.value) {
    message.warning('整卷作答需选择印刷来源')
    return
  }
  layoutSaving.value = true
  try {
    await saveMaterialLayout({
      examId: selectedExamId.value,
      materialLayoutMode: draftLayoutMode.value,
      printSourceMode: draftLayoutMode.value === 'FULL_PAPER' ? draftPrintSource.value : undefined,
    })
    message.success('制卷形态已保存')
    await loadDetail(selectedExamId.value)
    await workbenchContext?.refreshSnapshot()
  } catch (error) {
    showUserError(error, '保存制卷形态失败')
  } finally {
    layoutSaving.value = false
  }
}

function goPrepStep(step: PrepStepCard) {
  if (!selectedExamId.value) return
  if (step.key === 'materialLayout') return
  void router.push({ name: step.routeName, params: { examId: selectedExamId.value } })
}

function goFirstPendingPrepStep() {
  const step = firstPendingPrepStep.value
  if (!step || !selectedExamId.value) return
  if (step.key === 'materialLayout') {
    return
  }
  void router.push({ name: step.routeName, params: { examId: selectedExamId.value } })
}

function goScanEntry() {
  if (!selectedExamId.value || !startScanAction.value?.enabled) return
  const routeName = resolveNextActionRouteName(
    startScanAction.value.actionKey,
    selectedExamId.value,
    markingProgress.value?.scanAttentionCount,
  )
  void router.push({ name: routeName, params: { examId: selectedExamId.value } })
}

function goReviewEntry() {
  if (!selectedExamId.value || !enterReviewAction.value?.enabled) return
  const routeName = resolveNextActionRouteName(
    enterReviewAction.value.actionKey,
    selectedExamId.value,
    markingProgress.value?.scanAttentionCount,
  )
  void router.push({ name: routeName, params: { examId: selectedExamId.value } })
}

watch(
  selectedExamId,
  (next) => {
    if (next) {
      void loadDetail(next)
    } else {
      detail.value = null
    }
  },
  { immediate: true },
)
</script>

<template>
  <UiEmpty v-if="!selectedExamId" description="请选择考试" class="exam-prep__empty" />

  <StageWorkbenchShell v-else>
    <template #context>
      <ContextBar layout="workbench" show-title title="考试准备">
        <template #status>
          <UiTag :tone="prepStatusTag.tone" size="sm">{{ prepStatusTag.label }}</UiTag>
        </template>
        <template #actions>
          <UiButton v-if="reviewEntryEnabled" size="sm" variant="outline" @click="goReviewEntry">
            <template #icon><EditOutlined /></template>
            {{ enterReviewAction?.label ?? '进入阅卷复核' }}
          </UiButton>
          <a-tooltip
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
          </a-tooltip>
        </template>
      </ContextBar>
    </template>

    <template v-if="prepSteps.length > 0" #rail>
      <div
        class="exam-prep__progress"
        role="progressbar"
        :aria-valuenow="prepProgressPercent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="exam-prep__progress-track">
          <div class="exam-prep__progress-fill" :style="{ width: `${prepProgressPercent}%` }" />
        </div>
        <ol class="exam-prep__progress-steps">
          <li
            v-for="(step, index) in prepSteps"
            :key="step.key"
            class="exam-prep__progress-step"
            :class="[
              `exam-prep__progress-step--${step.status}`,
              { 'exam-prep__progress-step--current': firstPendingPrepStep?.key === step.key },
            ]"
          >
            <span class="exam-prep__progress-index">{{ index + 1 }}</span>
            <span class="exam-prep__progress-label">{{ step.title }}</span>
          </li>
        </ol>
      </div>
    </template>

    <a-spin :spinning="detailLoading || (workbenchContext?.loading.value && !snapshot)">
      <UiAlertStrip
        v-if="prepBlockingReasons.length > 0"
        tone="warning"
        :description="prepBlockingReasons.join('；')"
        dense
        class="exam-prep__blocking-strip"
      />

      <UiEmpty
        v-if="!snapshot?.prepSteps?.length && !detailLoading"
        description="准备诊断加载失败，请刷新后重试"
      />

      <section v-else class="exam-prep__pipeline">
        <UiCard
          v-if="materialLayoutStep"
          class="exam-prep__step exam-prep__step--layout"
          :class="`exam-prep__step--${materialLayoutStep.status}`"
        >
          <template #title>
            <span class="exam-prep__step-index">1</span>
            <component :is="resolveIcon(materialLayoutStep.key)" />
            <span>{{ materialLayoutStep.title }}</span>
            <UiBadge :tone="resolveTone(materialLayoutStep.status)">
              {{ materialLayoutStep.statusText }}
            </UiBadge>
          </template>
          <p class="exam-prep__desc">{{ materialLayoutStep.description }}</p>
          <div class="exam-prep__mode-options">
            <button
              type="button"
              class="exam-prep__mode-option"
              :class="{ 'exam-prep__mode-option--active': draftLayoutMode === 'ANSWER_SHEET' }"
              :disabled="layoutModeLocked"
              @click="draftLayoutMode = 'ANSWER_SHEET'"
            >
              <span class="exam-prep__mode-option-title">答卷页模式</span>
              <span class="exam-prep__mode-option-desc">
                适合外部试卷或答题卡；后续处理身份绑定、题目区域与成绩确认。
              </span>
            </button>
            <button
              type="button"
              class="exam-prep__mode-option"
              :class="{ 'exam-prep__mode-option--active': draftLayoutMode === 'FULL_PAPER' }"
              :disabled="layoutModeLocked"
              @click="draftLayoutMode = 'FULL_PAPER'"
            >
              <span class="exam-prep__mode-option-title">整卷模式</span>
              <span class="exam-prep__mode-option-desc">
                使用整卷 PDF 母版，配置身份区与客观题区，适合系统拆页与印刷包。
              </span>
            </button>
          </div>
          <a-form
            v-if="draftLayoutMode === 'FULL_PAPER'"
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
            <p v-else-if="!detail?.materialLayoutMode" class="exam-prep__hint">
              保存形态后解锁名册、制卷设计与印刷包配置
            </p>
          </div>
          <p v-if="materialLayoutStep.advisoryReason" class="exam-prep__advisory">
            {{ materialLayoutStep.advisoryReason }}
          </p>
        </UiCard>

        <div v-if="followUpPrepSteps.length > 0" class="exam-prep__cards">
          <UiCard
            v-for="(step, index) in followUpPrepSteps"
            :key="step.key"
            class="exam-prep__step"
            :class="[
              `exam-prep__step--${step.status}`,
              { 'exam-prep__step--locked': !detail?.materialLayoutMode },
              { 'exam-prep__step--focus': firstPendingPrepStep?.key === step.key },
            ]"
          >
            <template #title>
              <span class="exam-prep__step-index">{{ index + 2 }}</span>
              <component :is="resolveIcon(step.key)" />
              <span>{{ step.title }}</span>
              <UiBadge :tone="resolveTone(step.status)">{{ step.statusText }}</UiBadge>
            </template>
            <div class="exam-prep__card-body">
              <p class="exam-prep__desc">{{ step.description }}</p>
              <UiButton
                :variant="prepStepButtonVariant(step)"
                size="sm"
                :disabled="!detail?.materialLayoutMode"
                @click="goPrepStep(step)"
              >
                {{ step.primaryAction }}
              </UiButton>
              <p v-if="step.advisoryReason" class="exam-prep__advisory">
                {{ step.advisoryReason }}
              </p>
            </div>
          </UiCard>
        </div>
      </section>
    </a-spin>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.exam-prep {
  &__empty {
    margin-top: 32px;
  }
  &__progress {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 4px;
  }
  &__progress-track {
    height: 4px;
    border-radius: 2px;
    background: var(--ant-color-fill-quaternary, #f0f0f0);
    overflow: hidden;
  }
  &__progress-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--ant-color-primary, #1677ff);
    transition: width 0.25s ease;
  }
  &__progress-steps {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  &__progress-step {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
    &--completed {
      color: var(--ant-color-success, #16a34a);
    }
    &--warning,
    &--active {
      color: var(--ant-color-warning, #d97706);
    }
    &--current {
      font-weight: 600;
      color: var(--ant-color-primary, #1677ff);
    }
  }
  &__progress-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
    background: var(--ant-color-fill-quaternary, #f0f0f0);
  }
  &__progress-step--completed &__progress-index {
    background: var(--ant-color-success-bg, #dcfce7);
    color: var(--ant-color-success, #16a34a);
  }
  &__progress-step--current &__progress-index {
    background: var(--ant-color-primary-bg, #eff6ff);
    color: var(--ant-color-primary, #1677ff);
  }
  &__blocking-strip {
    margin-bottom: 12px;
  }
  &__pipeline {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  &__step-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
    background: var(--ant-color-fill-quaternary);
    color: var(--ant-color-text-secondary);
    flex-shrink: 0;
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
      border-color: var(--ant-color-primary, #2563eb);
      background: var(--dp-surface-subtle, #f8fafc);
    }
    &:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }
    &--active {
      border-color: var(--ant-color-primary, #2563eb);
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
  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    align-items: stretch;
  }
  &__step {
    transition: border-color 0.2s ease;
    &--warning {
      border-color: var(--ant-color-warning-border, #fcd34d);
    }
    &--completed {
      border-color: var(--dp-green-200, #bbf7d0);
    }
    &--locked {
      opacity: 0.72;
    }
    &--focus {
      border-color: var(--ant-color-primary, #1677ff);
    }
  }
  &__card-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }
  &__desc {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dp-text-muted, #64748b);
  }
  &__advisory {
    margin: 0;
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ant-color-warning, #d97706);
    background: var(--ant-color-warning-bg, #fffbeb);
    border-radius: 6px;
  }
}

@media (max-width: 640px) {
  .exam-prep {
    &__mode-options {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
