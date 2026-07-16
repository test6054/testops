<template>
  <aside class="archive-volume-material-tree">
    <UiEmpty v-if="catalogLoadFailed" description="目录加载失败">
      <UiTextAction tone="primary" @click="loadCatalogLines">重新加载</UiTextAction>
    </UiEmpty>
    <UiEmpty v-else-if="!treeGroups.length" description="暂无目录项" />
    <div v-else class="catalog-tree">
      <UiAlertStrip v-if="materialStatsLoadFailed" tone="warning" title="就绪统计加载失败">
        <template #actions>
          <UiTextAction tone="primary" @click="loadMaterialStats">重新加载</UiTextAction>
        </template>
      </UiAlertStrip>
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
          <span
            v-if="entry.pageLabel || entry.readySummary"
            class="archive-volume-material-tree__meta"
          >
            <span v-if="entry.pageLabel" class="archive-volume-material-tree__pages">{{
              entry.pageLabel
            }}</span>
            <span v-if="entry.readySummary" class="archive-volume-material-tree__ready">
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
  ArchiveVolumeMaterialCatalogReadySummaryVO,
} from '@/apis/mark/archive-volume'
import { computed, onMounted, ref, watch } from 'vue'
import {
  ArchiveMaterialTypeDescription,
  getArchiveVolumeCatalog,
  getArchiveVolumeMaterialStats,
} from '@/apis/mark/archive-volume'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { ALL_ARCHIVE_MATERIAL_TYPE_CODES } from '@/types/enums/archive-material-type-enum'
import {
  archiveMissingItemTargetsCatalogKey,
  resolveArchiveCatalogLineKey,
  resolveArchiveMaterialGroupKey,
} from '@/utils/archive-catalog-material-key'
import {
  formatCatalogPreviewPageCount,
  groupArchiveCatalogLinesForPreview,
} from '@/utils/archive-catalog-tree-preview'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeMaterialTreePanel' })

const selectedKeys = defineModel<string[]>('selectedKeys', { default: () => [] })

const props = defineProps<{
  volumeId: string
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
const catalogSummaries = ref<ArchiveVolumeMaterialCatalogReadySummaryVO[]>([])
const materialStatsLoadFailed = ref(false)

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function catalogKeyTitle(key: string): string {
  for (const materialType of ALL_ARCHIVE_MATERIAL_TYPE_CODES) {
    if (materialType === key) {
      return materialTypeLabel(materialType)
    }
  }
  return key
}

/** 按目录键从统计接口读取就绪度，不使用分页列表推导。 */
function resolveEntryReadySummary(catalogKey: string): CatalogEntryReadySummary | undefined {
  const matched = catalogSummaries.value.find((item) => item.catalogKey === catalogKey)
  if (!matched || matched.totalCount <= 0) {
    return undefined
  }
  return {
    ready: matched.readyCount,
    total: matched.totalCount,
  }
}

function isCatalogEntryMissing(catalogKey: string): boolean {
  return props.missingItems.some((item) => archiveMissingItemTargetsCatalogKey(item, catalogKey))
}

function enrichCatalogEntry(entry: Omit<CatalogTreeEntry, 'readySummary'>): CatalogTreeEntry {
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
    entryMap.set(
      key,
      enrichCatalogEntry({
        key,
        seq: '—',
        title: item.catalogCode
          ? `${item.catalogCode} · ${item.catalogName || materialTypeLabel(item.materialType)}`
          : materialTypeLabel(item.materialType),
        missing: true,
      }),
    )
  }
  for (const material of catalogSummaries.value) {
    const key = material.catalogKey
    if (!entryMap.has(key)) {
      entryMap.set(
        key,
        enrichCatalogEntry({
          key,
          seq: '—',
          title: key in ArchiveMaterialTypeDescription ? catalogKeyTitle(key) : key,
        }),
      )
    }
  }
  if (entryMap.size === 0) {
    return []
  }
  return [
    {
      category: '归档材料',
      entries: Array.from(entryMap.values()),
    },
  ]
}

function isSelected(key: string): boolean {
  return selectedKeys.value[0] === key
}

function selectEntry(key: string) {
  selectedKeys.value = [key]
}

async function loadMaterialStats(): Promise<void> {
  if (!props.volumeId) {
    catalogSummaries.value = []
    materialStatsLoadFailed.value = false
    return
  }
  try {
    const stats = await getArchiveVolumeMaterialStats({ volumeId: props.volumeId })
    catalogSummaries.value = stats.catalogSummaries
    materialStatsLoadFailed.value = false
  } catch (error) {
    materialStatsLoadFailed.value = true
    showUserError(error, '加载材料统计失败')
  }
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
    void loadMaterialStats()
  },
)

watch(
  () => props.missingItems,
  () => {
    void loadMaterialStats()
  },
  { deep: true },
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
  void loadMaterialStats()
})
</script>

<style scoped>
.archive-volume-material-tree {
  width: 100%;
  min-width: 280px;
  flex-shrink: 0;
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-border);
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
  gap: var(--dp-space-2);
  flex-shrink: 0;
}

.archive-volume-material-tree__pages,
.archive-volume-material-tree__ready {
  font-family: var(--dp-font-mono);
  font-size: var(--dp-type-hint-size);
  color: var(--dp-text-muted);
  font-variant-numeric: tabular-nums;
}

.archive-volume-material-tree__ready {
  color: var(--dp-text-secondary);
}

.catalog-entry {
  width: 100%;
  border: none;
  background: transparent;
  font: inherit;
}
</style>
