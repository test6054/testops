<!--
  教学质量评价报告选择器
  数据源：POST /api/quality/reports/page
  常用过滤：programId / trainingPlanId / qualityCourseId / schoolYear / semester / status / reportType
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ReportVO } from '@/apis/quality/report'
import { reportApi } from '@/apis/quality/report'
import type { ReportStatus, ReportType } from '@/apis/quality/types'
import { REPORT_TYPE_LABEL } from '@/apis/quality/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { onMounted, ref, watch } from 'vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { requireAllPages } from './page-contract'

interface Props {
  value?: string | null
  programId?: string | null
  trainingPlanId?: string | null
  qualityCourseId?: string | null
  schoolYear?: string | null
  semester?: SemesterCode | null
  status?: ReportStatus
  reportType?: ReportType
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
  change: [value: string | null, option?: ReportVO]
}>()

const options = ref<ReportVO[]>([])
const loading = ref(false)
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
    props.qualityCourseId,
    props.schoolYear,
    props.semester,
    props.status,
    props.reportType,
  ],
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    options.value = await requireAllPages(
      (pageNum) =>
        reportApi.page({
          pageNum,
          pageSize: 100,
          programId: props.programId || undefined,
          trainingPlanId: props.trainingPlanId || undefined,
          qualityCourseId: props.qualityCourseId || undefined,
          schoolYear: props.schoolYear || undefined,
          semester: props.semester || undefined,
          status: props.status,
          reportType: props.reportType,
        }),
      '教学质量评价报告',
    )
  } catch (e) {
    showUserError(e, '教学质量评价报告列表加载失败')
  } finally {
    loading.value = false
  }
}

function handleChange(val: SelectValue) {
  const next: string | null = typeof val === 'string' ? val : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => o.id === next)
  emit('update:value', next)
  emit('change', next, option)
}

function reportTypeLabel(value: ReportType) {
  return strictEnumLabel(REPORT_TYPE_LABEL, value, '教学质量评价报告类型')
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
    option-filter-prop="label"
    @change="handleChange"
  >
    <a-select-option v-for="opt in options" :key="opt.id" :value="opt.id" :label="opt.title">
      {{ opt.title }}
      <span v-if="opt.reportType" class="dp-selector-option-meta"
        >· {{ reportTypeLabel(opt.reportType) }}</span
      >
      <span v-if="opt.schoolYear" class="dp-selector-option-meta">
        ({{ opt.schoolYear }}<span v-if="opt.semester">/{{ formatSemester(opt.semester) }}</span
        >)
      </span>
    </a-select-option>
  </a-select>
</template>

<style scoped>
.text-gray-400 {
  color: rgba(0, 0, 0, 0.45);
}

.ml-1 {
  margin-left: 4px;
}
</style>
