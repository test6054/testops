<template>
  <div class="archive-volume-detail">
    <UiSkeletonState
      v-if="loading"
      variant="card"
      :card-count="2"
      compact
      class="archive-volume-detail__loading"
    />

    <template v-else-if="detail">
      <UiAlertStrip tone="info" dense class="archive-volume-detail__alert">
        本页为<strong>课程考核归档材料</strong>，用于本科教学评估迎检。OBE 达成度、间接评价与认证证据请在
        <RouterLink :to="{ name: 'QualityDashboard' }">「质量评价」</RouterLink>
        工作台处理。
      </UiAlertStrip>
      <UiAlertStrip
        v-if="detail.capabilityDeniedHint"
        tone="info"
        title="协作权限说明"
        :description="detail.capabilityDeniedHint"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="submitChecklistLoadError"
        tone="warning"
        title="提交待办清单加载失败"
        :description="submitChecklistLoadError"
        dense
        inline
        class="archive-volume-detail__alert"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" @click="() => loadSubmitChecklist()">
            重新加载
          </UiButton>
        </template>
      </UiAlertStrip>
      <UiAlertStrip
        v-if="grantsLoadFailed"
        tone="warning"
        title="岗位职责加载失败"
        description="鉴定、销毁与查阅审批操作不可用"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="
          detail.volume.integrityStatus === ArchiveIntegrityStatusCode.UNKNOWN
            || detail.volume.integrityStatus === ArchiveIntegrityStatusCode.FAILED
        "
        tone="warning"
        title="请先执行完整性自检"
        description="完整性未通过前无法提交归档"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="
          !detail.latestFourPropertyCheck
            && detail.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
        "
        tone="warning"
        title="尚未执行四性检测"
        description="提交归档前须完成四性检测"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-else-if="detail.fourPropertyStale"
        tone="warning"
        title="四性结论已失效"
        description="四性结论已失效，请确认密级定密后重新执行四性检测"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-else-if="showSecurityFourPropertyAlert"
        tone="warning"
        title="四性检测: 安全性未通过"
        :description="securityFourPropertyDescription"
        dense
        inline
        class="archive-volume-detail__alert"
      >
        <template v-if="activeTab !== 'integrity'" #actions>
          <UiButton size="sm" variant="primary" @click="setActiveTab('integrity')">
            去定密确认
          </UiButton>
        </template>
      </UiAlertStrip>
      <UiAlertStrip
        v-else-if="showReliabilityFourPropertyAlert"
        tone="warning"
        title="四性检测: 可靠性未通过"
        :description="reliabilityFourPropertyDescription"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-else-if="
          detail.latestFourPropertyCheck
            && !detail.latestFourPropertyCheck.overallPassed
            && detail.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
        "
        tone="warning"
        title="四性检测未通过"
        description="请先补正材料并重新执行四性检测"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="scoreSubmitBlockReason"
        tone="warning"
        :title="scoreSubmitBlockReason"
        description="成绩证明未满足提交前置条件"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="showRemediationWorkflowStrip"
        tone="warning"
        title="迎评整改进行中"
        :description="remediationOpenDescription"
        dense
        inline
        class="archive-volume-detail__alert"
      >
        <template v-if="focusedRemediationTask" #meta>
          <UiTag :tone="remediationStatusTone(focusedRemediationTask.taskStatus)" size="sm">
            {{ remediationStatusLabel(focusedRemediationTask.taskStatus) }}
          </UiTag>
          <UiTag v-if="focusedRemediationTask.diagnosticCode" tone="red" size="sm">
            {{ remediationDiagnosticLabel(focusedRemediationTask.diagnosticCode) }}
          </UiTag>
          <span
            v-if="focusedRemediationAssigneeLabel"
            class="archive-volume-detail__remediation-assignee"
          >
            责任人 {{ focusedRemediationAssigneeLabel }}
          </span>
        </template>
        <template #actions>
          <UiButton size="sm" variant="primary" @click="setActiveTab(focusedRemediationTargetTab)">
            {{ focusedRemediationPrimaryLabel }}
          </UiButton>
          <UiButton
            v-if="
              canAdvanceRemediation
                && focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.OPEN
            "
            size="sm"
            variant="outline"
            :loading="remediationUpdating"
            @click="advanceRemediation(ArchiveRemediationStatusCode.IN_PROGRESS)"
          >
            开始处理
          </UiButton>
          <UiButton
            v-if="
              canAdvanceRemediation
                && focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS
            "
            size="sm"
            variant="outline"
            :loading="remediationUpdating"
            @click="advanceRemediation(ArchiveRemediationStatusCode.RESUBMITTED)"
          >
            标记已重提
          </UiButton>
          <UiButton
            v-if="
              canManageCoordinatorRemediation
                && focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.OPEN
            "
            size="sm"
            variant="outline"
            :loading="remediationUpdating"
            @click="advanceRemediation(ArchiveRemediationStatusCode.IN_PROGRESS)"
          >
            开始处理
          </UiButton>
          <UiButton
            v-if="
              canManageCoordinatorRemediation
                && focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS
            "
            size="sm"
            variant="outline"
            :loading="remediationUpdating"
            @click="advanceRemediation(ArchiveRemediationStatusCode.RESUBMITTED)"
          >
            标记已重提
          </UiButton>
          <UiButton
            v-if="
              canManageCoordinatorRemediation
                && focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED
            "
            size="sm"
            variant="outline"
            :loading="remediationUpdating"
            @click="advanceRemediation(ArchiveRemediationStatusCode.CLOSED)"
          >
            复检关闭
          </UiButton>
          <UiButton
            v-if="
              canManageCoordinatorRemediation
                && (focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.OPEN
                  || focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS)
            "
            size="sm"
            variant="ghost"
            :loading="remediationUpdating"
            @click="advanceRemediation(ArchiveRemediationStatusCode.CLOSED)"
          >
            关闭
          </UiButton>
        </template>
      </UiAlertStrip>
      <UiAlertStrip
        v-if="showAppraisalGuidanceStrip"
        tone="warning"
        title="鉴定待办"
        :description="appraisalGuidanceDescription"
        dense
        class="archive-volume-detail__alert"
      >
        <template #actions>
          <UiButton size="sm" variant="primary" @click="setActiveTab('appraisal')">
            进入鉴定管理
          </UiButton>
        </template>
      </UiAlertStrip>

      <ArchiveVolumeCollaboratorStrip
        v-if="detail?.collaborators?.length"
        :collaborators="detail.collaborators"
        :can-manage="detailScope.canManageCollaborators"
        @manage="memberDrawerOpen = true"
      />

      <p v-if="detail" class="archive-volume-detail__meta">
        {{ sourceTypeLabel(detail.volume.sourceType) }}
        <span v-if="detail.volume.teachingClassName"> · {{ detail.volume.teachingClassName }}</span>
        <span v-if="detail.volume.departmentName"> · {{ detail.volume.departmentName }}</span>
        <span v-if="detailScope.isCollaborator"> · 协作归档材料</span>
      </p>

      <ArchiveFlowContextBar
        :chain-steps="flowChainSteps"
        :active-tab="activeTab"
        :title="detail.volume.archiveTitle || detail.volume.archiveNo"
        :subtitle="contextBarSubtitle"
        :show-pipeline="showPostCollectFlowNav"
        @tab-change="setActiveTab"
        @back-to-list="goBack"
      >
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="taskSettingsOpen = true">任务设置</UiButton>
          <UiButton variant="ghost" size="sm" @click="goVolumeSearch">卷内检索</UiButton>
          <UiButton
            v-if="detailScope.canRunIntegrityCheck"
            variant="outline"
            size="sm"
            :loading="checkingIntegrity"
            @click="runIntegrityCheck"
          >
            完整性自检
          </UiButton>
          <UiButton
            v-if="detailScope.showSelfCheckButton"
            variant="outline"
            size="sm"
            @click="selfCheckModalOpen = true"
          >
            提交前自查
          </UiButton>
          <UiButton
            v-if="detailScope.canStartCollecting"
            variant="primary"
            size="sm"
            :loading="startingCollecting"
            @click="handleStartCollecting"
          >
            开始收材
          </UiButton>
          <UiButton
            v-if="detailScope.showSubmitActions && !detailScope.canSubmitVolume"
            variant="outline"
            size="sm"
            disabled
            :title="detailScope.submitActionDisabledHint ?? submitBlockReason ?? undefined"
          >
            提交归档
          </UiButton>
          <UiButton
            v-if="detailScope.canSubmitVolume"
            variant="primary"
            size="sm"
            :loading="submitting"
            @click="handleSubmit"
          >
            提交归档
          </UiButton>
          <UiButton
            v-if="detailScope.canRejectCollection"
            variant="outline"
            size="sm"
            @click="collectionRejectOpen = true"
          >
            驳回收材
          </UiButton>
          <UiButton
            v-if="canExportManifest"
            variant="outline"
            size="sm"
            :loading="exporting"
            @click="handleExport"
          >
            导出 manifest
          </UiButton>
        </template>
      </ArchiveFlowContextBar>

      <ArchiveLifecyclePipe
        v-if="collectPhaseLifecycleView"
        class="archive-volume-detail__lifecycle"
        title="提交前主链"
        embedded
        :steps="collectPhaseLifecycleView.steps"
        :completed-count="collectPhaseLifecycleView.completedCount"
        :total-count="collectPhaseLifecycleView.totalCount"
      />

      <ArchiveVolumeSubmitProgressBand
        v-if="detail.submitProgress"
        :progress="detail.submitProgress"
        :can-submit-volume="detailScope.canSubmitVolume"
        :blocking-items="submitBlockingItems"
        @navigate="handleSubmitChecklistNavigate"
      />

      <WorkbenchSurfaceCard flush class="archive-volume-detail__panel-surface">
        <DigitalMaterialConfirmPanel
          v-if="detail && activeTab === 'materials'"
          :volume-id="volumeId"
          :detail="detail"
          @refreshed="loadDetail"
        />
        <WorkbenchSurfaceCard
          v-if="activeTab === 'materials'"
          flush
          class="archive-volume-detail__panel"
        >
          <ArchiveVolumeCatalogEditor
            :volume-id="volumeId"
            :catalog-status="detail.catalogStatus"
            :readonly="!detailScope.canEditCatalog"
            class="archive-volume-detail__catalog-editor"
            @refreshed="loadDetail"
          />
          <div class="archive-volume-detail__catalog">
            <ArchiveVolumeMaterialTreePanel
              v-model:selected-keys="selectedCatalogKeys"
              :volume-id="volumeId"
              :missing-items="detail.latestIntegrityCheck?.missingItems ?? []"
              :catalog-status="detail.catalogStatus"
            />
            <ArchiveVolumeMaterialTablePanel
              :volume-id="volumeId"
              :detail="detail"
              :selected-catalog-keys="selectedCatalogKeys"
              :can-register-material="detailScope.canRegisterMaterial"
              @refreshed="(opts) => loadDetail(opts)"
              @ocr-completed-stale="handleMaterialOcrCompleted"
            />
          </div>
        </WorkbenchSurfaceCard>

        <ArchiveVolumeScoresPanel
          v-else-if="activeTab === 'scores'"
          :volume-id="volumeId"
          :detail="detail"
          :can-confirm-score-completion="canConfirmScoreCompletion"
          :can-sync-teaching-affairs="canSyncTeachingAffairs"
          @refreshed="loadDetail"
        />

        <ArchiveVolumeIntegrityPanel
          v-else-if="activeTab === 'integrity'"
          :volume-id="volumeId"
          :detail="detail"
          :displayed-integrity-result="displayedIntegrityResult"
          :displayed-four-property="displayedFourProperty"
          :checking-integrity="checkingIntegrity"
          :can-allow-material-delay="canAllowMaterialDelay"
          :can-waive-material-missing="canWaiveMaterialMissing"
          :can-waive-integrity="canWaiveIntegrity"
          :can-edit-self-check="detailScope.canEditSelfCheck"
          @run-integrity-check="runIntegrityCheck"
          @refreshed="loadDetail"
          @integrity-checked="integrityResult = $event"
          @four-property-checked="fourPropertyResult = $event"
          @open-sign-off="selfCheckModalOpen = true"
        />

        <DepartmentReviewPanel
          v-else-if="activeTab === 'department-review'"
          :volume-id="volumeId"
          :detail="detail"
          @refreshed="loadDetail"
          @navigate-tab="setActiveTab"
        />

        <ArchiveVolumeTransferPanel
          v-else-if="activeTab === 'transfer'"
          :volume-id="volumeId"
          :detail="detail"
          :can-review-transfer="canReviewTransfer"
          :can-reject-transfer="canRejectTransfer"
          @refreshed="loadDetail"
        />

        <ArchiveVolumeAccessPanel
          v-else-if="activeTab === 'access'"
          :volume-id="volumeId"
          :can-request-access="canRequestAccess"
          :can-approve-access-record="canApproveAccessRecord"
          :current-user-id="currentUserId"
        />

        <ArchiveVolumeAppraisalPanel
          v-else-if="activeTab === 'appraisal'"
          :volume-id="volumeId"
          :detail="detail"
          :can-manage-appraisal="canManageAppraisal"
          :can-approve-destruction="canApproveDestruction"
          :current-user-id="currentUserId"
          @refreshed="loadDetail"
        />

        <ArchiveVolumeEventsPanel
          v-else-if="activeTab === 'events'"
          :volume-id="volumeId"
          :events="detail.events"
        />

        <ArchiveVolumePhysicalLocationPanel
          v-else-if="activeTab === 'storage'"
          :volume-id="volumeId"
          :detail="detail"
          :can-edit="canEditPhysicalLocation"
          @refreshed="loadDetail"
        />

        <ArchiveScanBatchSnapshotPanel
          v-else-if="activeTab === 'scan-batches'"
          :volume-id="volumeId"
        />

        <ArchiveScanBatchReviewPanel
          v-else-if="activeTab === 'scan-review'"
          :volume-id="volumeId"
          :can-review="canReviewScanBatches"
          @refreshed="loadDetail"
        />
      </WorkbenchSurfaceCard>

      <ArchiveVolumeNextStepsPanel
        v-if="nextStepActions.length"
        :actions="nextStepActions"
        :exam-id="detail.volume.examId"
        :volume-id="volumeId"
        @tab-change="setActiveTab"
      />
    </template>

    <UiEmpty v-else description="加载归档任务详情失败" />

    <TaskSettingsDrawer
      v-if="detail"
      v-model:open="taskSettingsOpen"
      :detail="detail"
      :can-manage-collaborators="detailScope.canManageCollaborators"
      :can-update-archive-due-time="detailScope.capabilities.canUpdateArchiveDueTime === true"
      @manage-collaborators="memberDrawerOpen = true"
      @open-materials="setActiveTab('materials')"
      @updated="loadDetail"
    />
    <ArchiveVolumeSubmitChecklistModal
      v-model:open="selfCheckModalOpen"
      :volume-id="volumeId"
      @confirmed="loadDetail"
    />
    <ArchiveVolumeMemberManageDrawer
      v-model:open="memberDrawerOpen"
      :volume-id="volumeId"
      :collaborators="detail?.collaborators ?? []"
      @changed="loadDetail"
    />
    <ArchiveCollectionRejectDialog
      v-model:open="collectionRejectOpen"
      :volume-id="volumeId"
      @rejected="loadDetail"
    />
    <a-modal
      v-model:open="overdueSubmitModalOpen"
      title="归档已逾期"
      ok-text="确认提交"
      cancel-text="取消"
      :confirm-loading="submitting"
      @ok="confirmOverdueSubmit"
    >
      <p class="archive-volume-detail__overdue-hint">
        本任务已超过归档截止时刻，须填写逾期说明后方可提交档案馆验收。
      </p>
      <a-textarea
        v-model:value="overdueSubmitReason"
        :rows="4"
        placeholder="请说明逾期原因与整改措施（如：补扫完成、院系审核延误等）"
        :maxlength="500"
        show-count
      />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import type {
  ArchiveRemediationTaskResponse,
  ArchiveVolumeAccessRecordResponse,
  ArchiveVolumeDetailResponse,
  ArchiveVolumeSubmitChecklistItemVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ARCHIVE_REMEDIATION_STATUS_TONE,
  ArchiveIntegrityStatusCode,
  ArchiveRemediationStatusCode,
  ArchiveRemediationStatusDescription,
  ArchiveScoreCompletionStatusCode,
  ArchiveScoreSourceCode,
  ArchiveVolumeSourceTypeDescription,
  ArchiveVolumeStatusCode,
  checkArchiveVolumeIntegrity,
  exportArchiveVolume,
  getRemediationTask,
  previewArchiveVolumeSubmitChecklist,
  startArchiveCollecting,
  submitArchiveVolume,
  updateRemediationTask,
} from '@/apis/mark/archive-volume'
import ArchiveLifecyclePipe from '@/components/archive-volume/ArchiveLifecyclePipe.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { resolveSubmitChecklistRoute } from '@/composables/useArchiveSubmitChecklistRouter'
import { useArchiveVolumeDetailScope } from '@/composables/useArchiveVolumeDetailScope'
import {
  describeSubmitBlockReasonForDetail,
  isScoreSubmitReady,
} from '@/composables/useArchiveVolumeSubmitGate'
import { useArchiveVolumeWorkbenchContext } from '@/composables/useArchiveVolumeWorkbenchContext'
import { isArchiveVolumeCollectPhase } from '@/constants/archive-volume-sidebar-groups'
import { useUserStore } from '@/stores/modules/user'
import { resolveSecurityDiagnosticMessage } from '@/utils/archive-four-property-diagnostic'
import { buildVolumeNavigationLifecycleView } from '@/utils/archive-navigation-summary'
import {
  isSecurityRemediationDiagnostic,
  remediationDiagnosticLabel,
} from '@/utils/archive-remediation-diagnostic'
import {
  remediationAssigneeLabel,
  remediationCreatorLabel,
} from '@/utils/archive-remediation-display'
import { isArchiveDueOverdue } from '@/utils/archive-volume-list-ui'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveCollectionRejectDialog from '@/views/teacher/archive-volume/components/ArchiveCollectionRejectDialog.vue'
import ArchiveVolumeCollaboratorStrip from '@/views/teacher/archive-volume/components/ArchiveVolumeCollaboratorStrip.vue'
import ArchiveVolumeMemberManageDrawer from '@/views/teacher/archive-volume/components/ArchiveVolumeMemberManageDrawer.vue'
import ArchiveFlowContextBar from '@/views/teacher/archive-volume/components/detail/ArchiveFlowContextBar.vue'
import ArchiveScanBatchReviewPanel from '@/views/teacher/archive-volume/components/detail/ArchiveScanBatchReviewPanel.vue'
import ArchiveScanBatchSnapshotPanel from '@/views/teacher/archive-volume/components/detail/ArchiveScanBatchSnapshotPanel.vue'
import ArchiveVolumeAccessPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeAccessPanel.vue'
import ArchiveVolumeAppraisalPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeAppraisalPanel.vue'
import ArchiveVolumeCatalogEditor from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogEditor.vue'
import ArchiveVolumeEventsPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeEventsPanel.vue'
import ArchiveVolumeIntegrityPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeIntegrityPanel.vue'
import ArchiveVolumeMaterialTablePanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTablePanel.vue'
import ArchiveVolumeMaterialTreePanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTreePanel.vue'
import ArchiveVolumeNextStepsPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeNextStepsPanel.vue'
import ArchiveVolumePhysicalLocationPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumePhysicalLocationPanel.vue'
import ArchiveVolumeScoresPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeScoresPanel.vue'
import ArchiveVolumeSubmitChecklistModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitChecklistModal.vue'
import ArchiveVolumeSubmitProgressBand from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitProgressBand.vue'
import ArchiveVolumeTransferPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeTransferPanel.vue'
import DepartmentReviewPanel from '@/views/teacher/archive-volume/components/detail/DepartmentReviewPanel.vue'
import DigitalMaterialConfirmPanel from '@/views/teacher/archive-volume/components/detail/DigitalMaterialConfirmPanel.vue'
import TaskSettingsDrawer from '@/views/teacher/archive-volume/components/detail/TaskSettingsDrawer.vue'

