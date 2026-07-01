<template>
  <UiRadio :value="props.value" :label="props.label" :disabled="props.disabled" v-bind="$attrs">
    <slot />
  </UiRadio>
</template>

<script lang="ts" setup>
import type { UiOptionValue } from './types'
import UiRadio from './UiRadio.vue'

defineOptions({
  name: 'RadioLegacy',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    value?: UiOptionValue | boolean
    label?: string
    disabled?: boolean
  }>(),
  {
    value: undefined,
    label: '',
    disabled: false,
  },
)
</script>
