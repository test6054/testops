<template>
  <div
    class="dp-input-wrap"
    :class="[
      `dp-input-wrap--${size}`,
      `dp-input-wrap--${status}`,
      {
        'dp-input-wrap--disabled': disabled,
        'dp-input-wrap--readonly': readonly,
      },
    ]"
  >
    <span v-if="$slots.prefix" class="dp-input__affix dp-input__affix--prefix">
      <slot name="prefix" />
    </span>
    <input
      ref="inputRef"
      v-bind="inputAttrs"
      :value="displayValue"
      class="dp-input"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :maxlength="maxlength"
      @input="handleInput"
      @change="handleChange"
      @keyup.enter="handleEnter"
      @focus="handleFocus"
      @blur="handleBlur"
      @compositionstart="handleCompositionStart"
      @compositionend="handleCompositionEnd"
    />
    <button
      v-if="clearable && !readonly && !disabled && displayValue !== ''"
      type="button"
      class="dp-input__clear"
      tabindex="-1"
      aria-label="清空内容"
      @click="handleClear"
    >
      <span aria-hidden="true">×</span>
    </button>
    <span v-if="$slots.suffix" class="dp-input__affix dp-input__affix--suffix">
      <slot name="suffix" />
    </span>
  </div>
</template>

<script lang="ts" setup>
import type { UiComponentSize, UiFieldStatus } from './types'
import { computed, ref, useAttrs } from 'vue'

defineOptions({
  name: 'UiInput',
  inheritAttrs: false,
})

const modelValue = defineModel<string | number | undefined>({ default: '' })

const {
  type = 'text',
  size = 'md',
  status = 'default',
  disabled = false,
  readonly = false,
  placeholder = '',
  maxlength = undefined,
  clearable = false,
} = defineProps<{
  type?: string
  size?: UiComponentSize
  status?: UiFieldStatus
  disabled?: boolean
  readonly?: boolean
  placeholder?: string
  maxlength?: number
  clearable?: boolean
}>()

const emit = defineEmits<{
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'change', value: string | number | undefined, event?: Event): void
  (e: 'update:value', value: string | number | undefined): void
  (e: 'enter', event: KeyboardEvent): void
  (e: 'clear'): void
}>()

const attrs = useAttrs()

/** 排除 Form 注入的 value，避免与 displayValue 抢绑定 */
const inputAttrs = computed(() => {
  const next: Record<string, unknown> = { ...attrs }
  delete next.value
  delete next['onUpdate:value']
  return next
})

// 中文输入法组合状态
const inputRef = ref<HTMLInputElement | null>(null)
const isComposing = ref(false)

const displayValue = computed(() => modelValue.value ?? '')

const normalizeValue = (nextValue: string) => {
  if (type === 'number') {
    if (nextValue === '') return undefined
    return nextValue
  }
  return nextValue
}

const handleCompositionStart = () => {
  isComposing.value = true
}

/** 同步 modelValue，并通知 a-form（change / update:value）清除校验 */
function commitValue(nextValue: string | number | undefined, event?: Event): void {
  modelValue.value = nextValue
  emit('update:value', nextValue)
  emit('change', nextValue, event)
}

const handleCompositionEnd = (event: CompositionEvent) => {
  isComposing.value = false
  // 组合结束后手动更新值
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  commitValue(normalizeValue(event.target.value), event)
}

const handleInput = (event: Event) => {
  // 中文输入组合中不更新，等组合结束再更新
  if (isComposing.value) return
  if (!(event.target instanceof HTMLInputElement)) {
    return
  }
  commitValue(normalizeValue(event.target.value), event)
}

const handleChange = (event: Event) => {
  emit('change', modelValue.value, event)
}

const handleEnter = (event: KeyboardEvent) => {
  // 中文输入组合中不触发回车
  if (isComposing.value) return
  emit('enter', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleClear = () => {
  commitValue(undefined)
  emit('clear')
  inputRef.value?.focus()
}
</script>

<style scoped>
.dp-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  width: 100%;
  box-sizing: border-box;
  border-radius: var(--dp-radius-control);
  border: 1px solid var(--dp-border);
  background-color: var(--dp-bg-control);
  font-size: 14px;
  line-height: 22px;
  color: var(--dp-text-primary);
  font-family: var(--dp-font-family);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.dp-input {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  height: 100%;
  margin: 0;
  padding: 0 var(--dp-space-3, 12px);
  border: none;
  background: transparent;
  font-size: 14px;
  line-height: 22px;
  color: inherit;
  font-family: inherit;
  outline: none;
}

.dp-input::-webkit-outer-spin-button,
.dp-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.dp-input-wrap--sm {
  height: var(--dp-control-height-sm, 32px);
  min-height: var(--dp-control-height-sm, 32px);
}

.dp-input-wrap--md {
  height: var(--dp-control-height-md, 36px);
  min-height: var(--dp-control-height-md, 36px);
}

.dp-input-wrap--lg {
  height: var(--dp-control-height-lg, 40px);
  min-height: var(--dp-control-height-lg, 40px);
}

.dp-input-wrap:hover {
  border-color: var(--dp-blue-600);
}

.dp-input-wrap:focus-within {
  border-color: var(--dp-blue-600);
  box-shadow: 0 0 0 3px var(--dp-focus-ring);
}

.dp-input::placeholder {
  color: var(--dp-text-muted);
  line-height: inherit;
}

.dp-input-wrap--error {
  border-color: var(--dp-red-500);
}

.dp-input-wrap--warning {
  border-color: var(--dp-orange-500);
}

.dp-input-wrap--success {
  border-color: var(--dp-green-500);
}

.dp-input-wrap--disabled,
.dp-input-wrap--readonly {
  background-color: var(--dp-bg-control-disabled);
}

.dp-input-wrap--disabled {
  cursor: not-allowed;
  opacity: 0.78;
}

.dp-input__affix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dp-text-muted);
  flex-shrink: 0;
}

.dp-input__affix--prefix {
  padding-left: var(--dp-space-3, 12px);
}

.dp-input__affix--suffix {
  padding-right: var(--dp-space-3, 12px);
}

.dp-input__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-right: var(--dp-space-2, 8px);
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--dp-text-muted);
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.dp-input__clear:hover {
  background: var(--dp-gray-200);
  color: var(--dp-text-primary);
}

.dp-input__clear:focus-visible {
  outline: 2px solid var(--dp-blue-600);
  outline-offset: 1px;
  background: var(--dp-gray-200);
  color: var(--dp-text-primary);
}
</style>
