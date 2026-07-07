<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { loadArchiveMaterialTagOptions } from '@/composables/useArchiveMaterialTagOptions'

defineOptions({ name: 'ArchiveMaterialTagSelect' })

const model = defineModel<string[]>({ default: () => [] })

withDefaults(
  defineProps<{
    placeholder?: string
    maxTagCount?: number
  }>(),
  {
    placeholder: '输入标签后回车',
    maxTagCount: 32,
  },
)

const tagOptions = ref<string[]>([])
const searching = ref(false)

async function handleSearch(keyword: string) {
  searching.value = true
  try {
    tagOptions.value = await loadArchiveMaterialTagOptions(keyword)
  } finally {
    searching.value = false
  }
}

onMounted(() => {
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
    @dropdown-visible-change="(open: boolean) => open && handleSearch('')"
  />
</template>
