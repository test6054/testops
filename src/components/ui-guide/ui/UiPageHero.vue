<template>
  <section
    class="ui-page-hero"
    :class="{
      'ui-page-hero--compact': props.compact,
      'ui-page-hero--divided': props.divided,
    }"
    v-bind="$attrs"
  >
    <div class="ui-page-hero__main">
      <div v-if="props.eyebrow || $slots.eyebrow" class="ui-page-hero__eyebrow">
        <slot name="eyebrow">{{ props.eyebrow }}</slot>
      </div>

      <div class="ui-page-hero__title-row">
        <h1 class="ui-page-hero__title">{{ props.title }}</h1>
        <div v-if="$slots.badges" class="ui-page-hero__badges">
          <slot name="badges" />
        </div>
      </div>

      <p v-if="props.subtitle" class="ui-page-hero__subtitle">{{ props.subtitle }}</p>
      <p v-if="props.description" class="ui-page-hero__description">{{ props.description }}</p>

      <div v-if="$slots.meta" class="ui-page-hero__meta">
        <slot name="meta" />
      </div>

      <div v-if="hasStats" class="ui-page-hero__stats">
        <slot name="stats">
          <article
            v-for="item in props.stats"
            :key="item.key || item.label"
            class="ui-page-hero__stat"
          >
            <div class="ui-page-hero__stat-label">{{ item.label }}</div>
            <div
              class="ui-page-hero__stat-value"
              :class="`ui-page-hero__stat-value--${item.tone || 'blue'}`"
            >
              {{ item.value }}
            </div>
            <div v-if="item.helper" class="ui-page-hero__stat-helper">{{ item.helper }}</div>
          </article>
        </slot>
      </div>
    </div>

    <div v-if="$slots.actions || $slots.aside" class="ui-page-hero__side">
      <div v-if="$slots.actions" class="ui-page-hero__actions">
        <slot name="actions" />
      </div>

      <div v-if="$slots.aside" class="ui-page-hero__aside">
        <slot name="aside" />
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { UiHeroStatItem } from './types'
import { computed, useSlots } from 'vue'

defineOptions({
  name: 'UiPageHero',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    description?: string
    eyebrow?: string
    stats?: UiHeroStatItem[]
    compact?: boolean
    divided?: boolean
  }>(),
  {
    subtitle: '',
    description: '',
    eyebrow: '',
    stats: () => [],
    compact: false,
    divided: false,
  },
)

const slots = useSlots()

const hasStats = computed(() => {
  return props.stats.length > 0 || !!slots.stats
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.ui-page-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 20px;
  padding: 24px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  box-shadow: var(--dp-shadow-card);
}

.ui-page-hero--compact {
  padding: 20px;
  gap: 16px;
}

.ui-page-hero--divided {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.ui-page-hero__main,
.ui-page-hero__side {
  min-width: 0;
}

.ui-page-hero__main {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ui-page-hero__eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: var(--dp-blue-700);
}

.ui-page-hero__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-page-hero__title {
  margin: 0;
  font-size: 20px;
  line-height: 1.3;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.ui-page-hero__badges,
.ui-page-hero__meta,
.ui-page-hero__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-page-hero__subtitle {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--dp-text-primary);
}

.ui-page-hero__description,
.ui-page-hero__stat-helper {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--dp-text-secondary);
}

.ui-page-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 4px;
}

.ui-page-hero__stat {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}

.ui-page-hero__stat-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-text-secondary);
}

.ui-page-hero__stat-value {
  font-size: 22px;
  line-height: 1.2;
  font-weight: 600;
}

.ui-page-hero__stat-value--gray {
  color: #475569;
}

.ui-page-hero__stat-value--blue {
  color: #1d4ed8;
}

.ui-page-hero__stat-value--green {
  color: #15803d;
}

.ui-page-hero__stat-value--orange {
  color: #c2410c;
}

.ui-page-hero__stat-value--red {
  color: #b91c1c;
}

.ui-page-hero__stat-value--yellow {
  color: #a16207;
}

.ui-page-hero__stat-value--purple {
  color: var(--dp-purple-500);
}

.ui-page-hero__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.ui-page-hero__aside {
  width: min(320px, 100%);
}

@media (max-width: 1080px) {
  .ui-page-hero {
    grid-template-columns: minmax(0, 1fr);
  }

  .ui-page-hero__side {
    align-items: flex-start;
  }

  .ui-page-hero__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: bp.$layout-mobile-max) {
  .ui-page-hero {
    padding: 20px;
  }

  .ui-page-hero__title {
    font-size: 18px;
  }

  .ui-page-hero__stats {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
