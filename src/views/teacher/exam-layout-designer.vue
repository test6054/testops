<script setup lang="ts">
import type { ExamLayoutQuestionDto } from '@/apis/mark/exam-layout-design'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_LAYOUT_DESIGN_FLOW_HINT } from '@/apis/mark/exam-layout-design'
import LayoutIdentitySetupStrip from '@/components/mark/layout-designer/LayoutIdentitySetupStrip.vue'
import LayoutPreviewDrawer from '@/components/mark/layout-designer/LayoutPreviewDrawer.vue'
import LayoutReviewDrawer from '@/components/mark/layout-designer/LayoutReviewDrawer.vue'
import LayoutDesignLayoutPhase from '@/components/mark/layout-designer/workbench/LayoutDesignLayoutPhase.vue'
import LayoutDesignPhaseRail from '@/components/mark/layout-designer/workbench/LayoutDesignPhaseRail.vue'
import LayoutDesignQuestionPhase from '@/components/mark/layout-designer/workbench/LayoutDesignQuestionPhase.vue'
import LayoutDesignReviewPhase from '@/components/mark/layout-designer/workbench/LayoutDesignReviewPhase.vue'
import LayoutDesignSourcePhase from '@/components/mark/layout-designer/workbench/LayoutDesignSourcePhase.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import PrepStepPipelineRow from '@/components/workbench/PrepStepPipelineRow.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useLayoutDesignWorkbench } from '@/composables/useLayoutDesignWorkbench'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { ALL_EXAM_LAYOUT_PAPER_SPEC_CODES } from '@/types/enums/exam-layout-paper-spec-enum'
import { LayoutDesignPhaseCode } from '@/types/enums/layout-design-phase-enum'
import { resolvePaperSpecLabel } from '@/utils/exam-layout-designer'
import {
  buildLayoutDesignerSignalMetrics,
  filterLayoutDesignerPrepSteps,
} from '@/utils/exam-layout-designer-signal'
import { buildPrepStepCards, resolvePrepStepRouteLocation } from '@/utils/exam-prep-step-ui'
import { documentHasPages } from '@/utils/layout-design-workspace'

defineOptions({ name: 'TeacherExamWorkspaceLayoutDesigner' })

const router = useRouter()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { selectedExamId } = useMarkExamContext()
const {
  contextBarSubtitle,
  examStatusLabel,
  examStatusTone,
  examDetail,
  examDetailLoading,
} = useExamJourneyContextBar('制卷设计器')

const examId = computed(() => selectedExamId.value ?? '')

const wb = useLayoutDesignWorkbench({
  examId: () => examId.value,
  examDetail: () => examDetail.value,
  workbenchContext,
})

const {
  loading: wbLoading,
  saving: wbSaving,
  generating: wbGenerating,
  detecting: wbDetecting,
  detectProgressText: wbDetectProgressText,
  activeDetectTaskId: wbActiveDetectTaskId,
  cancellingDetect: wbCancellingDetect,
  previewing: wbPreviewing,
  layoutWritable: wbLayoutWritable,
  writeLockReason: wbWriteLockReason,
  document: wbDocument,
  layoutPersisted: wbLayoutPersisted,
  focusedBlockId: wbFocusedBlockId,
  focusedQuestionId: wbFocusedQuestionId,
  currentPageNo: wbCurrentPageNo,
  previewOpen: wbPreviewOpen,
  reviewOpen: wbReviewOpen,
  previewPdfFileId: wbPreviewPdfFileId,
  phase: wbPhase,
  layoutCanvasReadonly: wbLayoutCanvasReadonly,
  layoutRoiStats: wbLayoutRoiStats,
  identitySetupPending: wbIdentitySetupPending,
  saveBlockingReasons: wbSaveBlockingReasons,
  saveButtonDisabled: wbSaveButtonDisabled,
  saveButtonTooltip: wbSaveButtonTooltip,
  previewDisabled: wbPreviewDisabled,
  goPhase: wbGoPhase,
  patchDocument: wbPatchDocument,
  handleBlockFocus: wbHandleBlockFocus,
  handleQuestionFocus: wbHandleQuestionFocus,
  handleBlockFocusFromOutline: wbHandleBlockFocusFromOutline,
  handleAddIdentityBlock: wbHandleAddIdentityBlock,
  reload: wbReload,
  handleSave: wbHandleSave,
  handlePreview: wbHandlePreview,
  handleGenerateSheet: wbHandleGenerateSheet,
  handleAutoDetect: wbHandleAutoDetect,
  handleCancelDetect: wbHandleCancelDetect,
  isPhaseAccessible: wbIsPhaseAccessible,
  phaseLockReason: wbPhaseLockReason,
} = wb

