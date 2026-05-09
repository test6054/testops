<template>
  <UiSelect
    v-model="modelValue"
    :options="options"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :allow-search="allowSearch"
    :filter-option="filterOption"
    :disabled="disabled"
    :loading="loading"
    :size="size"
    :status="status"
    mode="multiple"
    :max-tag-count="maxTagCount"
    v-bind="$attrs"
  />
</template>

<script lang="ts" setup>
import type { UiComponentSize, UiFieldStatus, UiOptionValue, UiSelectOption } from './types'
import UiSelect from './UiSelect.vue'

defineOptions({
  name: 'UiMultiSelect',
  inheritAttrs: false,
})

const modelValue = defineModel<UiOptionValue[]>({ default: () => [] })

withDefaults(defineProps<{
  options: UiSelectOption[]
  placeholder?: string
  allowClear?: boolean
  allowSearch?: boolean
  filterOption?: boolean
  disabled?: boolean
  loading?: boolean
  maxTagCount?: number | 'responsive'
  size?: UiComponentSize
  status?: UiFieldStatus
}>(), {
  placeholder: '请选择',
  allowClear: true,
  allowSearch: false,
  filterOption: true,
  disabled: false,
  loading: false,
  maxTagCount: 2,
  size: 'md',
  status: 'default',
})
</script>
