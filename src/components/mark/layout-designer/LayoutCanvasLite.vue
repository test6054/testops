<script setup lang="ts">
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import { defineAsyncComponent } from 'vue'

/**
 * 轻量画布包装（复核微调等）。
 * MVR-389：readOnly 默认拒绝；仅父层显式 false 可拖改识别块。
 */
withDefaults(
  defineProps<{
    document: ExamLayoutDocument | null
    pageNo: number
    focusedBlockId: string | null
    readOnly?: boolean
  }>(),
  {
    readOnly: true,
  },
)

const emit = defineEmits<{
  'focus-block': [block: ExamLayoutBlockDto | null]
  "patch": [document: ExamLayoutDocument]
}>()

const LayoutCanvas = defineAsyncComponent(() => import('@/components/mark/layout-designer/LayoutCanvas.vue'))
</script>

<template>
  <LayoutCanvas
    :document="document"
    :page-no="pageNo"
    :focused-block-id="focusedBlockId"
    :read-only="readOnly !== false"
    @focus-block="emit('focus-block', $event)"
    @patch="emit('patch', $event)"
  />
</template>
