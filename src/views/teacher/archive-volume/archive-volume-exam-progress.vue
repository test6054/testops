<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="contextBarSubtitle"
      >
        <template #status>
          <UiTag tone="blue" size="sm">形态 课程考核归档卷</UiTag>
          <UiTag v-if="examGate?.gateOpen === true" tone="green" size="sm">双门禁已满足</UiTag>
          <UiTag v-else-if="examGate?.gateOpen === false" tone="orange" size="sm">双门禁未满足</UiTag>
          <UiTag v-if="polling" tone="orange" size="sm">系统正在创建归档卷…</UiTag>
          <UiTag v-else-if="showCompleteProgress && isMultiVolumeExam" tone="gray" size="sm">
            归档卷 {{ autoCreateVolumeProgressHint }}
          </UiTag>
          <UiTag v-else-if="primaryHealthyVolume?.archiveNo" tone="gray" size="sm">
            {{ primaryHealthyVolume.archiveNo }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" :loading="loading" @click="loadVolume">
            刷新
          </UiButton>
          <UiButton
            v-if="primaryHealthyVolume && !isMultiVolumeExam"
            variant="primary"
            size="sm"
            @click="goDetail(primaryHealthyVolume.volumeId)"
          >
            打开归档卷详情
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="signalMetrics.length > 0" #signal>
      <SignalBand variant="tiles" :metrics="signalMetrics" compact />
    </template>

    <ExamWorkspaceJourneySubNav />

    <UiSkeletonState v-if="loading" variant="card" compact />

    <template v-else>
      <UiEmpty v-if="volumeLoadFailed" description="加载归档卷失败" />
      <UiEmpty v-else-if="gateLoadFailed" description="加载考试双门禁失败" />

      <template v-else-if="showCompleteProgress && isMultiVolumeExam">
        <ArchiveLifecyclePipe
          v-if="examRollupLifecycle"
          class="archive-volume-exam-progress__lifecycle"
          title="归档全链路（以最慢院系卷为准）"
          :steps="examRollupLifecycle.steps"
          :completed-count="examRollupLifecycle.completedCount"
          :total-count="examRollupLifecycle.totalCount"
        />
        <div class="archive-volume-exam-progress__grid">
          <WorkbenchSurfaceCard class="archive-volume-exam-progress__main">
            <template #head>院系归档卷进度</template>
            <UiDataTable
              pagination-mode="none"
              :columns="volumeProgressColumns"
              :data-source="healthyVolumes"
              :show-pagination="false"
              flat
              row-key="volumeId"
              size="middle"
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
                <template v-else-if="column.key === 'suggestedFocus'">
                  <span class="archive-volume-exam-progress__focus">
                    {{ formatSuggestedTabLabel(record.volumeId) }}
                    <UiTag
                      v-if="volumeProgressItem(record.volumeId)?.fourPropertyStale"
                      tone="orange"
                      size="sm"
                    >
                      四性失效
                    </UiTag>
                    <UiTag
                      v-else-if="record.securityMarkPending"
                      tone="orange"
                      size="sm"
                    >
                      定密待确认
                    </UiTag>
                    <UiTag
                      v-else-if="(volumeProgressItem(record.volumeId)?.openScanReviewCount ?? 0) > 0"
                      tone="orange"
                      size="sm"
                    >
                      扫描复核
                    </UiTag>
                  </span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <UiButton variant="ghost" size="sm" @click="goDetail(record.volumeId)">
                    打开详情
                  </UiButton>
                </template>
              </template>
            </UiDataTable>
          </WorkbenchSurfaceCard>
          <ArchiveRelatedLinksCard @exports="goExportTasks" />
        </div>
      </template>

      <template v-else-if="showCompleteProgress && primaryHealthyVolume">
        <ArchiveLifecyclePipe
          class="archive-volume-exam-progress__lifecycle"
          title="归档全链路"
          :steps="volumeLifecycleSteps"
          :completed-count="volumeNavigationLifecycle?.completedCount"
          :total-count="volumeNavigationLifecycle?.totalCount"
        />
        <div class="archive-volume-exam-progress__grid">
          <WorkbenchSurfaceCard class="archive-volume-exam-progress__main">
            <template #head>归档卷摘要</template>
            <dl class="archive-volume-exam-progress__summary">
              <div class="archive-volume-exam-progress__summary-row">
                <dt>院系</dt>
                <dd>{{ primaryHealthyVolume.departmentName ?? '—' }}</dd>
              </div>
              <div class="archive-volume-exam-progress__summary-row">
                <dt>归档号</dt>
                <dd>{{ primaryHealthyVolume.archiveNo ?? '—' }}</dd>
              </div>
              <div class="archive-volume-exam-progress__summary-row">
                <dt>完整性</dt>
                <dd>
                  <ArchiveDimPill
                    :tone="integrityStatusDimTone(primaryHealthyVolume.integrityStatus)"
                    :label="integrityStatusLabel(primaryHealthyVolume.integrityStatus)"
                  />
                </dd>
              </div>
              <div
                v-if="primaryHealthyVolume.securityMarkPending"
                class="archive-volume-exam-progress__summary-row"
              >
                <dt>密级定密</dt>
                <dd>
                  <UiTag tone="orange" size="sm">待确认</UiTag>
                </dd>
              </div>
              <div class="archive-volume-exam-progress__summary-row">
                <dt>卷状态</dt>
                <dd>
                  <ArchiveDimPill
                    :tone="volumeStatusDimTone(primaryHealthyVolume.volumeStatus)"
                    :label="volumeStatusLabel(primaryHealthyVolume.volumeStatus)"
                  />
                </dd>
              </div>
            </dl>
            <UiButton variant="primary" size="sm" @click="goDetail(primaryHealthyVolume.volumeId)">
              打开归档卷详情
            </UiButton>
          </WorkbenchSurfaceCard>
          <ArchiveRelatedLinksCard @exports="goExportTasks" />
        </div>
      </template>

      <template v-else>
        <UiAlertStrip
          v-if="hasPartialAutoCreateProgress"
          tone="warning"
          title="部分院系卷已创建"
          :description="partialAutoCreateDescription"
          dense
          class="archive-volume-exam-progress__alert"
        />
        <div class="archive-volume-exam-progress__grid archive-volume-exam-progress__grid--prep">
          <WorkbenchSurfaceCard class="archive-volume-exam-progress__main">
            <template #head>归档前置条件</template>
            <ArchiveExamScoreGatePanel :gate="examGate" :loading="loading && !examGate" />
            <div v-if="showGateQuickActions" class="archive-volume-exam-progress__gate-actions">
              <UiButton
                v-if="!examGate?.allScoresPublished"
                variant="outline"
                size="sm"
                @click="goScorePublish"
              >
                前往成绩发布
              </UiButton>
              <UiButton
                v-if="examGate?.allScoresPublished && !examGate?.examClosed"
                variant="outline"
                size="sm"
                @click="goExamListForClose"
              >
                前往关考
              </UiButton>
            </div>
            <ArchiveLifecyclePipe
              v-if="postGateLifecycleSteps.length > 0"
              title="建卷进度"
              :steps="postGateLifecycleSteps"
            />
            <UiAlertStrip
              v-if="incompleteClasses.length > 0"
              tone="warning"
              title="按班成绩发布进度"
              dense
            >
              <ul class="archive-volume-exam-progress__class-hints">
                <li v-for="item in incompleteClasses" :key="item.classId">
                  {{ item.className }}：尚有 {{ item.unpublishedBoundPaperCount }} 份未发布
                </li>
              </ul>
            </UiAlertStrip>
            <p v-if="gateProgressHint" class="archive-volume-exam-progress__gate-hint">{{ gateProgressHint }}</p>
            <UiAlertStrip
              v-if="gateAnomaly"
              tone="error"
              title="考试状态异常"
              description="考试已关考但成绩未全部发布，请联系管理员处理。"
              dense
            />
            <UiAlertStrip
              v-if="pollTimedOut"
              tone="warning"
              title="建卷仍在进行"
              description="系统仍在后台创建归档卷，请稍后点击刷新查看进度。"
              dense
            />
            <UiAlertStrip
              v-if="hasAutoCreateFailure"
              tone="error"
              title="自动建卷失败"
              :description="autoCreateFailedDescription"
              dense
            >
              <template v-if="autoCreateFailedNeedsClassScope" #actions>
                <UiButton variant="primary" size="sm" @click="goCandidateRoster">
                  前往考生名册修正班级
                </UiButton>
              </template>
              <template v-else-if="showRetryAutoCreate" #actions>
                <UiButton
                  variant="primary"
                  size="sm"
                  :loading="retrying || polling"
                  @click="retryAutoCreate"
                >
                  重新触发自动建卷
                </UiButton>
              </template>
            </UiAlertStrip>
            <UiAlertStrip
              v-else-if="showRetryAutoCreate"
              tone="warning"
              title="自动建卷待处理"
              :description="pendingRetryDescription"
              dense
            >
              <template #actions>
                <UiButton
                  variant="primary"
                  size="sm"
                  :loading="retrying || polling"
                  @click="retryAutoCreate"
                >
                  重新触发自动建卷
                </UiButton>
              </template>
            </UiAlertStrip>
            <UiAlertStrip
              v-else-if="showNonOwnerHint"
              tone="info"
              title="等待主考处理"
              description="自动建卷需由考试主考老师重新触发，请联系主考老师处理。"
              dense
            />
            <WorkbenchSurfaceCard
              v-if="healthyVolumes.length > 0"
              class="archive-volume-exam-progress__nested-table"
            >
              <template #head>已创建归档卷</template>
              <UiDataTable
                pagination-mode="none"
                :columns="volumeColumns"
                :data-source="healthyVolumes"
                :show-pagination="false"
                flat
                row-key="volumeId"
                size="middle"
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
                  <template v-else-if="column.key === 'action'">
                    <UiButton variant="ghost" size="sm" @click="goDetail(record.volumeId)">
                      打开详情
                    </UiButton>
                  </template>
                </template>
              </UiDataTable>
            </WorkbenchSurfaceCard>
          </WorkbenchSurfaceCard>
          <ArchiveRelatedLinksCard @exports="goExportTasks" />
        </div>
      </template>
    </template>
  </StageWorkbenchShell>
</template>

<script setup lang="ts">
import type {
  ArchiveVolumeEventVO,
  ArchiveVolumeExamGateResponse,
  ArchiveVolumeExamVolumeProgressItemVO,
  ArchiveVolumeResponse,
} from '@/apis/mark/archive-volume'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArchiveIntegrityStatusDescription,
  ArchiveVolumeStatusDescription,
  getArchiveVolumeDetail,
  getArchiveVolumeExamGate,
  pageArchiveVolumes,
  retryArchiveVolumeAutoCreate,
} from '@/apis/mark/archive-volume'
import ArchiveDimPill from '@/components/archive-volume/ArchiveDimPill.vue'
import ArchiveExamScoreGatePanel from '@/components/archive-volume/ArchiveExamScoreGatePanel.vue'
import ArchiveLifecyclePipe from '@/components/archive-volume/ArchiveLifecyclePipe.vue'
import ArchiveRelatedLinksCard from '@/components/archive-volume/ArchiveRelatedLinksCard.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveAutoCreatePoll } from '@/composables/useArchiveAutoCreatePoll'
import { useExamArchiveGateHint } from '@/composables/useExamArchiveGateHint'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useScoreReleaseNavigation } from '@/composables/useScoreReleaseNavigation'
import {
  ArchiveAutoCreateFailureCategoryHintDescription,
  CLASS_SCOPE_FIX_AUTO_CREATE_FAILURE_CATEGORIES,
  isArchiveAutoCreateFailureCategory,
} from '@/constants/archive-auto-create-failure-category'
import { ARCHIVE_VOLUME_DETAIL_SECTION_TABS } from '@/constants/archive-volume-detail-tabs'
import { ArchiveVolumeAutoCreatePendingStatusCode } from '@/types/enums/archive-volume-auto-create-pending-status-enum'
import {
  integrityStatusDimTone,
  volumeStatusDimTone,
} from '@/utils/archive-dimension-pill'
import {
  buildVolumeNavigationLifecycleView,
  mapNavigationLifecycleNodesToPipeSteps,
} from '@/utils/archive-navigation-summary'
import { buildArchiveExamGateLifecycleSteps } from '@/utils/archive-volume-lifecycle'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherArchiveVolumeExamProgress' })

