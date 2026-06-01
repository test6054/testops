<!--
  教学质量评价报告选择器
  数据源：POST /api/quality/reports/page
  常用过滤：programId / trainingPlanId / qualityCourseId / schoolYear / semester / status / reportType
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ReportStatus, ReportType, ReportVO } from '@/apis/quality'
import { onMounted, ref, watch } from 'vue'
import { REPORT_TYPE_LABEL, reportApi } from '@/apis/quality'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { requirePageList } from './page-contract'

interface Props {
  value?: string | null
  programId?: string | null
  trainingPlanId?: string | null
  qualityCourseId?: string | null
  schoolYear?: string | null
  semester?: string | null
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
  "change": [value: string | null, option?: ReportVO]
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
    const res = await reportApi.page({
      pageNum: 1,
      pageSize: 200,
      programId: props.programId || undefined,
      trainingPlanId: props.trainingPlanId || undefined,
      qualityCourseId: props.qualityCourseId || undefined,
      schoolYear: props.schoolYear || undefined,
      semester: props.semester || undefined,
      status: props.status,
      reportType: props.reportType,
    })
    options.value = requirePageList(res, '教学质量评价报告')
  } catch (e) {
    console.error('[ReportSelector] 加载报告列表失败', e)
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
      <span v-if="opt.reportType" class="text-gray-400 ml-1">· {{ reportTypeLabel(opt.reportType) }}</span>
      <span v-if="opt.schoolYear" class="text-gray-400 ml-1">
        ({{ opt.schoolYear }}<span v-if="opt.semester">/{{ opt.semester }}</span>)
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
