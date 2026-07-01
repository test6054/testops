<template>
  <a-switch
    :checked="modelValue"
    class="ui-switch"
    :class="`ui-switch--${props.size}`"
    :disabled="props.disabled"
    :loading="props.loading"
    :size="antSize"
    v-bind="$attrs"
    @update:checked="handleValueUpdate"
    @change="handleChange"
  />
</template>

<script lang="ts" setup>
import type { SwitchProps } from 'ant-design-vue/es/switch'
import { computed } from 'vue'

defineOptions({
  name: 'UiSwitch',
  inheritAttrs: false,
})

const modelValue = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    loading?: boolean
    size?: 'sm' | 'md'
  }>(),
  {
    disabled: false,
    loading: false,
    size: 'md',
  },
)

const emit = defineEmits<{
  (e: 'change', value: boolean): void
}>()

const antSize = computed(() => (props.size === 'sm' ? 'small' : 'default'))

function handleValueUpdate(value: SwitchProps['checked']) {
  if (typeof value !== 'boolean') {
    return
  }
  modelValue.value = value
}

function handleChange(value: SwitchProps['checked']) {
  if (typeof value !== 'boolean') {
    return
  }
  emit('change', value)
}
</script>

<style lang="scss" scoped>
.ui-switch.ant-switch {
  background: #cbd5e1;
  border: 1px solid transparent;
  box-shadow: none;
}

.ui-switch.ant-switch:hover:not(.ant-switch-disabled) {
  background: #94a3b8;
}

.ui-switch.ant-switch.ant-switch-checked {
  background: var(--dp-blue-600, #2563eb);
}

.ui-switch.ant-switch.ant-switch-checked:hover:not(.ant-switch-disabled) {
  background: var(--dp-blue-700, #1d4ed8);
}

.ui-switch.ant-switch:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(37, 99, 235, 0.25));
}

.ui-switch.ant-switch :deep(.ant-switch-handle::before) {
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.16);
}

.ui-switch--sm.ant-switch {
  min-width: 34px;
}

.ui-switch--md.ant-switch {
  min-width: 40px;
}

.ui-switch.ant-switch.ant-switch-disabled {
  opacity: 0.56;
}
</style>
