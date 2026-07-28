<template>
  <MarkExamSelect
    :selected-exam-id="selectedExamId"
    :exam-options="selectOptions"
    :loading="loading"
    :allow-clear="false"
    placeholder="选择考试"
    select-class="exam-switcher"
    @change="(value) => emit('change', value)"
    @search="(keyword) => emit('search', keyword)"
  >
    <template #option="{ label, statusLabel, statusTone }">
      <div class="exam-switcher__option">
        <span class="exam-switcher__label">{{ label }}</span>
        <UiTag
          v-if="statusLabel"
          class="exam-switcher__status-tag"
          :tone="statusTone || 'gray'"
          variant="soft"
          size="sm"
        >
          {{ statusLabel }}
        </UiTag>
      </div>
    </template>
  </MarkExamSelect>
</template>

<script lang="ts" setup>
import type { SelectValue } from 'ant-design-vue/es/select'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { MarkExamSelectOption } from '@/utils/mark-exam-option'
import { computed } from 'vue'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({
  name: 'ExamSwitcher',
})

const props = withDefaults(
  defineProps<{
    selectedExamId?: string
    options?: ExamSwitcherOption[]
    loading?: boolean
  }>(),
  {
    options: () => [],
    loading: false,
  },
)

const emit = defineEmits<{
  (e: 'change', value: SelectValue): void
  (e: 'search', keyword: string): void
}>()

export interface ExamSwitcherOption extends MarkExamSelectOption {
  statusLabel?: string
  statusTone?: BadgeTone
}

const selectOptions = computed<ExamSwitcherOption[]>(() => props.options)
</script>

<style scoped lang="scss">
.exam-switcher {
  width: 100%;
  min-width: 0 !important;

  :deep(.ant-select-selector) {
    display: flex;
    align-items: center;
  }

  :deep(.ant-select-selection-wrap) {
    display: flex;
    align-items: center;
    min-height: 100%;
  }

  :deep(.ant-select-selection-search) {
    display: flex;
    align-items: center;
  }

  :deep(.ant-select-selection-item),
  :deep(.ant-select-selection-placeholder),
  :deep(.ant-select-selection-search-input) {
    line-height: 1.4;
  }
}

.exam-switcher__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  width: 100%;
  min-width: 0;
}

.exam-switcher__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dp-text-primary);
  font-weight: 600;
}

.exam-switcher__status-tag {
  flex-shrink: 0;
}
</style>

<style lang="scss">
.exam-switcher.mark-exam-select .ant-select-selector .ant-select-selection-item,
.exam-switcher.mark-exam-select .ant-select-selector .ant-select-selection-search-input,
.exam-switcher.mark-exam-select .ant-select-selector input {
  color: var(--dp-text-primary) !important;
  font-weight: 700 !important;
  -webkit-text-fill-color: var(--dp-text-primary) !important;
}
</style>
