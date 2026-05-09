<template>
  <a-button
    class="gi_hover_btn menu-fold-btn"
    size="small"
    :aria-label="appStore.menuCollapse ? '展开菜单' : '收起菜单'"
    @click="onClick"
  >
    <template #icon>
      <MenuFoldOutlined v-if="!appStore.menuCollapse" />
      <MenuUnfoldOutlined v-else />
    </template>
  </a-button>

  <div
    :class="{ 'app-menu-dark': appStore.menuDark }"
    :style="appStore.menuDark ? appStore.themeCSSVar : undefined"
    class="drawer"
  >
    <a-drawer
      v-model:open="visible"
      :body-style="{
        'border-right': '1px solid var(--ant-color-border-secondary)',
        'box-sizing': 'border-box',
        'background-color': 'var(--ant-color-bg-container)',
      }"
      :footer="null"
      :header="false"
      :get-container="false"
      placement="left"
    >
      <Logo :collapsed="false"></Logo>
      <Menu class="menu w-full" @menu-item-click-after="visible = false"></Menu>
    </a-drawer>
  </div>
</template>

<script lang="ts" setup>
import MenuFoldOutlined from '@ant-design/icons-vue/MenuFoldOutlined'
import MenuUnfoldOutlined from '@ant-design/icons-vue/MenuUnfoldOutlined'
import { ref } from 'vue'
import { useDevice } from '@/hooks'
import Logo from '@/layout/components/Logo.vue'
import Menu from '@/layout/components/Menu/index.vue'
import { useAppStore } from '@/stores'

defineOptions({ name: 'MenuFoldBtn' })
const appStore = useAppStore()
const { isDesktop } = useDevice()
const visible = ref(false)

const onClick = () => {
  if (isDesktop.value) {
    appStore.setMenuCollapse(!appStore.menuCollapse)
  } else {
    visible.value = !visible.value
  }
}
</script>

<style lang="scss" scoped>
.menu-fold-btn {
  background-color: var(--ant-control-item-bg-hover) !important;
  flex-shrink: 0;
}

.drawer {
  .menu {
    flex: 1;
    overflow: hidden;
    background-color: inherit;
  }

  :deep(.ant-drawer-body) {
    padding: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}
</style>
