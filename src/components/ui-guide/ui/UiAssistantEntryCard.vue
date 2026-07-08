<template>
  <article
    class="ui-assistant-entry-card"
    :class="[
      `ui-assistant-entry-card--${props.tone}`,
      { 'ui-assistant-entry-card--clickable': props.clickable },
    ]"
    v-bind="$attrs"
    @click="handleClick"
  >
    <div class="ui-assistant-entry-card__icon">
      <slot name="icon">{{ props.iconText }}</slot>
    </div>

    <div class="ui-assistant-entry-card__content">
      <div class="ui-assistant-entry-card__title">{{ props.title }}</div>
      <div class="ui-assistant-entry-card__description">{{ props.description }}</div>
      <div v-if="props.helper" class="ui-assistant-entry-card__helper">{{ props.helper }}</div>
    </div>
  </article>
</template>

<script lang="ts" setup>
import type { BadgeTone } from './types'

defineOptions({
  name: 'UiAssistantEntryCard',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    helper?: string
    iconText?: string
    tone?: BadgeTone
    clickable?: boolean
  }>(),
  {
    helper: '',
    iconText: 'AI',
    tone: 'blue',
    clickable: true,
  },
)

const emit = defineEmits<{
  (e: 'click', evt: MouseEvent): void
}>()

const handleClick = (evt: MouseEvent) => {
  if (!props.clickable) return

  emit('click', evt)
}
</script>

<style scoped>
.ui-assistant-entry-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: #fff;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.ui-assistant-entry-card--clickable {
  cursor: pointer;
}

.ui-assistant-entry-card--clickable:hover {
  border-color: var(--dp-border-strong);
  background: var(--dp-gray-50);
}

.ui-assistant-entry-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--dp-radius-panel);
  font-size: 18px;
  font-weight: 800;
}

.ui-assistant-entry-card__content {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.ui-assistant-entry-card__title {
  font-size: 15px;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-assistant-entry-card__description,
.ui-assistant-entry-card__helper {
  font-size: 13px;
  line-height: 1.7;
  color: var(--dp-text-secondary);
}

.ui-assistant-entry-card--gray .ui-assistant-entry-card__icon {
  background: #f8fafc;
  color: #475569;
}

.ui-assistant-entry-card--blue .ui-assistant-entry-card__icon {
  background: #eff6ff;
  color: #1d4ed8;
}

.ui-assistant-entry-card--green .ui-assistant-entry-card__icon {
  background: #ecfdf3;
  color: #15803d;
}

.ui-assistant-entry-card--orange .ui-assistant-entry-card__icon {
  background: #fff7ed;
  color: #c2410c;
}

.ui-assistant-entry-card--red .ui-assistant-entry-card__icon {
  background: #fef2f2;
  color: #b91c1c;
}

.ui-assistant-entry-card--yellow .ui-assistant-entry-card__icon {
  background: #fefce8;
  color: #a16207;
}

.ui-assistant-entry-card--purple .ui-assistant-entry-card__icon {
  background: #f5f3ff;
  color: var(--dp-purple-500);
}
</style>
