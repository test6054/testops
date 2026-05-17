<!--
  学生选择器
  数据源：POST /api/user/admin/classes/students（按班级分页 + 姓名/学号搜索）
  必传 classId；当 classId 缺失时组件禁用
-->
<script setup lang="ts">
import type { UserDto } from '@/types/api-types.d'
import type { SelectValue } from 'ant-design-vue/es/select'
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
  change: [value: string | null, option?: UserDto]
}>()

const options = ref<UserDto[]>([])
const loading = ref(false)
const searchText = ref('')
// a-select v-model:value 不接受 null，外部 emit 仍保持 string | null。
const internalValue = ref<string | undefined>(props.value ?? undefined)

const effectiveDisabled = computed(() => props.disabled || !props.classId)
const effectivePlaceholder = computed(() => (props.classId ? props.placeholder : '请先选择班级'))

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.classId,
  () => {
    if (props.classId) {
      loadOptions()
    } else {
      options.value = []
      internalValue.value = undefined
      emit('update:value', null)
    }
  },
)

async function loadOptions(keyword?: string) {
  if (!props.classId) return
  loading.value = true
  try {
    // 后端 UserQueryDto 模糊查询字段名为 keyword，不是 searchText；先前的 as unknown as 强制断言把字段不匹配 bug 埋住，导致搜索失效。
    const res = await getStudentsByClass({
      pageNum: 1,
      pageSize: 50,
      keyword: keyword ?? searchText.value ?? undefined,
      classId: props.classId,
    })
    options.value = res.list ?? []
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

function handleChange(val: SelectValue) {
  const next: string | null = typeof val === 'string' ? val : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => String(o.id) === next)
  emit('update:value', next)
  emit('change', next, option)
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
      <span v-if="opt.studentNumber" class="text-gray-400 ml-1 font-mono text-xs"
        >({{ opt.studentNumber }})</span
      >
    </a-select-option>
  </a-select>
</template>
