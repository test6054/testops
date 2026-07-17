<template>
  <div
    class="ui-panel-header"
    :class="{
      'ui-panel-header--divided': props.divided,
      'ui-panel-header--compact': props.compact,
    }"
    v-bind="$attrs"
  >
    <div class="ui-panel-header__main">
      <div v-if="props.eyebrow || $slots.eyebrow" class="ui-panel-header__eyebrow">
        <slot name="eyebrow">{{ props.eyebrow }}</slot>
      </div>

      <div class="ui-panel-header__row">
        <div class="ui-panel-header__title-wrap">
          <div class="ui-panel-header__title-row">
            <h3 class="ui-panel-header__title">
              <slot>{{ props.title }}</slot>
            </h3>
            <div v-if="$slots.meta" class="ui-panel-header__meta">
              <slot name="meta" />
            </div>
          </div>

          <p v-if="props.description || $slots.description" class="ui-panel-header__description">
            <slot name="description">{{ props.description }}</slot>
          </p>
        </div>

        <div v-if="$slots.actions" class="ui-panel-header__actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiPanelHeader',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  title?: string
  description?: string
  eyebrow?: string
  divided?: boolean
  compact?: boolean
}>(), {
  title: '',
  description: '',
  eyebrow: '',
  divided: false,
  compact: false,
})
</script>

<style scoped>
.ui-panel-header {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 10px);
}

.ui-panel-header--divided {
  padding-bottom: var(--dp-space-3, 10px);
  border-bottom: 1px solid var(--dp-border);
}

.ui-panel-header--compact {
  gap: var(--dp-space-2, 8px);
}

.ui-panel-header__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dp-blue-700);
}

.ui-panel-header__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3, 10px);
}

.ui-panel-header__title-wrap {
  min-width: 0;
  flex: 1;
}

.ui-panel-header__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-3, 10px);
}

.ui-panel-header__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.4;
  color: var(--dp-text-primary);
}

.ui-panel-header__meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
}

.ui-panel-header__description {
  margin: var(--dp-space-2, 8px) 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--dp-text-secondary);
}

.ui-panel-header__actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--dp-space-3, 12px);
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .ui-panel-header__row {
    flex-direction: column;
  }

  .ui-panel-header__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
