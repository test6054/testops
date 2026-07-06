<template>
  <UiDrawer
    :open="open"
    :title="modalTitle"
    :width="520"
    :confirm-loading="submitting"
    ok-text="提交"
    :hide-footer="false"
    @update:open="handleOpenChange"
    @close="handleOpenChange(false)"
  >
    <a-alert :message="modalAlert" type="warning" show-icon style="margin-bottom: 12px" />
    <a-alert
      v-if="submitError"
      type="error"
      show-icon
      style="margin-bottom: 12px"
      :message="submitError"
    />
    <a-form layout="vertical">
      <a-form-item label="操作原因" required>
        <a-textarea
          v-model:value="reason"
          :rows="4"
          :maxlength="500"
          placeholder="请填写操作原因，供后续运维追溯。例如：打分尺度争议临时叫停、系统升级暂停、试评交底归档等"
          show-count
        />
      </a-form-item>
    </a-form>
    <template #footer>
      <UiButton variant="outline" @click="handleOpenChange(false)">取消</UiButton>
      <UiButton :loading="submitting" :disabled="!canManage" @click="confirm">提交</UiButton>
    </template>
  </UiDrawer>
</template>

<script lang="ts" setup>
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import {
  closeFormalSession,
  closeTrialSession,
  pauseFormalSession,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'

export type LifecycleAction = 'pauseFormal' | 'closeFormal' | 'closeTrial'

defineOptions({ name: 'SessionLifecycleReasonModal' })

const props = defineProps<{
  open: boolean
  action: LifecycleAction | null
  sessionId: string
  canManage: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": []
}>()

const reason = ref('')
const submitting = ref(false)
const submitError = ref('')

watch(
  () => props.open,
  (next) => {
    if (next) {
      reason.value = ''
      submitError.value = ''
    }
  },
)

const modalTitle = computed(() => {
  if (!props.open && props.action === null) return ''
  switch (props.action) {
    case 'pauseFormal':
      return '暂停正评会话'
    case 'closeFormal':
      return '关闭归档正评会话'
    case 'closeTrial':
      return '关闭试评会话'
    default:
      return ''
  }
})

const modalAlert = computed(() => {
  if (!props.open && props.action === null) return ''
  switch (props.action) {
    case 'pauseFormal':
      return '暂停后教师不能领取新任务，超时回收暂停倒计时；恢复后教师可继续领取。'
    case 'closeFormal':
      return '关闭归档为终态操作，会话及任务不可再修改，请谨慎执行。'
    case 'closeTrial':
      return '关闭试评会话为终态操作，关闭后该试评不可再修改，请谨慎执行。'
    default:
      return ''
  }
})

function handleOpenChange(value: boolean): void {
  emit('update:open', value)
}

async function confirm(): Promise<void> {
  if (!props.action) {
    showUserError(null, '会话状态调整失败')
    return
  }
  if (!props.canManage) {
    message.warning('仅考试创建人可分配批阅任务')
    return
  }
  const trimmed = reason.value.trim()
  if (!trimmed) {
    submitError.value = '请填写操作原因'
    message.warning('请填写操作原因')
    return
  }
  submitting.value = true
  submitError.value = ''
  try {
    switch (props.action) {
      case 'pauseFormal':
        await pauseFormalSession({ sessionId: props.sessionId, reason: trimmed })
        message.success('正评会话已暂停')
        break
      case 'closeFormal':
        await closeFormalSession({ sessionId: props.sessionId, reason: trimmed })
        message.success('正评会话已关闭归档')
        break
      case 'closeTrial':
        await closeTrialSession({ sessionId: props.sessionId, reason: trimmed })
        message.success('试评会话已关闭')
        break
    }
    emit('success')
    emit('update:open', false)
  } catch (error) {
    submitError.value = getUserErrorMessage(error, '会话状态调整失败')
    showUserError(error, '会话状态调整失败')
  } finally {
    submitting.value = false
  }
}
</script>
