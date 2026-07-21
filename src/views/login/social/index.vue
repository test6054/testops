<template>
  <UiSpin :spinning="loading" :tip="isLogin() ? '绑定中...' : '登录中...'">
    <div></div>
  </UiSpin>
</template>

<script lang="ts" setup>
import message from 'ant-design-vue/es/message'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bindWechatAccount } from '@/apis/auth'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import { useAuthStore, useUserStore } from '@/stores'
import { isLogin } from '@/utils/auth'
import { getSafeRedirect } from '@/utils/redirect-validator'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const source = queryString(route.query.source)
const loading = ref(false)

// 三方账号登录
const handleSocialLogin = () => {
  if (loading.value) return
  loading.value = true
  const { redirect, ...othersQuery } = router.currentRoute.value.query
  authStore
    .socialLogin(source, othersQuery)
    .then(() => {
      const safePath = getSafeRedirect(queryString(redirect), '/')
      router.push({
        path: safePath,
        query: {
          ...othersQuery,
        },
      })
      void message.success('欢迎使用')
    })
    .catch(() => {
      router.push({
        name: 'Login',
        query: {
          ...othersQuery,
        },
      })
    })
    .finally(() => {
      loading.value = false
    })
}

// 绑定三方账号（用户已登录状态，使用当前会话的认证信息绑定）
const handleBindSocial = () => {
  if (loading.value) return
  loading.value = true
  const { ...othersQuery } = router.currentRoute.value.query

  // 已登录用户绑定三方账号，使用 state 参数关联微信授权回调
  const bindData = {
    state: queryString(othersQuery.state),
  }

  bindWechatAccount(bindData)
    .then(() => {
      router.push({
        path: '/user/profile',
      })
      void message.success('绑定成功')
    })
    .catch(() => {
      router.push({
        path: '/user/profile',
      })
    })
    .finally(() => {
      loading.value = false
    })
}

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

if (isLogin()) {
  handleBindSocial()
} else {
  handleSocialLogin()
}
</script>

<style lang="scss" scoped>
:deep(.ant-spin-blur) {
  background-color: transparent;
}

div {
  width: 150px;
  height: 150px;
  position: absolute;
  left: 50%;
  top: 45%;
  margin-left: -50px;
}
</style>
