<script setup lang="ts">
import type { ExamLayoutDocument, ExamLayoutQuestionDto } from '@/apis/mark/exam-layout-design'
import type {
  ExamQuestionDeclaredOptionRequest,
  ExamQuestionStandardAnswerOptionRequest,
  ObjectiveComparePolicyCode,
} from '@/apis/mark/exam-standard-answer'
import {
  OBJECTIVE_COMPARE_POLICY_OPTIONS,
  ObjectiveComparePolicyCode as ObjectiveComparePolicy,
} from '@/apis/mark/exam-standard-answer'
import { computed } from 'vue'
import { QuestionTypeCode, QuestionTypeDescription } from '@/apis/mark/question-type'
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
}>()

const emit = defineEmits<{
  patch: [document: ExamLayoutDocument]
}>()

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
  if (!props.document || !props.question) {
    return
  }
  const questions = props.document.questions.map((item) =>
    item.id === props.question?.id ? { ...item, ...partial } : item,
  )
  emit('patch', { ...props.document, questions })
}

function patchQuestionAnswer(partial: NonNullable<ExamLayoutQuestionDto['answer']>): void {
  if (!focusedQuestion.value) {
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
  if (answer.comparePolicy === ObjectiveComparePolicy.CHOICE_SET) {
    if ((answer.declaredOptions?.length ?? 0) > 0 && (answer.choiceOptions?.length ?? 0) > 0) {
      return '已配置选项空间与正确答案'
    }
    return '选择题需填写选项空间和正确选项'
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
    <a-empty v-if="!focusedQuestion" description="在左侧题单中选择题目" />
    <a-form v-else layout="vertical" class="layout-question-property__form">
      <a-form-item label="题号">
        <a-input
          :value="focusedQuestion.questionNo"
          @change="
            patchQuestion({
              questionNo: ($event.target as HTMLInputElement).value,
              normalizedQuestionNo: ($event.target as HTMLInputElement).value,
            })
          "
        />
      </a-form-item>
      <a-form-item label="OCR 场景">
        <a-select v-model:value="focusedOcrScene" :options="OCR_SCENE_OPTIONS" />
      </a-form-item>
      <a-form-item label="题型">
        <a-input :value="formatQuestionTypeLabel(focusedQuestion)" disabled />
      </a-form-item>
      <a-form-item label="满分">
        <a-input-number
          :value="focusedQuestion.fullScore"
          :min="0.5"
          :max="100"
          :step="0.5"
          style="width: 100%"
          @change="patchQuestion({ fullScore: Number($event) || 0 })"
        />
      </a-form-item>
      <a-form-item label="题干">
        <a-textarea
          :value="focusedQuestion.questionStem"
          :rows="5"
          placeholder="自动预划区会回填切题文本，可在此核对修正"
          @change="patchQuestion({ questionStem: ($event.target as HTMLTextAreaElement).value })"
        />
      </a-form-item>
      <a-divider />
      <a-form-item label="答案资产状态">
        <a-input :value="answerCompletenessHint(focusedQuestion)" disabled />
      </a-form-item>
      <a-form-item
        v-if="focusedQuestion.questionType === QuestionTypeCode.OBJECTIVE"
        label="比较策略"
      >
        <a-select
          v-model:value="focusedComparePolicy"
          :options="OBJECTIVE_COMPARE_POLICY_OPTIONS"
        />
      </a-form-item>
      <template v-if="focusedQuestion.answer?.comparePolicy === ObjectiveComparePolicy.CHOICE_SET">
        <a-form-item label="声明选项">
          <a-input
            :value="formatOptions(focusedQuestion.answer?.declaredOptions)"
            placeholder="A,B,C,D"
            @change="updateDeclaredOptions(($event.target as HTMLInputElement).value)"
          />
        </a-form-item>
        <a-form-item label="正确选项">
          <a-input
            :value="formatOptions(focusedQuestion.answer?.choiceOptions)"
            placeholder="A 或 A,C"
            @change="updateChoiceOptions(($event.target as HTMLInputElement).value)"
          />
        </a-form-item>
      </template>
      <template
        v-else-if="
          focusedQuestion.answer?.comparePolicy === ObjectiveComparePolicy.NUMERIC_TOLERANCE
        "
      >
        <a-form-item label="数值标准值">
          <a-input-number
            :value="focusedQuestion.answer?.numericExpectedValue"
            style="width: 100%"
            @change="
              patchQuestionAnswer({ numericExpectedValue: Number($event), effectiveNow: true })
            "
          />
        </a-form-item>
        <a-form-item label="允许误差">
          <a-input-number
            :value="focusedQuestion.answer?.numericTolerance"
            :min="0"
            style="width: 100%"
            @change="patchQuestionAnswer({ numericTolerance: Number($event), effectiveNow: true })"
          />
        </a-form-item>
        <a-form-item label="单位">
          <a-input
            :value="focusedQuestion.answer?.numericUnit"
            @change="
              patchQuestionAnswer({
                numericUnit: ($event.target as HTMLInputElement).value,
                effectiveNow: true,
              })
            "
          />
        </a-form-item>
      </template>
      <a-form-item v-else label="标准答案">
        <a-textarea
          :value="focusedQuestion.answer?.standardAnswer"
          :rows="3"
          @change="
            patchQuestionAnswer({
              standardAnswer: ($event.target as HTMLTextAreaElement).value,
              effectiveNow: true,
            })
          "
        />
      </a-form-item>
      <a-form-item label="答案解析">
        <a-textarea
          :value="focusedQuestion.answer?.answerExplain"
          :rows="3"
          @change="
            patchQuestionAnswer({
              answerExplain: ($event.target as HTMLTextAreaElement).value,
              effectiveNow: true,
            })
          "
        />
      </a-form-item>
      <a-form-item label="评分细则">
        <a-textarea
          :value="focusedQuestion.answer?.gradingRubric"
          :rows="4"
          @change="
            patchQuestionAnswer({
              gradingRubric: ($event.target as HTMLTextAreaElement).value,
              effectiveNow: true,
            })
          "
        />
      </a-form-item>
      <a-form-item label="AI 评分提示">
        <a-textarea
          :value="focusedQuestion.answer?.aiHint"
          :rows="3"
          @change="
            patchQuestionAnswer({
              aiHint: ($event.target as HTMLTextAreaElement).value,
              effectiveNow: true,
            })
          "
        />
      </a-form-item>
      <a-form-item label="页面来源">
        <a-input :value="sourcePageNo ? `第 ${sourcePageNo} 页` : '未配置 ROI'" disabled />
      </a-form-item>
      <a-form-item label="ROI 状态">
        <a-input :value="roiReady ? '主作答区已配置' : '主作答区未配置'" disabled />
      </a-form-item>
    </a-form>
  </section>
</template>

<style scoped lang="scss">
.layout-question-property {
  height: 100%;
  padding: 12px;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: #fff;
  overflow: auto;

  &__title {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }
}
</style>
