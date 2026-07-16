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
    <a-form layout="vertical">
      <a-form-item label="选择题组" required>
        <UiSelect v-model="groupId" placeholder="选择参加试评的题组" :options="groupOptions" />
      </a-form-item>
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
    </a-form>
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

const selectedGroupHasAllocationPolicy = computed(() =>
  Boolean(groupId.value && props.groupHasAllocationPolicyMap?.[groupId.value]),
)

const selectedGroupReadiness = computed(() =>
  groupId.value ? props.groupCreateReadinessMap?.[groupId.value] : undefined,
)

const selectedGroupPolicy = computed(() =>
  groupId.value ? props.groupAllocationPolicyMap?.[groupId.value] : undefined,
)

const selectedGroupCanCreate = computed(() =>
  selectedGroupReadiness.value
    ? selectedGroupReadiness.value.canCreate
    : selectedGroupHasAllocationPolicy.value,
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
      return
    }
    if (props.groupOptions.length === 1) {
      groupId.value = props.groupOptions[0].value
    }
  },
)

async function submit(): Promise<void> {
  if (!props.canManage) {
    showFormValidationMessage('仅考试主考老师可管理试评会话')
    return
  }
  if (!props.organizationId || !groupId.value || !selectedGroupCanCreate.value) {
    return
  }
  submitting.value = true
  try {
    const sessionId = await createTrialSession({
      organizationId: props.organizationId,
      groupId: groupId.value,
    })
    message.success('试评会话已创建')
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
  margin-bottom: 12px;
}
</style>
