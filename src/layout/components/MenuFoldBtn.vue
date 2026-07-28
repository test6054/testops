<template>
  <UiButton
    class="menu-fold-btn"
    size="sm"
    variant="ghost"
    icon-only
    :aria-label="appStore.menuCollapse ? '展开菜单' : '收起菜单'"
    @click="onClick"
  >
    <template #icon>
      <MenuFoldOutlined v-if="!appStore.menuCollapse" />
      <MenuUnfoldOutlined v-else />
    </template>
  </UiButton>

  <div class="drawer">
    <UiDrawer
      v-model:open="visible"
      :body-style="{
        'border-right': '1px solid var(--dp-border-subtle)',
        'box-sizing': 'border-box',
        'background-color': 'var(--dp-surface)',
      }"
      :footer="null"
      :header="false"
      :get-container="false"
      placement="left"
    >
      <Logo :collapsed="false"></Logo>
      <Menu class="menu w-full" @menu-item-click-after="visible = false"></Menu>
    </UiDrawer>
  </div>
</template>

<script lang="ts" setup>
import MenuFoldOutlined from '@ant-design/icons-vue/MenuFoldOutlined'
import MenuUnfoldOutlined from '@ant-design/icons-vue/MenuUnfoldOutlined'
import { ref } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
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
  border: 0 !important;
  background-color: var(--dp-fill-secondary) !important;
  flex-shrink: 0;

  &:hover {
    background: var(--dp-fill-secondary) !important;
    border-radius: var(--dp-radius-full);
  }

  &:active {
    background: var(--dp-fill-tertiary) !important;
    border-radius: var(--dp-radius-full);
  }
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
