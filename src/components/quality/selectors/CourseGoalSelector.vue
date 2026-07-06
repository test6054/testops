<!--
  课程目标选择器
  数据源：POST /api/quality/course-goals/list-by-course
  必传 qualityCourseId
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { CourseGoalVO } from '@/apis/quality/course-goal'
import { computed, onMounted, ref, watch } from 'vue'
import { courseGoalApi } from '@/apis/quality/course-goal'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'

interface Props {
  value?: string | null
  qualityCourseId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择课程目标',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: CourseGoalVO]
}>()

const options = ref<CourseGoalVO[]>([])
const loading = ref(false)
// a-select v-model:value 不接受 null，外部 emit 仍保持 string | null。
const internalValue = ref<string | undefined>(props.value ?? undefined)

const effectiveDisabled = computed(() => props.disabled || !props.qualityCourseId)
const effectivePlaceholder = computed(() =>
  props.qualityCourseId ? props.placeholder : '请先选择质量评价课程',
)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.qualityCourseId,
  (id) => {
    if (id) {
      loadOptions()
    } else {
      options.value = []
      internalValue.value = undefined
      emit('update:value', null)
    }
  },
)

async function loadOptions() {
  if (!props.qualityCourseId) return
  loading.value = true
  try {
    options.value = await courseGoalApi.listByCourse(props.qualityCourseId)
  } catch (e) {
    showUserError(e, '课程目标列表加载失败')
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
  if (props.qualityCourseId) loadOptions()
})

defineExpose({ reload: loadOptions })
</script>

<template>
  <a-select
    :value="internalValue"
    :placeholder="effectivePlaceholder"
    :allow-clear="allowClear"
    :disabled="effectiveDisabled"
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
      :label="`${opt.goalCode} · ${opt.goalName}`"
    >
      <span class="dp-selector-option-code">{{ opt.goalCode }}</span>
      {{ opt.goalName }}
      <UiTag v-if="opt.civicObjectiveFlag" tone="purple" class="dp-selector-option-tag-gap">
        思政
      </UiTag>
      <UiTag v-if="opt.aiLiteracyFlag" tone="blue" class="dp-selector-option-tag-gap">
        AI 素养
      </UiTag>
    </a-select-option>
  </a-select>
</template>
