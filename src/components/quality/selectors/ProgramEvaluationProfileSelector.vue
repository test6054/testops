<!--
  专业评价口径选择�?  数据源：POST /api/quality/program-evaluation-profiles/page
  - 必传 programId 时按专业过滤；不传时返回当前租户全部启用口径
  - 显示「认证类�?+ 评价方法 + 评价周期」三段语义，便于教师识别
-->
<script setup lang="ts">
import type { ProgramEvaluationProfileVO } from '@/apis/quality/program-evaluation-profile'
import type { AccreditationTypeCode, EvaluationMethodCode } from '@/apis/quality/types'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { programEvaluationProfileApi } from '@/apis/quality/program-evaluation-profile'
import { AccreditationTypeDescription, EvaluationMethodDescription } from '@/apis/quality/types'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { loadSelectorFirstPage, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS } from './page-contract'

interface Props {
  value?: string | null
  /** 按专业大类过�? */
  programId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
  /** 是否仅显示启�? */
  onlyEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择评价口径',
  allowClear: true,
  disabled: false,
  width: '100%',
  onlyEnabled: true,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: ProgramEvaluationProfileVO]
}>()

const options = ref<ProgramEvaluationProfileVO[]>([])
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
  () => props.programId,
  () => loadOptions(),
)

async function loadOptions(keyword?: string) {
  loading.value = true
  try {
    const all = await loadSelectorFirstPage((pageNum, pageSize) =>
      programEvaluationProfileApi.page({
        pageNum,
        pageSize,
        enabled: props.onlyEnabled ? true : undefined,
        keyword: (keyword ?? searchText.value)?.trim() || undefined,
      }),
    )
    options.value = props.programId ? all.filter((p) => p.programId === props.programId) : all
  } catch (e) {
    showUserError(e, '评价口径列表加载失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: `${opt.programName} · ${accreditationTypeLabel(opt.accreditationType)}`,
  })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadOptions(val), QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

function handleChange(val: UiOptionValue | UiOptionValue[] | undefined) {
  const next: string | null = typeof val === 'string' ? val : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => o.id === next)
  emit('update:value', next)
  emit('change', next, option)
}

function accreditationTypeLabel(value: AccreditationTypeCode) {
  return strictEnumLabel(AccreditationTypeDescription, value, '认证类型')
}

function evaluationMethodLabel(value: EvaluationMethodCode) {
  return strictEnumLabel(EvaluationMethodDescription, value, '评价方法')
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
      <template v-for="opt in options" :key="opt.id">
        <template v-if="opt.id === optionValue">
          <span>{{ opt.programName }}</span>
          <span class="dp-selector-option-meta">
            ·
            {{ accreditationTypeLabel(opt.accreditationType) }}
          </span>
          <span class="dp-selector-option-meta">
            ·
            {{ evaluationMethodLabel(opt.evaluationMethod) }}
          </span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>

<style scoped>
.text-gray-400 {
  color: var(--dp-text-tertiary);
}

.ml-1 {
  margin-left: 4px;
}
</style>
