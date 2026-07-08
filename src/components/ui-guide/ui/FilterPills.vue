<template>
  <div class="dp-filter-pills" :class="{ 'dp-filter-pills--vertical': vertical }">
    <div
      class="dp-filter-pills__container"
      :class="{ 'is-collapsed': !expanded && collapsible && visibleOverflow }"
    >
      <button
        v-for="(option, index) in options"
        :key="option.value ?? `option-${index}`"
        type="button"
        class="dp-filter-pill"
        :class="{
          'is-active': isSelected(option.value),
          'is-disabled': option.disabled,
        }"
        :disabled="option.disabled"
        @click="handleSelect(option.value)"
      >
        <span class="dp-filter-pill__label">{{ option.label }}</span>
        <span v-if="option.count !== undefined" class="dp-filter-pill__count">
          {{ option.count }}
        </span>
      </button>
    </div>

    <button
      v-if="collapsible && visibleOverflow"
      type="button"
      class="dp-filter-pills__toggle"
      @click="toggleExpanded"
    >
      <span>{{ expanded ? collapseText : expandText }}</span>
      <svg
        class="dp-filter-pills__toggle-icon"
        :class="{ 'is-expanded': expanded }"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 4.5L6 7.5L9 4.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</template>

<script lang="ts" setup>
import type { FilterPillModelValue, FilterPillOption } from './types'
import { computed, ref } from 'vue'

defineOptions({
  name: 'UiFilterPills',
  inheritAttrs: false,
})

const modelValue = defineModel<FilterPillModelValue>()

const props = withDefaults(defineProps<Omit<Props, 'modelValue'>>(), {
  options: () => [],
  multiple: false,
  collapsible: true,
  vertical: false,
  maxVisibleItems: 8,
  expandText: '更多',
  collapseText: '收起',
  allowDeselect: true,
})

const emit = defineEmits<{
  (e: 'change', value: FilterPillModelValue): void
}>()

interface Props {
  options?: FilterPillOption[]
  modelValue?: FilterPillModelValue
  multiple?: boolean
  collapsible?: boolean
  vertical?: boolean
  maxVisibleItems?: number
  expandText?: string
  collapseText?: string
  allowDeselect?: boolean
}

const expanded = ref(false)
const visibleOverflow = computed(() => props.options.length > props.maxVisibleItems)

function isMultipleSelection(
  value: FilterPillModelValue | undefined,
): value is Array<string | number> {
  return Array.isArray(value)
}

const isSelected = (value: string | number | null): boolean => {
  if (props.multiple) {
    if (!isMultipleSelection(modelValue.value)) {
      return false
    }
    if (value === null) {
      return false
    }
    return modelValue.value.includes(value)
  }
  return modelValue.value === value
}

const handleSelect = (value: string | number | null) => {
  let newValue: FilterPillModelValue

  if (props.multiple) {
    const currentValues = isMultipleSelection(modelValue.value) ? [...modelValue.value] : []
    const index = currentValues.findIndex((item) => item === value)

    if (index > -1) {
      currentValues.splice(index, 1)
    } else if (value !== null) {
      currentValues.push(value)
    }

    newValue = currentValues
  } else {
    newValue = modelValue.value === value ? (props.allowDeselect ? null : value) : value
  }

  modelValue.value = newValue
  emit('change', newValue)
}

const toggleExpanded = () => {
  expanded.value = !expanded.value
}
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.dp-filter-pills {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  width: 100%;
}

.dp-filter-pills--vertical {
  flex-direction: column;
}

.dp-filter-pills__container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
  overflow: hidden;
  max-height: none;
}

.dp-filter-pills__container.is-collapsed {
  max-height: 44px;
}

.dp-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  min-height: 36px;
  border-radius: var(--dp-radius-control);
  border: none;
  background-color: transparent;
  color: var(--ant-color-text, #1f2937);
  font-size: 15px;
  font-weight: 600;
  font-family: var(--dp-font-family);
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.dp-filter-pill:hover:not(.is-disabled):not(.is-active) {
  background-color: rgba(148, 163, 184, 0.12);
  color: var(--dp-text-primary);
}

.dp-filter-pill.is-active {
  background: rgba(37, 99, 235, 0.08);
  color: var(--dp-blue-700);
  font-weight: 600;
}

.dp-filter-pill.is-active:hover:not(.is-disabled) {
  background: rgba(37, 99, 235, 0.12);
  color: var(--dp-blue-700);
}

.dp-filter-pill.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
  background-color: transparent;
  color: var(--dp-text-muted);
}

.dp-filter-pill__label {
  line-height: 1.4;
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  padding: 0;
}

.dp-filter-pill__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--dp-radius-control-inner);
  background-color: rgba(0, 0, 0, 0.1);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.dp-filter-pill.is-active .dp-filter-pill__count {
  background-color: #dbeafe;
}

.dp-filter-pills__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  min-height: 36px;
  border-radius: var(--dp-radius-control);
  border: none;
  background-color: transparent;
  color: var(--dp-text-secondary);
  font-size: 14px;
  font-weight: 600;
  font-family: var(--dp-font-family);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: auto; /* 始终靠右 */
  transition: all 0.2s ease;
}

.dp-filter-pills__toggle:hover {
  background-color: rgba(148, 163, 184, 0.12);
  color: var(--dp-text-primary);
}

.dp-filter-pills__toggle-icon {
  transition: transform 0.2s ease;
}

.dp-filter-pills__toggle-icon.is-expanded {
  transform: rotate(180deg);
}

/* 响应式适配 */
@media (max-width: bp.$layout-mobile-max) {
  .dp-filter-pills {
    flex-direction: column;
  }

  .dp-filter-pills__toggle {
    width: 100%;
    justify-content: center;
  }

  .dp-filter-pill {
    min-height: 34px;
    font-size: 14px;
  }
}
</style>
