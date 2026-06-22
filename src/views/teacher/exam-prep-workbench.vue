<script lang="ts" setup>
/**
 * 考试准备聚合工作台：按制卷形态驱动前置配置步骤与待完善提示。
 */
import type { Component } from 'vue'
import type {
  ExamDetailVO,
  ExamMaterialLayoutModeCode,
  ExamPrintSourceModeCode,
  ExamStatusCode,
} from '@/apis/mark/exam'
import type { MarkingProgressVO } from '@/apis/mark/exam-progress'
import type { BadgeTone, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import type { WorkbenchStageStatus } from '@/types/workbench'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import EditOutlined from '@ant-design/icons-vue/EditOutlined'
import FilePdfOutlined from '@ant-design/icons-vue/FilePdfOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ScanOutlined from '@ant-design/icons-vue/ScanOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import message from 'ant-design-vue/es/message'
import { computed, inject, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  EXAM_MATERIAL_LAYOUT_MODE_LABEL,
  EXAM_PRINT_SOURCE_MODE_LABEL,
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  getExamDetail,
  saveMaterialLayout,
} from '@/apis/mark/exam'
import { getMarkingProgress } from '@/apis/mark/exam-progress'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiErrorRetryPanel from '@/components/ui-guide/ui/UiErrorRetryPanel.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { showUserError, toUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamPrepWorkbench' })

type PrepStepKey
  = | 'materialLayout'
    | 'candidateRoster'
    | 'paperTemplate'
    | 'answerSheet'
    | 'paperMaster'
    | 'printPackage'

interface PrepStepCard {
  key: PrepStepKey
  title: string
  description: string
  status: WorkbenchStageStatus
  statusText: string
  routeName: string
  primaryAction: string
  advisoryReason?: string
}

const ICON_MAP: Record<string, Component> = {
  materialLayout: ContainerOutlined,
  candidateRoster: TeamOutlined,
  paperTemplate: ProfileOutlined,
  answerSheet: FormOutlined,
  paperMaster: FilePdfOutlined,
  printPackage: ContainerOutlined,
}

const TONE_MAP: Record<WorkbenchStageStatus, BadgeTone> = {
  pending: 'gray',
  active: 'blue',
  completed: 'green',
  warning: 'orange',
  error: 'red',
  blocked: 'red',
}

const layoutModeOptions = (
  Object.entries(EXAM_MATERIAL_LAYOUT_MODE_LABEL) as Array<[ExamMaterialLayoutModeCode, string]>
).map(([value, label]) => ({ value, label }))

const printSourceOptions = (
  Object.entries(EXAM_PRINT_SOURCE_MODE_LABEL) as Array<[ExamPrintSourceModeCode, string]>
).map(([value, label]) => ({ value, label }))

function resolveIcon(key: string): Component {
  return ICON_MAP[key] ?? ProfileOutlined
}

function resolveTone(status: WorkbenchStageStatus): BadgeTone {
  return strictEnumTone(TONE_MAP, status, '考试准备阶段状态')
}

function examStatusTone(status: ExamStatusCode): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, status, '考试状态')
}

function examStatusLabel(status: ExamStatusCode): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, status, '考试状态')
}

const router = useRouter()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { selectedExamId } = useMarkExamContext()

const markingProgress = ref<MarkingProgressVO | null>(null)

const detail = ref<ExamDetailVO | null>(null)
const detailLoading = ref(false)
const detailLoadError = ref<Error | null>(null)
const layoutSaving = ref(false)
const draftLayoutMode = ref<ExamMaterialLayoutModeCode | undefined>()
const draftPrintSource = ref<ExamPrintSourceModeCode | undefined>()

async function loadMarkingProgress(examId: string): Promise<void> {
  try {
    markingProgress.value = await getMarkingProgress(examId)
  } catch {
    markingProgress.value = null
  }
}