defineOptions({ name: 'TeacherArchiveVolumeDetail' })

const route = useRoute()
const router = useRouter()
const workbench = useArchiveVolumeWorkbenchContext()
const volumeId = workbench.volumeId
const detail = workbench.detail
const loading = workbench.loading
const activeTab = workbench.activeTab
const setActiveTab = workbench.setActiveTab
const userStore = useUserStore()
const {
  canApproveDestruction,
  canApproveAccessForVolume,
  canManageRemediationAsCoordinator,
  canReviewTransfer,
  canRejectTransfer,
  grantsLoadFailed,
  loadGrants,
} = useArchiveDutyAccess()
const currentUserId = computed(() => String(userStore.userInfo?.userId ?? ''))

const detailScope = useArchiveVolumeDetailScope(detail, currentUserId)
const focusedRemediationTask = ref<ArchiveRemediationTaskResponse | null>(null)
const submitChecklist = ref<Awaited<ReturnType<typeof previewArchiveVolumeSubmitChecklist>> | null>(
  null,
)
const submitChecklistLoadError = ref('')

const submitBlockingItems = computed(() => submitChecklist.value?.blockingItems ?? [])
const checkingIntegrity = ref(false)
const selectedCatalogKeys = ref<string[]>([])
const submitting = ref(false)
const startingCollecting = ref(false)
const exporting = ref(false)
const selfCheckModalOpen = ref(false)
const memberDrawerOpen = ref(false)
const taskSettingsOpen = ref(false)
const collectionRejectOpen = ref(false)
const remediationUpdating = ref(false)
const overdueSubmitModalOpen = ref(false)
const overdueSubmitReason = ref('')

