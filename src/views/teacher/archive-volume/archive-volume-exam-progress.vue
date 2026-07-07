<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench">
        <template #status>
          <UiTag v-if="reviewStatusLabel" :tone="reviewStatusTone" size="sm">
            {{ reviewStatusLabel }}
          </UiTag>
          <UiTag v-if="isPackaging" tone="blue" size="sm">打包中</UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="showGateScorePublishAction"
            variant="outline"
            size="sm"
            @click="goScorePublish"
          >
            前往成绩发布
          </UiButton>
          <UiButton
            v-if="showGateCloseExamAction"
            variant="primary"
            size="sm"
            @click="goExamListForClose"
          >
            前往关考
          </UiButton>
          <UiButton
            v-if="showRetryPackagingAction"
            variant="outline"
            size="sm"
            :loading="packagingActionLoading"
            @click="retryPackaging"
          >
            重新打包
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="!canCreatePackage"
            :loading="packagingActionLoading"
            @click="createPackage"
          >
            创建归档包
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="reviewSignals.length > 0" #signal>
      <SignalBand variant="tiles" compact :metrics="reviewSignals" />
    </template>

    <ExamWorkspaceJourneySubNav />

    <UiSkeletonState v-if="loading" variant="card" compact />

    <template v-else>
      <a-result
        v-if="loadFailed"
        status="error"
        title="加载归档复盘失败"
        sub-title="归档复盘数据暂时不可用，请从考试工作台重新进入本页"
      />

      <template v-else-if="review">
        <WorkflowReadinessPanel
          v-if="archiveGateWorkflow"
          :title="archiveGateWorkflow.panelTitle"
          :steps="archiveGateWorkflow.steps"
        />

        <ArchiveLifecyclePipe
          v-if="lifecycleSteps.length > 0"
          class="archive-exam-review__lifecycle"
          title="归档生命周期"
          :steps="lifecycleSteps"
        />

        <div v-if="isPackaging" class="archive-exam-review__packaging">
          <div class="archive-exam-review__packaging-head">
            <span>{{ packagingProgressLabel }}</span>
            <span class="archive-exam-review__packaging-percent">{{ packagingProgressPercent }}%</span>
          </div>
          <div class="archive-exam-review__packaging-track">
            <div
              class="archive-exam-review__packaging-bar"
              :style="{ width: `${packagingProgressPercent}%` }"
            />
          </div>
        </div>

        <div class="archive-exam-review__grid">
          <WorkbenchSurfaceCard class="archive-exam-review__main">
            <template #head>归档时间线</template>
            <ArchivePackageTimeline :steps="packageTimelineSteps" />
          </WorkbenchSurfaceCard>

          <ArchiveExamExportTasksCard
            ref="exportTasksRef"
            :exam-id="examId"
            :can-create="gateOpen"
          />
        </div>

        <a-collapse
          v-if="showVolumeCollapse"
          v-model:active-key="volumeCollapseActiveKeys"
          class="archive-exam-review__volume-collapse"
          :bordered="false"
        >
          <a-collapse-panel key="volumes" :header="volumeCollapseHeader">
            <UiDataTable
              pagination-mode="none"
              :columns="volumeTableColumns"
              :data-source="healthyVolumes"
              :show-pagination="false"
              flat
              row-key="volumeId"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'integrityStatus'">
                  <ArchiveDimPill
                    :tone="integrityStatusDimTone(record.integrityStatus)"
                    :label="integrityStatusLabel(record.integrityStatus)"
                  />
                </template>
                <template v-else-if="column.key === 'volumeStatus'">
                  <ArchiveDimPill
                    :tone="volumeStatusDimTone(record.volumeStatus)"
                    :label="volumeStatusLabel(record.volumeStatus)"
                  />
                </template>
                <template v-else-if="column.key === 'lifecycleProgress'">
                  {{ formatVolumeLifecycleProgress(record.volumeId) }}
                </template>
                <template v-else-if="column.key === 'action'">
                  <UiTableActions
                    :items="[{ key: 'detail', label: '打开详情' }]"
                    split
                    @action="() => goDetail(record.volumeId)"
                  />
                </template>
              </template>
            </UiDataTable>
            <ArchiveExamAutoCreateStatus
              v-if="showVolumeAutoCreateStatus"
              :exam-gate="examGate"
              :poll-timed-out="pollTimedOut"
              :has-auto-create-failure="hasAutoCreateFailure"
              :auto-create-failed-description="autoCreateFailedDescription"
              :show-retry-auto-create="showRetryAutoCreate"
              :pending-retry-description="pendingRetryDescription"
              :show-non-owner-hint="showNonOwnerHint"
              :auto-create-failed-needs-class-scope="autoCreateFailedNeedsClassScope"
              :retrying="retrying"
              :polling="polling"
              class="archive-exam-review__volume-status"
              @retry="retryAutoCreate"
              @go-candidate-roster="goCandidateRoster"
            />
          </a-collapse-panel>
        </a-collapse>
      </template>
    </template>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type {
  ArchiveVolumeEventVO,
  ArchiveVolumeExamArchiveReviewVO,
  ArchiveVolumeExamVolumeProgressItemVO,
  ArchiveVolumeResponse,
} from '@/apis/mark/archive-volume'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArchiveIntegrityStatusDescription,
  ArchiveVolumeStatusDescription,
  getArchiveVolumeDetail,
  getArchiveVolumeExamReview,
  pageArchiveVolumes,
  retryArchiveVolumeAutoCreate,
} from '@/apis/mark/archive-volume'
import { createExamArchivePackage, retryExamArchivePackaging } from '@/apis/mark/exam-archive'
import ArchiveDimPill from '@/components/archive-volume/ArchiveDimPill.vue'
import ArchiveExamAutoCreateStatus from '@/components/archive-volume/ArchiveExamAutoCreateStatus.vue'
import ArchiveExamExportTasksCard from '@/components/archive-volume/ArchiveExamExportTasksCard.vue'
import ArchiveLifecyclePipe from '@/components/archive-volume/ArchiveLifecyclePipe.vue'
import ArchivePackageTimeline from '@/components/archive-volume/ArchivePackageTimeline.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import WorkflowReadinessPanel from '@/components/workbench/workflow-readiness/WorkflowReadinessPanel.vue'
import { useArchiveAutoCreatePoll } from '@/composables/useArchiveAutoCreatePoll'
import { useScoreReleaseNavigation } from '@/composables/useScoreReleaseNavigation'
import {
  ArchiveAutoCreateFailureCategoryCode,
  ArchiveAutoCreateFailureCategoryHintDescription,
  CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES,
  isArchiveAutoCreateFailureCategory,
} from '@/constants/archive-auto-create-failure-category'
import { ArchivePackageStatusCode, ArchivePackageStatusDescription } from '@/types/enums/archive-package-status-enum'
import { ArchiveVolumeAutoCreatePendingStatusCode } from '@/types/enums/archive-volume-auto-create-pending-status-enum'
import { integrityStatusDimTone, volumeStatusDimTone } from '@/utils/archive-dimension-pill'
import { buildArchivePackageLifecycleSteps } from '@/utils/archive-package-lifecycle'
import { showUserError } from '@/utils/error-handler'
import { formatFileSize } from '@/utils/format'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'
import { resolveArchiveGateWorkflowSteps } from '@/utils/workflow-readiness/archive-gate-readiness'

