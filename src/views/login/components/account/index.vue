<template>
  <form class="account-form" @submit.prevent="handleLogin">
    <UiFormField v-if="tenantStore.needInputTenantCode" label="租户编码">
      <UiInput
        v-model="tenantCode"
        placeholder="请输入租户编码（不输入时为默认租户）"
        size="lg"
        clearable
      />
    </UiFormField>

    <UiFormField label="用户名" required :error="errors.username">
      <UiInput
        v-model="form.username"
        placeholder="请输入用户名"
        size="lg"
        clearable
        autocomplete="username"
        :status="errors.username ? 'error' : 'default'"
      />
    </UiFormField>

    <UiFormField label="密码" required :error="errors.password">
      <UiPasswordInput
        v-model="form.password"
        placeholder="请输入密码"
        size="lg"
        :status="errors.password ? 'error' : 'default'"
      />
    </UiFormField>

    <div class="remember-row">
      <UiCheckbox v-model="loginConfig.rememberMe">记住我</UiCheckbox>
      <RouterLink class="forgot-link" to="/forgot-password">忘记密码？</RouterLink>
    </div>

    <!-- 学号格式智能提示 -->
    <div v-if="showStudentHint" class="student-hint">
      <svg class="hint-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clip-rule="evenodd"
        />
      </svg>
      <span>检测到您输入的账号可能是学号，</span>
      <a @click="doSwitchToStudent">切换到学号登录</a>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="login-error">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <UiButton type="submit" variant="primary" size="lg" block :loading="loading">立即登录</UiButton>
  </form>

  <!-- AJ-Captcha 滑块验证码弹窗 -->
  <AjCaptcha
    v-model="showCaptcha"
    captcha-type="blockPuzzle"
    @success="onCaptchaSuccess"
    @fail="onCaptchaFail"
  />
</template>

<script lang="ts" setup>
import { useStorage } from '@vueuse/core'
import message from 'ant-design-vue/es/message'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getCaptchaConfig } from '@/apis/auth'
import AjCaptcha from '@/components/AjCaptcha/index.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiPasswordInput from '@/components/ui-guide/ui/PasswordInput.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiFormField from '@/components/ui-guide/ui/UiFormField.vue'
import { getDefaultRoute } from '@/router/permission'
import { useAuthStore, useTenantStore, useUserStore } from '@/stores'
import { ErrorType, getUserErrorMessage, standardizeError } from '@/utils/error-handler'
import {
  clearRememberedAccount,
  persistRememberedAccount,
  readLoginRememberConfig,
} from '@/utils/login-remember'
import { getSafeRedirect } from '@/utils/redirect-validator'

const emit = defineEmits(['switch-to-student'])
// 安全修复：仅持久化用户名，不存储密码
const loginConfig = useStorage('login-config', {
  rememberMe: true,
  username: '',
})
// 是否启用验证码
const isCaptchaEnabled = ref(false)
// 显示滑块验证码弹窗
const showCaptcha = ref(false)
// 验证码令牌
const captchaVerification = ref('')
const tenantCode = ref()
// 错误消息
const errorMessage = ref('')
const form = reactive({
  username: '',
  password: '',
})

watch(
  () => loginConfig.value.rememberMe,
  (rememberMe) => {
    if (!rememberMe) {
      clearRememberedAccount()
      loginConfig.value.username = ''
    }
  },
)
// 表单字段校验错误
const errors = reactive({
  username: '',
  password: '',
})

const tenantStore = useTenantStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const router = useRouter()
const loading = ref(false)

// 获取验证码配置
const fetchCaptchaConfig = async () => {
  try {
    const config = await getCaptchaConfig()
    isCaptchaEnabled.value = config.enabled
  } catch (error) {
    isCaptchaEnabled.value = false
  }
}

// 验证码验证成功回调
const onCaptchaSuccess = (verification: string) => {
  captchaVerification.value = verification
  // 验证码成功后继续登录流程
  doLogin()
}

// 验证码验证失败回调
const onCaptchaFail = () => {
  loading.value = false
}

