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

    <!-- 公告弹窗：登录后延迟挂载 -->
    <NoticePopup v-if="noticeHost" ref="noticePopupRef" />

    <!-- 全局命令面板 Cmd+K：打开时才挂载 -->
    <CommandPalette v-if="commandPaletteVisible" v-model:open="commandPaletteVisible" />
  </UiLayout>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, nextTick, onMounted, onUnmounted, ref } from 'vue'
import PortfolioLayoutContext from '@/components/portfolio/PortfolioLayoutContext.vue'
import UiLayout from '@/components/ui-guide/ui/UiLayout.vue'
import { useDevice } from '@/hooks'
import { getToken } from '@/utils/auth'
import { isShortcutBlockingTarget } from '@/utils/grading-keyboard'

import Asider from './components/Asider/index.vue'
import Header from './components/Header/index.vue'
import Main from './components/Main.vue'
import TabBar from './components/TabBar/index.vue'

defineOptions({ name: 'LayoutDefault' })
const { isMobile } = useDevice()

/** 公告 / 命令面板不进默认壳同步图：打开时再加载（AiEditor 仍由 NoticePopup 内部二次懒加载） */
const NoticePopup = defineAsyncComponent(
  () => import('@/views/user/message/components/NoticePopup.vue'),
)
const CommandPalette = defineAsyncComponent(() => import('./components/CommandPalette.vue'))

const commandPaletteVisible = ref(false)
const noticeHost = ref(false)
const noticePopupRef = ref<{ open: () => void } | null>(null)

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    commandPaletteVisible.value = !commandPaletteVisible.value
    return
  }
  // ?：打开快捷键帮助（输入态/可激活控件不抢）
  if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.isComposing) {
    if (isShortcutBlockingTarget(e.target)) {
      return
    }
    e.preventDefault()
    commandPaletteVisible.value = true
  }
}

/** 登录后延迟挂载公告弹窗并 open；等待 async 组件就绪，避免首屏同步拉 NoticePopup chunk。 */
async function checkAndShowNotices() {
  const token = getToken()
  if (!token) {
    return
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 1000)
  })
  noticeHost.value = true
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await nextTick()
    if (noticePopupRef.value?.open) {
      noticePopupRef.value.open()
      return
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50)
    })
  }
}

onMounted(() => {
  void checkAndShowNotices()
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown)
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
    /* 纯白壳画布：层次由发丝分割线 + 内容自描边承担 */
    background: var(--dp-surface);
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
  padding-bottom: calc(var(--dp-shell-tabbar-height) + env(safe-area-inset-bottom));
}
</style>