const sourcePanelRef = ref<HTMLElement | null>(null)

const snapshot = computed(() => workbenchContext?.snapshot.value ?? null)
const prepAdvisoryReasons = computed(() => snapshot.value?.prepAdvisoryReasons ?? [])

const designerPrepSteps = computed(() => {
  const backendSteps = snapshot.value?.prepSteps
  const detail = examDetail.value
  if (!backendSteps?.length || !detail) {
    return []
  }
  return filterLayoutDesignerPrepSteps(buildPrepStepCards(backendSteps, detail))
})

const layoutModeLocked = computed(() => examDetail.value?.layoutModeLocked === true)

const signalMetrics = computed(() => {
  const detail = examDetail.value
  if (!detail) {
    return []
  }
  return buildLayoutDesignerSignalMetrics(detail).map((metric) => ({
    ...metric,
    clickable: metric.tone === 'orange' || metric.tone === 'red',
  }))
})

const layoutDesignerContextSubtitle = computed(() => {
  const journeySubtitle = contextBarSubtitle.value
  if (journeySubtitle.includes('/api/')) {
    return '制卷设计 · 分阶段工作台'
  }
  return journeySubtitle
})

const layoutPaperLabel = computed(() => {
  const detail = examDetail.value
  if (detail?.layoutPaperSpecMessage) {
    return detail.layoutPaperSpecMessage
  }
  const spec = wbDocument.value?.paperSpec
  const paperSpec = ALL_EXAM_LAYOUT_PAPER_SPEC_CODES.find((code) => code === spec)
  if (paperSpec) {
    return resolvePaperSpecLabel(paperSpec)
  }
  return ''
})

const materialLayoutModeLabel = computed(
  () => examDetail.value?.materialLayoutModeMessage ?? '',
)

const materialLayoutMode = computed(() => examDetail.value?.materialLayoutMode)

const scanPaperStyleLabel = computed(() => examDetail.value?.scanPaperStyleText ?? '')

const pageLoading = computed(
  () => wbLoading.value || (examDetailLoading.value && !examDetail.value),
)

const hasPages = computed(() => documentHasPages(wbDocument.value))

const designerPipelineHint = computed((): string => {
  const parts: string[] = []
  const layoutStep = designerPrepSteps.value.find((step) => step.key === 'layoutDesign')
  if (layoutStep?.advisoryReason?.trim()) {
    parts.push(layoutStep.advisoryReason.trim())
  }
  for (const reason of prepAdvisoryReasons.value) {
    const trimmed = reason.trim()
    if (trimmed && !parts.includes(trimmed)) {
      parts.push(trimmed)
    }
  }
  if (wbDetecting.value) {
    return parts.slice(0, 2).join('；')
  }
  if (wbIdentitySetupPending.value) {
    parts.push('保存前须先配置身份识别区')
  } else if (wbLayoutRoiStats.value.notReadyQuestionNos.length > 0) {
    parts.push(`${wbLayoutRoiStats.value.notReadyQuestionNos.length} 道题尚未配置作答区`)
  } else if (wbSaveBlockingReasons.value.length > 0) {
    parts.push(wbSaveBlockingReasons.value[0])
  } else if (!wbLayoutWritable.value && wbWriteLockReason.value) {
    parts.push(wbWriteLockReason.value)
  }
  return parts.slice(0, 2).join('；')
})

const contextPrimaryAction = computed(() => {
  if (wbPhase.value === LayoutDesignPhaseCode.REVIEW) {
    return null
  }
  if (wbPhase.value === LayoutDesignPhaseCode.SOURCE && !hasPages.value) {
    return {
      label: '上传并开始识别',
      disabled: wbDetecting.value || !materialLayoutMode.value || wbLayoutCanvasReadonly.value,
      handler: scrollToSourcePanel,
    }
  }
  if (wbSaveBlockingReasons.value.length === 0 && !wbDetecting.value) {
    return {
      label: '进入校验预览',
      disabled: !hasPages.value,
      handler: () => wbGoPhase(LayoutDesignPhaseCode.REVIEW),
    }
  }
  return null
})

