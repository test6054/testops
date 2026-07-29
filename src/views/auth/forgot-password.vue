<template>
  <AuthLayout>
    <div class="forgot-header">
      <h2>重置密码</h2>
      <p>通过邮箱验证重置您的账户密码</p>
    </div>

    <!-- 步骤指示器（右侧面板内紧凑版） -->
    <div class="step-indicators">
      <div
        v-for="(step, idx) in stepLabels"
        :key="idx"
        class="step-dot"
        :class="{ 'step-dot--active': currentStep === idx, 'step-dot--done': currentStep > idx }"
      >
        <span class="step-dot__num">
          <CheckOutlined v-if="currentStep > idx" />
          <template v-else>{{ idx + 1 }}</template>
        </span>
        <span class="step-dot__label">{{ step }}</span>
      </div>
    </div>

    <p v-if="requestErrorMessage" class="request-error" role="alert" aria-live="polite">
      {{ requestErrorMessage }}
    </p>

    <!-- 步骤1：验证邮箱 -->
    <form v-if="currentStep === 0" class="step-form" @submit.prevent="handleIdentityVerify">
      <UiFormField label="邮箱地址" required :error="errors.email">
        <UiInput
          v-model="identityForm.email"
          placeholder="请输入注册时的邮箱地址"
          size="lg"
          clearable
          :maxlength="255"
          autocomplete="email"
          inputmode="email"
          :status="errors.email ? 'error' : 'default'"
        />
      </UiFormField>
      <UiButton type="submit" variant="primary" size="lg" block :loading="loading">
        发送验证码
      </UiButton>
    </form>

    <!-- 步骤2：验证码 -->
    <div v-if="currentStep === 1" class="step-form">
      <div class="verification-info">
        <SafetyCertificateOutlined class="verification-info__icon" />
        <p>验证码已发送至</p>
        <p class="contact-highlight">{{ maskEmail(identityForm.email) }}</p>
      </div>

      <form @submit.prevent="handleVerificationCode">
        <UiFormField label="验证码" required :error="errors.code">
          <UiInput
            v-model="verificationForm.code"
            placeholder="请输入6位验证码"
            size="lg"
            :maxlength="6"
            clearable
            inputmode="numeric"
            autocomplete="one-time-code"
            :status="errors.code ? 'error' : 'default'"
          />
        </UiFormField>
        <div class="verification-actions">
          <span class="countdown-text">{{
            countdown > 0 ? `${countdown}秒后可重新发送` : ''
          }}</span>
          <UiButton
            variant="ghost"
            size="sm"
            :loading="resending"
            :disabled="countdown > 0"
            @click="resendCode"
          >
            重新发送
          </UiButton>
        </div>
        <div class="step-buttons">
          <UiButton type="submit" variant="primary" size="lg" block :loading="loading">
            验证
          </UiButton>
          <UiButton size="lg" block @click="goToPreviousStep">上一步</UiButton>
        </div>
      </form>
    </div>

    <!-- 步骤3：重置密码 -->
    <form v-if="currentStep === 2" class="step-form" @submit.prevent="handleResetPassword">
      <UiFormField label="新密码" required :error="errors.newPassword">
        <UiPasswordInput
          v-model="passwordForm.newPassword"
          placeholder="请输入新密码"
          size="lg"
          autocomplete="new-password"
          :status="errors.newPassword ? 'error' : 'default'"
        />
      </UiFormField>
      <UiFormField label="确认密码" required :error="errors.confirmPassword">
        <UiPasswordInput
          v-model="passwordForm.confirmPassword"
          placeholder="请再次输入新密码"
          size="lg"
          autocomplete="new-password"
          :status="errors.confirmPassword ? 'error' : 'default'"
        />
      </UiFormField>

      <div class="password-strength">
        <span class="strength-label">密码强度</span>
        <div class="strength-bar">
          <div
            class="strength-fill"
            :class="`strength-${passwordStrength}`"
            :style="{
              transform: `scaleX(${Math.max(0, Math.min(1, passwordStrength / 5))})`,
            }"
          />
        </div>
        <span class="strength-text">{{ passwordStrengthText }}</span>
      </div>

      <div class="step-buttons">
        <UiButton type="submit" variant="primary" size="lg" block :loading="loading">
          重置密码
        </UiButton>
        <UiButton size="lg" block @click="goToPreviousStep">上一步</UiButton>
      </div>
    </form>

    <!-- 步骤4：完成 -->
    <div v-if="currentStep === 3" class="step-form">
      <div class="success-block">
        <CheckCircleFilled class="success-block__icon" />
        <h3>密码重置成功</h3>
        <p>您的密码已成功重置，请使用新密码登录。</p>
        <UiButton variant="primary" size="lg" block @click="goToLogin">立即登录</UiButton>
      </div>
    </div>

    <div class="forgot-footer">
      <span>想起密码了？</span>
      <router-link :to="loginLocation">返回登录</router-link>
    </div>
  </AuthLayout>
</template>

