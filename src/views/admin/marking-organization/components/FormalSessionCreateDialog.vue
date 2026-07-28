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
      title="正评须先完成试评校准"
      description="本题组完成试评定标后才可创建正评；创建后在列表中启动，题目范围与任务单元在启动时按策略固化。"
      class="formal-create-dialog__hint"
    />
    <UiForm layout="vertical">
      <UiFormItem
        label="选择题组"
        required
        :validate-status="groupFieldError ? 'error' : undefined"
        :help="groupFieldError || undefined"
      >
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
      <UiFormItem
        label="批阅任务单元"
        required
        :validate-status="allocationUnitFieldError ? 'error' : undefined"
        :help="allocationUnitFieldError || undefined"
      >
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
import { useRouter } from 'vue-router'
import { ALLOCATION_UNIT_OPTIONS, createFormalSession } from '@/apis/mark/marking-organization'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { WorkflowBlockingItemCode } from '@/components/workbench/workflow-readiness/types'
import { blockingItemsToWorkflowSteps, mergeBlockingItemsByCode } from '@/components/workbench/workflow-readiness/workflow-blocking-items'
import WorkflowReadinessPanel from '@/components/workbench/workflow-readiness/WorkflowReadinessPanel.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { resolveMarkingOrganizationTrialSessionsRoute } from '@/utils/marking-organization-navigation'
import { readFormalSessionStartBlocking } from '@/utils/marking-workflow-conflict'
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

const router = useRouter()
const groupId = ref<string | undefined>(undefined)
const allocationUnit = ref<AllocationUnitCode | undefined>(undefined)
const submitting = ref(false)
const groupFieldError = ref('')
const allocationUnitFieldError = ref('')


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
  // 考试级阻断（复核/经验辅助）与题组级阻断合并展示，避免 canCreate=false 但步骤空白
  const items = mergeBlockingItemsByCode(
    props.sessionReadiness?.blockingItems,
    selectedGroupReadiness.value?.blockingItems,
  )
  if (!items.length) {
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
      groupFieldError.value = ''
      allocationUnitFieldError.value = ''
      return
    }
    groupFieldError.value = ''
    allocationUnitFieldError.value = ''
    if (props.groupOptions.length === 1) {
      groupId.value = props.groupOptions[0].value
      syncAllocationUnitFromGroup(props.groupOptions[0].value)
    }
  },
)

watch(groupId, (nextGroupId) => {
  groupFieldError.value = ''
  allocationUnitFieldError.value = ''
  syncAllocationUnitFromGroup(nextGroupId)
})

watch(allocationUnit, () => {
  allocationUnitFieldError.value = ''
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
  if (!props.organizationId) {
    showFormValidationMessage('缺少阅卷组织，无法创建正评会话')
    return
  }
  if (!groupId.value) {
    groupFieldError.value = '请选择题组'
    showFormValidationMessage('请选择题组')
    return
  }
  if (selectedGroupCanCreate.value !== true) {
    groupFieldError.value = '所选题组当前不可创建正评会话'
    showFormValidationMessage('所选题组当前不可创建正评会话')
    return
  }
  if (!allocationUnit.value) {
    allocationUnitFieldError.value = '请选择批阅任务单元'
    showFormValidationMessage('请选择批阅任务单元')
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
    handleFormalCreateError(error)
  } finally {
    submitting.value = false
  }
}

/**
 * 创建与启动同源：CONFLICT 携带 FormalSessionStartBlocking（blockingCode=WorkflowBlockingItemCode），引导主考去定标或复核。
 * 试评校准门禁须带 organizationId，与就绪度面板 routeParams 同源，禁止只推 examId 落到缺参路由。
 */
function handleFormalCreateError(error: unknown): void {
  const detail = getUserErrorMessage(error, '无法创建正评会话')
  const blocking = readFormalSessionStartBlocking(error)
  if (blocking) {
    const examId = props.sessionReadiness?.examId
    if (!examId) {
      showUserError(error, '无法创建正评：缺少考试上下文，请从考试工作台重新进入')
      return
    }
    if (!props.organizationId) {
      showUserError(error, '无法创建正评：缺少阅卷组织上下文，请刷新后重试')
      return
    }
    void confirmAsync({
      title: '无法创建正评会话',
      content: detail,
      type: 'warning',
      okText: blocking.actionLabel,
      cancelText: '关闭',
      onOk: () => {
        emit('update:open', false)
        if (blocking.blockingCode === WorkflowBlockingItemCode.TRIAL_CALIBRATION_REQUIRED) {
          void router.push(resolveMarkingOrganizationTrialSessionsRoute(props.organizationId, examId))
          return
        }
        void router.push({
          name: blocking.workspaceRouteName,
          params: { examId, organizationId: props.organizationId },
        })
      },
    })
    return
  }
  showUserError(error, '创建正评会话失败')
}
</script>

<style lang="scss" scoped>
.formal-create-dialog__hint {
  margin-bottom: var(--dp-space-component);
}
</style>
