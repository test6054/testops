<template>
  <aside class="archive-volume-material-tree">
    <a-tree
      v-if="catalogTreeNodes.length"
      :selected-keys="selectedKeys"
      :tree-data="catalogTreeNodes"
      block-node
      default-expand-all
      @select="onCatalogSelect"
    />
    <UiEmpty v-else description="暂无目录项" />
  </aside>
</template>

<script setup lang="ts">
import type { TreeProps } from 'ant-design-vue'
import type {
  ArchiveIntegrityMissingItemVO,
  ArchiveMaterialTypeCode,
  ArchiveVolumeMaterialVO,
} from '@/apis/mark/archive-volume'
import { computed, watch } from 'vue'
import { ARCHIVE_MATERIAL_TYPE_LABEL } from '@/apis/mark/archive-volume'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeMaterialTreePanel' })

const selectedKeys = defineModel<string[]>('selectedKeys', { default: () => [] })

const props = defineProps<{
  materials: ArchiveVolumeMaterialVO[]
  missingItems: ArchiveIntegrityMissingItemVO[]
}>()

interface CatalogTreeNode {
  key: string
  title: string
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

/** 合并已登记材料与完整性缺项，生成左侧目录树节点。 */
const catalogTreeNodes = computed((): CatalogTreeNode[] => {
  const keySet = new Map<string, string>()
  for (const item of props.missingItems) {
    const key = item.catalogCode || item.materialType
    keySet.set(key, `${item.catalogCode || materialTypeLabel(item.materialType)}（缺件）`)
  }
  for (const material of props.materials) {
    const key = material.catalogCode || material.materialType
    if (!keySet.has(key)) {
      keySet.set(
        key,
        material.catalogCode
          ? `${material.catalogCode} · ${materialTypeLabel(material.materialType)}`
          : materialTypeLabel(material.materialType),
      )
    }
  }
  return Array.from(keySet.entries()).map(([key, title]) => ({ key, title }))
})

const onCatalogSelect: TreeProps['onSelect'] = (keys) => {
  const next = keys?.map(String) ?? []
  selectedKeys.value = next.length ? [next[0]] : []
}

watch(catalogTreeNodes, (nodes) => {
  if (nodes.length && selectedKeys.value.length === 0) {
    selectedKeys.value = [nodes[0].key]
  }
})
</script>

<style scoped>
.archive-volume-material-tree {
  width: 280px;
  flex-shrink: 0;
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel);
  background: var(--ant-color-bg-container, #fff);
}
</style>
