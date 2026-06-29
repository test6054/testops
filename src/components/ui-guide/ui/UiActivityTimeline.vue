<template>
  <div
    class="ui-activity-timeline"
    :class="{
      'ui-activity-timeline--bordered': props.bordered,
      'ui-activity-timeline--compact': props.compact,
    }"
    v-bind="$attrs"
  >
    <div v-if="!props.groups.length" class="ui-activity-timeline__empty">
      <UiEmpty :title="props.emptyTitle" :description="props.emptyDescription" />
    </div>

    <div v-else class="ui-activity-timeline__groups">
      <section
        v-for="group in props.groups"
        :key="group.key || group.label"
        class="ui-activity-timeline__group"
      >
        <div class="ui-activity-timeline__group-header">
          <div class="ui-activity-timeline__group-badge">{{ group.label }}</div>
          <div class="ui-activity-timeline__group-line" />
          <span class="ui-activity-timeline__group-count">
            {{ group.countText || `${group.items.length} 条记录` }}
          </span>
        </div>

        <div class="ui-activity-timeline__items">
          <div
            v-for="(item, index) in group.items"
            :key="item.key || `${group.label}-${index}`"
            class="ui-activity-timeline__item"
          >
            <div class="ui-activity-timeline__axis">
              <span
                class="ui-activity-timeline__dot"
                :class="`ui-activity-timeline__dot--${item.tone || 'blue'}`"
              />
              <span
                v-if="index < group.items.length - 1"
                class="ui-activity-timeline__axis-line"
              />
            </div>

            <article class="ui-activity-timeline__card">
              <div class="ui-activity-timeline__card-head">
                <div class="ui-activity-timeline__title-wrap">
                  <div class="ui-activity-timeline__title-row">
                    <h4 class="ui-activity-timeline__title">{{ item.title }}</h4>
                    <UiBadge
                      v-if="item.badge"
                      variant="soft"
                      :tone="item.badgeTone || item.tone || 'blue'"
                    >
                      {{ item.badge }}
                    </UiBadge>
                  </div>

                  <div class="ui-activity-timeline__meta-row">
                    <span v-if="item.time" class="ui-activity-timeline__time">{{ item.time }}</span>
                    <span v-if="item.actor" class="ui-activity-timeline__actor">{{ item.actor }}</span>
                    <span v-if="item.meta" class="ui-activity-timeline__meta">{{ item.meta }}</span>
                  </div>
                </div>
              </div>

              <p v-if="item.content" class="ui-activity-timeline__content">{{ item.content }}</p>

              <div v-if="item.tags?.length" class="ui-activity-timeline__tags">
                <UiTag
                  v-for="(tag, tagIndex) in item.tags"
                  :key="`${item.key || index}-tag-${tagIndex}`"
                  :tone="resolveTagTone(tag)"
                  :variant="resolveTagVariant(tag)"
                >
                  {{ resolveTagLabel(tag) }}
                </UiTag>
              </div>

              <div v-if="item.files?.length" class="ui-activity-timeline__files">
                <div
                  v-for="(file, fileIndex) in item.files"
                  :key="`${item.key || index}-file-${fileIndex}`"
                  class="ui-activity-timeline__file-row"
                  :class="{ 'is-deleted': file.deleted }"
                >
                  <UiTag
                    v-if="file.tag"
                    size="sm"
                    variant="outline"
                    :tone="file.tagTone || 'blue'"
                  >
                    {{ file.tag }}
                  </UiTag>
                  <span class="ui-activity-timeline__file-name">{{ file.name }}</span>
                  <span v-if="file.deleted" class="ui-activity-timeline__file-state">已删除</span>
                  <span v-if="file.size" class="ui-activity-timeline__file-size">{{ file.size }}</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone } from './types'
import UiBadge from './Badge.vue'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'

defineOptions({
  name: 'UiActivityTimeline',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  groups?: TimelineGroup[]
  bordered?: boolean
  compact?: boolean
  emptyTitle?: string
  emptyDescription?: string
}>(), {
  groups: () => [],
  bordered: false,
  compact: false,
  emptyTitle: '暂无记录',
  emptyDescription: '当前还没有可展示的时间轴数据。',
})

type TimelineTag = string | {
  label: string
  tone?: BadgeTone
  variant?: 'soft' | 'outline'
}

interface TimelineFileItem {
  name: string
  tag?: string
  tagTone?: BadgeTone
  size?: string
  deleted?: boolean
}

interface TimelineItem {
  key?: string | number
  title: string
  content?: string
  time?: string
  actor?: string
  meta?: string
  tone?: BadgeTone
  badge?: string
  badgeTone?: BadgeTone
  tags?: TimelineTag[]
  files?: TimelineFileItem[]
}

interface TimelineGroup {
  key?: string | number
  label: string
  countText?: string
  items: TimelineItem[]
}

const resolveTagLabel = (tag: TimelineTag) => {
  return typeof tag === 'string' ? tag : tag.label
}

const resolveTagTone = (tag: TimelineTag): BadgeTone => {
  return typeof tag === 'string' ? 'gray' : (tag.tone || 'gray')
}

