<script lang="ts" setup>
/**
 * 考试准备聚合工作台：按制卷形态驱动准备步骤与待完善提示（不阻断扫描）。
 */
import type { SelectValue } from 'ant-design-vue/es/select'
import type { Component } from 'vue'
import type {
  ExamDetailVO,
  ExamMaterialLayoutModeCode,
  ExamPrintSourceModeCode,
  ExamStatusCode,
} from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { WorkbenchStageStatus } from '@/types/workbench'
import ContainerOutlined from '@ant-design/icons-vue/ContainerOutlined'
import FilePdfOutlined from '@ant-design/icons-vue/FilePdfOutlined'
import FormOutlined from '@ant-design/icons-vue/FormOutlined'
import ProfileOutlined from '@ant-design/icons-vue/ProfileOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TeamOutlined from '@ant-design/icons-vue/TeamOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  EXAM_MATERIAL_LAYOUT_MODE_LABEL,
  EXAM_PRINT_SOURCE_MODE_LABEL,
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  getExamDetail,
  saveMaterialLayout,
} from '@/apis/mark/exam'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { showUserError, toUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamPrepWorkbench' })

type PrepStepKey
  = | 'answerSheet'
    | 'paperMaster'
    | 'paperTemplate'
    | 'printPackage'
    | 'candidateRoster'

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
  answerSheet: FormOutlined,
  paperMaster: FilePdfOutlined,
  paperTemplate: ProfileOutlined,
  printPackage: ContainerOutlined,
  candidateRoster: TeamOutlined,
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

const markStageStore = useMarkStageStore()
const router = useRouter()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  selectedExam: currentExam,
  onExamChange,
  loadExams,
  init: initExamSelector,
} = useMarkExamSelector()

const detail = ref<ExamDetailVO | null>(null)
const detailLoading = ref(false)
const detailLoadError = ref<Error | null>(null)
const layoutSaving = ref(false)
const draftLayoutMode = ref<ExamMaterialLayoutModeCode | undefined>()
const draftPrintSource = ref<ExamPrintSourceModeCode | undefined>()

async function loadDetail(examId: string | undefined) {
  if (!examId) {
    detail.value = null
    detailLoadError.value = null
    return
  }
  detailLoadError.value = null
  detailLoading.value = true
  try {
    detail.value = await getExamDetail(examId)
    draftLayoutMode.value = detail.value.materialLayoutMode
    draftPrintSource.value = detail.value.printSourceMode
  } catch (error) {
    detail.value = null
    detailLoadError.value = toUserError(error, '考试准备信息加载失败')
    showUserError(error, '考试准备信息加载失败')
  } finally {
    detailLoading.value = false
  }
}

function handleExamChange(value: SelectValue): void {
  onExamChange(value)
  if (selectedExamId.value) {
    markStageStore.observeExam(selectedExamId.value)
  }
  void loadDetail(selectedExamId.value)
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
    syncStageProgressToStore()
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
  let description = '未预配题目时，身份绑定后将按扫描页推导页级题目并进入 OCR / 整卷 AI'
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
    routeName: 'TeacherPaperTemplate',
    primaryAction,
  }
}

const prepSteps = computed<PrepStepCard[]>(() => {
  const d = detail.value
  if (!d || !d.materialLayoutMode) {
    return []
  }
  const steps: PrepStepCard[] = []
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
      routeName: 'TeacherAnswerSheetTemplate',
      primaryAction: ready ? '查看 / 调整' : '配置答卷页',
      advisoryReason: ready ? undefined : '答卷页模板未配置：扫描可登记，坐标识别需补配答卷页',
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
      routeName: 'TeacherPaperMaster',
      primaryAction: masterReady ? '查看 / 调整' : '配置母版',
      advisoryReason: masterReady
        ? undefined
        : '试卷母版未配置：扫描可登记，身份/客观识别需补配母版',
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
        routeName: 'TeacherPrintPackage',
        primaryAction: pkgReady ? '查看 / 调整' : '生成印刷包',
        advisoryReason: pkgReady
          ? undefined
          : '印刷包未生成：系统制卷无法按名册打印，不影响扫描入库',
      })
    }
  }
  steps.push(buildQuestionStep(d))
  const hasCandidates = d.candidateCount > 0
  steps.push({
    key: 'candidateRoster',
    title: '考生名册',
    description: hasCandidates
      ? `已绑定 ${d.candidateCount} 名考生 / ${d.classIds.length} 个班级范围`
      : '绑定考生名册，扫描后完成身份绑定',
    status: hasCandidates ? 'completed' : 'warning',
    statusText: hasCandidates ? `${d.candidateCount} 人` : '未配置',
    routeName: 'TeacherCandidateRoster',
    primaryAction: hasCandidates ? '查看 / 调整' : '配置考生名册',
    advisoryReason: hasCandidates ? undefined : '考生名册未配置：无法自动身份绑定',
  })
  return steps
})

const advisoryReasons = computed(() => {
  if (detail.value?.prepBlockingReasons?.length) {
    return detail.value.prepBlockingReasons
  }
  return prepSteps.value.filter((s) => s.advisoryReason).map((s) => s.advisoryReason as string)
})