async function loadDetail(examId: string | undefined) {
  if (!examId) {
    detail.value = null
    detailLoadError.value = null
    markingProgress.value = null
    return
  }
  detailLoadError.value = null
  detailLoading.value = true
  try {
    const [examDetail] = await Promise.all([getExamDetail(examId), loadMarkingProgress(examId)])
    detail.value = examDetail
    draftLayoutMode.value = detail.value.materialLayoutMode
    draftPrintSource.value = detail.value.printSourceMode
  } catch (error) {
    detail.value = null
    markingProgress.value = null
    detailLoadError.value = toUserError(error, '考试准备信息加载失败')
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
    draftLayoutMode.value !== d.materialLayoutMode
    || (draftLayoutMode.value === 'FULL_PAPER' && draftPrintSource.value !== d.printSourceMode)
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
    try {
      await workbenchContext?.refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '保存制卷形态失败')
  } finally {
    layoutSaving.value = false
  }
}

function buildQuestionStep(d: ExamDetailVO): PrepStepCard {
  const hasQuestions = d.questionCount > 0
  const answersComplete = hasQuestions && d.answerCount >= d.questionCount
  const subjectivePending = (d.subjectiveQuestionCount ?? 0) > 0 && d.subjectiveRegionReady !== true
  let status: WorkbenchStageStatus = 'pending'
  let statusText = '未配置'
  let description = '未预配题目时，身份绑定后将按扫描页推导页级题目，后续可继续补录题目与答案'
  let primaryAction = '录入题目（可选）'
  if (hasQuestions && answersComplete && !subjectivePending) {
    status = 'completed'
    statusText = `${d.questionCount} 题`
    description = `已配置 ${d.questionCount} 道题、标准答案与主观题区域`
    primaryAction = '查看 / 调整'
  } else if (hasQuestions && answersComplete && subjectivePending) {
    status = 'active'
    statusText = `${d.subjectiveRegionConfiguredCount ?? 0}/${d.subjectiveQuestionCount ?? 0} 主观区`
    description = '标准答案已齐，请补录主观题区域坐标'
    primaryAction = '配置主观题区域'
  } else if (hasQuestions) {
    status = 'active'
    statusText = `${d.answerCount}/${d.questionCount} 题`
    description = `已录入 ${d.questionCount} 道题，标准答案 ${d.answerCount}/${d.questionCount}`
    primaryAction = '补录标准答案'
  }
  return {
    key: 'paperTemplate',
    title: '试卷题目',
    description,
    status,
    statusText,
    routeName: 'TeacherExamWorkspacePaperTemplate',
    primaryAction,
  }
}

