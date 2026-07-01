<template>
  <UiCheckbox
    v-model="modelValue"
    :value="props.value"
    :disabled="props.disabled"
    :indeterminate="props.indeterminate"
    v-bind="$attrs"
  >
    <slot />
  </UiCheckbox>
</template>

<script lang="ts" setup>
import type { UiOptionValue } from './types'
import UiCheckbox from './UiCheckbox.vue'

defineOptions({
  name: 'CheckboxLegacy',
  inheritAttrs: false,
})

const modelValue = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    value?: UiOptionValue
    disabled?: boolean
    indeterminate?: boolean
  }>(),
  {
    value: undefined,
    disabled: false,
    indeterminate: false,
  },
)
</script>
