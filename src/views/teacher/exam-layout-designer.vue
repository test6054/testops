<script setup lang="ts">
import type {
  ExamLayoutBlockDto,
  ExamLayoutDocument,
  ExamLayoutGenerateQuestionRequest,
} from '@/apis/mark/exam-layout-design'
import type { PrepStepCard } from '@/utils/exam-prep-step-ui'
import { message } from 'ant-design-vue'
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  autoDetectExamLayout,
  EXAM_LAYOUT_DESIGN_FLOW_HINT,
  generateExamLayoutSheet,
  loadExamLayoutDesign,
  previewExamLayoutDesign,
  saveExamLayoutDesign,
} from '@/apis/mark/exam-layout-design'
import LayoutBlockLayerPanel from '@/components/mark/layout-designer/LayoutBlockLayerPanel.vue'
import LayoutCanvas from '@/components/mark/layout-designer/LayoutCanvas.vue'
import LayoutEntryGateway from '@/components/mark/layout-designer/LayoutEntryGateway.vue'
import LayoutPreviewDrawer from '@/components/mark/layout-designer/LayoutPreviewDrawer.vue'
import LayoutPropertyDrawer from '@/components/mark/layout-designer/LayoutPropertyDrawer.vue'
import LayoutReviewDrawer from '@/components/mark/layout-designer/LayoutReviewDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import PrepStepPipelineRow from '@/components/workbench/PrepStepPipelineRow.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { ALL_EXAM_LAYOUT_PAPER_SPEC_CODES } from '@/types/enums/exam-layout-paper-spec-enum'
import { showUserError } from '@/utils/error-handler'
import { resolvePaperSpecLabel, validateLayoutDocumentForSave } from '@/utils/exam-layout-designer'
import {
  buildLayoutDesignerSignalMetrics,
  filterLayoutDesignerPrepSteps,
} from '@/utils/exam-layout-designer-signal'
import { buildPrepStepCards } from '@/utils/exam-prep-step-ui'

defineOptions({ name: 'TeacherExamWorkspaceLayoutDesigner' })

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
} = useExamJourneyContextBar('制卷设计器')

const loading = ref(false)
const saving = ref(false)
const generating = ref(false)
const detecting = ref(false)
const previewing = ref(false)
const layoutWritable = ref(true)
const writeLockReason = ref<string>()
const document = ref<ExamLayoutDocument | null>(null)
const focusedBlockId = ref<string | null>(null)
const currentPageNo = ref(1)
const previewOpen = ref(false)
const reviewOpen = ref(false)
const previewPdfFileId = ref<string>()

const examId = computed(() => selectedExamId.value ?? '')

const focusedBlock = computed<ExamLayoutBlockDto | null>(() => {
  if (!document.value || !focusedBlockId.value) {
    return null
  }
  return document.value.blocks.find((item) => item.id === focusedBlockId.value) ?? null
})

const pageTabItems = computed(() =>
  (document.value?.pages ?? []).map((page) => ({
    key: String(page.pageNo),
    label: `第 ${page.pageNo} 页`,
  })),
)

const currentPageTabKey = computed({
  get: () => String(currentPageNo.value),
  set: (value) => {
    currentPageNo.value = Number(value)
  },
})

const layoutDesignerContextSubtitle = computed(() => {
  const journeySubtitle = contextBarSubtitle.value
  if (journeySubtitle.includes('/api/')) {
    return '制卷设计 · 划区与答题卡编排'
  }
  return journeySubtitle
})

const layoutPaperLabel = computed(() => {
  const detail = examDetail.value
  if (detail?.layoutPaperSpecMessage) {
    return detail.layoutPaperSpecMessage
  }
  const spec = document.value?.paperSpec
  const paperSpec = ALL_EXAM_LAYOUT_PAPER_SPEC_CODES.find((code) => code === spec)
  if (paperSpec) {
    return resolvePaperSpecLabel(paperSpec)
  }
  return ''
})

const materialLayoutModeLabel = computed(
  () => examDetail.value?.materialLayoutModeMessage ?? '',
)

const scanPaperStyleLabel = computed(() => examDetail.value?.scanPaperStyleText ?? '')

const materialLayoutMode = computed(() => examDetail.value?.materialLayoutMode)

const snapshot = computed(() => workbenchContext?.snapshot.value ?? null)
const prepBlockingReasons = computed(() => snapshot.value?.prepBlockingReasons ?? [])
const prepAdvisoryReasons = computed(() => snapshot.value?.prepAdvisoryReasons ?? [])

const designerPrepSteps = computed<PrepStepCard[]>(() => {
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
  return buildLayoutDesignerSignalMetrics(detail)
})

