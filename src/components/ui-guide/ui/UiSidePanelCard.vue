<template>
  <section
    class="ui-side-panel-card"
    :class="{ 'ui-side-panel-card--compact': props.compact }"
    v-bind="$attrs"
  >
    <slot v-if="$slots.header" name="header" />
    <UiPanelHeader
      v-else-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :compact="props.compact"
      :divided="props.divided"
      class="ui-side-panel-card__header"
    >
      <template #default>
        <span class="ui-side-panel-card__title">
          <span v-if="$slots.icon" class="ui-side-panel-card__icon">
            <slot name="icon" />
          </span>
          <span>{{ props.title }}</span>
        </span>
      </template>

      <template v-if="showMeta" #meta>
        <UiBadge
          v-if="props.count !== undefined && props.count !== null"
          :tone="props.countTone"
          variant="soft"
          size="sm"
        >
          {{ props.countLabel || props.count }}
        </UiBadge>
        <slot name="meta" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <div
      class="ui-side-panel-card__body"
      :class="{ 'ui-side-panel-card__body--scrollable': props.bodyScrollable }"
      :style="bodyStyle"
    >
      <slot />
    </div>

    <footer v-if="$slots.footer" class="ui-side-panel-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import { computed, useSlots } from 'vue'
import type { BadgeTone } from './types'
import UiBadge from './Badge.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiSidePanelCard',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    count?: string | number
    countLabel?: string
    countTone?: BadgeTone
    compact?: boolean
    divided?: boolean
    bodyScrollable?: boolean
    bodyMaxHeight?: string | number
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    count: undefined,
    countLabel: '',
    countTone: 'blue',
    compact: false,
    divided: true,
    bodyScrollable: false,
    bodyMaxHeight: '',
  },
)

const slots = useSlots()

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const hasHeader = computed(() => {
  return (
    !!props.title ||
    !!props.description ||
    !!props.eyebrow ||
    !!slots.icon ||
    !!slots.actions ||
    !!slots.meta
  )
})

const showMeta = computed(() => {
  return props.count !== undefined || !!slots.meta
})

const bodyStyle = computed<CSSProperties | undefined>(() => {
  const maxHeight = normalizeCssSize(props.bodyMaxHeight)
  if (!props.bodyScrollable && !maxHeight) return undefined

  return {
    maxHeight,
    overflowY: props.bodyScrollable ? 'auto' : undefined,
  }
})
</script>

<style scoped>
.ui-side-panel-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 16px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-card);
}

.ui-side-panel-card--compact {
  gap: 12px;
  padding: 14px;
}

.ui-side-panel-card__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ui-side-panel-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--dp-blue-600);
}

.ui-side-panel-card__body {
  min-width: 0;
}

.ui-side-panel-card__body--scrollable {
  padding-right: 4px;
}

.ui-side-panel-card__body--scrollable::-webkit-scrollbar {
  width: 6px;
}

.ui-side-panel-card__body--scrollable::-webkit-scrollbar-thumb {
  background: var(--dp-gray-200);
  border-radius: 999px;
}

.ui-side-panel-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--dp-border);
}
</style>