/** 跨院系公共课按院系拆卷时，单考试关联卷数通常不超过院系班级 scope 数 */
const EXAM_ARCHIVE_VOLUME_PAGE_SIZE = 50

const route = useRoute()
const router = useRouter()
const { goScorePublish } = useScoreReleaseNavigation()
const { contextBarTitle, contextBarSubtitle } = useExamJourneyContextBar('本考试归档进度')
const examId = computed(() => String(route.params.examId ?? ''))
const loading = ref(true)
const volumeLoadFailed = ref(false)
const gateLoadFailed = ref(false)
const healthyVolumes = ref<ArchiveVolumeResponse[]>([])
const events = ref<ArchiveVolumeEventVO[]>([])
const examGate = ref<ArchiveVolumeExamGateResponse | null>(null)
const primaryVolumeNavigationSummary = ref<
  Awaited<ReturnType<typeof getArchiveVolumeDetail>>['navigationSummary'] | null
>(null)
const { gateProgressHint, gateAnomaly, incompleteClasses } = useExamArchiveGateHint(examGate)
const retrying = ref(false)
const pollTimedOut = ref(false)

const { polling, pollUntilHealthy } = useArchiveAutoCreatePoll({ examId })

function isAutoCreateFailureStub(vol: ArchiveVolumeResponse): boolean {
  return vol.departmentId == null || vol.departmentId === ''
}