// 实时检测是否可能是学号格式（非手机号，且包含数字的字母数字组合）
const showStudentHint = computed(() => {
  const username = form.username.trim()
  if (!username || username.length < 3) return false
  const hasDigit = /\d/.test(username)
  const isMobile = /^1[3-9]\d{9}$/.test(username)
  return hasDigit && !isMobile
})

function doSwitchToStudent() {
  emit('switch-to-student', { studentNo: form.username.trim(), password: form.password })
}

function validate(): boolean {
  errors.username = ''
  errors.password = ''
  let valid = true
  if (!form.username.trim()) {
    errors.username = '请输入用户名'
    valid = false
  }
  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  }
  return valid
}

const handleLogin = async () => {
  errorMessage.value = ''
  if (!validate()) return
  await startLoginProcess()
}

// 开始登录流程
const startLoginProcess = async () => {
  loading.value = true
  // 如果启用了验证码，先弹出滑块验证码
  if (isCaptchaEnabled.value) {
    showCaptcha.value = true
  } else {
    // 未启用验证码，直接登录
    await doLogin()
  }
}

// 执行登录
const doLogin = async () => {
  try {
    await authStore.accountLogin({
      username: form.username,
      password: form.password,
      captchaVerification: isCaptchaEnabled.value ? captchaVerification.value : undefined,
    })

    // 获取完整的用户信息（确保所有字段都正确加载）
    try {
      await userStore.getInfo()
    } catch (error) {
      errorMessage.value = '获取用户信息失败，请重试'
      return
    }

    // 确保登录状态已经完全更新和持久化（等待Pinia persist完成）
    await nextTick()

    // 验证登录状态是否正确
    if (!authStore.isAuthenticated || !userStore.userInfo.userId) {
      errorMessage.value = '登录状态异常，请重试'
      return
    }

    // 检查是否需要强制修改密码
    if (userStore.userInfo.forcePasswordChange) {
      message.warning('出于安全考虑，您需要修改密码后才能继续使用系统')
      await router.push('/change-password')
      return
    }

    if (loginConfig.value.rememberMe) {
      persistRememberedAccount(form.username.trim())
      loginConfig.value.username = form.username.trim()
    } else {
      clearRememberedAccount()
    }

    const { redirect, ...othersQuery } = router.currentRoute.value.query

    // 根据用户角色跳转到对应的默认页面（与 permission.ts getDefaultRoute 保持一致）
    const dashboardPath = getDefaultRoute(authStore.userRole)

    // 如果有重定向参数，优先使用重定向路径（校验安全性）
    const finalPath = getSafeRedirect(queryString(redirect), dashboardPath)

    await router.push({
      path: finalPath,
      query: {
        ...othersQuery,
      },
    })

    message.success('登录成功，欢迎使用')
  } catch (error: unknown) {
    const stdError = standardizeError(error)
    if (stdError.type === ErrorType.NETWORK) {
      errorMessage.value = '登录失败，请检查账户和密码后重试'
    } else {
      errorMessage.value = getUserErrorMessage(error, '登录失败，请检查账户和密码')
    }
    captchaVerification.value = ''
  } finally {
    loading.value = false
  }
}

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

onMounted(() => {
  const config = readLoginRememberConfig()
  loginConfig.value.rememberMe = config.rememberMe
  loginConfig.value.username = config.username
  if (config.rememberMe && config.username) {
    form.username = config.username
  }

  fetchCaptchaConfig()
})
</script>

<style lang="scss" scoped>
.account-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.remember-row {
  margin-top: -8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.forgot-link {
  flex-shrink: 0;
  color: var(--ant-color-primary);
  font-size: 13px;
  line-height: 1.5;
  text-decoration: none;

  &:hover {
    color: var(--ant-color-primary-hover, var(--ant-color-primary));
  }
}

.student-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: var(--dp-blue-50);
  border: 1px solid rgba(37, 99, 235, 0.15);
  border-radius: var(--dp-radius-control);
  color: var(--dp-text-secondary);
  font-size: 13px;
  line-height: 1.5;

  .hint-icon {
    flex-shrink: 0;
    color: var(--dp-blue-600);
  }

  a {
    color: var(--dp-blue-600);
    cursor: pointer;
    white-space: nowrap;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--dp-red-50);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--dp-radius-control);
  color: var(--dp-red-500);
  font-size: 13px;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
  }
}
</style>
