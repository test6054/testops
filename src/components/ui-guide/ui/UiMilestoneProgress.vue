<template>
  <section class="ui-milestone-progress" v-bind="$attrs">
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

    <div class="ui-milestone-progress__rail" :style="railStyle">
      <button
        v-for="(item, index) in normalizedItems"
        :key="item.key"
        type="button"
        class="ui-milestone-progress__item"
        :class="{
          'ui-milestone-progress__item--active': currentActiveKey === item.key,
          'ui-milestone-progress__item--completed': item.status === 'completed',
          'ui-milestone-progress__item--warning': item.status === 'warning',
          'ui-milestone-progress__item--error': item.status === 'error',
        }"
        @click="handleSelect(item.key)"
      >
        <div class="ui-milestone-progress__node-wrap">
          <span
            class="ui-milestone-progress__line ui-milestone-progress__line--prev"
            :class="{ 'ui-milestone-progress__line--done': isPrevLineDone(index) }"
          />
          <span class="ui-milestone-progress__node">
            {{ index + 1 }}
          </span>
          <span
            class="ui-milestone-progress__line ui-milestone-progress__line--next"
            :class="{ 'ui-milestone-progress__line--done': isNextLineDone(index) }"
          />
        </div>

        <div class="ui-milestone-progress__body">
          <div class="ui-milestone-progress__title">{{ item.label }}</div>

          <div class="ui-milestone-progress__meta-row">
            <span v-if="item.meta" class="ui-milestone-progress__meta">{{ item.meta }}</span>
            <span
              class="ui-milestone-progress__status"
              :class="`ui-milestone-progress__status--${item.status}`"
            >
              {{ item.statusLabel || getStatusLabel(item.status) }}
            </span>
          </div>

          <div
            v-if="currentActiveKey === item.key && (item.helper || item.percent !== undefined)"
            class="ui-milestone-progress__active-meta"
          >
            <span v-if="item.helper" class="ui-milestone-progress__helper">{{ item.helper }}</span>
            <span v-if="item.percent !== undefined" class="ui-milestone-progress__percent">
              进度 {{ item.percent }}%
            </span>
          </div>
        </div>
      </button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { UiMilestoneItem } from './types'
import { computed, useSlots } from 'vue'
import UiPanelHeader from './UiPanelHeader.vue'

defineOptions({
  name: 'UiMilestoneProgress',
  inheritAttrs: false,
})

const modelValue = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    eyebrow?: string
    items?: UiMilestoneItem[]
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

const emit = defineEmits<{
  (e: 'select', value: string): void
}>()

const slots = useSlots()

const hasHeader = computed(() => {
  return !!props.title || !!props.description || !!props.eyebrow || !!slots.meta || !!slots.actions
})

const normalizedItems = computed(() => {
  return props.items.map((item, index) => ({
    ...item,
    key: item.key || `milestone-${index}`,
    status: item.status || 'pending',
  }))
})

const currentActiveKey = computed(() => {
  return (
    modelValue.value ||
    normalizedItems.value.find((item) => item.status === 'active')?.key ||
    normalizedItems.value[0]?.key ||
    ''
  )
})

const railStyle = computed(() => {
  if (!normalizedItems.value.length) {
    return undefined
  }

  return {
    '--milestone-columns': `repeat(${normalizedItems.value.length}, minmax(0, 1fr))`,
  }
})

function getStatusLabel(status?: UiMilestoneItem['status']) {
  switch (status) {
    case 'completed':
      return '已完成'
    case 'active':
      return '进行中'
    case 'warning':
      return '需关注'
    case 'error':
      return '已逾期'
    case 'pending':
    default:
      return '待开始'
  }
}

function isPrevLineDone(index: number) {
  if (index === 0) {
    return false
  }

  const prevStatus = normalizedItems.value[index - 1]?.status
  return prevStatus === 'completed'
}

function isNextLineDone(index: number) {
  if (index >= normalizedItems.value.length - 1) {
    return false
  }

  const status = normalizedItems.value[index]?.status
  return status === 'completed'
}

function handleSelect(key: string) {
  modelValue.value = key
  emit('select', key)
}
</script>

<style scoped>
.ui-milestone-progress {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.ui-milestone-progress__rail {
  display: grid;
  grid-template-columns: var(--milestone-columns);
  align-items: start;
  gap: 0;
  min-width: 0;
}

.ui-milestone-progress__item {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 14px;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  text-align: center;
  cursor: pointer;
}

.ui-milestone-progress__item:focus-visible {
  outline: none;
}

.ui-milestone-progress__node-wrap {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}

.ui-milestone-progress__node {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 1px solid #dbe2ea;
  border-radius: 999px;
  background: #fff;
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.ui-milestone-progress__line {
  height: 2px;
  flex: 1;
  background: #e5e7eb;
}

.ui-milestone-progress__line--prev {
  margin-right: 12px;
}

.ui-milestone-progress__line--next {
  margin-left: 12px;
}

.ui-milestone-progress__line--done {
  background: #91caff;
}

.ui-milestone-progress__item:first-child .ui-milestone-progress__line--prev,
.ui-milestone-progress__item:last-child .ui-milestone-progress__line--next {
  visibility: hidden;
}

.ui-milestone-progress__body {
  display: grid;
  justify-items: center;
  gap: 6px;
  width: min(100%, 240px);
  min-width: 0;
  margin: 0 auto;
  padding: 0 12px;
  transition: color 0.2s ease;
}

.ui-milestone-progress__item--completed .ui-milestone-progress__node {
  border-color: #93c5fd;
  background: #eff6ff;
  color: #2563eb;
}

.ui-milestone-progress__item--active .ui-milestone-progress__node {
  border-color: #2563eb;
  background: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
  color: #fff;
}

.ui-milestone-progress__item--warning .ui-milestone-progress__node {
  border-color: #fdba74;
  background: #fff7ed;
  color: #ea580c;
}

.ui-milestone-progress__item--error .ui-milestone-progress__node {
  border-color: #fca5a5;
  background: #fef2f2;
  color: #dc2626;
}

.ui-milestone-progress__title {
  width: 100%;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-milestone-progress__item:hover .ui-milestone-progress__title,
.ui-milestone-progress__item--active .ui-milestone-progress__title {
  color: #2563eb;
}

.ui-milestone-progress__meta-row,
.ui-milestone-progress__active-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  width: 100%;
  min-height: 18px;
}

.ui-milestone-progress__meta,
.ui-milestone-progress__helper,
.ui-milestone-progress__status {
  font-size: 12px;
  line-height: 1.5;
}

.ui-milestone-progress__meta,
.ui-milestone-progress__helper {
  text-align: center;
  color: var(--dp-text-muted, #64748b);
}

.ui-milestone-progress__status {
  font-weight: 700;
  color: #94a3b8;
}

.ui-milestone-progress__status--completed,
.ui-milestone-progress__status--active {
  color: #2563eb;
}

.ui-milestone-progress__status--warning {
  color: #ea580c;
}

.ui-milestone-progress__status--error {
  color: #dc2626;
}

.ui-milestone-progress__percent {
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
}

@media (max-width: 900px) {
  .ui-milestone-progress__rail {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: minmax(180px, 1fr);
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .ui-milestone-progress__item {
    min-width: 180px;
  }
}
</style>
