<template>
  <UiRadioGroup
    v-model="modelValue"
    :options="props.options"
    :size="props.size"
    :block="props.block"
    :disabled="props.disabled"
    v-bind="$attrs"
  >
    <slot />
  </UiRadioGroup>
</template>

<script lang="ts" setup>
import type { UiComponentSize, UiOptionValue, UiSelectOption } from './types'
import UiRadioGroup from './UiRadioGroup.vue'

defineOptions({
  name: 'RadioGroupLegacy',
  inheritAttrs: false,
})

const modelValue = defineModel<UiOptionValue | boolean | undefined>()

const props = withDefaults(
  defineProps<{
    options?: UiSelectOption[]
    size?: UiComponentSize
    block?: boolean
    disabled?: boolean
  }>(),
  {
    options: () => [],
    size: 'md',
    block: false,
    disabled: false,
  },
)
</script>
