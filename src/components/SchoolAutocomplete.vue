<template>
  <div class="school-autocomplete-wrapper">
    <UiSelect
      v-model="inputValue"
      :options="filteredSchools"
      :placeholder="placeholder"
      :allow-clear="allowClear"
      :disabled="disabled"
      :allow-search="true"
      :filter-option="false"
      size="lg"
      class="school-input"
      @search="handleSearch"
      @select="handleSelect"
      @clear="handleClear"
    />
  </div>
</template>

<script lang="ts" setup>
import type { LabeledValue } from 'ant-design-vue/es/select'
import { computed, ref, watch } from 'vue'
import schoolsData from '@/assets/data/schools.json'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'

export interface SchoolItem {
  id: string
  name: string
  province: string
  letter: string
}

interface SchoolJsonRecord {
  id: number
  name: string
  province: string
  letter: string
}

const modelValue = defineModel<string>({ default: '' })

const {
  placeholder = '请输入学校名称',
  allowClear = true,
  disabled = false,
  maxResults = 50,
} = defineProps<{
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  maxResults?: number
}>()

const emit = defineEmits<{
  (e: 'select', school: SchoolItem): void
  (e: 'clear'): void
}>()

function isSchoolJsonRecord(record: unknown): record is SchoolJsonRecord {
  if (typeof record !== 'object' || record === null) {
    return false
  }
  if (
    !('id' in record) ||
    !('name' in record) ||
    !('province' in record) ||
    !('letter' in record)
  ) {
    return false
  }
  return (
    typeof record.id === 'number' &&
    typeof record.name === 'string' &&
    typeof record.province === 'string' &&
    typeof record.letter === 'string'
  )
}

function mapSchoolRecords(raw: unknown): SchoolItem[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const items: SchoolItem[] = []
  for (const entry of raw) {
    if (!isSchoolJsonRecord(entry)) {
      continue
    }
    items.push({
      id: String(entry.id),
      name: entry.name,
      province: entry.province,
      letter: entry.letter,
    })
  }
  return items
}

function resolveSelectValue(value: string | number | LabeledValue): string {
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return String(value.value)
  }
  return String(value)
}

const schools = ref<SchoolItem[]>(mapSchoolRecords(schoolsData))
const inputValue = ref(modelValue.value)
const searchKeyword = ref('')

watch(modelValue, (newVal) => {
  if (newVal !== inputValue.value) {
    inputValue.value = newVal
  }
})

watch(inputValue, (newVal) => {
  modelValue.value = newVal
})

const filteredSchools = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  const results: { value: string; label: string }[] = []

  for (const school of schools.value) {
    if (!keyword || (school.name && school.name.toLowerCase().includes(keyword))) {
      results.push({
        value: school.name,
        label: school.province ? `${school.name} · ${school.province}` : school.name,
      })

      if (results.length >= maxResults) {
        break
      }
    }
  }

  return results
})

const handleSearch = (value: string) => {
  searchKeyword.value = value
  inputValue.value = value
}

const handleSelect = (value: string | number | LabeledValue) => {
  const strValue = resolveSelectValue(value)
  inputValue.value = strValue

  const school = schools.value.find((s) => s.name === strValue)
  if (school) {
    emit('select', school)
  }
}

const handleClear = () => {
  inputValue.value = ''
  searchKeyword.value = ''
  emit('clear')
}
</script>

<style lang="scss" scoped>
.school-autocomplete-wrapper {
  width: 100%;
}

.school-input {
  width: 100%;
}
</style>
