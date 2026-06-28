<!--
  教师选择器（SCH_TECH 角色）
  数据源：POST /api/admin/teachers/user-list（远程搜索+分页）
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { onMounted, ref, watch } from 'vue'
import { teacherCatalogApi } from '@/apis/quality/user-catalog'
import { showUserError } from '@/utils/error-handler'
import { requirePageList } from './page-contract'

interface Props {
  value?: string | string[] | null
  mode?: 'multiple'
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
  'update:value': [value: string | string[] | null]
  "change": [value: string | string[] | null, option?: TeacherUserInfoDto | TeacherUserInfoDto[]]
}>()

const options = ref<TeacherUserInfoDto[]>([])
const loading = ref(false)
const searchText = ref('')
// a-select v-model:value 不接受 null，外部 emit 仍保持 string | string[] | null。
const internalValue = ref<string | string[] | undefined>(props.value ?? undefined)

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
    options.value = requirePageList(res, '教师')
  } catch (e) {
    showUserError(e, '教师列表加载失败')
  } finally {
    loading.value = false
  }
}

function teacherDisplayName(opt: TeacherUserInfoDto): string {
  return opt.nickName
}

/** 将 a-select 的 SelectValue 收敛为本选择器的 string | string[] | null 合同 */
function selectValueToTeacherIds(val: SelectValue): string | string[] | null {
  if (val == null || val === '') {
    return null
  }
  if (Array.isArray(val)) {
    const ids: string[] = []
    for (const item of val) {
      if (typeof item === 'string') {
        ids.push(item)
      } else if (typeof item === 'number') {
        ids.push(String(item))
      }
    }
    return ids
  }
  if (typeof val === 'string') {
    return val
  }
  if (typeof val === 'number') {
    return String(val)
  }
  return null
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadOptions(val), 300)
}

function handleChange(val: SelectValue) {
  const next = selectValueToTeacherIds(val)
  internalValue.value = next ?? undefined
  const option = Array.isArray(next)
    ? options.value.filter((o) => next.includes(o.id))
    : options.value.find((o) => o.id === next)
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
    :mode="mode"
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
      :label="teacherDisplayName(opt)"
    >
      {{ teacherDisplayName(opt) }}
      <span v-if="opt.teacherNumber" class="text-gray-400 ml-1 text-xs">({{ opt.teacherNumber }})</span>
      <span v-if="opt.department" class="text-gray-400 ml-1">{{ opt.department }}</span>
    </a-select-option>
  </a-select>
</template>
