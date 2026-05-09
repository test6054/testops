<template>
  <UiCard class="ui-search-form" bordered :hoverable="false">
    <div v-if="hasHeader" class="ui-search-form__header">
      <div class="ui-search-form__meta">
        <slot name="header">
          <div v-if="props.title" class="ui-search-form__title">{{ props.title }}</div>
          <div v-if="props.description" class="ui-search-form__description">{{ props.description }}</div>
        </slot>
      </div>
      <div v-if="$slots.extra" class="ui-search-form__extra">
        <slot name="extra" />
      </div>
    </div>

    <UiFilterBar
      v-model="modelValue"
      :fields="visibleFields"
      :search-text="props.searchText"
      :reset-text="props.resetText"
      :actions-align="props.actionsAlign"
      :show-labels="props.showLabels"
      @search="(value) => emit('search', value)"
      @reset="(value) => emit('reset', value)"
    >
      <template v-if="$slots.default" #default>
        <slot />
      </template>

      <template
        v-for="name in forwardedFieldSlots"
        :key="name"
        #[name]="slotProps"
      >
        <slot :name="name" v-bind="slotProps" />
      </template>

      <template v-if="useCustomActions" #actions>
        <slot name="actions">
          <UiButton size="md" @click="emit('search', modelValue)">
            <template #icon>
              <SearchOutlined />
            </template>
            {{ props.searchText }}
          </UiButton>
          <UiButton size="md" variant="outline" @click="handleReset">
            <template #icon>
              <ReloadOutlined />
            </template>
            {{ props.resetText }}
          </UiButton>
          <UiButton
            v-if="props.collapsible && props.fields.length > props.collapsedCount"
            size="md"
            variant="ghost"
            @click="toggleCollapsed"
          >
            {{ isCollapsed ? '展开更多' : '收起筛选' }}
          </UiButton>
        </slot>
      </template>
    </UiFilterBar>
  </UiCard>
</template>

<script lang="ts" setup>
import type { FilterField } from './types'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { computed, ref, useSlots } from 'vue'
import UiButton from './Button.vue'
import UiCard from './Card.vue'
import UiFilterBar from './FilterBar.vue'

defineOptions({
  name: 'UiSearchForm',
})

const modelValue = defineModel<Record<string, unknown>>({ default: () => ({}) })

const props = withDefaults(defineProps<{
  fields?: FilterField[]
  title?: string
  description?: string
  searchText?: string
  resetText?: string
  actionsAlign?: 'start' | 'end'
  showLabels?: boolean
  collapsible?: boolean
  collapsedCount?: number
  defaultCollapsed?: boolean
}>(), {
  fields: () => [],
  title: '',
  description: '',
  searchText: '搜索',
  resetText: '重置',
  actionsAlign: 'end',
  showLabels: true,
  collapsible: false,
  collapsedCount: 4,
  defaultCollapsed: true,
})

const emit = defineEmits<{
  (e: 'search', value: Record<string, unknown>): void
  (e: 'reset', value: Record<string, unknown>): void
}>()

const slots = useSlots()
const isCollapsed = ref(props.defaultCollapsed)

const hasHeader = computed(() => !!props.title || !!props.description || !!slots.header || !!slots.extra)

const visibleFields = computed(() => {
  if (!props.collapsible)
    return props.fields
  if (!isCollapsed.value)
    return props.fields
  return props.fields.slice(0, props.collapsedCount)
})

const forwardedFieldSlots = computed(() => {
  return Object.keys(slots).filter(name => name.startsWith('field-'))
})

const useCustomActions = computed(() => props.collapsible || !!slots.actions)

const defaultModel = computed(() => {
  return props.fields.reduce<Record<string, unknown>>((acc, field) => {
    if (field.defaultValue !== undefined) {
      acc[field.key] = field.defaultValue
      return acc
    }
    if (field.type === 'select' && field.mode === 'multiple') {
      acc[field.key] = []
      return acc
    }
    if (field.type === 'select' || field.type === 'date' || field.type === 'year' || field.type === 'custom') {
      acc[field.key] = undefined
      return acc
    }
    acc[field.key] = ''
    return acc
  }, {})
})

const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value
}

const handleReset = () => {
  const nextModel = { ...defaultModel.value }
  modelValue.value = nextModel
  emit('reset', nextModel)
}
</script>

<style scoped>
.ui-search-form__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.ui-search-form__meta {
  min-width: 0;
  flex: 1;
}

.ui-search-form__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-search-form__description {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-muted, #6b7280);
}

.ui-search-form__extra {
  flex-shrink: 0;
}

.ui-search-form :deep(.dp-filter-bar) {
  border-bottom: none;
  padding: 0;
  gap: 16px;
}

.ui-search-form :deep(.direction-topic-filter),
.ui-search-form :deep(.ui-search-form__linked-filters) {
  width: 100%;
  flex-basis: 100%;
}

.ui-search-form :deep(.dp-advanced-filter__actions) {
  display: flex;
  align-items: center;
  flex-basis: 100%;
  width: 100%;
  margin-left: 0;
  padding-top: 4px;
}

.ui-search-form :deep(.dp-filter-bar__actions--start) {
  justify-content: flex-start;
}

.ui-search-form :deep(.dp-filter-bar__actions--end) {
  justify-content: flex-end;
}
</style>
