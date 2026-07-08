<template>
  <section class="ui-selector-header-extra" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :divided="props.divided"
      :compact="props.compact"
    >
      <template v-if="$slots.meta" #meta>
        <slot name="meta" />
      </template>

      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <div
      v-if="$slots.default || props.items.length || props.note"
      class="ui-selector-header-extra__body"
    >
      <slot />

      <div v-if="props.items.length" class="ui-selector-header-extra__list">
        <article
          v-for="item in props.items"
          :key="item.key || item.label"
          class="ui-selector-header-extra__item"
        >
          <div class="ui-selector-header-extra__item-label">{{ item.label }}</div>
          <div v-if="item.value" class="ui-selector-header-extra__item-value">{{ item.value }}</div>
          <div v-if="item.helper" class="ui-selector-header-extra__item-helper">
            {{ item.helper }}
          </div>
        </article>
      </div>

      <div v-if="props.note" class="ui-selector-header-extra__note">{{ props.note }}</div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { UiSelectorExtraItem } from './types'
import { computed, useSlots } from 'vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiSelectorHeaderExtra',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    items?: UiSelectorExtraItem[]
    note?: string
    compact?: boolean
    divided?: boolean
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    items: () => [],
    note: '',
    compact: false,
    divided: true,
  },
)

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.meta || !!slots.actions
})
</script>

<style scoped>
.ui-selector-header-extra {
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

.ui-selector-header-extra__body,
.ui-selector-header-extra__list {
  display: grid;
  gap: 12px;
}

.ui-selector-header-extra__item {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.ui-selector-header-extra__item-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary);
}

.ui-selector-header-extra__item-value {
  font-size: 14px;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-selector-header-extra__item-helper,
.ui-selector-header-extra__note {
  font-size: 13px;
  line-height: 1.7;
  color: var(--dp-text-secondary);
}

.ui-selector-header-extra__note {
  padding: 12px 14px;
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}
</style>
