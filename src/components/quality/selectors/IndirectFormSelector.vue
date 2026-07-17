<!--
  间接评价问卷选择�?  数据源：POST /api/quality/indirect-forms/page
-->
<script setup lang="ts">
import type { IndirectEvaluationFormVO } from '@/apis/quality/indirect-form'
import type { AchievementTargetTypeCode, IndirectFormTypeCode } from '@/apis/quality/types'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { indirectFormApi } from '@/apis/quality/indirect-form'
import { IndirectFormTypeDescription } from '@/apis/quality/types'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { loadSelectorFirstPage } from './page-contract'

interface Props {
  value?: string | null
  formType?: IndirectFormTypeCode | null
  targetType?: AchievementTargetTypeCode
  targetId?: string | null
  programId?: string | null
  enabled?: boolean
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择间接评价问卷',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: IndirectEvaluationFormVO]
}>()

const options = ref<IndirectEvaluationFormVO[]>([])
const loading = ref(false)
const searchText = ref('')
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => [props.formType, props.targetType, props.targetId, props.programId, props.enabled],
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      indirectFormApi.page({
        pageNum,
        pageSize,
        formType: props.formType || undefined,
        targetType: props.targetType,
        targetId: props.targetId || undefined,
        programId: props.programId || undefined,
        enabled: props.enabled,
      }),
    )
  } catch (e) {
    showUserError(e, '间接评价问卷列表加载失败')
  } finally {
    loading.value = false
  }
}

/** 后端�?keyword 参数，仅在首屏条数内做客户端过滤�? */
const filteredOptions = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return options.value
  return options.value.filter((opt) =>
    [opt.formCode, opt.formName, opt.formType].some(
      (item) => item != null && String(item).toLowerCase().includes(keyword),
    ),
  )
})


const selectOptions = computed<UiSelectOption[]>(() =>
  filteredOptions.value.map((opt) => ({
    value: opt.id,
    label: `${opt.formCode} · ${opt.formName}`,
  })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleSearch(value: string): void {
  searchText.value = value
}

function handleChange(value: UiOptionValue | UiOptionValue[] | undefined): void {
  const next: string | null = typeof value === 'string' ? value : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => o.id === next)
  emit('update:value', next)
  emit('change', next, option)
}

function formTypeLabel(value: IndirectFormTypeCode): string {
  return strictEnumLabel(IndirectFormTypeDescription, value, '间接评价问卷类型')
}

onMounted(() => {
  loadOptions()
})

defineExpose({ reload: loadOptions })
</script>

<template>
  <UiSelect
    v-model="internalValue"
    class="dp-quality-selector"
    :style="controlStyle"
    size="sm"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :disabled="disabled"
    :loading="loading"
    allow-search
    :filter-option="false"
    @search="handleSearch"
    :options="selectOptions"
    @update:model-value="handleChange"
  >
    <template #option="{ value: optionValue }">
      <template v-for="opt in filteredOptions" :key="opt.id">
        <template v-if="opt.id === optionValue">
          <span class="dp-selector-option-code">{{ opt.formCode }}</span>
          {{ opt.formName }}
          <span v-if="opt.formType" class="dp-selector-option-meta">· {{ formTypeLabel(opt.formType) }}</span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>
