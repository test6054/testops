<template>
  <UiLayout :class="{ mobile: isMobile }" class="layout layout-default">
    <!-- 侧边栏：桌面端显示 -->
    <Asider v-if="!isMobile"></Asider>

    <UiLayout class="layout-default-right">
      <Header></Header>
      <PortfolioLayoutContext />
      <Main id="main-content" :class="{ 'with-tabbar': isMobile }"></Main>
    </UiLayout>

    <!-- 底部导航栏：移动端显示 -->
    <TabBar v-if="isMobile" />

    <!-- 公告弹窗 -->
    <NoticePopup ref="noticePopupRef" />
  </UiLayout>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import PortfolioLayoutContext from '@/components/portfolio/PortfolioLayoutContext.vue'
import UiLayout from '@/components/ui-guide/ui/UiLayout.vue'
import { useDevice } from '@/hooks'
import { getToken } from '@/utils/auth'
import NoticePopup from '@/views/user/message/components/NoticePopup.vue'

import Asider from './components/Asider/index.vue'
import Header from './components/Header/index.vue'
import Main from './components/Main.vue'
import TabBar from './components/TabBar/index.vue'

defineOptions({ name: 'LayoutDefault' })
const { isMobile } = useDevice()

// 公告弹窗引用
const noticePopupRef = ref<InstanceType<typeof NoticePopup>>()

// 检查并显示未读公告
const checkAndShowNotices = () => {
  const token = getToken()
  if (token) {
    setTimeout(() => {
      noticePopupRef.value?.open()
    }, 1000) // 延迟1秒显示，让页面先加载完成
  }
}

onMounted(() => {
  checkAndShowNotices()
})
</script>

<style lang="scss" scoped>
.layout {
  height: 100%;
  min-height: 0;
}

.layout-default {
  flex-direction: row;
  height: 100%;
  min-height: 0;
  align-items: stretch;

  :deep(> .ant-layout) {
    height: 100%;
    min-height: 0;
  }

  &-right {
    overflow: auto;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background: var(--dp-bg-container);
  }

  // 移动端适配
  &.mobile {
    .layout-default-right {
      width: 100%;
    }
  }
}

// Main区域移动端适配
:deep(.with-tabbar) {
  padding-bottom: 56px; // 为TabBar留出空间
}
</style>
