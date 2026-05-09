<template>
  <nav class="ui-breadcrumbs" aria-label="Breadcrumb" v-bind="$attrs">
    <ol class="ui-breadcrumbs__list">
      <li
        v-for="(item, index) in props.items"
        :key="item.key || item.path || item.href || `${item.label}-${index}`"
        class="ui-breadcrumbs__item"
      >
        <button
          v-if="isClickable(item, index)"
          type="button"
          class="ui-breadcrumbs__link ui-breadcrumbs__link--action"
          :disabled="item.disabled"
          @click="handleNavigate(item, index)"
        >
          {{ item.label }}
        </button>
        <span v-else class="ui-breadcrumbs__link ui-breadcrumbs__link--current">
          {{ item.label }}
        </span>

        <RightOutlined
          v-if="index < props.items.length - 1"
          class="ui-breadcrumbs__separator"
        />
      </li>
    </ol>
  </nav>
</template>

<script lang="ts" setup>
import type { UiBreadcrumbItem } from './types'
import { RightOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

defineOptions({
  name: 'UiBreadcrumbs',
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  items?: UiBreadcrumbItem[]
  clickableLast?: boolean
}>(), {
  items: () => [],
  clickableLast: false,
})

const emit = defineEmits<{
  (e: 'navigate', payload: { item: UiBreadcrumbItem, index: number }): void
}>()

const router = useRouter()

const isClickable = (item: UiBreadcrumbItem, index: number) => {
  if (item.disabled)
    return false
  if (!props.clickableLast && index === props.items.length - 1)
    return false
  return !!item.path || !!item.href
}

const handleNavigate = (item: UiBreadcrumbItem, index: number) => {
  emit('navigate', { item, index })

  if (item.href) {
    window.open(item.href, '_blank', 'noopener')
    return
  }

  if (item.path)
    router.push(item.path)
}
</script>

<style scoped>
.ui-breadcrumbs {
  width: 100%;
}

.ui-breadcrumbs__list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ui-breadcrumbs__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ui-breadcrumbs__link {
  min-width: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary, #475569);
  white-space: nowrap;
}

.ui-breadcrumbs__link--action {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: color 0.2s ease;
}

.ui-breadcrumbs__link--action:hover {
  color: var(--dp-blue-700, #1d4ed8);
}

.ui-breadcrumbs__link--current {
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
}

.ui-breadcrumbs__separator {
  font-size: 11px;
  color: var(--dp-text-muted, #94a3b8);
}
</style>
