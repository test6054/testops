<template>
  <a-collapse-panel class="ui-collapse-panel" v-bind="$attrs">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="$slots.extra" #extra>
      <slot name="extra" />
    </template>
    <slot />
  </a-collapse-panel>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiCollapsePanel',
  inheritAttrs: false,
})
</script>
