<script setup lang="ts">
import type { ExamLayoutDocument, ExamLayoutQuestionDto } from '@/apis/mark/exam-layout-design'
import type {
  ExamQuestionDeclaredOptionRequest,
  ExamQuestionStandardAnswerOptionRequest,
  ObjectiveComparePolicyCode,
} from '@/apis/mark/exam-standard-answer'
import { computed } from 'vue'
import {
  OBJECTIVE_COMPARE_POLICY_OPTIONS,
  ObjectiveComparePolicyCode as ObjectiveComparePolicy,
} from '@/apis/mark/exam-standard-answer'
import { QuestionTypeCode, QuestionTypeDescription } from '@/apis/mark/question-type'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import {
  ALL_MARK_OCR_SCENE_CODES,
  MarkOcrSceneCode,
  MarkOcrSceneDescription,
} from '@/types/enums/mark-ocr-scene-enum'
import {
  findPrimaryAnswerBlockForQuestion,
  isLayoutQuestionRoiReady,
} from '@/utils/exam-layout-designer'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  document: ExamLayoutDocument | null
  question: ExamLayoutQuestionDto | null
  /**
   * MVR-388：默认拒绝假可写；仅父层显式 readonly===false（layoutWritable）可改题属性。
   */
  readonly?: boolean
}>()

const emit = defineEmits<{
  patch: [document: ExamLayoutDocument]
}>()

/** MVR-388：未声明或 true 均只读 */
const fieldReadonly = computed(() => props.readonly !== false)

const OCR_SCENE_OPTIONS = ALL_MARK_OCR_SCENE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(MarkOcrSceneDescription, value, 'OCR 场景'),
}))

const focusedQuestion = computed(() => props.question)

const sourcePageNo = computed(() => {
  if (!props.document || !props.question) {
    return null
  }
  const block = findPrimaryAnswerBlockForQuestion(props.document, props.question.id)
  return block?.pageNo ?? null
})

const roiReady = computed(() =>
  props.question ? isLayoutQuestionRoiReady(props.document, props.question.id) : false,
)

function patchQuestion(partial: Partial<ExamLayoutQuestionDto>): void {
  // MVR-388：handler 二次闸，禁止仅靠控件 disabled
  if (fieldReadonly.value || !props.document || !props.question) {
    return
  }
  const questions = props.document.questions.map((item) =>
    item.id === props.question?.id ? { ...item, ...partial } : item,
  )
  emit('patch', { ...props.document, questions })
}

function patchQuestionAnswer(partial: NonNullable<ExamLayoutQuestionDto['answer']>): void {
  if (fieldReadonly.value || !focusedQuestion.value) {
    return
  }
  patchQuestion({
    answer: {
      ...(focusedQuestion.value.answer ?? {}),
      ...partial,
      effectiveNow: partial.effectiveNow ?? focusedQuestion.value.answer?.effectiveNow ?? true,
    },
  })
}

const focusedOcrScene = computed({
  get: (): MarkOcrSceneCode | undefined => focusedQuestion.value?.ocrScene,
  set: (value: MarkOcrSceneCode | undefined) => {
    if (value) {
      onOcrSceneChange(value)
    }
  },
})

const focusedComparePolicy = computed({
  get: (): ObjectiveComparePolicyCode | undefined => focusedQuestion.value?.answer?.comparePolicy,
  set: (value: ObjectiveComparePolicyCode | undefined) => {
    if (value) {
      updateComparePolicy(value)
    }
  },
})

function onOcrSceneChange(value: MarkOcrSceneCode): void {
  const objectiveScenes = new Set<MarkOcrSceneCode>([
    MarkOcrSceneCode.CHOICE,
    MarkOcrSceneCode.TRUE_FALSE,
    MarkOcrSceneCode.FILL_BLANK,
    MarkOcrSceneCode.NUMERIC,
  ])
  patchQuestion({
    ocrScene: value,
    questionType: objectiveScenes.has(value)
      ? QuestionTypeCode.OBJECTIVE
      : QuestionTypeCode.SUBJECTIVE,
    answer: {
      ...(focusedQuestion.value?.answer ?? {}),
      comparePolicy: defaultComparePolicy(value),
      effectiveNow: true,
    },
  })
}

function formatQuestionTypeLabel(question: ExamLayoutQuestionDto): string {
  return strictEnumLabel(QuestionTypeDescription, question.questionType, '题型')
}

function defaultComparePolicy(ocrScene?: MarkOcrSceneCode): ObjectiveComparePolicyCode | undefined {
  if (ocrScene === MarkOcrSceneCode.CHOICE || ocrScene === MarkOcrSceneCode.TRUE_FALSE) {
    return ObjectiveComparePolicy.CHOICE_SET
  }
  if (ocrScene === MarkOcrSceneCode.NUMERIC) {
    return ObjectiveComparePolicy.NUMERIC_TOLERANCE
  }
  if (ocrScene === MarkOcrSceneCode.FILL_BLANK) {
    return ObjectiveComparePolicy.EXACT_NORMALIZED
  }
  return undefined
}