const primaryHealthyVolume = computed(() => healthyVolumes.value[0] ?? null)

const volumeNavigationLifecycle = computed(() =>
  buildVolumeNavigationLifecycleView(primaryVolumeNavigationSummary.value),
)

const volumeLifecycleSteps = computed(() => volumeNavigationLifecycle.value?.steps ?? [])

const suggestedTabLabelByKey: Record<string, string> = {}
for (const tab of ARCHIVE_VOLUME_DETAIL_SECTION_TABS) {
  suggestedTabLabelByKey[tab.key] = tab.label
}

const examRollupLifecycle = computed(() => {
  const progress = examGate.value?.examArchiveProgress
  if (!progress?.rollupLifecycleNodes?.length) {
    return null
  }
  return {
    steps: mapNavigationLifecycleNodesToPipeSteps(progress.rollupLifecycleNodes),
    completedCount: progress.completedLifecycleCount ?? 0,
    totalCount: progress.totalLifecycleCount ?? progress.rollupLifecycleNodes.length,
  }
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

function formatSuggestedTabLabel(volumeId: string): string {
  const item = volumeProgressItem(volumeId)
  if (!item?.suggestedTabKey) {
    return '—'
  }
  return suggestedTabLabelByKey[item.suggestedTabKey] ?? item.suggestedTabKey
}

const examGateLifecycleSteps = computed(() => {
  const vol = primaryHealthyVolume.value
  return buildArchiveExamGateLifecycleSteps({
    gateOpen: examGate.value?.gateOpen === true,
    volumeCreated: healthyVolumes.value.length > 0,
    collecting: vol != null && vol.volumeStatus !== 'DRAFT',
    submitted: vol != null && (vol.volumeStatus === 'SUBMITTED' || vol.volumeStatus === 'STORED'),
  })
})

const postGateLifecycleSteps = computed(() => examGateLifecycleSteps.value.slice(1))

const showGateQuickActions = computed(
  () => examGate.value != null && examGate.value.gateOpen !== true,
)

const expectedAutoCreateVolumeCount = computed(
  () => examGate.value?.expectedAutoCreateVolumeCount ?? null,
)

const isMultiVolumeExam = computed(
  () => (expectedAutoCreateVolumeCount.value ?? 0) > 1 || healthyVolumes.value.length > 1,
)

const showCompleteProgress = computed(
  () => examGate.value?.autoCreateFullyHealthy === true && healthyVolumes.value.length > 0,
)

const autoCreateVolumeProgressHint = computed(() => {
  const expected = expectedAutoCreateVolumeCount.value ?? healthyVolumes.value.length
  const healthy = examGate.value?.healthyAutoCreateVolumeCount ?? healthyVolumes.value.length
  return `${healthy}/${expected} 院系卷`
})

const hasPartialAutoCreateProgress = computed(
  () => healthyVolumes.value.length > 0 && examGate.value?.autoCreateFullyHealthy !== true,
)

const partialAutoCreateDescription = computed(() => {
  const expected = expectedAutoCreateVolumeCount.value
  const healthy = examGate.value?.healthyAutoCreateVolumeCount ?? healthyVolumes.value.length
  if (expected != null && expected > healthy) {
    return `已创建 ${healthy} 卷，仍缺 ${expected - healthy} 个院系卷；请等待后台建卷或手动重试。`
  }
  return '部分院系卷已创建，系统仍在补齐其余院系卷。'
})

const volumeColumns = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '归档号', dataIndex: 'archiveNo', key: 'archiveNo' },
  { title: '完整性', key: 'integrityStatus' },
  { title: '卷状态', key: 'volumeStatus' },
  { title: '操作', key: 'action', width: 96 },
]

