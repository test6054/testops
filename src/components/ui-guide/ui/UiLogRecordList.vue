<template>
  <div class="ui-log-record-list">
    <a-spin :spinning="props.loading" style="width: 100%">
      <div v-if="props.items.length" class="ui-log-record-list__items" :style="listStyle">
        <article
          v-for="item in props.items"
          :key="item.id"
          class="ui-log-record-list__item"
          :class="{ 'ui-log-record-list__item--clickable': props.itemClickable }"
          @click="handleItemClick(item)"
        >
          <div class="ui-log-record-list__head">
            <div class="ui-log-record-list__title-wrap">
              <div class="ui-log-record-list__title">{{ item.title }}</div>
              <UiTag
                v-if="item.typeLabel"
                :tone="item.typeTone || 'gray'"
                size="sm"
                variant="outline"
              >
                {{ item.typeLabel }}
              </UiTag>
              <UiTag v-if="item.statusLabel" :tone="item.statusTone || 'blue'" size="sm">
                {{ item.statusLabel }}
              </UiTag>
            </div>

            <div v-if="item.time" class="ui-log-record-list__time">{{ item.time }}</div>
          </div>

          <p v-if="item.content" class="ui-log-record-list__content">{{ item.content }}</p>

          <div
            v-if="item.actor || item.helper || item.actions?.length"
            class="ui-log-record-list__footer"
          >
            <div v-if="item.actor || item.helper" class="ui-log-record-list__meta">
              <span v-if="item.actor">{{ item.actor }}</span>
              <span v-if="item.actor && item.helper">·</span>
              <span v-if="item.helper">{{ item.helper }}</span>
            </div>

            <div v-if="item.actions?.length" class="ui-log-record-list__actions">
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
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { computed } from 'vue'
import type { UiLogRecordItem, UiNoticeAction } from './types'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'
import UiActionLink from './UiActionLink.vue'

defineOptions({
  name: 'UiLogRecordList',
})

const props = withDefaults(
  defineProps<{
    items?: UiLogRecordItem[]
    loading?: boolean
    emptyText?: string
    itemClickable?: boolean
    maxHeight?: string | number
  }>(),
  {
    items: () => [],
    loading: false,
    emptyText: '暂无记录',
    itemClickable: true,
    maxHeight: '',
  },
)

const emit = defineEmits<{
  (e: 'item-click', item: UiLogRecordItem): void
  (e: 'action-click', actionEvent: { item: UiLogRecordItem; action: UiNoticeAction }): void
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

const handleItemClick = (item: UiLogRecordItem) => {
  if (!props.itemClickable) return

  emit('item-click', item)
}

const handleActionClick = (item: UiLogRecordItem, action: UiNoticeAction) => {
  if (action.disabled) return

  emit('action-click', { item, action })
}
</script>

<style scoped>
.ui-log-record-list__items {
  display: grid;
  gap: 10px;
}

.ui-log-record-list__item {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: #fff;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.ui-log-record-list__item--clickable {
  cursor: pointer;
}

.ui-log-record-list__item--clickable:hover {
  background: var(--dp-gray-50);
  border-color: #dbe3ef;
}

.ui-log-record-list__head,
.ui-log-record-list__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ui-log-record-list__title-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.ui-log-record-list__title {
  font-size: 14px;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-log-record-list__time,
.ui-log-record-list__meta {
  font-size: 12px;
  color: var(--dp-text-muted);
}

.ui-log-record-list__content {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--dp-text-secondary);
}

.ui-log-record-list__actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
