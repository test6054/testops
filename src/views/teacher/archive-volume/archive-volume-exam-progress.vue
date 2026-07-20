<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="归档复盘">
        <template #status>
          <UiTag v-if="reviewStatusLabel" :tone="reviewStatusTone" size="sm">
            {{ reviewStatusLabel }}
          </UiTag>
          <UiTag v-if="isPackaging" tone="blue" size="sm">打包中</UiTag>
        </template>
        <template v-if="examId" #actions>
          <UiButton
            v-if="primaryOpenVolumeId"
            variant="primary"
            size="sm"
            @click="goDetail(primaryOpenVolumeId)"
          >
            打开课程考核袋
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
          <UiDropdownAction
            v-if="archiveGateMoreItems.length"
            trigger-style="button"
            button-text="更多"
            :items="archiveGateMoreItems"
            @select="onArchiveGateMoreAction"
          />
        </template>
      </ContextBar>
    </template>

    <template v-if="examId && reviewSignals.length > 0" #signal>
      <SignalBand variant="panel" :metrics="reviewSignals" />
    </template>

    <ExamSelectGateStrip
      v-if="!examId"
      body="请从考试列表进入工作台后再查看归档复盘"
    />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiSkeletonState v-if="loading" variant="card" compact />

      <template v-else>
        <UiEmpty
          v-if="loadFailed"
          size="sm"
          title="加载归档复盘失败"
          description="归档复盘数据暂时不可用，请重试加载"
        >
          <template #action>
            <UiButton variant="outline" size="sm" @click="loadReview">重新加载</UiButton>
          </template>
        </UiEmpty>

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
                :style="{
                  transform: `scaleX(${Math.max(0, Math.min(1, packagingProgressPercent / 100))})`,
                }"
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
              :can-manage-owner-image-archive-export="canManageOwnerArchivePackageWrites"
            />
          </div>

          <UiCollapse
            v-if="showVolumeCollapse"
            v-model:active-key="volumeCollapseActiveKeys"
            class="archive-exam-review__volume-collapse"
            :bordered="false"
          >
            <UiCollapsePanel key="volumes" :header="volumeCollapseHeader">
              <UiAlertStrip
                v-if="volumesLoadFailed"
                tone="error"
                dense
                inline
                title="课程考核袋列表加载失败"
                description="当前保留最后一次成功加载的数据，请重试列表查询。"
                class="archive-exam-review__volume-error"
              >
                <template #actions>
                  <UiButton variant="outline" size="sm" @click="loadVolumes">重试</UiButton>
                </template>
              </UiAlertStrip>
              <UiDataTable
                v-model:current="volumePagination.pageNum"
                v-model:page-size="volumePagination.pageSize"
                pagination-mode="server"
                :columns="volumeTableColumns"
                :data-source="healthyVolumes"
                :loading="volumesLoading"
                :total="volumePagination.total"
                flat
                row-key="volumeId"
                size="small"
                @page-change="loadVolumes"
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
            </UiCollapsePanel>
          </UiCollapse>
        </template>
      </template>
    </template>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type {
  ArchiveVolumeExamArchiveReviewVO,
  ArchiveVolumeExamVolumeProgressItemVO,
  ArchiveVolumeResponse,
} from '@/apis/mark/archive-volume'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArchiveIntegrityStatusDescription,
  ArchiveVolumeStatusDescription,
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
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiCollapse from '@/components/ui-guide/ui/UiCollapse.vue'
import UiCollapsePanel from '@/components/ui-guide/ui/UiCollapsePanel.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
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
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ArchivePackageStatusCode,
  ArchivePackageStatusDescription,
} from '@/types/enums/archive-package-status-enum'
import { ArchiveVolumeAutoCreatePendingStatusCode } from '@/types/enums/archive-volume-auto-create-pending-status-enum'
import { integrityStatusDimTone, volumeStatusDimTone } from '@/utils/archive-dimension-pill'
import { buildArchivePackageLifecycleSteps } from '@/utils/archive-package-lifecycle'
import { showUserError } from '@/utils/error-handler'
import { formatFileSize } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'
import { resolveArchiveGateWorkflowSteps } from '@/utils/workflow-readiness/archive-gate-readiness'

