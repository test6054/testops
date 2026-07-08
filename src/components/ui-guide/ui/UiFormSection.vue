<template>
  <section class="ui-form-section" :class="{ 'ui-form-section--divided': divided }">
    <header v-if="title || subtitle || $slots.header" class="ui-form-section__header">
      <slot name="header">
        <div v-if="title" class="ui-form-section__title">{{ title }}</div>
        <div v-if="subtitle" class="ui-form-section__subtitle">{{ subtitle }}</div>
      </slot>
    </header>
    <div class="ui-form-section__body">
      <slot />
    </div>
  </section>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiFormSection' })

withDefaults(defineProps<{
  title?: string
  subtitle?: string
  divided?: boolean
}>(), {
  title: '',
  subtitle: '',
  divided: false,
})
</script>

<style scoped>
.ui-form-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-form-section__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ui-form-section__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dp-text-primary);
}

.ui-form-section__subtitle {
  font-size: 13px;
  color: var(--dp-text-muted);
}

.ui-form-section__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-form-section--divided {
  padding-top: 4px;
}

.ui-form-section--divided + .ui-form-section--divided {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--dp-border);
}
</style>
