<script setup lang="ts">
import type { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import type {
  ExamLayoutDocument,
  ExamLayoutGenerateQuestionRequest,
} from '@/apis/mark/exam-layout-design'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { ExamMaterialLayoutModeDescription } from '@/apis/mark/exam'
import { fetchExamLayoutPageUploadMeta } from '@/apis/mark/exam-layout-design'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ExamLayoutEntryKindCode } from '@/types/enums/exam-layout-entry-kind-enum'
import {
  ALL_EXAM_LAYOUT_PAPER_SPEC_CODES,
  defaultBlankSheetPaperSpec,
  ExamLayoutPaperSpecCode,
  ExamLayoutPaperSpecOptions,
  getExamLayoutPaperSpecDescription,
} from '@/types/enums/exam-layout-paper-spec-enum'
import { showUserError } from '@/utils/error-handler'
import { layoutHasSourceFileDetectResult } from '@/utils/exam-layout-designer'
import { strictEnumLabel } from '@/utils/strict-enum'

type LayoutQuestionType = 'OBJECTIVE' | 'SUBJECTIVE'

interface LayoutQuestionDraft {
  id: string
  questionNo: string
  ocrScene: string
  questionType: LayoutQuestionType
  fullScore: number
  optionCount?: number
}

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
  'generate-sheet': [paperSpec: string, questions: ExamLayoutGenerateQuestionRequest[]]
  'auto-detect': [sourcePdfFileId: string]
  "patch": [document: ExamLayoutDocument]
}>()

const OCR_SCENE_OPTIONS = [
  { label: '选择题', value: 'CHOICE' },
  { label: '判断题', value: 'TRUE_FALSE' },
  { label: '填空题', value: 'FILL_BLANK' },
  { label: '数值题', value: 'NUMERIC' },
  { label: '名词解释', value: 'TERM_EXPLANATION' },
  { label: '简答题', value: 'SHORT_ANSWER' },
  { label: '论述题', value: 'ESSAY' },
  { label: '计算题', value: 'CALCULATION' },
  { label: '证明题', value: 'PROOF' },
  { label: '案例分析', value: 'CASE_ANALYSIS' },
  { label: '病案分析', value: 'MEDICAL_CASE' },
  { label: '设计题', value: 'DESIGN' },
  { label: '作图题', value: 'DRAWING' },
  { label: '图表题', value: 'TABLE_CHART' },
  { label: '编程题', value: 'PROGRAMMING' },
  { label: '通用文本题', value: 'GENERAL_TEXT' },
]

const QUICK_SCENE_OPTIONS = [
  { label: '选择', value: 'CHOICE' },
  { label: '判断', value: 'TRUE_FALSE' },
  { label: '填空', value: 'FILL_BLANK' },
  { label: '数值', value: 'NUMERIC' },
  { label: '计算', value: 'CALCULATION' },
  { label: '作图', value: 'DRAWING' },
  { label: '编程', value: 'PROGRAMMING' },
]

