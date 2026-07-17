<!--
  教师选择器（SCH_TECH 角色）
  数据源：POST /api/admin/teachers/user-list（远程搜索+分页）
  已选值回显：POST /api/admin/teachers/batch-details
-->
<script setup lang="ts">
import type { LabeledValue } from 'ant-design-vue/es/select'
import type { TeacherDetailsDto, TeacherUserInfoDto } from '@/apis/quality/user-catalog'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { teacherCatalogApi } from '@/apis/quality/user-catalog'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { showUserError } from '@/utils/error-handler'

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

function selectOptionValueToTeacherId(value: string | number | LabeledValue): string | null {
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return normalizeTeacherUserId(value.value)
  }
  return normalizeTeacherUserId(value)
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
    const details = await teacherCatalogApi.batchDetails(missingIds)
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
    mergeOptions(res.list)
    await syncSelectedTeachers()
  } catch (e) {
    showUserError(e, '教师列表加载失败')
  } finally {
    loading.value = false
  }
}

/** 将 a-select 的 UiOptionValue | UiOptionValue[] | undefined 收敛为本选择器的 string | string[] | null 合同 */
function selectValueToTeacherIds(val: UiOptionValue | UiOptionValue[] | undefined): string | string[] | null {
  if (val == null || val === '') {
    return null
  }
  if (Array.isArray(val)) {
    const ids: string[] = []
    for (const item of val) {
      const normalized = selectOptionValueToTeacherId(item)
      if (normalized) ids.push(normalized)
    }
    return ids
  }
  if (typeof val === 'object' && val !== null && 'value' in val) {
    return selectOptionValueToTeacherId(val)
  }
  return normalizeTeacherUserId(typeof val === 'number' ? val : val)
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: teacherDisplayName(opt),
  })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void loadOptions(val)
  }, 300)
}

function handleChange(val: UiOptionValue | UiOptionValue[] | undefined) {
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
  <UiSelect
    v-model="internalValue"
    class="dp-quality-selector"
    :style="controlStyle"
    size="sm"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :disabled="disabled"
    :loading="loading"
    :mode="mode"
    allow-search
    :filter-option="false"
    @search="handleSearch"
    :options="selectOptions"
    @update:model-value="handleChange"
  >
    <template #option="{ value: optionValue }">
      <template v-for="opt in options" :key="opt.id">
        <template v-if="opt.id === optionValue">
          {{ teacherDisplayName(opt) }}
          <span v-if="opt.teacherNumber" class="dp-selector-option-meta">({{ opt.teacherNumber }})</span>
          <span v-if="opt.department" class="dp-selector-option-meta">{{ opt.department }}</span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>
