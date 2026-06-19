<script setup lang="ts">
/**
 * 阅卷主链统一考试选择器：与 provideMarkExamContext 共享同一 composable 实例。
 */
import { useMarkExamContextPicker } from '@/composables/useMarkExamContext'

defineOptions({ name: 'MarkExamContextPicker' })

withDefaults(
  defineProps<{
    allowClear?: boolean
    placeholder?: string
    selectClass?: string
  }>(),
  {
    allowClear: true,
    placeholder: '选择考试',
    selectClass: '',
  },
)

const { selectedExamId, examOptions, loading, onExamChange } = useMarkExamContextPicker()
</script>

<template>
  <a-select
    :value="selectedExamId"
    class="mark-exam-context-picker"
    :class="selectClass"
    :placeholder="placeholder"
    :options="examOptions"
    :loading="loading"
    show-search
    option-filter-prop="label"
    :allow-clear="allowClear"
    popup-class-name="ui-select-dropdown"
    @change="onExamChange"
  />
</template>

<style scoped lang="scss">
.mark-exam-context-picker {
  min-width: 280px;
}
</style>
