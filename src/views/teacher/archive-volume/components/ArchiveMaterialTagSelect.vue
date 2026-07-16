<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadArchiveMaterialTagOptions } from '@/composables/useArchiveMaterialTagOptions'
import { showUserError } from '@/utils/error-handler'

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
    /** 卷内登记或维护标签时的归档卷 ID */
    volumeId?: string
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
let searchGeneration = 0

async function handleSearch(keyword: string) {
  const generation = ++searchGeneration
  searching.value = true
  try {
    const tags = await loadArchiveMaterialTagOptions(
      keyword,
      props.suggestLimit,
      props.searchScopeOnly,
      props.volumeId,
    )
    if (generation === searchGeneration) {
      tagOptions.value = tags
    }
  } catch (error) {
    if (generation === searchGeneration) {
      showUserError(error, '加载材料标签建议失败')
    }
  } finally {
    if (generation === searchGeneration) {
      searching.value = false
    }
  }
}

onMounted(() => {
  void handleSearch('')
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
