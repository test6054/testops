<!--
  班级选择器
  数据源：POST /api/user/admin/classes/list-by-department 或 list-all
-->
<script setup lang="ts">
import type { ClassInfoDto } from '@/apis/edu/class'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { getAllClasses, getClassesByDepartment } from '@/apis/edu/class'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { showUserError } from '@/utils/error-handler'

interface Props {
  value?: string | null
  departmentId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择班级',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: ClassInfoDto]
}>()

const options = ref<ClassInfoDto[]>([])
const loading = ref(false)

const effectivePlaceholder = computed(() => {
  if (props.disabled && !props.departmentId) {
    return '请先选择院系'
  }
  return props.placeholder
})
// a-select v-model:value 不接受 null（UiOptionValue | UiOptionValue[] | undefined = string | number | (string|number)[] | undefined），
// 本选择器外部 emit 语义仍保持 string | null，内部表示未选中统一用 undefined。
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.departmentId,
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    if (props.departmentId) {
      options.value = await getClassesByDepartment({ departmentId: props.departmentId })
    } else {
      options.value = await getAllClasses()
    }
  } catch (e) {
    showUserError(e, '班级列表加载失败')
  } finally {
    loading.value = false
  }
}


const selectOptions = computed<UiSelectOption[]>(() =>
  options.value
    .filter((opt): opt is ClassInfoDto & { id: string } => Boolean(opt.id))
    .map((opt) => ({
      value: opt.id,
      label: opt.className ?? opt.id,
    })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleChange(val: UiOptionValue | UiOptionValue[] | undefined) {
  // a-select 清空时 val 为 undefined，选中时为 string（本选择器选项为单选且 value 是字符串 ID）。
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
    :placeholder="effectivePlaceholder"
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
          {{ opt.className }}
          <span v-if="opt.majorName" class="dp-selector-option-meta">({{ opt.majorName }})</span>
          <span v-if="opt.studentCount != null" class="dp-selector-option-meta">{{ opt.studentCount }} 人</span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>
