<template>
  <section class="ui-collection-toolbar" v-bind="$attrs">
    <div class="ui-collection-toolbar__summary">
      <div v-if="props.title" class="ui-collection-toolbar__title">{{ props.title }}</div>
      <div class="ui-collection-toolbar__summary-row">
        <UiBadge variant="soft" tone="gray"> 共 {{ props.total }} {{ props.totalLabel }} </UiBadge>
        <span v-if="props.summary" class="ui-collection-toolbar__summary-text">
          {{ props.summary }}
        </span>
        <slot name="summary" />
      </div>
    </div>

    <div class="ui-collection-toolbar__controls">
      <div v-if="$slots.filters" class="ui-collection-toolbar__filters">
        <slot name="filters" />
      </div>

      <UiSearchBox
        v-if="props.showSearch"
        v-model="keywordModel"
        class="ui-collection-toolbar__search"
        :placeholder="props.keywordPlaceholder"
        @search="handleSearch"
        @clear="handleReset"
      />

      <UiSelect
        v-if="props.sortOptions.length"
        v-model="sortModel"
        class="ui-collection-toolbar__sort"
        :options="props.sortOptions"
        placeholder="排序方式"
      />

      <div v-if="props.showViewSwitch" class="ui-collection-toolbar__switch">
        <UiButton
          size="sm"
          :variant="viewModeModel === 'grid' ? 'soft' : 'outline'"
          @click="updateViewMode('grid')"
        >
          卡片
        </UiButton>
        <UiButton
          size="sm"
          :variant="viewModeModel === 'list' ? 'soft' : 'outline'"
          @click="updateViewMode('list')"
        >
          列表
        </UiButton>
      </div>

      <div v-if="$slots.actions" class="ui-collection-toolbar__actions">
        <slot name="actions" />
      </div>

      <UiButton v-if="props.showReset" size="sm" variant="outline" @click="handleReset">
        重置
      </UiButton>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { UiOptionValue, UiSelectOption } from './types'
import UiBadge from './Badge.vue'
import UiButton from './Button.vue'
import UiSearchBox from './SearchBox.vue'
import UiSelect from './UiSelect.vue'

defineOptions({
  name: 'UiCollectionToolbar',
  inheritAttrs: false,
})

const keywordModel = defineModel<string>('keyword', { default: '' })

const sortModel = defineModel<UiOptionValue | undefined>('sortValue')

const viewModeModel = defineModel<ViewMode>('viewMode', { default: 'grid' })

const props = withDefaults(
  defineProps<{
    title?: string
    total?: number
    totalLabel?: string
    summary?: string
    keywordPlaceholder?: string
    sortOptions?: UiSelectOption[]
    showSearch?: boolean
    showReset?: boolean
    showViewSwitch?: boolean
  }>(),
  {
    title: '',
    total: 0,
    totalLabel: '项',
    summary: '',
    keywordPlaceholder: '搜索名称、描述或标签',
    sortOptions: () => [],
    showSearch: true,
    showReset: true,
    showViewSwitch: true,
  },
)

const emit = defineEmits<{
  (e: 'search', value: string): void
  (e: 'reset'): void
}>()

type ViewMode = 'grid' | 'list'

const handleSearch = (value: string) => {
  emit('search', value)
}

const handleReset = () => {
  keywordModel.value = ''
  sortModel.value = undefined
  emit('reset')
}

const updateViewMode = (mode: ViewMode) => {
  viewModeModel.value = mode
}
</script>

<style scoped>
.ui-collection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.ui-collection-toolbar__summary,
.ui-collection-toolbar__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.ui-collection-toolbar__summary {
  min-width: 0;
  flex: 1;
}

.ui-collection-toolbar__title {
  font-size: 15px;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-collection-toolbar__summary-row {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-collection-toolbar__summary-text {
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.ui-collection-toolbar__controls {
  justify-content: flex-end;
}

.ui-collection-toolbar__filters,
.ui-collection-toolbar__actions,
.ui-collection-toolbar__switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ui-collection-toolbar__search {
  width: 240px;
}

.ui-collection-toolbar__sort {
  min-width: 160px;
}

@media (max-width: 1100px) {
  .ui-collection-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .ui-collection-toolbar__controls {
    justify-content: flex-start;
  }

  .ui-collection-toolbar__search {
    width: 100%;
  }
}
</style>