const prepSteps = computed<PrepStepCard[]>(() => {
  const d = detail.value
  if (!d) {
    return []
  }
  const steps: PrepStepCard[] = []
  steps.push({
    key: 'materialLayout',
    title: '制卷形态',
    description: d.materialLayoutMode
      ? `${strictEnumLabel(EXAM_MATERIAL_LAYOUT_MODE_LABEL, d.materialLayoutMode, '制卷形态')}，${
          d.printSourceMode
            ? strictEnumLabel(EXAM_PRINT_SOURCE_MODE_LABEL, d.printSourceMode, '印刷来源')
            : '无需系统印刷'
        }`
      : '先确定答卷页或整卷作答形态，后续扫描、身份识别与印刷包都按该形态执行',
    status: d.materialLayoutMode ? 'completed' : 'warning',
    statusText: d.materialLayoutMode ? '已选择' : '未选择',
    routeName: 'TeacherExamWorkspacePrep',
    primaryAction: d.materialLayoutMode ? '调整形态' : '选择形态',
    advisoryReason: d.materialLayoutMode ? undefined : '制卷形态未选择：扫描识别链路无法确定版面处理方式',
  })
  const hasCandidates = d.candidateCount > 0
  steps.push({
    key: 'candidateRoster',
    title: '考生名册',
    description: hasCandidates
      ? `已绑定 ${d.candidateCount} 名考生 / ${d.classIds.length} 个班级范围`
      : '导入考生名册，缺失学生用户会在导入提交时创建为租户学生账号',
    status: hasCandidates ? 'completed' : 'warning',
    statusText: hasCandidates ? `${d.candidateCount} 人` : '未配置',
    routeName: 'TeacherExamWorkspaceCandidateRoster',
    primaryAction: hasCandidates ? '查看 / 调整' : '配置考生名册',
    advisoryReason: hasCandidates
      ? undefined
      : '考生名册未配置：扫描后无法自动绑定到可登录学生账号，学生端无法承接考试结果',
  })
  if (!d.materialLayoutMode) {
    return steps
  }
  steps.push(buildQuestionStep(d))
  if (d.materialLayoutMode === 'ANSWER_SHEET') {
    const ready = d.pageTemplateReady === true
    steps.push({
      key: 'answerSheet',
      title: '答卷页模板',
      description: ready
        ? `已配置 ${d.totalPages ?? 0} 页扫描底图`
        : '上传答卷页文件，供扫描对齐与坐标缩放',
      status: ready ? 'completed' : 'warning',
      statusText: ready ? '已配置' : '未配置',
      routeName: 'TeacherExamWorkspaceAnswerSheet',
      primaryAction: ready ? '查看 / 调整' : '配置答卷页',
      advisoryReason: ready
        ? undefined
        : '答卷页模板未配置：扫描后坐标缩放、题目定位和批改落点将无法稳定识别',
    })
  } else {
    const masterReady = d.masterConfigured === true && d.masterRegionReady === true
    const pageSynced = d.pageTemplateReady === true
    steps.push({
      key: 'paperMaster',
      title: '试卷母版',
      description:
        masterReady && pageSynced
          ? `母版「${d.masterName ?? ''}」已就绪，${d.totalPages ?? 0} 页已同步`
          : masterReady
            ? '母版已上传，请确认身份区 / 客观填涂区并等待拆页同步'
            : '上传整卷 PDF，配置身份区与客观题填涂区',
      status: masterReady && pageSynced ? 'completed' : masterReady ? 'active' : 'warning',
      statusText: masterReady && pageSynced ? '已就绪' : masterReady ? '待完善' : '未配置',
      routeName: 'TeacherExamWorkspacePaperMaster',
      primaryAction: masterReady ? '查看 / 调整' : '配置母版',
      advisoryReason: masterReady
        ? undefined
        : '试卷母版未配置：身份区识别、客观题识别和异常件处置将缺少版面基准',
    })
    if (d.printSourceMode === 'SYSTEM_PRINT') {
      const pkgReady = (d.printPackageCount ?? 0) > 0
      steps.push({
        key: 'printPackage',
        title: '印刷包',
        description: pkgReady
          ? `已生成 ${d.printPackageCount} 个印刷包`
          : '按考生名册生成个性化印刷 PDF',
        status: pkgReady ? 'completed' : 'warning',
        statusText: pkgReady ? '已生成' : '未生成',
        routeName: 'TeacherExamWorkspacePrintPackage',
        primaryAction: pkgReady ? '查看 / 调整' : '生成印刷包',
        advisoryReason: pkgReady
          ? undefined
          : '印刷包未生成：系统制卷无法按考生名册生成印刷件，考前发卷准备不完整',
      })
    }
  }
  return steps
})

/** 准备步骤按钮：仅当前首个未完成步骤保留 primary，避免同屏多颗主按钮 */
function prepStepButtonVariant(step: PrepStepCard): 'primary' | 'outline' {
  if (step.status === 'completed') return 'outline'
  const firstPending = prepSteps.value.find((item) => item.status !== 'completed')
  return firstPending?.key === step.key ? 'primary' : 'outline'
}

const advisoryReasons = computed(() => {
  return prepSteps.value.filter((s) => s.advisoryReason).map((s) => s.advisoryReason as string)
})

const blockingReasons = computed(() => {
  const d = detail.value
  if (!d) return []
  const reasons: string[] = []
  if (!d.materialLayoutMode) {
    reasons.push('请先选择制卷形态')
  }
  if (d.candidateCount <= 0) {
    reasons.push('请先导入考生名册')
  }
  if (
    d.materialLayoutMode === 'FULL_PAPER'
    && d.printSourceMode === 'SYSTEM_PRINT'
    && (d.printPackageCount ?? 0) <= 0
  ) {
    reasons.push('系统印刷模式必须先生成印刷包')
  }
  return reasons
})

