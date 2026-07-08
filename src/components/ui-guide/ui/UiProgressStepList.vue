<template>
  <section class="ui-progress-step-list" v-bind="$attrs">
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

    <div class="ui-progress-step-list__items">
      <article
        v-for="(item, index) in props.items"
        :key="item.key || item.title || index"
        class="ui-progress-step-list__item"
      >
        <div class="ui-progress-step-list__rail">
          <span
            class="ui-progress-step-list__dot"
            :class="`ui-progress-step-list__dot--${item.status || 'pending'}`"
          />
          <span
            v-if="index < props.items.length - 1"
            class="ui-progress-step-list__line"
            :class="{ 'ui-progress-step-list__line--done': isLineDone(item.status) }"
          />
        </div>

        <div class="ui-progress-step-list__content">
          <div class="ui-progress-step-list__head">
            <div class="ui-progress-step-list__title-wrap">
              <h4 class="ui-progress-step-list__title">{{ item.title }}</h4>
              <UiTag :tone="getStatusTone(item.status)" size="sm" variant="outline">
                {{ item.statusLabel || getStatusLabel(item.status) }}
              </UiTag>
            </div>

            <div v-if="item.meta" class="ui-progress-step-list__meta">{{ item.meta }}</div>
          </div>

          <p v-if="item.description" class="ui-progress-step-list__description">
            {{ item.description }}
          </p>

          <div
            v-if="item.percent !== undefined || item.helper"
            class="ui-progress-step-list__footer"
          >
            <UiProgressBar
              v-if="item.percent !== undefined"
              class="ui-progress-step-list__bar"
              :percent="item.percent"
              size="small"
              :show-text="false"
              :color="getStatusColor(item.status)"
            />
            <div v-if="item.helper" class="ui-progress-step-list__helper">{{ item.helper }}</div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiProgressStepItem } from './types'
import { computed, useSlots } from 'vue'
import UiProgressBar from './ProgressBar.vue'
import UiTag from './Tag.vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiProgressStepList',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    items?: UiProgressStepItem[]
    compact?: boolean
    divided?: boolean
  }>(),
  {
    title: '',
    description: '',
    eyebrow: '',
    items: () => [],
    compact: false,
    divided: false,
  },
)

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.meta || !!slots.actions
})

const getStatusLabel = (status?: UiProgressStepItem['status']) => {
  switch (status) {
    case 'completed':
      return '已完成'
    case 'active':
      return '进行中'
    case 'warning':
      return '需关注'
    case 'error':
      return '异常'
    case 'pending':
    default:
      return '待处理'
  }
}

const getStatusTone = (status?: UiProgressStepItem['status']): BadgeTone => {
  switch (status) {
    case 'completed':
      return 'green'
    case 'active':
      return 'blue'
    case 'warning':
      return 'orange'
    case 'error':
      return 'red'
    case 'pending':
    default:
      return 'gray'
  }
}

const getStatusColor = (status?: UiProgressStepItem['status']) => {
  switch (status) {
    case 'completed':
      return '#16a34a'
    case 'active':
      return '#2563eb'
    case 'warning':
      return '#ea580c'
    case 'error':
      return '#dc2626'
    case 'pending':
    default:
      return '#94a3b8'
  }
}

const isLineDone = (status?: UiProgressStepItem['status']) => {
  return status === 'completed' || status === 'active'
}
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.ui-progress-step-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-progress-step-list__items {
  display: grid;
  gap: 0;
}

.ui-progress-step-list__item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
}

.ui-progress-step-list__rail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ui-progress-step-list__dot {
  width: 14px;
  height: 14px;
  margin-top: 4px;
  border: 2px solid #cbd5e1;
  border-radius: 999px;
  background: #fff;
  z-index: 1;
}

.ui-progress-step-list__dot--pending {
  border-color: #cbd5e1;
}

.ui-progress-step-list__dot--active {
  border-color: #2563eb;
  background: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.ui-progress-step-list__dot--completed {
  border-color: #16a34a;
  background: #16a34a;
}

.ui-progress-step-list__dot--warning {
  border-color: #ea580c;
  background: #fff7ed;
}

.ui-progress-step-list__dot--error {
  border-color: #dc2626;
  background: #fef2f2;
}

.ui-progress-step-list__line {
  width: 2px;
  flex: 1;
  min-height: 44px;
  background: #e2e8f0;
}

.ui-progress-step-list__line--done {
  background: #2563eb;
}

.ui-progress-step-list__content {
  display: grid;
  gap: 10px;
  padding: 0 0 18px;
}

.ui-progress-step-list__head,
.ui-progress-step-list__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ui-progress-step-list__title-wrap {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-progress-step-list__title {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-progress-step-list__meta,
.ui-progress-step-list__helper {
  font-size: 12px;
  color: var(--dp-text-muted);
}

.ui-progress-step-list__description {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--dp-text-secondary);
}

.ui-progress-step-list__bar {
  width: min(240px, 100%);
}

@media (max-width: bp.$layout-mobile-max) {
  .ui-progress-step-list__head,
  .ui-progress-step-list__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .ui-progress-step-list__bar {
    width: 100%;
  }
}
</style>
