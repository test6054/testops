<template>
  <div class="ui-checkbox-group" :class="[`ui-checkbox-group--${props.direction}`]">
    <a-checkbox-group
      v-model:value="modelValue"
      class="ui-checkbox-group__control"
      :disabled="props.disabled"
      v-bind="$attrs"
    >
      <template v-if="props.options.length > 0">
        <UiCheckbox
          v-for="option in props.options"
          :key="String(option.value)"
          :value="option.value"
          :disabled="props.disabled || option.disabled"
        >
          {{ option.label }}
        </UiCheckbox>
      </template>
      <slot v-else />
    </a-checkbox-group>
  </div>
</template>

<script lang="ts" setup>
import type { UiOptionValue, UiSelectOption } from './types'
import { provide } from 'vue'
import { uiCheckboxGroupKey } from './context'
import UiCheckbox from './UiCheckbox.vue'

defineOptions({
  name: 'UiCheckboxGroup',
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

provide(uiCheckboxGroupKey, true)
</script>

<style lang="scss" scoped>
.ui-checkbox-group {
  width: 100%;
}

.ui-checkbox-group :deep(.ant-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component);
}

.ui-checkbox-group--vertical :deep(.ant-checkbox-group) {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--dp-space-component-tight);
}
</style>
