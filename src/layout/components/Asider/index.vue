<template>
  <div
    v-if="isDesktop"
    :class="{ 'app-menu-dark': appStore.menuDark }"
    :style="appStore.menuDark ? appStore.themeCSSVar : undefined"
    class="asider"
  >
    <a-layout-sider :collapsed="appStore.menuCollapse" :width="230" breakpoint="xl" class="menu">
      <Logo :collapsed="appStore.menuCollapse"></Logo>
      <div class="menu-scroll-view">
        <Menu></Menu>
      </div>
      <div class="menu-toggle-wrap">
        <MenuFoldBtn />
      </div>
    </a-layout-sider>
  </div>
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
:deep(.ant-menu-inline-collapsed) {
  // Menu菜单组件修改
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
    display: none;
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

:deep(.ant-layout-sider-children) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--ant-color-bg-container) !important;
}

:deep(.ant-layout-sider) {
  background: var(--ant-color-bg-container) !important;
}

:deep(.ant-layout-sider-trigger) {
  display: none !important;
}

.asider {
  z-index: 1000;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--ant-color-border-secondary);
  box-sizing: border-box;
  color: var(--ant-color-text);
  background-color: var(--ant-color-bg-container);

  .menu-scroll-view {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 56px;
    background-color: inherit;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-thumb {
      border-radius: var(--dp-radius-xs);
      background-color: var(--ant-color-border-secondary);
    }

    &::-webkit-scrollbar-track {
      background-color: transparent;
    }
  }

  .menu {
    flex: 1;
    overflow: hidden;
    background-color: inherit;
    position: relative;
  }

  .menu-toggle-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 56px;
    padding: 0;
    border-top: 1px solid var(--ant-color-border-secondary);
    background-color: inherit;
  }
}
</style>
