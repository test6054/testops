<template>
  <a-sub-menu :key="subMenuKey" class="ui-sub-menu" v-bind="$attrs">
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.expandIcon" #expandIcon="slotProps">
      <slot name="expandIcon" v-bind="slotProps" />
    </template>
    <slot />
  </a-sub-menu>
</template>

<script lang="ts" setup>
import { getCurrentInstance } from 'vue'

defineOptions({ name: 'UiSubMenu', inheritAttrs: false })

/** 与 UiMenuItem 相同：转发外层 :key 到 a-sub-menu，保证 openKeys / 展开态正确。 */
const rawKey = getCurrentInstance()?.vnode.key
const subMenuKey: PropertyKey | undefined = rawKey == null ? undefined : rawKey
</script>
