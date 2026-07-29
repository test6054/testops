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
            <UiButton variant="primary" size="sm" :loading="loading === true" @click="() => loadDetail()">
              重新加载
            </UiButton>
            <UiButton variant="outline" size="sm" @click="goArchiveList"> 返回列表 </UiButton>
          </div>
        </template>
      </UiEmpty>
    </WorkbenchSurfaceCard>

    <template v-else-if="detail">
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
          <UiButton size="sm" variant="outline" @click="setActiveTab(focusedRemediationTargetTab)">
            {{ focusedRemediationPrimaryLabel }}
          </UiButton>
          <UiButton
            v-if="
              canAdvanceRemediation === true
                && focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.OPEN
            "
            size="sm"
            variant="outline"
            :loading="remediationUpdating === true"
            @click="advanceRemediation(ArchiveRemediationStatusCode.IN_PROGRESS)"
          >
            开始处理
          </UiButton>
          <UiButton
            v-if="
              canAdvanceRemediation === true
                && focusedRemediationTask?.taskStatus === ArchiveRemediationStatusCode.IN_PROGRESS
            "
            size="sm"
            variant="outline"
            :loading="remediationUpdating === true"
            @click="advanceRemediation(ArchiveRemediationStatusCode.RESUBMITTED)"
          >
            标记已重提
          </UiButton>
          <UiButton
            v-if="canManageCoordinatorRemediation === true"
            size="sm"
            variant="ghost"
            @click="openRemediationTaskDetail"
          >
            整改任务详情
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
                v-if="detailScope.canStartCollecting === true && !isQualityTab && !isManageTab"
                :variant="detailScope.canSubmitVolume === true ? 'outline' : 'primary'"
                size="sm"
                @click="setActiveTab('start-collecting')"
              >
                开始收材
              </UiButton>
              <UiButton
                v-if="
                  detailScope.showSubmitActions === true && detailScope.canSubmitVolume !== true && !isQualityTab
                "
                variant="outline"
                size="sm"
                disabled
                :title="detailScope.submitActionDisabledHint ?? submitBlockReason ?? undefined"
              >
                提交归档
              </UiButton>
              <UiButton
                v-if="detailScope.canSubmitVolume === true && !isQualityTab"
                variant="outline"
                size="sm"
                :loading="submitting === true"
                @click="handleSubmit"
              >
                提交归档
              </UiButton>
              <UiButton
                v-if="detailScope.showSelfCheckButton === true && !isQualityTab"
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
            layout="spotlight"
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
              :readonly="detailScope.canEditCatalog !== true"
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
            @refreshed="loadDetail"
            @open-materials="setActiveTab('materials')"
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
            :current-user-id="currentUserId"
            :can-run-integrity="detailScope.canRunIntegrityCheck"
            :can-allow-material-delay="canAllowMaterialDelay"
            :can-request-integrity-waive="canRequestIntegrityWaive"
            :can-approve-integrity-waive="canApproveIntegrityWaive"
            :can-request-material-waive="canRequestMaterialWaive"
            :can-approve-material-waive="canApproveMaterialWaive"
            @run-integrity-check="runIntegrityCheck"
            @refreshed="loadDetail"
          />

          <ArchiveVolumeSelfCheckList
            v-else-if="activeTab === 'self-check'"
            :volume-id="volumeId"
            :self-check-status="detail.selfCheckStatus"
            :readonly="detailScope.canEditSelfCheck !== true"
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
      <UiEmpty
        size="md"
        show-icon
        title="无法加载归档任务"
      >
        <template #action>
          <div class="archive-volume-detail__load-error-actions">
            <UiButton variant="primary" size="sm" :loading="loading === true" @click="() => loadDetail()">
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
      :confirm-loading="submitting === true"
      @ok="confirmOverdueSubmit"
    >
      <p class="archive-volume-detail__overdue-hint">
        本任务已超过归档截止时刻。当前为软截止策略，须填写逾期说明后方可提交档案馆验收；工程认证/评估租户应在归档设置中启用「逾期硬截止」。
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
// MVR-948：detailScope.can* 控制流仅认 === true
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
// MVR-943：can*/writeAllowed 控制流仅认 === true / !== true
import type {
  ArchiveRemediationTaskResponse,
  ArchiveVolumeAccessRecordResponse,
  ArchiveVolumeDetailResponse,
  ArchiveVolumeMaterialStatsResponse,
  ArchiveVolumeSubmitChecklistItemVO,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadFile } from '@/apis/edu/file-management'
