<!--
  学生选择器
  数据源：POST /api/user/admin/classes/students（按班级分页 + 姓名/学号搜索）
  必传 classId；当 classId 缺失时组件禁用
-->
<script setup lang="ts">
import type { UserDto } from '@/types/api-types.d'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { getStudentsByClass } from '@/apis/edu/class'

interface Props {
  value?: string | null
  classId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择学生',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  'change': [value: string | null, option?: UserDto]
}>()

const options = ref<UserDto[]>([])
const loading = ref(false)
const searchText = ref('')
const internalValue = ref<string | null>(props.value ?? null)

const effectiveDisabled = computed(() => props.disabled || !props.classId)
const effectivePlaceholder = computed(() =>
  props.classId ? props.placeholder : '请先选择班级',
)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

watch(() => props.classId, () => {
  if (props.classId) {
    loadOptions()
  }
  else {
    options.value = []
    internalValue.value = null
    emit('update:value', null)
  }
})

async function loadOptions(keyword?: string) {
  if (!props.classId) return
  loading.value = true
  try {
    const res = await getStudentsByClass({
      pageNum: 1,
      pageSize: 50,
      searchText: keyword ?? searchText.value ?? undefined,
      classId: props.classId,
    } as unknown as Parameters<typeof getStudentsByClass>[0])
    options.value = (res.list ?? []) as UserDto[]
  } catch (e) {
    console.error('[StudentSelector] 加载学生列表失败', e)
    message.error('加载学生列表失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadOptions(val), 300)
}

function handleChange(val: string | null) {
  internalValue.value = val
  const option = options.value.find(o => String(o.id) === val)
  emit('update:value', val)
  emit('change', val, option)
}

onMounted(() => {
  if (props.classId) loadOptions()
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
    :filter-option="false"
    @search="handleSearch"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="String(opt.id)"
      :label="opt.nickName || opt.userName"
    >
      {{ opt.nickName || opt.userName }}
      <span v-if="(opt as any).studentNumber" class="text-gray-400 ml-1 font-mono text-xs">({{ (opt as any).studentNumber }})</span>
    </a-select-option>
  </a-select>
</template>
