<template>
  <div ref="tabsRoot" class="ui-tabs" :class="[`ui-tabs--${props.variant}`]">
    <a-tabs
      :active-key="activeKey"
      :type="props.variant === 'pill' ? 'line' : props.variant"
      :size="props.size"
      :animated="props.animated"
      :centered="props.centered"
      :get-popup-container="getPopupContainer"
      v-bind="$attrs"
      @update:active-key="handleUpdate"
      @change="handleChange"
    >
      <template v-if="props.items.length">
        <a-tab-pane
          v-for="item in props.items"
          :key="item.key"
          :tab="item.label"
          :disabled="item.disabled"
        />
      </template>
      <slot />
    </a-tabs>
  </div>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { UiTabItem } from './types'
import { ref } from 'vue'
import { resolvePopupContainer } from './popup-container'

defineOptions({
  name: 'UiTabs',
  inheritAttrs: false,
})

const activeKey = defineModel<Key>('activeKey')

const props = withDefaults(
  defineProps<{
    items?: UiTabItem[]
    variant?: 'line' | 'card' | 'pill'
    size?: 'small' | 'middle' | 'large'
    animated?: boolean
    centered?: boolean
  }>(),
  {
    items: () => [],
    variant: 'line',
    size: 'middle',
    animated: false,
    centered: false,
  },
)

const emit = defineEmits<{
  (e: 'change', value: Key): void
}>()

const tabsRoot = ref<HTMLElement>()

const getPopupContainer = (triggerNode?: HTMLElement) => {
  return tabsRoot.value ?? resolvePopupContainer(triggerNode)
}

const handleUpdate = (value: Key) => {
  activeKey.value = value
}

const handleChange = (value: Key) => {
  emit('change', value)
}
</script>

<style scoped>
.ui-tabs {
  position: relative;
}

.ui-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}

.ui-tabs :deep(.ant-tabs-tab) {
  border-radius: var(--dp-radius-control) var(--dp-radius-control) 0 0;
  transition: all 0.2s ease;
}

.ui-tabs :deep(.ant-tabs-tab-btn) {
  font-weight: 600;
  color: var(--dp-text-secondary);
}

.ui-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: var(--dp-blue-700);
}

.ui-tabs :deep(.ant-tabs-ink-bar) {
  background: var(--dp-blue-600);
  height: 3px;
  border-radius: 999px;
}

.ui-tabs--card :deep(.ant-tabs-card .ant-tabs-tab) {
  border-radius: var(--dp-radius-control) var(--dp-radius-control) 0 0;
}

.ui-tabs--pill :deep(.ant-tabs-nav-wrap) {
  background: var(--dp-surface-subtle);
  border-radius: var(--dp-radius-panel);
  padding: 4px;
}

.ui-tabs--pill :deep(.ant-tabs-tab) {
  margin: 0 4px 0 0;
  padding: 8px 14px;
  border-radius: var(--dp-radius-control-inner);
}

.ui-tabs--pill :deep(.ant-tabs-tab-active) {
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-soft);
}

.ui-tabs--pill :deep(.ant-tabs-ink-bar) {
  display: none;
}
</style>
