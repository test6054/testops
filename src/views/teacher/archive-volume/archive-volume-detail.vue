<template>
  <div class="archive-volume-detail">
    <UiSkeletonState
      v-if="loading && !detail"
      variant="card"
      :card-count="2"
      compact
      class="archive-volume-detail__loading"
    />

    <WorkbenchSurfaceCard
      v-else-if="detailLoadError && !detail"
      class="archive-volume-detail__load-error"
    >
      <UiEmpty size="md" show-icon title="无法加载归档任务" :description="detailLoadError">
        <template #action>
          <div class="archive-volume-detail__load-error-actions">
            <UiButton variant="primary" size="sm" :loading="loading" @click="() => loadDetail()">
              重新加载
            </UiButton>
            <UiButton variant="outline" size="sm" @click="goArchiveList"> 返回列表 </UiButton>
          </div>
        </template>
      </UiEmpty>
    </WorkbenchSurfaceCard>

    <template v-else-if="detail">
      <UiAlertStrip
        v-if="isArchiveGateVisible('checklistFail')"
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
        v-if="isArchiveGateVisible('grantsFail')"
        tone="warning"
        title="岗位职责加载失败"
        description="鉴定、销毁与查阅审批操作不可用"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="isArchiveGateVisible('integrity')"
        tone="warning"
        title="请先执行完整性自检"
        description="完整性未通过前无法提交归档"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="
          isArchiveGateVisible('fourProperty') &&
          !detail.latestFourPropertyCheck &&
          detail.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
        "
        tone="warning"
        title="尚未执行四性检测"
        description="提交归档前须完成四性检测"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-else-if="isArchiveGateVisible('fourProperty') && detail.fourPropertyStale"
        tone="warning"
        title="四性结论已失效"
        description="四性结论已失效，请确认密级定密后重新执行四性检测"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-else-if="isArchiveGateVisible('fourProperty') && showSecurityFourPropertyAlert"
        tone="warning"
        title="四性检测: 安全性未通过"
        :description="securityFourPropertyDescription"
        dense
        inline
        class="archive-volume-detail__alert"
      >
        <template v-if="activeTab !== 'four-property'" #actions>
          <UiButton size="sm" variant="outline" @click="setActiveTab('four-property')">
            去定密确认
          </UiButton>
        </template>
      </UiAlertStrip>
      <UiAlertStrip
        v-else-if="
          isArchiveGateVisible('fourProperty') &&
          detail.latestFourPropertyCheck &&
          !detail.latestFourPropertyCheck.overallPassed &&
          detail.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
        "
        tone="warning"
        title="四性检测未通过"
        description="请先补正材料并重新执行四性检测"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="isArchiveGateVisible('scoreSubmit') && scoreSubmitBlockReason"
        tone="warning"
        :title="scoreSubmitBlockReason"
        description="成绩证明未满足提交前置条件"
        dense
        inline
        class="archive-volume-detail__alert"
      />
      <UiAlertStrip
        v-if="isArchiveGateVisible('remediation')"
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
          <UiButton size="sm" variant="outline" @click="setActiveTab(focusedRemediationTargetTab)">
            {{ focusedRemediationPrimaryLabel }}
          </UiButton>
          <UiButton
            v-if="
              canAdvanceRemediation &&
              focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.OPEN
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
              canAdvanceRemediation &&
              focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS
            "
            size="sm"
            variant="outline"
            :loading="remediationUpdating"
            @click="advanceRemediation(ArchiveRemediationStatusCode.RESUBMITTED)"
          >
            标记已重提
          </UiButton>
          <UiButton
            v-if="canManageCoordinatorRemediation"
            size="sm"
            variant="ghost"
            @click="openRemediationTaskDetail"
          >
            整改任务详情
          </UiButton>
        </template>
      </UiAlertStrip>
      <UiAlertStrip
        v-if="isArchiveGateVisible('appraisal')"
        tone="warning"
        title="鉴定待办"
        :description="appraisalGuidanceDescription"
        dense
        class="archive-volume-detail__alert"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" @click="setActiveTab('appraisal')">
            进入鉴定管理
          </UiButton>
        </template>
      </UiAlertStrip>

      <div v-if="showArchiveGateOpsStrip" class="archive-volume-detail__ops">
        <ArchiveVolumeGateOpsStrip
          :items="archiveGateOpsItems"
          @action="handleArchiveGateOpsAction"
        />
      </div>

      <StageWorkbenchShell class="archive-volume-detail__shell">
        <template #context>
          <ContextBar
            layout="workbench"
            show-title
            :title="workbenchStageLabel"
            :subtitle="workbenchSubtitle"
          >
            <template v-if="showWorkbenchActions" #actions>
              <UiButton
                v-if="detailScope.canStartCollecting && !isQualityTab && !isManageTab"
                variant="primary"
                size="sm"
                @click="setActiveTab('start-collecting')"
              >
                开始收材
              </UiButton>
              <UiButton
                v-if="
                  detailScope.showSubmitActions && !detailScope.canSubmitVolume && !isQualityTab
                "
                variant="outline"
                size="sm"
                disabled
                :title="detailScope.submitActionDisabledHint ?? submitBlockReason ?? undefined"
              >
                提交归档
              </UiButton>
              <UiButton
                v-if="detailScope.canSubmitVolume && !isQualityTab"
                variant="primary"
                size="sm"
                :loading="submitting"
                @click="handleSubmit"
              >
                提交归档
              </UiButton>
              <UiButton
                v-if="detailScope.showSelfCheckButton && !isQualityTab"
                variant="outline"
                size="sm"
                @click="selfCheckModalOpen = true"
              >
                提交前自查
              </UiButton>
            </template>
          </ContextBar>
        </template>

        <template v-if="activeTabSignalMetrics.length" #signal>
          <SignalBand
            variant="panel"
            :metrics="activeTabSignalMetrics"
            class="archive-volume-detail__signal"
            @metric-click="handleActiveTabSignalClick"
          />
        </template>

        <ArchiveVolumeQualityGuideStrip
          v-if="qualityGuide"
          :title="qualityGuide.title"
          :description="qualityGuide.description"
          :action-label="qualityGuide.actionLabel"
          :action-loading="qualityGuideActionLoading"
          @action="handleQualityGuideAction"
        />

        <ArchiveVolumeSubmitProgressBand
          v-if="showSubmitProgressBand"
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
          <div v-if="activeTab === 'materials'" class="archive-volume-detail__panel">
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
                :can-maintain-material="detailScope.canMaintainMaterial"
                :can-remove-shared-material-ref="detailScope.canRemoveSharedMaterialRef"
                @refreshed="(opts) => loadDetail(opts)"
                @ocr-completed-stale="handleMaterialOcrCompleted"
                @stats-ready="onMaterialsStatsReady"
              />
            </div>
          </div>

          <ArchiveVolumeScoresPanel
            v-else-if="activeTab === 'scores'"
            :volume-id="volumeId"
            :detail="detail"
            :can-confirm-score-completion="canConfirmScoreCompletion"
            @refreshed="loadDetail"
          />

          <ArchiveVolumeOcrSearchPanel
            v-else-if="activeTab === 'ocr-search'"
            :volume-id="volumeId"
            :can-register-material="detailScope.canRegisterMaterial"
            :can-maintain-material="detailScope.canMaintainMaterial"
            :can-remove-shared-material-ref="detailScope.canRemoveSharedMaterialRef"
            @navigate-materials="setActiveTab('materials')"
            @refreshed="loadDetail"
          />

          <ArchiveVolumeIntegrityPanel
            v-else-if="activeTab === 'integrity'"
            :volume-id="volumeId"
            :detail="detail"
            :displayed-integrity-result="displayedIntegrityResult"
            :checking-integrity="checkingIntegrity"
            :can-run-integrity="detailScope.canRunIntegrityCheck"
            :can-allow-material-delay="canAllowMaterialDelay"
            :can-waive-material-missing="canWaiveMaterialMissing"
            :can-waive-integrity="canWaiveIntegrity"
            @run-integrity-check="runIntegrityCheck"
            @refreshed="loadDetail"
          />

          <ArchiveVolumeSelfCheckList
            v-else-if="activeTab === 'self-check'"
            :volume-id="volumeId"
            :self-check-status="detail.selfCheckStatus"
            :readonly="!detailScope.canEditSelfCheck"
            @refreshed="loadDetail"
            @open-sign-off="selfCheckModalOpen = true"
          />

          <ArchiveVolumeFourPropertyPanel
            v-else-if="activeTab === 'four-property'"
            :volume-id="volumeId"
            :detail="detail"
            :displayed-four-property="displayedFourProperty"
            :can-run-four-property="canRunFourPropertyCheck"
            @refreshed="loadDetail"
            @four-property-checked="fourPropertyResult = $event"
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
            :current-user-id="currentUserId"
            @refreshed="loadDetail"
          />

          <ArchiveVolumeAccessPanel
            v-else-if="activeTab === 'access'"
            :volume-id="volumeId"
            :can-request-access="canRequestAccess"
            :can-approve-access-record="canApproveAccessRecord"
            :current-user-id="currentUserId"
            :materials="detail.materials"
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

          <ArchiveVolumeTaskSettingsPanel
            v-else-if="detail && activeTab === 'task-settings'"
            :detail="detail"
            :can-manage-collaborators="detailScope.canManageCollaborators"
            :can-update-archive-due-time="detailScope.capabilities.canUpdateArchiveDueTime === true"
            @open-materials="setActiveTab('materials')"
            @updated="loadDetail"
          />

          <ArchiveVolumeCollaboratorsPanel
            v-else-if="activeTab === 'collaborators'"
            :volume-id="volumeId"
            :collaborators="detail?.collaborators ?? []"
            :can-manage-collaborators="detailScope.canManageCollaborators"
            @changed="loadDetail"
          />

          <ArchiveVolumeStartCollectingPanel
            v-else-if="detail && activeTab === 'start-collecting'"
            :detail="detail"
            :can-start-collecting="detailScope.canStartCollecting"
            :can-manage-collaborators="detailScope.canManageCollaborators"
            :can-update-archive-due-time="detailScope.capabilities.canUpdateArchiveDueTime === true"
            @started="handleStartCollectingStarted"
            @updated="loadDetail"
            @navigate="setActiveTab"
          />
        </WorkbenchSurfaceCard>

        <ArchiveVolumeNextStepsPanel
          v-if="showNextStepsPanel"
          :actions="hubNextStepActions"
          :exam-id="detail.volume.examId"
          :volume-id="volumeId"
          @tab-change="setActiveTab"
        />
      </StageWorkbenchShell>
    </template>

    <WorkbenchSurfaceCard v-else class="archive-volume-detail__load-error">
      <UiEmpty size="md" show-icon title="无法加载归档任务" description="请重新加载或返回归档列表">
        <template #action>
          <div class="archive-volume-detail__load-error-actions">
            <UiButton variant="primary" size="sm" :loading="loading" @click="() => loadDetail()">
              重新加载
            </UiButton>
            <UiButton variant="outline" size="sm" @click="goArchiveList"> 返回列表 </UiButton>
          </div>
        </template>
      </UiEmpty>
    </WorkbenchSurfaceCard>

    <ArchiveVolumeSubmitChecklistModal
      v-model:open="selfCheckModalOpen"
      :volume-id="volumeId"
      :can-confirm-self-check="detailScope.capabilities.canSelfCheck === true"
      @confirmed="loadDetail"
    />
    <ArchiveCollectionRejectDialog
      v-model:open="collectionRejectOpen"
      :volume-id="volumeId"
      :can-reject-collection="detailScope.canRejectCollection"
      @rejected="loadDetail"
    />
    <UiDialog
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
      <UiTextarea
        size="sm"
        v-model="overdueSubmitReason"
        :rows="4"
        placeholder="请说明逾期原因与整改措施（如：补扫完成、院系审核延误等）"
        :maxlength="500"
        :show-count="true"
      />
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import type {
  ArchiveRemediationTaskResponse,
  ArchiveVolumeAccessRecordResponse,
  ArchiveVolumeDetailResponse,
  ArchiveVolumeMaterialStatsResponse,
  ArchiveVolumeSubmitChecklistItemVO,
} from '@/apis/mark/archive-volume'
import {
  ARCHIVE_REMEDIATION_STATUS_TONE,
  ArchiveCatalogStatusDescription,
  ArchiveIntegrityStatusCode,
  ArchiveIntegrityStatusDescription,
  ArchiveRemediationStatusCode,
  ArchiveRemediationStatusDescription,
  ArchiveScoreCompletionStatusCode,
  ArchiveScoreCompletionStatusDescription,
  ArchiveScoreSourceDescription,
  ArchiveSecurityLevelDescription,
  ArchiveSelfCheckStatusCode,
  ArchiveSelfCheckStatusDescription,
  ArchiveTransferStatusDescription,
  ArchiveVolumeStatusCode,
  ArchiveVolumeStatusDescription,
  ArchiveVolumeSubmitChecklistPhaseDescription,
  checkArchiveVolumeFourProperty,
  checkArchiveVolumeIntegrity,
  exportArchiveVolume,
  getRemediationTask,
  previewArchiveVolumeSubmitChecklist,
  submitArchiveVolume,
  updateRemediationTask,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveDutyAccess } from '@/composables/useArchiveDutyAccess'