function updateComparePolicy(value: ObjectiveComparePolicyCode): void {
  patchQuestionAnswer({ comparePolicy: value, effectiveNow: true })
}

function parseOptionText(value: string): ExamQuestionDeclaredOptionRequest[] {
  return value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((optionLabel, index) => ({ optionLabel, sortNo: index + 1 }))
}

function formatOptions(
  options?: Array<ExamQuestionDeclaredOptionRequest | ExamQuestionStandardAnswerOptionRequest>,
): string {
  return (options ?? [])
    .slice()
    .sort((a, b) => (a.sortNo ?? 0) - (b.sortNo ?? 0))
    .map((item) => item.optionLabel)
    .join(',')
}

function updateDeclaredOptions(value: string): void {
  patchQuestionAnswer({ declaredOptions: parseOptionText(value), effectiveNow: true })
}

function updateChoiceOptions(value: string): void {
  patchQuestionAnswer({ choiceOptions: parseOptionText(value), effectiveNow: true })
}

function requiresDeclaredOptions(question: ExamLayoutQuestionDto): boolean {
  return question.questionType === QuestionTypeCode.OBJECTIVE
    && (question.ocrScene === MarkOcrSceneCode.CHOICE || question.ocrScene === MarkOcrSceneCode.TRUE_FALSE)
}

function hasNonBlankOption(
  options?: Array<ExamQuestionDeclaredOptionRequest | ExamQuestionStandardAnswerOptionRequest>,
): boolean {
  return Boolean(options?.some((option) => option.optionLabel?.trim()))
}

function answerCompletenessHint(question: ExamLayoutQuestionDto): string {
  const answer = question.answer
  if (question.questionType === QuestionTypeCode.SUBJECTIVE) {
    if (answer?.standardAnswer?.trim() || answer?.gradingRubric?.trim()) {
      return '已配置主观题评分依据'
    }
    return '主观题需填写参考答案或评分细则'
  }
  if (!answer?.comparePolicy) {
    return '客观题需选择比较策略'
  }
  if (requiresDeclaredOptions(question) && !hasNonBlankOption(answer.declaredOptions)) {
    return '当前题型需填写选项空间'
  }
  if (answer.comparePolicy === ObjectiveComparePolicy.CHOICE_SET) {
    if (hasNonBlankOption(answer.choiceOptions)) {
      return '已配置选项空间与正确答案'
    }
    return '当前策略需填写正确选项'
  }
  if (answer.comparePolicy === ObjectiveComparePolicy.NUMERIC_TOLERANCE) {
    return answer.numericExpectedValue != null ? '已配置数值容差答案' : '数值题需填写标准值'
  }
  if (answer.comparePolicy === ObjectiveComparePolicy.AI_GRADE) {
    return answer.gradingRubric?.trim() ? '已配置 AI 评分细则' : 'AI 评分需填写评分细则'
  }
  return answer.standardAnswer?.trim() ? '已配置标准答案' : '请填写标准答案'
}
</script>

