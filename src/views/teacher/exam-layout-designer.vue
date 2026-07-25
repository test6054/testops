<script setup lang="ts">
import type { ExamLayoutQuestionDto } from '@/apis/mark/exam-layout-design'
import { computed, inject, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import LayoutPreviewDrawer from '@/components/mark/layout-designer/LayoutPreviewDrawer.vue'
import LayoutReviewDrawer from '@/components/mark/layout-designer/LayoutReviewDrawer.vue'
import LayoutDesignLayoutPhase from '@/components/mark/layout-designer/workbench/LayoutDesignLayoutPhase.vue'
import LayoutDesignQuestionPhase from '@/components/mark/layout-designer/workbench/LayoutDesignQuestionPhase.vue'
import LayoutDesignReviewPhase from '@/components/mark/layout-designer/workbench/LayoutDesignReviewPhase.vue'
import LayoutDesignSourcePhase from '@/components/mark/layout-designer/workbench/LayoutDesignSourcePhase.vue'
import LayoutDesignWorkflowRail from '@/components/mark/layout-designer/workbench/LayoutDesignWorkflowRail.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useLayoutDesignWorkbench } from '@/composables/useLayoutDesignWorkbench'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { ExamLayoutBlockTypeCode } from '@/types/enums/exam-layout-block-type-enum'
import { ExamLayoutEntryKindCode } from '@/types/enums/exam-layout-entry-kind-enum'
import { ALL_EXAM_LAYOUT_PAPER_SPEC_CODES } from '@/types/enums/exam-layout-paper-spec-enum'
import { LayoutDesignPhaseCode } from '@/types/enums/layout-design-phase-enum'
import { createDefaultBlock, resolvePaperSpecLabel } from '@/utils/exam-layout-designer'
import { buildLayoutDesignerSignalMetrics } from '@/utils/exam-layout-designer-signal'
import { documentHasPages } from '@/utils/layout-design-workspace'

defineOptions({ name: 'TeacherExamWorkspaceLayoutDesigner' })

const router = useRouter()
const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { selectedExamId } = useMarkExamContext()
const { contextBarSubtitle, examStatusLabel, examStatusTone, examDetail, examDetailLoading }
  = useExamJourneyContextBar('制卷设计器')

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
  detectOutcome: wbDetectOutcome,
  detectErrorMessage: wbDetectErrorMessage,
  clearDetectOutcome: wbClearDetectOutcome,
  mutationOutcome: wbMutationOutcome,
  mutationErrorMessage: wbMutationErrorMessage,
  clearMutationOutcome: wbClearMutationOutcome,
  activeDetectTaskId: wbActiveDetectTaskId,
  cancellingDetect: wbCancellingDetect,
  previewing: wbPreviewing,
  layoutWritable: wbLayoutWritable,
  writeLockReason: wbWriteLockReason,
  document: wbDocument,
  layoutPersisted: wbLayoutPersisted,
  layoutDirty: wbLayoutDirty,
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
} = wb

const sourcePanelRef = ref<HTMLElement | null>(null)

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
  const examNo = examDetail.value?.examNo?.trim()
  if (examNo) {
    return `#${examNo}`
  }
  return contextBarSubtitle.value
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

const materialLayoutModeLabel = computed(() => examDetail.value?.materialLayoutModeMessage ?? '')

const materialLayoutMode = computed(() => examDetail.value?.materialLayoutMode)

const scanPaperStyleLabel = computed(() => examDetail.value?.scanPaperStyleText ?? '')

const pageLoading = computed(
  () => wbLoading.value || (examDetailLoading.value && !examDetail.value),
)

const hasPages = computed(() => documentHasPages(wbDocument.value))

type DesignerStatusAlertKind = 'detect' | 'detect-failed' | 'mutation-failed' | 'identity'

