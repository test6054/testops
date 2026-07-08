<template>
  <section class="ui-mode-switch-panel" v-bind="$attrs">
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
      class="ui-mode-switch-panel__options"
      :class="`ui-mode-switch-panel__options--${props.columns}`"
    >
      <button
        v-for="item in props.options"
        :key="item.key"
        type="button"
        class="ui-mode-switch-panel__option"
        :class="{
          'ui-mode-switch-panel__option--active': currentValue === item.key,
          'ui-mode-switch-panel__option--disabled': item.disabled,
        }"
        :disabled="item.disabled"
        @click="handleChange(item.key)"
      >
        <div class="ui-mode-switch-panel__option-head">
          <div class="ui-mode-switch-panel__option-title">{{ item.label }}</div>
          <UiBadge v-if="item.badgeLabel" :tone="item.badgeTone || 'gray'" variant="soft" size="sm">
            {{ item.badgeLabel }}
          </UiBadge>
        </div>
        <div v-if="item.description" class="ui-mode-switch-panel__option-desc">
          {{ item.description }}
        </div>
      </button>
    </div>

    <div class="ui-mode-switch-panel__content">
      <slot :active-option="activeOption" :active-key="currentValue" />
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { UiModeSwitchOption } from './types'
import { computed, useSlots } from 'vue'
import UiBadge from './Badge.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiModeSwitchPanel',
  inheritAttrs: false,
})

const currentValue = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    options?: UiModeSwitchOption[]
    columns?: 2 | 3
    compact?: boolean
    divided?: boolean
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    options: () => [],
    columns: 3,
    compact: false,
    divided: true,
  },
)

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.meta || !!slots.actions
})

const activeOption = computed(() => {
  return props.options.find((item) => item.key === currentValue.value)
})

const handleChange = (key: string) => {
  currentValue.value = key
}
</script>

<style scoped>
.ui-mode-switch-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-mode-switch-panel__options {
  display: grid;
  gap: 12px;
}

.ui-mode-switch-panel__options--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ui-mode-switch-panel__options--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ui-mode-switch-panel__option {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 14px 16px;
  text-align: left;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: #fff;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  cursor: pointer;
}

.ui-mode-switch-panel__option:hover:not(:disabled) {
  border-color: var(--dp-border-strong);
  background: var(--dp-gray-50);
}

.ui-mode-switch-panel__option--active {
  border-color: var(--dp-blue-200);
  background: var(--dp-blue-50);
}

.ui-mode-switch-panel__option--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ui-mode-switch-panel__option-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ui-mode-switch-panel__option-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-mode-switch-panel__option-desc {
  font-size: 13px;
  line-height: 1.7;
  color: var(--dp-text-secondary);
}

.ui-mode-switch-panel__content {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: #fff;
}

@media (max-width: 900px) {
  .ui-mode-switch-panel__options--2,
  .ui-mode-switch-panel__options--3 {
    grid-template-columns: 1fr;
  }
}
</style>
