<template>
  <UiDialog
    :open="open"
    title="创建试评会话"
    :width="560"
    :confirm-loading="submitting"
    ok-text="创建"
    @update:open="emit('update:open', $event)"
    @ok="submit"
  >
    <UiAlertStrip
      tone="info"
      dense
      title="试评用于校准评分尺度"
      description="创建后可在列表中启动试评，教师完成样本卷批阅后提交校准结论。"
      class="trial-create-dialog__hint"
    />
    <UiForm layout="vertical">
      <UiFormItem
        label="选择题组"
        required
        :validate-status="groupFieldError ? 'error' : undefined"
        :help="groupFieldError || undefined"
      >
        <UiSelect v-model="groupId" placeholder="选择参加试评的题组" :options="groupOptions" />
      </UiFormItem>
      <SessionGroupCreateSummary
        v-if="groupId"
        phase="trial"
        :policy="selectedGroupPolicy"
        :group-readiness="selectedGroupReadiness"
        :session-readiness="sessionReadiness"
      />
      <WorkflowReadinessPanel
        v-if="groupId && !selectedGroupCanCreate && selectedGroupWorkflowSteps.length"
        title="该题组创建前还需完成"
        :steps="selectedGroupWorkflowSteps"
      />
    </UiForm>
  </UiDialog>
</template>

<script lang="ts" setup>
import type {
  AllocationPolicyResponse,
  SessionCreateReadinessResponse,
  SessionGroupCreateReadinessResponse,
} from '@/apis/mark/marking-organization'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { createTrialSession } from '@/apis/mark/marking-organization'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { blockingItemsToWorkflowSteps } from '@/components/workbench/workflow-readiness/workflow-blocking-items'
import WorkflowReadinessPanel from '@/components/workbench/workflow-readiness/WorkflowReadinessPanel.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import SessionGroupCreateSummary from './SessionGroupCreateSummary.vue'

interface GroupOption {
  value: string
  label: string
}

defineOptions({ name: 'TrialSessionCreateDialog' })

const props = defineProps<{
  open: boolean
  organizationId: string
  groupOptions: GroupOption[]
  groupHasAllocationPolicyMap?: Record<string, boolean>
  groupCreateReadinessMap?: Record<string, SessionGroupCreateReadinessResponse>
  groupAllocationPolicyMap?: Record<string, AllocationPolicyResponse>
  sessionReadiness?: SessionCreateReadinessResponse | null
  canManage: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": [sessionId: string]
}>()

const groupId = ref<string | undefined>(undefined)
const submitting = ref(false)
const groupFieldError = ref('')


const selectedGroupReadiness = computed(() =>
  groupId.value ? props.groupCreateReadinessMap?.[groupId.value] : undefined,
)

const selectedGroupPolicy = computed(() =>
  groupId.value ? props.groupAllocationPolicyMap?.[groupId.value] : undefined,
)

/**
 * MVR-396：仅认 BE 题组 canCreate===true；禁止 readiness 缺失时回退「有分配策略即可建」。
 */
const selectedGroupCanCreate = computed(
  () => selectedGroupReadiness.value?.canCreate === true,
)

const selectedGroupWorkflowSteps = computed(() => {
  const items = selectedGroupReadiness.value?.blockingItems
  if (!items?.length) {
    return []
  }
  const routeParams: Record<string, string> = { organizationId: props.organizationId }
  const examId = props.sessionReadiness?.examId
  if (examId) {
    routeParams.examId = examId
  }
  const routeQuery = examId ? { examId } : undefined
  return blockingItemsToWorkflowSteps(items, {
    routeParams,
    routeQuery,
    actionLabelPrefix: '去',
  })
})

watch(
  () => props.open,
  (nextOpen) => {
    if (!nextOpen) {
      groupId.value = undefined
      groupFieldError.value = ''
      return
    }
    groupFieldError.value = ''
    if (props.groupOptions.length === 1) {
      groupId.value = props.groupOptions[0].value
    }
  },
)

watch(groupId, () => {
  groupFieldError.value = ''
})

async function submit(): Promise<void> {
  if (!props.canManage) {
    showFormValidationMessage('仅考试主考老师可管理试评会话')
    return
  }
  if (!props.organizationId) {
    showFormValidationMessage('缺少阅卷组织，无法创建试评会话')
    return
  }
  if (!groupId.value) {
    groupFieldError.value = '请选择题组'
    showFormValidationMessage('请选择题组')
    return
  }
  if (!selectedGroupCanCreate.value) {
    groupFieldError.value = '所选题组当前不可创建试评会话'
    showFormValidationMessage('所选题组当前不可创建试评会话')
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const sessionId = await createTrialSession({
      organizationId: props.organizationId,
      groupId: groupId.value,
    })
    void message.success('试评会话已创建')
    emit('update:open', false)
    emit('success', sessionId)
  } catch (error) {
    showUserError(error, '创建试评会话失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.trial-create-dialog__hint {
  margin-bottom: var(--dp-space-component);
}
</style>