import { resolveSubmitChecklistRoute } from '@/composables/useArchiveSubmitChecklistRouter'
import { useArchiveVolumeDetailScope } from '@/composables/useArchiveVolumeDetailScope'
import {
  describeSubmitBlockReasonForDetail,
  isScoreSubmitReady,
} from '@/composables/useArchiveVolumeSubmitGate'
import { useArchiveVolumeWorkbenchContext } from '@/composables/useArchiveVolumeWorkbenchContext'
import { useUserStore } from '@/stores/modules/user'
import {
  buildFourPropertyDimensionViews,
  countFourPropertyPassed,
  resolveSecurityDiagnosticMessage,
} from '@/utils/archive-four-property-diagnostic'
import {
  isSecurityRemediationDiagnostic,
  remediationDiagnosticLabel,
} from '@/utils/archive-remediation-diagnostic'
import {
  remediationAssigneeLabel,
  remediationCreatorLabel,
} from '@/utils/archive-remediation-display'
import {
  isArchiveGateNavHiddenOnTab,
  isArchiveVolumeManageTab,
  isArchiveVolumeNextStepsTab,
  isArchiveVolumeQualityTab,
  isArchiveVolumeWorkflowChromeTab,
} from '@/utils/archive-volume-chrome'
import { isArchiveDueOverdue } from '@/utils/archive-volume-list-ui'
import {
  getUserErrorMessage,
  showFormValidationMessage,
  showUserError,
} from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveCollectionRejectDialog from '@/views/teacher/archive-volume/components/ArchiveCollectionRejectDialog.vue'
import ArchiveScanBatchReviewPanel from '@/views/teacher/archive-volume/components/detail/ArchiveScanBatchReviewPanel.vue'
import ArchiveScanBatchSnapshotPanel from '@/views/teacher/archive-volume/components/detail/ArchiveScanBatchSnapshotPanel.vue'
import ArchiveVolumeAccessPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeAccessPanel.vue'
import ArchiveVolumeAppraisalPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeAppraisalPanel.vue'
import ArchiveVolumeCatalogEditor from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogEditor.vue'
import ArchiveVolumeCollaboratorsPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeCollaboratorsPanel.vue'
import ArchiveVolumeEventsPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeEventsPanel.vue'
import ArchiveVolumeFourPropertyPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeFourPropertyPanel.vue'
import ArchiveVolumeGateOpsStrip from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeGateOpsStrip.vue'
import ArchiveVolumeIntegrityPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeIntegrityPanel.vue'
import ArchiveVolumeMaterialTablePanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTablePanel.vue'
import ArchiveVolumeMaterialTreePanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTreePanel.vue'
import ArchiveVolumeNextStepsPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeNextStepsPanel.vue'
import ArchiveVolumeOcrSearchPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeOcrSearchPanel.vue'
import ArchiveVolumePhysicalLocationPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumePhysicalLocationPanel.vue'
import ArchiveVolumeQualityGuideStrip from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeQualityGuideStrip.vue'
import ArchiveVolumeScoresPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeScoresPanel.vue'
import ArchiveVolumeSelfCheckList from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSelfCheckList.vue'
import ArchiveVolumeStartCollectingPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeStartCollectingPanel.vue'
import ArchiveVolumeSubmitChecklistModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitChecklistModal.vue'
import ArchiveVolumeSubmitProgressBand from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitProgressBand.vue'
import ArchiveVolumeTaskSettingsPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeTaskSettingsPanel.vue'
import ArchiveVolumeTransferPanel from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeTransferPanel.vue'
import DepartmentReviewPanel from '@/views/teacher/archive-volume/components/detail/DepartmentReviewPanel.vue'
import DigitalMaterialConfirmPanel from '@/views/teacher/archive-volume/components/detail/DigitalMaterialConfirmPanel.vue'