const integrityResult = ref<Awaited<ReturnType<typeof checkArchiveVolumeIntegrity>> | null>(null)
const fourPropertyResult = ref<ArchiveVolumeDetailResponse['latestFourPropertyCheck']>(undefined)

const flowChainSteps = workbench.navigationFlowChainSteps
const nextStepActions = workbench.nextStepActions

const showPostCollectFlowNav = computed(
  () => !isArchiveVolumeCollectPhase(detail.value?.volume.volumeStatus),
)

const collectPhaseLifecycleView = computed(() => {
  if (!isArchiveVolumeCollectPhase(detail.value?.volume.volumeStatus)) {
    return null
  }
  return buildVolumeNavigationLifecycleView(detail.value?.navigationSummary)
})

const contextBarSubtitle = computed(() => {
  const archiveNo = detail.value?.volume.archiveNo
  const prefix = showPostCollectFlowNav.value ? '归档全链路' : '提交前工作流'
  return archiveNo ? `${prefix} · ${archiveNo}` : prefix
})

const canSyncTeachingAffairs = computed(() => {
  const detailValue = detail.value
  if (!detailScope.canRegisterMaterial || !detailValue) return false
  const volume = detailValue.volume
  if (volume.scoreSource === 'MARK_INTERNAL') return false
  if (
    volume.volumeStatus !== ArchiveVolumeStatusCode.DRAFT
    && volume.volumeStatus !== ArchiveVolumeStatusCode.COLLECTING
  ) {
    return false
  }
  return (
    volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.PENDING
    || volume.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.NOT_REQUIRED
  )
})

