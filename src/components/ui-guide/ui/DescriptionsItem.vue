<template>
  <a-descriptions-item :label="props.label" :span="props.span">
    <slot />
  </a-descriptions-item>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiDescriptionsItem',
})

const props = withDefaults(defineProps<{
  label: string
  span?: number
}>(), {
  span: 1,
})
</script>