defineOptions({ name: 'TeacherArchiveVolumeExamProgress' })

const DEFAULT_RETENTION_YEARS = 10
const EXAM_ARCHIVE_VOLUME_PAGE_SIZE = 50
const PACKAGING_POLL_MS = 5000

const route = useRoute()
const router = useRouter()
const { goScorePublish } = useScoreReleaseNavigation()

const showGateScorePublishAction = computed(() => {
  const gate = examGate.value
  return Boolean(gate && !gate.gateOpen && !gate.allScoresPublished)
})

const showGateCloseExamAction = computed(() => {
  const gate = examGate.value
  return Boolean(gate && !gate.gateOpen && gate.allScoresPublished && !gate.examClosed)
})
const examId = computed(() => String(route.params.examId ?? ''))

const loading = ref(true)
const loadFailed = ref(false)
const review = ref<ArchiveVolumeExamArchiveReviewVO | null>(null)
const healthyVolumes = ref<ArchiveVolumeResponse[]>([])
const events = ref<ArchiveVolumeEventVO[]>([])
const retrying = ref(false)
const packagingActionLoading = ref(false)
const pollTimedOut = ref(false)
const volumeCollapseActiveKeys = ref<string[]>([])
const exportTasksRef = ref<InstanceType<typeof ArchiveExamExportTasksCard> | null>(null)
let packagingPollTimer: ReturnType<typeof setInterval> | null = null

