<!--
  教师选择器（SCH_TECH 角色）
  数据源：POST /api/admin/teachers/user-list（远程搜索+分页）
  已选值回显：POST /api/admin/teachers/batch-details
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { TeacherDetailsDto, TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import { onMounted, ref, watch } from 'vue'
import { teacherCatalogApi } from '@/apis/quality/user-catalog'
import { showUserError } from '@/utils/error-handler'
import { requireArrayResult, requirePageList } from './page-contract'

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
const internalValue = ref<string | string[] | undefined>(normalizeSelectValue(props.value) ?? undefined)

function normalizeTeacherUserId(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null
  return String(value)
}

function normalizeSelectValue(value: string | string[] | null | undefined): string | string[] | null {
  if (value == null) return null
  if (Array.isArray(value)) {
    return value.map(item => normalizeTeacherUserId(item)).filter((item): item is string => item != null)
  }
  return normalizeTeacherUserId(value)
}

function normalizeTeacherOption(teacher: TeacherUserInfoDto): TeacherUserInfoDto {
  return {
    ...teacher,
    id: String(teacher.id),
  }
}

watch(
  () => props.value,
  (value) => {
    internalValue.value = normalizeSelectValue(value) ?? undefined
  },
)

watch(
  () => props.departmentId,
  () => {
    void loadOptions()
  },
)

function teacherDisplayName(opt: TeacherUserInfoDto): string {
  return opt.nickName
}

function mergeOptions(teachers: TeacherUserInfoDto[]): void {
  const map = new Map(options.value.map(item => [item.id, item]))
  for (const teacher of teachers.map(normalizeTeacherOption)) {
    map.set(teacher.id, teacher)
  }
  options.value = Array.from(map.values())
}

function toTeacherUserInfo(detail: TeacherDetailsDto): TeacherUserInfoDto {
  return normalizeTeacherOption({
    id: detail.id,
    userName: detail.userName,
    nickName: detail.nickName,
    email: detail.email,
    mobile: detail.mobile,
    teacherNumber: detail.teacherNumber,
    department: detail.department,
    title: detail.title,
    status: detail.status,
  })
}

function collectSelectedIds(): string[] {
  const normalized = normalizeSelectValue(props.value)
  if (normalized == null) return []
  return Array.isArray(normalized) ? normalized : [normalized]
}

function hasTeacherOption(teacherId: string): boolean {
  return options.value.some(option => option.id === teacherId)
}

async function hydrateSelectedByIds(teacherIds: string[]): Promise<void> {
  const missingIds = teacherIds.filter(id => !hasTeacherOption(id))
  if (!missingIds.length) return
  try {
    const details = requireArrayResult<TeacherDetailsDto>(
      await teacherCatalogApi.batchDetails(missingIds),
      '教师',
    )
    mergeOptions(details.map(toTeacherUserInfo))
  }
  catch (error) {
    showUserError(error, '教师回显加载失败')
  }
}

async function syncSelectedTeachers(): Promise<void> {
  const selectedIds = collectSelectedIds()
  if (!selectedIds.length) return
  await hydrateSelectedByIds(selectedIds)
}

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
    mergeOptions(requirePageList(res, '教师'))
    await syncSelectedTeachers()
  } catch (e) {
    showUserError(e, '教师列表加载失败')
  } finally {
    loading.value = false
  }
}

/** 将 a-select 的 SelectValue 收敛为本选择器的 string | string[] | null 合同 */
function selectValueToTeacherIds(val: SelectValue): string | string[] | null {
  if (val == null || val === '') {
    return null
  }
  if (Array.isArray(val)) {
    const ids: string[] = []
    for (const item of val) {
      const normalized = normalizeTeacherUserId(typeof item === 'number' ? item : item)
      if (normalized) ids.push(normalized)
    }
    return ids
  }
  return normalizeTeacherUserId(typeof val === 'number' ? val : val)
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void loadOptions(val)
  }, 300)
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

watch(
  () => props.value,
  () => {
    void syncSelectedTeachers()
  },
  { immediate: true },
)

onMounted(() => {
  void loadOptions()
})

defineExpose({ reload: loadOptions, hydrateSelectedByIds })
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
    option-label-prop="label"
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
      <span v-if="opt.teacherNumber" class="dp-selector-option-meta">({{ opt.teacherNumber }})</span>
      <span v-if="opt.department" class="dp-selector-option-meta">{{ opt.department }}</span>
    </a-select-option>
  </a-select>
</template>
