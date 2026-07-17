<template>
  <a-table-summary-row class="ui-table-summary-row" v-bind="$attrs">
    <slot />
  </a-table-summary-row>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiTableSummaryRow', inheritAttrs: false })
</script>
