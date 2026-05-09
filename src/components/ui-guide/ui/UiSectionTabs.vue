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

    <a-tabs
      class="ui-section-tabs__tabs"
      :active-key="mergedActiveKey"
      @change="handleChange"
    >
      <a-tab-pane
        v-for="item in props.items"
        :key="item.key"
        :disabled="item.disabled"
      >
        <template #tab>
          <span class="ui-section-tabs__tab-label">
            <span>{{ item.label }}</span>
            <UiBadge
              v-if="item.count !== undefined && item.count !== null"
              :tone="item.badgeTone || 'gray'"
              variant="soft"
              size="sm"
            >
              {{ item.count }}
            </UiBadge>
          </span>
        </template>
      </a-tab-pane>
    </a-tabs>

    <p v-if="activeTab?.helper" class="ui-section-tabs__helper">{{ activeTab.helper }}</p>

    <div v-if="$slots.default" class="ui-section-tabs__content">
      <slot :active-key="mergedActiveKey" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { UiSectionTabItem } from './types'
import { computed, useSlots } from 'vue'
import UiBadge from './Badge.vue'
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

const handleChange = (value: Key) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.ui-section-tabs {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ui-section-tabs--compact {
  gap: 12px;
}

.ui-section-tabs__tabs {
  margin-top: -4px;
}

.ui-section-tabs__tab-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.ui-section-tabs__helper {
  margin: -2px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-muted, #64748b);
}

.ui-section-tabs__content {
  padding-top: 16px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}

.ui-section-tabs :deep(.ant-tabs-nav) {
  margin: 0;
}

.ui-section-tabs :deep(.ant-tabs-nav::before) {
  border-bottom-color: var(--dp-border, #e5e7eb);
}

.ui-section-tabs :deep(.ant-tabs-tab) {
  padding: 12px 2px;
  font-size: 14px;
  color: var(--dp-text-secondary, #475569);
}

.ui-section-tabs :deep(.ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: var(--dp-text-primary, #0f172a);
  font-weight: 800;
}

.ui-section-tabs :deep(.ant-tabs-ink-bar) {
  height: 3px;
  border-radius: 999px;
  background: var(--dp-blue-600, #2563eb);
}

.ui-section-tabs :deep(.ant-tabs-content-holder) {
  display: none;
}
</style>
