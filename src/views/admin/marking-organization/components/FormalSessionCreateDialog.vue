<template>
  <UiDialog
    :open="open"
    title="创建正评会话"
    :width="560"
    :confirm-loading="submitting === true"
    ok-text="创建"
    @update:open="emit('update:open', $event)"
    @ok="submit"
  >
    <UiAlertStrip
      tone="info"
      dense
      title="正评会话启动后教师批阅生效"
      description="创建后在列表中启动正评；题目范围与任务单元在启动时按策略固化。"
      class="formal-create-dialog__hint"
    />
    <UiForm layout="vertical">
      <UiFormItem label="选择题组" required>
        <UiSelect v-model="groupId" placeholder="选择参加正评的题组" :options="groupOptions" />
      </UiFormItem>
      <SessionGroupCreateSummary
        v-if="groupId"
        phase="formal"
        :policy="selectedGroupPolicy"
        :group-readiness="selectedGroupReadiness"
        :session-readiness="sessionReadiness"
      />
      <WorkflowReadinessPanel
        v-if="groupId && selectedGroupCanCreate !== true && selectedGroupWorkflowSteps.length"
        title="该题组创建前还需完成"
        :steps="selectedGroupWorkflowSteps"
      />
      <UiFormItem label="批阅任务单元" required>
        <UiSelect
          v-model="allocationUnit"
          placeholder="选择正评任务拆分方式"
          :options="ALLOCATION_UNIT_OPTIONS"
          :disabled="selectedGroupCanCreate !== true"
        />
      </UiFormItem>
    </UiForm>
  </UiDialog>
</template>

<script lang="ts" setup>
import type {
  AllocationPolicyResponse,
  AllocationUnitCode,
  SessionCreateReadinessResponse,
  SessionGroupCreateReadinessResponse,
} from '@/apis/mark/marking-organization'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { ALLOCATION_UNIT_OPTIONS, createFormalSession } from '@/apis/mark/marking-organization'
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

defineOptions({ name: 'FormalSessionCreateDialog' })

const props = withDefaults(
  defineProps<{

  open: boolean
  organizationId: string
  groupOptions: GroupOption[]
  groupAllocationUnits?: Record<string, AllocationUnitCode>
  groupCreateReadinessMap?: Record<string, SessionGroupCreateReadinessResponse>
  groupAllocationPolicyMap?: Record<string, AllocationPolicyResponse>
  sessionReadiness?: SessionCreateReadinessResponse | null
  canManage?: boolean // MVR-945：会话/试评管理写仅认 === true
}>(),
  {
  canManage: false,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  "success": [sessionId: string]
}>()

const groupId = ref<string | undefined>(undefined)
const allocationUnit = ref<AllocationUnitCode | undefined>(undefined)
const submitting = ref(false)


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

function syncAllocationUnitFromGroup(nextGroupId?: string): void {
  if (!nextGroupId) {
    allocationUnit.value = undefined
    return
  }
  allocationUnit.value = props.groupAllocationUnits?.[nextGroupId]
}

watch(
  () => props.open,
  (nextOpen) => {
    if (!nextOpen) {
      groupId.value = undefined
      allocationUnit.value = undefined
      return
    }
    if (props.groupOptions.length === 1) {
      groupId.value = props.groupOptions[0].value
      syncAllocationUnitFromGroup(props.groupOptions[0].value)
    }
  },
)

watch(groupId, (nextGroupId) => {
  syncAllocationUnitFromGroup(nextGroupId)
})

watch(
  () => props.groupAllocationUnits,
  () => {
    syncAllocationUnitFromGroup(groupId.value)
  },
  { deep: true },
)

async function submit(): Promise<void> {
  if (props.canManage !== true) {
    showFormValidationMessage('仅考试主考老师可管理正评会话')
    return
  }
  if (
    !props.organizationId
    || !groupId.value
    || !allocationUnit.value
    || selectedGroupCanCreate.value !== true
  ) {
    return
  }
  if (submitting.value === true) return
  submitting.value = true
  try {
    const sessionId = await createFormalSession({
      organizationId: props.organizationId,
      groupId: groupId.value,
      allocationUnit: allocationUnit.value,
    })
    void message.success('正评会话已创建')
    emit('update:open', false)
    emit('success', sessionId)
  } catch (error) {
    showUserError(error, '创建正评会话失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.formal-create-dialog__hint {
  margin-bottom: 12px;
}
</style>