const { polling, pollUntilHealthy } = useArchiveAutoCreatePoll({ examId })

const examGate = computed(() => review.value?.gate ?? null)
const archiveGateWorkflow = computed(() =>
  resolveArchiveGateWorkflowSteps({
    gate: examGate.value,
    examId: examId.value || undefined,
  }),
)
const archivePackage = computed(() => review.value?.archivePackage ?? null)
const packageTimelineSteps = computed(() => review.value?.packageTimelineSteps ?? [])
const gateOpen = computed(() => examGate.value?.gateOpen === true)

const expectedAutoCreateVolumeCount = computed(
  () => examGate.value?.expectedAutoCreateVolumeCount ?? null,
)

const isPackaging = computed(
  () => archivePackage.value?.archiveStatus === ArchivePackageStatusCode.PACKAGING,
)

const packagingProgressPercent = computed(() => {
  const percent = archivePackage.value?.packagingProgressPercent
  return percent != null && percent >= 0 ? percent : 0
})

const packagingProgressLabel = computed(
  () => archivePackage.value?.packagingProgressMessage?.trim() || '系统正在打包归档物料',
)

const lifecycleSteps = computed(() =>
  buildArchivePackageLifecycleSteps(archivePackage.value?.archiveStatus),
)

const canCreatePackage = computed(() => {
  if (!gateOpen.value || packagingActionLoading.value) {
    return false
  }
  const status = archivePackage.value?.archiveStatus
  if (status === ArchivePackageStatusCode.PACKAGING_FAILED) {
    return false
  }
  if (!status) {
    return true
  }
  return status === ArchivePackageStatusCode.DRAFT
})

const showRetryPackagingAction = computed(
  () => gateOpen.value && archivePackage.value?.archiveStatus === ArchivePackageStatusCode.PACKAGING_FAILED,
)

const reviewStatusLabel = computed(() => {
  const gate = examGate.value
  if (!gate) {
    return ''
  }
  if (archivePackage.value?.archiveStatusLabel) {
    return archivePackage.value.archiveStatusLabel
  }
  if (!gate.gateOpen && gate.allScoresPublished && !gate.examClosed) {
    return '待关考'
  }
  if (!gate.gateOpen) {
    return '双门禁未满足'
  }
  return '待创建归档包'
})

const reviewStatusTone = computed(() => {
  const pkgStatus = archivePackage.value?.archiveStatus
  if (pkgStatus === ArchivePackageStatusCode.ACTIVE || pkgStatus === ArchivePackageStatusCode.STORED) {
    return 'green' as const
  }
  if (pkgStatus === ArchivePackageStatusCode.PACKAGING || pkgStatus === ArchivePackageStatusCode.DRAFT) {
    return 'blue' as const
  }
  if (pkgStatus === ArchivePackageStatusCode.PACKAGING_FAILED
    || pkgStatus === ArchivePackageStatusCode.DESTRUCTION_FAILED) {
    return 'red' as const
  }
  if (!gateOpen.value) {
    return 'orange' as const
  }
  return 'gray' as const
})

