<template>
  <section class="ui-accordion" v-bind="$attrs">
    <UiPanelHeader
      v-if="hasHeader"
      :title="props.title"
      :description="props.description"
      :eyebrow="props.eyebrow"
      :compact="props.compact"
    >
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </UiPanelHeader>

    <a-collapse
      v-model:active-key="activeKeys"
      class="ui-accordion__collapse"
      :accordion="props.accordion"
      ghost
      expand-icon-position="end"
    >
      <a-collapse-panel
        v-for="item in props.items"
        :key="item.key"
        :collapsible="item.disabled ? 'disabled' : undefined"
      >
        <template #header>
          <div class="ui-accordion__header">
            <div class="ui-accordion__header-main">
              <div class="ui-accordion__title-row">
                <span class="ui-accordion__title">{{ item.label }}</span>
                <UiTag
                  v-if="item.badgeLabel"
                  size="sm"
                  variant="outline"
                  :tone="item.badgeTone || 'blue'"
                >
                  {{ item.badgeLabel }}
                </UiTag>
              </div>
              <div v-if="item.description || item.helper" class="ui-accordion__description">
                {{ item.description || item.helper }}
              </div>
            </div>
          </div>
        </template>

        <div class="ui-accordion__body">
          <slot :name="`panel-${item.key}`" :item="item">
            <p v-if="item.content" class="ui-accordion__content">{{ item.content }}</p>
            <div v-if="item.helper && item.content" class="ui-accordion__helper">
              {{ item.helper }}
            </div>
          </slot>
        </div>
      </a-collapse-panel>
    </a-collapse>
  </section>
</template>

<script lang="ts" setup>
import type { UiAccordionItem } from './types'
import { computed, useSlots } from 'vue'
import UiTag from './Tag.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiAccordion',
  inheritAttrs: false,
})

const activeKeys = defineModel<string[] | string | number[] | number | undefined>('activeKeys')

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    items?: UiAccordionItem[]
    accordion?: boolean
    compact?: boolean
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    items: () => [],
    accordion: false,
    compact: false,
  },
)

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.actions
})
</script>

<style scoped>
.ui-accordion {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-accordion__collapse {
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  overflow: hidden;
}
</style>

<style lang="scss">
.ui-accordion__collapse {
  .ant-collapse-item {
    border-bottom: 1px solid var(--dp-border) !important;
  }

  .ant-collapse-item:last-child {
    border-bottom: none !important;
  }

  .ant-collapse-header {
    align-items: flex-start !important;
    padding: 14px 16px !important;
    background: #fff !important;
  }

  .ant-collapse-header:hover {
    background: var(--dp-gray-50) !important;
  }

  .ant-collapse-expand-icon {
    padding-inline-end: 0 !important;
    color: var(--dp-text-secondary) !important;
  }

  .ant-collapse-content {
    border-top: 1px solid var(--dp-border) !important;
    background: #fff !important;
  }

  .ant-collapse-content-box {
    padding: 16px !important;
  }
}

.ui-accordion__header {
  width: 100%;
}

.ui-accordion__header-main {
  min-width: 0;
}

.ui-accordion__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.ui-accordion__title {
  min-width: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.5;
  color: var(--dp-text-primary);
}

.ui-accordion__description {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--dp-text-secondary);
}

.ui-accordion__body {
  min-width: 0;
}

.ui-accordion__content,
.ui-accordion__helper {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
}

.ui-accordion__content {
  color: var(--dp-text-primary);
}

.ui-accordion__helper {
  margin-top: 8px;
  color: var(--dp-text-muted);
}
</style>
