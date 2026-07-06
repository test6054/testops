<template>
  <aside class="archive-volume-material-tree">
    <UiEmpty v-if="catalogLoadFailed" description="目录加载失败，请刷新后重试" />
    <UiEmpty v-else-if="!treeGroups.length" description="暂无目录项" />
    <div v-else class="catalog-tree">
      <template v-for="group in treeGroups" :key="group.category">
        <div class="catalog-category">{{ group.category }}</div>
        <button
          v-for="entry in group.entries"
          :key="entry.key"
          type="button"
          class="catalog-entry catalog-entry--selectable"
          :class="{ 'catalog-entry--selected': isSelected(entry.key) }"
          @click="selectEntry(entry.key)"
        >
          <span class="catalog-seq">{{ entry.seq }}</span>
          <span class="archive-volume-material-tree__title">{{ entry.title }}</span>
          <span v-if="entry.pageLabel || entry.readySummary" class="archive-volume-material-tree__meta">
            <span v-if="entry.pageLabel" class="archive-volume-material-tree__pages">{{ entry.pageLabel }}</span>
            <span
              v-if="entry.readySummary"
              class="archive-volume-material-tree__ready"
            >
              {{ entry.readySummary.ready }}/{{ entry.readySummary.total }} 就绪
            </span>
          </span>
          <UiTag v-if="entry.missing" tone="red" size="sm">缺件</UiTag>
          <UiTag
            v-else-if="entry.readySummary"
            :tone="entry.readySummary.ready === entry.readySummary.total ? 'green' : 'orange'"
            size="sm"
          >
            {{ entry.readySummary.ready }}/{{ entry.readySummary.total }}
          </UiTag>
        </button>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type {
  ArchiveCatalogStatusCode,
  ArchiveIntegrityMissingItemVO,
  ArchiveMaterialTypeCode,
  ArchiveVolumeCatalogLineVO,
  ArchiveVolumeMaterialVO,
} from '@/apis/mark/archive-volume'
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArchiveMaterialTypeDescription,
  getArchiveVolumeCatalog,
} from '@/apis/mark/archive-volume'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import {
  archiveMaterialBelongsToCatalogKey,
  archiveMissingItemTargetsCatalogKey,
  resolveArchiveCatalogLineKey,
  resolveArchiveMaterialGroupKey,
} from '@/utils/archive-catalog-material-key'
import {
  formatCatalogPreviewPageCount,
  groupArchiveCatalogLinesForPreview,
} from '@/utils/archive-catalog-tree-preview'
import { countArchiveMaterialsReady } from '@/utils/archive-material-status-ui'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeMaterialTreePanel' })

const selectedKeys = defineModel<string[]>('selectedKeys', { default: () => [] })

const props = defineProps<{
  volumeId: string
  materials: ArchiveVolumeMaterialVO[]
  missingItems: ArchiveIntegrityMissingItemVO[]
  catalogStatus?: ArchiveCatalogStatusCode
}>()

interface CatalogEntryReadySummary {
  ready: number
  total: number
}

interface CatalogTreeEntry {
  key: string
  seq: string
  title: string
  pageLabel?: string
  missing?: boolean
  readySummary?: CatalogEntryReadySummary
}

interface CatalogTreeGroup {
  category: string
  entries: CatalogTreeEntry[]
}

const catalogLines = ref<ArchiveVolumeCatalogLineVO[]>([])
const catalogLoadFailed = ref(false)

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

/** 按目录键统计已登记材料就绪度（ready/total）。 */
function resolveEntryReadySummary(catalogKey: string): CatalogEntryReadySummary | undefined {
  const matched = props.materials.filter((item) =>
    archiveMaterialBelongsToCatalogKey(item, catalogKey),
  )
  if (matched.length === 0) {
    return undefined
  }
  return {
    ready: countArchiveMaterialsReady(matched),
    total: matched.length,
  }
}

function isCatalogEntryMissing(catalogKey: string): boolean {
  return props.missingItems.some((item) => archiveMissingItemTargetsCatalogKey(item, catalogKey))
}

