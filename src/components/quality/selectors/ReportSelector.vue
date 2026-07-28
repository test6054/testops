<!--
  教学质量评价报告选择�?  数据源：POST /api/quality/reports/page
  常用过滤：programId / trainingPlanId / qualityCourseId / schoolYear / semester / status / reportType
-->
<script setup lang="ts">
import type { ReportVO } from '@/apis/quality/report'
import type { ReportStatusCode, ReportTypeCode } from '@/apis/quality/types'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { computed, onMounted, ref, watch } from 'vue'
import { reportApi } from '@/apis/quality/report'
import { ReportTypeDescription } from '@/apis/quality/types'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { loadSelectorFirstPage, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS } from './page-contract'

interface Props {
  value?: string | null
  programId?: string | null
  trainingPlanId?: string | null
  accreditationCycleId?: string | null
  qualityCourseId?: string | null
  schoolYear?: string | null
  semester?: SemesterCode | null
  status?: ReportStatusCode
  reportType?: ReportTypeCode
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择报告',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: ReportVO]
}>()

const options = ref<ReportVO[]>([])
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
  () => [
    props.programId,
    props.trainingPlanId,
    props.accreditationCycleId,
    props.qualityCourseId,
    props.schoolYear,
    props.semester,
    props.status,
    props.reportType,
  ],
  () => loadOptions(),
)

async function loadOptions(keyword?: string) {
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      reportApi.page({
        pageNum,
        pageSize,
        programId: props.programId || undefined,
        trainingPlanId: props.trainingPlanId || undefined,
        accreditationCycleId: props.accreditationCycleId || undefined,
        qualityCourseId: props.qualityCourseId || undefined,
        schoolYear: props.schoolYear || undefined,
        semester: props.semester || undefined,
        status: props.status,
        reportType: props.reportType,
        keyword: (keyword ?? searchText.value)?.trim() || undefined,
      }),
    )
  } catch (e) {
    showUserError(e, '教学质量评价报告列表加载失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: opt.title,
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

function reportTypeLabel(value: ReportTypeCode) {
  return strictEnumLabel(ReportTypeDescription, value, '教学质量评价报告类型')
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
          {{ opt.title }}
          <span v-if="opt.reportType" class="dp-selector-option-meta">· {{ reportTypeLabel(opt.reportType) }}</span>
          <span v-if="opt.schoolYear" class="dp-selector-option-meta">
            ({{ opt.schoolYear }}<span v-if="opt.semester">/{{ formatSemester(opt.semester) }}</span>)
          </span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>

<style scoped>
.text-gray-400 {
  color: var(--dp-text-muted);
}

.ml-1 {
  margin-left: var(--dp-space-component-xs);
}
</style>
