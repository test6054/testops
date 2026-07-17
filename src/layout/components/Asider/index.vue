<template>
  <aside
    v-if="isDesktop"
    :class="{ 'app-menu-dark': appStore.menuDark, 'collapsed': appStore.menuCollapse }"
    :style="appStore.menuDark ? appStore.themeCSSVar : undefined"
    class="asider"
  >
    <Logo :collapsed="appStore.menuCollapse"></Logo>
    <div class="menu-scroll-view">
      <Menu></Menu>
    </div>
    <div class="menu-toggle-wrap">
      <MenuFoldBtn />
    </div>
  </aside>
</template>

<script lang="ts" setup>
import { useDevice } from '@/hooks'
import { useAppStore } from '@/stores'

import Logo from '../Logo.vue'
import Menu from '../Menu/index.vue'
import MenuFoldBtn from '../MenuFoldBtn.vue'

defineOptions({ name: 'Asider' })
const appStore = useAppStore()
const { isDesktop } = useDevice()
</script>

<style lang="scss" scoped>
// 折叠状态下的菜单项布局：图标居中、隐藏文字
:deep(.ant-menu-inline-collapsed) {
  .ant-menu-item-icon {
    margin-right: 0;
    padding: 0;
  }

  > .ant-menu-item,
  > .ant-menu-submenu > .ant-menu-submenu-title {
    padding-inline: 0 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .ant-menu-title-content {
    display: none !important;
  }

  .ant-menu-item-icon,
  .ant-menu-submenu-title .ant-menu-item-icon {
    margin-inline-end: 0 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    min-width: 16px;
    line-height: 1;
  }
}

.asider {
  z-index: 1000;
  width: 230px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  position: relative;
  border-right: 1px solid var(--dp-border-subtle);
  box-sizing: border-box;
  color: var(--dp-text);
  background-color: var(--dp-bg-container);
  transition: width 0.2s ease;

  &.collapsed {
    width: 80px;
  }

  .menu-scroll-view {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 56px;
    background-color: inherit;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: var(--dp-radius-xs);
      background-color: var(--dp-border-subtle);
    }

    &::-webkit-scrollbar-track {
      background-color: transparent;
    }
  }

  .menu-toggle-wrap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 56px;
    border-top: 1px solid var(--dp-border-subtle);
    background-color: inherit;
  }
}
</style>
