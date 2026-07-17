<template>
  <div
    v-if="resolvedItems.length"
    class="ui-table-actions"
    :class="[`ui-table-actions--${props.align}`, { 'ui-table-actions--split': props.split }]"
    @click.stop
  >
    <template v-for="(item, index) in visibleItems" :key="item.key">
      <span v-if="props.split && index > 0" class="ui-table-actions__sep" aria-hidden="true" />
      <UiTextAction
        size="table"
        :tone="item.tone ?? 'default'"
        :disabled="item.disabled"
        @click="emitAction(item.key)"
      >
        {{ item.label }}
      </UiTextAction>
    </template>
    <template v-if="overflowItems.length">
      <span
        v-if="visibleItems.length && props.split"
        class="ui-table-actions__sep"
        aria-hidden="true"
      />
      <UiDropdownAction
        trigger-style="table"
        :items="overflowDropdownItems"
        button-text="更多"
        @select="emitAction"
      />
    </template>
  </div>
</template>

<script lang="ts" setup>
import type { UiDropdownActionItem, UiTableRowActionItem } from './types'
import { computed } from 'vue'
import UiDropdownAction from './UiDropdownAction.vue'
import UiTextAction from './UiTextAction.vue'

defineOptions({
  name: 'UiTableActions',
})

const props = withDefaults(
  defineProps<{
    /** 行内操作项；超出 maxVisible 的项收入「更多」，「更多」占 1 个展示位 */
    items: UiTableRowActionItem[]
    maxVisible?: number
    align?: 'start' | 'center' | 'end'
    split?: boolean
  }>(),
  {
    maxVisible: 3,
    align: 'center',
    split: true,
  },
)

const emit = defineEmits<{
  (e: 'action', key: string): void
}>()

const resolvedItems = computed(() => props.items.filter((item) => !item.hidden))

/** 有溢出时为「更多」预留 1 个展示位，保证行内最多 maxVisible 个控件 */
const visibleItems = computed(() => {
  const list = resolvedItems.value
  if (list.length <= props.maxVisible) {
    return list
  }
  return list.slice(0, props.maxVisible - 1)
})

const overflowItems = computed(() => {
  const list = resolvedItems.value
  if (list.length <= props.maxVisible) {
    return []
  }
  return list.slice(props.maxVisible - 1)
})

const overflowDropdownItems = computed<UiDropdownActionItem[]>(() =>
  overflowItems.value.map((item) => ({
    key: item.key,
    label: item.label,
    disabled: item.disabled,
    danger: item.tone === 'danger',
  })),
)

const emitAction = (key: string) => {
  emit('action', key)
}
</script>

<style scoped>
.ui-table-actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: var(--dp-space-2, 8px);
  max-width: 100%;
  white-space: nowrap;
}

.ui-table-actions--split {
  gap: 0;
}

.ui-table-actions--start {
  justify-content: flex-start;
}

.ui-table-actions--center {
  justify-content: center;
}

.ui-table-actions--end {
  justify-content: flex-end;
}

.ui-table-actions__sep {
  flex-shrink: 0;
  width: 1px;
  height: 12px;
  margin: 0;
  background: var(--dp-table-border, var(--dp-border-subtle));
}

.ui-table-actions :deep(.ui-text-action),
.ui-table-actions :deep(.ui-dropdown-action) {
  flex-shrink: 0;
}
</style>
