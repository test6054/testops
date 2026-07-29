<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="正评会话" :subtitle="`${formalSessions.length} 个会话`">
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
            创建正评
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goTrialSessions"> 试评定标 </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="organization && signalMetrics.length > 0" #signal>
      <SignalBand layout="spotlight" :metrics="signalMetrics" variant="panel" compact />
    </template>

    <ExamWorkspaceJourneySubNav v-if="isExamWorkspaceRoute" />

    <UiAlertStrip
      v-if="organizationLoadFailed === true"
      tone="error"
      dense
      title="阅卷组织加载失败"
      class="org-sessions__readiness-error"
    />

    <UiAlertStrip
      v-if="organization && summaryLoadFailed === true"
      tone="error"
      dense
      title="正评会话汇总加载失败"
      class="org-sessions__readiness-error"
    />

    <UiAlertStrip
      v-if="organization && sessionsLoadFailed === true"
      tone="error"
      dense
      title="正评会话列表加载失败"
      class="org-sessions__readiness-error"
    />

    <UiAlertStrip
      v-if="organization && canManageOrganization === true && sessionCreateReadinessLoadFailed === true"
      tone="error"
      dense
      title="正评创建条件加载失败"
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

    <UiSkeletonState v-if="initialLoading && !organization && !organizationLoadFailed" variant="card" compact />

    <UiEmpty
      size="sm"
      v-else-if="organizationLoadFailed && !organization"
      description="阅卷组织加载失败"
      class="org-sessions__empty"
    />

    <UiEmpty size="sm" v-else-if="!organization" description="暂无阅卷组织数据" class="org-sessions__empty" />

    <FormalSessionWorkbench
      v-else
      :organization-id="organizationId"
      :exam-id="organization?.examId"
      :sessions="formalSessions"
      :group-options="groupOptions"
      :filter-model="sessionFilterModel"
      :pagination="sessionPagination"
      :loading="sessionsLoading"
      :sessions-load-failed="sessionsLoadFailed"
      :can-manage="canManageOrganization"
      :can-close-marking-sessions="canCloseMarkingSessions"
      :create-blocked="canManageOrganization === true && sessionCreateReadinessLoaded === true && canCreateSession !== true"
      :prerequisite-empty="sessionCreateWorkflow.emptyState"
      @search="applySessionFilter"
      @reset="resetSessionFilter"
      @page-change="handleSessionPageChange"
      @refresh="onFormalSessionsChanged"
      @open-lifecycle="openLifecycleModal"
    />

    <FormalSessionCreateDialog
      v-model:open="createDialogOpen"
      :organization-id="organizationId"
      :group-options="creatableGroupOptions"
      :group-allocation-units="groupAllocationUnitMap"
      :group-create-readiness-map="groupCreateReadinessMap"
      :group-allocation-policy-map="groupAllocationPolicyMap"
      :session-readiness="sessionCreateReadiness"
      :can-manage="canManageOrganization"
      @success="onFormalSessionsChanged"
    />

    <SessionLifecycleReasonModal
      v-model:open="lifecycleModalOpen"
      :action="lifecycleAction"
      :session-id="lifecycleSessionId"
      :target-summary="lifecycleTargetSummary"
      :can-manage="lifecycleModalCanManage"
      @success="onFormalSessionsChanged"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
// MVR-947：模板本地 can* 显隐/禁用仅认 === true（完整 token）
// MVR-945：canManage* 控制流仅认 === true
import type {
  LifecycleAction,
  SessionLifecycleTargetSummary,
} from './components/SessionLifecycleReasonModal.vue'
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  FormalSessionStatusDescription,
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
import { resolveMarkingOrganizationTrialSessionsRoute } from '@/utils/marking-organization-navigation'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import FormalSessionCreateDialog from './components/FormalSessionCreateDialog.vue'
import FormalSessionWorkbench from './components/FormalSessionWorkbench.vue'
import SessionLifecycleReasonModal from './components/SessionLifecycleReasonModal.vue'

defineOptions({ name: 'AdminMarkingOrganizationFormalSessions' })

const { isJourneyChrome, examStatusLabel, examStatusTone }
  = useOptionalExamJourneyContextBar('正评会话')

const router = useRouter()
const {
  organizationId,
  isExamWorkspaceRoute,
  organization,
  formalSessions,
  initialLoading,
  sessionsLoading,
  organizationLoadFailed,
  sessionsLoadFailed,
  summaryLoadFailed,
  groupOptions,
  creatableGroupOptions,
  groupAllocationUnitMap,
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
  onFormalSessionsChanged,
} = useMarkingOrgSessionWorkspace('formal')

const createDialogOpen = ref(false)

/** MVR-397：创建正评打开前叠主考∧canCreateSession，禁止仅靠按钮 disabled */
function openCreateDialog(): void {
  if (!guardOrganizationOwnerAction()) {
    return
  }
  if (canCreateSession.value !== true) {
    void message.warning(sessionCreateWorkflow.value.disabledTooltip || `当前不可创建正评会话`)
    return
  }
  createDialogOpen.value = true
}

const lifecycleModalOpen = ref(false)
const lifecycleAction = ref<LifecycleAction | null>(null)
const lifecycleSessionId = ref('')
const lifecycleTargetSummary = ref<SessionLifecycleTargetSummary | null>(null)

/** MVR-398：关闭动作认 canCloseMarkingSessions；暂停等 ACTIVE 写认 canManageOrganization */
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
  const session = formalSessions.value.find((item) => item.id === sessionId)
  lifecycleAction.value = action
  lifecycleSessionId.value = sessionId
  lifecycleTargetSummary.value = {
    sessionId,
    groupName: session?.groupName ?? '—',
    phaseLabel: '正评',
    statusLabel: session
      ? strictEnumLabel(FormalSessionStatusDescription, session.sessionStatus, '正评会话状态')
      : '—',
    finalizedTaskCount:
      typeof session?.finalizedTaskCount === 'number' ? session.finalizedTaskCount : null,
    totalTaskCount: typeof session?.totalTaskCount === 'number' ? session.totalTaskCount : null,
  }
  lifecycleModalOpen.value = true
}

function goTrialSessions(): void {
  const examId = organization.value?.examId
  if (!examId || !organizationId.value) {
    return
  }
  void router.push(resolveMarkingOrganizationTrialSessionsRoute(organizationId.value, examId))
}
</script>

<style lang="scss" scoped>
.org-sessions__empty {
  padding: var(--dp-space-block) 0;
}
</style>
