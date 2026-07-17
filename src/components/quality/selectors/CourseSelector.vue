<!--
  质量评价课程选择器
  数据源：POST /api/quality/courses/page
  可传 trainingPlanId / programId 过滤
-->
<script setup lang="ts">
import type { QualityCourseVO } from '@/apis/quality/quality-course'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { computed, onMounted, ref, watch } from 'vue'
import { qualityCourseApi } from '@/apis/quality/quality-course'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { loadSelectorFirstPage, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS } from './page-contract'

interface Props {
  value?: string | null
  trainingPlanId?: string | null
  programId?: string | null
  schoolYear?: string | null
  semester?: SemesterCode | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
  onlyEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择质量评价课程',
  allowClear: true,
  disabled: false,
  width: '100%',
  onlyEnabled: true,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: QualityCourseVO]
}>()

const options = ref<QualityCourseVO[]>([])
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
  () => [props.trainingPlanId, props.programId, props.schoolYear, props.semester],
  () => loadOptions(),
)

async function loadOptions(keyword?: string) {
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      qualityCourseApi.page({
        pageNum,
        pageSize,
        trainingPlanId: props.trainingPlanId || undefined,
        programId: props.programId || undefined,
        schoolYear: props.schoolYear || undefined,
        semester: props.semester || undefined,
        enabled: props.onlyEnabled ? true : undefined,
        keyword: (keyword ?? searchText.value)?.trim() || undefined,
      }),
    )
  } catch (e) {
    showUserError(e, '质量评价课程列表加载失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: `${opt.courseCode} · ${opt.courseName}`,
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
  const courseId = val != null ? String(val) : null
  internalValue.value = courseId ?? undefined
  const matched = courseId != null ? options.value.find((o) => o.id === courseId) : undefined
  emit('update:value', courseId)
  emit('change', courseId, matched)
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
          <span class="dp-selector-option-code">{{ opt.courseCode }}</span>
          {{ opt.courseName }}
          <span v-if="opt.schoolYear" class="dp-selector-option-meta">
            ({{ opt.schoolYear }}<span v-if="opt.semester">/{{ formatSemester(opt.semester) }}</span>)
          </span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>
