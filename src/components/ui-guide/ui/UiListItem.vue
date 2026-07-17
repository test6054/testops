<template>
  <a-list-item class="ui-list-item" v-bind="$attrs">
    <template v-if="$slots.actions" #actions>
      <slot name="actions" />
    </template>
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>
    <slot />
  </a-list-item>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiListItem',
  inheritAttrs: false,
})
</script>