defineOptions({ name: 'TeacherArchiveVolumeDetail' })

const route = useRoute()
const router = useRouter()
const workbench = useArchiveVolumeWorkbenchContext()
const volumeId = workbench.volumeId
const detail = workbench.detail
const loading = workbench.loading
const detailLoadError = workbench.detailLoadError
const activeTab = workbench.activeTab
const setActiveTab = workbench.setActiveTab
const manageActionTick = workbench.manageActionTick
const userStore = useUserStore()
const { grantsLoadFailed, loadGrants } = useArchiveDutyAccess()
const currentUserId = computed(() => String(userStore.userInfo?.userId ?? ''))
// MVR-331：仅认 BE getDetail can*===true；禁止 hasDutyForDepartment 本地回退
const canApproveDestruction = computed(() => detail.value?.canApproveDestruction === true)
const canReviewTransfer = computed(() => detail.value?.canReviewTransfer === true)
const canRejectTransfer = computed(() => detail.value?.canRejectTransfer === true)

const detailScope = useArchiveVolumeDetailScope(detail, currentUserId)
const focusedRemediationTask = ref<ArchiveRemediationTaskResponse | null>(null)
const submitChecklist = ref<Awaited<ReturnType<typeof previewArchiveVolumeSubmitChecklist>> | null>(
  null,
)
const submitChecklistLoadError = ref('')

const submitBlockingItems = computed(() => submitChecklist.value?.blockingItems ?? [])
const checkingIntegrity = ref(false)
const checkingFourProperty = ref(false)
const selectedCatalogKeys = ref<string[]>([])
const submitting = ref(false)
const exporting = ref(false)
const selfCheckModalOpen = ref(false)
const collectionRejectOpen = ref(false)
const remediationUpdating = ref(false)
const overdueSubmitModalOpen = ref(false)
const overdueSubmitReason = ref('')

const integrityResult = ref<Awaited<ReturnType<typeof checkArchiveVolumeIntegrity>> | null>(null)
const fourPropertyResult = ref<ArchiveVolumeDetailResponse['latestFourPropertyCheck']>(undefined)

