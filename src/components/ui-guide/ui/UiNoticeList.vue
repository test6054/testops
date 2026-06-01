<template>
  <div class="ui-notice-list">
    <a-spin :spinning="props.loading" style="width: 100%">
      <div
        v-if="props.items.length"
        class="ui-notice-list__items"
        :class="{ 'ui-notice-list__items--compact': props.compact }"
        :style="listStyle"
      >
        <article
          v-for="item in props.items"
          :key="item.id"
          class="ui-notice-list__item"
          :class="{
            'ui-notice-list__item--unread': !!item.unread,
            'ui-notice-list__item--clickable': props.itemClickable,
          }"
          @click="handleItemClick(item)"
        >
          <div class="ui-notice-list__head">
            <div class="ui-notice-list__title-wrap">
              <span v-if="item.unread" class="ui-notice-list__dot" />
              <h4 class="ui-notice-list__title">{{ item.title }}</h4>
            </div>

            <span v-if="item.time" class="ui-notice-list__time">{{ item.time }}</span>
          </div>

          <div
            v-if="item.unread || item.typeLabel || item.priorityLabel"
            class="ui-notice-list__tags"
          >
            <UiBadge v-if="item.unread" tone="blue" variant="soft" size="sm">未读</UiBadge>
            <UiTag
              v-if="item.typeLabel"
              :tone="item.typeTone || 'blue'"
              variant="outline"
              size="sm"
            >
              {{ item.typeLabel }}
            </UiTag>
            <UiTag v-if="item.priorityLabel" :tone="item.priorityTone || 'orange'" size="sm">
              {{ item.priorityLabel }}
            </UiTag>
          </div>

          <p v-if="item.excerpt" class="ui-notice-list__excerpt">
            {{ item.excerpt }}
          </p>

          <div
            v-if="item.sender || item.helper || item.actions?.length"
            class="ui-notice-list__footer"
          >
            <div v-if="item.sender || item.helper" class="ui-notice-list__meta">
              <span v-if="item.sender" class="ui-notice-list__meta-item">{{ item.sender }}</span>
              <span v-if="item.sender && item.helper" class="ui-notice-list__meta-divider">·</span>
              <span v-if="item.helper" class="ui-notice-list__meta-item">{{ item.helper }}</span>
            </div>

            <div v-if="item.actions?.length" class="ui-notice-list__actions">
              <UiActionLink
                v-for="action in item.actions"
                :key="action.key"
                :danger="action.danger"
                :disabled="action.disabled"
                :text="action.label"
                @click.stop="handleActionClick(item, action)"
              />
            </div>
          </div>
        </article>
      </div>

      <UiEmpty v-else size="sm" :description="props.emptyText" />
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import type { UiNoticeAction, UiNoticeItem } from './types'
import { computed } from 'vue'
import UiBadge from './Badge.vue'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'
import UiActionLink from './UiActionLink.vue'

defineOptions({
  name: 'UiNoticeList',
})

const props = withDefaults(
  defineProps<{
    items?: UiNoticeItem[]
    loading?: boolean
    emptyText?: string
    compact?: boolean
    itemClickable?: boolean
    maxHeight?: string | number
  }>(),
  {
    items: () => [],
    loading: false,
    emptyText: '暂无通知',
    compact: false,
    itemClickable: true,
    maxHeight: '',
  },
)

const emit = defineEmits<{
  (e: 'item-click', item: UiNoticeItem): void
  (e: 'action-click', actionEvent: { item: UiNoticeItem, action: UiNoticeAction }): void
}>()

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const listStyle = computed<CSSProperties | undefined>(() => {
  const maxHeight = normalizeCssSize(props.maxHeight)
  if (!maxHeight) return undefined

  return {
    maxHeight,
    overflowY: 'auto',
    paddingRight: '4px',
  }
})

const handleItemClick = (item: UiNoticeItem) => {
  if (!props.itemClickable) return

  emit('item-click', item)
}

const handleActionClick = (item: UiNoticeItem, action: UiNoticeAction) => {
  if (action.disabled) return

  emit('action-click', { item, action })
}
</script>

<style scoped>
.ui-notice-list {
  width: 100%;
}

.ui-notice-list__items {
  display: grid;
  gap: 10px;
}

.ui-notice-list__items--compact {
  gap: 8px;
}

.ui-notice-list__item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.ui-notice-list__items--compact .ui-notice-list__item {
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--dp-radius-panel, 4px);
}

.ui-notice-list__item--clickable {
  cursor: pointer;
}

.ui-notice-list__item--clickable:hover {
  background: var(--dp-gray-50, #f8fafc);
  border-color: #dbe3ef;
}

.ui-notice-list__item--unread {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.ui-notice-list__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.ui-notice-list__title-wrap {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ui-notice-list__dot {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--dp-blue-500, #3b82f6);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
}

.ui-notice-list__title {
  margin: 0;
  min-width: 0;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-notice-list__time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-notice-list__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-notice-list__excerpt {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--dp-text-secondary, #475569);
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ui-notice-list__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-notice-list__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.ui-notice-list__meta-item,
.ui-notice-list__meta-divider {
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-notice-list__actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}
</style>
