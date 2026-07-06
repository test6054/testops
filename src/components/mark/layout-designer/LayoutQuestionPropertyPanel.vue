<script setup lang="ts">
import type { ExamLayoutDocument, ExamLayoutQuestionDto } from '@/apis/mark/exam-layout-design'
import type { MarkOcrSceneCode } from '@/apis/mark/ocr-scene'
import { computed } from 'vue'
import { MARK_OCR_SCENE_LABEL } from '@/apis/mark/ocr-scene'
import { QuestionTypeCode, QuestionTypeDescription } from '@/apis/mark/question-type'
import {
  findPrimaryAnswerBlockForQuestion,
  isLayoutQuestionRoiReady,
} from '@/utils/exam-layout-designer'

const props = defineProps<{
  document: ExamLayoutDocument | null
  question: ExamLayoutQuestionDto | null
}>()

const emit = defineEmits<{
  patch: [document: ExamLayoutDocument]
}>()

const OCR_SCENE_OPTIONS = Object.entries(MARK_OCR_SCENE_LABEL).map(([value, label]) => ({
  value,
  label,
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

function onOcrSceneChange(value: MarkOcrSceneCode): void {
  const objectiveScenes = new Set<MarkOcrSceneCode>(['CHOICE', 'TRUE_FALSE', 'FILL_BLANK', 'NUMERIC'])
  patchQuestion({
    ocrScene: value,
    questionType: objectiveScenes.has(value) ? QuestionTypeCode.OBJECTIVE : QuestionTypeCode.SUBJECTIVE,
  })
}

function formatQuestionTypeLabel(question: ExamLayoutQuestionDto): string {
  return QuestionTypeDescription[question.questionType]
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
          @change="patchQuestion({ questionNo: ($event.target as HTMLInputElement).value, normalizedQuestionNo: ($event.target as HTMLInputElement).value })"
        />
      </a-form-item>
      <a-form-item label="OCR 场景">
        <a-select
          :value="focusedQuestion.ocrScene"
          :options="OCR_SCENE_OPTIONS"
          @change="onOcrSceneChange($event as MarkOcrSceneCode)"
        />
      </a-form-item>
      <a-form-item label="题型">
        <a-input
          :value="formatQuestionTypeLabel(focusedQuestion)"
          disabled
        />
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
