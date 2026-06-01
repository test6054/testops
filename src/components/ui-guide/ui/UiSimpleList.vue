<template>
  <section class="ui-simple-list" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :compact="props.compact"
      :divided="props.divided"
    >
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <a-spin :spinning="props.loading" style="width: 100%">
      <div v-if="props.items.length" class="ui-simple-list__items" :style="listStyle">
        <article
          v-for="item in props.items"
          :key="item.id"
          class="ui-simple-list__item"
          :class="{ 'ui-simple-list__item--clickable': props.itemClickable }"
          @click="handleItemClick(item)"
        >
          <div class="ui-simple-list__main">
            <div class="ui-simple-list__title-row">
              <h4 class="ui-simple-list__title">{{ item.title }}</h4>
              <UiTag
                v-if="item.badgeLabel"
                size="sm"
                variant="outline"
                :tone="item.badgeTone || 'blue'"
              >
                {{ item.badgeLabel }}
              </UiTag>
              <UiTag v-if="item.statusLabel" size="sm" :tone="item.statusTone || 'gray'">
                {{ item.statusLabel }}
              </UiTag>
            </div>

            <p v-if="item.description" class="ui-simple-list__description">
              {{ item.description }}
            </p>

            <div v-if="item.helper || item.meta" class="ui-simple-list__meta">
              <span v-if="item.helper">{{ item.helper }}</span>
              <span v-if="item.helper && item.meta">·</span>
              <span v-if="item.meta">{{ item.meta }}</span>
            </div>
          </div>

          <div v-if="item.valueText || item.actions?.length" class="ui-simple-list__side">
            <div v-if="item.valueText" class="ui-simple-list__value">{{ item.valueText }}</div>

            <div v-if="item.actions?.length" class="ui-simple-list__actions">
              <UiActionLink
                v-for="action in item.actions"
                :key="action.key"
                :text="action.label"
                :danger="action.danger"
                :disabled="action.disabled"
                @click.stop="handleActionClick(item, action)"
              />
            </div>
          </div>
        </article>
      </div>

      <UiEmpty v-else size="sm" :description="props.emptyText" />
    </a-spin>
  </section>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { computed, useSlots } from 'vue'
import type { UiNoticeAction, UiSimpleListItem } from './types'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'
import UiActionLink from './UiActionLink.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiSimpleList',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    items?: UiSimpleListItem[]
    loading?: boolean
    emptyText?: string
    compact?: boolean
    divided?: boolean
    itemClickable?: boolean
    maxHeight?: string | number
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    items: () => [],
    loading: false,
    emptyText: '暂无列表数据',
    compact: false,
    divided: false,
    itemClickable: true,
    maxHeight: '',
  },
)

const emit = defineEmits<{
  (e: 'item-click', item: UiSimpleListItem): void
  (e: 'action-click', actionEvent: { item: UiSimpleListItem; action: UiNoticeAction }): void
}>()

const slots = useSlots()

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.actions
})

const listStyle = computed<CSSProperties | undefined>(() => {
  const maxHeight = normalizeCssSize(props.maxHeight)
  if (!maxHeight) return undefined

  return {
    maxHeight,
    overflowY: 'auto',
    paddingRight: '4px',
  }
})

const handleItemClick = (item: UiSimpleListItem) => {
  if (!props.itemClickable) return

  emit('item-click', item)
}

const handleActionClick = (item: UiSimpleListItem, action: UiNoticeAction) => {
  if (action.disabled) return

  emit('action-click', { item, action })
}
</script>

<style scoped>
.ui-simple-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-simple-list__items {
  display: grid;
  gap: 10px;
}

.ui-simple-list__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.ui-simple-list__item--clickable {
  cursor: pointer;
}

.ui-simple-list__item--clickable:hover {
  background: var(--dp-gray-50, #f8fafc);
  border-color: var(--dp-border-strong, #d0d5dd);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
}

.ui-simple-list__main,
.ui-simple-list__side {
  min-width: 0;
}

.ui-simple-list__main {
  flex: 1;
  display: grid;
  gap: 8px;
}

.ui-simple-list__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.ui-simple-list__title {
  margin: 0;
  min-width: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.5;
  color: var(--dp-text-primary, #0f172a);
}

.ui-simple-list__description {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--dp-text-secondary, #475569);
}

.ui-simple-list__meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-simple-list__side {
  display: grid;
  justify-items: end;
  gap: 10px;
  flex-shrink: 0;
}

.ui-simple-list__value {
  font-size: 14px;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-simple-list__actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .ui-simple-list__item {
    flex-direction: column;
  }

  .ui-simple-list__side {
    width: 100%;
    justify-items: start;
  }

  .ui-simple-list__actions {
    justify-content: flex-start;
  }
}
</style>