const nextStepActions = workbench.nextStepActions

const workbenchStageLabel = computed(() => {
  const tab = activeTab.value
  const fromNav = workbench.sidebarTabs.value.find((item) => item.key === tab)
  return fromNav?.label || '归档任务'
})

/** 工作台副标题：档号 · 课程（或关联考试） · 卷状态，标识当前归档卷。 */
const workbenchSubtitle = computed(() => {
  const volume = detail.value?.volume
  if (!volume) return undefined
  const parts: string[] = [volume.archiveNo]
  const subject = volume.courseName ?? volume.relatedExamName
  if (subject) parts.push(`${volume.academicYear} ${subject}`)
  parts.push(strictEnumLabel(ArchiveVolumeStatusDescription, volume.volumeStatus, 'volumeStatus'))
  return parts.join(' · ')
})

const isQualityTab = computed(() => isArchiveVolumeQualityTab(activeTab.value))
const isManageTab = computed(() => isArchiveVolumeManageTab(activeTab.value))

const showArchiveGateOpsStrip = computed(
  () => isArchiveVolumeWorkflowChromeTab(activeTab.value) && archiveGateOpsItems.value.length > 0,
)

const qualityGuide = computed(
  (): {
    title: string
    description?: string
    actionLabel?: string
    actionKey?: 'integrity' | 'self-check-sign' | 'four-property' | 'security-mark' | 'materials'
  } | null => {
    const d = detail.value
    if (!d || !isQualityTab.value) {
      return null
    }
    const tab = activeTab.value
    if (tab === 'integrity') {
      const status = displayedIntegrityResult.value?.integrityStatus ?? d.volume.integrityStatus
      if (
        status === ArchiveIntegrityStatusCode.UNKNOWN ||
        status === ArchiveIntegrityStatusCode.FAILED
      ) {
        return {
          title: '先执行完整性自检',
          description: '对照必交材料检查缺件，通过后再做自检清单与四性',
          actionLabel: detailScope.canRunIntegrityCheck ? '执行完整性自检' : undefined,
          actionKey: 'integrity',
        }
      }
      if (displayedIntegrityResult.value?.missingItems?.length) {
        return {
          title: `仍有 ${displayedIntegrityResult.value.missingItems.length} 项缺件`,
          description: '请补材、登记延迟补交或授权豁免',
          actionLabel: '去材料收集',
          actionKey: 'materials',
        }
      }
      return {
        title: '完整性已就绪',
        description: '可继续自检清单或四性与定密',
      }
    }
    if (tab === 'self-check') {
      if (
        d.selfCheckStatus === ArchiveSelfCheckStatusCode.COMPLETED ||
        d.volume.selfCheckConfirmed
      ) {
        return {
          title: '自检清单已完成',
          description: '可继续四性与定密或提交归档',
        }
      }
      return {
        title: '勾选必查项并完成签字',
        description: '必查项全部勾选后，在清单内进入签字确认',
      }
    }
    if (tab === 'four-property') {
      if (d.volume.securityMarkPending) {
        return {
          title: '确认密级定密',
          description: `当前卷密级：${
            d.volume.securityLevel
              ? strictEnumLabel(
                  ArchiveSecurityLevelDescription,
                  d.volume.securityLevel,
                  'securityLevel',
                )
              : '—'
          }`,
          actionLabel: d.canConfirmSecurityMark ? '确认密级定密' : undefined,
          actionKey: 'security-mark',
        }
      }
      if (d.fourPropertyStale || !displayedFourProperty.value) {
        return {
          title: d.fourPropertyStale ? '四性结论已失效，请重新检测' : '尚未执行四性检测',
          description: '材料或密级变更后须重新执行四性检测',
          actionLabel: canRunFourPropertyCheck.value ? '执行四性检测' : undefined,
          actionKey: 'four-property',
        }
      }
      return {
        title: '四性检测已完成',
        description: displayedFourProperty.value.overallPassed
          ? '四性结论有效'
          : '存在未通过项，请修复后重检',
        actionLabel:
          canRunFourPropertyCheck.value && !displayedFourProperty.value.overallPassed
            ? '重新执行四性检测'
            : undefined,
        actionKey: 'four-property',
      }
    }
    return null
  },
)

const showWorkbenchActions = computed(() => {
  if (!isArchiveVolumeWorkflowChromeTab(activeTab.value) || isQualityTab.value) {
    return false
  }
  return (
    detailScope.canStartCollecting ||
    detailScope.showSubmitActions ||
    detailScope.canSubmitVolume ||
    detailScope.showSelfCheckButton
  )
})

const hubNextStepActions = computed(() => {
  // MVR-337：gateTargets 显式 string，避免 Set 字面量联合与 targetTabKey:string 不兼容
  const gateTargets = new Set<string>()
  for (const item of archiveGateOpsItems.value) {
    if (item.key === 'integrity') {
      gateTargets.add('integrity')
    } else if (item.key === 'fourProperty') {
      gateTargets.add('four-property')
    } else if (item.key === 'scoreSubmit') {
      gateTargets.add('scores')
    } else if (item.key === 'appraisal') {
      gateTargets.add('appraisal')
    }
  }
  return nextStepActions.value.filter(
    (action) =>
      action.targetTabKey !== activeTab.value &&
      (!action.targetTabKey || !gateTargets.has(action.targetTabKey)),
  )
})

const showNextStepsPanel = computed(
  () => isArchiveVolumeNextStepsTab(activeTab.value) && hubNextStepActions.value.length > 0,
)

const showSubmitProgressBand = computed(
  () => isArchiveVolumeWorkflowChromeTab(activeTab.value) && Boolean(detail.value?.submitProgress),
)

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

const canRunFourPropertyCheck = computed(() => {
  const d = detail.value
  if (!d) return false
  // 与 BE checkFourProperty：COLLECTING→requireCanManageMaterials；SUBMITTED→移交验收岗
  if (d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING) {
    return detailScope.capabilities.canManageMaterials === true
  }
  return d.volume.volumeStatus === ArchiveVolumeStatusCode.SUBMITTED && canReviewTransfer.value
})

// MVR-188：与 BE getDetail canConfirmScoreCompletion / confirmScoreCompletion 同源
const canConfirmScoreCompletion = computed(() => detail.value?.canConfirmScoreCompletion === true)

