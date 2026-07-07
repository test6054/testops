<template>
  <UiDrawer
    v-model:open="open"
    title="文档 OCR 详情"
    :width="720"
    hide-footer
  >
    <ArchiveVolumeMaterialOcrDetailContent
      :material-id="materialId"
      :initial-page-no="initialPageNo"
    />
  </UiDrawer>
</template>

<script setup lang="ts">
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import ArchiveVolumeMaterialOcrDetailContent from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailContent.vue'

const open = defineModel<boolean>('open', { required: true })

defineProps<{
  materialId?: string
  initialPageNo?: number
}>()
</script>
