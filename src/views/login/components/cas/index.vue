<template>
  <div class="cas-login-container">
    <!-- 回调处理中 -->
    <UiStateBlock
      v-if="isProcessingCallback"
      state="loading"
      title="正在验证统一认证登录..."
      compact
    />

    <!-- 正常显示登录入口 -->
    <div v-else class="cas-login-content">
      <div class="cas-description">
        <div class="cas-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            width="56"
            height="56"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h3>{{ displayName }}</h3>
        <p>使用学校统一身份认证系统登录</p>
      </div>

      <UiButton variant="primary" size="lg" block :loading="loading" @click="handleCasLogin">
        {{ loading ? '正在跳转...' : `${displayName}登录` }}
      </UiButton>

      <div class="cas-tips">
        <p>点击按钮后将跳转到学校统一认证页面</p>
        <p>使用学校账号完成登录后自动返回</p>
        <p>首次登录若信息不足，会进入补录后继续登录</p>
      </div>
    </div>

    <!-- 登录失败提示 -->
    <div v-if="errorMessage" class="cas-error">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
      <span>{{ errorMessage }}</span>
      <button class="cas-error__close" @click="errorMessage = ''">×</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { casCallback, getCasLoginUrl, isCasProfileCompletionResponse } from '@/apis/sso'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import { getDefaultRoute } from '@/router/permission'
import { useAuthStore, useUserStore } from '@/stores'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { shouldEnforcePasswordChange } from '@/utils/password-change-enforcement'

defineOptions({ name: 'CasLogin' })

// Props
const props = defineProps<{
  /** 租户ID */
  tenantId: string
  /** 显示名称（如"统一认证"） */
  displayName?: string
}>()

// Emits
const emit = defineEmits<{
  /** 登录成功事件 */
  (e: 'login-success'): void
  /** 登录失败事件 */
  (e: 'login-error', error: string): void
}>()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()

// 响应式状态
const loading = ref(false)
const isProcessingCallback = ref(false)
const errorMessage = ref('')
// 使用 computed 保证响应式
const displayName = computed(() => props.displayName || '统一认证')

/**
 * 发起CAS登录
 * 获取CAS登录URL并跳转到CAS服务器
 */
const handleCasLogin = async () => {
  if (!props.tenantId) {
    message.error('请先选择学校')
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    // 获取CAS登录URL并跳转
    window.location.href = await getCasLoginUrl(props.tenantId)
  } catch (error: unknown) {
    const msg = getUserErrorMessage(error, '获取统一认证登录地址失败，请稍后重试')
    errorMessage.value = msg
    showUserError(error, '获取统一认证登录地址失败，请稍后重试')
    emit('login-error', msg)
  } finally {
    loading.value = false
  }
}

/**
 * 处理CAS回调
 * 从URL中提取ticket，调用后端验证并完成登录
 */
const handleCasCallback = async (ticket: string, tenantId: string) => {
  isProcessingCallback.value = true
  errorMessage.value = ''

  try {
    // 调用后端验证ticket
    const result = await casCallback(ticket, tenantId)

    // 清理URL中的ticket参数
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('ticket')
    cleanUrl.searchParams.delete('from')
    cleanUrl.searchParams.delete('tenantId')
    window.history.replaceState({}, '', cleanUrl.pathname)

    if (isCasProfileCompletionResponse(result)) {
      await router.push({
        path: '/cas-first-login-completion',
        query: {
          completionToken: result.completionToken,
        },
      })
      return
    }

    // 使用 authStore 方法设置登录状态
    authStore.setTokenWithExpiry(result.accessToken, result.expiresIn)
    if (result.refreshToken) {
      authStore.setRefreshToken(result.refreshToken)
    }

    // 登录成功后强制刷新完整用户信息，确保当前登录来源等安全态字段为最新值
    await userStore.getInfo(true)

    // 设置租户信息
    if (result.tenantInfo) {
      userStore.userInfo.tenantId = result.tenantInfo.id
      userStore.userInfo.tenantName = result.tenantInfo.tenantName
    }

    // 检查是否需要强制修改密码
    if (shouldEnforcePasswordChange(userStore.userInfo)) {
      message.warning('出于安全考虑，您需要修改密码后才能继续使用系统')
      await router.push('/change-password')
      return
    }

    await router.push(getDefaultRoute(authStore.userRole))
    message.success('统一认证登录成功')
    emit('login-success')
  } catch (error: unknown) {
    const msg = getUserErrorMessage(error, '统一认证登录失败，请重试')
    errorMessage.value = msg
    showUserError(error, '统一认证登录失败，请重试')
    emit('login-error', msg)
  } finally {
    isProcessingCallback.value = false
  }
}

/**
 * 检查URL中是否有CAS回调参数
 */
const checkCasCallback = () => {
  const ticket = queryString(route.query.ticket)
  const from = queryString(route.query.from)
  const tenantId = queryString(route.query.tenantId) || props.tenantId

  // 检测是否为CAS回调
  if (ticket && (from === 'cas' || tenantId)) {
    handleCasCallback(ticket, tenantId)
    return true
  }
  return false
}

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

// 组件挂载时检查回调
onMounted(() => {
  checkCasCallback()
})

// 暴露方法给父组件使用
defineExpose({
  handleCasLogin,
  handleCasCallback,
  checkCasCallback,
})
</script>

<style lang="scss" scoped>
.cas-login-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 240px;
  justify-content: center;
}

.cas-login-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.cas-description {
  text-align: center;

  .cas-icon {
    margin-bottom: 12px;
    color: var(--dp-blue-600);
    opacity: 0.85;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--dp-text-primary);
    margin: 0 0 4px;
  }

  p {
    color: var(--dp-text-muted);
    font-size: 14px;
    margin: 0;
  }
}

.cas-tips {
  width: 100%;
  padding: 14px 18px;
  background: var(--dp-gray-50);
  border-radius: var(--dp-radius-control);

  p {
    margin: 4px 0;
    font-size: 13px;
    color: var(--dp-text-muted);
    line-height: 1.6;
  }
}

.cas-error {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: var(--dp-red-50);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--dp-radius-control);
  color: var(--dp-red-500);
  font-size: 13px;

  svg {
    flex-shrink: 0;
  }

  span {
    flex: 1;
  }
}

.cas-error__close {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }
}
</style>
