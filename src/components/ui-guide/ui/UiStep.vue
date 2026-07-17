<template>
  <a-step class="ui-step" v-bind="$attrs">
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.description" #description>
      <slot name="description" />
    </template>
    <slot />
  </a-step>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiStep',
  inheritAttrs: false,
})
</script>