const OBJECTIVE_SCENES = new Set(['CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'NUMERIC'])

const sourcePdfFileId = ref(props.document?.sourcePdfFileId ?? '')
const sourcePdfFileName = ref('')
const sourceFileCanAutoDetect = computed(() => {
  if (!sourcePdfFileId.value.trim()) {
    return false
  }
  if (!sourcePdfFileName.value.trim()) {
    return true
  }
  return /\.(pdf|doc|docx|png|jpe?g)$/i.test(sourcePdfFileName.value)
})
const paperSpec = ref<ExamLayoutPaperSpecCode>(
  ALL_EXAM_LAYOUT_PAPER_SPEC_CODES.find((code) => code === props.document?.paperSpec) ?? defaultBlankSheetPaperSpec(),
)
const layoutName = ref(props.document?.layoutName ?? '')
const printSafeMarginMm = ref(props.document?.printSafeMarginMm ?? 5)
const questionRows = ref<LayoutQuestionDraft[]>(createDefaultQuestionRows())

watch(
  () => props.document?.sourcePdfFileId,
  (value) => {
    if (value?.trim()) {
      sourcePdfFileId.value = value
    }
  },
)

watch(
  () => props.document?.layoutName,
  (value) => {
    if (value?.trim()) {
      layoutName.value = value
    }
  },
)

watch(
  () => props.document?.printSafeMarginMm,
  (value) => {
    if (value != null) {
      printSafeMarginMm.value = value
    }
  },
)

const isAnswerSheetMode = computed(() => props.materialLayoutMode === 'ANSWER_SHEET')
const isFullPaperMode = computed(() => props.materialLayoutMode === 'FULL_PAPER')
const entryReadonly = computed(
  () => props.readonly || !props.materialLayoutMode || props.detecting,
)

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
  emit('patch', buildSourceFileDocument(props.document))
}

function buildSourceFileDocument(currentDocument: ExamLayoutDocument | null): ExamLayoutDocument {
  const nextDocument: ExamLayoutDocument = currentDocument ?? {
    examId: props.examId,
    pages: [],
    questions: [],
    blocks: [],
    blockOptions: [],
  }
  return {
    ...nextDocument,
    examId: props.examId,
    layoutEntryKind: ExamLayoutEntryKindCode.SOURCE_FILE,
    layoutName: layoutName.value || '整卷试卷源文件',
    printSafeMarginMm: printSafeMarginMm.value,
    totalPages: Math.max(nextDocument.totalPages ?? 1, 1),
    sourcePdfFileId: sourcePdfFileId.value.trim(),
    previewPdfFileId: undefined,
    pages: nextDocument.pages ?? [],
    questions: nextDocument.questions ?? [],
    blocks: nextDocument.blocks ?? [],
    blockOptions: nextDocument.blockOptions ?? [],
  }
}

function handleGenerateSheet(): void {
  const questions = buildGenerateQuestions()
  if (questions.length === 0) {
    message.warning('请至少配置一道题目后再生成答题卡')
    return
  }
  startBlankSheet()
  emit('generate-sheet', paperSpec.value, questions)
}

function buildGenerateQuestions(): ExamLayoutGenerateQuestionRequest[] {
  return questionRows.value.map((row, index) => {
    const question: ExamLayoutGenerateQuestionRequest = {
      questionNo: row.questionNo.trim(),
      questionType: row.questionType,
      ocrScene: row.ocrScene,
      fullScore: row.fullScore,
      sortNo: index + 1,
    }
    if (row.ocrScene === 'CHOICE' || row.ocrScene === 'TRUE_FALSE') {
      question.optionCount = row.ocrScene === 'TRUE_FALSE' ? 2 : row.optionCount
    }
    return question
  })
}

function createDefaultQuestionRows(): LayoutQuestionDraft[] {
  const rows: LayoutQuestionDraft[] = []
  for (let index = 0; index < 20; index += 1) {
    rows.push(createQuestionDraft('CHOICE', rows.length + 1))
  }
  for (let index = 0; index < 5; index += 1) {
    rows.push(createQuestionDraft('SHORT_ANSWER', rows.length + 1))
  }
  return rows
}

function createQuestionDraft(ocrScene: string, sortNo: number): LayoutQuestionDraft {
  return {
    id: crypto.randomUUID(),
    questionNo: String(sortNo),
    ocrScene,
    questionType: deriveQuestionType(ocrScene),
    fullScore: defaultFullScore(ocrScene),
    optionCount: defaultOptionCount(ocrScene),
  }
}

function deriveQuestionType(ocrScene: string): LayoutQuestionType {
  return OBJECTIVE_SCENES.has(ocrScene) ? 'OBJECTIVE' : 'SUBJECTIVE'
}

function defaultFullScore(ocrScene: string): number {
  if (ocrScene === 'TRUE_FALSE') {
    return 1
  }
  if (ocrScene === 'CHOICE' || ocrScene === 'FILL_BLANK' || ocrScene === 'NUMERIC') {
    return 2
  }
  if (ocrScene === 'CALCULATION' || ocrScene === 'PROOF' || ocrScene === 'PROGRAMMING' || ocrScene === 'DRAWING') {
    return 10
  }
  return 8
}

function defaultOptionCount(ocrScene: string): number | undefined {
  if (ocrScene === 'TRUE_FALSE') {
    return 2
  }
  if (ocrScene === 'CHOICE') {
    return 4
  }
  return undefined
}

function addQuestion(ocrScene: string): void {
  questionRows.value.push(createQuestionDraft(ocrScene, questionRows.value.length + 1))
}

function removeQuestion(index: number): void {
  questionRows.value.splice(index, 1)
  resequenceQuestionNo()
}

function resequenceQuestionNo(): void {
  questionRows.value.forEach((row, index) => {
    row.questionNo = String(index + 1)
  })
}

function handleQuestionSceneChange(row: LayoutQuestionDraft): void {
  row.questionType = deriveQuestionType(row.ocrScene)
  row.optionCount = defaultOptionCount(row.ocrScene)
  row.fullScore = defaultFullScore(row.ocrScene)
}

function questionTypeLabel(questionType: LayoutQuestionType): string {
  return questionType === 'OBJECTIVE' ? '客观' : '主观'
}

function ocrSceneLabel(ocrScene: string): string {
  return OCR_SCENE_OPTIONS.find((option) => option.value === ocrScene)?.label ?? ocrScene
}

async function confirmRedetectIfNeeded(): Promise<boolean> {
  if (!layoutHasSourceFileDetectResult(props.document)) {
    return true
  }
  return confirmAsync({
    title: '重新识别题目区域？',
    content: '将覆盖当前题单、ROI 与身份填涂区配置；识别完成前无法更换源文件。',
    type: 'warning',
    okText: '重新识别',
  })
}

async function startAutoDetect(sourceFileId: string): Promise<void> {
  if (!(await confirmRedetectIfNeeded())) {
    sourcePdfFileId.value = props.document?.sourcePdfFileId ?? ''
    return
  }
  startSourceFile()
  patchDocument({ sourcePdfFileId: sourceFileId.trim() })
  emit('auto-detect', sourceFileId.trim())
}

function handleAutoDetect(): void {
  if (!sourcePdfFileId.value.trim()) {
    message.warning('请先上传整卷源文件')
    return
  }
  if (!sourceFileCanAutoDetect.value) {
    message.warning('自动预划区仅支持 PDF、Word（doc/docx）或图片（png/jpg/jpeg）')
    return
  }
  void startAutoDetect(sourcePdfFileId.value)
}

async function syncUploadedPageMeta(fileId: string): Promise<void> {
  if (!fileId) {
    return
  }
  const sourceDocument = buildSourceFileDocument(props.document)
  emit('patch', sourceDocument)
  try {
    const meta = await fetchExamLayoutPageUploadMeta({
      backgroundFileId: fileId,
    })
    const pages = sourceDocument.pages?.length
      ? sourceDocument.pages.map((page, index) =>
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
      ...sourceDocument,
      examId: props.examId,
      layoutEntryKind: ExamLayoutEntryKindCode.SOURCE_FILE,
      sourcePdfFileId: fileId,
      pages,
      totalPages: Math.max(sourceDocument.totalPages ?? 1, pages.length),
    })
  } catch (error) {
    emit('patch', {
      ...sourceDocument,
      examId: props.examId,
      layoutEntryKind: ExamLayoutEntryKindCode.SOURCE_FILE,
      sourcePdfFileId: fileId,
      totalPages: Math.max(sourceDocument.totalPages ?? 1, 1),
      pages: sourceDocument.pages ?? [],
      questions: sourceDocument.questions ?? [],
      blocks: sourceDocument.blocks ?? [],
      blockOptions: sourceDocument.blockOptions ?? [],
    })
    showUserError(error, '源文件页尺寸未解析，请重新上传 PDF、Word 或图片并完成题目识别')
  }
}

