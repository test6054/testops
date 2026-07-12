<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench">
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
            v-if="canManageOrganization"
            variant="primary"
            size="sm"
            :disabled="!canCreateSession"
            :title="sessionCreateWorkflow.disabledTooltip"
            @click="createDialogOpen = true"
          >
            创建试评
          </UiButton>
          <UiButton variant="outline" size="sm" @click="goFormalSessions"> 正评会话 </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="organization && signalMetrics.length > 0" #signal>
      <SignalBand variant="tiles" :metrics="signalMetrics" compact />
    </template>

    <ExamWorkspaceJourneySubNav v-if="isExamWorkspaceRoute" />

    <UiAlertStrip
      v-if="organization && canManageOrganization && sessionCreateReadinessLoadFailed"
      tone="error"
      dense
      title="试评创建条件加载失败"
      description="创建条件暂时不可用，请返回后重新进入本页。"
      class="org-sessions__readiness-error"
    />

    <WorkflowReadinessPanel
      v-if="
        organization &&
        canManageOrganization &&
        !canCreateSession &&
        !sessionCreateReadinessLoadFailed &&
        sessionCreateWorkflow.steps.length
      "
      :title="sessionCreateWorkflow.panelTitle"
      :steps="sessionCreateWorkflow.steps"
      :metrics="sessionCreateWorkflow.metrics"
    />

    <UiSkeletonState v-if="initialLoading && !organization" variant="card" compact />

    <UiEmpty v-else-if="!organization" description="暂无阅卷组织数据" class="org-sessions__empty" />

    <TrialSessionWorkbench
      v-else
      :sessions="trialSessions"
      :group-options="groupOptions"
      :filter-model="sessionFilterModel"
      :pagination="sessionPagination"
      :loading="sessionsLoading"
      :can-manage="canManageOrganization"
      :create-blocked="canManageOrganization && sessionCreateReadinessLoaded && !canCreateSession"
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
      :can-manage="canManageOrganization"
      @success="onTrialSessionsChanged"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { LifecycleAction } from './components/SessionLifecycleReasonModal.vue'
import SessionLifecycleReasonModal from './components/SessionLifecycleReasonModal.vue'
import { ref } from 'vue'
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
import TrialSessionCreateDialog from './components/TrialSessionCreateDialog.vue'
import TrialSessionWorkbench from './components/TrialSessionWorkbench.vue'

defineOptions({ name: 'AdminMarkingOrganizationTrialSessions' })

const { isJourneyChrome, examStatusLabel, examStatusTone } =
  useOptionalExamJourneyContextBar('试评定标')

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
  signalMetrics,
  guardOrganizationOwnerAction,
  sessionPagination,
  sessionFilterModel,
  applySessionFilter,
  resetSessionFilter,
  handleSessionPageChange,
  onTrialSessionsChanged,
} = useMarkingOrgSessionWorkspace('trial')

const createDialogOpen = ref(false)
const lifecycleModalOpen = ref(false)
const lifecycleAction = ref<LifecycleAction | null>(null)
const lifecycleSessionId = ref('')

function openLifecycleModal(action: LifecycleAction, sessionId: string): void {
  if (!guardOrganizationOwnerAction()) {
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
  padding: 48px 0;
}
</style>
