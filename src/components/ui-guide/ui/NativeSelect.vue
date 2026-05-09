<template>
  <label class="dp-select">
    <select
      class="dp-select__control"
      :value="modelValue ?? ''"
      v-bind="$attrs"
      @change="onChange"
    >
      <option v-if="placeholder" value="" disabled>
        {{ placeholder }}
      </option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <span class="dp-select__arrow" aria-hidden="true">▾</span>
  </label>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiNativeSelect' })

const modelValue = defineModel<string | number | undefined>()

const {options, placeholder = ''} = defineProps<{
  options: OptionItem[]
  placeholder?: string
}>()

interface OptionItem {
  label: string
  value: string | number
}

const onChange = (evt: Event) => {
  const target = evt.target as HTMLSelectElement
  const value = target.value
  modelValue.value = value === '' ? undefined : value
}
</script>

<style scoped>
.dp-select {
  position: relative;
  display: inline-block;
  width: 100%;
}

.dp-select__control {
  appearance: none;
  width: 100%;
  height: 36px;
  padding: 0 36px 0 12px;
  border-radius: var(--ant-border-radius);
  border: 1px solid var(--ant-color-border);
  background-color: var(--ant-color-bg-container);
  font-size: 14px;
  color: var(--ant-color-text);
  transition: border-color var(--dp-duration-normal) ease, box-shadow var(--dp-duration-normal) ease;
  font-family: var(--dp-font-family);
  outline: none;
  cursor: pointer;
}

.dp-select__control:hover {
  border-color: var(--ant-color-primary-border-hover);
}

.dp-select__control:focus {
  border-color: var(--ant-color-primary);
  box-shadow: 0 0 0 2px var(--dp-focus-ring);
}

.dp-select__control:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 下拉选项样式 */
.dp-select__control option {
  padding: 8px 12px;
  background-color: var(--ant-color-bg-container);
  color: var(--ant-color-text);
  font-size: 14px;
  font-family: var(--dp-font-family);
}

.dp-select__control option:hover {
  background-color: var(--ant-color-fill-quaternary);
}

.dp-select__control option:checked {
  background-color: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
  font-weight: 500;
}

.dp-select__control option:disabled {
  color: var(--ant-color-text-tertiary);
  cursor: not-allowed;
}

.dp-select__arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--ant-color-text-tertiary);
  font-size: 16px;
  opacity: 0.5;
}
</style>
