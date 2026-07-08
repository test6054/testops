<template>
  <section class="ui-session-list-panel" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :divided="props.divided"
      :compact="props.compact"
    >
      <template #meta>
        <UiBadge tone="gray" variant="soft" size="sm"> {{ props.items.length }} 条会话 </UiBadge>
        <slot name="meta" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <a-spin :spinning="props.loading" style="width: 100%">
      <div v-if="props.items.length" class="ui-session-list-panel__items" :style="listStyle">
        <article
          v-for="item in props.items"
          :key="item.id"
          class="ui-session-list-panel__item"
          :class="{
            'ui-session-list-panel__item--active': String(item.id) === String(props.currentId),
          }"
          @click="emit('select', item)"
        >
          <div class="ui-session-list-panel__main">
            <div class="ui-session-list-panel__title-row">
              <span v-if="item.unread" class="ui-session-list-panel__dot" />
              <div class="ui-session-list-panel__title">{{ item.title }}</div>
            </div>
            <div v-if="item.helper" class="ui-session-list-panel__helper">{{ item.helper }}</div>
          </div>

          <div class="ui-session-list-panel__side">
            <UiTag
              v-if="item.statusLabel"
              :tone="item.statusTone || 'gray'"
              size="sm"
              variant="outline"
            >
              {{ item.statusLabel }}
            </UiTag>

            <UiActionLink
              v-if="props.removable"
              text="删除"
              danger
              @click.stop="emit('remove', item)"
            />
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
import type { UiSessionListItem } from './types'
import UiBadge from './Badge.vue'
import UiEmpty from './Empty.vue'
import UiTag from './Tag.vue'
import UiActionLink from './UiActionLink.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiSessionListPanel',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    items?: UiSessionListItem[]
    currentId?: string | number
    loading?: boolean
    emptyText?: string
    removable?: boolean
    maxHeight?: string | number
    compact?: boolean
    divided?: boolean
  }>(),
  {
    title: '会话列表',
    description: '',
    eyebrow: 'Session List',
    items: () => [],
    currentId: undefined,
    loading: false,
    emptyText: '暂无会话记录',
    removable: true,
    maxHeight: 420,
    compact: false,
    divided: true,
  },
)

const emit = defineEmits<{
  (e: 'select', item: UiSessionListItem): void
  (e: 'remove', item: UiSessionListItem): void
}>()

const slots = useSlots()

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.meta || !!slots.actions
})

const listStyle = computed<CSSProperties | undefined>(() => {
  const maxHeight = normalizeCssSize(props.maxHeight)
  if (!maxHeight) {
    return undefined
  }
  return {
    maxHeight,
    overflowY: 'auto',
    paddingRight: '4px',
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.ui-session-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  height: 100%;
  padding: 18px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-card);
}

.ui-session-list-panel__items {
  display: grid;
  gap: 10px;
}

.ui-session-list-panel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.ui-session-list-panel__item:hover {
  background: #f8fafc;
  border-color: var(--dp-border-strong);
}

.ui-session-list-panel__item--active {
  border-color: var(--dp-blue-200);
  background: var(--dp-blue-50);
}

.ui-session-list-panel__main,
.ui-session-list-panel__side {
  min-width: 0;
}

.ui-session-list-panel__main {
  flex: 1;
  display: grid;
  gap: 6px;
}

.ui-session-list-panel__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ui-session-list-panel__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #2563eb;
  flex-shrink: 0;
}

.ui-session-list-panel__title {
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-session-list-panel__helper {
  font-size: 12px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
}

.ui-session-list-panel__side {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}

@media (max-width: bp.$layout-mobile-max) {
  .ui-session-list-panel__item {
    flex-direction: column;
    align-items: flex-start;
  }

  .ui-session-list-panel__side {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
