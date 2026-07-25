<script setup lang="ts">
import type {
  ExamLayoutBlockDto,
  ExamLayoutDocument,
  ExamLayoutQuestionDto,
} from '@/apis/mark/exam-layout-design'
import { computed } from 'vue'
import { MarkOcrSceneDescription } from '@/apis/mark/ocr-scene'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import {
  findPrimaryAnswerBlockForQuestion,
  findPrimaryBlockForQuestion,
  isLayoutQuestionRoiReady,
} from '@/utils/exam-layout-designer'
import { ROI_NOT_CONFIGURED_LABEL } from '@/utils/format-exam-layout-question-summary'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  document: ExamLayoutDocument | null
  focusedQuestionId: string | null
  focusedBlockId: string | null
}>()

const emit = defineEmits<{
  'focus-question': [question: ExamLayoutQuestionDto | null]
  'focus-block': [block: ExamLayoutBlockDto | null, pageNo: number]
}>()

const sortedQuestions = computed(() =>
  [...(props.document?.questions ?? [])].sort(
    (a, b) => (a.sortNo ?? 0) - (b.sortNo ?? 0) || a.questionNo.localeCompare(b.questionNo),
  ),
)

function questionStemPreview(question: ExamLayoutQuestionDto): string {
  if (!question.questionStem?.trim()) {
    return '题干待补全'
  }
  return question.questionStem.length > 36
    ? `${question.questionStem.slice(0, 36)}...`
    : question.questionStem
}

function handleQuestionClick(question: ExamLayoutQuestionDto): void {
  emit('focus-question', question)
  const answerBlock = findPrimaryAnswerBlockForQuestion(props.document, question.id)
  if (answerBlock) {
    emit('focus-block', answerBlock, answerBlock.pageNo)
    return
  }
  const questionBlock = findPrimaryBlockForQuestion(props.document, question.id)
  emit('focus-block', questionBlock, questionBlock?.pageNo ?? 1)
}

function formatOcrSceneLabel(question: ExamLayoutQuestionDto): string {
  return question.ocrScene
    ? strictEnumLabel(MarkOcrSceneDescription, question.ocrScene, 'OCR 场景')
    : ''
}

function formatQuestionTypeLabel(question: ExamLayoutQuestionDto): string {
  return strictEnumLabel(QuestionTypeDescription, question.questionType, '题型')
}
</script>

<template>
  <section class="layout-question-outline">
    <div class="layout-question-outline__header">
      <h2 class="layout-question-outline__title">题目清单</h2>
      <span class="layout-question-outline__count">{{ sortedQuestions.length }} 题</span>
    </div>
    <ul v-if="sortedQuestions.length > 0" class="layout-question-outline__list">
      <li
        v-for="question in sortedQuestions"
        :key="question.id"
        class="layout-question-outline__item"
        :class="{
          'layout-question-outline__item--active': focusedQuestionId === question.id,
          'layout-question-outline__item--warning': !isLayoutQuestionRoiReady(
            document,
            question.id,
          ),
        }"
        @click="handleQuestionClick(question)"
      >
        <div class="layout-question-outline__row">
          <span class="layout-question-outline__no">第 {{ question.questionNo }} 题</span>
          <UiTag
            :tone="isLayoutQuestionRoiReady(document, question.id) ? 'green' : 'orange'"
            size="sm"
          >
            {{
              isLayoutQuestionRoiReady(document, question.id)
                ? 'ROI 就绪'
                : ROI_NOT_CONFIGURED_LABEL
            }}
          </UiTag>
        </div>
        <p v-if="question.ocrScene" class="layout-question-outline__scene">
          {{ formatOcrSceneLabel(question) }}
          · {{ formatQuestionTypeLabel(question) }} · {{ question.fullScore ?? '-' }} 分
        </p>
        <p v-else class="layout-question-outline__scene">
          OCR 场景待配置 · {{ question.fullScore ?? '-' }} 分
        </p>
        <p class="layout-question-outline__stem">{{ questionStemPreview(question) }}</p>
      </li>
    </ul>
    <p v-else class="layout-question-outline__empty">上传整卷源文件后将自动识别题目并生成题单</p>
    <UiButton size="sm" v-if="sortedQuestions.length > 0" block variant="outline" disabled>
      添加题目（整卷模式由预划区生成）
    </UiButton>
  </section>
</template>

<style scoped lang="scss">
.layout-question-outline {
  height: 100%;
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__count {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-tight);
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  &__item {
    padding: var(--dp-space-component-tight);
    border: 1px solid var(--dp-border-subtle);
    border-radius: 6px;
    cursor: pointer;
    transition:
      border-color var(--dp-duration-normal) var(--dp-ease-default),
      background var(--dp-duration-normal) var(--dp-ease-default);

    &:hover {
      border-color: var(--dp-color-primary);
      background: var(--dp-fill-tertiary);
    }

    &--active {
      border-color: var(--dp-color-primary);
      background: var(--dp-color-primary-bg);
    }

    &--warning {
      border-color: var(--dp-warning);
      background: var(--dp-warning-bg);
    }
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component-xs);
  }

  &__no {
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__scene,
  &__stem {
    margin: 0;
    font-size: var(--dp-font-size-xs);
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }

  &__stem {
    margin-top: 2px;
    color: var(--dp-text-primary);
  }

  &__empty {
    margin: 0;
    font-size: var(--dp-font-size-xs);
    line-height: 1.5;
    color: var(--dp-text-secondary);
  }
}
</style>
