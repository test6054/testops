<!--
  质量评价课程选择器
  数据源：POST /api/quality/courses/page
  可传 trainingPlanId / programId 过滤
-->
<script setup lang="ts">
import type { QualityCourseVO } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'
import { qualityCourseApi } from '@/apis/quality'

interface Props {
  value?: string | null
  trainingPlanId?: string | null
  programId?: string | null
  schoolYear?: string | null
  semester?: string | null
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
  'change': [value: string | null, option?: QualityCourseVO]
}>()

const options = ref<QualityCourseVO[]>([])
const loading = ref(false)
const internalValue = ref<string | null>(props.value ?? null)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

watch(
  () => [props.trainingPlanId, props.programId, props.schoolYear, props.semester],
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    const res = await qualityCourseApi.page({
      pageNum: 1,
      pageSize: 200,
      trainingPlanId: props.trainingPlanId || undefined,
      programId: props.programId || undefined,
      schoolYear: props.schoolYear || undefined,
      semester: props.semester || undefined,
      enabled: props.onlyEnabled ? true : undefined,
    })
    options.value = res.list || []
  } catch (e) {
    console.error('[CourseSelector] 加载质量评价课程列表失败', e)
    message.error('加载课程列表失败')
  } finally {
    loading.value = false
  }
}

function handleChange(val: string | null) {
  internalValue.value = val
  const option = options.value.find(o => o.id === val)
  emit('update:value', val)
  emit('change', val, option)
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
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.courseCode} · ${opt.courseName}`"
    >
      <span class="font-mono text-xs text-gray-500 mr-1">{{ opt.courseCode }}</span>
      {{ opt.courseName }}
      <span v-if="opt.schoolYear" class="text-gray-400 ml-1">
        ({{ opt.schoolYear }}<span v-if="opt.semester">/{{ opt.semester }}</span>)
      </span>
    </a-select-option>
  </a-select>
</template>
