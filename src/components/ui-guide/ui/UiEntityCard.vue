<template>
  <article
    class="ui-entity-card"
    :class="[
      `ui-entity-card--${props.tone}`,
      {
        'ui-entity-card--clickable': props.clickable,
        'ui-entity-card--selected': props.selected,
        'ui-entity-card--compact': props.compact,
      },
    ]"
    v-bind="$attrs"
    @click="handleClick"
  >
    <div v-if="$slots.cover" class="ui-entity-card__cover">
      <slot name="cover" />
    </div>

    <div class="ui-entity-card__body">
      <div class="ui-entity-card__top">
        <div class="ui-entity-card__title-wrap">
          <div v-if="props.eyebrow || $slots.eyebrow" class="ui-entity-card__eyebrow">
            <slot name="eyebrow">{{ props.eyebrow }}</slot>
          </div>

          <div class="ui-entity-card__title-row">
            <h3 class="ui-entity-card__title">{{ props.title }}</h3>
            <div v-if="$slots.badge" class="ui-entity-card__badges">
              <slot name="badge" />
            </div>
          </div>

          <p v-if="props.description || $slots.description" class="ui-entity-card__description">
            <slot name="description">{{ props.description }}</slot>
          </p>
        </div>

        <div v-if="$slots.actions" class="ui-entity-card__actions" @click.stop>
          <slot name="actions" />
        </div>
      </div>

      <div v-if="$slots.tags" class="ui-entity-card__tags">
        <slot name="tags" />
      </div>

      <div v-if="$slots.meta" class="ui-entity-card__meta">
        <slot name="meta" />
      </div>

      <div v-if="$slots.default" class="ui-entity-card__content">
        <slot />
      </div>

      <div v-if="$slots.footer" class="ui-entity-card__footer">
        <slot name="footer" />
      </div>
    </div>
  </article>
</template>

<script lang="ts" setup>
import type { BadgeTone } from './types'

defineOptions({
  name: 'UiEntityCard',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    eyebrow?: string
    tone?: BadgeTone
    clickable?: boolean
    selected?: boolean
    compact?: boolean
  }>(),
  {
    description: '',
    eyebrow: '',
    tone: 'blue',
    clickable: true,
    selected: false,
    compact: false,
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
.ui-entity-card {
  --entity-accent: #2563eb;
  --entity-cover-bg: var(--dp-surface-subtle, #f8fafc);
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--dp-surface, #fff);
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  box-shadow: var(--dp-shadow-card, 0 10px 30px rgba(15, 23, 42, 0.06));
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.ui-entity-card--clickable {
  cursor: pointer;
}

.ui-entity-card--clickable:hover {
  border-color: var(--dp-border-strong, #d0d5dd);
  background: var(--dp-surface, #fff);
}

.ui-entity-card--selected {
  border-color: var(--dp-blue-200, #bfdbfe);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.08);
}

.ui-entity-card__cover {
  min-height: 108px;
  padding: 20px 20px 18px;
  background: var(--entity-cover-bg);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.ui-entity-card__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 20px 18px;
}

.ui-entity-card--compact .ui-entity-card__body {
  gap: 12px;
  padding: 16px;
}

.ui-entity-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.ui-entity-card__title-wrap {
  min-width: 0;
  flex: 1;
}

.ui-entity-card__eyebrow {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dp-text-secondary, #475569);
}

.ui-entity-card__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-entity-card__title {
  margin: 0;
  font-size: 18px;
  line-height: 1.45;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.ui-entity-card__badges,
.ui-entity-card__actions,
.ui-entity-card__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-entity-card__actions {
  flex-shrink: 0;
}

.ui-entity-card__description {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.75;
  color: var(--dp-text-secondary, #475569);
}

.ui-entity-card__meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ui-entity-card__content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ui-entity-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--dp-border, #e5e7eb);
}

.ui-entity-card--gray {
  --entity-accent: #64748b;
  --entity-cover-bg: var(--dp-surface-subtle, #f8fafc);
}

.ui-entity-card--blue {
  --entity-accent: #2563eb;
  --entity-cover-bg: #eff6ff;
}

.ui-entity-card--orange {
  --entity-accent: #ea580c;
  --entity-cover-bg: #fff7ed;
}

.ui-entity-card--green {
  --entity-accent: #16a34a;
  --entity-cover-bg: #ecfdf3;
}

.ui-entity-card--yellow {
  --entity-accent: #ca8a04;
  --entity-cover-bg: #fefce8;
}

.ui-entity-card--red {
  --entity-accent: #dc2626;
  --entity-cover-bg: #fef2f2;
}

.ui-entity-card--purple {
  --entity-accent: var(--dp-purple-500, #722ed1);
  --entity-cover-bg: #f5f3ff;
}

@media (max-width: 767px) {
  .ui-entity-card__top,
  .ui-entity-card__footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .ui-entity-card__actions {
    width: 100%;
  }
}
</style>
