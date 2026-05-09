<template>
  <UiMultiSelect
    v-model="modelValue"
    :options="props.options"
    :placeholder="props.placeholder"
    :allow-clear="props.allowClear"
    :allow-search="resolvedAllowSearch"
    :filter-option="props.filterOption"
    :max-tag-count="props.maxTagCount"
    :disabled="props.disabled"
    :loading="props.loading"
    v-bind="$attrs"
  />
</template>

<script lang="ts" setup>
import type { UiOptionValue, UiSelectOption } from './types'
import { computed } from 'vue'
import UiMultiSelect from './UiMultiSelect.vue'

defineOptions({
  name: 'UiSelectMultipleArco',
  inheritAttrs: false,
})

const modelValue = defineModel<UiOptionValue[]>({ default: () => [] })

const props = withDefaults(defineProps<{
  options: UiSelectOption[]
  placeholder?: string
  allowClear?: boolean
  maxTagCount?: number | 'responsive'
  allowSearch?: boolean
  showSearch?: boolean
  filterOption?: boolean
  disabled?: boolean
  loading?: boolean
}>(), {
  placeholder: '请选择',
  allowClear: true,
  maxTagCount: 2,
  allowSearch: false,
  showSearch: undefined,
  filterOption: true,
  disabled: false,
  loading: false,
})

const resolvedAllowSearch = computed(() => props.showSearch ?? props.allowSearch)
</script>
