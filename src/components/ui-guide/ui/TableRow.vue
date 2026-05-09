<template>
  <tr class="ui-table__row" v-bind="$attrs">
    <slot />
  </tr>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiTableRow' })
</script>