<script lang="ts" setup>
import CheckCircleFilled from '@ant-design/icons-vue/CheckCircleFilled'
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import SafetyCertificateOutlined from '@ant-design/icons-vue/SafetyCertificateOutlined'
import message from 'ant-design-vue/es/message'
import notification from 'ant-design-vue/es/notification'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { resetPassword, sendResetCode, verifyResetCode } from '@/apis/auth'
import AuthLayout from '@/components/AuthLayout/index.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiPasswordInput from '@/components/ui-guide/ui/PasswordInput.vue'
import UiFormField from '@/components/ui-guide/ui/UiFormField.vue'
import { getUserErrorMessage } from '@/utils/error-handler'
import { evaluatePasswordStrength, getPasswordStrengthText } from '@/utils/password-policy'
import { getSafeRedirect } from '@/utils/redirect-validator'

defineOptions({ name: 'AuthForgotPassword' })

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const currentStep = ref(0)
const countdown = ref(0)
const resending = ref(false)
const requestErrorMessage = ref('')
const stepLabels = ['验证邮箱', '验证码', '重置密码', '完成']
let countdownTimer: ReturnType<typeof setInterval> | null = null

// 表单数据
const identityForm = ref({ email: '' })
const verificationForm = ref({ code: '' })
const passwordForm = ref({ newPassword: '', confirmPassword: '' })

// 表单校验错误
const errors = reactive<Record<string, string>>({})

// 密码强度计算
const passwordStrength = computed(() => {
  return evaluatePasswordStrength(passwordForm.value.newPassword).score
})

const passwordStrengthText = computed(() => getPasswordStrengthText(passwordStrength.value))
const loginLocation = computed(() => {
  const redirect = route.query.redirect
  const safeRedirect = getSafeRedirect(typeof redirect === 'string' ? redirect : '', '')
  return {
    path: '/login',
    query: safeRedirect ? { redirect: safeRedirect } : undefined,
  }
})

// 身份验证 - 发送验证码
const handleIdentityVerify = async () => {
  requestErrorMessage.value = ''
  errors.email = ''
  const email = identityForm.value.email.trim()
  if (!email) {
    errors.email = '请输入邮箱地址'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = '邮箱格式不正确'
    return
  }

  try {
    loading.value = true
    await sendResetCode(email)
    void message.success('验证码已发送到您的邮箱')
    currentStep.value = 1
    startCountdown()
  } catch (error: unknown) {
    requestErrorMessage.value = getUserErrorMessage(error, '验证码发送失败，请稍后再试')
  } finally {
    loading.value = false
  }
}

// 验证验证码
const handleVerificationCode = async () => {
  requestErrorMessage.value = ''
  errors.code = ''
  if (!verificationForm.value.code.trim()) {
    errors.code = '请输入验证码'
    return
  }
  if (!/^\d{6}$/.test(verificationForm.value.code)) {
    errors.code = '验证码为6位数字'
    return
  }

  try {
    loading.value = true
    const isValid = await verifyResetCode(identityForm.value.email, verificationForm.value.code)
    if (isValid) {
      void message.success('验证成功')
      currentStep.value = 2
    } else {
      requestErrorMessage.value = '验证码错误或已过期'
      notification.warning({ message: '验证失败', description: requestErrorMessage.value, duration: 3 })
    }
  } catch (error: unknown) {
    requestErrorMessage.value = getUserErrorMessage(error, '验证码校验失败，请稍后再试')
  } finally {
    loading.value = false
  }
}

// 重置密码
const handleResetPassword = async () => {
  requestErrorMessage.value = ''
  errors.newPassword = ''
  errors.confirmPassword = ''
  let ok = true
  if (!passwordForm.value.newPassword) {
    errors.newPassword = '请输入新密码'
    ok = false
  }
  if (!passwordForm.value.confirmPassword) {
    errors.confirmPassword = '请确认密码'
    ok = false
  } else if (passwordForm.value.confirmPassword !== passwordForm.value.newPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    ok = false
  }
  const strength = evaluatePasswordStrength(passwordForm.value.newPassword)
  if (
    passwordForm.value.newPassword
    && (
      !strength.minLength
      || !strength.uppercase
      || !strength.lowercase
      || !strength.digit
      || !strength.special
    )
  ) {
    errors.newPassword = '新密码需满足全部强度要求'
    ok = false
  }
  if (!ok) return

  try {
    loading.value = true
    await resetPassword({
      email: identityForm.value.email,
      code: verificationForm.value.code,
      newPassword: passwordForm.value.newPassword,
      confirmPassword: passwordForm.value.confirmPassword,
    })
    void message.success('密码重置成功')
    currentStep.value = 3
  } catch (error: unknown) {
    requestErrorMessage.value = getUserErrorMessage(error, '密码重置失败，请检查后再试')
  } finally {
    loading.value = false
  }
}

// 重新发送验证码
const resendCode = async () => {
  requestErrorMessage.value = ''
  resending.value = true
  try {
    await sendResetCode(identityForm.value.email)
    void message.success('验证码已重新发送')
    startCountdown()
  } catch (error: unknown) {
    requestErrorMessage.value = getUserErrorMessage(error, '验证码重新发送失败，请稍后再试')
  } finally {
    resending.value = false
  }
}

