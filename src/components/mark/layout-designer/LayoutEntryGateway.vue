<script setup lang="ts">
import type { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type { AnswerBookletSourceModeCode } from '@/types/enums/answer-booklet-source-mode-enum'
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
  ExamLayoutPaperSpecCode,
  ExamLayoutPaperSpecOptions,
} from '@/types/enums/exam-layout-paper-spec-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { layoutHasSourceFileDetectResult } from '@/utils/exam-layout-designer'

const props = withDefaults(
  defineProps<{
    document: ExamLayoutDocument | null
    examId: string
    materialLayoutMode?: ExamMaterialLayoutModeCode
    answerBookletSourceMode?: AnswerBookletSourceModeCode
    generating?: boolean
    detecting?: boolean
    /** MVR-973：默认拒绝；仅父层显式 false 可写 */
    readonly?: boolean
  }>(),
  {
    readonly: true,
    generating: false,
    detecting: false,
  },
)

const emit = defineEmits<{
  'generate-sheet': [paperSpec: ExamLayoutPaperSpecCode]
  'import-institution-answer-booklet': [sourceFileId: string]
  'auto-detect': [sourcePdfFileId: string]
  "patch": [document: ExamLayoutDocument]
}>()

const PAPER_SPEC_TOOLTIP: Partial<Record<ExamLayoutPaperSpecCode, string>> = {
  [ExamLayoutPaperSpecCode.A3_2COL]: 'A3 横向物理面：每面并排承载 2 个 A4 逻辑页；印张正反面与必扫范围由实际总页数和考试扫描范围生成。',
  [ExamLayoutPaperSpecCode.A4_1COL]: 'A4 物理面：每面承载 1 个 A4 逻辑页；多页时按实际页序生成印张与正反面合同。',
}

const sourcePdfFileId = ref(props.document?.sourcePdfFileId ?? '')
const sourcePdfFileName = ref('')
const answerBookletSourceFileId = ref(props.document?.answerBookletSourceFileId ?? '')
const answerBookletSourceFileName = ref('')
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
  ?? ExamLayoutPaperSpecCode.A3_2COL,
)
const layoutName = ref(props.document?.layoutName ?? '')
const printSafeMarginMm = ref(props.document?.printSafeMarginMm ?? 5)

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
const usesInstitutionAnswerBooklet = computed(
  () => props.answerBookletSourceMode === 'INSTITUTION_TEMPLATE',
)
const governedPaperReady = computed(() => Boolean(sourcePdfFileId.value.trim()))
const governedPaperDetected = computed(
  () => props.document?.layoutEntryKind === ExamLayoutEntryKindCode.PAPER_WITH_ANSWER_SHEET
    && (props.document.pages?.some((page) => page.pageKind === 'EXAM_PAPER') ?? false)
    && (props.document.questions?.length ?? 0) > 0,
)
/** 只读或未选材料版式模式时不可写 */
const entryReadonly = computed(() => props.readonly !== false || !props.materialLayoutMode)

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
  const entryKind = isAnswerSheetMode.value
    ? ExamLayoutEntryKindCode.PAPER_WITH_ANSWER_SHEET
    : ExamLayoutEntryKindCode.SOURCE_FILE
  return {
    ...nextDocument,
    examId: props.examId,
    layoutEntryKind: entryKind,
    layoutName: layoutName.value || (isAnswerSheetMode.value ? '试题卷+答题纸' : '单独试卷源文件'),
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
    showFormValidationMessage('当前制卷设计不可编辑，无法生成答题纸')
    return
  }
  if (!governedPaperDetected.value) {
    void message.warning('请先识别命题治理 A 卷并核对题目结构')
    return
  }
  patchDocument({ paperSpec: paperSpec.value })
  emit('generate-sheet', paperSpec.value)
}