const designerStatusAlert = computed(() => {
  if (wbDetecting.value) {
    return {
      kind: 'detect' as DesignerStatusAlertKind,
      tone: 'info' as const,
      title: wbDetectProgressText.value || '正在识别题目并生成划区',
      tooltip: '识别在后台异步执行；离开本页后返回将自动续查进度。',
    }
  }
  if (
    wbDetectOutcome.value === 'failed'
    || wbDetectOutcome.value === 'timeout'
    || wbDetectOutcome.value === 'cancelled'
  ) {
    const title
      = wbDetectOutcome.value === 'timeout'
        ? '识别超时'
        : wbDetectOutcome.value === 'cancelled'
          ? '识别已取消'
          : '识别失败'
    return {
      kind: 'detect-failed' as DesignerStatusAlertKind,
      tone: (wbDetectOutcome.value === 'cancelled' ? 'warning' : 'error') as 'warning' | 'error',
      title,
      tooltip: wbDetectErrorMessage.value || '可返回源文件阶段重新识别，当前草稿仍保留。',
    }
  }
  if (wbMutationOutcome.value === 'save-failed' || wbMutationOutcome.value === 'preview-failed') {
    return {
      kind: 'mutation-failed' as DesignerStatusAlertKind,
      tone: 'error' as const,
      title: wbMutationOutcome.value === 'save-failed' ? '保存失败' : '预览失败',
      tooltip: wbMutationErrorMessage.value || '当前草稿仍保留，可修正后再次保存或预览。',
    }
  }
  if (
    wbLayoutWritable.value
    && wbIdentitySetupPending.value
    && wbDocument.value?.layoutEntryKind === ExamLayoutEntryKindCode.SOURCE_FILE
  ) {
    return {
      kind: 'identity' as DesignerStatusAlertKind,
      tone: 'warning' as const,
      title: '尚未配置身份填涂区',
      tooltip: '扫描阅卷前须在第 1 页框选学号/班级等身份填涂区。',
    }
  }
  return null
})

onBeforeRouteLeave(async () => {
  if (!wbLayoutDirty.value) {
    return true
  }
  const discard = await confirmAsync({
    title: '制卷设计尚未保存',
    content: '离开本页将丢失未保存改动。可先保存设计，或确认丢弃后离开。',
    type: 'warning',
    okText: '丢弃并离开',
    cancelText: '留在本页',
  })
  return discard
})

const writeLockTooltip = computed(() =>
  wbWriteLockReason.value
    ? `${wbWriteLockReason.value}；仍可查看与预览，印后或扫后不可再改。`
    : undefined,
)

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

