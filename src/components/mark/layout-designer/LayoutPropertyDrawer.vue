<script setup lang="ts">
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { computed } from 'vue'
import { QuestionTypeDescription } from '@/apis/mark/question-type'
import {
  ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES,
  ExamLayoutBlockTypeCode,
  ExamLayoutBlockTypeOptions,
} from '@/types/enums/exam-layout-block-type-enum'

const props = defineProps<{
  document: ExamLayoutDocument | null
  block: ExamLayoutBlockDto | null
}>()

const emit = defineEmits<{
  patch: [document: ExamLayoutDocument]
}>()

const blockTypeOptions = ExamLayoutBlockTypeOptions

const questionOptions = computed(() => {
  const questions = (props.document?.questions ?? []).filter((question) => {
    if (props.block?.blockType === ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX) {
      return question.questionType === 'OBJECTIVE'
    }
    if (props.block?.blockType === ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER) {
      return question.questionType === 'SUBJECTIVE'
    }
    return true
  })
  return questions.map((question) => ({
    value: question.id,
    label: `${question.questionNo} · ${
      QuestionTypeDescription[question.questionType as keyof typeof QuestionTypeDescription]
      ?? question.questionType
    }`,
  }))
})

const rectNorm = computed(() => props.block?.rectNorm)

function patchBlock(partial: Partial<ExamLayoutBlockDto>): void {
  if (!props.document || !props.block) {
    return
  }
  const nextBlock = { ...props.block, ...partial }
  const blocks = props.document.blocks.map((item) =>
    item.id === props.block?.id ? nextBlock : item,
  )
  const blockOptions
    = nextBlock.blockType === ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX
      ? props.document.blockOptions
      : props.document.blockOptions?.filter((option) => option.blockId !== props.block?.id)
  emit('patch', { ...props.document, blocks, blockOptions })
}

function patchRectField(field: 'x' | 'y' | 'w' | 'h', value: number | string | null): void {
  if (!props.block?.rectNorm) {
    return
  }
  const numeric = Number(value)
  if (Number.isNaN(numeric)) {
    return
  }
  patchBlock({
    rectNorm: {
      ...props.block.rectNorm,
      [field]: numeric,
    },
  })
}

function onBlockTypeChange(
  value: SelectValue,
  _option?: DefaultOptionType | DefaultOptionType[],
): void {
  if (typeof value !== 'string') {
    throw new TypeError('布局块类型契约异常')
  }
  const blockType = ALL_EXAM_LAYOUT_BLOCK_TYPE_CODES.find((code) => code === value)
  if (!blockType) {
    throw new Error('布局块类型契约异常')
  }
  if (blockType === ExamLayoutBlockTypeCode.IDENTITY_BUBBLE) {
    patchBlock({ blockType, layoutQuestionId: undefined, identityAreaType: props.block?.identityAreaType || 'STUDENT_NO' })
    return
  }
  if (blockType === ExamLayoutBlockTypeCode.SUBJECTIVE_ANSWER
    || blockType === ExamLayoutBlockTypeCode.OBJECTIVE_MATRIX) {
    patchBlock({ blockType, identityAreaType: undefined })
    return
  }
  patchBlock({ blockType, layoutQuestionId: undefined, identityAreaType: undefined })
}

function onLayoutQuestionChange(
  value: SelectValue,
  _option?: DefaultOptionType | DefaultOptionType[],
): void {
  if (value === null || value === undefined) {
    patchBlock({ layoutQuestionId: undefined })
    return
  }
  if (typeof value !== 'string') {
    throw new TypeError('关联题目契约异常')
  }
  patchBlock({ layoutQuestionId: value })
}
</script>

<template>
  <section class="layout-property-drawer">
    <h2 class="layout-property-drawer__title">识别块属性</h2>
    <a-empty v-if="!block" description="在画布或图层列表中选择识别块" />
    <a-form v-else layout="vertical" class="layout-property-drawer__form">
      <a-form-item label="块类型">
        <a-select
          :value="block.blockType"
          :options="blockTypeOptions"
          @change="onBlockTypeChange"
        />
      </a-form-item>
      <a-form-item label="关联题目">
        <a-select
          :value="block.layoutQuestionId"
          allow-clear
          placeholder="主观/客观块需绑定题目"
          :options="questionOptions"
          @change="onLayoutQuestionChange"
        />
      </a-form-item>
      <a-form-item label="图层层级">
        <a-input-number
          :value="block.layer ?? 0"
          :min="0"
          :max="99"
          style="width: 100%"
          @change="patchBlock({ layer: Number($event) || 0 })"
        />
      </a-form-item>
      <a-form-item label="归一化坐标">
        <div class="layout-property-drawer__grid">
          <a-input-number
            :value="rectNorm?.x"
            :step="0.001"
            :min="0"
            :max="1"
            addon-before="X"
            @change="patchRectField('x', $event)"
          />
          <a-input-number
            :value="rectNorm?.y"
            :step="0.001"
            :min="0"
            :max="1"
            addon-before="Y"
            @change="patchRectField('y', $event)"
          />
          <a-input-number
            :value="rectNorm?.w"
            :step="0.001"
            :min="0"
            :max="1"
            addon-before="W"
            @change="patchRectField('w', $event)"
          />
          <a-input-number
            :value="rectNorm?.h"
            :step="0.001"
            :min="0"
            :max="1"
            addon-before="H"
            @change="patchRectField('h', $event)"
          />
        </div>
      </a-form-item>
      <a-form-item
        v-if="block.blockType === ExamLayoutBlockTypeCode.IDENTITY_BUBBLE"
        label="身份区类型"
      >
        <a-input
          :value="block.identityAreaType"
          placeholder="如 STUDENT_NO"
          @change="patchBlock({ identityAreaType: ($event.target as HTMLInputElement).value })"
        />
      </a-form-item>
    </a-form>
  </section>
</template>

<style scoped lang="scss">
.layout-property-drawer {
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

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
}
</style>
