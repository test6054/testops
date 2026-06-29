<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { MarkExamSelectOption } from '@/utils/mark-exam-option'
import { computed } from 'vue'

defineOptions({ name: 'MarkExamSelect' })

const props = withDefaults(
  defineProps<{
    selectedExamId?: string
    examOptions: MarkExamSelectOption[]
    loading?: boolean
    searching?: boolean
    resolvingPinned?: boolean
    placeholder?: string
    selectClass?: string
    allowClear?: boolean
  }>(),
  {
    loading: false,
    searching: false,
    resolvingPinned: false,
    placeholder: '选择考试',
    selectClass: '',
    allowClear: true,
  },
)

const emit = defineEmits<{
  change: [value: SelectValue]
  search: [keyword: string]
}>()

const selectValue = computed(() => {
  const id = props.selectedExamId
  if (!id) return undefined
  return props.examOptions.some((option) => option.value === id) ? id : undefined
})
</script>

<template>
  <a-select
    :value="selectValue"
    class="mark-exam-select"
    :class="selectClass"
    :placeholder="placeholder"
    :options="examOptions"
    :loading="loading || searching || resolvingPinned"
    show-search
    :filter-option="false"
    option-filter-prop="label"
    :allow-clear="allowClear"
    popup-class-name="ui-select-dropdown"
    @change="emit('change', $event)"
    @search="emit('search', $event)"
  >
    <template v-if="$slots.option" #option="slotProps">
      <slot name="option" v-bind="slotProps" />
    </template>
  </a-select>
</template>

<style scoped lang="scss">
.mark-exam-select {
  min-width: 280px;
}
</style>
