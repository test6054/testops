<template>
  <a-upload class="ui-upload" v-bind="$attrs">
    <template v-if="$slots.default" #default>
      <slot />
    </template>
    <template v-if="$slots.itemRender" #itemRender="slotProps">
      <slot name="itemRender" v-bind="slotProps" />
    </template>
    <template v-if="$slots.iconRender" #iconRender="slotProps">
      <slot name="iconRender" v-bind="slotProps" />
    </template>
    <slot />
  </a-upload>
</template>

<script lang="ts" setup>
defineOptions({ name: 'UiUpload', inheritAttrs: false })
</script>