const statMetrics = computed(() => {
  const d = detail.value
  if (!d) return []
  const completed = prepSteps.value.filter((s) => s.status === 'completed').length
  const pending = prepSteps.value.filter(
    (s) => s.status === 'warning' || s.status === 'active',
  ).length
  return [
    {
      label: '准备进度',
      value: `${completed} / ${prepSteps.value.length}`,
      tone: (completed === prepSteps.value.length ? 'green' : 'blue') as 'green' | 'blue',
    },
    {
      label: '待完善',
      value: pending,
      unit: '项',
      tone: (pending > 0 ? 'orange' : 'gray') as 'orange' | 'gray',
    },
    { label: '题目 / 答案', value: `${d.questionCount} / ${d.answerCount}`, tone: 'blue' as const },
    { label: '考生数', value: d.candidateCount, unit: '人', tone: 'blue' as const },
    {
      label: '制卷形态',
      value: d.materialLayoutMode
        ? strictEnumLabel(EXAM_MATERIAL_LAYOUT_MODE_LABEL, d.materialLayoutMode, '制卷形态')
        : '未选择',
      tone: 'gray' as const,
    },
  ]
})

function syncStageProgressToStore(): void {
  if (!selectedExamId.value) return
  const steps = prepSteps.value
  if (steps.length === 0) return
  const completedCount = steps.filter((s) => s.status === 'completed').length
  const pendingCount = steps.filter((s) => s.status === 'warning' || s.status === 'active').length
  const allCompleted = completedCount === steps.length
  const examPrepStatus: WorkbenchStageStatus = allCompleted
    ? 'completed'
    : pendingCount > 0
      ? 'warning'
      : 'active'
  const examPrepHint
    = advisoryReasons.value[0]
      ?? (allCompleted
      ? `准备全部就绪（${completedCount}/${steps.length}）`
      : `准备进度 ${completedCount}/${steps.length}`)
  const layoutStep = steps.find((s) => s.key === 'answerSheet' || s.key === 'paperMaster')
  markStageStore.bulkUpdate(selectedExamId.value, {
    EXAM_PREP: { status: examPrepStatus, hint: examPrepHint },
    PAPER_TEMPLATE: layoutStep
      ? { status: layoutStep.status, hint: layoutStep.statusText }
      : undefined,
    SCAN: { status: 'active', hint: '可前往扫描工作台录入影像，未配置制卷项不阻断扫描' },
  })
  markStageStore.setCurrentStage(
    selectedExamId.value,
    allCompleted ? 'PAPER_TEMPLATE' : 'EXAM_PREP',
  )
}

function goExamList() {
  void router.push({ name: 'TeacherExamList' })
}

function goPrepStep(step: PrepStepCard) {
  void router.push({ name: step.routeName, query: { examId: selectedExamId.value } })
}

watch(selectedExamId, (next) => {
  if (next) {
    markStageStore.observeExam(next)
    void loadDetail(next)
  } else {
    detail.value = null
  }
})

watch([() => selectedExamId.value, () => detail.value], () => {
  if (selectedExamId.value && detail.value) {
    syncStageProgressToStore()
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    markStageStore.observeExam(selectedExamId.value)
    await loadDetail(selectedExamId.value)
    syncStageProgressToStore()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        title="考试准备工作台"
        subtitle="按制卷形态聚合答卷配置、题目、名册与印刷包准备状态"
      >
        <template #status>
          <a-select
            :value="selectedExamId"
            placeholder="选择考试"
            class="exam-prep__select"
            show-search
            option-filter-prop="label"
            allow-clear
            :options="examOptions"
            :loading="examLoading"
            @update:value="handleExamChange"
          />
          <UiTag v-if="currentExam" :tone="examStatusTone(currentExam.status)" size="sm">
            {{ examStatusLabel(currentExam.status) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="examLoading" @click="loadExams">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton variant="primary" size="sm" @click="goExamList">考试列表</UiButton>
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看准备进度"
      class="exam-prep__empty"
    />

    <UiErrorRetryPanel
      v-else-if="detailLoadError"
      :error="detailLoadError"
      title="考试详情加载失败"
      :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
      @retry="() => loadDetail(selectedExamId)"
    />

    <template v-else>
      <a-spin :spinning="detailLoading">
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
                variant="primary"
                :disabled="!draftLayoutMode || layoutModeLocked || !layoutDirty"
                :loading="layoutSaving"
                @click="handleSaveLayoutMode"
              >
                保存形态
              </UiButton>
            </a-form-item>
          </a-form>
          <p v-if="layoutModeLocked" class="exam-prep__mode-hint">
            已开印或已扫描，制卷形态不可修改
          </p>
          <p v-else-if="!detail?.materialLayoutMode" class="exam-prep__mode-hint">
            建议先选择制卷形态；未配置项不阻断扫描，可直接前往扫描工作台
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
                  :variant="step.status === 'completed' ? 'outline' : 'primary'"
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
        </template>
      </a-spin>
    </template>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.exam-prep {
  &__select {
    width: 320px;
  }
  &__empty {
    margin-top: 32px;
  }
  &__mode-card {
    margin-bottom: 16px;
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
    &__select {
      width: 100%;
    }
    &__cards {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
</style>
