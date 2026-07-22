<!-- 平台教师目录选择器：仅负责真实教师查询与回显，不承载质量评价或考试审核职位语义。 -->
<script setup lang="ts">
import type { LabeledValue } from 'ant-design-vue/es/select'
import type { TeacherDetailsDto, TeacherUserInfoDto } from '@/apis/platform/teacher-catalog'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { teacherCatalogApi } from '@/apis/platform/teacher-catalog'
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

function teacherDisplayName(option: TeacherUserInfoDto): string {
  return option.nickName
}

function mergeOptions(teachers: TeacherUserInfoDto[]): void {
  const optionById = new Map(options.value.map(item => [item.id, item]))
  for (const teacher of teachers.map(normalizeTeacherOption)) {
    optionById.set(teacher.id, teacher)
  }
  options.value = Array.from(optionById.values())
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
  } catch (error) {
    showUserError(error, '教师回显加载失败')
  }
}

async function syncSelectedTeachers(): Promise<void> {
  const selectedIds = collectSelectedIds()
  if (!selectedIds.length) return
  await hydrateSelectedByIds(selectedIds)
}

async function loadOptions(keyword?: string): Promise<void> {
  loading.value = true
  try {
    const response = await teacherCatalogApi.userList({
      pageNum: 1,
      pageSize: 50,
      searchText: keyword ?? searchText.value ?? undefined,
      departmentId: props.departmentId || undefined,
      roleKey: 'SCH_TECH',
    })
    mergeOptions(response.list)
    await syncSelectedTeachers()
  } catch (error) {
    showUserError(error, '教师列表加载失败')
  } finally {
    loading.value = false
  }
}

function selectValueToTeacherIds(value: UiOptionValue | UiOptionValue[] | undefined): string | string[] | null {
  if (value == null || value === '') return null
  if (Array.isArray(value)) {
    const teacherIds: string[] = []
    for (const item of value) {
      const teacherId = selectOptionValueToTeacherId(item)
      if (teacherId) teacherIds.push(teacherId)
    }
    return teacherIds
  }
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return selectOptionValueToTeacherId(value)
  }
  return normalizeTeacherUserId(typeof value === 'number' ? value : value)
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map(option => ({ value: option.id, label: teacherDisplayName(option) })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleSearch(value: string): void {
  searchText.value = value
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void loadOptions(value)
  }, 300)
}

function handleChange(value: UiOptionValue | UiOptionValue[] | undefined): void {
  const next = selectValueToTeacherIds(value)
  internalValue.value = next ?? undefined
  const option = Array.isArray(next)
    ? options.value.filter(item => next.includes(item.id))
    : options.value.find(item => item.id === next)
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
    class="dp-platform-teacher-selector"
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
      <template v-for="option in options" :key="option.id">
        <template v-if="option.id === optionValue">
          {{ teacherDisplayName(option) }}
          <span v-if="option.teacherNumber" class="dp-selector-option-meta">({{ option.teacherNumber }})</span>
          <span v-if="option.department" class="dp-selector-option-meta">{{ option.department }}</span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>
