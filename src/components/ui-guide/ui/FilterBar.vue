<template>
  <div
    class="dp-advanced-filter dp-filter-bar"
    :class="`dp-filter-bar--${variant}`"
    v-bind="$attrs"
  >
    <slot />

    <template v-for="field in fields" :key="field.key">
      <div class="dp-filter-bar__field" :style="getFieldStyle(field)">
        <span v-if="field.label && showLabels" class="dp-filter-bar__label">{{ field.label }}</span>
        <UiSearchBox
          v-if="(field.type || 'input') === 'input' && field.inputPrefixIcon === 'search'"
          :model-value="String(modelValue[field.key] ?? '')"
          :placeholder="field.placeholder || ''"
          :allow-clear="field.allowClear !== false"
          :disabled="field.disabled"
          :size="resolveAntSize(field.size)"
          @update:model-value="handleFieldUpdate(field, $event)"
          @search="handleSearchBoxSearch"
          @clear="() => handleInputClear(field.key)"
        />
        <UiInput
          v-else-if="(field.type || 'input') === 'input'"
          :model-value="String(modelValue[field.key] ?? '')"
          :placeholder="field.placeholder || ''"
          :disabled="field.disabled"
          :size="field.size"
          :status="field.status"
          @update:model-value="handleFieldUpdate(field, $event)"
          @enter="() => triggerSearch()"
        />
        <UiSelect
          v-else-if="field.type === 'select'"
          :mode="field.mode === 'multiple' ? 'multiple' : undefined"
          :model-value="
            field.mode === 'multiple'
              ? getMultiSelectValue(modelValue[field.key], field.defaultValue)
              : getSingleSelectValue(modelValue[field.key], field.defaultValue)
          "
          :options="mapSelectOptions(field)"
          :allow-clear="field.allowClear !== false"
          :allow-search="field.allowSearch || false"
          :placeholder="field.placeholder || ''"
          :disabled="field.disabled"
          :size="field.size"
          :status="field.status"
          @update:model-value="handleFieldUpdate(field, $event)"
        />
        <UiDatePicker
          v-else-if="field.type === 'date'"
          :model-value="getDateValue(modelValue[field.key], field.defaultValue)"
          :placeholder="field.placeholder || ''"
          :allow-clear="field.allowClear !== false"
          :disabled="field.disabled"
          :size="field.size"
          :status="field.status"
          :show-time="field.showTime"
          :format="field.format"
          :value-format="field.valueFormat"
          @update:model-value="handleFieldUpdate(field, $event)"
        />
        <UiYearPicker
          v-else-if="field.type === 'year'"
          :model-value="getDateValue(modelValue[field.key], field.defaultValue)"
          :placeholder="field.placeholder || ''"
          :allow-clear="field.allowClear !== false"
          :disabled="field.disabled"
          :size="field.size"
          :status="field.status"
          :format="field.format"
          :value-format="field.valueFormat"
          @update:model-value="handleFieldUpdate(field, $event)"
        />
        <div v-else class="dp-filter-bar__control">
          <slot
            :name="`field-${field.key}`"
            :field="field"
            :value="modelValue[field.key]"
            :update="(value: unknown) => updateField(field.key, value, field)"
            :search="triggerSearch"
            :reset="triggerReset"
          />
        </div>
      </div>
    </template>

    <div
      v-if="!hideActions"
      class="dp-advanced-filter__actions"
      :class="[`dp-filter-bar__actions--${actionsAlign}`]"
    >
      <slot name="actions">
        <UiButton size="sm" class="dp-button-row__btn" @click="handleSearchClick">
          <SearchOutlined />
          {{ searchText }}
        </UiButton>
        <UiButton size="sm" variant="outline" class="dp-button-row__btn" @click="handleResetClick">
          <ReloadOutlined />
          {{ resetText }}
        </UiButton>
      </slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { SizeType } from 'ant-design-vue/es/config-provider'
