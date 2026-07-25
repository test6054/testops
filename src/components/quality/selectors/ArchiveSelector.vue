<!--
  材料归档选择�?  数据源：POST /api/quality/archives/page
  常用过滤：businessType / archiveCategory / archiveOfficeConfirmed
-->
<script setup lang="ts">
import type { ArchiveVO } from '@/apis/quality/archive'
import type { ArchiveBusinessTypeCode } from '@/apis/quality/types'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { archiveApi } from '@/apis/quality/archive'
import { ArchiveBusinessTypeDescription } from '@/apis/quality/types'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { loadSelectorFirstPage, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS } from './page-contract'

interface Props {
  value?: string | null
  businessType?: ArchiveBusinessTypeCode | null
  archiveCategory?: string | null
  /** 仅返回已被档案室确认的归�? */
  onlyConfirmed?: boolean
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择归档',
  allowClear: true,
  disabled: false,
  width: '100%',
  onlyConfirmed: false,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: ArchiveVO]
}>()

const options = ref<ArchiveVO[]>([])
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
  () => [props.businessType, props.archiveCategory, props.onlyConfirmed],
  () => loadOptions(),
)

async function loadOptions(keyword?: string) {
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage(
      (pageNum, pageSize) =>
        archiveApi.page({
          pageNum,
          pageSize,
          businessType: props.businessType || undefined,
          archiveCategory: props.archiveCategory || undefined,
          archiveOfficeConfirmed: props.onlyConfirmed ? true : undefined,
          keyword: (keyword ?? searchText.value)?.trim() || undefined,
        }))
  } catch (e) {
    showUserError(e, '质量档案列表加载失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: opt.archiveCode,
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

function archiveBusinessTypeLabel(value: ArchiveBusinessTypeCode): string {
  return strictEnumLabel(ArchiveBusinessTypeDescription, value, '归档业务类型')
}

function handleChange(val: UiOptionValue | UiOptionValue[] | undefined) {
  const next: string | null = typeof val === 'string' ? val : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => o.id === next)
  emit('update:value', next)
  emit('change', next, option)
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
          <span class="dp-selector-option-code">{{ opt.archiveCode }}</span>
          <span v-if="opt.fileName">{{ opt.fileName }}</span>
          <span v-if="opt.businessType" class="dp-selector-option-meta">
            · {{ archiveBusinessTypeLabel(opt.businessType) }}
          </span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>

<style scoped>
.text-xs {
  font-size: var(--dp-font-size-xs);
}

.text-gray-500 {
  color: var(--dp-text-muted);
}

.text-gray-400 {
  color: var(--dp-text-muted);
}

.mr-1 {
  margin-right: var(--dp-space-component-xs);
}

.ml-1 {
  margin-left: var(--dp-space-component-xs);
}
</style>
