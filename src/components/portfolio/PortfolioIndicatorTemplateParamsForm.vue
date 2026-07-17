<script setup lang="ts">
import type { PortfolioIndicatorTemplateParams } from '@/utils/indicator-template-params'
import { computed } from 'vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import {
  templateParamFieldsForRuleType,
  templateParamLabel,
} from '@/utils/indicator-template-params'

const props = defineProps<{
  ruleType: string
  params: PortfolioIndicatorTemplateParams
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:params': [PortfolioIndicatorTemplateParams]
}>()

const fields = computed(() => templateParamFieldsForRuleType(props.ruleType))

function patch(key: keyof PortfolioIndicatorTemplateParams, value: string | number | null) {
  const next = { ...props.params }
  if (value === null || value === undefined) {
    delete next[key]
    emit('update:params', next)
    return
  }
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num)) {
    delete next[key]
  } else {
    next[key] = num
  }
  emit('update:params', next)
}
</script>

<template>
  <div class="params-grid">
    <UiFormItem v-for="field in fields" :key="field" :label="templateParamLabel(field)">
      <UiInputNumber
        size="sm"
        :value="params[field]"
        :step="field === 'targetRatio' || field === 'weight' ? 0.01 : 1"
        :disabled="props.disabled"
        style="width: 100%"
        @update:value="patch(field, $event)"
      />
    </UiFormItem>
  </div>
</template>

<style scoped>
.params-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}
</style>