const reviewSignals = computed<SignalMetric[]>(() => {
  const pkg = archivePackage.value
  const retentionLabel = pkg?.permanentRetention
    ? '永久'
    : pkg?.retentionYears != null
      ? `${pkg.retentionYears} 年`
      : gateOpen.value
        ? `${DEFAULT_RETENTION_YEARS} 年`
        : '—'
  return [
    {
      key: 'archive-status',
      label: '归档状态',
      value: pkg?.archiveStatusLabel
        ?? (pkg?.archiveStatus
          ? strictEnumLabel(ArchivePackageStatusDescription, pkg.archiveStatus, 'archiveStatus')
          : '未创建'),
      tone: reviewStatusTone.value,
    },
    {
      key: 'archive-items',
      label: '归档项',
      value: pkg?.itemCount != null && pkg.itemCount > 0 ? String(pkg.itemCount) : '—',
      tone: 'blue',
    },
    {
      key: 'archive-size',
      label: '文件大小',
      value: pkg?.archiveFileSize != null && pkg.archiveFileSize > 0
        ? formatFileSize(pkg.archiveFileSize)
        : '—',
      tone: 'gray',
    },
    {
      key: 'retention',
      label: '保存期限',
      value: retentionLabel,
      tone: 'gray',
    },
  ]
})

const showVolumeCollapse = computed(
  () => gateOpen.value
    && (healthyVolumes.value.length > 0
      || hasAutoCreateFailure.value
      || examGate.value?.autoCreatePendingStatus != null),
)

const volumeCollapseHeader = computed(() => {
  const gate = examGate.value
  const expected = expectedAutoCreateVolumeCount.value
  const healthy = gate?.healthyAutoCreateVolumeCount ?? healthyVolumes.value.length
  if (expected != null && expected > 0) {
    return `院系归档卷（${healthy}/${expected}）`
  }
  if (healthyVolumes.value.length > 0) {
    return `院系归档卷（${healthyVolumes.value.length} 卷）`
  }
  return '院系归档卷'
})

const showVolumeAutoCreateStatus = computed(
  () => gateOpen.value
    && (hasAutoCreateFailure.value
      || examGate.value?.autoCreatePendingStatus != null
      || showRetryAutoCreate.value),
)