const displayedIntegrityResult = computed(
  () => integrityResult.value ?? detail.value?.latestIntegrityCheck ?? null,
)

const displayedFourProperty = computed(
  () => fourPropertyResult.value ?? detail.value?.latestFourPropertyCheck ?? null,
)

const showSecurityFourPropertyAlert = computed(() => {
  const d = detail.value
  const check = displayedFourProperty.value
  if (!d || !check || d.fourPropertyStale) return false
  return check.securityPassed === false
})

const securityFourPropertyDescription = computed(() =>
  resolveSecurityDiagnosticMessage(displayedFourProperty.value),
)

const showReliabilityFourPropertyAlert = computed(() => {
  const d = detail.value
  const check = displayedFourProperty.value
  if (!d || !check || d.fourPropertyStale) return false
  if (check.securityPassed === false) return false
  return check.reliabilityPassed === false
})

const reliabilityFourPropertyDescription = computed(() => {
  const diagnostic = displayedFourProperty.value?.diagnostic?.trim()
  if (diagnostic) return diagnostic
  return '存储可靠性校验未通过，请补正材料后重新执行四性检测'
})

const canConfirmScoreCompletion = computed(() => {
  const d = detail.value
  if (!d) return false
  const vol = d.volume
  if (!detailScope.volumeAcceptsScoreCompletion(vol.volumeStatus)) return false
  const canManageScores
    = detailScope.capabilities.canManageMaterials === true
      || detailScope.capabilities.canSubmitVolume === true
      || detailScope.capabilities.canManageCollaborators === true
  if (!canManageScores) return false
  if (
    vol.scoreSource !== ArchiveScoreSourceCode.TEACHING_AFFAIRS
    && vol.scoreSource !== ArchiveScoreSourceCode.OFFLINE_CONFIRMED
  ) {
    return false
  }
  return vol.scoreCompletionStatus === ArchiveScoreCompletionStatusCode.PENDING
})

