<template>
  <div class="ui-activity-feed">
    <a-spin :spinning="props.loading" style="width: 100%">
      <div v-if="props.groups.length" class="ui-activity-feed__groups" :style="listStyle">
        <section v-for="group in props.groups" :key="group.key" class="ui-activity-feed__group">
          <div v-if="group.label || group.countText" class="ui-activity-feed__group-header">
            <div v-if="group.label" class="ui-activity-feed__group-title">{{ group.label }}</div>
            <div v-if="group.countText" class="ui-activity-feed__group-count">
              {{ group.countText }}
            </div>
          </div>

          <article
            v-for="item in group.items"
            :key="item.id"
            class="ui-activity-feed__item"
            :class="{ 'ui-activity-feed__item--clickable': props.itemClickable }"
            @click="handleItemClick(item)"
          >
            <div
              class="ui-activity-feed__avatar"
              :class="`ui-activity-feed__avatar--${item.tone || 'blue'}`"
            >
              {{ item.avatarText || item.actor?.slice(0, 1) || '记' }}
            </div>

            <div class="ui-activity-feed__main">
              <div class="ui-activity-feed__head">
                <div class="ui-activity-feed__title-wrap">
                  <div class="ui-activity-feed__title">{{ item.title }}</div>
                  <UiTag
                    v-if="item.badgeLabel"
                    :tone="item.badgeTone || 'blue'"
                    size="sm"
                    variant="outline"
                  >
                    {{ item.badgeLabel }}
                  </UiTag>
                </div>

                <div v-if="item.time" class="ui-activity-feed__time">{{ item.time }}</div>
              </div>

              <p v-if="item.description" class="ui-activity-feed__description">
                {{ item.description }}
              </p>

              <div
                v-if="item.actor || item.meta || item.actions?.length"
                class="ui-activity-feed__footer"
              >
                <div v-if="item.actor || item.meta" class="ui-activity-feed__meta">
                  <span v-if="item.actor">{{ item.actor }}</span>
                  <span v-if="item.actor && item.meta">·</span>
                  <span v-if="item.meta">{{ item.meta }}</span>
                </div>

                <div v-if="item.actions?.length" class="ui-activity-feed__actions">
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
            </div>
          </article>
        </section>
      </div>

      <UiEmpty v-else size="sm" :description="props.emptyText" />
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { computed } from 'vue'
import type { UiActivityFeedGroup, UiActivityFeedItem, UiNoticeAction } from './types'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'
import UiActionLink from './UiActionLink.vue'

defineOptions({
  name: 'UiActivityFeed',
})

const props = withDefaults(
  defineProps<{
    groups?: UiActivityFeedGroup[]
    loading?: boolean
    emptyText?: string
    itemClickable?: boolean
    maxHeight?: string | number
  }>(),
  {
    groups: () => [],
    loading: false,
    emptyText: '暂无动态',
    itemClickable: true,
    maxHeight: '',
  },
)

const emit = defineEmits<{
  (e: 'item-click', item: UiActivityFeedItem): void
  (e: 'action-click', actionEvent: { item: UiActivityFeedItem; action: UiNoticeAction }): void
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

const handleItemClick = (item: UiActivityFeedItem) => {
  if (!props.itemClickable) return

  emit('item-click', item)
}

const handleActionClick = (item: UiActivityFeedItem, action: UiNoticeAction) => {
  if (action.disabled) return

  emit('action-click', { item, action })
}
</script>

<style scoped>
.ui-activity-feed__groups {
  display: grid;
  gap: 16px;
}

.ui-activity-feed__group {
  display: grid;
  gap: 10px;
}

.ui-activity-feed__group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ui-activity-feed__group-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-activity-feed__group-count {
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-activity-feed__item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.ui-activity-feed__item--clickable {
  cursor: pointer;
}

.ui-activity-feed__item--clickable:hover {
  background: var(--dp-gray-50, #f8fafc);
  border-color: #dbe3ef;
}

.ui-activity-feed__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--dp-radius-control-inner, 4px);
  font-size: 13px;
  font-weight: 800;
  color: #fff;
}

.ui-activity-feed__avatar--gray {
  background: #64748b;
}

.ui-activity-feed__avatar--blue {
  background: #2563eb;
}

.ui-activity-feed__avatar--green {
  background: #16a34a;
}

.ui-activity-feed__avatar--orange {
  background: #ea580c;
}

.ui-activity-feed__avatar--red {
  background: #dc2626;
}

.ui-activity-feed__avatar--purple {
  background: var(--dp-purple-500, #722ed1);
}

.ui-activity-feed__main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.ui-activity-feed__head,
.ui-activity-feed__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ui-activity-feed__title-wrap {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.ui-activity-feed__title {
  font-size: 14px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-activity-feed__time,
.ui-activity-feed__meta {
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-activity-feed__description {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--dp-text-secondary, #475569);
}

.ui-activity-feed__actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
