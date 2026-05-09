<template>
  <UiSelect
    v-model="modelValue"
    :options="props.options"
    :placeholder="props.placeholder"
    :allow-clear="props.allowClear"
    :allow-search="resolvedAllowSearch"
    :filter-option="props.filterOption"
    :mode="props.mode"
    :disabled="props.disabled"
    :loading="props.loading"
    v-bind="$attrs"
  />
</template>

<script lang="ts" setup>
import type { UiOptionValue, UiSelectOption } from './types'
import UiSelect from './UiSelect.vue'

defineOptions({
  name: 'UiSelectArco',
  inheritAttrs: false,
})

const modelValue = defineModel<UiOptionValue | UiOptionValue[] | undefined>()

const props = withDefaults(defineProps<{
  options: UiSelectOption[]
  placeholder?: string
  allowClear?: boolean
  allowSearch?: boolean
  showSearch?: boolean
  allowCreate?: boolean
  filterOption?: boolean
  mode?: 'multiple'
  disabled?: boolean
  loading?: boolean
}>(), {
  placeholder: '请选择',
  allowClear: true,
  allowSearch: false,
  showSearch: undefined,
  allowCreate: false,
  filterOption: true,
  mode: undefined,
  disabled: false,
  loading: false,
})

const resolvedAllowSearch = computed(() => props.showSearch ?? props.allowSearch)
</script>
