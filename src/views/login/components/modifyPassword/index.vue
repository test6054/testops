<template>
  <a-form
    ref="formRef" :model="form" :rules="rules"
    layout="vertical" size="large" @submit="onModify"
  >
    <a-form-item name="oldPassword" label="当前密码">
      <a-input-password v-model:value="form.oldPassword" allow-clear placeholder="请输入当前密码" />
    </a-form-item>
    <a-form-item name="newPassword" label="新密码">
      <a-input-password v-model:value="form.newPassword" allow-clear placeholder="请输入新密码" />
    </a-form-item>
    <a-form-item name="confirmPassword" label="确认密码">
      <a-input-password v-model:value="form.confirmPassword" allow-clear placeholder="请再次输入新密码" />
    </a-form-item>
    <a-form-item>
      <a-space class="w-full" direction="vertical">
        <a-button :loading="loading" class="btn" html-type="submit" block size="large" type="primary">
          立即修改
        </a-button>
      </a-space>
    </a-form-item>
  </a-form>
</template>

<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue'
import message from 'ant-design-vue/es/message'
import {changePassword} from '@/apis/auth'

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
  oldPassword: [
    {required: true, message: '请输入当前密码'},
  ],
  newPassword: [
    {required: true, message: '请输入新密码'},
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
    }
  ],
  confirmPassword: [{required: true, message: '请再次输入新密码'}, {
    validator: (_rule: unknown, value: string) => {
      if (value !== form.newPassword) {
        return Promise.reject(new Error('两次密码不一致'))
      }
      return Promise.resolve()
    },
  }],
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
      force: false
    }
    await changePassword(params)
    await router.push({
      path: '/login',
    })
    message.success('修改成功')
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
  background-color: var(--ant-color-error-bg);
  border-color: var(--ant-color-error-border);
}

.ant-input-affix-wrapper-status-error:hover {
  background-color: var(--ant-color-error-bg);
  border-color: var(--ant-color-error);
}

.ant-input-affix-wrapper .ant-input {
  font-size: 13px;
  color: var(--ant-color-text);
}

.ant-input-affix-wrapper:hover {
  border-color: var(--ant-color-primary);
}


.btn {

}
</style>
