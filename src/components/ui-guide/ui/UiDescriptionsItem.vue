<template>
  <a-descriptions-item class="ui-descriptions-item" v-bind="$attrs">
    <template v-if="$slots.label" #label>
      <slot name="label" />
    </template>
    <slot />
  </a-descriptions-item>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiDescriptionsItem',
  inheritAttrs: false,
})
</script>