import type { FilterField, UiOptionValue } from './types'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import { computed } from 'vue'
// 直接导入组件，避免通过 index.ts 产生循环依赖
import UiButton from './Button.vue'
import UiDatePicker from './DatePicker.vue'
import UiInput from './Input.vue'
import UiSearchBox from './SearchBox.vue'
import UiSelect from './UiSelect.vue'
import UiYearPicker from './YearPicker.vue'

defineOptions({
  name: 'UiFilterBar',
  inheritAttrs: false,
})

const modelValue = defineModel<Record<string, unknown>>({ default: () => ({}) })

const {
  fields = [],
  searchText = '搜索',
  resetText = '重置',
  actionsAlign = 'start',
  showLabels = false,
  variant = 'plain',
  hideActions = false,
} = defineProps<{
  fields?: FilterField[]
  searchText?: string
  resetText?: string
  actionsAlign?: 'start' | 'end'
  showLabels?: boolean
  /** panel：工作台筛选壳；plain：卡片内嵌无壳（默认） */
  variant?: 'panel' | 'plain'
  /** 隐藏搜索/重置操作区（卡片内纯选择器场景） */
  hideActions?: boolean
}>()

const emit = defineEmits<{
  search: [value: Record<string, unknown>]
  reset: [value: Record<string, unknown>]
}>()

const defaultModel = computed(() => {
  return fields.reduce<Record<string, unknown>>((acc, field) => {
    acc[field.key] = resolveFieldDefault(field)
    return acc
  }, {})
})

const updateField = (key: string, value: unknown, field?: FilterField) => {
  const normalizedValue = normalizeFieldValue(value, field)
  const nextModel = {
    ...modelValue.value,
    [key]: normalizedValue,
  }
  modelValue.value = nextModel

  if (shouldTriggerSearchOnChange(field)) {
    queueMicrotask(() => triggerSearch(nextModel))
  }
}

const handleFieldUpdate = (field: FilterField, value: unknown) => {
  updateField(field.key, value, field)
}

const handleSearchBoxSearch = () => {
  triggerSearch()
}

const triggerSearch = (nextModel: Record<string, unknown> = modelValue.value) => {
  emit('search', nextModel)
}

const triggerReset = () => {
  const nextModel = { ...defaultModel.value }
  modelValue.value = nextModel
  emit('reset', nextModel)
}

const handleSearchClick = () => {
  triggerSearch()
}

const handleResetClick = () => {
  triggerReset()
}

// 输入框清除时触发搜索
const handleInputClear = (key: string) => {
  const nextModel = {
    ...modelValue.value,
    [key]: '',
  }
  modelValue.value = nextModel
  queueMicrotask(() => triggerSearch(nextModel))
}

const mapSelectOptions = (field: FilterField) => {
  return (field.options || []).map((opt) => ({
    label: opt.label,
    value: String(opt.value ?? ''),
  }))
}

const normalizeOptionValue = (value: unknown): UiOptionValue => {
  if (typeof value === 'number') {
    return value
  }
  return String(value ?? '')
}

const getFieldStyle = (field: FilterField) => {
  const style: Record<string, string> = {}
  const widthPx
    = field.width !== undefined
      ? typeof field.width === 'number'
        ? field.width
        : Number.parseFloat(String(field.width))
      : undefined
  const resolvedWidth = widthPx !== undefined && !Number.isNaN(widthPx) ? widthPx : undefined

  if (resolvedWidth !== undefined) {
    style.width = `${resolvedWidth}px`
    style.flex = '0 0 auto'
  } else if (field.flex !== undefined) {
    style.flex = typeof field.flex === 'number' ? `${field.flex}` : String(field.flex)
  }

  const minWidth = field.minWidth ?? (resolvedWidth !== undefined ? resolvedWidth : 220)
  const maxWidth = field.maxWidth ?? 360
  style.minWidth = typeof minWidth === 'number' ? `${minWidth}px` : String(minWidth)
  style.maxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : String(maxWidth)
  return style
}

