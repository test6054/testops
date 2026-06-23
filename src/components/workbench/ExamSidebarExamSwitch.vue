<template>
  <div class="exam-sidebar-exam-switch">
    <p class="exam-sidebar-exam-switch__name">{{ displayName }}</p>
    <p v-if="displayNo" class="exam-sidebar-exam-switch__no">编号 {{ displayNo }}</p>
    <div class="exam-sidebar-exam-switch__meta">
      <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">{{ examStatusLabel }}</UiTag>
      <a-popover
        v-model:open="switchOpen"
        trigger="click"
        placement="bottomLeft"
        :overlay-inner-style="{ width: '236px', padding: '8px' }"
      >
        <template #content>
          <MarkExamSelect
            v-if="examOptions.length > 0"
            :selected-exam-id="selectedExamId"
            :exam-options="examOptions"
            :loading="selectorLoading"
            :allow-clear="false"
            placeholder="搜索考试名称或编号"
            select-class="exam-sidebar-exam-switch__select"
            @change="onExamChange"
            @search="(keyword) => emit('exam-search', keyword)"
          />
        </template>
        <button
          type="button"
          class="exam-sidebar-exam-switch__trigger"
          :disabled="!selectedExamId || selectorLoading"
        >
          切换考试
        </button>
      </a-popover>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { MarkExamSelectOption } from '@/utils/mark-exam-option'
import { computed, ref, watch } from 'vue'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({
  name: 'ExamSidebarExamSwitch',
})

const props = defineProps<{
  selectedExamId: string
  examOptions: MarkExamSelectOption[]
  selectorLoading?: boolean
  examDisplayName?: string
  examDisplayNo?: string
  examStatusLabel: string
  examStatusTone: BadgeTone | undefined
}>()

const emit = defineEmits<{
  (e: 'exam-change', value: SelectValue): void
  (e: 'exam-search', keyword: string): void
}>()

const switchOpen = ref(false)

const selectedOption = computed(() => (
  props.examOptions.find((item) => item.value === props.selectedExamId)
))

const displayName = computed(() => {
  if (props.examDisplayName?.trim()) {
    return props.examDisplayName.trim()
  }
  const option = selectedOption.value
  if (!option) {
    return props.selectedExamId || '未选择考试'
  }
  const namePart = option.label.split(' · ')[0] ?? option.label
  const parenMatch = namePart.match(/^(.+?)\s*\(([^)]+)\)$/)
  return parenMatch?.[1]?.trim() || namePart
})

const displayNo = computed(() => {
  if (props.examDisplayNo?.trim()) {
    return props.examDisplayNo.trim()
  }
  const option = selectedOption.value
  if (!option) {
    return ''
  }
  const namePart = option.label.split(' · ')[0] ?? option.label
  const parenMatch = namePart.match(/^(.+?)\s*\(([^)]+)\)$/)
  return parenMatch?.[2]?.trim() ?? ''
})

function onExamChange(value: SelectValue): void {
  emit('exam-change', value)
  switchOpen.value = false
}

watch(() => props.selectedExamId, () => {
  switchOpen.value = false
})
</script>

<style lang="scss" scoped>
.exam-sidebar-exam-switch {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__name {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--ant-color-text);
    word-break: break-word;
  }

  &__no {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--ant-color-text-secondary);
    word-break: break-all;
  }

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 4px;
  }

  &__trigger {
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: transparent;
    font-size: 12px;
    line-height: 1.4;
    color: var(--ant-color-primary);
    cursor: pointer;

    &:hover:not(:disabled) {
      color: var(--ant-color-primary-hover);
    }

    &:disabled {
      color: var(--ant-color-text-quaternary);
      cursor: not-allowed;
    }
  }

  :deep(.exam-sidebar-exam-switch__select.mark-exam-select) {
    min-width: 0;
    width: 100%;
  }
}
</style>