const volumeTableColumns = computed(() => {
  const columns = [
    { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
    { title: '归档号', dataIndex: 'archiveNo', key: 'archiveNo' },
    { title: '完整性', key: 'integrityStatus' },
    { title: '卷状态', key: 'volumeStatus' },
    { title: '操作', key: 'action', width: 96 },
  ]
  if ((expectedAutoCreateVolumeCount.value ?? 0) > 1 || healthyVolumes.value.length > 1) {
    columns.splice(2, 0, { title: '主链进度', key: 'lifecycleProgress', width: 96 })
  }
  return columns
})

const autoCreateFailedEvent = computed(() =>
  events.value.find((item) => item.eventType === 'AUTO_CREATE_FAILED'),
)

const autoCreateFailedNeedsClassScope = computed(() => {
  const category = examGate.value?.autoCreateFailureCategory
  return (
    category != null
    && isArchiveAutoCreateFailureCategory(category)
    && CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES.has(category)
  )
})

const hasAutoCreateFailure = computed(
  () =>
    examGate.value?.autoCreateFailureStubPresent === true
    || autoCreateFailedEvent.value != null
    || examGate.value?.autoCreatePendingStatus
    === ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED,
)

const showRetryAutoCreate = computed(
  () =>
    examGate.value?.archiveAutoCreateRetryAllowed === true
    && !autoCreateFailedNeedsClassScope.value,
)

const showNonOwnerHint = computed(() => {
  const gate = examGate.value
  if (!gate) {
    return false
  }
  if (gate.archiveAutoCreateRetryAllowed === true) {
    return false
  }
  return (
    hasAutoCreateFailure.value
    || gate.autoCreatePendingStatus === ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED
    || (gate.gateOpen === true && !gate.autoCreateFailureStubPresent)
  )
})

const pendingRetryDescription = computed(() => {
  const gate = examGate.value
  if (gate?.autoCreatePendingStatus === ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED) {
    return gate.autoCreateLastError || '自动建卷多次失败，请修复问题后重新触发'
  }
  if (gate?.autoCreateFailureCategory === ArchiveAutoCreateFailureCategoryCode.PACKAGE_PENDING) {
    return gate.autoCreateLastError
      ? `${gate.autoCreateLastError}；系统正在等待归档包投递或材料聚合完成`
      : '双门禁已满足，系统正在投递考后归档包并聚合卷内材料'
  }
  if (gate?.autoCreatePendingStatus === ArchiveVolumeAutoCreatePendingStatusCode.PENDING) {
    return gate.autoCreateLastError
      ? `${gate.autoCreateLastError}；系统仍将自动重试`
      : '系统正在自动重试建卷，也可手动立即触发'
  }
  return '双门禁已满足但归档卷尚未生成'
})

const autoCreateFailedDescription = computed(() => {
  const category = examGate.value?.autoCreateFailureCategory
  if (category && isArchiveAutoCreateFailureCategory(category)) {
    const base = ArchiveAutoCreateFailureCategoryHintDescription[category]
    const detail = examGate.value?.autoCreateLastError ?? autoCreateFailedEvent.value?.reason
    return detail ? `${base}（${detail}）` : base
  }
  const reason = autoCreateFailedEvent.value?.reason ?? examGate.value?.autoCreateLastError ?? ''
  return reason || '请查看事件诊断并联系管理员'
})

const volumeProgressById = computed(() => {
  const map = new Map<string, ArchiveVolumeExamVolumeProgressItemVO>()
  for (const item of examGate.value?.examArchiveProgress?.volumeProgressItems ?? []) {
    map.set(String(item.volumeId), item)
  }
  return map
})

function volumeProgressItem(volumeId: string): ArchiveVolumeExamVolumeProgressItemVO | undefined {
  return volumeProgressById.value.get(volumeId)
}

function formatVolumeLifecycleProgress(volumeId: string): string {
  const item = volumeProgressItem(volumeId)
  if (!item) {
    return '—'
  }
  return `${item.completedLifecycleCount ?? 0}/${item.totalLifecycleCount ?? 8}`
}

function volumeStatusLabel(code: ArchiveVolumeResponse['volumeStatus']) {
  return strictEnumLabel(ArchiveVolumeStatusDescription, code, 'volumeStatus')
}

function integrityStatusLabel(code: ArchiveVolumeResponse['integrityStatus']) {
  return strictEnumLabel(ArchiveIntegrityStatusDescription, code, 'integrityStatus')
}

function isAutoCreateFailureStub(vol: ArchiveVolumeResponse): boolean {
  return vol.departmentId == null || vol.departmentId === ''
}

async function loadVolumes() {
  if (!examId.value) {
    healthyVolumes.value = []
    events.value = []
    return
  }
  const list = await readAllPages(
    (pageNum) =>
      pageArchiveVolumes({
        examId: examId.value!,
        pageNum,
        pageSize: EXAM_ARCHIVE_VOLUME_PAGE_SIZE,
      }),
    '加载归档卷失败',
  )
  healthyVolumes.value = list.filter((item) => !isAutoCreateFailureStub(item))
  const stubRow = list.find((item) => isAutoCreateFailureStub(item))
  if (stubRow) {
    const detail = await getArchiveVolumeDetail(stubRow.volumeId)
    events.value = detail.events
  }
  else {
    events.value = []
  }
}

async function loadReview() {
  if (!examId.value) {
    showUserError(new Error('缺少考试 ID'), '缺少考试 ID')
    loading.value = false
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    review.value = await getArchiveVolumeExamReview(examId.value)
    await loadVolumes()
    await exportTasksRef.value?.refresh()
    syncPackagingPoll()
  }
  catch (error) {
    review.value = null
    loadFailed.value = true
    showUserError(error, '加载归档复盘失败')
  }
  finally {
    loading.value = false
  }
}

function syncPackagingPoll() {
  if (isPackaging.value) {
    startPackagingPoll()
    return
  }
  stopPackagingPoll()
}

function startPackagingPoll() {
  if (packagingPollTimer != null) {
    return
  }
  packagingPollTimer = setInterval(() => {
    void loadReview()
  }, PACKAGING_POLL_MS)
}

function stopPackagingPoll() {
  if (packagingPollTimer == null) {
    return
  }
  clearInterval(packagingPollTimer)
  packagingPollTimer = null
}

async function createPackage() {
  if (!examId.value || !canCreatePackage.value || packagingActionLoading.value) {
    return
  }
  packagingActionLoading.value = true
  try {
    const result = await createExamArchivePackage({
      examId: examId.value,
      retentionYears: DEFAULT_RETENTION_YEARS,
      includeOriginalScans: true,
      includeMarkedSlices: true,
      includeAnswerBooklet: true,
    })
    message.success(result.reusedExistingDraft ? '已重新入队归档打包' : '已创建归档包并开始打包')
    await loadReview()
  }
  catch (error) {
    showUserError(error, '创建归档包失败')
  }
  finally {
    packagingActionLoading.value = false
  }
}

async function retryPackaging() {
  if (!examId.value || packagingActionLoading.value) {
    return
  }
  packagingActionLoading.value = true
  try {
    await retryExamArchivePackaging(examId.value)
    message.success('已重新入队归档打包')
    await loadReview()
  }
  catch (error) {
    showUserError(error, '重新打包失败')
  }
  finally {
    packagingActionLoading.value = false
  }
}

async function startAutoCreatePoll() {
  pollTimedOut.value = false
  const result = await pollUntilHealthy()
  await loadReview()
  if (result === 'timeout') {
    pollTimedOut.value = true
  }
}

function clearAutoCreatePollQuery() {
  if (route.query.autoCreatePoll !== '1') {
    return
  }
  const nextQuery = { ...route.query }
  delete nextQuery.autoCreatePoll
  void router.replace({ query: nextQuery })
}

function goDetail(volumeId: string) {
  if (!volumeId) {
    return
  }
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
  })
}