<template>
  <section class="layout-question-property">
    <h2 class="layout-question-property__title">题目属性</h2>
    <UiEmpty v-if="!focusedQuestion" size="sm" description="在左侧题单中选择题目" />
    <UiForm v-else layout="vertical" class="layout-question-property__form">
      <UiFormItem label="题号">
        <UiInput
          size="sm"
          :model-value="focusedQuestion.questionNo"
          :disabled="fieldReadonly"
          @update:model-value="
            (value) =>
              patchQuestion({
                questionNo: String(value ?? ''),
                normalizedQuestionNo: String(value ?? ''),
              })
          "
        />
      </UiFormItem>
      <UiFormItem label="OCR 场景">
        <UiSelect
          size="sm" v-model="focusedOcrScene" :options="OCR_SCENE_OPTIONS" :disabled="fieldReadonly"
        />
      </UiFormItem>
      <UiFormItem label="题型">
        <UiInput
          size="sm" :value="formatQuestionTypeLabel(focusedQuestion)" disabled
        />
      </UiFormItem>
      <UiFormItem label="满分">
        <UiInputNumber
          size="sm"
          :model-value="focusedQuestion.fullScore"
          :min="0.5"
          :max="100"
          :step="0.5"
          style="width: 100%"
          :disabled="fieldReadonly"
          @change="(value) => patchQuestion({ fullScore: Number(value) || 0 })"
        />
      </UiFormItem>
      <UiFormItem label="题干">
        <UiTextarea
          size="sm"
          :model-value="focusedQuestion.questionStem"
          :rows="5"
          placeholder="自动预划区会回填切题文本，可在此核对修正"
          :disabled="fieldReadonly"
          @update:model-value="(value) => patchQuestion({ questionStem: String(value ?? '') })"
        />
      </UiFormItem>
      <UiDivider />
      <UiFormItem label="答案资产状态">
        <UiInput
          size="sm" :value="answerCompletenessHint(focusedQuestion)" disabled
        />
      </UiFormItem>
      <UiFormItem
        v-if="focusedQuestion.questionType === QuestionTypeCode.OBJECTIVE"
        label="比较策略"
      >
        <UiSelect
          size="sm"
          v-model="focusedComparePolicy"
          :options="OBJECTIVE_COMPARE_POLICY_OPTIONS"
          :disabled="fieldReadonly"
        />
      </UiFormItem>
      <template v-if="focusedQuestion.answer?.comparePolicy === ObjectiveComparePolicy.CHOICE_SET">
        <UiFormItem label="声明选项">
          <UiInput
            size="sm"
            :model-value="formatOptions(focusedQuestion.answer?.declaredOptions)"
            placeholder="A,B,C,D"
            :disabled="fieldReadonly"
            @update:model-value="(value) => updateDeclaredOptions(String(value ?? ''))"
          />
        </UiFormItem>
        <UiFormItem label="正确选项">
          <UiInput
            size="sm"
            :model-value="formatOptions(focusedQuestion.answer?.choiceOptions)"
            placeholder="A 或 A,C"
            :disabled="fieldReadonly"
            @update:model-value="(value) => updateChoiceOptions(String(value ?? ''))"
          />
        </UiFormItem>
      </template>
      <template
        v-else-if="
          focusedQuestion.answer?.comparePolicy === ObjectiveComparePolicy.NUMERIC_TOLERANCE
        "
      >
        <UiFormItem label="数值标准值">
          <UiInputNumber
            size="sm"
            :model-value="focusedQuestion.answer?.numericExpectedValue"
            style="width: 100%"
            :disabled="fieldReadonly"
            @change="
              (value) =>
                patchQuestionAnswer({ numericExpectedValue: Number(value), effectiveNow: true })
            "
          />
        </UiFormItem>
        <UiFormItem label="允许误差">
          <UiInputNumber
            size="sm"
            :model-value="focusedQuestion.answer?.numericTolerance"
            :min="0"
            style="width: 100%"
            :disabled="fieldReadonly"
            @change="
              (value) =>
                patchQuestionAnswer({ numericTolerance: Number(value), effectiveNow: true })
            "
          />
        </UiFormItem>
        <UiFormItem label="单位">
          <UiInput
            size="sm"
            :model-value="focusedQuestion.answer?.numericUnit"
            :disabled="fieldReadonly"
            @update:model-value="
              (value) =>
                patchQuestionAnswer({
                  numericUnit: String(value ?? ''),
                  effectiveNow: true,
                })
            "
          />
        </UiFormItem>
      </template>
      <UiFormItem v-else label="标准答案">
        <UiTextarea
          size="sm"
          :model-value="focusedQuestion.answer?.standardAnswer"
          :rows="3"
          :disabled="fieldReadonly"
          @update:model-value="
            (value) =>
              patchQuestionAnswer({
                standardAnswer: String(value ?? ''),
                effectiveNow: true,
              })
          "
        />
      </UiFormItem>
      <UiFormItem label="答案解析">
        <UiTextarea
          size="sm"
          :model-value="focusedQuestion.answer?.answerExplain"
          :rows="3"
          :disabled="fieldReadonly"
          @update:model-value="
            (value) =>
              patchQuestionAnswer({
                answerExplain: String(value ?? ''),
                effectiveNow: true,
              })
          "
        />
      </UiFormItem>
      <UiFormItem label="评分细则">
        <UiTextarea
          size="sm"
          :model-value="focusedQuestion.answer?.gradingRubric"
          :rows="4"
          :disabled="fieldReadonly"
          @update:model-value="
            (value) =>
              patchQuestionAnswer({
                gradingRubric: String(value ?? ''),
                effectiveNow: true,
              })
          "
        />
      </UiFormItem>
      <UiFormItem label="AI 评分提示">
        <UiTextarea
          size="sm"
          :model-value="focusedQuestion.answer?.aiHint"
          :rows="3"
          :disabled="fieldReadonly"
          @update:model-value="
            (value) =>
              patchQuestionAnswer({
                aiHint: String(value ?? ''),
                effectiveNow: true,
              })
          "
        />
      </UiFormItem>
      <UiFormItem label="页面来源">
        <UiInput
          size="sm" :value="sourcePageNo ? `第 ${sourcePageNo} 页` : '未配置 ROI'" disabled
        />
      </UiFormItem>
      <UiFormItem label="ROI 状态">
        <UiInput
          size="sm" :value="roiReady ? '主作答区已配置' : '主作答区未配置'" disabled
        />
      </UiFormItem>
    </UiForm>
  </section>
</template>

<style scoped lang="scss">
.layout-question-property {
  height: 100%;
  padding: 12px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-bg-container);
  overflow: auto;

  &__title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }
}
</style>
