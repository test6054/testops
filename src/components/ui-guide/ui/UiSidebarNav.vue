<template>
  <section class="ui-sidebar-nav" v-bind="$attrs">
    <header v-if="props.title" class="ui-sidebar-nav__head">
      <div class="ui-sidebar-nav__title">{{ props.title }}</div>
    </header>

    <div class="ui-sidebar-nav__list">
      <button
        v-for="item in props.items"
        :key="String(item.key)"
        type="button"
        class="ui-sidebar-nav__item"
        :class="{ 'ui-sidebar-nav__item--active': String(item.key) === String(props.activeKey) }"
        :disabled="item.disabled"
        :aria-current="String(item.key) === String(props.activeKey) ? 'page' : undefined"
        @click="handleSelect(item)"
      >
        <span class="ui-sidebar-nav__item-label">{{ item.label }}</span>
        <UiBadge
          v-if="item.badge"
          :tone="String(item.key) === String(props.activeKey) ? 'blue' : 'gray'"
          variant="soft"
          size="sm"
        >
          {{ item.badge }}
        </UiBadge>
      </button>
    </div>

    <footer v-if="$slots.footer" class="ui-sidebar-nav__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<script lang="ts" setup>
import UiBadge from './Badge.vue'

export interface UiSidebarNavItem {
  key: string | number
  label: string
  badge?: string
  disabled?: boolean
}

defineOptions({
  name: 'UiSidebarNav',
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    title?: string
    items?: UiSidebarNavItem[]
    activeKey?: string | number
  }>(),
  {
    title: '',
    items: () => [],
    activeKey: undefined,
  },
)

const emit = defineEmits<{
  (e: 'select', item: UiSidebarNavItem): void
}>()

const handleSelect = (item: UiSidebarNavItem) => {
  if (item.disabled) return

  emit('select', item)
}
</script>

<style scoped>
.ui-sidebar-nav {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.ui-sidebar-nav__head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--dp-border);
}

.ui-sidebar-nav__title {
  font-size: 14px;
  line-height: 1.5;
  font-weight: 800;
  color: var(--dp-text-primary);
}

.ui-sidebar-nav__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

.ui-sidebar-nav__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--dp-radius-panel);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.ui-sidebar-nav__item:hover:not(:disabled) {
  background: var(--dp-gray-50);
}

.ui-sidebar-nav__item--active {
  border-color: var(--dp-blue-200);
  background: var(--dp-blue-50);
}

.ui-sidebar-nav__item:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.ui-sidebar-nav__item-label {
  min-width: 0;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.ui-sidebar-nav__footer {
  margin-top: auto;
  padding: 12px;
  border-top: 1px solid var(--dp-border);
}
</style>