const statMetrics = computed((): UiStatPanelItem[] => {
  const d = detail.value
  if (!d) return []
  const completed = prepSteps.value.filter((s) => s.status === 'completed').length
  const items: UiStatPanelItem[] = [
    {
      label: '准备进度',
      value: `${completed} / ${prepSteps.value.length}`,
      tone: (completed === prepSteps.value.length ? 'green' : 'blue') as BadgeTone,
    },
    {
      label: '硬阻断',
      value: blockingReasons.value.length,
      unit: '项',
      tone: (blockingReasons.value.length > 0 ? 'orange' : 'green') as BadgeTone,
    },
  ]
  items.push(
    { label: '考生数', value: d.candidateCount, unit: '人', tone: 'blue' },
    {
      label: '制卷形态',
      value: d.materialLayoutMode
        ? strictEnumLabel(EXAM_MATERIAL_LAYOUT_MODE_LABEL, d.materialLayoutMode, '制卷形态')
        : '未选择',
      tone: 'gray',
    },
  )
  return items
})

function goPrepStep(step: PrepStepCard) {
  if (!selectedExamId.value) return
  void router.push({ name: step.routeName, params: { examId: selectedExamId.value } })
}

/** 所有必填准备项是否已完成 */
const prepReady = computed(() => {
  return blockingReasons.value.length === 0
})

/** 从准备阶段跳转到下一步 */
function goNextStep(target: 'scan' | 'review'): void {
  if (!selectedExamId.value) return
  if (target === 'scan') {
    void router.push({ name: 'TeacherExamWorkspaceScanBatches', params: { examId: selectedExamId.value } })
  } else {
    void router.push({ name: 'TeacherExamWorkspaceReviewBatchConfirm', params: { examId: selectedExamId.value } })
  }
}

watch(selectedExamId, (next) => {
  if (next) {
    void loadDetail(next)
  } else {
    detail.value = null
  }
}, { immediate: true })
</script>

<template>
  <UiEmpty
    v-if="!selectedExamId"
    description="请选择考试"
    class="exam-prep__empty"
  />

  <UiErrorRetryPanel
    v-else-if="detailLoadError"
    :error="detailLoadError"
    @retry="() => loadDetail(selectedExamId)"
  />

  <template v-else>
    <a-spin :spinning="detailLoading">
      <div v-if="detail?.status" class="exam-prep__status-row">
        <UiTag :tone="examStatusTone(detail.status)" size="sm">
          {{ examStatusLabel(detail.status) }}
        </UiTag>
      </div>

      <UiCard class="exam-prep__mode-card">
        <template #title>制卷形态</template>
        <a-form layout="inline">
          <a-form-item label="形态">
            <a-select
              v-model:value="draftLayoutMode"
              :disabled="layoutModeLocked"
              placeholder="选择制卷形态"
              :options="layoutModeOptions"
              style="width: 200px"
            />
          </a-form-item>
          <a-form-item v-if="showPrintSource" label="印刷来源">
            <a-select
              v-model:value="draftPrintSource"
              :disabled="layoutModeLocked"
              placeholder="选择印刷来源"
              :options="printSourceOptions"
              style="width: 200px"
            />
          </a-form-item>
          <a-form-item>
            <UiButton
              size="sm"
              :variant="layoutDirty && !layoutModeLocked ? 'primary' : 'outline'"
              :disabled="!draftLayoutMode || layoutModeLocked || !layoutDirty"
              :loading="layoutSaving"
              @click="handleSaveLayoutMode"
            >
              保存形态
            </UiButton>
          </a-form-item>
        </a-form>
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
              教师上传答卷页，适合外部试卷或只扫描答题卡；后续重点处理身份绑定、题目区域和成绩确认。
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
              使用整卷 PDF 母版，配置身份区和客观题填涂区，适合系统拆页识别与按名册生成印刷包。
            </span>
          </button>
        </div>
        <p v-if="layoutModeLocked" class="exam-prep__mode-hint">
          已开印或已扫描，制卷形态不可修改
        </p>
        <p v-else-if="!detail?.materialLayoutMode" class="exam-prep__mode-hint">
          建议先完成制卷形态、模板与名册准备；缺项会直接增加扫描识别、身份绑定和后续批改的人工处理风险
        </p>
      </UiCard>

      <template v-if="detail?.materialLayoutMode">
        <UiStatPanel
          :items="statMetrics"
          :columns="5"
          variant="grid"
          compact
          class="exam-prep__signals"
        />
        <div v-if="blockingReasons.length > 0" class="exam-prep__advisory">
          <a-alert
            v-for="reason in blockingReasons"
            :key="reason"
            type="error"
            show-icon
            :message="reason"
            class="exam-prep__alert"
          />
        </div>
        <div v-if="advisoryReasons.length > 0" class="exam-prep__advisory">
          <a-alert
            v-for="reason in advisoryReasons"
            :key="reason"
            type="warning"
            show-icon
            :message="reason"
            class="exam-prep__alert"
          />
        </div>
        <section class="exam-prep__cards">
          <UiCard
            v-for="step in prepSteps"
            :key="step.key"
            class="exam-prep__card"
            :class="`exam-prep__card--${step.status}`"
          >
            <template #title>
              <component :is="resolveIcon(step.key)" />
              <span>{{ step.title }}</span>
              <UiBadge :tone="resolveTone(step.status)">{{ step.statusText }}</UiBadge>
            </template>
            <p class="exam-prep__desc">{{ step.description }}</p>
            <a-space>
              <UiButton
                :variant="prepStepButtonVariant(step)"
                size="sm"
                @click="goPrepStep(step)"
              >
                {{ step.primaryAction }}
              </UiButton>
              <UiTag v-if="step.advisoryReason" tone="orange" size="sm">
                {{ step.advisoryReason }}
              </UiTag>
            </a-space>
          </UiCard>
        </section>
        <div v-if="prepReady" class="exam-prep__next-step">
          <UiCard class="exam-prep__next-step-card">
            <template #title>
              <CheckCircleOutlined />
              <span>关键准备项已完成</span>
            </template>
            <p class="exam-prep__next-step-desc">
              制卷形态、可登录学生名册与必要印刷准备已就绪，可以开始扫描试卷或进入阅卷。
            </p>
            <a-space>
              <UiButton variant="primary" @click="goNextStep('scan')">
                <template #icon><ScanOutlined /></template>
                开始扫描录入
              </UiButton>
              <UiButton variant="outline" @click="goNextStep('review')">
                <template #icon><EditOutlined /></template>
                进入阅卷复核
              </UiButton>
            </a-space>
          </UiCard>
        </div>
      </template>
    </a-spin>
  </template>
