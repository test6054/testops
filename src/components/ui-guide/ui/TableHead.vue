<template>
  <th class="ui-table__head" v-bind="$attrs">
    <slot />
  </th>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiTableHead' })
</script>