const submitBlockReason = computed(() => {
  const d = detail.value
  if (!d) return null
  return describeSubmitBlockReasonForDetail(d, currentUserId.value, submitBlockingItems.value)
})

const scoreSubmitBlockReason = computed(() => {
  const d = detail.value
  if (!d || !detailScope.volumeAcceptsSubmitStatus(d.volume.volumeStatus)) return null
  if (d.capabilities?.canSubmitVolume !== true) return null
  if (isScoreSubmitReady(d.volume)) return null
  if (d.volume.scoreSource === 'MARK_INTERNAL') {
    return '线上阅卷双门禁未满足'
  }
  return '成绩证明未完成'
})

const showRemediationWorkflowStrip = computed(() => detail.value?.hasOpenRemediationTask === true)

const showAppraisalGuidanceStrip = computed(() => {
  if (activeTab.value === 'appraisal') {
    return false
  }
  const summary = detail.value?.navigationSummary
  if (!summary) {
    return false
  }
  if (summary.suggestedTabKey === 'appraisal') {
    return true
  }
  const appraisalStep = summary.chainSteps.find((step) => step.tabKey === 'appraisal')
  return appraisalStep?.chainStatus === 'warn' || appraisalStep?.chainStatus === 'current'
})

const appraisalGuidanceDescription = computed(() => {
  const volume = detail.value?.volume
  if (!volume) {
    return '请进入鉴定管理处理续保或销毁流程'
  }
  if (volume.appraisalStatus === 'REQUESTED') {
    return '鉴定申请待审批，请进入鉴定管理处理'
  }
  if (volume.appraisalStatus === 'REMINDER_SENT' || volume.retentionUntil) {
    const until = volume.retentionUntil ? `保管至 ${volume.retentionUntil}` : '保管期已到'
    return `${until}，请发起鉴定并记录续保或销毁决议`
  }
  return '当前卷进入鉴定/销毁环节，请进入鉴定管理继续处理'
})