import {
  ARCHIVE_REMEDIATION_STATUS_TONE,
  ArchiveCatalogStatusDescription,
  ArchiveIntegrityStatusCode,
  ArchiveIntegrityStatusDescription,
  ArchiveRemediationStatusCode,
  ArchiveRemediationStatusDescription,
  ArchiveScoreSourceCode,
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
import { resolveSubmitChecklistNavigation } from '@/composables/useArchiveSubmitChecklistRouter'
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
import { navigateExamWorkspaceRoute } from '@/utils/exam-workspace-navigation'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
// 常驻壳条同步引入；按 tab / 弹窗挂载的面板走异步 chunk，避免详情首屏打进全部材料表/成绩等大模块
import ArchiveVolumeGateOpsStrip from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeGateOpsStrip.vue'
import ArchiveVolumeQualityGuideStrip from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeQualityGuideStrip.vue'
import ArchiveVolumeSubmitProgressBand from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitProgressBand.vue'

defineOptions({ name: 'TeacherArchiveVolumeDetail' })

const ArchiveCollectionRejectDialog = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/ArchiveCollectionRejectDialog.vue'),
)
const ArchiveScanBatchReviewPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveScanBatchReviewPanel.vue'),
)
const ArchiveScanBatchSnapshotPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveScanBatchSnapshotPanel.vue'),
)
const ArchiveVolumeAccessPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeAccessPanel.vue'),
)
const ArchiveVolumeAppraisalPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeAppraisalPanel.vue'),
)
const ArchiveVolumeCatalogEditor = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeCatalogEditor.vue'),
)
const ArchiveVolumeCollaboratorsPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeCollaboratorsPanel.vue'),
)
const ArchiveVolumeEventsPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeEventsPanel.vue'),
)
const ArchiveVolumeFourPropertyPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeFourPropertyPanel.vue'),
)
const ArchiveVolumeIntegrityPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeIntegrityPanel.vue'),
)
const ArchiveVolumeMaterialTablePanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTablePanel.vue'),
)
const ArchiveVolumeMaterialTreePanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialTreePanel.vue'),
)
const ArchiveVolumeNextStepsPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeNextStepsPanel.vue'),
)
const ArchiveVolumeOcrSearchPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeOcrSearchPanel.vue'),
)
const ArchiveVolumePhysicalLocationPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumePhysicalLocationPanel.vue'),
)
const ArchiveVolumeScoresPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeScoresPanel.vue'),
)
const ArchiveVolumeSelfCheckList = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeSelfCheckList.vue'),
)
const ArchiveVolumeStartCollectingPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeStartCollectingPanel.vue'),
)
const ArchiveVolumeSubmitChecklistModal = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeSubmitChecklistModal.vue'),
)
const ArchiveVolumeTaskSettingsPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeTaskSettingsPanel.vue'),
)
const ArchiveVolumeTransferPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/ArchiveVolumeTransferPanel.vue'),
)
const DepartmentReviewPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/DepartmentReviewPanel.vue'),
)
const DigitalMaterialConfirmPanel = defineAsyncComponent(
  () => import('@/views/teacher/archive-volume/components/detail/DigitalMaterialConfirmPanel.vue'),
)

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
        status === ArchiveIntegrityStatusCode.UNKNOWN
        || status === ArchiveIntegrityStatusCode.FAILED
      ) {
        return {
          title: '先执行完整性自检',
          description: '对照必交材料检查缺件，通过后再做自检清单与四性',
          actionLabel: detailScope.canRunIntegrityCheck === true ? '执行完整性自检' : undefined,
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
        d.selfCheckStatus === ArchiveSelfCheckStatusCode.COMPLETED
        || d.volume.selfCheckConfirmed === true
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
      if (d.volume.securityMarkPending === true) {
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
          actionLabel: d.canConfirmSecurityMark === true ? '确认密级定密' : undefined,
          actionKey: 'security-mark',
        }
      }
      if (d.fourPropertyStale === true || !displayedFourProperty.value) {
        return {
          title: d.fourPropertyStale === true ? '四性结论已失效，请重新检测' : '尚未执行四性检测',
          description: '材料或密级变更后须重新执行四性检测',
          actionLabel: canRunFourPropertyCheck.value === true ? '执行四性检测' : undefined,
          actionKey: 'four-property',
        }
      }
      return {
        title: '四性检测已完成',
        description: displayedFourProperty.value.overallPassed === true
          ? '四性结论有效'
          : '存在未通过项，请修复后重检',
        actionLabel:
          canRunFourPropertyCheck.value === true && displayedFourProperty.value.overallPassed !== true
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
    detailScope.canStartCollecting === true
    || detailScope.showSubmitActions === true
    || detailScope.canSubmitVolume === true
    || detailScope.showSelfCheckButton === true
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
      action.targetTabKey !== activeTab.value
      && (!action.targetTabKey || !gateTargets.has(action.targetTabKey)),
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
  if (!d || !check || d.fourPropertyStale === true) return false
  return check.securityPassed === false
})

