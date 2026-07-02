<script setup lang="ts">
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, inject, onMounted, ref } from 'vue'
import {
  autoDetectExamLayout,
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
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { MARK_WORKBENCH_CONTEXT_KEY } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { hasIdentityBlock, resolvePaperSpecLabel } from '@/utils/exam-layout-designer'

defineOptions({ name: 'TeacherExamWorkspaceLayoutDesigner' })

const workbenchContext = inject(MARK_WORKBENCH_CONTEXT_KEY, null)
const { selectedExamId } = useMarkExamContext()

const loading = ref(false)
const saving = ref(false)
const generating = ref(false)
const detecting = ref(false)
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

const pageTabs = computed(() =>
  (document.value?.pages ?? []).map((page) => ({
    key: String(page.pageNo),
    label: `第 ${page.pageNo} 页`,
  })),
)

const paperSpecLabel = computed(() => {
  const spec = document.value?.paperSpec
  return spec ? resolvePaperSpecLabel(spec) : ''
})

const signalMetrics = computed<SignalMetric[]>(() => {
  const doc = document.value
  const blockCount = doc?.blocks?.length ?? 0
  const questionCount = doc?.questions?.length ?? 0
  return [
    {
      key: 'pages',
      label: '总页数',
      value: String(doc?.totalPages ?? 0),
      tone: doc?.totalPages ? 'gray' : 'orange',
    },
    {
      key: 'blocks',
      label: '识别块',
      value: String(blockCount),
      tone: blockCount > 0 ? 'gray' : 'orange',
    },
    {
      key: 'questions',
      label: '题目',
      value: String(questionCount),
      tone: questionCount > 0 ? 'gray' : 'orange',
    },
    {
      key: 'identity',
      label: '身份区',
      value: hasIdentityBlock(doc) ? '已配置' : '未配置',
      tone: hasIdentityBlock(doc) ? 'green' : 'red',
      helper: hasIdentityBlock(doc) ? undefined : '保存前须配置身份填涂区',
    },
  ]
})

async function reload(): Promise<void> {
  if (!examId.value) {
    document.value = null
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
  saving.value = true
  try {
    document.value = await saveExamLayoutDesign({
      examId: examId.value,
      document: { ...document.value, examId: examId.value },
    })
    message.success('制卷设计已保存')
    await workbenchContext?.refreshSnapshot()
  } catch (error) {
    showUserError(error, '保存制卷设计失败')
  } finally {
    saving.value = false
  }
}

async function handlePreview(): Promise<void> {
  if (!examId.value) {
    return
  }
  try {
    const res = await previewExamLayoutDesign({ examId: examId.value })
    previewPdfFileId.value = res.previewPdfFileId
    previewOpen.value = true
  } catch (error) {
    showUserError(error, '生成预览失败')
  }
}

async function handleGenerateSheet(paperSpec: string): Promise<void> {
  if (!examId.value || !layoutWritable.value) {
    return
  }
  generating.value = true
  try {
    document.value = await generateExamLayoutSheet({ examId: examId.value, paperSpec })
    if (document.value.pages?.length) {
      currentPageNo.value = document.value.pages[0].pageNo
    }
    message.success('标准答题卡已生成')
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

onMounted(() => {
  void reload()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        title="制卷设计器"
        subtitle="配置身份区、客观填涂与主观作答识别区域"
      >
        <template #status>
          <UiTag v-if="document?.layoutEntryKind" tone="blue">{{ document.layoutEntryKind }}</UiTag>
          <UiTag v-if="paperSpecLabel" tone="gray">{{ paperSpecLabel }}</UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" @click="reviewOpen = true">复核微调</UiButton>
          <UiButton variant="outline" @click="handlePreview">预览 PDF</UiButton>
          <UiButton
            variant="primary"
            :loading="saving"
            :disabled="!layoutWritable"
            @click="handleSave"
          >
            保存设计
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <template #signal>
      <SignalBand :metrics="signalMetrics" compact />
    </template>

    <UiEmpty v-if="!examId" description="缺少考试上下文，请从考试工作台进入" />
    <a-spin v-else :spinning="loading">
      <a-alert
        v-if="!layoutWritable && writeLockReason"
        type="warning"
        show-icon
        :message="writeLockReason"
        class="layout-designer-lock-banner"
      />
      <div class="layout-designer-workspace">
        <aside class="layout-designer-workspace__left">
          <LayoutEntryGateway
            :document="document"
            :exam-id="examId"
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
          <a-tabs
            v-if="pageTabs.length > 0"
            :active-key="String(currentPageNo)"
            size="small"
            @change="(key) => (currentPageNo = Number(key))"
          >
            <a-tab-pane v-for="tab in pageTabs" :key="tab.key" :tab="tab.label" />
          </a-tabs>
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
    </a-spin>

    <LayoutPreviewDrawer v-model:open="previewOpen" :preview-pdf-file-id="previewPdfFileId" />
    <LayoutReviewDrawer
      v-model:open="reviewOpen"
      :exam-id="examId"
      :document="document"
      :page-no="currentPageNo"
      :readonly="!layoutWritable"
      @patch="handleDocumentPatch"
      @saved="reload"
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.layout-designer-lock-banner {
  margin-bottom: 12px;
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
