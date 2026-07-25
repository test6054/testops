<template>
  <MarkExamSelect
    :selected-exam-id="selectedVolumeId"
    :exam-options="selectOptions"
    :loading="loading"
    :allow-clear="false"
    placeholder="选择归档卷"
    select-class="archive-volume-switcher"
    @change="(value) => emit('change', value)"
    @search="(keyword) => emit('search', keyword)"
  >
    <template #option="{ label, statusLabel, statusTone }">
      <div class="archive-volume-switcher__option">
        <span class="archive-volume-switcher__label">{{ label }}</span>
        <UiTag
          v-if="statusLabel"
          class="archive-volume-switcher__status-tag"
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
import type { ArchiveVolumeSelectOption } from '@/utils/archive-volume-option'
import { computed } from 'vue'
import MarkExamSelect from '@/components/mark/MarkExamSelect.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'

defineOptions({
  name: 'ArchiveVolumeSwitcher',
})

const props = withDefaults(
  defineProps<{
    selectedVolumeId?: string
    options?: ArchiveVolumeSwitcherOption[]
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

export interface ArchiveVolumeSwitcherOption extends ArchiveVolumeSelectOption {
  statusLabel?: string
  statusTone?: BadgeTone
}

const selectOptions = computed<ArchiveVolumeSwitcherOption[]>(() => props.options)
</script>

<style scoped lang="scss">
.archive-volume-switcher {
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
    display: flex;
    align-items: center;
    min-height: 100%;
    line-height: 1.4;
  }
}

.archive-volume-switcher__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-component);
  width: 100%;
  min-width: 0;
}

.archive-volume-switcher__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dp-text-primary);
  font-weight: 600;
}

.archive-volume-switcher__status-tag {
  flex-shrink: 0;
}
</style>

<style lang="scss">
.archive-volume-switcher.mark-exam-select .ant-select-selector .ant-select-selection-item,
.archive-volume-switcher.mark-exam-select .ant-select-selector .ant-select-selection-search-input,
.archive-volume-switcher.mark-exam-select .ant-select-selector input {
  color: var(--dp-text-primary) !important;
  font-weight: 700 !important;
  -webkit-text-fill-color: var(--dp-text-primary) !important;
}
</style>
