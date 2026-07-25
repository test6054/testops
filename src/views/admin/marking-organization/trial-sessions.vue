<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="试评定标">
        <template #status>
          <UiTag v-if="isJourneyChrome && examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <UiTag
            v-if="organization?.organizationStatus"
            :tone="
              strictEnumTone(
                MARKING_ORGANIZATION_STATUS_TONE,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            "
            size="sm"
          >
            {{
              strictEnumLabel(
                MarkingOrganizationStatusDescription,
                organization.organizationStatus,
                '阅卷组织状态',
              )
            }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="canManageOrganization === true"
            variant="primary"
            size="sm"
            :disabled="canCreateSession !== true"
            :title="sessionCreateWorkflow.disabledTooltip"
            @click="openCreateDialog"
          >
            创建试评
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goFormalSessions"> 正评会话 </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="organization && signalMetrics.length > 0" #signal>
      <SignalBand :metrics="signalMetrics" variant="panel" compact />
    </template>

    <ExamWorkspaceJourneySubNav v-if="isExamWorkspaceRoute" />

    <UiAlertStrip
      v-if="organization && canManageOrganization === true && sessionCreateReadinessLoadFailed"
      tone="error"
      dense
      title="试评创建条件加载失败"
      description="创建条件暂时不可用，请返回后重新进入本页。"
      class="org-sessions__readiness-error"
    />

    <WorkflowReadinessPanel
      v-if="
        organization
          && canManageOrganization === true
          && canCreateSession !== true
          && !sessionCreateReadinessLoadFailed
          && sessionCreateWorkflow.steps.length
      "
      :title="sessionCreateWorkflow.panelTitle"
      :steps="sessionCreateWorkflow.steps"
      :metrics="sessionCreateWorkflow.metrics"
    />

    <UiSkeletonState v-if="initialLoading && !organization" variant="card" compact />

    <UiEmpty size="sm" v-else-if="!organization" description="暂无阅卷组织数据" class="org-sessions__empty" />

    <TrialSessionWorkbench
      v-else
      :sessions="trialSessions"
      :group-options="groupOptions"
      :filter-model="sessionFilterModel"
      :pagination="sessionPagination"
      :loading="sessionsLoading"
      :can-manage="canManageOrganization"
      :can-close-marking-sessions="canCloseMarkingSessions"
      :create-blocked="canManageOrganization === true && sessionCreateReadinessLoaded === true && canCreateSession !== true"
      :prerequisite-empty="sessionCreateWorkflow.emptyState"
      @search="applySessionFilter"
      @reset="resetSessionFilter"
      @page-change="handleSessionPageChange"
      @refresh="onTrialSessionsChanged"
      @open-lifecycle="openLifecycleModal"
    />

    <TrialSessionCreateDialog
      v-model:open="createDialogOpen"
      :organization-id="organizationId"
      :group-options="creatableGroupOptions"
      :group-has-allocation-policy-map="groupHasAllocationPolicyMap"
      :group-create-readiness-map="groupCreateReadinessMap"
      :group-allocation-policy-map="groupAllocationPolicyMap"
      :session-readiness="sessionCreateReadiness"
      :can-manage="canManageOrganization"
      @success="onTrialSessionsChanged"
    />

    <SessionLifecycleReasonModal
      v-model:open="lifecycleModalOpen"
      :action="lifecycleAction"
      :session-id="lifecycleSessionId"
      :can-manage="lifecycleModalCanManage"
      @success="onTrialSessionsChanged"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
// MVR-945：canManage* 控制流仅认 === true
import type { LifecycleAction } from './components/SessionLifecycleReasonModal.vue'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  MARKING_ORGANIZATION_STATUS_TONE,
  MarkingOrganizationStatusDescription,
} from '@/apis/mark/marking-organization'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkflowReadinessPanel from '@/components/workbench/workflow-readiness/WorkflowReadinessPanel.vue'
import { useOptionalExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkingOrgSessionWorkspace } from '@/composables/useMarkingOrgSessionWorkspace'
import { resolveMarkingOrganizationFormalSessionsRoute } from '@/utils/marking-organization-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import SessionLifecycleReasonModal from './components/SessionLifecycleReasonModal.vue'
import TrialSessionCreateDialog from './components/TrialSessionCreateDialog.vue'
import TrialSessionWorkbench from './components/TrialSessionWorkbench.vue'

defineOptions({ name: 'AdminMarkingOrganizationTrialSessions' })

const { isJourneyChrome, examStatusLabel, examStatusTone }
  = useOptionalExamJourneyContextBar('试评定标')

const router = useRouter()
const {
  organizationId,
  isExamWorkspaceRoute,
  organization,
  trialSessions,
  initialLoading,
  sessionsLoading,
  groupOptions,
  creatableGroupOptions,
  groupHasAllocationPolicyMap,
  groupCreateReadinessMap,
  groupAllocationPolicyMap,
  sessionCreateReadiness,
  canCreateSession,
  sessionCreateReadinessLoaded,
  sessionCreateReadinessLoadFailed,
  sessionCreateWorkflow,
  canManageOrganization,
  canCloseMarkingSessions,
  signalMetrics,
  guardOrganizationOwnerAction,
  guardCloseMarkingSessionAction,
  sessionPagination,
  sessionFilterModel,
  applySessionFilter,
  resetSessionFilter,
  handleSessionPageChange,
  onTrialSessionsChanged,
} = useMarkingOrgSessionWorkspace('trial')

const createDialogOpen = ref(false)

/** MVR-397：创建试评打开前叠主考∧canCreateSession，禁止仅靠按钮 disabled */
function openCreateDialog(): void {
  if (!guardOrganizationOwnerAction()) {
    return
  }
  if (canCreateSession.value !== true) {
    void message.warning(sessionCreateWorkflow.value.disabledTooltip || `当前不可创建试评会话`)
    return
  }
  createDialogOpen.value = true
}

const lifecycleModalOpen = ref(false)
const lifecycleAction = ref<LifecycleAction | null>(null)
const lifecycleSessionId = ref('')

/** MVR-398：关闭动作认 canCloseMarkingSessions；其它写认 canManageOrganization */
const lifecycleModalCanManage = computed(() => {
  if (lifecycleAction.value === 'closeFormal' || lifecycleAction.value === 'closeTrial') {
    return canCloseMarkingSessions.value === true
  }
  return canManageOrganization.value === true
})

function openLifecycleModal(action: LifecycleAction, sessionId: string): void {
  if (action === 'closeFormal' || action === 'closeTrial') {
    if (!guardCloseMarkingSessionAction()) {
      return
    }
  } else if (!guardOrganizationOwnerAction()) {
    return
  }
  lifecycleAction.value = action
  lifecycleSessionId.value = sessionId
  lifecycleModalOpen.value = true
}

function goFormalSessions(): void {
  const examId = organization.value?.examId
  if (!examId || !organizationId.value) {
    return
  }
  void router.push(resolveMarkingOrganizationFormalSessionsRoute(organizationId.value, examId))
}
</script>

<style lang="scss" scoped>
.org-sessions__empty {
  padding: 20px 0;
}
</style>
