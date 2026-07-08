<template>
  <div
    class="ui-table-wrap"
    :class="[
      `ui-table-wrap--${props.size}`,
      {
        'ui-table-wrap--striped': props.striped,
        'ui-table-wrap--hoverable': props.hoverable,
      },
    ]"
  >
    <table class="ui-table" v-bind="$attrs">
      <slot />
    </table>
  </div>
</template>

<script lang="ts" setup>
import type { UiComponentSize } from './types'

defineOptions({ name: 'UiTable' })

const props = withDefaults(
  defineProps<{
    size?: UiComponentSize
    striped?: boolean
    hoverable?: boolean
  }>(),
  {
    size: 'md',
    striped: false,
    hoverable: true,
  },
)
</script>

<style>
.ui-table-wrap {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.ui-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;
  color: var(--dp-text-primary);
}

.ui-table__header th {
  position: relative;
  padding: 14px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  color: var(--dp-text-secondary);
  white-space: nowrap;
  background: var(--dp-table-header-bg);
  border-bottom: 1px solid var(--dp-border);
}

.ui-table__header th:first-child {
  border-top-left-radius: var(--dp-radius-panel);
}

.ui-table__header th:last-child {
  border-top-right-radius: var(--dp-radius-panel);
}

.ui-table__body td {
  padding: 16px;
  border-bottom: 1px solid var(--dp-border);
  background: var(--dp-surface);
  vertical-align: middle;
}

.ui-table-wrap--sm .ui-table__header th,
.ui-table-wrap--sm .ui-table__body td {
  padding: 12px 14px;
}

.ui-table-wrap--lg .ui-table__header th,
.ui-table-wrap--lg .ui-table__body td {
  padding: 18px;
}

.ui-table-wrap--hoverable .ui-table__body .ui-table__row:hover td {
  background: rgba(239, 246, 255, 0.68);
}

.ui-table-wrap--striped .ui-table__body .ui-table__row:nth-child(even) td {
  background: rgba(248, 250, 252, 0.82);
}

.ui-table__body .ui-table__row:last-child td {
  border-bottom: none;
}
</style>
