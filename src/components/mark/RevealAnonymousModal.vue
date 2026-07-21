<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { AnonymousRevealResponse } from '@/apis/mark/marking-organization'
import message from 'ant-design-vue/es/message'
import { reactive, ref, watch } from 'vue'
import { revealAnonymous } from '@/apis/mark/marking-organization'
import PasswordInput from '@/components/ui-guide/ui/PasswordInput.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'

defineOptions({ name: 'RevealAnonymousModal' })

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  examId: string
  taskId: string
  /** MVR-375：与 BE canManageOwnerIdentityReveal / requireExamOwnerPermission 同源 */
  canManageOwnerIdentityReveal?: boolean
}>()

const emit = defineEmits<{
  revealed: [value: AnonymousRevealResponse]
}>()

const submitting = ref(false)
const formRef = ref<FormInstance>()
const form = reactive<{ currentPassword: string, reason: string }>({
  currentPassword: '',
  reason: '',
})

const rules: Record<string, Rule[]> = {
  currentPassword: [
    { required: true, message: '请输入登录密码进行二次验证', trigger: 'blur' },
    { max: 200, message: '密码长度异常', trigger: 'blur' },
  ],
  reason: [
    { required: true, message: '解匿名必须提供理由', trigger: 'blur' },
    { max: 500, message: '理由最多 500 字符', trigger: 'blur' },
  ],
}

/** 重置解匿名表单，保证每次 step-up 验证都重新输入密码和理由。 */
function resetForm(): void {
  form.currentPassword = ''
  form.reason = ''
  formRef.value?.clearValidate()
}

/** 提交解匿名请求，后端负责考试创建人权限、密码二次校验和审计留痕。 */
async function submitReveal(): Promise<void> {
  // MVR-375：与父层 canManageOwnerIdentityReveal / BE requireExamOwnerPermission 二次拦截
  if (!props.canManageOwnerIdentityReveal) {
    showFormValidationMessage('当前账号无解匿名权限')
    return
  }
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    const result = await revealAnonymous({
      examId: props.examId,
      taskId: props.taskId,
      currentPassword: form.currentPassword,
      reason: form.reason.trim(),
    })
    emit('revealed', result)
    open.value = false
    resetForm()
    void message.success(`已解匿名 5 分钟：${result.studentName}（${result.studentNo}）`)
  } catch (error) {
    showUserError(error, '解匿名失败')
  } finally {
    submitting.value = false
  }
}

watch(open, (value) => {
  if (!value) {
    resetForm()
  }
})
</script>

<template>
  <UiDialog
    v-model:open="open"
    title="解匿名查看学生身份"
    :confirm-loading="submitting"
    ok-text="确认解匿名"
    cancel-text="取消"
    @ok="submitReveal"
  >
    <UiAlertStrip
      tone="warning"
      title="解匿名仅开放 5 分钟临时查看"
      description="按 R7 规则：仅考试主考老师本人可解匿名，且需登录密码二次验证。每次解匿名理由都会写入操作审计。"
      :inline="false"
      style="margin-bottom: 12px"
    />
    <UiForm ref="formRef" :model="form" :rules="rules" layout="vertical">
      <UiFormItem label="登录密码" name="currentPassword" required>
        <PasswordInput
          v-model="form.currentPassword"
          placeholder="输入当前登录账号的密码"
          autocomplete="new-password"
        />
      </UiFormItem>
      <UiFormItem label="解匿名理由" name="reason" required>
        <UiTextarea
          size="sm"
          v-model="form.reason"
          :rows="3"
          :maxlength="500"
          placeholder="必填。例如：核对学生身份 / 处理申诉 / 仲裁前置等"
          :show-count="true"
        />
      </UiFormItem>
    </UiForm>
  </UiDialog>
</template>
