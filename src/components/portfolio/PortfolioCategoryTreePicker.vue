<template>
  <div class="portfolio-category-tree-picker">
    <a-spin :spinning="loading">
      <a-tree-select
        v-if="treeData.length"
        :value="modelValue || undefined"
        :tree-data="treeData"
        :disabled="readonly"
        allow-clear
        show-search
        tree-default-expand-all
        placeholder="选择档案分类"
        style="width: 100%"
        tree-node-filter-prop="title"
        @update:value="handleChange"
      />
      <UiEmpty v-else-if="!loading" description="暂无可用档案分类" />
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import type { PortfolioArchiveCategoryTreeNodeVO } from '@/apis/portfolio/types'
import { onMounted, ref, watch } from 'vue'
import { portfolioArchiveTemplateApi } from '@/apis/portfolio/archive-template'
import { PortfolioArchiveCategoryStatusCode } from '@/apis/portfolio/enums'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'PortfolioCategoryTreePicker' })

const props = defineProps<{
  modelValue: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:model-value', value: string): void
}>()

interface TreeSelectNode {
  value: string
  title: string
  disabled?: boolean
  children?: TreeSelectNode[]
}

const loading = ref(false)
const treeData = ref<TreeSelectNode[]>([])

function mapCategoryNodes(nodes: PortfolioArchiveCategoryTreeNodeVO[]): TreeSelectNode[] {
  return nodes
    .filter((node) => node.status === PortfolioArchiveCategoryStatusCode.ACTIVE)
    .map((node) => {
      const children = node.children?.length ? mapCategoryNodes(node.children) : undefined
      return {
        value: node.id,
        title: node.categoryName,
        disabled: Boolean(children?.length),
        children,
      }
    })
}

async function loadTree() {
  loading.value = true
  try {
    const tree = await portfolioArchiveTemplateApi.listCategoryTree()
    treeData.value = mapCategoryNodes(tree ?? [])
  } catch (error) {
    treeData.value = []
    showUserError(error, '加载档案分类树失败')
  } finally {
    loading.value = false
  }
}

function handleChange(value: string | undefined) {
  emit('update:model-value', value ?? '')
}

watch(
  () => props.readonly,
  () => {
    if (!treeData.value.length) {
      void loadTree()
    }
  },
)

onMounted(() => {
  void loadTree()
})
</script>
