<!--
  质量评价课程选择器
  数据源：POST /api/quality/courses/page
  可传 trainingPlanId / programId 过滤
-->
<script setup lang="ts">
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { QualityCourseVO } from '@/apis/quality/quality-course'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { onMounted, ref, watch } from 'vue'
import { qualityCourseApi } from '@/apis/quality/quality-course'
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
function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadOptions(val), QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

function handleChange(val: SelectValue, _option: DefaultOptionType | DefaultOptionType[]) {
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
  <a-select
    :value="internalValue"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :disabled="disabled"
    :loading="loading"
    :style="{ width: typeof width === 'number' ? `${width}px` : width }"
    show-search
    :filter-option="false"
    @search="handleSearch"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.courseCode} · ${opt.courseName}`"
    >
      <span class="dp-selector-option-code">{{ opt.courseCode }}</span>
      {{ opt.courseName }}
      <span v-if="opt.schoolYear" class="dp-selector-option-meta">
        ({{ opt.schoolYear }}<span v-if="opt.semester">/{{ formatSemester(opt.semester) }}</span>)
      </span>
    </a-select-option>
  </a-select>
</template>
