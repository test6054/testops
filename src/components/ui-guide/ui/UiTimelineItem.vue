<template>
  <a-timeline-item class="ui-timeline-item" v-bind="$attrs">
    <slot />
  </a-timeline-item>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiTimelineItem',
  inheritAttrs: false,
})
</script>
