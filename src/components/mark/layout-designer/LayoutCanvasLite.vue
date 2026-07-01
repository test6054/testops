<script setup lang="ts">
import type { ExamLayoutBlockDto, ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import LayoutCanvas from '@/components/mark/layout-designer/LayoutCanvas.vue'

defineProps<{
  document: ExamLayoutDocument | null
  pageNo: number
  focusedBlockId: string | null
}>()

const emit = defineEmits<{
  'focus-block': [block: ExamLayoutBlockDto | null]
  patch: [document: ExamLayoutDocument]
}>()
</script>

<template>
  <LayoutCanvas
    :document="document"
    :page-no="pageNo"
    :focused-block-id="focusedBlockId"
    @focus-block="emit('focus-block', $event)"
    @patch="emit('patch', $event)"
  />
</template>