function goCandidateRoster() {
  if (!examId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceCandidateRoster',
    params: { examId: examId.value },
  })
}

function goExamListForClose() {
  void router.push({ name: 'TeacherExamList' })
}

async function retryAutoCreate() {
  if (!examId.value || retrying.value || polling.value) {
    return
  }
  retrying.value = true
  try {
    await retryArchiveVolumeAutoCreate(examId.value)
    message.success('已重新触发自动建卷')
    await startAutoCreatePoll()
  }
  catch (error) {
    showUserError(error, '重新触发自动建卷失败')
  }
  finally {
    retrying.value = false
  }
}

onMounted(() => {
  void loadReview().then(() => {
    if (route.query.autoCreatePoll === '1') {
      clearAutoCreatePollQuery()
      void startAutoCreatePoll()
    }
  })
})

onUnmounted(() => {
  stopPackagingPoll()
})
</script>

<style scoped lang="scss">
.archive-exam-review__gate-notice {
  margin-top: var(--dp-space-3, 12px);
}

.archive-exam-review__lifecycle {
  margin-top: var(--dp-space-4, 16px);
}

.archive-exam-review__packaging {
  margin-top: var(--dp-space-3, 12px);
  padding: var(--dp-space-3, 12px);
  border: 1px solid var(--dp-border-light, #e2e8f0);
  border-radius: var(--dp-radius-md, 6px);
  background: var(--dp-surface-muted, #f8fafc);
}

.archive-exam-review__packaging-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2, 8px);
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}

.archive-exam-review__packaging-percent {
  font-family: var(--dp-font-mono, ui-monospace, monospace);
  font-weight: 600;
  color: var(--dp-text-primary, #0f172a);
}

.archive-exam-review__packaging-track {
  height: 6px;
  margin-top: var(--dp-space-2, 8px);
  border-radius: 999px;
  background: var(--dp-border-light, #e2e8f0);
  overflow: hidden;
}

.archive-exam-review__packaging-bar {
  height: 100%;
  border-radius: inherit;
  background: var(--dp-blue-600, #2563eb);
  transition: width 0.2s ease;
}

.archive-exam-review__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--dp-space-4, 16px);
  margin-top: var(--dp-space-4, 16px);

  @media (min-width: 992px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

.archive-exam-review__volume-collapse {
  margin-top: var(--dp-space-4, 16px);
  background: var(--dp-surface, #fff);
  border: 1px solid var(--dp-border-light, #e2e8f0);
  border-radius: var(--dp-radius-md, 6px);
}

.archive-exam-review__volume-status {
  margin-top: var(--dp-space-3, 12px);
}
</style>
