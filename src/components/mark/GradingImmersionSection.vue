<template>
  <section class="grading-immersion-section">
    <header v-if="title || $slots.actions || $slots.tags" class="grading-immersion-section__header">
      <div class="grading-immersion-section__title-row">
        <slot name="icon" />
        <h3 v-if="title" class="grading-immersion-section__title">{{ title }}</h3>
        <div v-if="$slots.tags" class="grading-immersion-section__tags">
          <slot name="tags" />
        </div>
      </div>
      <div v-if="$slots.actions" class="grading-immersion-section__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="grading-immersion-section__body">
      <slot />
    </div>
  </section>
</template>

<script lang="ts" setup>
defineOptions({ name: 'GradingImmersionSection' })

defineProps<{
  /** 沉浸主区/侧栏区块标题 */
  title?: string
}>()
</script>

<style lang="scss" scoped>
.grading-immersion-section {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2, 8px);
  padding: var(--dp-space-3, 12px);
  background: var(--dp-surface);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-2, 8px) var(--dp-space-3, 12px);
  }

  &__title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    line-height: 1.4;
    color: var(--dp-text-primary);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__body {
    min-width: 0;
  }
}
</style>
