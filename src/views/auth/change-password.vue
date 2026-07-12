<template>
  <div class="change-pwd-page">
    <div class="change-pwd-container">
      <UiPageHeader
        :title="isForceMode ? '强制修改密码' : '修改密码'"
        :subtitle="
          isForceMode
            ? '出于安全考虑，您需要修改密码后才能继续使用系统'
            : '为了您的账户安全，请定期修改密码'
        "
        :show-back="!isForceMode"
        @back="handleBack"
      />

      <div class="change-pwd-body">
        <!-- 左侧：表单 -->
        <UiCard class="form-card">
          <a-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            layout="vertical"
            @finish="handleChangePassword"
          >
            <UiFormSection title="当前密码">
              <a-form-item name="currentPassword" label="当前密码">
                <a-input-password
                  v-model:value="passwordForm.currentPassword"
                  placeholder="请输入当前密码"
                  size="large"
                  autocomplete="current-password"
                />
              </a-form-item>
            </UiFormSection>

            <UiFormSection title="新密码" divided>
              <a-form-item name="newPassword" label="新密码">
                <a-input-password
                  v-model:value="passwordForm.newPassword"
                  placeholder="请输入新密码"
                  size="large"
                  autocomplete="new-password"
                />
              </a-form-item>
              <a-form-item name="confirmPassword" label="确认新密码">
                <a-input-password
                  v-model:value="passwordForm.confirmPassword"
                  placeholder="请再次输入新密码"
                  size="large"
                  autocomplete="new-password"
                />
              </a-form-item>
            </UiFormSection>

            <div class="password-strength">
              <span class="strength-label">密码强度</span>
              <div class="strength-bar">
                <div
                  class="strength-fill"
                  :class="`strength-${passwordStrength}`"
                  :style="{ width: `${(passwordStrength / 5) * 100}%` }"
                />
              </div>
              <span class="strength-text">{{ passwordStrengthText }}</span>
            </div>

            <div class="form-actions">
              <a-button v-if="!isForceMode" size="large" @click="handleCancel">取消</a-button>
              <a-button :loading="loading" html-type="submit" size="large" type="primary">
                修改密码
              </a-button>
            </div>
          </a-form>
        </UiCard>

        <!-- 右侧：强度参考 -->
        <UiCard title="强度参考" class="sidebar-card">
          <div class="requirements-list">
            <div class="req-item" :class="{ fulfilled: hasMinLength }">
              <CheckCircleOutlined v-if="hasMinLength" />
              <MinusCircleOutlined v-else />
              <span>长度达到 8 位</span>
            </div>
            <div class="req-item" :class="{ fulfilled: hasUpperCase }">
              <CheckCircleOutlined v-if="hasUpperCase" />
              <MinusCircleOutlined v-else />
              <span>包含大写字母</span>
            </div>
            <div class="req-item" :class="{ fulfilled: hasLowerCase }">
              <CheckCircleOutlined v-if="hasLowerCase" />
              <MinusCircleOutlined v-else />
              <span>包含小写字母</span>
            </div>
            <div class="req-item" :class="{ fulfilled: hasDigit }">
              <CheckCircleOutlined v-if="hasDigit" />
              <MinusCircleOutlined v-else />
              <span>包含数字</span>
            </div>
            <div class="req-item" :class="{ fulfilled: hasSpecialChar }">
              <CheckCircleOutlined v-if="hasSpecialChar" />
              <MinusCircleOutlined v-else />
              <span>包含特殊字符</span>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- 密码修改记录 -->
      <UiCard class="history-card">
        <template #title>
          <div class="history-title">
            <span>密码修改记录</span>
            <a-button size="small" type="text" @click="fetchPasswordHistory">
              <template #icon><ReloadOutlined /></template>
              刷新
            </a-button>
          </div>
        </template>

        <UiDataTable
          pagination-mode="none"
          :columns="historyColumns"
          :data-source="passwordHistory"
          :loading="historyLoading"
          :show-pagination="false"
          flat
          :total="passwordHistory.length"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <UiTag :tone="record.success ? 'green' : 'red'">
                {{ record.success ? '成功' : '失败' }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'ipAddress'">
              <span class="ip-address">{{ record.ipAddress }}</span>
            </template>
            <template v-else-if="column.key === 'time'">
              {{ formatChangeTime(record.changeTime) }}
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { PasswordHistoryDto } from '@/apis/edu/user-management'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import MinusCircleOutlined from '@ant-design/icons-vue/MinusCircleOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import message from 'ant-design-vue/es/message'
import Modal from 'ant-design-vue/es/modal'
import dayjs from 'dayjs'
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { changePassword } from '@/apis/auth'
import { getPasswordHistory } from '@/apis/edu/user-management'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiFormSection from '@/components/ui-guide/ui/UiFormSection.vue'
import UiPageHeader from '@/components/ui-guide/ui/UiPageHeader.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useAuthStore, useUserStore } from '@/stores'
import { showUserError } from '@/utils/error-handler'
import { shouldEnforcePasswordChange } from '@/utils/password-change-enforcement'
import { evaluatePasswordStrength, getPasswordStrengthText } from '@/utils/password-policy'

defineOptions({ name: 'AuthChangePassword' })

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()

// 检测是否为强制修改模式
const isForceMode = computed(() => shouldEnforcePasswordChange(userStore.userInfo))

// 响应式数据
const loading = ref(false)
const historyLoading = ref(false)
const passwordHistory = ref<PasswordHistoryDto[]>([])

// 表单引用
const passwordFormRef = ref()

// 密码表单
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// 历史记录表格配置
const historyColumns = [
  { title: '时间', dataIndex: 'changeTime', key: 'time', width: 120 },
  { title: '类型', dataIndex: 'changeType', key: 'changeType', width: 120 },
  { title: '操作人', dataIndex: 'changedByUserName', key: 'changedByUserName', width: 140 },
  { title: '状态', dataIndex: 'success', key: 'status', width: 80 },
]

// 密码验证规则（与 PasswordChangeModal 和后端 PasswordPolicyValidator 保持一致）
const passwordRules = {
  currentPassword: [{ required: true, message: '请输入当前密码' }],
  newPassword: [
    { required: true, message: '请输入新密码' },
    {
      validator: (_rule: unknown, value: string) => {
        if (!value) {
          return Promise.resolve()
        }

        if (value === passwordForm.value.currentPassword) {
          return Promise.reject(new Error('新密码不能与当前密码相同'))
        }

        return Promise.resolve()
      },
    },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码' },
    {
      validator: (_rule: unknown, value: string) => {
        if (value !== passwordForm.value.newPassword) {
          return Promise.reject(new Error('两次输入的密码不一致'))
        }
        return Promise.resolve()
      },
    },
  ],
}

// 密码要求实时校验（与输入联动）
const passwordStrengthState = computed(() =>
  evaluatePasswordStrength(passwordForm.value.newPassword),
)
const hasMinLength = computed(() => passwordStrengthState.value.minLength)
const hasUpperCase = computed(() => passwordStrengthState.value.uppercase)
const hasLowerCase = computed(() => passwordStrengthState.value.lowercase)
const hasDigit = computed(() => passwordStrengthState.value.digit)
const hasSpecialChar = computed(() => passwordStrengthState.value.special)
const passwordStrength = computed(() => passwordStrengthState.value.score)
const passwordStrengthText = computed(() => getPasswordStrengthText(passwordStrength.value))

// 获取密码修改历史
const fetchPasswordHistory = async () => {
  try {
    historyLoading.value = true

    passwordHistory.value = await getPasswordHistory()
  } catch (error) {
    passwordHistory.value = []
    showUserError(error, '密码修改记录加载失败')
  } finally {
    historyLoading.value = false
  }
}

// 修改密码
const handleChangePassword = async () => {
  try {
    loading.value = true

    // 调用后端API
    // 注意：force 参数的后端含义是"管理员为他人强制重置密码"，而不是"用户被强制修改密码"
    // 用户自己修改密码时，无论是否被系统强制要求，都需要验证旧密码，所以 force 始终为 false
    await changePassword({
      oldPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
      confirmNewPassword: passwordForm.value.confirmPassword,
      force: false, // 用户自己修改密码，需要验证旧密码
    })

    // 清除强制修改密码标记
    userStore.userInfo.forcePasswordChange = false

    Modal.success({
      title: '密码修改成功',
      content: isForceMode.value
        ? '您的密码已成功修改，请使用新密码重新登录。'
        : '您的密码已成功修改，请使用新密码重新登录。',
      okText: '重新登录',
      onOk: async () => {
        // 清除登录状态并跳转到登录页
        await authStore.logout()
        await router.push('/login')
      },
    })
  } catch {
    // 拦截器已处理错误提示，此处仅需确保 loading 状态重置
  } finally {
    loading.value = false
  }
}

// 取消修改
const handleCancel = () => {
  if (isForceMode.value) {
    message.warning('您必须修改密码后才能继续使用系统')
    return
  }

  void confirmAsync({
    title: '确认取消',
    content: '确定要取消修改密码吗？已输入的内容将丢失。',
    type: 'warning',
    onOk: () => {
      router.back()
    },
  })
}

// 返回上一页
const handleBack = () => {
  if (isForceMode.value) {
    message.warning('您必须修改密码后才能继续使用系统')
    return
  }
  router.back()
}

// 格式化密码修改时间 - 特殊业务逻辑：智能显示时间格式
const formatChangeTime = (time: string) => {
  const now = dayjs()
  const target = dayjs(time)

  // 如果是今天，只显示时间
  if (target.isSame(now, 'day')) {
    return target.format('HH:mm:ss')
  }

  // 如果是今年，显示月日和时间
  if (target.isSame(now, 'year')) {
    return target.format('MM-DD HH:mm')
  }

  // 否则显示完整日期
  return target.format('YY-MM-DD HH:mm')
}

onMounted(() => {
  fetchPasswordHistory()
})

onActivated(() => {
  fetchPasswordHistory()
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.change-pwd-page {
  min-height: 100vh;
  padding: 32px 16px;
  background: var(--ant-color-fill-secondary);
}

.change-pwd-container {
  max-width: 900px;
  margin: 0 auto;
}

.change-pwd-body {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.form-card {
  flex: 1;

  :deep(.ant-form-item) {
    margin-bottom: 16px;
  }

  :deep(.ant-input-affix-wrapper) {
    height: 42px;
    border-radius: var(--ant-border-radius);
  }

  :deep(.ant-btn) {
    height: 42px;
    border-radius: var(--ant-border-radius);
    font-weight: 500;
  }
}

.sidebar-card {
  flex: 0 0 240px;
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.strength-label {
  font-size: 13px;
  color: var(--ant-color-text-secondary);
  white-space: nowrap;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: var(--ant-color-fill-secondary);
  border-radius: 999px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 999px;
  transition:
    width 0.3s,
    background-color 0.3s;

  &.strength-0 {
    background: var(--ant-color-fill-secondary);
  }
  &.strength-1 {
    background: var(--ant-color-error);
  }
  &.strength-2 {
    background: var(--ant-color-warning);
  }
  &.strength-3 {
    background: var(--ant-color-warning);
  }
  &.strength-4 {
    background: var(--ant-color-success);
  }
  &.strength-5 {
    background: var(--ant-color-success);
  }
}

.strength-text {
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
  min-width: 30px;
  font-weight: 500;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;

  .ant-btn {
    min-width: 100px;
  }
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.req-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--ant-color-text-quaternary);
  transition: color 0.2s;

  .anticon {
    font-size: 16px;
    flex-shrink: 0;
  }

  &.fulfilled {
    color: var(--ant-color-success);

    span {
      color: var(--ant-color-text);
    }
  }
}

.history-card {
  margin-top: 0;
}

.history-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.ip-address {
  font-family: var(--ant-font-family-code);
  font-size: 12px;
  background: var(--ant-color-fill-tertiary);
  padding: 2px 6px;
  border-radius: var(--dp-radius-xs);
}

@media (max-width: bp.$layout-mobile-max) {
  .change-pwd-body {
    flex-direction: column;
  }

  .sidebar-card {
    flex: none;
  }
}
</style>
