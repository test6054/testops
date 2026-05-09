<template>
  <a-layout-header class="header">
    <section v-if="isMobile" class="fold-btn-wrapper">
      <MenuFoldBtn></MenuFoldBtn>
    </section>
    <a-flex align="center" class="h-full header-right">
      <div class="header-breadcrumb">
        <Breadcrumb></Breadcrumb>
      </div>
      <div class="header-right-bar-wrapper">
        <HeaderRightBar></HeaderRightBar>
      </div>
    </a-flex>
  </a-layout-header>
</template>

<script lang="ts" setup>
import { useDevice } from '@/hooks'
import Breadcrumb from '../Breadcrumb/index.vue'
import HeaderRightBar from '../HeaderRightBar/index.vue'
import MenuFoldBtn from '../MenuFoldBtn.vue'

defineOptions({name: 'LayoutHeader'})
const { isMobile } = useDevice()
</script>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;

  .header-right {
    flex: 1;
    overflow: hidden;
    margin-left: var(--ant-padding);
  }

  .header-breadcrumb {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .header-right-bar-wrapper {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-shrink: 0;
  }
}

.ant-layout-header {
  padding: 0 var(--ant-padding);
  height: 56px;
  background: var(--ant-color-bg-container);
  border-bottom: 1px solid var(--ant-color-border-secondary);

  // 🚀 移动端适配
  @media (max-width: 768px) {
    padding: 0 12px;
    height: 48px;

    .fold-btn-wrapper {
      display: none; // 移动端隐藏折叠按钮
    }

    .header-right {
      margin-left: 8px;
    }
  }
}
</style>
