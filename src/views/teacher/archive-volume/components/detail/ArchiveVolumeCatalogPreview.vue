<script setup lang="ts">
import type {
  ArchiveCatalogStatusCode,
  ArchiveVolumeCatalogLineVO,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_CATALOG_STATUS_TONE,
  ArchiveCatalogStatusDescription,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed } from 'vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import {
  formatCatalogPreviewPageCount,
  groupArchiveCatalogLinesForPreview,
} from '@/utils/archive-catalog-tree-preview'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeCatalogPreview' })

const props = defineProps<{
  lines: ArchiveVolumeCatalogLineVO[]
  catalogStatus?: ArchiveCatalogStatusCode
}>()

const groups = computed(() => groupArchiveCatalogLinesForPreview(props.lines))

const statusLabel = computed(() => {
  if (!props.catalogStatus) {
    return ''
  }
  return strictEnumLabel(ArchiveCatalogStatusDescription, props.catalogStatus, 'catalogStatus')
})

const statusTone = computed<BadgeTone>(() => {
  if (!props.catalogStatus) {
    return 'gray'
  }
  return strictEnumTone(ARCHIVE_CATALOG_STATUS_TONE, props.catalogStatus, 'catalogStatus')
})
</script>

<template>
  <div class="archive-volume-catalog-preview">
    <UiEmpty v-if="lines.length === 0" description="尚未生成目录草稿" />
    <div v-else class="catalog-tree">
      <template v-for="group in groups" :key="group.category">
        <div class="catalog-category">{{ group.category }}</div>
        <div
          v-for="entry in group.entries"
          :key="`${entry.lineNo}-${entry.title}`"
          class="catalog-entry"
        >
          <span class="catalog-seq">{{ entry.lineNo }}</span>
          <span class="catalog-entry__title">{{ entry.title }}</span>
          <span class="catalog-entry__pages">{{
            formatCatalogPreviewPageCount(entry.pageRange)
          }}</span>
          <UiTag v-if="catalogStatus" :tone="statusTone" size="sm">
            {{ statusLabel }}
          </UiTag>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.archive-volume-catalog-preview {
  padding: var(--dp-space-3) var(--dp-space-4);
}

.catalog-entry__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-entry__pages {
  font-family: var(--dp-font-mono);
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
}
</style>