const focusedRemediationAssigneeLabel = computed(() => {
  const task = focusedRemediationTask.value
  if (!task?.assigneeUserId) {
    return null
  }
  if (task.assigneeUserId === currentUserId.value) {
    return null
  }
  return remediationAssigneeLabel(task)
})

const focusedRemediationTargetTab = computed(() => {
  const code = focusedRemediationTask.value?.diagnosticCode
  return isSecurityRemediationDiagnostic(code) ? 'integrity' : 'materials'
})

const focusedRemediationPrimaryLabel = computed(() => {
  const code = focusedRemediationTask.value?.diagnosticCode
  return isSecurityRemediationDiagnostic(code) ? '去定密确认' : '登记补正材料'
})

const remediationOpenDescription = computed(() => {
  const task = focusedRemediationTask.value
  const d = detail.value
  if (task) {
    if (
      task.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED
      && task.assigneeUserId === currentUserId.value
    ) {
      return '材料已重提，等待院系协调人复检关闭'
    }
    const parts: string[] = []
    if (task.taskDescription?.trim()) {
      parts.push(task.taskDescription.trim())
    } else {
      parts.push(task.taskTitle)
    }
    if (task.dueTime) {
      parts.push(`截止 ${formatDateTime(task.dueTime)}`)
    }
    if (task.createUserId) {
      const creator = remediationCreatorLabel(task)
      parts.push(
        task.createTime ? `发现人 ${creator} · ${formatDateTime(task.createTime)}` : `发现人 ${creator}`,
      )
    }
    if (
      d?.hasBlockingRemediationForSubmit
      && d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
      && detailScope.canSubmitVolume
    ) {
      parts.push('须关闭整改任务后再提交归档')
    }
    return parts.join(' · ')
  }
  if (
    d?.hasBlockingRemediationForSubmit
    && d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
    && detailScope.canSubmitVolume
  ) {
    return '存在未关闭整改任务，须关闭后再提交归档'
  }
  return '当前卷存在未关闭整改任务，可登记补正材料'
})

function remediationStatusLabel(code: ArchiveRemediationStatusCode) {
  return strictEnumLabel(ArchiveRemediationStatusDescription, code, 'taskStatus')
}

function remediationStatusTone(code: ArchiveRemediationStatusCode): BadgeTone {
  return strictEnumTone(ARCHIVE_REMEDIATION_STATUS_TONE, code, 'taskStatus')
}

function sourceTypeLabel(code: ArchiveVolumeDetailResponse['volume']['sourceType']) {
  return strictEnumLabel(ArchiveVolumeSourceTypeDescription, code, 'sourceType')
}

function canApproveAccessRecord(record: ArchiveVolumeAccessRecordResponse) {
  return canApproveAccessForVolume({
    departmentId: record.departmentId,
    securityLevel: record.securityLevel,
  })
}

const canManageAppraisal = computed(() => detail.value?.canManageAppraisal === true)