const submitBlockReason = computed(() => {
  const d = detail.value
  if (!d) return null
  return describeSubmitBlockReasonForDetail(d, currentUserId.value, submitBlockingItems.value)
})

const scoreSubmitBlockReason = computed(() => {
  const d = detail.value
  if (!d || !detailScope.volumeAcceptsSubmitStatus(d.volume.volumeStatus)) return null
  if (!d.capabilities?.canSubmitVolume) return null
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

/** 归档条件闸门：只置顶一条「下一必做」，其余折叠，避免迎检告警墙。 */
type ArchiveGateKey =
  | 'checklistFail'
  | 'grantsFail'
  | 'remediation'
  | 'appraisal'
  | 'integrity'
  | 'fourProperty'
  | 'scoreSubmit'

const ARCHIVE_GATE_LABEL: Record<ArchiveGateKey, string> = {
  checklistFail: '待办清单加载失败',
  grantsFail: '岗位职责加载失败',
  remediation: '迎评整改进行中',
  appraisal: '鉴定待办',
  integrity: '完整性自检',
  fourProperty: '四性检测',
  scoreSubmit: '成绩证明门禁',
}

const showIntegrityGate = computed(() => {
  const status = detail.value?.volume.integrityStatus
  return (
    status === ArchiveIntegrityStatusCode.UNKNOWN || status === ArchiveIntegrityStatusCode.FAILED
  )
})

const showFourPropertyGate = computed(() => {
  const d = detail.value
  if (!d) return false
  if (!d.latestFourPropertyCheck && d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING) {
    return true
  }
  if (d.fourPropertyStale) return true
  if (showSecurityFourPropertyAlert.value) return true
  return (
    !!d.latestFourPropertyCheck &&
    !d.latestFourPropertyCheck.overallPassed &&
    d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
  )
})

const archiveGatePriorityKeys = computed((): ArchiveGateKey[] => {
  const keys: ArchiveGateKey[] = []
  if (submitChecklistLoadError.value) keys.push('checklistFail')
  if (grantsLoadFailed.value) keys.push('grantsFail')
  if (showRemediationWorkflowStrip.value) keys.push('remediation')
  if (showAppraisalGuidanceStrip.value) keys.push('appraisal')
  if (showIntegrityGate.value) keys.push('integrity')
  if (showFourPropertyGate.value) keys.push('fourProperty')
  if (scoreSubmitBlockReason.value) keys.push('scoreSubmit')
  return keys
})

/** 整改保留竖向富操作 Alert；其余门禁统一 GateOpsStrip */
function isArchiveGateVisible(key: ArchiveGateKey): boolean {
  return key === 'remediation' && showRemediationWorkflowStrip.value
}

const materialsBandStats = ref<ArchiveVolumeMaterialStatsResponse | null>(null)

function onMaterialsStatsReady(stats: ArchiveVolumeMaterialStatsResponse | null): void {
  materialsBandStats.value = stats
}

const materialsSignalMetrics = computed((): SignalMetric[] => {
  const d = detail.value
  if (!d) return []
  const missingCount = d.latestIntegrityCheck?.missingItems?.length ?? 0
  const ready = materialsBandStats.value?.volumeSummary
  const phaseKey = d.submitProgress?.checklistPhaseKey
  const phaseLabel = phaseKey
    ? strictEnumLabel(ArchiveVolumeSubmitChecklistPhaseDescription, phaseKey, 'checklistPhaseKey')
    : '—'
  const catalog = d.catalogStatus
    ? strictEnumLabel(ArchiveCatalogStatusDescription, d.catalogStatus, 'catalogStatus')
    : '—'
  return [
    {
      key: 'missing',
      label: '缺件目录',
      value: missingCount,
      unit: '项',
      tone: missingCount > 0 ? 'red' : 'green',
      iconTone: missingCount > 0 ? 'red' : 'green',
      helper: missingCount > 0 ? '点击查看完整性' : '完整性无缺件',
      clickable: true,
    },
    {
      key: 'ready',
      label: '材料就绪',
      value: ready ? ready.readyCount : '—',
      unit: ready ? `/ ${ready.totalCount}` : undefined,
      tone: 'blue',
      iconTone: 'blue',
      helper: ready ? '已登记且就绪' : '统计加载中',
      clickable: false,
    },
    {
      key: 'phase',
      label: '提交阶段',
      value: phaseLabel,
      tone: d.submitProgress?.submitReady ? 'green' : 'orange',
      iconTone: d.submitProgress?.submitReady ? 'green' : 'orange',
      helper:
        d.submitProgress?.pendingBlockingCount && d.submitProgress.pendingBlockingCount > 0
          ? `${d.submitProgress.pendingBlockingCount} 项阻塞`
          : '清单进度',
      clickable: true,
    },
    {
      key: 'catalog',
      label: '编目状态',
      value: catalog,
      tone: 'gray',
      iconTone: 'gray',
      helper: '目录草稿 / 确认',
      clickable: false,
    },
  ]
})

const scoresSignalMetrics = computed((): SignalMetric[] => {
  const d = detail.value
  if (!d) return []
  const completion = strictEnumLabel(
    ArchiveScoreCompletionStatusDescription,
    d.volume.scoreCompletionStatus,
    'scoreCompletionStatus',
  )
  // MVR-337：scoreSource 可空，禁止把 undefined 传入 strictEnumLabel
  const source = d.volume.scoreSource
    ? strictEnumLabel(ArchiveScoreSourceDescription, d.volume.scoreSource, 'scoreSource')
    : '—'
  const completionCode = d.volume.scoreCompletionStatus
  const completionOk =
    completionCode === ArchiveScoreCompletionStatusCode.COMPLETED ||
    completionCode === ArchiveScoreCompletionStatusCode.VERIFIED ||
    completionCode === ArchiveScoreCompletionStatusCode.NOT_REQUIRED
  return [
    {
      key: 'completion',
      label: '成绩完成度',
      value: completion,
      tone: completionOk ? 'green' : 'orange',
      iconTone: completionOk ? 'green' : 'orange',
      helper: d.volume.scoreConfirmedUserNickName
        ? `确认人 ${d.volume.scoreConfirmedUserNickName}`
        : '待确认成绩完成',
      clickable: false,
    },
    {
      key: 'source',
      label: '成绩来源',
      value: source,
      tone: 'blue',
      iconTone: 'blue',
      helper: d.volume.examId ? '已关联考试' : '未关联考试',
      clickable: false,
    },
    {
      key: 'submit-gate',
      label: '提交门禁',
      value: scoreSubmitBlockReason.value ? '未满足' : '已满足',
      tone: scoreSubmitBlockReason.value ? 'orange' : 'green',
      iconTone: scoreSubmitBlockReason.value ? 'orange' : 'green',
      helper: scoreSubmitBlockReason.value ?? '成绩证明可提交',
      clickable: false,
    },
  ]
})

const integritySignalMetrics = computed((): SignalMetric[] => {
  const d = detail.value
  if (!d) return []
  const status = displayedIntegrityResult.value?.integrityStatus ?? d.volume.integrityStatus
  const statusLabel = strictEnumLabel(ArchiveIntegrityStatusDescription, status, 'integrityStatus')
  const missingCount = displayedIntegrityResult.value?.missingItems?.length ?? 0
  return [
    {
      key: 'integrity',
      label: '完整性',
      value: statusLabel,
      tone:
        status === ArchiveIntegrityStatusCode.PASSED || status === ArchiveIntegrityStatusCode.WAIVED
          ? 'green'
          : 'orange',
      iconTone:
        status === ArchiveIntegrityStatusCode.PASSED || status === ArchiveIntegrityStatusCode.WAIVED
          ? 'green'
          : 'orange',
      helper: missingCount > 0 ? `${missingCount} 项缺件` : '无缺件目录',
      clickable: false,
    },
  ]
})

const selfCheckSignalMetrics = computed((): SignalMetric[] => {
  const d = detail.value
  if (!d) return []
  const status = d.selfCheckStatus
  const statusLabel = status
    ? strictEnumLabel(ArchiveSelfCheckStatusDescription, status, 'selfCheckStatus')
    : '—'
  return [
    {
      key: 'self-check',
      label: '自检清单',
      value: statusLabel,
      tone: status === ArchiveSelfCheckStatusCode.COMPLETED ? 'green' : 'orange',
      iconTone: status === ArchiveSelfCheckStatusCode.COMPLETED ? 'green' : 'orange',
      helper: d.volume.selfCheckConfirmed ? '已签字确认' : '待勾选与签字',
      clickable: false,
    },
  ]
})

const fourPropertySignalMetrics = computed((): SignalMetric[] => {
  const d = detail.value
  if (!d) return []
  const four = displayedFourProperty.value
  const fourSummary = four ? countFourPropertyPassed(buildFourPropertyDimensionViews(four)) : null
  const securityPending = d.volume.securityMarkPending
  return [
    {
      key: 'four-property',
      label: '四性检测',
      value: fourSummary ? `${fourSummary.passed}/${fourSummary.total}` : '未执行',
      tone: d.fourPropertyStale ? 'orange' : four?.overallPassed ? 'green' : 'orange',
      iconTone: d.fourPropertyStale ? 'orange' : four?.overallPassed ? 'green' : 'orange',
      helper: d.fourPropertyStale ? '结论已失效' : '真实性/完整性/可用性/安全性',
      clickable: false,
    },
    {
      key: 'security',
      label: '密级定密',
      value: securityPending ? '待确认' : '已确认',
      tone: securityPending ? 'orange' : 'green',
      iconTone: securityPending ? 'orange' : 'green',
      helper: d.volume.securityLevel
        ? strictEnumLabel(ArchiveSecurityLevelDescription, d.volume.securityLevel, 'securityLevel')
        : '未定密级',
      clickable: false,
    },
  ]
})

const departmentReviewSignalMetrics = computed((): SignalMetric[] => {
  const d = detail.value
  if (!d) return []
  const status = d.volume.volumeStatus
  const statusLabel = strictEnumLabel(ArchiveVolumeStatusDescription, status, 'volumeStatus')
  const pending = status === ArchiveVolumeStatusCode.DEPARTMENT_REVIEW_PENDING
  const reviewed = status === ArchiveVolumeStatusCode.DEPARTMENT_REVIEWED
  return [
    {
      key: 'dept-status',
      label: '院系审核',
      value: pending ? '待审' : reviewed ? '已审' : statusLabel,
      tone: reviewed ? 'green' : pending ? 'orange' : 'blue',
      iconTone: reviewed ? 'green' : pending ? 'orange' : 'blue',
      helper: d.volume.departmentReviewRejectReason ? '存在驳回原因' : '审核状态',
      clickable: false,
    },
    {
      key: 'dept-enabled',
      label: '门禁开关',
      value: d.capabilities?.departmentReviewEnabled === true ? '已启用' : '未启用',
      tone: d.capabilities?.departmentReviewEnabled === true ? 'blue' : 'gray',
      iconTone: d.capabilities?.departmentReviewEnabled === true ? 'blue' : 'gray',
      helper: '租户院系审核配置',
      clickable: false,
    },
  ]
})

const transferSignalMetrics = computed((): SignalMetric[] => {
  const d = detail.value
  if (!d) return []
  const transfer = strictEnumLabel(
    ArchiveTransferStatusDescription,
    d.volume.transferStatus,
    'transferStatus',
  )
  const volume = strictEnumLabel(
    ArchiveVolumeStatusDescription,
    d.volume.volumeStatus,
    'volumeStatus',
  )
  const openRemediation = d.hasOpenRemediationTask
  return [
    {
      key: 'transfer-status',
      label: '移交状态',
      value: transfer,
      tone: 'blue',
      iconTone: 'blue',
      helper: '档案馆验收链路',
      clickable: false,
    },
    {
      key: 'volume-status',
      label: '卷状态',
      value: volume,
      tone: 'gray',
      iconTone: 'gray',
      helper: '归档卷生命周期',
      clickable: false,
    },
    {
      key: 'remediation',
      label: '整改',
      value: openRemediation ? '进行中' : '无',
      tone: openRemediation ? 'red' : 'green',
      iconTone: openRemediation ? 'red' : 'green',
      helper: openRemediation ? '验收前须关闭整改' : '无未关闭整改',
      clickable: openRemediation,
    },
  ]
})

const activeTabSignalMetrics = computed((): SignalMetric[] => {
  switch (activeTab.value) {
    case 'materials':
      return materialsSignalMetrics.value
    case 'scores':
      return scoresSignalMetrics.value
    case 'integrity':
      return integritySignalMetrics.value
    case 'self-check':
      return selfCheckSignalMetrics.value
    case 'four-property':
      return fourPropertySignalMetrics.value
    case 'department-review':
      return departmentReviewSignalMetrics.value
    case 'transfer':
      return transferSignalMetrics.value
    default:
      return []
  }
})

function handleActiveTabSignalClick(key: string): void {
  if (activeTab.value === 'materials') {
    handleMaterialsSignalClick(key)
    return
  }
  if (
    activeTab.value === 'transfer' &&
    key === 'remediation' &&
    showRemediationWorkflowStrip.value
  ) {
    setActiveTab(focusedRemediationTargetTab.value)
  }
}

function handleMaterialsSignalClick(key: string): void {
  if (key === 'missing') {
    setActiveTab('integrity')
    return
  }
  if (key !== 'phase') return
  const phase = detail.value?.submitProgress?.checklistPhaseKey
  if (phase === 'selfCheck') {
    setActiveTab('self-check')
    return
  }
  if (phase === 'departmentReview') {
    setActiveTab('department-review')
    return
  }
  if (phase === 'integrity') {
    setActiveTab('integrity')
    return
  }
  setActiveTab('materials')
}

const archiveGateOpsItems = computed(() => {
  return archiveGatePriorityKeys.value
    .filter((key) => key !== 'remediation')
    .filter((key) => !isArchiveGateNavHiddenOnTab(activeTab.value, key))
    .map((key) => {
      let actionLabel = '去处理'
      let tone: 'blue' | 'orange' | 'red' | 'gray' = 'orange'
      let description = ARCHIVE_GATE_LABEL[key]
      if (key === 'integrity') {
        actionLabel = '去完整性'
        tone = 'orange'
        description = '完整性未通过前无法提交'
      } else if (key === 'fourProperty') {
        actionLabel = '去四性'
        tone = 'orange'
        description = '提交前须完成四性检测'
      } else if (key === 'scoreSubmit') {
        actionLabel = '去成绩证明'
        tone = 'orange'
        description = scoreSubmitBlockReason.value ?? description
      } else if (key === 'appraisal') {
        actionLabel = '进入鉴定'
        tone = 'orange'
        description = appraisalGuidanceDescription.value
      } else if (key === 'checklistFail') {
        actionLabel = '重新加载'
        tone = 'red'
      } else if (key === 'grantsFail') {
        actionLabel = '重新加载'
        tone = 'gray'
        description = '鉴定、销毁与查阅审批操作不可用，请重新加载岗位职责'
      }
      return {
        key,
        title: ARCHIVE_GATE_LABEL[key],
        description,
        actionLabel,
        tone,
      }
    })
})

function handleArchiveGateOpsAction(key: string): void {
  if (key === 'integrity') {
    setActiveTab('integrity')
    return
  }
  if (key === 'fourProperty') {
    setActiveTab('four-property')
    return
  }
  if (key === 'scoreSubmit') {
    setActiveTab('scores')
    return
  }
  if (key === 'appraisal') {
    setActiveTab('appraisal')
    return
  }
  if (key === 'checklistFail') {
    void loadSubmitChecklist()
    return
  }
  if (key === 'grantsFail') {
    void loadGrants()
  }
}

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
  return isSecurityRemediationDiagnostic(code) ? 'four-property' : 'materials'
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
      task.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED &&
      task.assigneeUserId === currentUserId.value
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
        task.createTime
          ? `发现人 ${creator} · ${formatDateTime(task.createTime)}`
          : `发现人 ${creator}`,
      )
    }
    if (
      d?.hasBlockingRemediationForSubmit &&
      d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING &&
      detailScope.canSubmitVolume
    ) {
      parts.push('须关闭整改任务后再提交归档')
    }
    return parts.join(' · ')
  }
  if (
    d?.hasBlockingRemediationForSubmit &&
    d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING &&
    detailScope.canSubmitVolume
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

function canApproveAccessRecord(record: ArchiveVolumeAccessRecordResponse) {
  // MVR-189：与 BE 列表 canApprove 同源（PENDING + 职责密级 + 非申请人），勿仅看 duty
  return record.canApprove === true
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
    setActiveTab('self-check')
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
  // MVR-374：与 detailScope.canRegisterMaterial / BE 材料写同源，仅认 === true
  if (!detailScope.canRegisterMaterial || !d) return false
  return d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
})

