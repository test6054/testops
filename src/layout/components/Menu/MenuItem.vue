<template>
  <template v-if="isRenderableMenuNode">
    <a-menu-item v-if="shouldShowAsMenuItem" :key="menuItemKey">
      <template #icon>
        <MenuCollapsedTooltip :collapsed="menuCollapsed" :label="menuItemTitle ?? ''">
          <MenuIcon :icon="menuItemIcon" />
        </MenuCollapsedTooltip>
      </template>
      <span>{{ menuItemTitle }}</span>
    </a-menu-item>

    <a-sub-menu v-else :key="item.path">
      <template #title>{{ item?.meta?.title }}</template>
      <template #icon>
        <MenuCollapsedTooltip :collapsed="menuCollapsed" :label="String(item?.meta?.title ?? '')">
          <MenuIcon :icon="subMenuIcon" />
        </MenuCollapsedTooltip>
      </template>
      <MenuItem v-for="child in visibleChildren" :key="child.path" :item="child" />
    </a-sub-menu>
  </template>
</template>

<script lang="ts" setup>
import type { RouteRecordRaw } from 'vue-router'
import { computed } from 'vue'
import { useDevice } from '@/hooks'
import { useAppStore } from '@/stores'
import MenuCollapsedTooltip from './MenuCollapsedTooltip.vue'
import MenuIcon from './MenuIcon.vue'

defineOptions({ name: 'MenuItem' })
const props = withDefaults(defineProps<Props>(), {})

interface Props {
  item: RouteRecordRaw
}

const { isDesktop } = useDevice()
const appStore = useAppStore()
const menuCollapsed = computed(() => isDesktop.value && appStore.menuCollapse)

function isVisibleMenuChild(route: RouteRecordRaw): boolean {
  return !route.meta?.hideInMenu && !(route.redirect && !route.component && !route.components)
}

// 如果hideInMenu: false那么代表这个路由项显示在左侧菜单栏中
// 如果props.item的子项children只有一个hideInMenu: false的子元素, 那么onlyOneChild就表示这个子元素

// 计算可见的子路由
const visibleChildren = computed((): RouteRecordRaw[] => {
  const children = props.item.children
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
    onlyChild = {
      ...props.item,
      meta: { ...props.item.meta, noShowingChildren: true },
    }
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

const menuItemDisabled = computed(() => {
  const target = menuData.value.onlyOneChild ?? props.item
  return !!target.meta?.disabled
})

// 菜单项的图标
const menuItemIcon = computed(() => {
  return menuData.value.onlyOneChild?.meta?.icon || props.item?.meta?.icon
})

// 菜单项的标题
const menuItemTitle = computed(() => {
  const target = menuData.value.onlyOneChild ?? props.item
  const title = target.meta?.title
  if (typeof title !== 'string') {
    return title
  }
  if (target.meta?.qualityGateBlocked) {
    return `${title} · 待确认`
  }
  return title
})

// 子菜单的图标
const subMenuIcon = computed(() => {
  return props.item?.meta?.icon
})
</script>
