<!--
  教师选择器（SCH_TECH 角色）
  数据源：POST /api/admin/teachers/user-list（远程搜索+分页）
-->
<script setup lang="ts">
import type { TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'
import { teacherCatalogApi } from '@/apis/quality/user-catalog'

interface Props {
  value?: string | null
  departmentId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择教师',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  'change': [value: string | null, option?: TeacherUserInfoDto]
}>()

const options = ref<TeacherUserInfoDto[]>([])
const loading = ref(false)
const searchText = ref('')
const internalValue = ref<string | null>(props.value ?? null)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

watch(() => props.departmentId, () => loadOptions())

async function loadOptions(keyword?: string) {
  loading.value = true
  try {
    const res = await teacherCatalogApi.userList({
      pageNum: 1,
      pageSize: 50,
      searchText: keyword ?? searchText.value ?? undefined,
      departmentId: props.departmentId || undefined,
      roleKey: 'SCH_TECH',
    })
    options.value = res.list || []
  } catch (e) {
    console.error('[TeacherSelector] 加载教师列表失败', e)
    message.error('加载教师列表失败')
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
    :filter-option="false"
    @search="handleSearch"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :label="opt.nickName || opt.userName"
    >
      {{ opt.nickName || opt.userName }}
      <span v-if="opt.teacherNumber" class="text-gray-400 ml-1 font-mono text-xs">({{ opt.teacherNumber }})</span>
      <span v-if="opt.department" class="text-gray-400 ml-1">{{ opt.department }}</span>
    </a-select-option>
  </a-select>
</template>