// 开始倒计时
const startCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!)
      countdownTimer = null
    }
  }, 1000)
}

// 上一步
const goToPreviousStep = () => {
  requestErrorMessage.value = ''
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 跳转到登录页
const goToLogin = () => {
  void router.push(loginLocation.value)
}

// 掩码邮箱
const maskEmail = (email: string) => {
  if (!email) return ''
  const [username, domain] = email.split('@')
  if (!username || !domain) return email
  const maskedUsername
    = username.length > 2 ? username.substring(0, 2) + '*'.repeat(username.length - 2) : username
  return `${maskedUsername}@${domain}`
}

// 监听密码变化，清空确认密码
watch(
  () => passwordForm.value.newPassword,
  () => {
    passwordForm.value.confirmPassword = ''
  },
)

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
  }
})
</script>

<style lang="scss" scoped>
// ─── 右侧面板 ───
.forgot-header {
  margin-bottom: var(--dp-space-block);

  h2 {
    font-size: var(--dp-font-size-2xl);
    font-weight: 700;
    color: var(--dp-text-primary);
    margin: 0 0 var(--dp-space-component-tight);
  }

  p {
    font-size: var(--dp-font-size-md);
    color: var(--dp-text-muted);
    margin: 0;
  }
}

// ─── 步骤指示器（紧凑版） ───
.step-indicators {
  display: flex;
  justify-content: center;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-block);
}

.step-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dp-space-component-xs);
}

.step-dot__num {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: var(--dp-font-size-xs);
  font-weight: 600;
  background: var(--dp-gray-100);
  color: var(--dp-text-muted);
  transition: all var(--dp-duration-normal);
}

.step-dot__label {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  transition: color var(--dp-duration-normal);
}

.step-dot--active .step-dot__num {
  background: var(--dp-blue-600);
  color: var(--dp-text-inverse);
}

.step-dot--active .step-dot__label {
  color: var(--dp-blue-600);
  font-weight: 600;
}

.step-dot--done .step-dot__num {
  background: var(--dp-green-50);
  color: var(--dp-green-600);
}

.step-dot--done .step-dot__label {
  color: var(--dp-green-600);
}

// ─── 步骤表单 ───
.step-form {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  margin-bottom: var(--dp-space-component);
}

.step-buttons {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
  margin-top: var(--dp-space-component-xs);
}

.verification-info {
  text-align: center;
  padding-bottom: var(--dp-space-component-tight);
  color: var(--dp-blue-600);

  p {
    margin: var(--dp-space-component-tight) 0;
    font-size: var(--dp-font-size-md);
    color: var(--dp-text-secondary);
  }
}

.verification-info__icon {
  font-size: 40px;
}

.contact-highlight {
  font-weight: 600;
  color: var(--dp-blue-600) !important;
}

.verification-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;

  :deep(.dp-btn) {
    min-height: var(--dp-control-height-sm);
    padding-inline: var(--dp-space-component-tight);
  }
}

.countdown-text {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
}

// ─── 密码强度 ───
.password-strength {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
}

.strength-label {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  white-space: nowrap;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: var(--dp-gray-100);
  border-radius: var(--dp-radius-full);
  overflow: hidden;
}

.strength-fill {
  width: 100%;
  height: 100%;
  border-radius: var(--dp-radius-full);
  transform-origin: left center;
  transition:
    transform var(--dp-duration-slow),
    background-color var(--dp-duration-slow);

  &.strength-1 {
    background: var(--dp-error);
  }
  &.strength-2 {
    background: var(--dp-warning);
  }
  &.strength-3 {
    background: var(--dp-yellow-500);
  }
  &.strength-4 {
    background: var(--dp-success);
  }
  &.strength-5 {
    background: var(--dp-color-primary);
  }
}

.strength-text {
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-muted);
  min-width: 30px;
}

// ─── 成功状态 ───
.success-block {
  text-align: center;
  padding: var(--dp-space-component) 0;
  color: var(--dp-green-600);

  h3 {
    margin: var(--dp-space-block) 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xl);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  p {
    margin: 0 0 var(--dp-space-block);
    font-size: var(--dp-font-size-md);
    color: var(--dp-text-muted);
  }
}

.success-block__icon {
  font-size: 56px;
}

.request-error {
  margin: 0 0 var(--dp-space-component);
  padding: var(--dp-space-component) var(--dp-space-block);
  border: 1px solid color-mix(in srgb, var(--dp-error) 20%, transparent);
  border-radius: var(--dp-radius-control);
  background: var(--dp-red-50);
  color: var(--dp-error);
  font-size: var(--dp-font-size-sm);
  line-height: 1.5;
}

// ─── 页脚 ───
.forgot-footer {
  text-align: center;
  margin-top: var(--dp-space-block);
  padding-top: var(--dp-space-block);
  border-top: 1px solid var(--dp-border-subtle);
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-muted);

  a {
    color: var(--dp-blue-600);
    font-weight: 500;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
