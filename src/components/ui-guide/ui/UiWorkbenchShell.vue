<template>
  <div class="ui-workbench-shell" v-bind="$attrs">
    <header class="ui-workbench-shell__toolbar">
      <div class="ui-workbench-shell__toolbar-main">
        <div class="ui-workbench-shell__title">{{ props.title }}</div>
        <div v-if="props.subtitle" class="ui-workbench-shell__subtitle">{{ props.subtitle }}</div>
      </div>

      <div v-if="$slots.actions" class="ui-workbench-shell__toolbar-actions">
        <slot name="actions" />
      </div>
    </header>

    <div
      class="ui-workbench-shell__layout"
      :class="{ 'ui-workbench-shell__layout--single': !hasAside }"
      :style="layoutStyle"
    >
      <aside v-if="hasAside" class="ui-workbench-shell__aside">
        <slot name="aside" />
      </aside>

      <main class="ui-workbench-shell__main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, useSlots } from 'vue'

defineOptions({
  name: 'UiWorkbenchShell',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    asideWidth?: string | number
  }>(),
  {
    subtitle: '',
    asideWidth: 220,
  },
)

const slots = useSlots()

const normalizeCssSize = (value?: string | number) => {
  if (value === '' || value === undefined || value === null) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const hasAside = computed(() => !!slots.aside)

const layoutStyle = computed(() => ({
  '--ui-workbench-shell-aside-width': normalizeCssSize(props.asideWidth) || '220px',
}))
</script>

<style scoped>
.ui-workbench-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 100%;
  padding: 0;
  background: var(--ant-color-bg-container);
}

.ui-workbench-shell__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 4px;
  border: none;
  border-radius: 0;
  background: transparent;
}

.ui-workbench-shell__toolbar-main {
  min-width: 0;
  flex: 1;
}

.ui-workbench-shell__title {
  font-size: 18px;
  line-height: 1.4;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-workbench-shell__subtitle {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
}

.ui-workbench-shell__toolbar-actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ui-workbench-shell__layout {
  display: grid;
  grid-template-columns: var(--ui-workbench-shell-aside-width) minmax(0, 1fr);
  gap: 12px;
  min-height: calc(100vh - 96px);
}

.ui-workbench-shell__layout--single {
  grid-template-columns: minmax(0, 1fr);
}

.ui-workbench-shell__aside,
.ui-workbench-shell__main {
  min-width: 0;
}

@media (max-width: 960px) {
  .ui-workbench-shell__layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