const pageLoading = computed(
  () => loading.value || (examDetailLoading.value && !examDetail.value),
)
const saveBlockingReasons = computed(() => validateLayoutDocumentForSave(document.value))
const previewDisabled = computed(
  () => !materialLayoutMode.value || !document.value || saveBlockingReasons.value.length > 0,
)

function goDesignerPrepStep(step: PrepStepCard): void {
  if (!examId.value) {
    return
  }
  if (step.key === 'layoutDesign') {
    return
  }
  if (!examDetail.value?.materialLayoutMode) {
    return
  }
  void router.push({ name: step.routeName, params: { examId: examId.value } })
}

async function reload(): Promise<void> {
  if (!examId.value) {
    document.value = null
    focusedBlockId.value = null
    currentPageNo.value = 1
    layoutWritable.value = true
    writeLockReason.value = undefined
    return
  }
  loading.value = true
  try {
    const res = await loadExamLayoutDesign({ examId: examId.value })
    layoutWritable.value = res.writable
    writeLockReason.value = res.writeLockReason
    document.value = res.document
    if (document.value?.pages?.length) {
      currentPageNo.value = document.value.pages[0].pageNo
    }
  } catch (error) {
    document.value = null
    focusedBlockId.value = null
    currentPageNo.value = 1
    layoutWritable.value = true
    writeLockReason.value = undefined
    showUserError(error, '加载制卷设计失败')
  } finally {
    loading.value = false
  }
}

async function handleSave(): Promise<void> {
  if (!document.value || !examId.value || !layoutWritable.value) {
    return
  }
  if (saveBlockingReasons.value.length > 0) {
    message.warning(saveBlockingReasons.value[0])
    return
  }
  saving.value = true
  try {
    document.value = await saveExamLayoutDesign({
      examId: examId.value,
      document: { ...document.value, examId: examId.value },
    })
    message.success('制卷设计已保存')
    await workbenchContext?.refreshChrome?.()
  } catch (error) {
    showUserError(error, '保存制卷设计失败')
  } finally {
    saving.value = false
  }
}

async function handlePreview(): Promise<void> {
  if (!examId.value || !document.value) {
    return
  }
  if (saveBlockingReasons.value.length > 0) {
    message.warning(saveBlockingReasons.value[0])
    return
  }
  previewing.value = true
  try {
    const res = await previewExamLayoutDesign({
      examId: examId.value,
      document: { ...document.value, examId: examId.value, previewPdfFileId: undefined },
    })
    previewPdfFileId.value = res.previewPdfFileId
    previewOpen.value = true
  } catch (error) {
    showUserError(error, '生成预览失败')
  } finally {
    previewing.value = false
  }
}

async function handleGenerateSheet(
  paperSpec: string,
  questions: ExamLayoutGenerateQuestionRequest[],
): Promise<void> {
  if (!examId.value || !layoutWritable.value) {
    return
  }
  generating.value = true
  try {
    document.value = await generateExamLayoutSheet({ examId: examId.value, paperSpec, questions })
    if (document.value.pages?.length) {
      currentPageNo.value = document.value.pages[0].pageNo
    }
    message.success('标准答题卡已生成')
    await workbenchContext?.refreshChrome?.()
  } catch (error) {
    showUserError(error, '生成答题卡失败')
  } finally {
    generating.value = false
  }
}

async function handleAutoDetect(sourcePdfFileId: string): Promise<void> {
  if (!examId.value || !layoutWritable.value) {
    return
  }
  detecting.value = true
  try {
    document.value = await autoDetectExamLayout({ examId: examId.value, sourcePdfFileId })
    if (document.value.pages?.length) {
      currentPageNo.value = document.value.pages[0].pageNo
    }
    message.success('自动预划区完成')
    await workbenchContext?.refreshChrome?.()
  } catch (error) {
    showUserError(error, '自动预划区失败')
  } finally {
    detecting.value = false
  }
}

function handleDocumentPatch(next: ExamLayoutDocument): void {
  document.value = next
}

function handleBlockFocus(block: ExamLayoutBlockDto | null): void {
  focusedBlockId.value = block?.id ?? null
}

async function handleReviewSaved(): Promise<void> {
  await reload()
  await workbenchContext?.refreshChrome?.()
}