</template>

<style scoped lang="scss">
.exam-prep {
  &__empty {
    margin-top: 32px;
  }
  &__status-row {
    margin-bottom: 12px;
  }
  &__mode-card {
    margin-bottom: 16px;
  }
  &__mode-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 12px;
  }
  &__mode-option {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 96px;
    padding: 12px 16px;
    text-align: left;
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.2s ease, background-color 0.2s ease;

    &:hover:not(:disabled) {
      border-color: var(--ant-color-primary, #2563eb);
      background: var(--dp-surface-subtle, #f8fafc);
    }

    &:disabled {
      cursor: not-allowed;
    }

    &--active {
      border-color: var(--ant-color-primary, #2563eb);
      background: var(--ant-color-primary-bg, #eff6ff);
    }
  }
  &__mode-option-title {
    color: var(--dp-text-primary, #0f172a);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
  }
  &__mode-option-desc {
    color: var(--dp-text-secondary, #475569);
    font-size: 13px;
    line-height: 1.6;
  }
  &__mode-hint {
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--dp-text-muted, #64748b);
  }
  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }
  &__advisory {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }
  &__alert {
    margin: 0;
  }
  &__cards {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 16px;
  }
  &__card {
    transition: border-color 0.2s ease;
    &--warning {
      border-color: var(--ant-color-warning-border, #fcd34d);
    }
    &--completed {
      border-color: var(--dp-green-200, #bbf7d0);
    }
  }
  &__desc {
    margin: 8px 0 12px;
    font-size: 13px;
    color: var(--dp-text-muted, #64748b);
    line-height: 1.6;
  }
}

@media (max-width: 1400px) {
  .exam-prep {
    &__cards {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@media (max-width: 960px) {
  .exam-prep {
    &__cards {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

@media (max-width: 640px) {
  .exam-prep {
    &__mode-options {
      grid-template-columns: minmax(0, 1fr);
    }
    &__cards {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
