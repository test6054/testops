<!--
  edu-user 课程目录选择器（用于在 quality 模块中创建质量评价课程时选择目录课程）
  数据源：POST /api/course-catalog/courses/authorized-by-major-category
  - 当 majorCategoryId 为空时返回当前租户全部已授权课程
  - 当 majorCategoryId 存在时，仅返回该专业大类下的已授权课程
-->
<script setup lang="ts">
import type { CourseListVO } from '@/apis/quality/user-catalog'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { courseCatalogApi } from '@/apis/quality/user-catalog'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
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


const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: opt.courseName,
  })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

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
    option-filter-prop="label"
    :options="selectOptions"
    @update:model-value="handleChange"
  >
    <template #option="{ value: optionValue }">
      <template v-for="opt in options" :key="opt.id">
        <template v-if="opt.id === optionValue">
          <span v-if="opt.courseCode" class="dp-selector-option-code">{{ opt.courseCode }}</span>
          {{ opt.courseName }}
          <span v-if="opt.majorCategoryName" class="dp-selector-option-meta">{{
            opt.majorCategoryName
          }}</span>
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