onMounted(() => {
  void reload()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="layoutDesignerContextSubtitle"
      >
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
        </template>
        <template #actions>
          <UiButton variant="outline" @click="reviewOpen = true">复核微调</UiButton>
          <UiButton
            variant="outline"
            :loading="previewing"
            :disabled="previewDisabled"
            @click="handlePreview"
          >
            预览 PDF
          </UiButton>
          <UiButton
            variant="primary"
            :loading="saving"
            :disabled="!layoutWritable || saveBlockingReasons.length > 0"
            @click="handleSave"
          >
            保存设计
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template v-if="signalMetrics.length > 0" #signal>
      <SignalBand variant="tiles" :metrics="signalMetrics" compact />
    </template>

    <UiEmpty v-if="!examId" description="缺少考试上下文，请从考试工作台进入" />
    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="prepBlockingReasons.length > 0"
        tone="warning"
        title="考试准备硬阻断"
        :description="prepBlockingReasons.join('；')"
        dense
        class="layout-designer-alert"
      />
      <UiAlertStrip
        v-else-if="prepAdvisoryReasons.length > 0"
        tone="info"
        title="准备建议"
        :description="prepAdvisoryReasons.join('；')"
        dense
        class="layout-designer-alert"
      />

      <PrepStepPipelineRow
        v-if="examDetail && designerPrepSteps.length > 0"
        class="layout-designer-pipeline"
        :steps="designerPrepSteps"
        current-step-key="layoutDesign"
        :locked="!examDetail.materialLayoutMode"
        @select="goDesignerPrepStep"
      />

      <UiAlertStrip
        v-if="!layoutWritable && writeLockReason"
        tone="warning"
        :closable="false"
        dense
        :title="writeLockReason"
        class="layout-designer-lock-banner"
      />
      <UiAlertStrip
        v-else-if="saveBlockingReasons.length > 0"
        tone="warning"
        :closable="false"
        dense
        title="制卷设计尚未满足保存条件"
        :description="saveBlockingReasons.slice(0, 4).join('；')"
        class="layout-designer-lock-banner"
      />

      <WorkbenchSurfaceCard flush class="layout-designer__surface">
        <template #toolbar>
          <span class="layout-designer__flow-hint">{{ EXAM_LAYOUT_DESIGN_FLOW_HINT }}</span>
        </template>

        <UiSkeletonState
          v-if="pageLoading"
          variant="card"
          :card-count="3"
          compact
        />
        <div v-else class="layout-designer-workspace">
          <aside class="layout-designer-workspace__left">
            <LayoutEntryGateway
              :document="document"
              :exam-id="examId"
              :material-layout-mode="materialLayoutMode"
              :material-layout-mode-message="materialLayoutModeLabel"
              :layout-paper-spec-message="layoutPaperLabel"
              :generating="generating"
              :detecting="detecting"
              :readonly="!layoutWritable"
              @generate-sheet="handleGenerateSheet"
              @auto-detect="handleAutoDetect"
              @patch="handleDocumentPatch"
            />
            <LayoutBlockLayerPanel
              :document="document"
              :page-no="currentPageNo"
              :focused-block-id="focusedBlockId"
              @focus-block="handleBlockFocus"
              @patch="handleDocumentPatch"
            />
          </aside>
          <main class="layout-designer-workspace__canvas">
            <UiSectionTabs
              v-if="pageTabItems.length > 0"
              v-model="currentPageTabKey"
              :items="pageTabItems"
              compact
            />
            <LayoutCanvas
              :document="document"
              :page-no="currentPageNo"
              :focused-block-id="focusedBlockId"
              @focus-block="handleBlockFocus"
              @patch="handleDocumentPatch"
            />
          </main>
          <aside class="layout-designer-workspace__right">
            <LayoutPropertyDrawer
              :document="document"
              :block="focusedBlock"
              @patch="handleDocumentPatch"
            />
          </aside>
        </div>
      </WorkbenchSurfaceCard>
    </template>

    <LayoutPreviewDrawer v-model:open="previewOpen" :preview-pdf-file-id="previewPdfFileId" />
    <LayoutReviewDrawer
      v-model:open="reviewOpen"
      :exam-id="examId"
      :document="document"
      :page-no="currentPageNo"
      :readonly="!layoutWritable"
      @patch="handleDocumentPatch"
      @saved="handleReviewSaved"
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.layout-designer-alert,
.layout-designer-pipeline,
.layout-designer-lock-banner {
  margin-bottom: 12px;
}

.layout-designer__flow-hint {
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
  line-height: 1.5;
}

.layout-designer-workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 300px;
  gap: 12px;
  min-height: calc(100vh - 220px);

  &__left,
  &__right {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
  }

  &__left > :first-child {
    flex: 0 0 auto;
  }

  &__left > :last-child {
    flex: 1;
    min-height: 240px;
  }

  &__canvas {
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;

    &__left,
    &__right {
      order: 2;
    }

    &__canvas {
      order: 1;
    }
  }
}
</style>