const canReviewScanBatches = computed(() => detailScope.capabilities.canReviewScanBatches === true)

/**
 * MVR-382：仅认 BE task.canUpdateTask===true（与 updateRemediationTask / fillRemediationTaskWriteCapabilities 同源）。
 * 禁止 assigneeUserId 本地回退；viewerRemediationTask 须由 BE 下发 can*。
 */
const canAdvanceRemediation = computed(() => {
  const task = focusedRemediationTask.value
  if (
    !task ||
    task.taskStatus === ArchiveRemediationStatusCode.CLOSED ||
    task.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED
  ) {
    return false
  }
  return task.canUpdateTask === true
})

// MVR-339：仅认 BE getDetail canManageRemediationAsCoordinator===true
const canManageCoordinatorRemediation = computed(() => {
  const d = detail.value
  const task = focusedRemediationTask.value
  if (
    !d?.hasOpenRemediationTask ||
    !task ||
    task.taskStatus === ArchiveRemediationStatusCode.CLOSED
  ) {
    return false
  }
  if (task.assigneeUserId === currentUserId.value) return false
  return d.canManageRemediationAsCoordinator === true
})

// MVR-187：与 BE getDetail canAllowMaterialDelay / canWaiveMaterialMissing 同源，勿仅看 duty
const canAllowMaterialDelay = computed(() => detail.value?.canAllowMaterialDelay === true)

