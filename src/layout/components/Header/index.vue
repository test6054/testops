<template>
  <UiLayoutHeader class="header">
    <section v-if="isMobile" class="fold-btn-wrapper">
      <MenuFoldBtn></MenuFoldBtn>
    </section>
    <UiFlex align="center" class="h-full header-right">
      <div class="header-breadcrumb">
        <Breadcrumb></Breadcrumb>
      </div>
      <div class="header-right-bar-wrapper">
        <HeaderRightBar></HeaderRightBar>
      </div>
    </UiFlex>
  </UiLayoutHeader>
</template>

<script lang="ts" setup>
import UiFlex from '@/components/ui-guide/ui/UiFlex.vue'
import UiLayoutHeader from '@/components/ui-guide/ui/UiLayoutHeader.vue'
import { useDevice } from '@/hooks'
import Breadcrumb from '../Breadcrumb/index.vue'
import HeaderRightBar from '../HeaderRightBar/index.vue'
import MenuFoldBtn from '../MenuFoldBtn.vue'

defineOptions({ name: 'LayoutHeader' })
const { isMobile } = useDevice()
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.header {
  display: flex;
  align-items: center;

  .header-right {
    flex: 1;
    overflow: hidden;
    margin-left: var(--dp-space-4);
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
  padding: 0 var(--dp-space-5);
  height: 60px;
  background: color-mix(in srgb, var(--dp-surface) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--dp-border-subtle);
  box-shadow: none;

  // 移动端适配
  @media (max-width: bp.$layout-mobile-max) {
    padding: 0 12px;
    height: 48px;
    backdrop-filter: none;
    background: var(--dp-surface);

    .fold-btn-wrapper {
      display: none; // 移动端隐藏折叠按钮
    }

    .header-right {
      margin-left: 8px;
    }
  }
}
</style>
