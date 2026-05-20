<script lang="ts" setup>
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import theme from 'ant-design-vue/es/theme'
import { onBeforeUnmount, watch } from 'vue'
import { GlobalConfirmDialog } from '@/components/workbench'
import { useAppStore, useUserStore } from '@/stores'
import { useNotificationStore } from '@/stores/modules/notification'

defineOptions({ name: 'App' })
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

const themeConfig = {
  cssVar: true,
  token: {
    borderRadius: 8,
    fontSize: 14,
    colorPrimary: '#2563eb',
    colorBgLayout: '#f8fafc',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    boxShadow: '0 4px 24px rgba(15, 23, 42, 0.02), 0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  components: {
    Card: {
      paddingLG: 24,
    },
    Table: {
      colorBorderSecondary: 'transparent',
      borderRadiusLG: 8,
    }
  },
  algorithm: theme.defaultAlgorithm,
}

const getWatermarkContent = () => {
  const userInfo = userStore?.userInfo
  if (!userInfo) return ''
  const username = userInfo.userName || ''
  if (username) return `${userInfo.nickName}(${username})`
  return userInfo.nickName
}

appStore?.initSiteConfig?.()
</script>

<template>
  <a-config-provider :theme="themeConfig" :locale="zhCN">
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
