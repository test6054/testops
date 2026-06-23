<script lang="ts" setup>
/**
 * 考试准备聚合工作台：按制卷形态驱动前置配置步骤与待完善提示。
 */
import type { Component } from 'vue'
import type {
  ExamDetailVO,
  ExamMaterialLayoutModeCode,
  ExamPrintSourceModeCode,
} from '@/apis/mark/exam'
import type { MarkingProgressVO } from '@/apis/mark/exam-progress'
import type { BadgeTone, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import type { WorkbenchStageStatus } from '@/types/workbench'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
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
  getExamDetail,
  saveMaterialLayout,
} from '@/apis/mark/exam'
import { getMarkingProgress } from '@/apis/mark/exam-progress'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { buildPrepStepCards } from '@/utils/exam-prep-step-ui'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamPrepWorkbench' })

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

const router = useRouter()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { selectedExamId } = useMarkExamContext()

const markingProgress = ref<MarkingProgressVO | null>(null)

const detail = ref<ExamDetailVO | null>(null)
const detailLoading = ref(false)
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
    markingProgress.value = null
    return
  }
  detailLoading.value = true
  try {
    const [examDetail] = await Promise.all([getExamDetail(examId), loadMarkingProgress(examId)])
    detail.value = examDetail
    draftLayoutMode.value = detail.value.materialLayoutMode
    draftPrintSource.value = detail.value.printSourceMode
  } catch (error) {
    detail.value = null
    markingProgress.value = null
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

const prepSteps = computed<PrepStepCard[]>(() => {
  const d = detail.value
  const backendSteps = workbenchContext?.snapshot.value?.prepSteps
  if (!d || !backendSteps?.length) {
    return []
  }
  return buildPrepStepCards(backendSteps, d)
})

/** 准备步骤按钮：仅当前首个未完成步骤保留 primary，避免同屏多颗主按钮 */
function prepStepButtonVariant(step: PrepStepCard): 'primary' | 'outline' {
  if (step.status === 'completed') return 'outline'
  const firstPending = prepSteps.value.find((item) => item.status !== 'completed')
  return firstPending?.key === step.key ? 'primary' : 'outline'
}

const blockingReasons = computed(() => detail.value?.prepBlockingReasons ?? [])

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
              制卷形态与整卷印刷来源等扫描主链前置已就绪，可以开始扫描试卷或进入阅卷；名册、母版、印刷包等待完善项不阻断扫描登记。
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