const volumeProgressColumns = [
  { title: '院系', dataIndex: 'departmentName', key: 'departmentName' },
  { title: '归档号', dataIndex: 'archiveNo', key: 'archiveNo' },
  { title: '主链进度', key: 'lifecycleProgress', width: 96 },
  { title: '待办聚焦', key: 'suggestedFocus', width: 160 },
  { title: '完整性', key: 'integrityStatus' },
  { title: '卷状态', key: 'volumeStatus' },
  { title: '操作', key: 'action', width: 96 },
]

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
    || examGate.value?.autoCreatePendingStatus === ArchiveVolumeAutoCreatePendingStatusCode.MANUAL_REQUIRED,
)

const showRetryAutoCreate = computed(
  () =>
    examGate.value?.archiveAutoCreateRetryAllowed === true
    && !autoCreateFailedNeedsClassScope.value,
)

const showNonOwnerHint = computed(() => {
  const gate = examGate.value
  if (!gate || showCompleteProgress.value) {
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

const signalMetrics = computed<SignalMetric[]>(() => {
  const gate = examGate.value
  if (!gate) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'gate',
      label: '双门禁',
      value: gate.gateOpen ? '已满足' : '未满足',
      tone: gate.gateOpen ? 'green' : 'orange',
    },
    {
      key: 'score-publish',
      label: '成绩发布',
      value:
        gate.gradablePaperCount != null && gate.publishedScoreCount != null
          ? `${gate.publishedScoreCount}/${gate.gradablePaperCount}`
          : '—',
      tone: gate.allScoresPublished ? 'green' : 'orange',
    },
  ]

  if (expectedAutoCreateVolumeCount.value != null && expectedAutoCreateVolumeCount.value > 0) {
    metrics.push({
      key: 'volume-count',
      label: '归档卷',
      value: autoCreateVolumeProgressHint.value,
      tone: gate.autoCreateFullyHealthy ? 'green' : 'orange',
    })
  } else if (healthyVolumes.value.length > 0) {
    metrics.push({
      key: 'volume-count',
      label: '归档卷',
      value: `${healthyVolumes.value.length} 卷`,
      tone: 'blue',
    })
  } else {
    metrics.push({
      key: 'volume-count',
      label: '归档卷',
      value: '未创建',
      tone: 'gray',
    })
  }

  const rollup = gate.examArchiveProgress
  if (rollup?.rollupLifecycleNodes?.length) {
    metrics.push({
      key: 'lifecycle',
      label: '主链进度',
      value: `${rollup.completedLifecycleCount ?? 0}/${rollup.totalLifecycleCount ?? rollup.rollupLifecycleNodes.length}`,
      tone:
        (rollup.completedLifecycleCount ?? 0) >= (rollup.totalLifecycleCount ?? 0)
          ? 'green'
          : 'blue',
    })
  } else if (volumeNavigationLifecycle.value && !isMultiVolumeExam.value) {
    metrics.push({
      key: 'lifecycle',
      label: '主链进度',
      value: `${volumeNavigationLifecycle.value.completedCount}/${volumeNavigationLifecycle.value.totalCount}`,
      tone: 'blue',
    })
  } else if (showCompleteProgress.value && isMultiVolumeExam.value) {
    const allIntegrityPassed = healthyVolumes.value.every(
      (item) => item.integrityStatus === 'PASSED',
    )
    metrics.push({
      key: 'integrity',
      label: '完整性',
      value: allIntegrityPassed ? '全部通过' : '待补齐',
      tone: allIntegrityPassed ? 'green' : 'orange',
    })
  } else if (primaryHealthyVolume.value) {
    const vol = primaryHealthyVolume.value
    metrics.push({
      key: 'integrity',
      label: '完整性',
      value: integrityStatusLabel(vol.integrityStatus),
      tone: vol.integrityStatus === 'PASSED' ? 'green' : 'orange',
    })
  }

  return metrics.slice(0, 4)
})

function volumeStatusLabel(code: ArchiveVolumeResponse['volumeStatus']) {
  return strictEnumLabel(ArchiveVolumeStatusDescription, code, 'volumeStatus')
}

function integrityStatusLabel(code: ArchiveVolumeResponse['integrityStatus']) {
  return strictEnumLabel(ArchiveIntegrityStatusDescription, code, 'integrityStatus')
}

async function loadPrimaryVolumeNavigationSummary() {
  primaryVolumeNavigationSummary.value = null
  const vol = primaryHealthyVolume.value
  if (!vol || isMultiVolumeExam.value) {
    return
  }
  try {
    const detail = await getArchiveVolumeDetail(vol.volumeId)
    primaryVolumeNavigationSummary.value = detail.navigationSummary ?? null
  } catch (error) {
    showUserError(error, '加载归档卷导航摘要失败')
  }
}

async function loadGate() {
  if (!examId.value) return
  try {
    examGate.value = await getArchiveVolumeExamGate(examId.value)
  } catch (error) {
    showUserError(error, '加载考试双门禁失败')
    examGate.value = null
    gateLoadFailed.value = true
  }
}

async function loadVolume() {
  if (!examId.value) {
    showUserError(new Error('缺少考试 ID'), '缺少考试 ID')
    loading.value = false
    return
  }
  loading.value = true
  volumeLoadFailed.value = false
  gateLoadFailed.value = false
  pollTimedOut.value = false
  examGate.value = null
  primaryVolumeNavigationSummary.value = null
  try {
    const page = await pageArchiveVolumes({
      examId: examId.value,
      pageNum: 1,
      pageSize: EXAM_ARCHIVE_VOLUME_PAGE_SIZE,
    })
    const list = readPageList(page, '归档卷查询异常')
    healthyVolumes.value = list.filter((item) => !isAutoCreateFailureStub(item))
    const stubRow = list.find((item) => isAutoCreateFailureStub(item))
    if (stubRow) {
      const detail = await getArchiveVolumeDetail(stubRow.volumeId)
      events.value = detail.events
    } else {
      events.value = []
    }
  } catch (error) {
    showUserError(error, '加载归档卷失败')
    healthyVolumes.value = []
    events.value = []
    volumeLoadFailed.value = true
    loading.value = false
    return
  }
  loading.value = false
  await loadGate()
  await loadPrimaryVolumeNavigationSummary()
}

async function startAutoCreatePoll() {
  pollTimedOut.value = false
  const result = await pollUntilHealthy()
  await loadVolume()
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
  if (!volumeId) return
  void router.push({
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
  })
}

function goCandidateRoster() {
  if (!examId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceCandidateRoster',
    params: { examId: examId.value },
  })
}