const resolveTagVariant = (tag: TimelineTag) => {
  return typeof tag === 'string' ? 'outline' : (tag.variant || 'outline')
}
</script>

<style scoped>
.ui-activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
  container-type: inline-size;
}

.ui-activity-timeline--bordered {
  padding: 18px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
}

.ui-activity-timeline--compact {
  gap: 16px;
}

.ui-activity-timeline__groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ui-activity-timeline__group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ui-activity-timeline__group-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ui-activity-timeline__group-badge {
  flex-shrink: 0;
  min-height: 30px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-blue-700, #1d4ed8);
  background: var(--dp-blue-50, #eff6ff);
  border: 1px solid var(--dp-blue-200, #bfdbfe);
  border-radius: var(--dp-radius-control-inner, 4px);
}

.ui-activity-timeline__group-line {
  flex: 1;
  height: 1px;
  background: var(--dp-border, #e5e7eb);
}

.ui-activity-timeline__group-count {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--dp-text-muted, #6b7280);
}

.ui-activity-timeline__items {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ui-activity-timeline__item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
}

.ui-activity-timeline__axis {
  position: relative;
  display: flex;
  justify-content: center;
}

.ui-activity-timeline__dot {
  position: relative;
  z-index: 1;
  width: 14px;
  height: 14px;
  border-radius: 999px;
  margin-top: 14px;
  border: 3px solid #fff;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.ui-activity-timeline__dot--gray {
  background: var(--dp-gray-400, #94a3b8);
}

.ui-activity-timeline__dot--blue {
  background: var(--dp-blue-500);
}

.ui-activity-timeline__dot--orange {
  background: var(--dp-orange-500, #f97316);
}

.ui-activity-timeline__dot--green {
  background: var(--dp-green-500, #22c55e);
}

.ui-activity-timeline__dot--yellow {
  background: var(--dp-yellow-500, #eab308);
}

.ui-activity-timeline__dot--red {
  background: var(--dp-red-500, #ef4444);
}

.ui-activity-timeline__dot--purple {
  background: var(--dp-purple-500, #8b5cf6);
}

.ui-activity-timeline__axis-line {
  position: absolute;
  top: 28px;
  bottom: -14px;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: #dbe3ef;
}

.ui-activity-timeline__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 2px 0 18px;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.ui-activity-timeline__item:not(:last-child) .ui-activity-timeline__card {
  border-bottom: 1px solid #eef2f7;
}

.ui-activity-timeline__card-head,
.ui-activity-timeline__title-wrap {
  min-width: 0;
}

.ui-activity-timeline__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-activity-timeline__title {
  margin: 0;
  font-size: 16px;
  line-height: 1.5;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-activity-timeline__meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
}

.ui-activity-timeline__time,
.ui-activity-timeline__actor,
.ui-activity-timeline__meta {
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-muted, #6b7280);
}

.ui-activity-timeline__content {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--dp-text-secondary, #475569);
}

.ui-activity-timeline__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-activity-timeline__files {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 10px 12px;
  background: var(--dp-gray-50, #f8fafc);
  border: 1px solid #eef2f7;
  border-radius: var(--dp-radius-control-inner, 4px);
}

.ui-activity-timeline__file-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 0;
}

.ui-activity-timeline__file-row:not(:last-child) {
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.ui-activity-timeline__file-row.is-deleted {
  opacity: 0.72;
}

.ui-activity-timeline__file-name {
  min-width: 0;
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ui-activity-timeline__file-state,
.ui-activity-timeline__file-size {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--dp-text-muted, #6b7280);
}

.ui-activity-timeline--compact .ui-activity-timeline__group {
  gap: 10px;
}

.ui-activity-timeline--compact .ui-activity-timeline__card {
  gap: 6px;
  padding-bottom: 14px;
}

.ui-activity-timeline--compact .ui-activity-timeline__title {
  font-size: 15px;
}

.ui-activity-timeline--compact .ui-activity-timeline__content {
  font-size: 12px;
  line-height: 1.65;
}

.ui-activity-timeline--compact .ui-activity-timeline__files {
  padding: 8px 10px;
}

@container (max-width: 520px) {
  .ui-activity-timeline__group-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .ui-activity-timeline__group-line {
    display: none;
  }

  .ui-activity-timeline__item {
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 8px;
  }

  .ui-activity-timeline__dot {
    width: 10px;
    height: 10px;
    margin-top: 12px;
    border-width: 2px;
  }

  .ui-activity-timeline__axis-line {
    top: 22px;
    bottom: -10px;
  }

  .ui-activity-timeline__card {
    gap: 6px;
    padding-bottom: 12px;
  }

  .ui-activity-timeline__title {
    font-size: 14px;
  }

  .ui-activity-timeline__meta-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .ui-activity-timeline__file-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .ui-activity-timeline__group-header {
    flex-wrap: wrap;
  }

  .ui-activity-timeline__group-line {
    display: none;
  }

  .ui-activity-timeline__item {
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 10px;
  }
}
</style>