function goSourceAndClearDetectOutcome(): void {
  wbClearDetectOutcome()
  wbGoPhase(LayoutDesignPhaseCode.SOURCE)
  scrollToSourcePanel()
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

function handleAddStudentNoBlock(): void {
  if (!wbDocument.value || wbLayoutCanvasReadonly.value) {
    return
  }
  const maxLayer = wbDocument.value.blocks.reduce(
    (max, block) => Math.max(max, block.layer ?? 0),
    0,
  )
  const block = createDefaultBlock(1, ExamLayoutBlockTypeCode.IDENTITY_BUBBLE, maxLayer + 1)
  wbHandleAddIdentityBlock(block)
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

function openReviewDrawer(): void {
  wbReviewOpen.value = true
}
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="制卷设计器"
        :subtitle="layoutDesignerContextSubtitle"
      >
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <UiTag v-if="materialLayoutModeLabel" tone="blue" size="sm">
            形态 {{ materialLayoutModeLabel }}
          </UiTag>
          <UiTooltip v-if="!wbLayoutWritable && writeLockTooltip" :title="writeLockTooltip">
            <UiTag tone="orange" size="sm">制卷已锁定</UiTag>
          </UiTooltip>
          <UiTag v-else-if="layoutModeLocked" tone="gray" size="sm">形态已锁定</UiTag>
          <UiTag v-if="layoutPaperLabel" tone="gray" size="sm">纸型 {{ layoutPaperLabel }}</UiTag>
          <UiTag v-if="scanPaperStyleLabel" tone="gray" size="sm">
            印张 {{ scanPaperStyleLabel }}
          </UiTag>
          <UiTag v-if="wbLayoutDirty" tone="orange" size="sm">
            未保存草稿
          </UiTag>
          <UiTag v-else-if="wbDocument && wbLayoutPersisted" tone="green" size="sm">
            已保存
          </UiTag>
          <UiTag
            v-if="wbLayoutRoiStats.totalQuestionCount > 0"
            :tone="
              wbLayoutRoiStats.roiReadyQuestionCount === wbLayoutRoiStats.totalQuestionCount
                ? 'green'
                : 'orange'
            "
            size="sm"
          >
            ROI {{ wbLayoutRoiStats.roiReadyQuestionCount }}/{{
              wbLayoutRoiStats.totalQuestionCount
            }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            size="sm"
            v-if="contextPrimaryAction"
            variant="primary"
            :disabled="contextPrimaryAction.disabled"
            @click="contextPrimaryAction.handler()"
          >
            {{ contextPrimaryAction.label }}
          </UiButton>
          <UiTooltip :title="wbSaveButtonTooltip">
            <UiButton
              size="sm"
              :variant="contextPrimaryAction ? 'outline' : 'primary'"
              :loading="wbSaving"
              :disabled="wbSaveButtonDisabled"
              @click="wbHandleSave()"
            >
              保存设计
            </UiButton>
          </UiTooltip>
          <UiButton
            size="sm"
            variant="outline"
            :loading="wbPreviewing"
            :disabled="wbPreviewDisabled"
            @click="wbHandlePreview()"
          >
            预览 PDF
          </UiButton>
          <UiButton size="sm" variant="ghost" @click="openReviewDrawer">
            复核微调
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="signalMetrics.length > 0" #signal>
      <SignalBand
        :metrics="signalMetrics"
        variant="panel"
        compact
        @metric-click="handleSignalMetricClick"
      />
    </template>

    <ExamSelectGateStrip v-if="!examId" body="缺少考试上下文，请从考试工作台进入版面设计" />
    <template v-else>
      <UiTooltip v-if="designerStatusAlert" :title="designerStatusAlert.tooltip">
        <UiAlertStrip
          :tone="designerStatusAlert.tone"
          :closable="false"
          dense
          inline
          :title="designerStatusAlert.title"
          class="layout-designer-status-strip"
        >
          <template v-if="designerStatusAlert.kind === 'detect'" #actions>
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
          <template v-else-if="designerStatusAlert.kind === 'detect-failed'" #actions>
            <UiButton
              size="sm"
              variant="primary"
              @click="goSourceAndClearDetectOutcome"
            >
              回到源文件
            </UiButton>
            <UiButton
              size="sm"
              variant="outline"
              @click="wbClearDetectOutcome()"
            >
              关闭提示
            </UiButton>
          </template>
          <template v-else-if="designerStatusAlert.kind === 'mutation-failed'" #actions>
            <UiButton
              v-if="wbMutationOutcome === 'save-failed'"
              size="sm"
              variant="primary"
              :loading="wbSaving"
              :disabled="wbSaveButtonDisabled"
              @click="wbHandleSave()"
            >
              再次保存
            </UiButton>
            <UiButton
              v-else
              size="sm"
              variant="primary"
              :loading="wbPreviewing"
              :disabled="wbPreviewDisabled"
              @click="wbHandlePreview()"
            >
              再次预览
            </UiButton>
            <UiButton size="sm" variant="outline" @click="wbClearMutationOutcome()">
              关闭提示
            </UiButton>
          </template>
          <template v-else-if="designerStatusAlert.kind === 'identity'" #actions>
            <UiButton
              size="sm"
              variant="primary"
              :disabled="wbLayoutCanvasReadonly"
              @click="handleAddStudentNoBlock"
            >
              在第 1 页添加学号填涂区
            </UiButton>
            <UiButton
              size="sm"
              variant="outline"
              :disabled="wbLayoutCanvasReadonly"
              @click="handleFocusIdentityLayers"
            >
              打开识别图层
            </UiButton>
          </template>
        </UiAlertStrip>
      </UiTooltip>

      <WorkbenchSurfaceCard flush class="layout-designer__surface">
        <template #toolbar>
          <LayoutDesignWorkflowRail
            :phase="wbPhase"
            :document="wbDocument"
            :exam-detail="examDetail"
            :layout-writable="wbLayoutWritable"
            embedded
            @select="wbGoPhase"
          />
        </template>
        <UiSkeletonState v-if="pageLoading" variant="card" :card-count="2" compact />
        <div v-else ref="sourcePanelRef" class="layout-designer__phase">
          <LayoutDesignSourcePhase
            v-if="wbPhase === LayoutDesignPhaseCode.SOURCE"
            :document="wbDocument"
            :exam-id="examId"
            :material-layout-mode="materialLayoutMode"
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
.layout-designer-status-strip {
  margin-bottom: var(--dp-space-component-tight);
}

.layout-designer__surface :deep(.workbench-surface-card__toolbar) {
  padding: 0;
  border-bottom: 1px solid var(--dp-border);
  background: var(--dp-surface);
}

.layout-designer__phase {
  min-width: 0;
}
</style>
