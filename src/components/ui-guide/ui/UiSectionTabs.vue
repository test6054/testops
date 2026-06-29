<template>
  <section
    class="ui-section-tabs"
    :class="{ 'ui-section-tabs--compact': props.compact }"
    v-bind="$attrs"
  >
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

    <div class="ui-section-tabs__head">
      <div class="ui-section-tabs__nav" role="tablist">
        <button
          v-for="item in props.items"
          :key="String(item.key)"
          type="button"
          role="tab"
          class="ui-section-tabs__tab"
          :class="{ 'ui-section-tabs__tab--active': isActive(item.key) }"
          :aria-selected="isActive(item.key)"
          :disabled="item.disabled"
          @click="handleChange(item.key)"
        >
          <span class="ui-section-tabs__tab-text">{{ item.label }}</span>
          <span
            v-if="item.count !== undefined && item.count !== null"
            class="ui-section-tabs__count"
            :class="countClass(item)"
          >
            {{ item.count }}
          </span>
        </button>
      </div>

      <p v-if="activeTab?.helper" class="ui-section-tabs__helper">{{ activeTab.helper }}</p>
    </div>

    <div v-if="$slots.default" class="ui-section-tabs__content">
      <slot :active-key="mergedActiveKey" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { UiSectionTabItem } from './types'
import { computed, useSlots } from 'vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiSectionTabs',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  items?: UiSectionTabItem[]
  modelValue?: Key
  compact?: boolean
  divided?: boolean
}>(), {
  title: '',
  description: '',
  eyebrow: '',
  items: () => [],
  modelValue: '',
  compact: false,
  divided: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: Key): void
  (e: 'change', value: Key): void
}>()

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.meta || !!slots.actions
})

const mergedActiveKey = computed(() => {
  if (props.modelValue)
    return props.modelValue
  return props.items[0]?.key || ''
})

const activeTab = computed(() => {
  return props.items.find(item => item.key === mergedActiveKey.value)
})

function isActive(key: Key): boolean {
  return mergedActiveKey.value === key
}

function countClass(item: UiSectionTabItem): string[] {
  const tone = item.badgeTone || 'gray'
  return [
    `ui-section-tabs__count--${tone}`,
    isActive(item.key) ? 'ui-section-tabs__count--active-tab' : '',
  ]
}

function handleChange(value: Key) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.ui-section-tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ui-section-tabs--compact {
  gap: 10px;
}

.ui-section-tabs__head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ui-section-tabs__nav {
  display: inline-flex;
  align-self: flex-start;
  max-width: 100%;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--dp-border, #e2e8f0);
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--dp-gray-50, #f8fafc);
}

.ui-section-tabs__tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border: 0;
  border-radius: calc(var(--dp-radius-panel, 8px) - 2px);
  background: transparent;
  color: var(--dp-text-secondary, #64748b);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.ui-section-tabs__tab:hover:not(:disabled):not(.ui-section-tabs__tab--active) {
  color: var(--dp-text-primary, #0f172a);
  background: rgb(255 255 255 / 55%);
}

.ui-section-tabs__tab--active {
  background: var(--dp-surface, #fff);
  color: var(--dp-text-primary, #0f172a);
  box-shadow: 0 1px 2px rgb(15 23 42 / 6%);
}

.ui-section-tabs__tab:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.ui-section-tabs__tab-text {
  white-space: nowrap;
}

.ui-section-tabs__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.ui-section-tabs__count--gray {
  background: var(--dp-gray-100, #f1f5f9);
  color: var(--dp-text-secondary, #64748b);
}

.ui-section-tabs__count--blue {
  background: var(--dp-blue-50, #eff6ff);
  color: var(--dp-blue-700, #1d4ed8);
}

.ui-section-tabs__count--green {
  background: var(--dp-green-50, #f0fdf4);
  color: var(--dp-green-700, #15803d);
}

.ui-section-tabs__count--orange {
  background: #fff7ed;
  color: #c2410c;
}

.ui-section-tabs__count--red {
  background: #fef2f2;
  color: #dc2626;
}

.ui-section-tabs__count--purple {
  background: #faf5ff;
  color: #7e22ce;
}

.ui-section-tabs__count--active-tab.ui-section-tabs__count--gray {
  background: var(--dp-gray-200, #e2e8f0);
  color: var(--dp-text-primary, #0f172a);
}

.ui-section-tabs__count--active-tab.ui-section-tabs__count--blue {
  background: var(--dp-blue-600, #2563eb);
  color: #fff;
}

.ui-section-tabs__count--active-tab.ui-section-tabs__count--green {
  background: var(--dp-green-600);
  color: #fff;
}

.ui-section-tabs__count--active-tab.ui-section-tabs__count--orange {
  background: #ea580c;
  color: #fff;
}

.ui-section-tabs__count--active-tab.ui-section-tabs__count--red {
  background: #dc2626;
  color: #fff;
}

.ui-section-tabs__count--active-tab.ui-section-tabs__count--purple {
  background: #9333ea;
  color: #fff;
}

.ui-section-tabs__helper {
  margin: 0;
  padding-left: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dp-text-muted, #64748b);
}

.ui-section-tabs__content {
  padding-top: 12px;
}

.ui-section-tabs--compact .ui-section-tabs__tab {
  padding: 6px 12px;
  font-size: 13px;
}

.ui-section-tabs--compact .ui-section-tabs__count {
  min-width: 18px;
  height: 16px;
  padding: 0 5px;
  font-size: 10px;
}

.ui-section-tabs--compact .ui-section-tabs__content {
  padding-top: 10px;
}
</style>
