<!--
  edu-user 课程目录选择器（用于在 quality 模块中创建质量评价课程时选择目录课程）
  数据源：POST /api/course-catalog/courses/authorized-by-major-category
  - 当 majorCategoryId 为空时返回当前租户全部已授权课程
  - 当 majorCategoryId 存在时，仅返回该专业大类下的已授权课程
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { CourseListVO } from '@/apis/quality/user-catalog'
import { onMounted, ref, watch } from 'vue'
import { courseCatalogApi } from '@/apis/quality/user-catalog'
import { showUserError } from '@/utils/error-handler'

interface Props {
  value?: string | null
  /** 按专业大类过滤；为空时返回当前租户全部已授权课程 */
  majorCategoryId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择目录课程',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: CourseListVO]
}>()

const options = ref<CourseListVO[]>([])
const loading = ref(false)
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.majorCategoryId,
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    options.value = await courseCatalogApi.authorizedByMajorCategory(props.majorCategoryId || undefined)
  } catch (e) {
    showUserError(e, '课程目录加载失败')
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
    <a-select-option v-for="opt in options" :key="opt.id" :value="opt.id" :label="opt.courseName">
      <span v-if="opt.courseCode" class="dp-selector-option-code">{{ opt.courseCode }}</span>
      {{ opt.courseName }}
      <span v-if="opt.majorCategoryName" class="dp-selector-option-meta">{{
        opt.majorCategoryName
      }}</span>
    </a-select-option>
  </a-select>
</template>

<style scoped>
.text-xs {
  font-size: 12px;
}

.text-gray-500 {
  color: rgba(0, 0, 0, 0.45);
}

.text-gray-400 {
  color: rgba(0, 0, 0, 0.45);
}

.mr-1 {
  margin-right: 4px;
}

.ml-1 {
  margin-left: 4px;
}
</style>