const canWaiveMaterialMissing = computed(() => detail.value?.canWaiveMaterialMissing === true)

const canWaiveIntegrity = computed(() => {
  const d = detail.value
  if (d?.canManageArchiveAdmin !== true) return false
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

function goArchiveList(): void {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

/** OCR 终态后刷新卷详情与提交清单；不变量：提示基于刷新后的 fourPropertyStale，避免使用旧 props 判断。 */
async function handleMaterialOcrCompleted() {
  await loadDetail({ silent: true })
  if (detail.value?.fourPropertyStale) {
    void message.info('文字识别已完成，请重新执行完整性/四性检测')
  }
}

watch(manageActionTick, (tick) => {
  if (!tick) {
    return
  }
  if (tick.key === 'export') {
    void handleExport()
    return
  }
  if (tick.key === 'reject') {
    // MVR-382：与 canRejectCollection / BE 驳回收材门禁二次拦截
    if (!detailScope.canRejectCollection) {
      void message.warning('当前账号不可驳回收材')
      return
    }
    collectionRejectOpen.value = true
  }
})

const qualityGuideActionLoading = computed(() => {
  const key = qualityGuide.value?.actionKey
  if (key === 'integrity') {
    return checkingIntegrity.value
  }
  if (key === 'four-property') {
    return checkingFourProperty.value
  }
  return false
})

function handleQualityGuideAction(): void {
  const key = qualityGuide.value?.actionKey
  if (key === 'integrity') {
    void runIntegrityCheck()
    return
  }
  if (key === 'materials') {
    setActiveTab('materials')
    return
  }
  if (key === 'self-check-sign') {
    // MVR-382：与 canSelfCheck 同源，禁止无写权打开签字确认
    if (!detailScope.capabilities.canSelfCheck) {
      void message.warning('当前账号不可进行自查签字确认')
      return
    }
    selfCheckModalOpen.value = true
    return
  }
  if (key === 'four-property') {
    void runFourPropertyCheckFromGuide()
    return
  }
  if (key === 'security-mark') {
    setActiveTab('four-property')
  }
}

async function runFourPropertyCheckFromGuide() {
  // MVR-347：与 canRunFourPropertyCheck 同源；无权限时只切页不发写请求
  if (!canRunFourPropertyCheck.value) {
    void message.warning('当前账号或卷状态不可执行四性检测')
    setActiveTab('four-property')
    return
  }
  if (checkingFourProperty.value) {
    return
  }
  checkingFourProperty.value = true
  try {
    fourPropertyResult.value = await checkArchiveVolumeFourProperty(volumeId.value)
    void message.success('四性检测完成')
    await loadDetail()
  } catch (error) {
    showUserError(error, '四性检测失败')
  } finally {
    checkingFourProperty.value = false
  }
}

async function runIntegrityCheck() {
  // MVR-347：与 detailScope.canRunIntegrityCheck / BE capabilities 同源二次拦截
  if (!detailScope.canRunIntegrityCheck) {
    void message.warning('当前账号或卷状态不可执行完整性自检')
    return
  }
  if (checkingIntegrity.value) {
    return
  }
  checkingIntegrity.value = true
  try {
    integrityResult.value = await checkArchiveVolumeIntegrity(volumeId.value)
    void message.success('完整性检查完成')
    await loadDetail()
  } catch (error) {
    showUserError(error, '完整性检查失败')
  } finally {
    checkingIntegrity.value = false
  }
}

/** 开始收材页提交成功：刷新后进入材料收集，避免停留在已消失的草稿页签。 */
async function handleStartCollectingStarted() {
  await loadDetail()
  setActiveTab('materials')
}

async function executeSubmit(overdueReason?: string) {
  if (submitting.value) {
    return
  }
  // MVR-305：与 canSubmitVolume 同源二次拦截
  if (!detailScope.canSubmitVolume) {
    void message.warning('当前账号无提交归档权限')
    return
  }
  submitting.value = true
  try {
    await submitArchiveVolume({
      volumeId: volumeId.value,
      overdueSubmitReason: overdueReason,
    })
    void message.success('已提交归档')
    overdueSubmitModalOpen.value = false
    overdueSubmitReason.value = ''
    await loadDetail()
  } catch (error) {
    showUserError(error, '提交归档失败')
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
  // MVR-305：与 canSubmitVolume 同源二次拦截
  if (!detailScope.canSubmitVolume) {
    void message.warning('当前账号无提交归档权限')
    return
  }
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
  if (!detailScope.canSubmitVolume) {
    void message.warning('当前账号无提交归档权限')
    return
  }
  const reason = overdueSubmitReason.value.trim()
  if (!reason) {
    showFormValidationMessage('请填写逾期提交说明')
    return
  }
  await executeSubmit(reason)
}

async function handleExport() {
  // MVR-341：与侧栏 canExportManifest 状态闸一致；BE requireVolumeReadable 仍为权威
  if (!canExportManifest.value) {
    void message.warning('当前卷状态不可导出 manifest')
    return
  }
  if (exporting.value) {
    return
  }
  exporting.value = true
  try {
    const result = await exportArchiveVolume(volumeId.value)
    if (!result.exportFileId) {
      showUserError(null, '导出未返回文件编号')
      return
    }
    await downloadFile({ nodeId: result.exportFileId })
    void message.success(`导出完成，材料 ${result.materialCount ?? 0} 项`)
  } catch (error) {
    showUserError(error, '导出归档卷失败')
  } finally {
    exporting.value = false
  }
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
  // MVR-317/382：与 canAdvanceRemediation / BE canUpdateTask 二次拦截
  if (!canAdvanceRemediation.value) {
    void message.warning('当前账号不可推进该整改任务')
    return
  }
  const task = focusedRemediationTask.value
  if (!task?.taskId) return
  if (remediationUpdating.value) {
    return
  }
  remediationUpdating.value = true
  try {
    focusedRemediationTask.value = await updateRemediationTask({
      taskId: task.taskId,
      taskStatus,
    })
    void message.success('整改任务已更新')
    await loadDetail({ silent: true })
  } catch (error) {
    showUserError(error, '更新整改任务失败')
  } finally {
    remediationUpdating.value = false
  }
}

function openRemediationTaskDetail() {
  const taskId = focusedRemediationTask.value?.taskId
  if (!taskId) return
  void router.push({
    name: 'TeacherArchiveVolumeRemediationDetail',
    params: { taskId },
  })
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
        showFormValidationMessage(reason)
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

.archive-volume-detail__ops {
  margin-bottom: var(--dp-space-2);
}

.archive-volume-detail__shell {
  margin-top: 0;
}

.archive-volume-detail__overdue-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.archive-volume-detail__signal {
  margin-bottom: 0;
}

.archive-volume-detail__panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-4);
}

.archive-volume-detail__catalog-editor {
  margin-bottom: 0;
}

.archive-volume-detail__catalog {
  display: grid;
  grid-template-columns: minmax(260px, 280px) minmax(0, 1fr);
  gap: var(--dp-space-3);
  align-items: stretch;
  min-height: 420px;
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
  min-height: 120px;
}

.archive-volume-detail__load-error {
  max-width: 520px;
  margin: var(--dp-space-6) auto;
  padding: var(--dp-space-2);
}

.archive-volume-detail__load-error-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--dp-space-2);
}
</style>
