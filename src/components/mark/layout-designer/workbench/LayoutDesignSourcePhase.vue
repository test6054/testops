<script setup lang="ts">
import type { ExamMaterialLayoutModeCode } from '@/apis/mark/exam'
import type { ExamLayoutDocument, ExamLayoutGenerateQuestionRequest } from '@/apis/mark/exam-layout-design'
import { computed } from 'vue'
import LayoutEntryGateway from '@/components/mark/layout-designer/LayoutEntryGateway.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { isAnswerSheetWorkspace, isFullPaperWorkspace } from '@/utils/layout-design-workspace'

const props = defineProps<{
  document: ExamLayoutDocument | null
  examId: string
  materialLayoutMode?: ExamMaterialLayoutModeCode
  materialLayoutModeMessage?: string
  layoutPaperSpecMessage?: string
  generating?: boolean
  detecting?: boolean
  readonly?: boolean
  hasPages: boolean
}>()

const emit = defineEmits<{
  'generate-sheet': [paperSpec: string, questions: ExamLayoutGenerateQuestionRequest[]]
  'auto-detect': [sourcePdfFileId: string]
  "patch": [document: ExamLayoutDocument]
  'focus-upload': []
}>()

const showCenterCta = computed(() => !props.hasPages && !props.detecting)

const centerTitle = computed(() => {
  if (isFullPaperWorkspace(props.materialLayoutMode)) {
    return '上传整卷试卷并开始识别'
  }
  if (isAnswerSheetWorkspace(props.materialLayoutMode)) {
    return '配置题目结构并生成标准答题卡'
  }
  return '请先保存制卷形态'
})

const centerDescription = computed(() => {
  if (isFullPaperWorkspace(props.materialLayoutMode)) {
    return '支持 PDF、Word 或图片；识别完成后自动生成题单与 ROI 草稿。'
  }
  if (isAnswerSheetWorkspace(props.materialLayoutMode)) {
    return '在左侧配置纸型与题目结构，生成后可进入版式划区微调。'
  }
  return '请回到考试准备页保存整卷作答或独立答卷页形态。'
})
</script>

<template>
  <div class="layout-design-source-phase">
    <div v-if="showCenterCta" class="layout-design-source-phase__hero">
      <UiEmpty :description="centerDescription">
        <template #title>{{ centerTitle }}</template>
      </UiEmpty>
      <UiButton
        v-if="isFullPaperWorkspace(materialLayoutMode)"
        variant="primary"
        :disabled="readonly || detecting"
        @click="emit('focus-upload')"
      >
        选择源文件上传
      </UiButton>
    </div>
    <div class="layout-design-source-phase__panel">
      <LayoutEntryGateway
        :document="document"
        :exam-id="examId"
        :material-layout-mode="materialLayoutMode"
        :material-layout-mode-message="materialLayoutModeMessage"
        :layout-paper-spec-message="layoutPaperSpecMessage"
        :generating="generating"
        :detecting="detecting"
        :readonly="readonly"
        @generate-sheet="(...args) => emit('generate-sheet', ...args)"
        @auto-detect="(...args) => emit('auto-detect', ...args)"
        @patch="emit('patch', $event)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout-design-source-phase {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  min-height: 420px;

  &__hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    border: 1px dashed var(--dp-border-subtle);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface-subtle);
  }

  &__panel {
    min-width: 0;
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;

    &__hero {
      order: -1;
    }
  }
}
</style>
