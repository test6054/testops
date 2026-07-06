<script setup lang="ts">
import type { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { ExamMaterialLayoutModeDescription } from '@/apis/mark/exam'
import { fetchExamLayoutPageUploadMeta } from '@/apis/mark/exam-layout-design'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { ExamLayoutEntryKindCode } from '@/types/enums/exam-layout-entry-kind-enum'
import {
  ALL_EXAM_LAYOUT_PAPER_SPEC_CODES,
  defaultBlankSheetPaperSpec,
  ExamLayoutPaperSpecCode,
  ExamLayoutPaperSpecOptions,
  getExamLayoutPaperSpecDescription,
} from '@/types/enums/exam-layout-paper-spec-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  document: ExamLayoutDocument | null
  examId: string
  materialLayoutMode?: ExamMaterialLayoutModeCode
  materialLayoutModeMessage?: string
  layoutPaperSpecMessage?: string
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
const paperSpec = ref<ExamLayoutPaperSpecCode>(
  ALL_EXAM_LAYOUT_PAPER_SPEC_CODES.find((code) => code === props.document?.paperSpec) ?? defaultBlankSheetPaperSpec(),
)
const layoutName = ref(props.document?.layoutName ?? '')
const printSafeMarginMm = ref(props.document?.printSafeMarginMm ?? 5)

const isAnswerSheetMode = computed(() => props.materialLayoutMode === 'ANSWER_SHEET')
const isFullPaperMode = computed(() => props.materialLayoutMode === 'FULL_PAPER')
const entryReadonly = computed(() => props.readonly || !props.materialLayoutMode)

const materialLayoutModeLabel = computed(() => {
  if (props.materialLayoutModeMessage) {
    return props.materialLayoutModeMessage
  }
  if (props.materialLayoutMode) {
    return strictEnumLabel(
      ExamMaterialLayoutModeDescription,
      props.materialLayoutMode,
      '制卷形态',
    )
  }
  return '制卷形态未选择'
})

const displayedPaperSpecMessage = computed(() => {
  if (props.layoutPaperSpecMessage) {
    return props.layoutPaperSpecMessage
  }
  if (isAnswerSheetMode.value) {
    return getExamLayoutPaperSpecDescription(paperSpec.value)
  }
  return ''
})

const paperSpecOptions = ExamLayoutPaperSpecOptions

const paperSpecHint = computed(() => {
  if (paperSpec.value === ExamLayoutPaperSpecCode.A3_2COL) {
    return 'A3 横版：适合 1 张 2 面双面扫描；客观左栏、主观右栏'
  }
  return 'A4 单栏：通常 1 张 1 面单面扫描；多页时按总页数推导印张'
})

function patchDocument(partial: Partial<ExamLayoutDocument>): void {
  if (!props.document) {
    return
  }
  emit('patch', { ...props.document, ...partial })
}

function startBlankSheet(): void {
  patchDocument({
    layoutEntryKind: ExamLayoutEntryKindCode.BLANK_SHEET,
    layoutName: layoutName.value || '标准答题卡',
    printSafeMarginMm: printSafeMarginMm.value,
    paperSpec: paperSpec.value,
  })
}

function startSourceFile(): void {
  patchDocument({
    layoutEntryKind: ExamLayoutEntryKindCode.SOURCE_FILE,
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
    message.warning('请先上传整卷 PDF')
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
    <dl class="layout-entry-gateway__meta">
      <div class="layout-entry-gateway__meta-row">
        <dt>制卷形态</dt>
        <dd>{{ materialLayoutModeLabel }}</dd>
      </div>
      <div v-if="displayedPaperSpecMessage" class="layout-entry-gateway__meta-row">
        <dt>纸型</dt>
        <dd>{{ displayedPaperSpecMessage }}</dd>
      </div>
    </dl>
    <a-form layout="vertical" class="layout-entry-gateway__form">
      <a-form-item label="制卷名称">
        <a-input
          v-model:value="layoutName"
          :disabled="readonly"
          placeholder="如：2025 春季期末试卷"
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

      <UiAlertStrip
        v-if="!materialLayoutMode"
        tone="warning"
        title="制卷形态未保存"
        description="请先回到考试准备页保存答卷页模式或整卷模式，再进入制卷设计。"
        dense
        :closable="false"
      />

      <template v-if="isFullPaperMode">
        <a-divider />
        <h3 class="layout-entry-gateway__section">整卷试卷 · 上传 PDF</h3>
        <p class="layout-entry-gateway__hint">
          上传整卷 PDF，系统自动识别 A3/A4 尺寸；2 页模板建议双面扫描，1 页为单面。
        </p>
        <a-form-item label="整卷 PDF">
          <UiPlatformFileField
            v-model:file-node-id="sourcePdfFileId"
            v-model:file-name="sourcePdfFileName"
            :scene-key="FileUploadSceneKey.MARK_EXAM_TEMPLATE"
            accept=".pdf,application/pdf"
            :disabled="entryReadonly"
            button-text="上传整卷 PDF"
            tip="上传后自动解析页尺寸与纸型"
            @update:file-node-id="onSourcePdfChange"
          />
        </a-form-item>
        <UiButton
          block
          variant="primary"
          :loading="detecting"
          :disabled="entryReadonly"
          @click="handleAutoDetect"
        >
          自动预划区
        </UiButton>
      </template>

      <template v-if="isAnswerSheetMode">
        <a-divider />
        <h3 class="layout-entry-gateway__section">纸型规格（答题卡）</h3>
        <a-form-item label="纸型">
          <a-select v-model:value="paperSpec" :options="paperSpecOptions" :disabled="entryReadonly" />
        </a-form-item>
        <p class="layout-entry-gateway__hint">{{ paperSpecHint }}</p>
        <UiButton
          block
          variant="primary"
          :loading="generating"
          :disabled="entryReadonly"
          @click="handleGenerateSheet"
        >
          生成标准答题卡
        </UiButton>
      </template>
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

  &__meta {
    margin: 0 0 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__meta-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0;
    font-size: 12px;

    dt {
      flex: 0 0 auto;
      margin: 0;
      color: var(--dp-text-secondary);
    }

    dd {
      margin: 0;
      font-weight: 500;
      color: var(--dp-text-primary);
    }
  }

  &__section {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__hint {
    margin: -4px 0 12px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }
}
</style>