const getSingleSelectValue = (value: unknown, defaultValue: unknown): UiOptionValue | undefined => {
  const val = value ?? defaultValue
  if (val === null || val === undefined || val === '') {
    return undefined
  }
  if (Array.isArray(val)) {
    const firstValue = val[0]
    return firstValue === undefined ? undefined : normalizeOptionValue(firstValue)
  }
  return normalizeOptionValue(val)
}

const getMultiSelectValue = (
  value: unknown,
  defaultValue: unknown,
): UiOptionValue[] | undefined => {
  const val = value ?? defaultValue
  if (val === null || val === undefined || val === '') {
    return undefined
  }
  if (Array.isArray(val)) {
    return val.map((item) => normalizeOptionValue(item))
  }
  return [normalizeOptionValue(val)]
}

const getDateValue = (value: unknown, defaultValue: unknown): string | undefined => {
  const val = value ?? defaultValue
  if (val === null || val === undefined || val === '') return undefined
  return String(val)
}

const resolveFieldDefault = (field: FilterField) => {
  if (field.defaultValue !== undefined) return field.defaultValue
  if (field.type === 'select' && field.mode === 'multiple') return []
  if (field.type === 'select' || field.type === 'date' || field.type === 'year') return undefined
  return ''
}

const normalizeFieldValue = (value: unknown, field?: FilterField) => {
  if (field?.type === 'select' && field.mode === 'multiple') {
    if (Array.isArray(value)) {
      return value
    }
    return []
  }
  if (value === null || value === undefined) {
    if (field?.type === 'select' || field?.type === 'date' || field?.type === 'year')
      return undefined
    return ''
  }
  if (
    value === ''
    && (field?.type === 'select' || field?.type === 'date' || field?.type === 'year')
  ) {
    return undefined
  }
  return value
}

const shouldTriggerSearchOnChange = (field?: FilterField) => {
  if (!field) return false
  if (field.triggerSearchOnChange !== undefined) return field.triggerSearchOnChange
  return field.type === 'select' || field.type === 'date' || field.type === 'year'
}

const resolveAntSize = (size?: FilterField['size']): SizeType => {
  if (size === 'sm') return 'small'
  if (size === 'lg') return 'large'
  return 'middle'
}
</script>

<style scoped>
.dp-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--dp-space-3);
}

.dp-filter-bar--panel {
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  padding: var(--dp-space-2) var(--dp-space-3);
  box-shadow: var(--dp-shadow-xs);
}

.dp-filter-bar--plain {
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.dp-filter-bar__field {
  flex: 0 0 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-1, 4px);
}

.dp-filter-bar__control {
  width: 100%;
  min-width: 0;
}

.dp-filter-bar__control :deep(.ui-select),
.dp-filter-bar__control :deep(.ant-select) {
  width: 100%;
}

.dp-filter-bar__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--dp-text-secondary);
  line-height: 1.4;
  white-space: nowrap;
}

.dp-advanced-filter__actions {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
  flex-wrap: wrap;
  flex: 0 1 auto;
  flex-shrink: 0;
  margin-left: auto;
  align-self: flex-end;
}

.dp-filter-bar__actions--end {
  margin-left: auto;
}

.dp-filter-bar__actions--start {
  margin-left: auto;
}

:deep(.ant-input-affix-wrapper),
:deep(.ant-select-selector) {
  border-radius: var(--dp-radius-control);
  height: var(--dp-control-height-md, 36px);
}

:deep(.ant-select) {
  height: var(--dp-control-height-md, 36px);
}

:deep(.dp-btn),
:deep(.ant-btn) {
  min-height: var(--dp-control-height-md, 36px);
  padding: 6px 12px;
  border-radius: var(--dp-radius-control);
  white-space: nowrap;
}
</style>