const canRunFourPropertyCheck = computed(() => {
  const d = detail.value
  if (!d) return false
  // 与 BE checkFourProperty：COLLECTING→requireCanManageMaterials；SUBMITTED→移交验收岗
  if (d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING) {
    return detailScope.capabilities.canManageMaterials === true
  }
  return d.volume.volumeStatus === ArchiveVolumeStatusCode.SUBMITTED && canReviewTransfer.value === true
})

// MVR-188：成绩完成确认主链已退役；成绩齐备走材料完整性
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
  if (d.volume.scoreSource === ArchiveScoreSourceCode.MARK_INTERNAL) {
    return '线上阅卷双门禁未满足，或成绩主证据材料未齐备'
  }
  if (d.volume.scoreSource === ArchiveScoreSourceCode.TEACHING_AFFAIRS) {
    return '教务成绩尚未同步完成，或成绩主证据材料未齐备'
  }
  return '成绩主证据未齐备：请登记并提交成绩单或分项成绩'
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
type ArchiveGateKey
  = | 'checklistFail'
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
  scoreSubmit: '线上阅卷成绩门禁',
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
  if (d.fourPropertyStale === true) return true
  if (showSecurityFourPropertyAlert.value) return true
  return (
    !!d.latestFourPropertyCheck
    && d.latestFourPropertyCheck.overallPassed !== true
    && d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
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
      iconTone: missingCount > 0 ? 'gray' : 'green',
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
      tone: d.volume.submitReady === true ? 'green' : 'orange',
      iconTone: d.volume.submitReady === true ? 'green' : 'gray',
      helper:
        d.submitProgress?.pendingBlockingCount && d.submitProgress.pendingBlockingCount > 0
          ? `${d.submitProgress.pendingBlockingCount} 项阻塞`
          : '清单进度',
      clickable: true,
      emphasis: 'primary',
      actionLabel:
        d.submitProgress?.pendingBlockingCount && d.submitProgress.pendingBlockingCount > 0
          ? '处理阻塞'
          : '查看进度',
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
  const isMarkInternal = d.volume.scoreSource === ArchiveScoreSourceCode.MARK_INTERNAL
  const scoreReady = isScoreSubmitReady(d.volume)
  return [
    {
      key: 'materials',
      label: '成绩主证据',
      value: scoreReady ? '已齐备' : '待补齐',
      tone: scoreReady ? 'green' : 'orange',
      iconTone: scoreReady ? 'green' : 'gray',
      helper: '成绩单/分项成绩须提交，豁免不可替代',
      clickable: true,
      emphasis: scoreReady ? 'secondary' : 'primary',
      actionLabel: scoreReady ? undefined : '补齐证据',
    },
    {
      key: 'exam-gate',
      label: '考试门禁',
      value: isMarkInternal ? (d.volume.examGateOpen === true ? '已满足' : '未满足') : '不适用',
      tone: !isMarkInternal ? 'gray' : d.volume.examGateOpen === true ? 'green' : 'orange',
      iconTone: !isMarkInternal ? 'gray' : d.volume.examGateOpen === true ? 'green' : 'gray',
      helper: isMarkInternal
        ? (d.volume.examGateOpen === true ? '线上阅卷双门禁已开放' : '须成绩发布且门禁开放')
        : '非线上卷不走考试门禁',
      clickable: false,
    },
    {
      key: 'submit-gate',
      label: '提交门禁',
      value: scoreSubmitBlockReason.value ? '未满足' : '已满足',
      tone: scoreSubmitBlockReason.value ? 'orange' : 'green',
      iconTone: scoreSubmitBlockReason.value ? 'gray' : 'green',
      helper: scoreSubmitBlockReason.value ?? '成绩维度可提交',
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
          : 'gray',
      helper: missingCount > 0 ? `${missingCount} 项缺件` : '无缺件目录',
      clickable: false,
      emphasis: 'primary',
      actionLabel: missingCount > 0 ? '查看缺件' : undefined,
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
      iconTone: status === ArchiveSelfCheckStatusCode.COMPLETED ? 'green' : 'gray',
      helper: d.volume.selfCheckConfirmed === true ? '已签字确认' : '待勾选与签字',
      clickable: false,
    },
  ]
})

