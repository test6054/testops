<template>
  <a-menu-item :key="menuItemKey" class="ui-menu-item" v-bind="$attrs">
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>
    <slot />
  </a-menu-item>
</template>

<script lang="ts" setup>
import { getCurrentInstance } from 'vue'

defineOptions({ name: 'UiMenuItem', inheritAttrs: false })

/**
 * Ant Design Vue Menu 用内层 a-menu-item 的 vnode.key 做选中/点击。
 * 外层组件上的 :key 不会进入 $attrs，必须转发，否则点击会 push 错误 path → 404。
 */
const rawKey = getCurrentInstance()?.vnode.key
const menuItemKey: PropertyKey | undefined = rawKey == null ? undefined : rawKey
</script>
