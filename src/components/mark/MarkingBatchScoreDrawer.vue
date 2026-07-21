<template>
  <UiDrawer
    :open="open"
    title="批量同题给分"
    width="420"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <UiForm layout="vertical">
      <UiFormItem label="已选任务">
        <span>{{ selectedTaskIds.length }} 份（同题组 · 同题目）</span>
      </UiFormItem>
      <UiFormItem label="给分" required>
        <UiInputNumber
          size="sm"
          v-model="score"
          :min="0"
          :max="fullScore"
          :step="0.5"
          class="marking-batch-score-drawer__score-input"
          placeholder="请输入统一给分"
        />
      </UiFormItem>
      <UiFormItem label="批注">
        <UiTextarea
          size="sm"
          v-model="annotationText"
          :maxlength="1000"
          :rows="3"
          placeholder="可选，统一批注"
        />
      </UiFormItem>
    </UiForm>

    <UiAlertStrip
      v-if="annotationWarning"
      tone="warning"
      title="批注写入告警"
      :description="annotationWarning"
      dense
    />

    <UiProgressBar
      v-if="submitting && progressTotal > 0"
      :percent="Math.round((progressDone / progressTotal) * 100)"
      :color="progressFailed ? 'var(--dp-error)' : 'var(--dp-color-primary)'"
      size="sm"
      :show-label="false"
    />

    <template #footer>
      <div class="dp-space" style="--dp-space-gap: 8px">
        <UiButton
          size="sm"
          variant="outline"
          :disabled="submitting"
          @click="emit('update:open', false)"
        >
          取消
        </UiButton>
        <UiButton
          size="sm"
          variant="primary"
          :loading="submitting"
          :disabled="!canManageReviewerWrites"
          @click="handleSubmit"
        >
          预检并提交
        </UiButton>
      </div>
    </template>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { MarkingTaskResponse } from '@/apis/mark/marking-organization'
import message from 'ant-design-vue/es/message'
import { ref, watch } from 'vue'
import {
  batchSubmitMarkingTasksInChunks,
  MarkingTaskBatchOutcomeCode,
  precheckMarkingTaskBatch,
} from '@/apis/mark/marking-batch'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiProgressBar from '@/components/ui-guide/ui/UiProgressBar.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useTenantMarkingWithdrawPolicy } from '@/composables/useTenantMarkingWithdrawPolicy'
import { showUserError } from '@/utils/error-handler'

const props = defineProps<{
  open: boolean
  examId: string
  groupId: string
  layoutQuestionId: string
  fullScore: number
  selectedTasks: MarkingTaskResponse[]
  /**
   * MVR-372：与 claim-context.canManageReviewerWrites（评阅写∧ACTIVE）同源。
   * 仅认 ===true；禁止缺声明默认放行。
   */
  canManageReviewerWrites?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted'): void
}>()

const score = ref<number | undefined>(undefined)
const annotationText = ref('')
const submitting = ref(false)
const progressDone = ref(0)
const progressTotal = ref(0)
const progressFailed = ref(false)
const annotationWarning = ref('')
const { withdrawConfirmHint, requireWithdrawWindowMinutes } = useTenantMarkingWithdrawPolicy()

const selectedTaskIds = ref<string[]>([])

watch(
  () => props.open,
  (visible) => {
    if (!visible) {
      score.value = undefined
      annotationText.value = ''
      annotationWarning.value = ''
      progressDone.value = 0
      progressTotal.value = 0
      progressFailed.value = false
      return
    }
    selectedTaskIds.value = props.selectedTasks.map((task) => task.id)
  },
)

function createCorrelationId(): string {
  return `batch-${props.layoutQuestionId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildQuestionScores() {
  if (score.value === undefined) {
    showUserError(null, '请填写给分')
    return null
  }
  return [
    {
      layoutQuestionId: props.layoutQuestionId,
      score: score.value,
      annotationText: annotationText.value.trim() || undefined,
      correlationId: createCorrelationId(),
    },
  ]
}

async function confirmExtremeScore(): Promise<boolean> {
  if (score.value === undefined) return false
  if (score.value !== 0 && score.value !== props.fullScore) return true
  const isZero = score.value === 0
  const withdrawMinutes = requireWithdrawWindowMinutes()
  if (withdrawMinutes == null) {
    return false
  }
  const withdrawHint = withdrawConfirmHint.value ?? `提交后可在 ${withdrawMinutes} 分钟内撤销`
  return confirmAsync({
    title: isZero ? '确认批量零分？' : '确认批量满分？',
    content: isZero
      ? `将对 ${selectedTaskIds.value.length} 份答卷统一给 0 分，${withdrawHint}。`
      : `将对 ${selectedTaskIds.value.length} 份答卷统一给满分 ${props.fullScore} 分，${withdrawHint}。`,
    type: 'warning',
    okText: '确认提交',
    cancelText: '取消',
  })
}

async function handleSubmit(): Promise<void> {
  if (submitting.value) {
    return
  }
  // MVR-372：写 handler 二次拦截；任务池仅隐藏入口不能替代
  if (props.canManageReviewerWrites !== true) {
    void message.warning('当前账号无阅卷写权限，不能批量给分')
    return
  }
  if (!props.examId || !props.groupId || selectedTaskIds.value.length === 0) return
  if (score.value === undefined) {
    void message.warning('请填写给分')
    return
  }
  const confirmed = await confirmExtremeScore()
  if (!confirmed) return

  const questionScores = buildQuestionScores()
  if (!questionScores) {
    return
  }

  submitting.value = true
  progressDone.value = 0
  progressTotal.value = selectedTaskIds.value.length
  progressFailed.value = false
  annotationWarning.value = ''

  const baseRequest = {
    examId: props.examId,
    groupId: props.groupId,
    questionScores,
  }

  try {
    const precheck = await precheckMarkingTaskBatch({
      ...baseRequest,
      taskIds: selectedTaskIds.value,
    })
    if (!precheck.passed) {
      void message.error(precheck.blockingReason ?? '批量预检未通过')
      return
    }

    const results = await batchSubmitMarkingTasksInChunks(
      baseRequest,
      selectedTaskIds.value,
      (completed, total) => {
        progressDone.value = completed
        progressTotal.value = total
      },
    )

    const submittedTaskIds = results.flatMap((item) => item.submittedTaskIds ?? [])
    const failed = results.find((item) => item.outcome === MarkingTaskBatchOutcomeCode.FAILED)
    if (failed) {
      progressFailed.value = true
      void message.error(
        submittedTaskIds.length > 0
          ? `${failed.failureMessage ?? '批量提交失败'}（已成功提交 ${submittedTaskIds.length} 份，请处理剩余任务）`
          : (failed.failureMessage ?? '批量提交失败'),
      )
      if (submittedTaskIds.length > 0) {
        emit('submitted')
      }
      return
    }

    const warn = results.find((item) => item.outcome === MarkingTaskBatchOutcomeCode.WARN)
    if (warn?.annotationWarning) {
      annotationWarning.value = warn.annotationWarning
      void message.warning(warn.annotationWarning)
    } else {
      void message.success(`已成功提交 ${submittedTaskIds.length} 份任务`)
    }
    emit('submitted')
    emit('update:open', false)
  } catch (error) {
    progressFailed.value = true
    showUserError(error, '批量提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.marking-batch-score-drawer__score-input {
  width: 100%;
}
</style>
