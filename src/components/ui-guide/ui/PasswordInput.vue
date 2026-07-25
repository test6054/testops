<template>
  <div
    class="ui-password-input"
    :class="[
      `ui-password-input--${props.size}`,
      `ui-password-input--${props.status}`,
      {
        'ui-password-input--disabled': props.disabled,
        'ui-password-input--readonly': props.readonly,
      },
    ]"
  >
    <span v-if="$slots.prefix" class="ui-password-input__affix ui-password-input__affix--prefix">
      <slot name="prefix" />
    </span>
    <input
      ref="inputRef"
      :value="displayValue"
      class="ui-password-input__control"
      :type="inputType"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :maxlength="props.maxlength"
      autocomplete="current-password"
      v-bind="$attrs"
      @input="handleInput"
      @change="handleChange"
      @keyup.enter="handleEnter"
      @focus="handleFocus"
      @blur="handleBlur"
    />
    <button
      v-if="props.visibilityToggle && !props.disabled"
      type="button"
      class="ui-password-input__toggle"
      tabindex="-1"
      :class="{ 'ui-password-input__toggle--active': passwordVisible }"
      :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
      :title="passwordVisible ? '隐藏密码' : '显示密码'"
      @click="toggleVisibility"
    >
      <svg
        v-if="passwordVisible"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12s3.5-6 9-6c2.2 0 4.1.96 5.62 2.15" />
        <path d="M21 12s-3.5 6-9 6c-2.2 0-4.1-.96-5.62-2.15" />
        <path d="m4 4 16 16" />
        <path d="M9.88 9.88A3 3 0 0 0 12 15a2.99 2.99 0 0 0 2.12-.88" />
      </svg>
    </button>
    <button
      v-if="props.clearable && !props.readonly && !props.disabled && displayValue !== ''"
      type="button"
      class="ui-password-input__clear"
      tabindex="-1"
      aria-label="清空密码"
      @click="handleClear"
    >
      <span aria-hidden="true">×</span>
    </button>
    <span v-if="$slots.suffix" class="ui-password-input__affix ui-password-input__affix--suffix">
      <slot name="suffix" />
    </span>
  </div>
</template>

<script lang="ts" setup>
import type { UiComponentSize, UiFieldStatus } from './types'
import { computed, ref } from 'vue'

defineOptions({
  name: 'UiPasswordInput',
  inheritAttrs: false,
})

const modelValue = defineModel<string | undefined>({ default: '' })

const props = withDefaults(
  defineProps<{
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    maxlength?: number
    clearable?: boolean
    visibilityToggle?: boolean
    size?: UiComponentSize
    status?: UiFieldStatus
  }>(),
  {
    placeholder: '请输入密码',
    disabled: false,
    readonly: false,
    maxlength: undefined,
    clearable: false,
    visibilityToggle: true,
    size: 'md',
    status: 'default',
  },
)

const emit = defineEmits<{
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'change', value: string | undefined, event: Event): void
  (e: 'enter', event: KeyboardEvent): void
  (e: 'clear'): void
}>()

const passwordVisible = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const displayValue = computed(() => modelValue.value ?? '')

const inputType = computed(() => (passwordVisible.value ? 'text' : 'password'))

const handleInput = (event: Event) => {
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  modelValue.value = event.target.value
}

const handleChange = (event: Event) => {
  emit('change', modelValue.value || undefined, event)
}

const handleEnter = (event: KeyboardEvent) => {
  emit('enter', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleClear = () => {
  modelValue.value = undefined
  emit('clear')
  inputRef.value?.focus()
}

const toggleVisibility = () => {
  passwordVisible.value = !passwordVisible.value
}
</script>

<style scoped>
.ui-password-input {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border-radius: var(--dp-radius-control);
  border: 1px solid var(--dp-border);
  background-color: var(--dp-bg-control);
  color: var(--dp-text-primary);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
  font-family: var(--dp-font-family);
  box-sizing: border-box;
}

.ui-password-input__control {
  width: 100%;
  height: 100%;
  padding: 0 12px;
  border: none;
  background: transparent;
  font-size: var(--dp-font-size-md);
  color: inherit;
  outline: none;
}

.ui-password-input__control::placeholder {
  color: var(--dp-text-muted);
}

.ui-password-input--sm {
  min-height: var(--dp-control-height-sm);
}

.ui-password-input--md {
  min-height: var(--dp-control-height-md);
}

.ui-password-input--lg {
  min-height: var(--dp-control-height-lg);
}

.ui-password-input:hover {
  border-color: var(--dp-blue-600);
}

.ui-password-input:focus-within {
  border-color: var(--dp-blue-600);
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.ui-password-input--error {
  border-color: var(--dp-red-500);
}

.ui-password-input--warning {
  border-color: var(--dp-orange-500);
}

.ui-password-input--success {
  border-color: var(--dp-green-500);
}

.ui-password-input--disabled,
.ui-password-input--readonly {
  background-color: var(--dp-bg-control-disabled);
}

.ui-password-input--disabled {
  cursor: not-allowed;
  opacity: 0.78;
}

.ui-password-input__affix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dp-text-muted);
  flex-shrink: 0;
}

.ui-password-input__affix--prefix {
  padding-left: 12px;
}

.ui-password-input__affix--suffix {
  padding-right: 12px;
}

.ui-password-input__toggle,
.ui-password-input__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--dp-radius-panel);
  background: transparent;
  color: var(--dp-text-muted);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
  flex-shrink: 0;
}

.ui-password-input__toggle:hover,
.ui-password-input__clear:hover {
  background: var(--dp-gray-200);
  color: var(--dp-text-primary);
}

.ui-password-input__toggle:focus-visible,
.ui-password-input__clear:focus-visible {
  outline: 2px solid var(--dp-blue-600);
  outline-offset: 1px;
  background: var(--dp-gray-200);
  color: var(--dp-text-primary);
}

.ui-password-input__toggle {
  margin-right: 4px;
}

.ui-password-input__toggle svg {
  width: 16px;
  height: 16px;
}

.ui-password-input__toggle--active {
  color: var(--dp-blue-600);
}

.ui-password-input__clear {
  width: 22px;
  margin-right: 8px;
}
</style>
