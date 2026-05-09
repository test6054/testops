<template>
  <td class="ui-table__cell" v-bind="$attrs">
    <slot />
  </td>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiTableCell' })
</script>
