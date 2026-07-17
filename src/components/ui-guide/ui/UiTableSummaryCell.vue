<template>
  <a-table-summary-cell class="ui-table-summary-cell" v-bind="$attrs">
    <slot />
  </a-table-summary-cell>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiTableSummaryCell', inheritAttrs: false })
</script>