function handleInstitutionAnswerBookletImport(): void {
  if (entryReadonly.value) {
    showFormValidationMessage('当前制卷设计不可编辑，无法导入学校答题纸')
    return
  }
  if (!governedPaperDetected.value) {
    void message.warning('请先识别命题治理 A 卷并核对题目结构')
    return
  }
  if (!answerBookletSourceFileId.value.trim()) {
    void message.warning('请上传学校统一答题纸')
    return
  }
  emit('import-institution-answer-booklet', answerBookletSourceFileId.value.trim())
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
            pageNo: 1,
            backgroundFileId: fileId,
            naturalWidthPx: meta.naturalWidthPx,
            naturalHeightPx: meta.naturalHeightPx,
          },
        ]
    emit('patch', {
      ...sourceDocument,
      examId: props.examId,
      layoutEntryKind: isAnswerSheetMode.value
        ? ExamLayoutEntryKindCode.PAPER_WITH_ANSWER_SHEET
        : ExamLayoutEntryKindCode.SOURCE_FILE,
      sourcePdfFileId: fileId,
      pages,
      totalPages: Math.max(sourceDocument.totalPages ?? 1, pages.length),
    })
  } catch (error) {
    emit('patch', {
      ...sourceDocument,
      examId: props.examId,
      layoutEntryKind: isAnswerSheetMode.value
        ? ExamLayoutEntryKindCode.PAPER_WITH_ANSWER_SHEET
        : ExamLayoutEntryKindCode.SOURCE_FILE,
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
  if (props.detecting === true) {
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
        title="请先回到考试准备页保存单独试卷或试卷+答题页形态，再进入制卷设计。"
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
        <UiFormItem v-if="!usesInstitutionAnswerBooklet">
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
          v-if="!usesInstitutionAnswerBooklet"
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
        <UiAlertStrip
          :tone="governedPaperReady ? (governedPaperDetected ? 'success' : 'info') : 'warning'"
          :title="governedPaperReady
            ? (governedPaperDetected ? 'A 卷题目与试题页已识别' : '已关联命题治理 A 卷，等待识别')
            : '命题治理尚未配置 A 卷源文件'"
          :description="governedPaperReady
            ? '组合版式只使用当前 A 卷，不接受重复上传；A 卷变化后须重新识别并生成答题纸。'
            : '请先在命题签审中维护 A 卷、答案、评分标准与逐题结构，再返回制卷设计。'"
          dense
          inline
          :closable="false"
          class="layout-entry-gateway__alert"
        />
        <UiButton
          size="sm"
          block
          :variant="governedPaperDetected ? 'outline' : 'primary'"
          :loading="detecting"
          :disabled="entryReadonly || !governedPaperReady || detecting"
          @click="handleAutoDetect"
        >
          {{ governedPaperDetected ? '重新识别当前 A 卷' : '识别当前 A 卷' }}
        </UiButton>
        <template v-if="!usesInstitutionAnswerBooklet">
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
          <UiButton
            size="sm"
            block
            variant="primary"
            :loading="generating === true"
            :disabled="entryReadonly || !governedPaperDetected || detecting"
            @click="handleGenerateSheet"
          >
            生成试题卷+答题纸统一页序
          </UiButton>
        </template>
        <template v-else>
          <UiFormItem label="学校统一答题纸">
            <UiPlatformFileField
              v-model:file-node-id="answerBookletSourceFileId"
              v-model:file-name="answerBookletSourceFileName"
              :scene-key="FileUploadSceneKey.MARK_EXAM_TEMPLATE"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
              :disabled="entryReadonly || detecting || generating"
              variant="dragger"
              button-text="上传答题纸母版"
              tip="支持 PDF / Word / PNG / JPG；导入后须校对身份区与逐题作答区"
            />
          </UiFormItem>
          <UiButton
            size="sm"
            block
            variant="primary"
            :loading="generating === true"
            :disabled="entryReadonly || !governedPaperDetected || detecting
              || !answerBookletSourceFileId.trim()"
            @click="handleInstitutionAnswerBookletImport"
          >
            导入并校对学校答题纸
          </UiButton>
        </template>
      </template>
    </UiForm>
  </section>
</template>

<style scoped lang="scss">
.layout-entry-gateway {
  max-width: 720px;
  padding: var(--dp-space-component) var(--dp-space-block);

  &__form {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__alert {
    margin-bottom: var(--dp-space-component-tight);
  }

  &__meta {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 112px;
    gap: var(--dp-space-component);
    align-items: start;
  }

  &__meta-margin :deep(.ant-input-number) {
    width: 100%;
  }

  &__margin-control {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
  }

  &__unit {
    flex-shrink: 0;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-secondary);
  }

  &__label {
    display: inline-flex;
    align-items: center;
    gap: var(--dp-space-component-xs);
  }

  &__label-icon {
    font-size: var(--dp-type-hint-size);
    color: var(--dp-text-muted);
    cursor: help;
  }

  &__form :deep(.ant-form-item) {
    margin-bottom: var(--dp-space-component);
  }

  &__form :deep(.ant-upload.ant-upload-drag) {
    padding: var(--dp-space-component) var(--dp-space-component-tight);
  }

  &__form :deep(.ant-upload-drag-icon .anticon) {
    font-size: 28px !important;
  }

  &__form :deep(.ant-upload-text) {
    font-size: var(--dp-font-size-sm) !important;
  }

}

@media (max-width: 640px) {
  .layout-entry-gateway__meta {
    grid-template-columns: 1fr;
  }
}
</style>