const fourPropertySignalMetrics = computed((): SignalMetric[] => {
  const d = detail.value
  if (!d) return []
  const four = displayedFourProperty.value
  const fourSummary = four ? countFourPropertyPassed(buildFourPropertyDimensionViews(four)) : null
  const securityPending = d.volume.securityMarkPending === true
  return [
    {
      key: 'four-property',
      label: '四性检测',
      value: fourSummary ? `${fourSummary.passed}/${fourSummary.total}` : '未执行',
      tone: d.fourPropertyStale === true ? 'orange' : four?.overallPassed === true ? 'green' : 'orange',
      iconTone: d.fourPropertyStale === true ? 'gray' : four?.overallPassed === true ? 'green' : 'gray',
      helper: d.fourPropertyStale === true ? '结论已失效' : '真实性/完整性/可用性/安全性',
      clickable: false,
    },
    {
      key: 'security',
      label: '密级定密',
      value: securityPending ? '待确认' : '已确认',
      tone: securityPending ? 'orange' : 'green',
      iconTone: securityPending ? 'gray' : 'green',
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
      iconTone: reviewed ? 'green' : pending ? 'gray' : 'blue',
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
      iconTone: openRemediation ? 'gray' : 'green',
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
  if (activeTab.value === 'scores' && key === 'materials') {
    setActiveTab('materials')
    return
  }
  if (
    activeTab.value === 'transfer'
    && key === 'remediation'
    && showRemediationWorkflowStrip.value
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
    .slice(0, 1)
    .map((key) => {
      let actionLabel: string | undefined = '去处理'
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
        actionLabel = '查看考试门禁'
        tone = 'orange'
        description = scoreSubmitBlockReason.value ?? description
      } else if (key === 'appraisal') {
        actionLabel = '进入鉴定'
        tone = 'orange'
        description = appraisalGuidanceDescription.value
      } else if (key === 'checklistFail' || key === 'grantsFail') {
        actionLabel = undefined
        tone = 'red'
        description
          = key === 'grantsFail'
            ? '鉴定、销毁与查阅审批操作不可用'
            : ARCHIVE_GATE_LABEL[key]
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
        task.createTime
          ? `发现人 ${creator} · ${formatDateTime(task.createTime)}`
          : `发现人 ${creator}`,
      )
    }
    if (
      d?.hasBlockingRemediationForSubmit
      && d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
      && detailScope.canSubmitVolume === true
    ) {
      parts.push('须关闭整改任务后再提交归档')
    }
    return parts.join(' · ')
  }
  if (
    d?.hasBlockingRemediationForSubmit
    && d.volume.volumeStatus === ArchiveVolumeStatusCode.COLLECTING
    && detailScope.canSubmitVolume === true
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

/** 提交清单阻塞项跳转：考试工作台门禁，或详情 Tab / 自查 Modal。 */
function handleSubmitChecklistNavigate(item: ArchiveVolumeSubmitChecklistItemVO) {
  try {
    const navigation = resolveSubmitChecklistNavigation(item, detail.value?.volume.examId)
    if (navigation.kind === 'examWorkspace') {
      navigateExamWorkspaceRoute(
        router,
        navigation.routeName,
        { examId: navigation.examId },
        '归档提交清单考试门禁入口',
      )
      return
    }
    const routeTarget = navigation.target
    if (routeTarget.checklistPhaseKey === 'selfCheck') {
      setActiveTab('self-check')
      return
    }
    if (routeTarget.checklistPhaseKey === 'departmentReview') {
      setActiveTab('department-review')
      return
    }
    setActiveTab(routeTarget.detailTabKey)
  } catch (error) {
    showUserError(error, '提交清单跳转失败')
  }
}

const canExportManifest = computed(() => {
  const status = detail.value?.volume.volumeStatus
  return status === ArchiveVolumeStatusCode.SUBMITTED || status === ArchiveVolumeStatusCode.STORED
})

const canEditPhysicalLocation = computed(() => {
  const d = detail.value
  // MVR-374：与 detailScope.canRegisterMaterial / BE 材料写同源，仅认 === true
  if (detailScope.canRegisterMaterial !== true || !d) return false
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
    !task
    || task.taskStatus === ArchiveRemediationStatusCode.CLOSED
    || task.taskStatus === ArchiveRemediationStatusCode.RESUBMITTED
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
    d?.hasOpenRemediationTask !== true
    || !task
    || task.taskStatus === ArchiveRemediationStatusCode.CLOSED
  ) {
    return false
  }
  if (task.assigneeUserId === currentUserId.value) return false
  return d.canManageRemediationAsCoordinator === true
})

// MVR-187：与 BE getDetail canAllowMaterialDelay / canRequest*Waive 同源，勿仅看 duty
const canAllowMaterialDelay = computed(() => detail.value?.canAllowMaterialDelay === true)

const canRequestMaterialWaive = computed(() => detail.value?.canRequestMaterialWaive === true)
const canApproveMaterialWaive = computed(() => detail.value?.canApproveMaterialWaive === true)
const canRequestIntegrityWaive = computed(() => detail.value?.canRequestIntegrityWaive === true)
const canApproveIntegrityWaive = computed(() => detail.value?.canApproveIntegrityWaive === true)

const canRequestAccess = computed(
  () => detail.value?.volume.volumeStatus === ArchiveVolumeStatusCode.STORED,
)

async function loadDetail(options?: { silent?: boolean }) {
  await workbench.loadDetail(options)
  if (detail.value) {
    fourPropertyResult.value = detail.value.latestFourPropertyCheck
    integrityResult.value = detail.value.latestIntegrityCheck ?? null
    syncFocusedRemediationTaskFromDetail()
  }
}

function goArchiveList(): void {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

/** OCR 终态后刷新卷详情与提交清单；不变量：提示基于刷新后的 fourPropertyStale，避免使用旧 props 判断。 */
async function handleMaterialOcrCompleted() {
  await loadDetail({ silent: true })
  if (detail.value?.fourPropertyStale === true) {
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
    if (detailScope.canRejectCollection !== true) {
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
    // MVR-939：BE 能力位仅认 === true
    if (detailScope.capabilities.canSelfCheck !== true) {
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
  if (canRunFourPropertyCheck.value !== true) {
    void message.warning('当前账号或卷状态不可执行四性检测')
    setActiveTab('four-property')
    return
  }
  if (checkingFourProperty.value === true) {
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
  if (detailScope.canRunIntegrityCheck !== true) {
    void message.warning('当前账号或卷状态不可执行完整性自检')
    return
  }
  if (checkingIntegrity.value === true) {
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
  if (submitting.value === true) {
    return
  }
  // MVR-305：与 canSubmitVolume 同源二次拦截
  // MVR-939：BE 能力位仅认 === true
  if (detailScope.canSubmitVolume !== true) {
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
  // 软截止：未启用硬截止时逾期须填说明留痕；硬截止由能力位禁提交
  return d.volume.overdueSubmitBlocked !== true
}

function isArchiveDueHardBlocked(d: ArchiveVolumeDetailResponse): boolean {
  if (!d.volume.archiveDueTime || !isArchiveDueOverdue(d.volume.archiveDueTime)) return false
  return d.volume.overdueSubmitBlocked === true
}

async function handleSubmit() {
  const d = detail.value
  if (!d) return
  // MVR-937：提交入口防重入，避免连点打开逾期弹窗或并发 executeSubmit
  if (submitting.value === true) {
    return
  }
  // MVR-305：与 canSubmitVolume 同源二次拦截
  if (detailScope.canSubmitVolume !== true) {
    void message.warning(
      detailScope.submitActionDisabledHint
      ?? (isArchiveDueHardBlocked(d)
          ? '归档已逾期且启用硬截止，请先展期归档截止时刻'
          : '当前账号无提交归档权限'),
    )
    return
  }
  if (d.volume.requireSelfCheckConfirm === true && d.volume.selfCheckConfirmed !== true) {
    selfCheckModalOpen.value = true
    return
  }
  if (isArchiveDueHardBlocked(d)) {
    void message.warning('归档已逾期且启用硬截止，禁止提交；请由责任人在「任务设置」展期截止后再提交')
    return
  }
  if (requiresOverdueSubmitReason(d)) {
    overdueSubmitModalOpen.value = true
    return
  }
  await executeSubmit()
}

async function confirmOverdueSubmit() {
  // MVR-937：逾期提交确认防重入
  if (submitting.value === true) {
    return
  }
  if (detailScope.canSubmitVolume !== true) {
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
  if (canExportManifest.value !== true) {
    void message.warning('当前卷状态不可导出 manifest')
    return
  }
  if (exporting.value === true) {
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
  if (canAdvanceRemediation.value !== true) {
    void message.warning('当前账号不可推进该整改任务')
    return
  }
  const task = focusedRemediationTask.value
  if (!task?.taskId) return
  if (remediationUpdating.value === true) {
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
      const reason = detailScope.submitActionDisabledHint
        ?? describeSubmitBlockReasonForDetail(
          d,
          currentUserId.value,
          submitBlockingItems.value,
        )
        ?? (isArchiveDueHardBlocked(d)
          ? '归档已逾期且启用硬截止，请先展期归档截止时刻'
          : null)
      if (reason) {
        showFormValidationMessage(reason)
      }
      clearSubmitIntentQuery()
      return
    }
    clearSubmitIntentQuery()
    void message.info('已进入提交核对页，请确认待办清单后手动提交')
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.archive-volume-detail__alert {
  margin-bottom: var(--dp-space-block);
}

.archive-volume-detail__remediation-assignee {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.archive-volume-detail__ops {
  margin-bottom: var(--dp-space-component-tight);
}

.archive-volume-detail__shell {
  margin-top: 0;
}

.archive-volume-detail__overdue-hint {
  margin: 0 0 var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}

.archive-volume-detail__signal {
  margin-bottom: 0;
}

.archive-volume-detail__panel {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-block);
}

.archive-volume-detail__catalog-editor {
  margin-bottom: 0;
}

.archive-volume-detail__catalog {
  display: grid;
  grid-template-columns: minmax(260px, 280px) minmax(0, 1fr);
  gap: var(--dp-space-component);
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
  gap: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-secondary);
}

.archive-volume-detail__panel-surface {
  min-height: 120px;
}

.archive-volume-detail__load-error {
  max-width: 520px;
  margin: var(--dp-space-page) auto;
  padding: var(--dp-space-component-tight);
}

.archive-volume-detail__load-error-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--dp-space-component-tight);
}
</style>
