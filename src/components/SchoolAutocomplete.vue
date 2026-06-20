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
import { computed, ref, watch } from 'vue'
import schoolsData from '@/assets/data/schools.json'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'

export interface SchoolItem {
  id: string
  name: string
  province: string
  letter: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    allowClear?: boolean
    disabled?: boolean
    maxResults?: number
  }>(),
  {
    modelValue: '',
    placeholder: '请输入学校名称',
    allowClear: true,
    disabled: false,
    maxResults: 50, // Limit results for performance
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', school: SchoolItem): void
  (e: 'clear'): void
}>()

// Data initialization（静态学校数据中的 id 统一转为 string）
const schools = ref<SchoolItem[]>(
  (schoolsData as Array<{ id: number, name: string, province: string, letter: string }>).map(
    (s) => ({ ...s, id: String(s.id) }),
  ),
)
const inputValue = ref(props.modelValue)
const searchKeyword = ref('')
// Sync with parent v-model
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== inputValue.value) {
      inputValue.value = newVal
    }
  },
)

// Filter logic - 不依赖 isOpen，避免循环依赖
const filteredSchools = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()

  const results: { value: string, label: string }[] = []

  for (const school of schools.value) {
    if (!keyword || (school.name && school.name.toLowerCase().includes(keyword))) {
      results.push({
        value: school.name,
        label: school.province ? `${school.name} · ${school.province}` : school.name,
      })

      if (results.length >= props.maxResults) {
        break
      }
    }
  }

  return results
})

// Search handler
const handleSearch = (value: string) => {
  searchKeyword.value = value
  inputValue.value = value
  emit('update:modelValue', value)
}

// Select handler
const handleSelect = (value: string | number | import('ant-design-vue/es/select').LabeledValue) => {
  const strValue = String(typeof value === 'object' ? value.value : value)
  inputValue.value = strValue
  emit('update:modelValue', strValue)

  const school = schools.value.find((s) => s.name === strValue)
  if (school) {
    emit('select', school)
  }
}

// Clear handler
const handleClear = () => {
  inputValue.value = ''
  searchKeyword.value = ''
  emit('update:modelValue', '')
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
