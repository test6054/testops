<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadArchiveMaterialTagOptions } from '@/composables/useArchiveMaterialTagOptions'

defineOptions({ name: 'ArchiveMaterialTagSelect' })

const model = defineModel<string[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    placeholder?: string
    maxTagCount?: number
    /** 检索筛选为 false：仅能从租户标签目录选择；材料登记为 true：允许新建标签 */
    allowCreate?: boolean
    /** 下拉预加载条数上限 */
    suggestLimit?: number
    /** 检索筛选用 true，仅返回当前可见范围标签；卷内登记用 false */
    searchScopeOnly?: boolean
  }>(),
  {
    placeholder: '输入标签后回车',
    maxTagCount: 32,
    allowCreate: true,
    suggestLimit: 20,
    searchScopeOnly: false,
  },
)

const tagOptions = ref<string[]>([])
const searching = ref(false)

async function handleSearch(keyword: string) {
  searching.value = true
  try {
    tagOptions.value = await loadArchiveMaterialTagOptions(
      keyword,
      props.suggestLimit,
      props.searchScopeOnly,
    )
  } finally {
    searching.value = false
  }
}

onMounted(() => {
  void loadArchiveMaterialTagOptions(undefined, props.suggestLimit, props.searchScopeOnly).then(
    (tags) => {
      tagOptions.value = tags
    },
  )
})
</script>

<template>
  <a-select
    v-model:value="model"
    :mode="allowCreate ? 'tags' : 'multiple'"
    :options="tagOptions.map((tag) => ({ value: tag, label: tag }))"
    :token-separators="allowCreate ? [',', '，'] : undefined"
    :placeholder="placeholder"
    :max-tag-count="maxTagCount"
    show-search
    :filter-option="false"
    :loading="searching"
    @search="handleSearch"
    @dropdown-visible-change="(open: boolean) => open && handleSearch('')"
  />
</template>
