<template>
  <UiForm
    ref="formRef"
    :model="form"
    :rules="rules"
    layout="vertical"
    size="large"
    @submit="onModify"
  >
    <UiFormItem name="oldPassword" label="当前密码">
      <PasswordInput v-model="form.oldPassword" clearable size="lg" placeholder="请输入当前密码" />
    </UiFormItem>
    <UiFormItem name="newPassword" label="新密码">
      <PasswordInput v-model="form.newPassword" clearable size="lg" placeholder="请输入新密码" />
    </UiFormItem>
    <UiFormItem name="confirmPassword" label="确认密码">
      <PasswordInput
        v-model="form.confirmPassword"
        clearable
        size="lg"
        placeholder="请再次输入新密码"
      />
    </UiFormItem>
    <UiFormItem>
      <UiButton
        type="submit"
        class="btn"
        size="lg"
        variant="primary"
        block
        :loading="loading"
      >
        立即修改
      </UiButton>
    </UiFormItem>
  </UiForm>
</template>

<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue/es/form'
import message from 'ant-design-vue/es/message'
import { changePassword } from '@/apis/auth'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import PasswordInput from '@/components/ui-guide/ui/PasswordInput.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'

interface Form {
  oldPassword: string
  newPassword: string
  confirmPassword?: string
}

const formRef = ref<FormInstance>()
const form = reactive<Form>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const rules = {
  oldPassword: [{ required: true, message: '请输入当前密码' }],
  newPassword: [
    { required: true, message: '请输入新密码' },
    {
      validator: (_rule: unknown, value: string) => {
        if (!value) {
          return Promise.resolve()
        }
        if (value === form.oldPassword) {
          return Promise.reject(new Error('新密码不能与旧密码相同'))
        }
        return Promise.resolve()
      },
    },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码' },
    {
      validator: (_rule: unknown, value: string) => {
        if (value !== form.newPassword) {
          return Promise.reject(new Error('两次密码不一致'))
        }
        return Promise.resolve()
      },
    },
  ],
}
const router = useRouter()
const loading = ref(false)

// 登录
const onModify = async () => {
  try {
    await formRef.value?.validate()
  } catch (error) {
    return
  }
  try {
    loading.value = true
    const params = {
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
      confirmNewPassword: form.confirmPassword!,
      force: false,
    }
    await changePassword(params)
    await router.push({
      path: '/login',
    })
    void message.success('修改成功')
  } catch {
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.ant-input-affix-wrapper,
:deep(.ant-select-single .ant-select-selector) {
  height: 40px;
  border-radius: var(--dp-radius-xs);
  font-size: 13px;
}

.ant-input-affix-wrapper-status-error {
  background-color: var(--dp-error-bg);
  border-color: var(--dp-error-border);
}

.ant-input-affix-wrapper-status-error:hover {
  background-color: var(--dp-error-bg);
  border-color: var(--dp-danger);
}

.ant-input-affix-wrapper .ant-input {
  font-size: 13px;
  color: var(--dp-text-primary);
}

.ant-input-affix-wrapper:hover {
  border-color: var(--dp-color-primary);
}

.btn {
}
</style>
