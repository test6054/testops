<script setup lang="ts">
import type { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import type {
  ExamLayoutDocument,
  ExamLayoutGenerateQuestionRequest,
} from '@/apis/mark/exam-layout-design'
import type { LayoutQuestionDraft } from '@/utils/layout-question-templates'
import QuestionCircleOutlined from '@ant-design/icons-vue/QuestionCircleOutlined'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { fetchExamLayoutPageUploadMeta } from '@/apis/mark/exam-layout-design'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTooltip from '@/components/ui-guide/ui/UiTooltip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { ExamLayoutEntryKindCode } from '@/types/enums/exam-layout-entry-kind-enum'
import {
  ALL_EXAM_LAYOUT_PAPER_SPEC_CODES,
  defaultBlankSheetPaperSpec,
  ExamLayoutPaperSpecCode,
  ExamLayoutPaperSpecOptions,
} from '@/types/enums/exam-layout-paper-spec-enum'
import { createClientSnowflakeId } from '@/utils/client-snowflake'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { layoutHasSourceFileDetectResult } from '@/utils/exam-layout-designer'
import {
  buildGenerateQuestionsFromDrafts,
  createAnswerSheetDefaultQuestionRows,
  createQuestionDraft,
  defaultFullScore,
  defaultOptionCount,
  deriveQuestionType,
} from '@/utils/layout-question-templates'

const props = defineProps<{
  document: ExamLayoutDocument | null
  examId: string
  materialLayoutMode?: ExamMaterialLayoutModeCode
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

const PAPER_SPEC_TOOLTIP: Partial<Record<ExamLayoutPaperSpecCode, string>> = {
  [ExamLayoutPaperSpecCode.A3_2COL]: 'A3 横版：适合 1 张 2 面双面扫描；客观左栏、主观右栏',
  [ExamLayoutPaperSpecCode.A4_1COL]: 'A4 单栏：通常 1 张 1 面单面扫描；多页时按总页数推导印张',
}

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
  ALL_EXAM_LAYOUT_PAPER_SPEC_CODES.find((code) => code === props.document?.paperSpec)
  ?? defaultBlankSheetPaperSpec(),
)
const layoutName = ref(props.document?.layoutName ?? '')
const printSafeMarginMm = ref(props.document?.printSafeMarginMm ?? 5)
const questionRows = ref<LayoutQuestionDraft[]>(createAnswerSheetDefaultQuestionRows())

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
/** 只读或未选材料版式模式时不可写 */
const entryReadonly = computed(() => props.readonly || !props.materialLayoutMode)

const paperSpecOptions = ExamLayoutPaperSpecOptions

const paperSpecTooltip = computed(
  () => PAPER_SPEC_TOOLTIP[paperSpec.value] ?? PAPER_SPEC_TOOLTIP[ExamLayoutPaperSpecCode.A4_1COL],
)

function patchDocument(partial: Partial<ExamLayoutDocument>): void {
  if (entryReadonly.value || !props.document) {
    return
  }
  emit('patch', { ...props.document, ...partial })
}

function startBlankSheet(): void {
  if (entryReadonly.value) {
    return
  }
  patchDocument({
    layoutEntryKind: ExamLayoutEntryKindCode.BLANK_SHEET,
    layoutName: layoutName.value || '标准答题卡',
    printSafeMarginMm: printSafeMarginMm.value,
    paperSpec: paperSpec.value,
  })
}

function startSourceFile(): void {
  if (entryReadonly.value) {
    return
  }
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
  if (entryReadonly.value) {
    showFormValidationMessage('当前制卷设计不可编辑，无法生成答题卡')
    return
  }
  const questions = buildGenerateQuestionsFromDrafts(questionRows.value)
  if (questions.length === 0) {
    void message.warning('请至少配置一道题目后再生成答题卡')
    return
  }
  startBlankSheet()
  emit('generate-sheet', paperSpec.value, questions)
}
function addQuestion(ocrScene: string): void {
  if (entryReadonly.value) {
    return
  }
  questionRows.value.push(createQuestionDraft(ocrScene, questionRows.value.length + 1))
}

function removeQuestion(index: number): void {
  if (entryReadonly.value) {
    return
  }
  questionRows.value.splice(index, 1)
  resequenceQuestionNo()
}

function resequenceQuestionNo(): void {
  questionRows.value.forEach((row, index) => {
    row.questionNo = String(index + 1)
  })
}

function handleQuestionSceneChange(row: LayoutQuestionDraft): void {
  if (entryReadonly.value) {
    return
  }
  row.questionType = deriveQuestionType(row.ocrScene)
  row.optionCount = defaultOptionCount(row.ocrScene)
  row.fullScore = defaultFullScore(row.ocrScene)
}

function questionTypeLabel(questionType: LayoutQuestionDraft['questionType']): string {
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
  if (entryReadonly.value) {
    showFormValidationMessage('当前制卷设计不可编辑，无法自动预划区')
    return
  }
  if (!(await confirmRedetectIfNeeded())) {
    sourcePdfFileId.value = props.document?.sourcePdfFileId ?? ''
    return
  }
  startSourceFile()
  patchDocument({ sourcePdfFileId: sourceFileId.trim() })
  emit('auto-detect', sourceFileId.trim())
}

function handleAutoDetect(): void {
  if (entryReadonly.value) {
    showFormValidationMessage('当前制卷设计不可编辑，无法自动预划区')
    return
  }
  if (!sourcePdfFileId.value.trim()) {
    void message.warning('请先上传整卷源文件')
    return
  }
  if (!sourceFileCanAutoDetect.value) {
    showFormValidationMessage('自动预划区仅支持便携文档、文字文档或常见图片格式')
    return
  }
  void startAutoDetect(sourcePdfFileId.value)
}

async function syncUploadedPageMeta(fileId: string): Promise<void> {
  if (entryReadonly.value || !fileId) {
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
            id: createClientSnowflakeId(),
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
    showUserError(error, '源文件页尺寸未解析，请重新上传便携文档、文字文档或图片并完成题目识别')
  }
}

function onSourcePdfChange(fileId: string | undefined): void {
  if (!fileId) {
    return
  }
  if (props.detecting) {
    void message.warning('识别进行中，请等待完成后再更换源文件')
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
    <UiForm layout="vertical" class="layout-entry-gateway__form">
      <UiTooltip
        v-if="!materialLayoutMode"
        title="请先回到考试准备页保存答卷页模式或整卷模式，再进入制卷设计。"
      >
        <UiAlertStrip
          tone="warning"
          title="制卷形态未保存"
          dense
          inline
          :closable="false"
          class="layout-entry-gateway__alert"
        />
      </UiTooltip>

      <div class="layout-entry-gateway__meta">
        <UiFormItem label="制卷名称" class="layout-entry-gateway__meta-name">
          <UiInput
            size="sm"
            v-model="layoutName"
            :disabled="entryReadonly"
            placeholder="如：2025 春季期末试卷"
            @blur="patchDocument({ layoutName })"
          />
        </UiFormItem>
        <UiFormItem class="layout-entry-gateway__meta-margin">
          <template #label>
            <span class="layout-entry-gateway__label">
              安全边距
              <UiTooltip title="印刷裁切留白（毫米），影响页边识别区与题区排版。">
                <QuestionCircleOutlined class="layout-entry-gateway__label-icon" />
              </UiTooltip>
            </span>
          </template>
          <div class="layout-entry-gateway__margin-control">
            <UiInputNumber
              size="sm"
              v-model="printSafeMarginMm"
              :min="3"
              :max="20"
              :disabled="entryReadonly"
              aria-label="安全边距毫米"
              @change="patchDocument({ printSafeMarginMm })"
            />
            <span class="layout-entry-gateway__unit">mm</span>
          </div>
        </UiFormItem>
      </div>

      <template v-if="isFullPaperMode">
        <UiFormItem>
          <template #label>
            <span class="layout-entry-gateway__label">
              整卷源文件
              <UiTooltip
                title="支持 PDF / Word / PNG / JPG；上传后将异步识别题目、分页入库并生成题单。"
              >
                <QuestionCircleOutlined class="layout-entry-gateway__label-icon" />
              </UiTooltip>
            </span>
          </template>
          <UiPlatformFileField
            v-model:file-node-id="sourcePdfFileId"
            v-model:file-name="sourcePdfFileName"
            :scene-key="FileUploadSceneKey.MARK_EXAM_TEMPLATE"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
            :disabled="entryReadonly"
            variant="dragger"
            button-text="上传源文件"
            tip="支持 PDF / Word / PNG / JPG，单文件上传"
            @update:file-node-id="onSourcePdfChange"
          />
        </UiFormItem>
        <UiButton
          size="sm"
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
        <UiFormItem>
          <template #label>
            <span class="layout-entry-gateway__label">
              纸型
              <UiTooltip :title="paperSpecTooltip">
                <QuestionCircleOutlined class="layout-entry-gateway__label-icon" />
              </UiTooltip>
            </span>
          </template>
          <UiSelect
            size="sm"
            v-model="paperSpec"
            :options="paperSpecOptions"
            :disabled="entryReadonly"
          />
        </UiFormItem>
        <UiFormItem label="题目结构">
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
              <UiInput
                v-model="row.questionNo"
                size="small"
                :disabled="entryReadonly"
                aria-label="题号"
              />
              <UiSelect
                v-model="row.ocrScene"
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
              <UiInputNumber
                v-model="row.fullScore"
                size="sm"
                :min="0.5"
                :max="100"
                :step="0.5"
                :disabled="entryReadonly"
                aria-label="满分"
              />
              <UiInputNumber
                v-model="row.optionCount"
                size="sm"
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
        </UiFormItem>
        <UiButton
          size="sm"
          block
          variant="primary"
          :loading="generating"
          :disabled="entryReadonly"
          @click="handleGenerateSheet"
        >
          生成标准答题卡
        </UiButton>
      </template>
    </UiForm>
  </section>
</template>

<style scoped lang="scss">
.layout-entry-gateway {
  max-width: 720px;
  padding: var(--dp-space-3) var(--dp-space-4);

  &__form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__alert {
    margin-bottom: var(--dp-space-2);
  }

  &__meta {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 112px;
    gap: var(--dp-space-3);
    align-items: start;
  }

  &__meta-margin :deep(.ant-input-number) {
    width: 100%;
  }

  &__margin-control {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
  }

  &__unit {
    flex-shrink: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__label {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-1);
  }

  &__label-icon {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
    cursor: help;
  }

  &__form :deep(.ant-form-item) {
    margin-bottom: 10px;
  }

  &__form :deep(.ant-upload.ant-upload-drag) {
    padding: 12px 8px;
  }

  &__form :deep(.ant-upload-drag-icon .anticon) {
    font-size: 28px !important;
  }

  &__form :deep(.ant-upload-text) {
    font-size: var(--dp-font-size-sm) !important;
  }

  &__quick-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-2);
    margin-bottom: var(--dp-space-2);
  }

  &__quick-button,
  &__remove-button {
    height: 26px;
    padding: 0 var(--dp-space-2);
    border: 1px solid var(--dp-border-subtle);
    border-radius: var(--dp-radius-control);
    background: var(--dp-bg-container);
    color: var(--dp-text-primary);
    font-size: var(--dp-font-size-xs);
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
    gap: var(--dp-space-2);
    max-height: 360px;
    overflow: auto;
    padding-right: 2px;
  }

  &__question-head,
  &__question-row {
    display: grid;
    grid-template-columns: 48px minmax(112px, 1.2fr) 42px 62px 58px 44px;
    gap: var(--dp-space-2);
    align-items: center;
  }

  &__question-head {
    position: sticky;
    top: 0;
    z-index: 1;
    min-height: 24px;
    background: var(--dp-bg-container);
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-xs);
  }

  &__question-row {
    min-height: 30px;
  }

  &__type-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 22px;
    border-radius: var(--dp-radius-control);
    font-size: var(--dp-font-size-xs);
    font-weight: var(--dp-font-weight-emphasis);

    &--objective {
      background: var(--dp-color-primary-bg);
      color: var(--dp-color-primary-active);
    }

    &--subjective {
      background: var(--dp-purple-50);
      color: var(--dp-purple-700);
    }
  }

  &__remove-button {
    width: 44px;
    padding: 0;
  }
}

@media (max-width: 640px) {
  .layout-entry-gateway__meta {
    grid-template-columns: 1fr;
  }
}
</style>
