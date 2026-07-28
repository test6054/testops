<template>
  <UiDrawer
    :open="open"
    :title="modalTitle"
    :width="520"
    :confirm-loading="submitting === true"
    ok-text="提交"
    :hide-footer="false"
    @update:open="handleOpenChange"
    @close="handleOpenChange(false)"
  >
    <UiAlertStrip tone="warning" :title="modalAlert" style="margin-bottom: var(--dp-space-component)" />
    <div v-if="targetSummary" class="lifecycle-target">
      <div class="lifecycle-target__row">
        <span class="lifecycle-target__label">阶段</span>
        <span>{{ targetSummary.phaseLabel }}</span>
      </div>
      <div class="lifecycle-target__row">
        <span class="lifecycle-target__label">题组</span>
        <span>{{ targetSummary.groupName }}</span>
      </div>
      <div class="lifecycle-target__row">
        <span class="lifecycle-target__label">状态</span>
        <span>{{ targetSummary.statusLabel }}</span>
      </div>
      <div class="lifecycle-target__row">
        <span class="lifecycle-target__label">进度</span>
        <span>
          {{ targetSummary.finalizedTaskCount == null ? '—' : targetSummary.finalizedTaskCount }}
          /
          {{ targetSummary.totalTaskCount == null ? '—' : targetSummary.totalTaskCount }}
        </span>
      </div>
      <div class="lifecycle-target__row">
        <span class="lifecycle-target__label">会话 ID</span>
        <span class="lifecycle-target__id">{{ targetSummary.sessionId }}</span>
      </div>
    </div>
    <UiAlertStrip
      v-if="submitError"
      tone="error"
      :title="submitError"
      style="margin-bottom: var(--dp-space-component)"
    />
    <UiForm layout="vertical">
      <UiFormItem label="操作原因" required>
        <UiTextarea
          size="sm"
          v-model="reason"
          :rows="4"
          :maxlength="500"
          placeholder="请填写操作原因，供后续运维追溯。例如：打分尺度争议临时叫停、系统升级暂停、试评交底归档等"
          :show-count="true"
        />
      </UiFormItem>
    </UiForm>
    <template #footer>
      <UiButton size="sm" variant="outline" @click="handleOpenChange(false)">取消</UiButton>
      <UiButton variant="primary" size="sm" :loading="submitting" :disabled="canManage !== true" @click="confirm">提交</UiButton>
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
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { getUserErrorMessage, showFormValidationMessage, showUserError } from '@/utils/error-handler'

export type LifecycleAction = 'pauseFormal' | 'closeFormal' | 'closeTrial'

/** 生命周期抽屉锁定的目标会话摘要（打开时固化，提交前不可变展示） */
export interface SessionLifecycleTargetSummary {
  sessionId: string
  groupName: string
  phaseLabel: string
  statusLabel: string
  /** 已定稿任务数；合同缺失时为 null，界面显示 — */
  finalizedTaskCount: number | null
  /** 总任务数；合同缺失时为 null，界面显示 — */
  totalTaskCount: number | null
}

defineOptions({ name: 'SessionLifecycleReasonModal' })

const props = withDefaults(
  defineProps<{

  open: boolean
  action: LifecycleAction | null
  sessionId: string
  targetSummary?: SessionLifecycleTargetSummary | null
  /** MVR-945：会话生命周期写提交仅认 === true */
  canManage?: boolean
}>(),
  {
    canManage: false,
  },
)
const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": []
}>()

const reason = ref('')
const submitting = ref(false)
const submitError = ref('')
const lockedSessionId = ref('')
const lockedTargetSummary = ref<SessionLifecycleTargetSummary | null>(null)

watch(
  () => props.open,
  (next) => {
    if (next) {
      reason.value = ''
      submitError.value = ''
      lockedSessionId.value = props.sessionId
      lockedTargetSummary.value = props.targetSummary
        ? { ...props.targetSummary, sessionId: props.sessionId || props.targetSummary.sessionId }
        : props.sessionId
          ? {
              sessionId: props.sessionId,
              groupName: '—',
              phaseLabel: '—',
              statusLabel: '—',
              finalizedTaskCount: 0,
              totalTaskCount: 0,
            }
          : null
    }
  },
)

const targetSummary = computed(() => lockedTargetSummary.value)

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
      return '关闭归档为终态操作：关闭后不能再修改或领取任务，请确认上方目标会话无误。'
    case 'closeTrial':
      return '关闭试评为终态操作：关闭后该试评不能再修改或领取，请确认上方目标会话无误。'
    default:
      return ''
  }
})

async function handleOpenChange(value: boolean): Promise<void> {
  if (!value && reason.value.trim() && !submitting.value) {
    const confirmed = await confirmAsync({
      title: '放弃未提交原因？',
      content: '已填写的操作原因不会保存。',
      okText: '放弃并关闭',
      cancelText: '继续填写',
      type: 'warning',
    })
    if (!confirmed) {
      return
    }
  }
  emit('update:open', value)
}

async function confirm(): Promise<void> {
  if (!props.action) {
    showUserError(null, '会话状态调整失败')
    return
  }
  if (props.canManage !== true) {
    showFormValidationMessage('仅考试主考老师可管理试评 / 正评会话')
    return
  }
  const targetSessionId = lockedSessionId.value || props.sessionId
  if (!targetSessionId) {
    showFormValidationMessage('缺少目标会话，请关闭后重新打开')
    return
  }
  if (submitting.value === true) {
    return
  }
  const trimmed = reason.value.trim()
  if (!trimmed) {
    submitError.value = '请填写操作原因'
    showFormValidationMessage('请填写操作原因')
    return
  }
  submitting.value = true
  submitError.value = ''
  try {
    switch (props.action) {
      case 'pauseFormal':
        await pauseFormalSession({ sessionId: targetSessionId, reason: trimmed })
        void message.success('正评会话已暂停')
        break
      case 'closeFormal':
        await closeFormalSession({ sessionId: targetSessionId, reason: trimmed })
        void message.success('正评会话已关闭归档')
        break
      case 'closeTrial':
        await closeTrialSession({ sessionId: targetSessionId, reason: trimmed })
        void message.success('试评会话已关闭')
        break
    }
    reason.value = ''
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

<style lang="scss" scoped>
.lifecycle-target {
  margin-bottom: var(--dp-space-component);
  padding: var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle, #e5e7eb);
  border-radius: 6px;
  background: var(--dp-surface-subtle, #fafafa);
}

.lifecycle-target__row {
  display: flex;
  gap: var(--dp-space-component);
  font-size: 13px;
  line-height: 1.5;
  & + & {
    margin-top: var(--dp-space-component-xs);
  }
}

.lifecycle-target__label {
  flex: 0 0 64px;
  color: var(--dp-text-secondary, #6b7280);
}

.lifecycle-target__id {
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}
</style>
