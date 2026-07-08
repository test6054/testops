<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadArchiveMaterialTagOptions } from '@/composables/useArchiveMaterialTagOptions'

defineOptions({ name: 'ArchiveMaterialTagSelect' })

const model = defineModel<string[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    placeholder?: string
    maxTagCount?: number
    /** 为 false 时不请求检索标签建议 API（无检索权限场景仅本地输入） */
    enableRemoteSuggest?: boolean
  }>(),
  {
    placeholder: '输入标签后回车',
    maxTagCount: 32,
    enableRemoteSuggest: true,
  },
)

const tagOptions = ref<string[]>([])
const searching = ref(false)

async function handleSearch(keyword: string) {
  if (!props.enableRemoteSuggest) {
    tagOptions.value = []
    return
  }
  searching.value = true
  try {
    tagOptions.value = await loadArchiveMaterialTagOptions(keyword)
  } finally {
    searching.value = false
  }
}

onMounted(() => {
  if (!props.enableRemoteSuggest) {
    return
  }
  void loadArchiveMaterialTagOptions().then((tags) => {
    tagOptions.value = tags
  })
})
</script>

<template>
  <a-select
    v-model:value="model"
    mode="tags"
    :options="tagOptions.map((tag) => ({ value: tag, label: tag }))"
    :token-separators="[',', '，']"
    :placeholder="placeholder"
    :max-tag-count="maxTagCount"
    show-search
    :filter-option="false"
    :loading="searching"
    @search="handleSearch"
    @dropdown-visible-change="
      (open: boolean) => open && props.enableRemoteSuggest && handleSearch('')
    "
  />
</template>
