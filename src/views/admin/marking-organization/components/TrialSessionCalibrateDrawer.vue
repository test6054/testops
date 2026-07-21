<template>
  <UiDrawer
    :open="open"
    title="提交校准结论"
    :width="560"
    :confirm-loading="submitting"
    ok-text="提交"
    @update:open="emit('update:open', $event)"
    @ok="submit"
  >
    <div v-if="session" class="trial-calibrate-drawer__meta">
      <UiTag tone="blue" size="sm">{{ session.groupName }}</UiTag>
      <UiTag
        :tone="strictEnumTone(TRIAL_SESSION_STATUS_TONE, session.sessionStatus, '试评会话状态')"
        size="sm"
      >
        {{ strictEnumLabel(TrialSessionStatusDescription, session.sessionStatus, '试评会话状态') }}
      </UiTag>
    </div>
    <UiForm layout="vertical" class="trial-calibrate-drawer__form">
      <UiFormItem label="校准结论" required>
        <UiTextarea
          size="sm"
          v-model="calibrationSummary"
          :rows="4"
          :maxlength="1000"
          placeholder="填写本次试评形成的评分尺度、扣分边界和执行口径"
          :show-count="true"
        />
      </UiFormItem>
      <UiFormItem label="讨论笔记">
        <UiTextarea
          size="sm"
          v-model="discussionNotes"
          :rows="4"
          :maxlength="1000"
          placeholder="可选，记录团队讨论与共识"
          :show-count="true"
        />
      </UiFormItem>
    </UiForm>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { TrialSessionResponse } from '@/apis/mark/marking-organization'
import message from 'ant-design-vue/es/message'
import { ref, watch } from 'vue'
import {
  calibrateTrialSession,
  TRIAL_SESSION_STATUS_TONE,
  TrialSessionStatusDescription,
} from '@/apis/mark/marking-organization'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import { TrialSessionStatusCode } from '@/types/enums/trial-session-status-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TrialSessionCalibrateDrawer' })

const props = defineProps<{
  open: boolean
  session: TrialSessionResponse | null
  canManage: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": []
}>()

const calibrationSummary = ref('')
const discussionNotes = ref('')
const submitting = ref(false)

watch(
  () => props.open,
  (nextOpen) => {
    if (!nextOpen) {
      calibrationSummary.value = ''
      discussionNotes.value = ''
    }
  },
)

async function submit(): Promise<void> {
  if (!props.canManage) {
    showFormValidationMessage('仅考试主考老师可管理试评会话')
    return
  }
  // MVR-412：与 canCalibrate 同源二次闸（TRIAL_ASSIGNED / TRIAL_SUBMITTED）
  const status = props.session?.sessionStatus
  if (
    status !== TrialSessionStatusCode.TRIAL_ASSIGNED
    && status !== TrialSessionStatusCode.TRIAL_SUBMITTED
  ) {
    showFormValidationMessage('当前试评会话状态不可提交校准')
    return
  }
  if (!props.session?.id || !calibrationSummary.value.trim()) {
    return
  }
  if (submitting.value) {
    return
  }
  submitting.value = true
  try {
    await calibrateTrialSession({
      sessionId: props.session.id,
      calibrationSummary: calibrationSummary.value.trim(),
      discussionNotes: discussionNotes.value.trim() || undefined,
    })
    void message.success('试评校准结论已提交')
    emit('update:open', false)
    emit('success')
  } catch (error) {
    showUserError(error, '提交试评校准结论失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.trial-calibrate-drawer {
  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  &__form {
    margin-top: 4px;
  }
}
</style>