async function loadSubmitChecklist(options?: { silent?: boolean }) {
  const d = detail.value
  if (!d?.submitProgress) {
    submitChecklist.value = null
    submitChecklistLoadError.value = ''
    return
  }
  try {
    submitChecklist.value = await previewArchiveVolumeSubmitChecklist(volumeId.value)
    submitChecklistLoadError.value = ''
  } catch (error) {
    submitChecklist.value = null
    submitChecklistLoadError.value = getUserErrorMessage(error, '提交待办清单加载失败')
    if (!options?.silent) {
      showUserError(error, '提交待办清单加载失败')
    }
  }
}

/** 提交清单阻塞项跳转：targetTabKey / dimension 映射到详情 Tab 或自查 Modal。 */
function handleSubmitChecklistNavigate(item: ArchiveVolumeSubmitChecklistItemVO) {
  const routeTarget = resolveSubmitChecklistRoute(item)
  if (routeTarget.checklistPhaseKey === 'selfCheck') {
    selfCheckModalOpen.value = true
    return
  }
  if (routeTarget.checklistPhaseKey === 'departmentReview') {
    setActiveTab('department-review')
    return
  }
  setActiveTab(routeTarget.detailTabKey)
}

const canExportManifest = computed(() => {
  const status = detail.value?.volume.volumeStatus
  return status === ArchiveVolumeStatusCode.SUBMITTED || status === ArchiveVolumeStatusCode.STORED
})

const canEditPhysicalLocation = computed(() => {
  const d = detail.value
  if (!detailScope.canRegisterMaterial || !d) return false
  return d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
})

const canReviewScanBatches = computed(() => detailScope.capabilities.canManageMaterials === true)

const canAdvanceRemediation = computed(() => {
  const task = focusedRemediationTask.value
  if (
    !task
    || task.taskStatus === ArchiveRemediationStatusCode.CLOSED
    || task.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED
  ) {
    return false
  }
  return task.assigneeUserId === currentUserId.value
})

const canManageCoordinatorRemediation = computed(() => {
  const d = detail.value
  const task = focusedRemediationTask.value
  if (
    !d?.hasOpenRemediationTask
    || !task
    || task.taskStatus === ArchiveRemediationStatusCode.CLOSED
  ) {
    return false
  }
  if (task.assigneeUserId === currentUserId.value) return false
  return canManageRemediationAsCoordinator(d.volume)
})

const canAllowMaterialDelay = computed(() => {
  const d = detail.value
  if (!d) return false
  return canManageRemediationAsCoordinator(d.volume)
})

const canWaiveMaterialMissing = computed(() => detail.value?.canManageArchiveAdmin === true)

const canWaiveIntegrity = computed(() => {
  const d = detail.value
  if (!d?.canManageArchiveAdmin) return false
  if (d.volume.integrityStatus === 'WAIVED') return false
  const status = d.volume.volumeStatus
  return status === ArchiveVolumeStatusCode.DRAFT || status === ArchiveVolumeStatusCode.COLLECTING
})

const canRequestAccess = computed(
  () => detail.value?.volume.volumeStatus === ArchiveVolumeStatusCode.STORED,
)

async function loadDetail(options?: { silent?: boolean }) {
  await workbench.loadDetail(options)
  if (detail.value) {
    fourPropertyResult.value = detail.value.latestFourPropertyCheck
    integrityResult.value = detail.value.latestIntegrityCheck ?? null
    syncFocusedRemediationTaskFromDetail()
    await loadSubmitChecklist({ silent: options?.silent })
  }
}

/** OCR 终态后刷新卷详情与提交清单；不变量：提示基于刷新后的 fourPropertyStale，避免使用旧 props 判断。 */
async function handleMaterialOcrCompleted() {
  await loadDetail({ silent: true })
  if (detail.value?.fourPropertyStale) {
    message.info('OCR 已完成，请重新执行完整性/四性检测')
  }
}

async function runIntegrityCheck() {
  checkingIntegrity.value = true
  try {
    integrityResult.value = await checkArchiveVolumeIntegrity(volumeId.value)
    message.success('完整性检查完成')
    await loadDetail()
  } catch (error) {
    showUserError(error)
  } finally {
    checkingIntegrity.value = false
  }
}

async function handleStartCollecting() {
  startingCollecting.value = true
  try {
    await startArchiveCollecting(volumeId.value)
    message.success('已开始收材')
    await loadDetail()
  } catch (error) {
    showUserError(error)
  } finally {
    startingCollecting.value = false
  }
}

async function executeSubmit(overdueReason?: string) {
  submitting.value = true
  try {
    await submitArchiveVolume({
      volumeId: volumeId.value,
      overdueSubmitReason: overdueReason,
    })
    message.success('已提交归档')
    overdueSubmitModalOpen.value = false
    overdueSubmitReason.value = ''
    await loadDetail()
  } catch (error) {
    showUserError(error)
  } finally {
    submitting.value = false
  }
}

function requiresOverdueSubmitReason(d: ArchiveVolumeDetailResponse): boolean {
  if (!d.volume.archiveDueTime || !isArchiveDueOverdue(d.volume.archiveDueTime)) return false
  return d.volume.overdueSubmitBlocked === true
}

