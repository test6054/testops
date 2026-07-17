<template>
  <a-list-item-meta class="ui-list-item-meta" v-bind="$attrs">
    <template v-if="$slots.avatar" #avatar>
      <slot name="avatar" />
    </template>
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.description" #description>
      <slot name="description" />
    </template>
    <slot />
  </a-list-item-meta>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiListItemMeta',
  inheritAttrs: false,
})
</script>
