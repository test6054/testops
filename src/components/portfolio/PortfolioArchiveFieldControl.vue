<script setup lang="ts">
import type { PortfolioArchiveFieldSchema } from '@/apis/portfolio/types'
import { computed } from 'vue'
import UiDatePicker from '@/components/ui-guide/ui/DatePicker.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { PortfolioArchiveFieldSourceTypeDescription } from '@/types/enums/portfolio-archive-field-source-type-enum'
import { PortfolioArchiveFieldTypeCode } from '@/types/enums/portfolio-archive-field-type-enum'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

const modelValue = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    field: PortfolioArchiveFieldSchema
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    disabled: false,
    placeholder: '',
  },
)

const controlDisabled = computed(() => props.disabled || props.field.readonly === true)

const resolvedPlaceholder = computed(() => {
  if (props.placeholder) {
    return props.placeholder
  }
  return props.field.required ? '必填' : '选填'
})

const sourceHint = computed(() => {
  if (!props.field.readonly || !props.field.sourceType) {
    return ''
  }
  return strictEnumLabel(
    PortfolioArchiveFieldSourceTypeDescription,
    props.field.sourceType,
    '档案字段来源类型',
  )
})

const enumSelectOptions = computed(() =>
  (props.field.enumOptions ?? []).map((item) => ({
    value: item.value,
    label: item.label,
  })),
)

const enumOptionsMissing = computed(
  () =>
    props.field.fieldType === PortfolioArchiveFieldTypeCode.ENUM
    && enumSelectOptions.value.length === 0,
)

const resolvedFieldType = computed(
  () => props.field.fieldType ?? PortfolioArchiveFieldTypeCode.TEXT,
)

const dateValueFormat = computed(() => props.field.formatPattern?.trim() || 'YYYY-MM-DD')

const useLongText = computed(
  () =>
    resolvedFieldType.value === PortfolioArchiveFieldTypeCode.TEXT
    && !props.field.unit?.trim(),
)
</script>

<template>
  <div class="portfolio-archive-field-control">
    <UiAlertStrip
      v-if="enumOptionsMissing"
      tone="error"
      size="sm"
      dense
      title="枚举选项未配置"
      description="该字段缺少可用选项，输入已禁用；请联系模板管理员维护字典。"
    />
    <UiTextarea
      v-if="useLongText"
      v-model="modelValue"
      size="sm"
      :rows="3"
      :disabled="controlDisabled || enumOptionsMissing"
      :placeholder="resolvedPlaceholder"
    />
    <UiInput
      v-else-if="resolvedFieldType === PortfolioArchiveFieldTypeCode.NUMBER"
      v-model="modelValue"
      size="sm"
      type="text"
      inputmode="decimal"
      :disabled="controlDisabled"
      :placeholder="resolvedPlaceholder"
    >
      <template v-if="field.unit?.trim()" #suffix>
        <span class="portfolio-archive-field-control__unit">{{ field.unit }}</span>
      </template>
    </UiInput>
    <UiDatePicker
      v-else-if="resolvedFieldType === PortfolioArchiveFieldTypeCode.DATE"
      v-model="modelValue"
      size="sm"
      :disabled="controlDisabled"
      :placeholder="resolvedPlaceholder"
      :value-format="dateValueFormat"
      :format="dateValueFormat"
    />
    <UiSelect
      v-else-if="resolvedFieldType === PortfolioArchiveFieldTypeCode.SEMESTER"
      v-model="modelValue"
      size="sm"
      :options="SemesterOptions"
      allow-clear
      :disabled="controlDisabled"
      :placeholder="resolvedPlaceholder"
    />
    <UiSelect
      v-else-if="resolvedFieldType === PortfolioArchiveFieldTypeCode.ENUM"
      v-model="modelValue"
      size="sm"
      :options="enumSelectOptions"
      allow-clear
      :disabled="controlDisabled || enumOptionsMissing"
      :placeholder="resolvedPlaceholder"
    />
    <UiInput
      v-else
      v-model="modelValue"
      size="sm"
      :disabled="controlDisabled"
      :placeholder="resolvedPlaceholder"
    >
      <template v-if="field.unit?.trim()" #suffix>
        <span class="portfolio-archive-field-control__unit">{{ field.unit }}</span>
      </template>
    </UiInput>
    <p v-if="sourceHint" class="portfolio-archive-field-control__source">来源：{{ sourceHint }}</p>
  </div>
</template>

<style scoped lang="scss">
.portfolio-archive-field-control {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
}

.portfolio-archive-field-control__unit {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
  white-space: nowrap;
}

.portfolio-archive-field-control__source {
  margin: 0;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}
</style>