function goExportTasks() {
  if (!examId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceArchiveExports',
    params: { examId: examId.value },
  })
}

function goExamListForClose() {
  void router.push({ name: 'TeacherExamList' })
}

async function retryAutoCreate() {
  if (!examId.value || retrying.value || polling.value) return
  retrying.value = true
  try {
    await retryArchiveVolumeAutoCreate(examId.value)
    message.success('已重新触发自动建卷')
    await startAutoCreatePoll()
  } catch (error) {
    showUserError(error, '重新触发自动建卷失败')
  } finally {
    retrying.value = false
  }
}

onMounted(() => {
  void loadVolume().then(() => {
    if (route.query.autoCreatePoll === '1') {
      clearAutoCreatePollQuery()
      void startAutoCreatePoll()
    }
  })
})
</script>

<style scoped>
.archive-volume-exam-progress__gate-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2, 8px);
  margin-top: var(--dp-space-3, 12px);
}

.archive-volume-exam-progress__lifecycle {
  margin-top: var(--dp-space-4, 16px);
}

.archive-volume-exam-progress__alert {
  margin-top: var(--dp-space-4, 16px);
}

.archive-volume-exam-progress__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--dp-space-4, 16px);
  margin-top: var(--dp-space-4, 16px);

  @media (min-width: 992px) {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  &--prep {
    align-items: start;
  }
}

.archive-volume-exam-progress__nested-table {
  margin-top: var(--dp-space-4, 16px);
}

.archive-volume-exam-progress__summary {
  margin: 0 0 var(--dp-space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.archive-volume-exam-progress__summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;

  dt {
    margin: 0;
    color: var(--dp-text-secondary, #64748b);
  }

  dd {
    margin: 0;
    font-weight: 500;
    color: var(--dp-text-primary, #0f172a);
  }
}

.archive-volume-exam-progress__focus {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-1, 4px);
}

.archive-volume-exam-progress__gate-hint {
  margin: var(--dp-space-3, 12px) 0 0;
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}

.archive-volume-exam-progress__class-hints {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
}
</style>
