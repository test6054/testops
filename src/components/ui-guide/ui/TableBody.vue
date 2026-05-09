<template>
  <tbody class="ui-table__body" v-bind="$attrs">
    <slot />
  </tbody>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiTableBody' })
</script>