function onSourcePdfChange(fileId: string | undefined): void {
  if (!fileId) {
    return
  }
  if (props.detecting) {
    message.warning('识别进行中，请等待完成后再更换源文件')
    sourcePdfFileId.value = props.document?.sourcePdfFileId ?? ''
    return
  }
  sourcePdfFileId.value = fileId
  if (sourceFileCanAutoDetect.value) {
    void startAutoDetect(fileId)
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
        <h3 class="layout-entry-gateway__section">整卷试卷 · 源文件</h3>
        <p class="layout-entry-gateway__hint">
          上传 PDF、Word 或图片后将异步识别题目、分页入库并生成题单。
        </p>
        <a-form-item label="整卷源文件">
          <UiPlatformFileField
            v-model:file-node-id="sourcePdfFileId"
            v-model:file-name="sourcePdfFileName"
            :scene-key="FileUploadSceneKey.MARK_EXAM_TEMPLATE"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
            :disabled="entryReadonly"
            button-text="上传源文件"
            tip="PDF / Word / 图片上传后自动预划题区"
            @update:file-node-id="onSourcePdfChange"
          />
        </a-form-item>
        <UiButton
          block
          variant="primary"
          :loading="detecting"
          :disabled="entryReadonly || !sourceFileCanAutoDetect"
          @click="handleAutoDetect"
        >
          重新识别题目区域
        </UiButton>
      </template>

      <template v-if="isAnswerSheetMode">
        <a-divider />
        <h3 class="layout-entry-gateway__section">纸型规格（答题卡）</h3>
        <a-form-item label="纸型">
          <a-select v-model:value="paperSpec" :options="paperSpecOptions" :disabled="entryReadonly" />
        </a-form-item>
        <a-form-item label="题目结构">
          <div class="layout-entry-gateway__quick-actions">
            <button
              v-for="scene in QUICK_SCENE_OPTIONS"
              :key="scene.value"
              class="layout-entry-gateway__quick-button"
              type="button"
              :disabled="entryReadonly"
              @click="addQuestion(scene.value)"
            >
              + {{ scene.label }}
            </button>
          </div>
          <div class="layout-entry-gateway__question-list">
            <div class="layout-entry-gateway__question-head">
              <span>题号</span>
              <span>题型</span>
              <span>主类</span>
              <span>分值</span>
              <span>选项</span>
              <span>操作</span>
            </div>
            <div
              v-for="(row, index) in questionRows"
              :key="row.id"
              class="layout-entry-gateway__question-row"
            >
              <a-input
                v-model:value="row.questionNo"
                size="small"
                :disabled="entryReadonly"
                aria-label="题号"
              />
              <a-select
                v-model:value="row.ocrScene"
                size="small"
                :options="OCR_SCENE_OPTIONS"
                :disabled="entryReadonly"
                @change="handleQuestionSceneChange(row)"
              />
              <span
                class="layout-entry-gateway__type-pill"
                :class="`layout-entry-gateway__type-pill--${row.questionType.toLowerCase()}`"
              >
                {{ questionTypeLabel(row.questionType) }}
              </span>
              <a-input-number
                v-model:value="row.fullScore"
                size="small"
                :min="0.5"
                :max="100"
                :step="0.5"
                :disabled="entryReadonly"
                aria-label="满分"
              />
              <a-input-number
                v-model:value="row.optionCount"
                size="small"
                :min="2"
                :max="8"
                :disabled="entryReadonly || row.ocrScene !== 'CHOICE'"
                :placeholder="row.ocrScene === 'TRUE_FALSE' ? '2' : '-'"
                aria-label="选项数量"
              />
              <button
                class="layout-entry-gateway__remove-button"
                type="button"
                :disabled="entryReadonly || questionRows.length <= 1"
                :title="`删除第 ${row.questionNo} 题 ${ocrSceneLabel(row.ocrScene)}`"
                @click="removeQuestion(index)"
              >
                删除
              </button>
            </div>
          </div>
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

  &__quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  &__quick-button,
  &__remove-button {
    height: 26px;
    padding: 0 8px;
    border: 1px solid var(--dp-border-subtle);
    border-radius: 6px;
    background: #fff;
    color: var(--dp-text-primary);
    font-size: 12px;
    line-height: 24px;
    cursor: pointer;

    &:disabled {
      color: var(--dp-text-disabled);
      cursor: not-allowed;
      background: var(--dp-fill-muted);
    }
  }

  &__quick-button:not(:disabled):hover,
  &__remove-button:not(:disabled):hover {
    border-color: var(--dp-color-primary);
    color: var(--dp-color-primary);
  }

  &__question-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 360px;
    overflow: auto;
    padding-right: 2px;
  }

  &__question-head,
  &__question-row {
    display: grid;
    grid-template-columns: 48px minmax(112px, 1.2fr) 42px 62px 58px 44px;
    gap: 6px;
    align-items: center;
  }

  &__question-head {
    position: sticky;
    top: 0;
    z-index: 1;
    min-height: 24px;
    background: #fff;
    color: var(--dp-text-secondary);
    font-size: 12px;
  }

  &__question-row {
    min-height: 30px;
  }

  &__type-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 22px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;

    &--objective {
      background: #eef6ff;
      color: #1558a8;
    }

    &--subjective {
      background: #f6f3ff;
      color: #5b3fb2;
    }
  }

  &__remove-button {
    width: 44px;
    padding: 0;
  }
}
</style>
