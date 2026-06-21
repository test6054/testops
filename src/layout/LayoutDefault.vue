<template>
  <a-layout :class="{ mobile: isMobile }" class="layout layout-default">
    <!-- 无障碍：跳过导航链接 -->
    <a href="#main-content" class="skip-link">跳转到主要内容</a>

    <!-- 侧边栏：桌面端显示 -->
    <Asider v-if="!isMobile"></Asider>

    <a-layout class="layout-default-right">
      <Header></Header>
      <QualityLayoutContext />
      <AiTaskRunningBar />
      <Main id="main-content" :class="{ 'with-tabbar': isMobile }"></Main>
      <!-- <GiFooter v-if="appStore.copyrightDisplay && !isMobile" /> -->
    </a-layout>

    <!-- 底部导航栏：移动端显示 -->
    <TabBar v-if="isMobile" />

    <!-- 公告弹窗 -->
    <NoticePopup ref="noticePopupRef" />
  </a-layout>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useDevice } from '@/hooks'
import { getToken } from '@/utils/auth'
import NoticePopup from '@/views/user/message/components/NoticePopup.vue'
import AiTaskRunningBar from './components/AiTaskRunningBar.vue'
import QualityLayoutContext from '@/components/quality/QualityLayoutContext.vue'

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
// 无障碍：跳过导航链接
.skip-link {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: var(--dp-space-3) var(--dp-space-5);
  background-color: var(--ant-color-primary);
  color: var(--ant-color-white);
  font-size: var(--dp-font-size-md);
  font-weight: 600;
  border-radius: var(--dp-radius-md);
  text-decoration: none;
  transition: top var(--dp-duration-fast) ease;

  &:focus {
    top: var(--dp-space-4);
    outline: 2px solid var(--ant-color-primary-border);
    outline-offset: 2px;
  }
}

.layout {
  height: 100%;
}

.layout-default {
  flex-direction: row;

  &-right {
    overflow: auto;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    background: var(--ant-color-bg-container);
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
