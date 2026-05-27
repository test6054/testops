<!--
  班级选择器
  数据源：POST /api/user/admin/classes/list-by-department 或 list-all
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ClassInfoDto } from '@/apis/edu/class'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'
import { getAllClasses, getClassesByDepartment } from '@/apis/edu/class'
import { requireArrayResult } from './page-contract'

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
// a-select v-model:value 不接受 null（SelectValue = string | number | (string|number)[] | undefined），
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
      options.value = requireArrayResult(
        await getClassesByDepartment({ departmentId: props.departmentId }),
        '班级',
      )
    } else {
      options.value = requireArrayResult(await getAllClasses(), '班级')
    }
  } catch (e) {
    console.error('[ClassSelector] 加载班级列表失败', e)
    message.error('加载班级列表失败')
  } finally {
    loading.value = false
  }
}

function handleChange(val: SelectValue) {
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
    <a-select-option v-for="opt in options" :key="opt.id" :value="opt.id" :label="opt.className">
      {{ opt.className }}
      <span v-if="opt.majorName" class="text-gray-400 ml-1">({{ opt.majorName }})</span>
      <span v-if="opt.studentCount != null" class="text-gray-400 ml-1">{{ opt.studentCount }} 人</span>
    </a-select-option>
  </a-select>
</template>
