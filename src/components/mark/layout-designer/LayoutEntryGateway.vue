<script setup lang="ts">
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { fetchExamLayoutPageUploadMeta } from '@/apis/mark/exam-layout-design'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { showUserError } from '@/utils/error-handler'
import {
  EXAM_LAYOUT_ENTRY_KIND,
  EXAM_LAYOUT_ENTRY_KIND_LABEL,
  EXAM_LAYOUT_PAPER_SPEC,
  EXAM_LAYOUT_PAPER_SPEC_LABEL,
} from '@/utils/exam-layout-designer'

const props = defineProps<{
  document: ExamLayoutDocument | null
  examId: string
  generating?: boolean
  detecting?: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  'generate-sheet': [paperSpec: string]
  'auto-detect': [sourcePdfFileId: string]
  "patch": [document: ExamLayoutDocument]
}>()

const sourcePdfFileId = ref(props.document?.sourcePdfFileId ?? '')
const sourcePdfFileName = ref('')
const paperSpec = ref(props.document?.paperSpec ?? EXAM_LAYOUT_PAPER_SPEC.A3_2COL)
const layoutName = ref(props.document?.layoutName ?? '')
const printSafeMarginMm = ref(props.document?.printSafeMarginMm ?? 5)

const entryKindLabel = computed(() => {
  const kind = props.document?.layoutEntryKind
  return kind ? (EXAM_LAYOUT_ENTRY_KIND_LABEL[kind] ?? kind) : '未选择'
})

const paperSpecOptions = [
  { value: EXAM_LAYOUT_PAPER_SPEC.A3_2COL, label: EXAM_LAYOUT_PAPER_SPEC_LABEL.A3_2COL },
  { value: EXAM_LAYOUT_PAPER_SPEC.A4_1COL, label: EXAM_LAYOUT_PAPER_SPEC_LABEL.A4_1COL },
]

function patchDocument(partial: Partial<ExamLayoutDocument>): void {
  if (!props.document) {
    return
  }
  emit('patch', { ...props.document, ...partial })
}

function startBlankSheet(): void {
  patchDocument({
    layoutEntryKind: EXAM_LAYOUT_ENTRY_KIND.BLANK_SHEET,
    layoutName: layoutName.value || '标准答题卡',
    printSafeMarginMm: printSafeMarginMm.value,
    paperSpec: paperSpec.value,
  })
}

function startSourceFile(): void {
  patchDocument({
    layoutEntryKind: EXAM_LAYOUT_ENTRY_KIND.SOURCE_FILE,
    layoutName: layoutName.value || '有源整卷',
    printSafeMarginMm: printSafeMarginMm.value,
  })
}

function handleGenerateSheet(): void {
  startBlankSheet()
  emit('generate-sheet', paperSpec.value)
}

function handleAutoDetect(): void {
  if (!sourcePdfFileId.value.trim()) {
    message.warning('请先上传有源整卷 PDF')
    return
  }
  startSourceFile()
  patchDocument({ sourcePdfFileId: sourcePdfFileId.value.trim() })
  emit('auto-detect', sourcePdfFileId.value.trim())
}

async function syncUploadedPageMeta(fileId: string): Promise<void> {
  if (!props.document || !fileId) {
    return
  }
  try {
    const meta = await fetchExamLayoutPageUploadMeta({
      examId: props.examId,
      pageNo: 1,
      backgroundFileId: fileId,
    })
    const pages = props.document.pages?.length
      ? props.document.pages.map((page, index) =>
          index === 0
            ? {
                ...page,
                backgroundFileId: fileId,
                naturalWidthPx: meta.naturalWidthPx,
                naturalHeightPx: meta.naturalHeightPx,
              }
            : page,
        )
      : [
          {
            id: crypto.randomUUID(),
            pageNo: 1,
            backgroundFileId: fileId,
            naturalWidthPx: meta.naturalWidthPx,
            naturalHeightPx: meta.naturalHeightPx,
          },
        ]
    emit('patch', {
      ...props.document,
      sourcePdfFileId: fileId,
      pages,
      totalPages: Math.max(props.document.totalPages ?? 1, pages.length),
    })
  } catch (error) {
    showUserError(error, '页背景尺寸解析失败')
  }
}

function onSourcePdfChange(fileId: string | undefined): void {
  if (!fileId) {
    return
  }
  void syncUploadedPageMeta(fileId)
}
</script>

<template>
  <section class="layout-entry-gateway">
    <h2 class="layout-entry-gateway__title">制卷入口</h2>
    <p class="layout-entry-gateway__kind">当前形态：{{ entryKindLabel }}</p>
    <a-form layout="vertical" class="layout-entry-gateway__form">
      <a-form-item label="制卷名称">
        <a-input
          v-model:value="layoutName"
          :disabled="readonly"
          placeholder="如：2025 春季期末答题卡"
          @blur="patchDocument({ layoutName })"
        />
      </a-form-item>
      <a-form-item label="安全边距（mm）">
        <a-input-number
          v-model:value="printSafeMarginMm"
          :min="3"
          :max="20"
          style="width: 100%"
          @change="patchDocument({ printSafeMarginMm })"
        />
      </a-form-item>
      <a-divider />
      <h3 class="layout-entry-gateway__section">无源标准答题卡</h3>
      <a-form-item label="纸张规格">
        <a-select v-model:value="paperSpec" :options="paperSpecOptions" />
      </a-form-item>
      <UiButton
        block
        variant="primary"
        :loading="generating"
        :disabled="readonly"
        @click="handleGenerateSheet"
      >
        生成标准答题卡
      </UiButton>
      <a-divider />
      <h3 class="layout-entry-gateway__section">有源整卷 PDF</h3>
      <a-form-item label="整卷 PDF">
        <UiPlatformFileField
          v-model:file-node-id="sourcePdfFileId"
          v-model:file-name="sourcePdfFileName"
          :scene-key="FileUploadSceneKey.MARK_EXAM_TEMPLATE"
          accept=".pdf,application/pdf"
          button-text="上传整卷 PDF"
          tip="上传后自动解析页尺寸"
          @update:file-node-id="onSourcePdfChange"
        />
      </a-form-item>
      <UiButton
        block
        variant="outline"
        :loading="detecting"
        :disabled="readonly"
        @click="handleAutoDetect"
      >
        自动预划区
      </UiButton>
    </a-form>
  </section>
</template>

<style scoped lang="scss">
.layout-entry-gateway {
  height: 100%;
  padding: 12px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: #fff;
  overflow: auto;

  &__title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__kind {
    margin: 0 0 12px;
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__section {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }
}
</style>