defineOptions({ name: 'TeacherArchiveVolumeExamProgress' })

const DEFAULT_RETENTION_YEARS = 10
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

const primaryOpenVolumeId = computed(() => {
  const first = healthyVolumes.value[0]
  return first?.volumeId ? String(first.volumeId) : ''
})

const archiveGateMoreItems = computed(() => {
  const items: { key: string, label: string }[] = []
  if (canManageOwnerArchivePackageWrites.value && canCreatePackage.value) {
    items.push({ key: 'createExportPackage', label: '创建导出归档包' })
  }
  if (showGateScorePublishAction.value) {
    items.push({ key: 'scorePublish', label: '前往成绩确认与发布' })
  }
  if (showGateCloseExamAction.value) {
    items.push({ key: 'closeExam', label: '前往关考' })
  }
  return items
})

function onArchiveGateMoreAction(key: string) {
  if (key === 'createExportPackage') {
    void createPackage()
    return
  }
  if (key === 'scorePublish') {
    goScorePublish()
    return
  }
  if (key === 'closeExam') {
    goExamListForClose()
  }
}

const examId = computed(() => String(route.params.examId ?? ''))

const loading = ref(true)
const loadFailed = ref(false)
const review = ref<ArchiveVolumeExamArchiveReviewVO | null>(null)
const healthyVolumes = ref<ArchiveVolumeResponse[]>([])
const volumePagination = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE, total: 0 })
const volumesLoading = ref(false)
const volumesLoadFailed = ref(false)
const retrying = ref(false)
const packagingActionLoading = ref(false)
const pollTimedOut = ref(false)
const volumeCollapseActiveKeys = ref<string[]>(['volumes'])
const exportTasksRef = ref<InstanceType<typeof ArchiveExamExportTasksCard> | null>(null)
let packagingPollTimer: ReturnType<typeof setInterval> | null = null
let reviewRequestSequence = 0
let volumeRequestSequence = 0

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

/** MVR-268：优先 BE 能力位；缺省 false 失败关闭 */
const canManageOwnerArchivePackageWrites = computed(() =>
  review.value?.canManageOwnerArchivePackageWrites === true,
)

const canCreatePackage = computed(() => {
  if (!canManageOwnerArchivePackageWrites.value) {
    return false
  }
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
  () =>
    canManageOwnerArchivePackageWrites.value
    && gateOpen.value
    && archivePackage.value?.archiveStatus === ArchivePackageStatusCode.PACKAGING_FAILED,
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
  if (primaryOpenVolumeId.value) {
    return '课程考核袋已就绪'
  }
  return '待自动建袋'
})

