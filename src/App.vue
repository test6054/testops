<script lang="ts" setup>
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import theme from 'ant-design-vue/es/theme'
import { onBeforeUnmount, watch } from 'vue'
import { DP_FONT_FAMILY_SANS } from '@/constants/typography'
import { GlobalConfirmDialog } from '@/components/workbench'
import { useAppStore, useUserStore } from '@/stores'
import { useNotificationStore } from '@/stores/modules/notification'

defineOptions({ name: 'App' })

/**
 * Ant Design Vue 全局主题配置
 *
 * 提到模块顶层常量：避免每次 setup 都重新构造对象，去掉响应式无意义开销。
 * 主题色升级时仅改这一处即可（首屏 FOUC 兜底见 src/styles/ui-tokens.scss）。
 */
const THEME_CONFIG = Object.freeze({
  cssVar: true,
  token: Object.freeze({
    borderRadius: 6,
    fontSize: 14,
    fontFamily: DP_FONT_FAMILY_SANS,
  }),
  algorithm: theme.defaultAlgorithm,
})

const userStore = useUserStore()
const appStore = useAppStore()
const notificationStore = useNotificationStore()

// 登录后启动未读轮询；登出 / 会话失效 → 停止 + reset
watch(
  () => userStore?.userInfo?.userId,
  (userId, prevUserId) => {
    if (userId && !prevUserId) {
      notificationStore.startPolling()
    }
    else if (!userId && prevUserId) {
      notificationStore.reset()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  notificationStore.stopPolling()
})

const getWatermarkContent = () => {
  const userInfo = userStore?.userInfo
  if (!userInfo) return ''
  return `${userInfo.nickName}(${userInfo.userName})`
}

appStore?.initSiteConfig?.()
</script>

<template>
  <a-config-provider :theme="THEME_CONFIG" :locale="zhCN">
    <a-watermark
      v-if="appStore.watermarkEnabled"
      :content="getWatermarkContent()"
      :zindex="9999"
      class="admin-ui-main"
    >
      <router-view />
    </a-watermark>
    <router-view v-else />
    <GlobalConfirmDialog />
  </a-config-provider>
</template>

<style lang="scss" scoped>
.admin-ui-main {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}
</style>