function enrichCatalogEntry(
  entry: Omit<CatalogTreeEntry, 'readySummary'>,
): CatalogTreeEntry {
  if (entry.missing) {
    return entry
  }
  const readySummary = resolveEntryReadySummary(entry.key)
  return readySummary ? { ...entry, readySummary } : entry
}

/** 优先用已确认目录行渲染 catalog-tree；无目录时回退材料 + 缺项列表。 */
const treeGroups = computed((): CatalogTreeGroup[] => {
  if (catalogLines.value.length > 0) {
    return groupArchiveCatalogLinesForPreview(catalogLines.value).map((group) => ({
      category: group.category,
      entries: group.entries.map((line) => {
        const key = resolveArchiveCatalogLineKey(line)
        return enrichCatalogEntry({
          key,
          seq: String(line.lineNo),
          title: line.title,
          pageLabel: formatCatalogPreviewPageCount(line.pageRange),
          missing: isCatalogEntryMissing(key),
        })
      }),
    }))
  }
  return buildFallbackTreeGroups()
})

function buildFallbackTreeGroups(): CatalogTreeGroup[] {
  const entryMap = new Map<string, CatalogTreeEntry>()
  for (const item of props.missingItems) {
    const key = resolveArchiveMaterialGroupKey(item)
    entryMap.set(key, enrichCatalogEntry({
      key,
      seq: '—',
      title: item.catalogCode
        ? `${item.catalogCode} · ${item.catalogName || materialTypeLabel(item.materialType)}`
        : materialTypeLabel(item.materialType),
      missing: true,
    }))
  }
  for (const material of props.materials) {
    const key = resolveArchiveMaterialGroupKey(material)
    if (!entryMap.has(key)) {
      entryMap.set(key, enrichCatalogEntry({
        key,
        seq: '—',
        title: material.catalogCode
          ? `${material.catalogCode} · ${materialTypeLabel(material.materialType)}`
          : materialTypeLabel(material.materialType),
      }))
    }
  }
  if (entryMap.size === 0) {
    return []
  }
  return [{
    category: '归档材料',
    entries: Array.from(entryMap.values()),
  }]
}

function isSelected(key: string): boolean {
  return selectedKeys.value[0] === key
}

function selectEntry(key: string) {
  selectedKeys.value = [key]
}

async function loadCatalogLines() {
  if (!props.volumeId) {
    catalogLines.value = []
    catalogLoadFailed.value = false
    return
  }
  catalogLoadFailed.value = false
  try {
    const catalog = await getArchiveVolumeCatalog(props.volumeId)
    catalogLines.value = catalog.lines ?? []
  } catch (error) {
    catalogLines.value = []
    catalogLoadFailed.value = true
    showUserError(error, '归档目录加载失败')
  }
}

watch(
  () => props.volumeId,
  () => {
    void loadCatalogLines()
  },
)

watch(
  treeGroups,
  (groups) => {
    const firstKey = groups[0]?.entries[0]?.key
    if (firstKey && selectedKeys.value.length === 0) {
      selectedKeys.value = [firstKey]
    }
  },
  { immediate: true },
)

onMounted(() => {
  void loadCatalogLines()
})
</script>

<style scoped>
.archive-volume-material-tree {
  width: 100%;
  min-width: 280px;
  flex-shrink: 0;
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel);
  background: var(--ant-color-bg-container, #fff);
}

.archive-volume-material-tree__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.archive-volume-material-tree__meta {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  flex-shrink: 0;
}

.archive-volume-material-tree__pages,
.archive-volume-material-tree__ready {
  font-family: var(--dp-font-mono, ui-monospace, monospace);
  font-size: var(--dp-type-hint-size, 11px);
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.archive-volume-material-tree__ready {
  color: var(--dp-text-secondary, #64748b);
}

.catalog-entry {
  width: 100%;
  border: none;
  background: transparent;
  font: inherit;
}
</style>