const reviewStatusTone = computed(() => {
  const pkgStatus = archivePackage.value?.archiveStatus
  if (
    pkgStatus === ArchivePackageStatusCode.ACTIVE
    || pkgStatus === ArchivePackageStatusCode.STORED
  ) {
    return 'green' as const
  }
  if (
    pkgStatus === ArchivePackageStatusCode.PACKAGING
    || pkgStatus === ArchivePackageStatusCode.DRAFT
  ) {
    return 'blue' as const
  }
  if (
    pkgStatus === ArchivePackageStatusCode.PACKAGING_FAILED
    || pkgStatus === ArchivePackageStatusCode.DESTRUCTION_FAILED
  ) {
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
      value:
        pkg?.archiveStatusLabel
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
      value:
        pkg?.archiveFileSize != null && pkg.archiveFileSize > 0
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
  () =>
    gateOpen.value
    && (volumePagination.total > 0
      || hasAutoCreateFailure.value
      || examGate.value?.autoCreatePendingStatus != null),
)

const volumeCollapseHeader = computed(() => {
  const gate = examGate.value
  const expected = expectedAutoCreateVolumeCount.value
  const healthy = gate?.healthyAutoCreateVolumeCount ?? volumePagination.total
  if (expected != null && expected > 0) {
    return `课程考核袋（${healthy}/${expected}）`
  }
  if (volumePagination.total > 0) {
    return `课程考核袋（${healthy} 个）`
  }
  return '课程考核袋'
})

const showVolumeAutoCreateStatus = computed(
  () =>
    gateOpen.value
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
  if ((expectedAutoCreateVolumeCount.value ?? 0) > 1 || volumePagination.total > 1) {
    columns.splice(2, 0, { title: '主链进度', key: 'lifecycleProgress', width: 96 })
  }
  return columns
})

const hasAutoCreateFailure = computed(
  () =>
    examGate.value?.autoCreateFailureStubPresent === true
    || examGate.value?.autoCreatePendingStatus
    === ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED,
)

const autoCreateFailedNeedsClassScope = computed(() => {
  const category = examGate.value?.autoCreateFailureCategory
  return (
    category != null
    && isArchiveAutoCreateFailureCategory(category)
    && CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES.has(category)
  )
})

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
    return gate.autoCreateLastError || '自动创建课程考核袋多次失败，请修复问题后重新触发'
  }
  if (gate?.autoCreateFailureCategory === ArchiveAutoCreateFailureCategoryCode.PACKAGE_PENDING) {
    return gate.autoCreateLastError
      ? `${gate.autoCreateLastError}；系统正在等待归档包投递或材料聚合完成`
      : '双门禁已满足，系统正在投递考后归档包并聚合卷内材料'
  }
  if (gate?.autoCreatePendingStatus === ArchiveVolumeAutoCreatePendingStatusCode.PENDING) {
    return gate.autoCreateLastError
      ? `${gate.autoCreateLastError}；系统仍将自动重试`
      : '系统正在自动重试创建，也可手动立即触发'
  }
  return '双门禁已满足但课程考核袋尚未生成'
})

