<!--
  班级选择器
  数据源：POST /api/user/admin/classes/list-by-department 或 list-all
-->
<script setup lang="ts">
import type { ClassInfoDto } from '@/apis/edu/class'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'
import { getAllClasses, getClassesByDepartment } from '@/apis/edu/class'

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
  'change': [value: string | null, option?: ClassInfoDto]
}>()

const options = ref<ClassInfoDto[]>([])
const loading = ref(false)
const internalValue = ref<string | null>(props.value ?? null)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

watch(() => props.departmentId, () => loadOptions())

async function loadOptions() {
  loading.value = true
  try {
    if (props.departmentId) {
      options.value = await getClassesByDepartment({ departmentId: props.departmentId }) || []
    } else {
      options.value = await getAllClasses() || []
    }
  } catch (e) {
    console.error('[ClassSelector] 加载班级列表失败', e)
    message.error('加载班级列表失败')
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
      :label="opt.className"
    >
      {{ opt.className }}
      <span v-if="opt.major" class="text-gray-400 ml-1">({{ opt.major }})</span>
      <span v-if="opt.studentCount != null" class="text-gray-400 ml-1">{{ opt.studentCount }} 人</span>
    </a-select-option>
  </a-select>
</template>