function scrollToSourcePanel(): void {
  sourcePanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function goDesignerPrepStep(step: PrepStepCard): void {
  if (!examId.value || !examDetail.value) {
    return
  }
  if (step.key === 'layoutDesign') {
    return
  }
  if (!examDetail.value.materialLayoutMode) {
    return
  }
  const location = resolvePrepStepRouteLocation(step.key, examDetail.value, wbDocument.value)
  void router.push({
    name: location.name,
    params: { examId: examId.value },
    query: location.query,
  })
}

function handleSignalMetricClick(key: string): void {
  if (key === 'layout-mode') {
    void router.push({ name: 'TeacherExamWorkspacePrep', params: { examId: examId.value } })
    return
  }
  if (key === 'paper-type' || key === 'pages') {
    wbGoPhase(LayoutDesignPhaseCode.SOURCE)
    return
  }
  if (key === 'regions' || key === 'scan-sheet') {
    wbGoPhase(LayoutDesignPhaseCode.LAYOUT)
  }
}

function handleLocateRoi(question: ExamLayoutQuestionDto): void {
  wbHandleQuestionFocus(question)
  wbGoPhase(LayoutDesignPhaseCode.LAYOUT)
}

function handleFocusIdentityLayers(): void {
  wbCurrentPageNo.value = 1
  wbHandleQuestionFocus(null)
  wbGoPhase(LayoutDesignPhaseCode.LAYOUT)
}

async function handleReviewSave(): Promise<void> {
  const saved = await wbHandleSave()
  if (saved) {
    wbGoPhase(LayoutDesignPhaseCode.REVIEW)
  }
}

async function handleReviewSaved(): Promise<void> {
  await wbReload()
  await workbenchContext?.refreshChrome?.()
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" :subtitle="layoutDesignerContextSubtitle">
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <UiTag v-if="materialLayoutModeLabel" tone="blue" size="sm">
            形态 {{ materialLayoutModeLabel }}
          </UiTag>
          <UiTag v-if="layoutModeLocked" tone="gray" size="sm">形态已锁定</UiTag>
          <UiTag v-if="layoutPaperLabel" tone="gray" size="sm">纸型 {{ layoutPaperLabel }}</UiTag>
          <UiTag v-if="scanPaperStyleLabel" tone="gray" size="sm">印张 {{ scanPaperStyleLabel }}</UiTag>
          <UiTag
            v-if="wbDocument && !wbLayoutPersisted"
            tone="orange"
            size="sm"
          >
            未保存草稿
          </UiTag>
          <UiTag
            v-if="wbLayoutRoiStats.totalQuestionCount > 0"
            :tone="wbLayoutRoiStats.roiReadyQuestionCount === wbLayoutRoiStats.totalQuestionCount ? 'green' : 'orange'"
            size="sm"
          >
            ROI {{ wbLayoutRoiStats.roiReadyQuestionCount }}/{{ wbLayoutRoiStats.totalQuestionCount }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="contextPrimaryAction"
            variant="primary"
            :disabled="contextPrimaryAction.disabled"
            @click="contextPrimaryAction.handler()"
          >
            {{ contextPrimaryAction.label }}
          </UiButton>
          <UiButton variant="outline" @click="wbReviewOpen = true">复核微调</UiButton>
          <UiButton
            variant="outline"
            :loading="wbPreviewing"
            :disabled="wbPreviewDisabled"
            @click="wbHandlePreview()"
          >
            预览 PDF
          </UiButton>
          <a-tooltip :title="wbSaveButtonTooltip">
            <UiButton
              variant="primary"
              :loading="wbSaving"
              :disabled="wbSaveButtonDisabled"
              @click="wbHandleSave()"
            >
              保存设计
            </UiButton>
          </a-tooltip>
        </template>
      </ContextBar>
    </template>
    <template v-if="signalMetrics.length > 0" #signal>
      <SignalBand
        variant="tiles"
        :metrics="signalMetrics"
        compact
        @metric-click="handleSignalMetricClick"
      />
    </template>

    <UiEmpty v-if="!examId" description="缺少考试上下文，请从考试工作台进入" />
    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <PrepStepPipelineRow
        v-if="examDetail && designerPrepSteps.length > 0"
        class="layout-designer-pipeline"
        :steps="designerPrepSteps"
        current-step-key="layoutDesign"
        :locked="!examDetail.materialLayoutMode"
        :hint="designerPipelineHint || undefined"
        @select="goDesignerPrepStep"
      />

      <LayoutDesignPhaseRail
        :phase="wbPhase"
        :is-phase-accessible="wbIsPhaseAccessible"
        :phase-lock-reason="wbPhaseLockReason"
        @select="wbGoPhase"
      />

      <UiAlertStrip
        v-if="!wbLayoutWritable && wbWriteLockReason"
        tone="warning"
        :closable="false"
        dense
        :title="wbWriteLockReason"
        class="layout-designer-lock-banner"
      />
      <UiAlertStrip
        v-if="wbDetecting"
        tone="info"
        :closable="false"
        dense
        :title="wbDetectProgressText || '正在识别题目并生成划区'"
        description="识别在后台异步执行；离开本页后返回将自动续查进度，也可手动取消识别。"
        class="layout-designer-lock-banner"
      >
        <template #actions>
          <UiButton
            size="sm"
            variant="outline"
            :loading="wbCancellingDetect"
            :disabled="!wbActiveDetectTaskId || wbCancellingDetect"
            @click="wbHandleCancelDetect()"
          >
            取消识别
          </UiButton>
        </template>
      </UiAlertStrip>
      <LayoutIdentitySetupStrip
        v-if="!wbDetecting && wbIdentitySetupPending"
        :document="wbDocument"
        :detecting="wbDetecting"
        :readonly="wbLayoutCanvasReadonly"
        class="layout-designer-lock-banner"
        @add-identity-block="wbHandleAddIdentityBlock"
        @focus-layers="handleFocusIdentityLayers"
      />

      <WorkbenchSurfaceCard flush class="layout-designer__surface">
        <template #toolbar>
          <span class="layout-designer__flow-hint">{{ EXAM_LAYOUT_DESIGN_FLOW_HINT }}</span>
        </template>

        <UiSkeletonState v-if="pageLoading" variant="card" :card-count="2" compact />
        <div v-else ref="sourcePanelRef">
          <LayoutDesignSourcePhase
            v-if="wbPhase === LayoutDesignPhaseCode.SOURCE"
            :document="wbDocument"
            :exam-id="examId"
            :material-layout-mode="materialLayoutMode"
            :material-layout-mode-message="materialLayoutModeLabel"
            :layout-paper-spec-message="layoutPaperLabel"
            :generating="wbGenerating"
            :detecting="wbDetecting"
            :readonly="wbLayoutCanvasReadonly"
            :has-pages="hasPages"
            @generate-sheet="wbHandleGenerateSheet"
            @auto-detect="wbHandleAutoDetect"
            @patch="wbPatchDocument"
            @focus-upload="scrollToSourcePanel"
          />
          <LayoutDesignQuestionPhase
            v-else-if="wbPhase === LayoutDesignPhaseCode.QUESTIONS"
            :document="wbDocument"
            :focused-question-id="wbFocusedQuestionId"
            :readonly="wbLayoutCanvasReadonly"
            @patch="wbPatchDocument"
            @focus-question="wbHandleQuestionFocus"
            @locate-roi="handleLocateRoi"
          />
          <LayoutDesignLayoutPhase
            v-else-if="wbPhase === LayoutDesignPhaseCode.LAYOUT"
            :document="wbDocument"
            :material-layout-mode="materialLayoutMode"
            :page-no="wbCurrentPageNo"
            :focused-block-id="wbFocusedBlockId"
            :focused-question-id="wbFocusedQuestionId"
            :readonly="wbLayoutCanvasReadonly"
            @update:page-no="wbCurrentPageNo = $event"
            @focus-block="wbHandleBlockFocus"
            @focus-question="wbHandleQuestionFocus"
            @focus-block-from-outline="wbHandleBlockFocusFromOutline"
            @patch="wbPatchDocument"
          />
          <LayoutDesignReviewPhase
            v-else
            :document="wbDocument"
            :save-blocking-reasons="wbSaveBlockingReasons"
            :saving="wbSaving"
            :previewing="wbPreviewing"
            :preview-disabled="wbPreviewDisabled"
            :save-disabled="wbSaveButtonDisabled"
            :save-tooltip="wbSaveButtonTooltip"
            @save="handleReviewSave"
            @preview="wbHandlePreview()"
            @navigate="wbGoPhase"
          />
        </div>
      </WorkbenchSurfaceCard>
    </template>

    <LayoutPreviewDrawer v-model:open="wbPreviewOpen" :preview-pdf-file-id="wbPreviewPdfFileId" />
    <LayoutReviewDrawer
      v-model:open="wbReviewOpen"
      :exam-id="examId"
      :document="wbDocument"
      :page-no="wbCurrentPageNo"
      :readonly="wbLayoutCanvasReadonly"
      @patch="wbPatchDocument"
      @saved="handleReviewSaved"
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.layout-designer-pipeline,
.layout-designer-lock-banner {
  margin-bottom: 12px;
}

.layout-designer__flow-hint {
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
  line-height: 1.5;
}
</style>
