<template>
  <UiLayoutHeader class="header">
    <section v-if="isMobile" class="fold-btn-wrapper">
      <MenuFoldBtn></MenuFoldBtn>
    </section>
    <UiFlex align="center" class="h-full header-right">
      <div class="header-brand" aria-hidden="true">
        <!-- 页标题由 ContextBar 承载；顶栏仅保留右侧通知/用户操作，避免与侧栏重复面包屑 -->
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
    margin-left: var(--dp-space-block);
  }

  .header-brand {
    flex: 1;
    min-width: 0;
  }

  .header-right-bar-wrapper {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-shrink: 0;
  }
}

.ant-layout-header {
  padding: 0 var(--dp-space-block);
  height: var(--dp-shell-header-height);
  line-height: var(--dp-shell-header-height);
  background: var(--dp-surface);
  border-bottom: 1px solid var(--dp-border);
  box-shadow: none;

  // 移动端适配
  @media (max-width: bp.$layout-mobile-max) {
    padding: 0 var(--dp-space-component);
    height: var(--dp-shell-header-height);
    line-height: var(--dp-shell-header-height);
    background: var(--dp-surface);

    .fold-btn-wrapper {
      display: none; // 移动端隐藏折叠按钮
    }

    .header-right {
      margin-left: var(--dp-space-component-tight);
    }
  }
}
</style>