const autoCreateFailedDescription = computed(() => {
  const category = examGate.value?.autoCreateFailureCategory
  if (category && isArchiveAutoCreateFailureCategory(category)) {
    const base = strictEnumLabel(
      ArchiveAutoCreateFailureCategoryHintDescription,
      category,
      '自动建卷失败类别说明',
    )
    const detail = examGate.value?.autoCreateLastError
    return detail ? `${base}（${detail}）` : base
  }
  const reason = examGate.value?.autoCreateLastError ?? ''
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
  if (!item || item.totalLifecycleCount == null) {
    return '—'
  }
  return `${item.completedLifecycleCount ?? 0}/${item.totalLifecycleCount}`
}

function volumeStatusLabel(code: ArchiveVolumeResponse['volumeStatus']) {
  return strictEnumLabel(ArchiveVolumeStatusDescription, code, 'volumeStatus')
}

function integrityStatusLabel(code: ArchiveVolumeResponse['integrityStatus']) {
  return strictEnumLabel(ArchiveIntegrityStatusDescription, code, 'integrityStatus')
}

async function loadVolumes() {
  const requestSequence = ++volumeRequestSequence
  if (!examId.value) {
    throw new Error('缺少考试编号')
  }
  volumesLoading.value = true
  try {
    const page = await pageArchiveVolumes({
      examId: examId.value,
      excludeAutoCreateFailureStub: true,
      pageNum: volumePagination.pageNum,
      pageSize: volumePagination.pageSize,
    })
    if (requestSequence !== volumeRequestSequence) return
    healthyVolumes.value = page.list
    volumePagination.total = page.total
    volumePagination.pageNum = page.pageNum
    volumePagination.pageSize = page.pageSize
    volumesLoadFailed.value = false
  } catch (error) {
    if (requestSequence !== volumeRequestSequence) return
    volumesLoadFailed.value = true
    showUserError(error, '加载归档任务失败')
    throw error
  } finally {
    if (requestSequence === volumeRequestSequence) {
      volumesLoading.value = false
    }
  }
}

async function loadReview() {
  const requestSequence = ++reviewRequestSequence
  if (!examId.value) {
    showUserError(new Error('缺少考试编号'), '缺少考试编号')
    loading.value = false
    return
  }
  loading.value = true
  try {
    try {
      const nextReview = await getArchiveVolumeExamReview(examId.value)
      if (requestSequence !== reviewRequestSequence) return
      review.value = nextReview
    } catch (error) {
      if (requestSequence !== reviewRequestSequence) return
      review.value = null
      showUserError(error, '考试归档评审加载失败')
    }
    try {
      const nextVolumePage = await pageArchiveVolumes({
        examId: examId.value,
        excludeAutoCreateFailureStub: true,
        pageNum: volumePagination.pageNum,
        pageSize: volumePagination.pageSize,
      })
      if (requestSequence !== reviewRequestSequence) return
      healthyVolumes.value = nextVolumePage.list
      volumePagination.total = nextVolumePage.total
      volumePagination.pageNum = nextVolumePage.pageNum
      volumePagination.pageSize = nextVolumePage.pageSize
      volumesLoadFailed.value = false
    } catch (error) {
      if (requestSequence !== reviewRequestSequence) return
      healthyVolumes.value = []
      volumePagination.total = 0
      volumesLoadFailed.value = true
      showUserError(error, '考试归档卷列表加载失败')
    }
    if (requestSequence !== reviewRequestSequence) return
    loadFailed.value = !review.value
    await exportTasksRef.value?.refresh()
    if (requestSequence !== reviewRequestSequence) return
    syncPackagingPoll()
  } finally {
    if (requestSequence === reviewRequestSequence) {
      loading.value = false
    }
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
  if (!canManageOwnerArchivePackageWrites.value) {
    return
  }
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
  } catch (error) {
    showUserError(error, '创建归档包失败')
  } finally {
    packagingActionLoading.value = false
  }
}

async function retryPackaging() {
  if (!canManageOwnerArchivePackageWrites.value) {
    return
  }
  if (!examId.value || packagingActionLoading.value) {
    return
  }
  packagingActionLoading.value = true
  try {
    await retryExamArchivePackaging(examId.value)
    message.success('已重新入队归档打包')
    await loadReview()
  } catch (error) {
    showUserError(error, '重新打包失败')
  } finally {
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
  // MVR-313：与 showRetryAutoCreate / BE requireExamOwnerPermission 同源
  if (!showRetryAutoCreate.value) {
    message.warning('当前不可重新触发自动建卷')
    return
  }
  retrying.value = true
  try {
    await retryArchiveVolumeAutoCreate(examId.value)
    message.success('已重新触发自动创建归档任务')
    await startAutoCreatePoll()
  } catch (error) {
    showUserError(error, '重新触发自动创建失败')
  } finally {
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
@use '@/styles/breakpoints' as bp;
.archive-exam-review__gate-notice {
  margin-top: var(--dp-space-3);
}

.archive-exam-review__volume-error {
  margin-bottom: var(--dp-space-3);
}

.archive-exam-review__lifecycle {
  margin-top: var(--dp-space-4);
}

.archive-exam-review__packaging {
  margin-top: var(--dp-space-3);
  padding: var(--dp-space-3);
  border: 1px solid var(--dp-border-light);
  border-radius: var(--dp-radius-md);
  background: var(--dp-surface-muted);
}

.archive-exam-review__packaging-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.archive-exam-review__packaging-percent {
  font-family: var(--dp-font-mono);
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-exam-review__packaging-track {
  height: 6px;
  margin-top: var(--dp-space-2);
  border-radius: var(--dp-radius-full);
  background: var(--dp-border-light);
  overflow: hidden;
}

.archive-exam-review__packaging-bar {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  border-radius: inherit;
  background: var(--dp-blue-600);
  transition: transform 0.2s ease;
}

.archive-exam-review__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--dp-space-4);
  margin-top: var(--dp-space-4);

  @media (min-width: bp.$ant-grid-lg) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

.archive-exam-review__volume-collapse {
  margin-top: var(--dp-space-4);
  background: var(--dp-surface);
  border: 1px solid var(--dp-border-light);
  border-radius: var(--dp-radius-md);
}

.archive-exam-review__volume-status {
  margin-top: var(--dp-space-3);
}
</style>
