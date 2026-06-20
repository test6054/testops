<template>
  <template v-if="isRenderableMenuNode">
    <a-menu-item v-if="shouldShowAsMenuItem" :key="menuItemKey">
      <template #icon>
        <MenuIcon :icon="menuItemIcon" />
      </template>
      <span>{{ menuItemTitle }}</span>
    </a-menu-item>

    <a-sub-menu v-else :key="item.path">
      <template #title>{{ item?.meta?.title }}</template>
      <template #icon>
        <MenuIcon :icon="subMenuIcon" />
      </template>
      <MenuItem v-for="child in visibleChildren" :key="child.path" :item="child" />
    </a-sub-menu>
  </template>
</template>

<script lang="ts" setup>
import type { RouteRecordRaw } from 'vue-router'
import { computed } from 'vue'
import MenuIcon from './MenuIcon.vue'

defineOptions({ name: 'MenuItem' })
const props = withDefaults(defineProps<Props>(), {})

interface Props {
  item: RouteRecordRaw
}

function isVisibleMenuChild(route: RouteRecordRaw): boolean {
  return !route.meta?.hideInMenu && !(route.redirect && !route.component && !route.components)
}

// 如果hideInMenu: false那么代表这个路由项显示在左侧菜单栏中
// 如果props.item的子项children只有一个hideInMenu: false的子元素, 那么onlyOneChild就表示这个子元素

// 计算可见的子路由
const visibleChildren = computed((): RouteRecordRaw[] => {
  const children = props.item.children as RouteRecordRaw[] | undefined
  if (!children) return []
  return children.filter(isVisibleMenuChild)
})

// 计算菜单数据
const menuData = computed(() => {
  const children = visibleChildren.value

  let onlyChild: RouteRecordRaw | null = null
  let isOneShowing = false

  if (children.length === 1) {
    // 只有一个子路由时，显示该子路由
    onlyChild = children[0]
    isOneShowing = true
  } else if (children.length === 0) {
    // 没有子路由时，显示父路由
    onlyChild = {
      ...props.item,
      meta: { ...props.item.meta, noShowingChildren: true },
    } as RouteRecordRaw
    isOneShowing = true
  }

  return {
    onlyOneChild: onlyChild,
    isOneShowingChild: isOneShowing,
  }
})

// 是否应该显示为菜单项（而不是子菜单）
const shouldShowAsMenuItem = computed(() => {
  return (
    menuData.value.isOneShowingChild
    && (!menuData.value.onlyOneChild?.children
      || menuData.value.onlyOneChild?.meta?.noShowingChildren)
    && !props.item?.meta?.alwaysShow
  )
})

const isRenderableMenuNode = computed(() => {
  if (props.item.meta?.hideInMenu) {
    return false
  }
  if (shouldShowAsMenuItem.value) {
    return !!menuItemTitle.value
  }
  return !!props.item.meta?.title || visibleChildren.value.length > 0
})

// 菜单项的key
const menuItemKey = computed(() => {
  return menuData.value.onlyOneChild?.path || props.item.path
})

// 菜单项的图标
const menuItemIcon = computed(() => {
  return menuData.value.onlyOneChild?.meta?.icon || props.item?.meta?.icon
})

// 菜单项的标题
const menuItemTitle = computed(() => {
  return menuData.value.onlyOneChild?.meta?.title
})

// 子菜单的图标
const subMenuIcon = computed(() => {
  return props.item?.meta?.icon
})
</script>
