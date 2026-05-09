<template>
  <thead class="ui-table__header" v-bind="$attrs">
    <slot />
  </thead>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiTableHeader' })
</script>
