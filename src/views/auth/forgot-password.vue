<template>
  <AuthLayout>
    <template #brand-content>
      <div class="forgot-brand-steps">
        <div
          v-for="(step, idx) in stepLabels"
          :key="idx"
          class="brand-step"
          :class="{
            'brand-step--active': currentStep === idx,
            'brand-step--done': currentStep > idx,
          }"
        >
          <span class="brand-step__num">
            <svg
              v-if="currentStep > idx"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              width="14"
              height="14"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <template v-else>{{ idx + 1 }}</template>
          </span>
          <span class="brand-step__label">{{ step }}</span>
        </div>
      </div>
    </template>

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
          <svg
            v-if="currentStep > idx"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            width="13"
            height="13"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <template v-else>{{ idx + 1 }}</template>
        </span>
        <span class="step-dot__label">{{ step }}</span>
      </div>
    </div>

    <!-- 步骤1：验证邮箱 -->
    <form v-if="currentStep === 0" class="step-form" @submit.prevent="handleIdentityVerify">
      <UiFormField label="邮箱地址" required :error="errors.email">
        <UiInput
          v-model="identityForm.email"
          placeholder="请输入注册时的邮箱地址"
          size="lg"
          clearable
          :maxlength="255"
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          width="40"
          height="40"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
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
            :status="errors.code ? 'error' : 'default'"
          />
        </UiFormField>
        <div class="verification-actions">
          <span class="countdown-text">{{
            countdown > 0 ? `${countdown}秒后可重新发送` : ''
          }}</span>
          <a :class="{ disabled: countdown > 0 }" @click="countdown <= 0 && resendCode()">重新发送</a>
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
          :status="errors.newPassword ? 'error' : 'default'"
        />
      </UiFormField>
      <UiFormField label="确认密码" required :error="errors.confirmPassword">
        <UiPasswordInput
          v-model="passwordForm.confirmPassword"
          placeholder="请再次输入新密码"
          size="lg"
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
        <svg viewBox="0 0 20 20" fill="currentColor" width="56" height="56">
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clip-rule="evenodd"
          />
        </svg>
        <h3>密码重置成功！</h3>
        <p>您的密码已成功重置，请使用新密码登录。</p>
        <UiButton variant="primary" size="lg" block @click="goToLogin">立即登录</UiButton>
      </div>
    </div>

    <div class="forgot-footer">
      <span>想起密码了？</span>
      <router-link to="/login">返回登录</router-link>
    </div>
  </AuthLayout>
</template>

<script lang="ts" setup>
import message from 'ant-design-vue/es/message'
import notification from 'ant-design-vue/es/notification'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { resetPassword, sendResetCode, verifyResetCode } from '@/apis/auth'
import AuthLayout from '@/components/AuthLayout/index.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiPasswordInput from '@/components/ui-guide/ui/PasswordInput.vue'
import UiFormField from '@/components/ui-guide/ui/UiFormField.vue'
import { evaluatePasswordStrength, getPasswordStrengthText } from '@/utils/password-policy'

defineOptions({ name: 'AuthForgotPassword' })

const router = useRouter()

const loading = ref(false)
const currentStep = ref(0)
const countdown = ref(0)
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

// 身份验证 - 发送验证码
const handleIdentityVerify = async () => {
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
  } catch {
    // 错误已由拦截器处理
  } finally {
    loading.value = false
  }
}

// 验证验证码
const handleVerificationCode = async () => {
  errors.code = ''
  if (!verificationForm.value.code.trim()) {
    errors.code = '请输入验证码'
    return
  }
  if (verificationForm.value.code.length !== 6) {
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
      notification.warning({ message: '验证失败', description: '验证码错误或已过期', duration: 3 })
    }
  } catch {
    // 错误已由拦截器处理
  } finally {
    loading.value = false
  }
}

// 重置密码
const handleResetPassword = async () => {
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
  } catch {
    // 错误已由拦截器处理
  } finally {
    loading.value = false
  }
}

// 重新发送验证码
const resendCode = async () => {
  try {
    await sendResetCode(identityForm.value.email)
    void message.success('验证码已重新发送')
    startCountdown()
  } catch {
    // 错误已由拦截器处理
  }
}

// 开始倒计时
const startCountdown = () => {
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
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

// 跳转到登录页
const goToLogin = () => {
  router.push('/login')
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
// ─── 左侧品牌步骤 ───
.forgot-brand-steps {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

.brand-step {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component) var(--dp-space-block);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  transition: background var(--dp-duration-normal);
}

.brand-step--active {
  background: rgba(255, 255, 255, 0.14);
}

.brand-step--done {
  opacity: 0.6;
}

.brand-step__num {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);

  .brand-step--active & {
    background: var(--dp-text-inverse);
    color: var(--dp-color-primary);
  }

  .brand-step--done & {
    background: rgba(255, 255, 255, 0.2);
    color: var(--dp-text-inverse);
  }
}

.brand-step__label {
  font-size: var(--dp-font-size-md);
  color: rgba(255, 255, 255, 0.7);

  .brand-step--active & {
    color: var(--dp-text-inverse);
    font-weight: 600;
  }
}

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
  gap: 5px;
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
  font-size: var(--dp-font-size-xxs);
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

.contact-highlight {
  font-weight: 600;
  color: var(--dp-blue-600) !important;
}

.verification-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;

  a {
    color: var(--dp-blue-600);
    cursor: pointer;
    font-size: var(--dp-font-size-sm);

    &.disabled {
      color: var(--dp-text-muted);
      pointer-events: none;
    }
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
