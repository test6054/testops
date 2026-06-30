<template>
  <section class="ui-rank-list-card" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :divided="props.divided"
      :compact="props.compact"
    >
      <template v-if="showMeta" #meta>
        <UiBadge v-if="props.showCount" tone="gray" variant="soft" size="sm">
          Top {{ props.items.length }}
        </UiBadge>
        <slot name="meta" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <a-spin :spinning="props.loading" style="width: 100%;">
      <div
        v-if="props.items.length"
        class="ui-rank-list-card__list"
        :style="listStyle"
      >
        <article
          v-for="(item, index) in props.items"
          :key="item.id || `${item.name}-${index}`"
          class="ui-rank-list-card__item"
          :class="{ 'ui-rank-list-card__item--clickable': props.itemClickable }"
          @click="handleItemClick(item)"
        >
          <div
            class="ui-rank-list-card__rank"
            :class="`ui-rank-list-card__rank--${getRankTone(index)}`"
          >
            {{ index + 1 }}
          </div>

          <div
            v-if="props.showAvatar"
            class="ui-rank-list-card__avatar"
            :class="`ui-rank-list-card__avatar--${item.tone || getRankTone(index)}`"
          >
            {{ item.avatarText || item.name.slice(0, 1) }}
          </div>

          <div class="ui-rank-list-card__main">
            <div class="ui-rank-list-card__title-row">
              <div class="ui-rank-list-card__name">{{ item.name }}</div>
              <UiTag
                v-if="item.statusLabel"
                :tone="item.statusTone || 'gray'"
                size="sm"
                variant="outline"
              >
                {{ item.statusLabel }}
              </UiTag>
            </div>

            <div v-if="item.subInfo || item.helper" class="ui-rank-list-card__sub">
              <span v-if="item.subInfo">{{ item.subInfo }}</span>
              <span v-if="item.subInfo && item.helper">·</span>
              <span v-if="item.helper">{{ item.helper }}</span>
            </div>
          </div>

          <div class="ui-rank-list-card__side">
            <div class="ui-rank-list-card__value-row">
              <span class="ui-rank-list-card__value">
                {{ item.valueText ?? item.value ?? '--' }}
              </span>
              <span v-if="item.unit" class="ui-rank-list-card__unit">{{ item.unit }}</span>
            </div>

            <div
              v-if="item.trend !== undefined"
              class="ui-rank-list-card__trend"
              :class="`ui-rank-list-card__trend--${getTrendTone(item.trend)}`"
            >
              {{ getTrendPrefix(item.trend) }} {{ Math.abs(item.trend) }}%
            </div>

            <slot name="item-extra" :item="item" :index="index" />
          </div>
        </article>
      </div>

      <UiEmpty
        size="sm"
        title="暂无排行榜数据"
        :description="props.emptyText"
      />
    </a-spin>

    <footer v-if="$slots.footer" class="ui-rank-list-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import type { UiRankListItem } from './types'
import { computed, useSlots } from 'vue'
import UiBadge from './Badge.vue'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiRankListCard',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  items?: UiRankListItem[]
  loading?: boolean
  emptyText?: string
  itemClickable?: boolean
  compact?: boolean
  divided?: boolean
  showAvatar?: boolean
  showCount?: boolean
  maxHeight?: string | number
}>(), {
  title: '',
  description: '',
  eyebrow: '',
  items: () => [],
  loading: false,
  emptyText: '请传入排行榜项',
  itemClickable: true,
  compact: false,
  divided: true,
  showAvatar: true,
  showCount: true,
  maxHeight: '',
})

const emit = defineEmits<{
  (e: 'item-click', item: UiRankListItem): void
}>()

const slots = useSlots()

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null)
    return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || props.showCount || !!slots.meta || !!slots.actions
})

const showMeta = computed(() => {
  return props.showCount || !!slots.meta
})

const listStyle = computed<CSSProperties | undefined>(() => {
  const maxHeight = normalizeCssSize(props.maxHeight)
  if (!maxHeight)
    return undefined

  return {
    maxHeight,
    overflowY: 'auto',
    paddingRight: '4px',
  }
})

const getRankTone = (index: number) => {
  if (index === 0) return 'orange'
  if (index === 1) return 'blue'
  if (index === 2) return 'purple'
  return 'gray'
}

const getTrendTone = (trend: number) => {
  if (trend > 0) return 'up'
  if (trend < 0) return 'down'
  return 'flat'
}

const getTrendPrefix = (trend: number) => {
  if (trend > 0) return '↑'
  if (trend < 0) return '↓'
  return '→'
}

const handleItemClick = (item: UiRankListItem) => {
  if (!props.itemClickable)
    return

  emit('item-click', item)
}
</script>

<style scoped>
.ui-rank-list-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
  box-shadow: var(--dp-shadow-card, 0 10px 30px rgba(15, 23, 42, 0.06));
}

.ui-rank-list-card__list {
  display: grid;
  gap: 10px;
}

.ui-rank-list-card__item {
  display: grid;
  grid-template-columns: 40px 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: #fff;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.ui-rank-list-card__item--clickable {
  cursor: pointer;
}

.ui-rank-list-card__item--clickable:hover {
  background: var(--dp-gray-50, #f8fafc);
  border-color: var(--dp-border-strong, #d0d5dd);
}

.ui-rank-list-card__rank,
.ui-rank-list-card__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--dp-radius-panel, 4px);
  font-size: 13px;
  font-weight: 800;
}

.ui-rank-list-card__rank--orange,
.ui-rank-list-card__avatar--orange {
  background: #fff7ed;
  color: #c2410c;
}

.ui-rank-list-card__rank--blue,
.ui-rank-list-card__avatar--blue {
  background: #eff6ff;
  color: #1d4ed8;
}

.ui-rank-list-card__rank--purple,
.ui-rank-list-card__avatar--purple {
  background: #f5f3ff;
  color: var(--dp-purple-500, #722ed1);
}

.ui-rank-list-card__rank--gray,
.ui-rank-list-card__avatar--gray {
  background: #f8fafc;
  color: #475569;
}

.ui-rank-list-card__main,
.ui-rank-list-card__side {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.ui-rank-list-card__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.ui-rank-list-card__name {
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-rank-list-card__sub,
.ui-rank-list-card__trend {
  font-size: 12px;
  line-height: 1.6;
  color: var(--dp-text-secondary, #475569);
}

.ui-rank-list-card__value-row {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 6px;
}

.ui-rank-list-card__value {
  font-size: 24px;
  line-height: 1.1;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-rank-list-card__unit {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-muted, #6b7280);
}

.ui-rank-list-card__trend {
  text-align: right;
  font-weight: 700;
}

.ui-rank-list-card__trend--up {
  color: #15803d;
}

.ui-rank-list-card__trend--down {
  color: #b91c1c;
}

.ui-rank-list-card__trend--flat {
  color: #475569;
}

.ui-rank-list-card__footer {
  padding-top: 14px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}

@media (max-width: 767px) {
  .ui-rank-list-card__item {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .ui-rank-list-card__side {
    grid-column: 1 / -1;
  }

  .ui-rank-list-card__value-row,
  .ui-rank-list-card__trend {
    justify-content: flex-start;
    text-align: left;
  }
}
</style>
