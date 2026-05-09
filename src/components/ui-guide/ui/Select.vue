<template>
  <UiSelect
    v-model="modelValue"
    :options="props.options"
    :placeholder="props.placeholder"
    :allow-clear="props.allowClear"
    :allow-search="props.allowSearch"
    :filter-option="props.filterOption"
    :disabled="props.disabled"
    :loading="props.loading"
    v-bind="$attrs"
  />
</template>

<script lang="ts" setup>
import type { UiOptionValue, UiSelectOption } from './types'
import UiSelect from './UiSelect.vue'

defineOptions({
  name: 'UiSelectCompat',
  inheritAttrs: false,
})

const modelValue = defineModel<UiOptionValue | undefined>()

const props = withDefaults(defineProps<{
  options: UiSelectOption[]
  placeholder?: string
  allowClear?: boolean
  allowSearch?: boolean
  filterOption?: boolean
  disabled?: boolean
  loading?: boolean
}>(), {
  placeholder: '请选择',
  allowClear: true,
  allowSearch: false,
  filterOption: true,
  disabled: false,
  loading: false,
})
</script>
