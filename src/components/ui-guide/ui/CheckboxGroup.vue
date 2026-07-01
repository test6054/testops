<template>
  <UiCheckboxGroup
    v-model="modelValue"
    :options="props.options"
    :direction="props.direction"
    :disabled="props.disabled"
    v-bind="$attrs"
  >
    <slot />
  </UiCheckboxGroup>
</template>

<script lang="ts" setup>
import type { UiOptionValue, UiSelectOption } from './types'
import UiCheckboxGroup from './UiCheckboxGroup.vue'

defineOptions({
  name: 'CheckboxGroupLegacy',
  inheritAttrs: false,
})

const modelValue = defineModel<UiOptionValue[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    options?: UiSelectOption[]
    direction?: 'horizontal' | 'vertical'
    disabled?: boolean
  }>(),
  {
    options: () => [],
    direction: 'horizontal',
    disabled: false,
  },
)
</script>