async function handleSubmit() {
  const d = detail.value
  if (!d) return
  if (d.volume.requireSelfCheckConfirm && !d.volume.selfCheckConfirmed) {
    selfCheckModalOpen.value = true
    return
  }
  if (requiresOverdueSubmitReason(d)) {
    overdueSubmitModalOpen.value = true
    return
  }
  await executeSubmit()
}

async function confirmOverdueSubmit() {
  const reason = overdueSubmitReason.value.trim()
  if (!reason) {
    message.warning('请填写逾期提交说明')
    return
  }
  await executeSubmit(reason)
}

async function handleExport() {
  exporting.value = true
  try {
    const result = await exportArchiveVolume(volumeId.value)
    if (!result.exportFileId) {
      message.error('导出未返回文件 ID')
      return
    }
    await downloadFile({ nodeId: result.exportFileId })
    message.success(`导出完成，材料 ${result.materialCount ?? 0} 项`)
  } catch (error) {
    showUserError(error)
  } finally {
    exporting.value = false
  }
}

function goBack() {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function goVolumeSearch() {
  if (!volumeId.value) return
  void router.push({
    name: 'TeacherArchiveVolumeSearch',
    query: { volumeId: volumeId.value },
  })
}

function syncFocusedRemediationTaskFromDetail() {
  const raw = route.query.remediationTaskId
  if (typeof raw === 'string' && raw) {
    return
  }
  focusedRemediationTask.value = detail.value?.viewerRemediationTask ?? null
}

async function loadFocusedRemediationTask() {
  const raw = route.query.remediationTaskId
  if (typeof raw !== 'string' || !raw) {
    syncFocusedRemediationTaskFromDetail()
    return
  }
  try {
    focusedRemediationTask.value = await getRemediationTask(raw)
  } catch (error) {
    focusedRemediationTask.value = detail.value?.viewerRemediationTask ?? null
    showUserError(error, '加载整改任务失败')
  }
}

async function advanceRemediation(taskStatus: ArchiveRemediationStatusCode) {
  const task = focusedRemediationTask.value
  if (!task?.taskId) return
  remediationUpdating.value = true
  try {
    focusedRemediationTask.value = await updateRemediationTask({
      taskId: task.taskId,
      taskStatus,
    })
    message.success('整改任务已更新')
    await loadDetail({ silent: true })
  } catch (error) {
    showUserError(error)
  } finally {
    remediationUpdating.value = false
  }
}

onMounted(() => {
  void loadGrants()
  void loadFocusedRemediationTask()
})

watch(
  () => detail.value,
  (value) => {
    if (value) {
      syncFocusedRemediationTaskFromDetail()
      void loadSubmitChecklist({ silent: true })
    }
  },
)

watch(
  () => route.query.remediationTaskId,
  () => {
    void loadFocusedRemediationTask()
  },
)

watch(
  () => route.query.scanCommitted,
  (value) => {
    if (value !== '1') {
      return
    }
    setActiveTab('materials')
    void loadDetail({ silent: true })
    const nextQuery = { ...route.query }
    delete nextQuery.scanCommitted
    void router.replace({ path: route.path, query: nextQuery })
  },
  { immediate: true },
)

function clearSubmitIntentQuery() {
  if (route.query.submitIntent !== '1') return
  const nextQuery = { ...route.query }
  delete nextQuery.submitIntent
  void router.replace({ path: route.path, query: nextQuery })
}

const submitIntentConsumed = ref(false)

watch(volumeId, () => {
  submitIntentConsumed.value = false
})

watch(
  () => [route.query.submitIntent, detail.value] as const,
  ([submitIntent, d]) => {
    if (submitIntent !== '1' || !d || submitIntentConsumed.value) return
    submitIntentConsumed.value = true
    setActiveTab('transfer')
    if (d.capabilities?.canSubmitVolume !== true) {
      const reason = describeSubmitBlockReasonForDetail(
        d,
        currentUserId.value,
        submitBlockingItems.value,
      )
      if (reason) {
        message.warning(reason)
      }
      clearSubmitIntentQuery()
      return
    }
    clearSubmitIntentQuery()
    void handleSubmit()
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.archive-volume-detail__alert {
  margin-bottom: var(--dp-space-4);
}

.archive-volume-detail__remediation-assignee {
  color: var(--dp-text-secondary);
  font-size: 13px;
}

.archive-volume-detail__meta {
  margin: 0 0 var(--dp-space-4);
  color: var(--dp-text-secondary);
  font-size: 13px;
}

.archive-volume-detail__overdue-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.archive-volume-detail__lifecycle {
  margin-bottom: var(--dp-space-4);
}

.archive-volume-detail__panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.archive-volume-detail__catalog-editor {
  margin-bottom: var(--dp-space-4);
}

.archive-volume-detail__catalog {
  display: grid;
  grid-template-columns: minmax(280px, 280px) minmax(0, 1fr);
  gap: var(--dp-space-4);
  align-items: start;
}

@media (max-width: #{bp.$ant-grid-md - 1px}) {
  .archive-volume-detail__catalog {
    grid-template-columns: 1fr;
  }
}

.archive-volume-detail__submit-summary {
  display: grid;
  gap: var(--dp-space-2);
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.archive-volume-detail__panel-surface {
  min-height: 320px;
}
</style>
