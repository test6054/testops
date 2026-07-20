<template>
  <StageWorkbenchShell class="scan-batch-detail-workbench">
    <template v-if="selectedExamId && scanBatchId" #context>
      <ContextBar
        layout="workbench"
        show-title
        title="扫描批次明细"
        :subtitle="contextSubtitle"
      >
        <template #status>
          <UiTag v-if="workbench?.batch" :tone="batchStatusTone(workbench.batch)" size="sm">
            {{ batchStatusLabel(workbench.batch) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="scanBatchPrimaryAction"
            size="sm"
            :variant="isScanBatchPrimaryVariant(scanBatchPrimaryAction) ? 'primary' : 'outline'"
            :status="isScanBatchDangerAction(scanBatchPrimaryAction) ? 'danger' : undefined"
            :loading="actionLoading === scanBatchPrimaryAction"
            @click="handleTopAction(scanBatchPrimaryAction)"
          >
            {{
              strictEnumLabel(
                ScanBatchWorkbenchTopActionDescription,
                scanBatchPrimaryAction,
                '扫描批次顶栏动作',
              )
            }}
          </UiButton>
          <UiButton
            v-if="scanBatchSecondaryAction"
            size="sm"
            :variant="isScanBatchPrimaryVariant(scanBatchSecondaryAction) ? 'primary' : 'outline'"
            :status="isScanBatchDangerAction(scanBatchSecondaryAction) ? 'danger' : undefined"
            :loading="actionLoading === scanBatchSecondaryAction"
            @click="handleTopAction(scanBatchSecondaryAction)"
          >
            {{
              strictEnumLabel(
                ScanBatchWorkbenchTopActionDescription,
                scanBatchSecondaryAction,
                '扫描批次顶栏动作',
              )
            }}
          </UiButton>
          <UiButton
            v-if="!scanBatchPrimaryAction"
            size="sm"
            variant="outline"
            @click="goBack"
          >
            返回监控台
          </UiButton>
          <UiDropdownAction
            v-if="scanBatchMoreActionItems.length"
            trigger-style="button"
            button-text="更多"
            :items="scanBatchMoreActionItems"
            @select="onScanBatchMoreAction"
          />
        </template>
      </ContextBar>
    </template>

    <template v-if="workbench" #signal>
      <SignalBand compact variant="panel" :metrics="workbenchSignalMetrics" />
    </template>

    <ExamSelectGateStrip
      v-if="!selectedExamId"
      body="请先选择考试后再查看扫描批次明细"
    />
    <UiAlertStrip
      v-else-if="!scanBatchId"
      tone="info"
      size="sm"
      dense
      inline
      :show-icon="false"
    >
      <template #default>
        <span style="display:inline-flex;align-items:center;gap:8px">
          <UiTag tone="blue" size="sm">未选择批次</UiTag>
          <span>缺少扫描批次上下文，请从扫描监控或批次列表进入</span>
        </span>
      </template>
    </UiAlertStrip>
    <UiSpin v-else :spinning="workbenchLoading">
      <UiAlertStrip
        v-if="workbench?.signalBandMessage"
        :tone="workbenchSignalTone"
        :title="workbenchProgressTitle"
        :description="workbench.signalBandMessage"
        dense
        class="scan-batch-detail-workbench__signal-alert"
      />

      <UiAlertStrip
        v-if="workbench?.batch?.orderAuditAttentionPending === true"
        tone="warning"
        :closable="false"
        dense
        title="批次余页未完整切卷"
        description="完整卷已登记；余页保留在扫描页中。可忽略并继续封存，或在页轨中人工合并到目标试卷实例。"
        class="scan-batch-detail-workbench__collate-alert"
      >
        <template v-if="canManageOwnerBatchActions" #actions>
          <UiButton
            size="sm"
            variant="primary"
            :loading="collateAttentionDismissing"
            @click="onDismissCollateAttention"
          >
            忽略并继续
          </UiButton>
          <UiButton size="sm" variant="outline" @click="openOrderAudit"> 人工合并 </UiButton>
        </template>
      </UiAlertStrip>

      <WorkbenchSurfaceCard
        v-if="workbench?.attributionItems?.length"
        flush
        class="scan-batch-detail-workbench__attribution-surface"
      >
        <template #title>批次学生归卷总览</template>
        <template #toolbar>
          <div class="scan-batch-detail-workbench__attribution-summary">
            识别卷 {{ attributionSummary.paperCount }} 份 · 未归卷页
            {{ attributionSummary.unassignedPageCount }} 张 · 待人工复核
            {{ attributionSummary.manualReviewCount }} 份
          </div>
        </template>
        <UiDataTable
          pagination-mode="none"
          :columns="attributionColumns"
          :data-source="workbench.attributionItems"
          :show-pagination="false"
          flat
          row-key="bucketKey"
          size="small"
          :sticky-header="false"
          :total="workbench.attributionItems.length"
        />
      </WorkbenchSurfaceCard>

      <div class="scan-batch-detail-workbench__filters">
        <UiSectionTabs
          v-model="pageStatusFilter"
          :items="pageStatusTabItems"
          compact
          @update:model-value="handlePageStatusFilterChange"
        />
        <UiSearchBox
          v-model="pageKeyword"
          allow-clear
          placeholder="学号 / 姓名 / 班级搜索"
          class="scan-batch-detail-workbench__keyword"
          @search="handlePageKeywordSearch"
        />
      </div>

      <div v-if="isNarrowViewport" class="scan-batch-detail-workbench__narrow-toolbar">
        <UiButton size="sm" variant="outline" @click="leftDrawerOpen = true"> 页轨 </UiButton>
        <UiButton size="sm" variant="outline" @click="rightDrawerOpen = true"> 页检视 </UiButton>
      </div>

      <div
        class="scan-batch-detail-workbench__layout"
        :class="{ 'scan-batch-detail-workbench__layout--narrow': isNarrowViewport }"
      >
        <aside v-if="!isNarrowViewport" class="scan-batch-detail-workbench__rail">
          <ScanBatchPageRail
            :page-items="pageItems"
            :selected-page-key="selectedPageKey"
            :loading="pagesLoading"
            :loading-more="pagesLoadingMore"
            :empty-description="pageRailEmptyDescription"
            @select="handleSelectPage"
            @reach-end="loadMorePages"
          >
            <template #header>
              <div class="scan-batch-detail-workbench__rail-summary">
                共 {{ pageRailCounts.total }} 条 · 待登记 {{ pageRailCounts.pending }} · 已登记
                {{ pageRailCounts.registered }} · 异常 {{ pageRailCounts.exception }}
              </div>
            </template>
          </ScanBatchPageRail>
        </aside>

        <section class="scan-batch-detail-workbench__stage">
          <UiSectionTabs
            v-if="showPreviewTabs"
            v-model="previewTab"
            :items="previewTabItems"
            compact
            class="scan-batch-detail-workbench__preview-tabs"
          />
          <UiSkeletonState v-if="previewLoading" variant="card" compact />
          <ScanImageStage
            v-else-if="previewImageUrl"
            :src="previewImageUrl"
            :caption="previewCaption"
            :confidential="isExamConfidential"
            :exam-label="examConfidentialLabel"
            :watermark-lines="watermarkLines"
            :min-height="480"
            empty-text="预览加载失败"
          />
          <UiEmpty
            size="sm"
            v-else-if="previewLoadFailed"
            description="影像预览加载失败"
            class="scan-batch-detail-workbench__preview-empty"
          />
          <UiEmpty
            size="sm"
            v-else
            :description="previewEmptyDescription"
            class="scan-batch-detail-workbench__preview-empty"
          />
        </section>

        <aside v-if="!isNarrowViewport" class="scan-batch-detail-workbench__inspector">
          <ScanBatchPageInspectorPanel
            :inspector="pageInspector"
            :loading="inspectorLoading"
            :exam-id="selectedExamId"
            :scan-batch-id="scanBatchId"
            :attribution-items="workbench?.attributionItems ?? []"
            :preferred-target-paper-instance-id="preferredTargetPaperInstanceId"
            :can-manage-owner-writes="canManageOwnerBatchActions"
            @bound="handleInspectorBound"
            @reassigned="handleInspectorReassigned"
          />
        </aside>
      </div>
    </UiSpin>

    <UiDrawer v-model:open="leftDrawerOpen" title="页轨" width="360" hide-footer>
      <ScanBatchPageRail
        :page-items="pageItems"
        :selected-page-key="selectedPageKey"
        :loading="pagesLoading"
        :loading-more="pagesLoadingMore"
        :empty-description="pageRailEmptyDescription"
        @select="
          (key) => {
            handleSelectPage(key)
            leftDrawerOpen = false
          }
        "
        @reach-end="loadMorePages"
      />
    </UiDrawer>

    <UiDrawer v-model:open="rightDrawerOpen" title="页检视面板" width="420" hide-footer>
      <ScanBatchPageInspectorPanel
        :inspector="pageInspector"
        :loading="inspectorLoading"
        :exam-id="selectedExamId"
        :scan-batch-id="scanBatchId"
        :attribution-items="workbench?.attributionItems ?? []"
        :preferred-target-paper-instance-id="preferredTargetPaperInstanceId"
        :can-manage-owner-writes="canManageOwnerBatchActions"
        @bound="handleInspectorBound"
        @reassigned="handleInspectorReassigned"
      />
    </UiDrawer>

    <ScanBatchDiscardDialog
      v-model:open="discardModalOpen"
      :confirm-loading="actionLoading === ScanBatchWorkbenchTopActionCode.DISCARD"
      :can-manage-owner-batch-actions="canManageOwnerBatchActions"
      @confirm="confirmDiscardBatch"
    />

    <ScanBatchSupplementModal
      v-model:open="supplementModalOpen"
      :exam-id="selectedExamId"
      :batch="workbench?.batch ?? null"
      @success="handleSupplementSuccess"
    />

    <UiDrawer
      v-model:open="orderAuditDrawerOpen"
      :title="orderAuditDrawerTitle"
      width="560"
      hide-footer
    >
      <UiEmpty
        size="sm"
        v-if="!orderAuditLoading && !orderAuditDetail?.issues?.length"
        description="暂无顺序审计异常"
      />
      <UiDataTable
        v-else
        pagination-mode="none"
        :columns="orderAuditIssueColumns"
        :data-source="orderAuditDetail?.issues ?? []"
        :loading="orderAuditLoading"
        :show-pagination="false"
        flat
        :total="orderAuditDetail?.issues?.length ?? 0"
        row-key="message"
        size="small"
        :sticky-header="false"
      />
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamScanBatchPageRegisterRetryResponse,
  ExamScannerBatchAttributionItemVO,
  ExamScannerBatchPageInspectorVO,
  ExamScannerBatchResponse,
  ExamScannerBatchWorkbenchPageVO,
  ExamScannerBatchWorkbenchResponse,
  ScanBatchOrderAuditIssueResponse,
  ScanBatchOrderAuditResponse,
} from '@/apis/mark/exam-scan'
import type { BadgeTone, UiAlertStripTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { useWindowSize } from '@vueuse/core'
import message from 'ant-design-vue/es/message'
import { computed, h, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchStoragePreviewBlobUrl } from '@/apis/edu/file-management'
import {
  discardScanBatchByTeacher,
  dismissScanBatchCollateAttention,
  getScanBatchOrderAudit,
  getScannerBatchPageInspector,
  getScannerBatchWorkbench,
  pageScannerBatchWorkbenchPages,
  rebuildCompositeScanPages,
  retryScanBatchPageRegister,
  retryScanBatchProcessedImages,
  SCAN_BATCH_STATUS_TONE,
  ScanBatchAttributionReviewStatusCode,
  ScanBatchAttributionReviewStatusDescription,
  ScanBatchOrderAuditDescription,
  ScanBatchStatusDescription,
  ScanBatchWorkbenchTopActionDescription,
  sealScanBatchByTeacher,
} from '@/apis/mark/exam-scan'
import ScanBatchDiscardDialog from '@/components/mark/ScanBatchDiscardDialog.vue'
import ScanBatchPageInspectorPanel from '@/components/mark/ScanBatchPageInspectorPanel.vue'
import ScanBatchPageRail from '@/components/mark/ScanBatchPageRail.vue'
import ScanBatchSupplementModal from '@/components/mark/ScanBatchSupplementModal.vue'
import ScanImageStage from '@/components/mark/ScanImageStage.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSearchBox from '@/components/ui-guide/ui/SearchBox.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiDropdownAction from '@/components/ui-guide/ui/UiDropdownAction.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiSpin from '@/components/ui-guide/ui/UiSpin.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useWorkspaceConfidentialContext } from '@/composables/useWorkspaceConfidentialContext'
import {
  ScanBatchWorkbenchPageStatusFilterCode,
  ScanBatchWorkbenchPageStatusFilterDescription,
} from '@/types/enums/scan-batch-workbench-page-status-filter-enum'
import { ScanBatchWorkbenchRegisterStatusCode } from '@/types/enums/scan-batch-workbench-register-status-enum'
import { ScanBatchWorkbenchTopActionCode } from '@/types/enums/scan-batch-workbench-top-action-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import {
  batchSealBlockedReason,
  canSealBatch,
  formatBatchSealConfirmContent,
} from '@/utils/scan-batch-seal'
import { mapScanBatchWorkbenchSignalBandToneToAlert } from '@/utils/scan-monitor-panel-ui'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceScanBatchDetail' })

const route = useRoute()
const router = useRouter()
const { selectedExamId } = useWorkspaceExamId()
const { width: viewportWidth } = useWindowSize()
const { isExamConfidential, examConfidentialLabel, watermarkLines }
  = useWorkspaceConfidentialContext()

const pageStatusFilter = ref<ScanBatchWorkbenchPageStatusFilterCode>(
  ScanBatchWorkbenchPageStatusFilterCode.ALL,
)
const pageKeyword = ref('')
const pageRailCounts = ref({
  total: 0,
  pending: 0,
  registered: 0,
  exception: 0,
})

const pageStatusTabItems = computed(() => [
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.ALL,
    label: strictEnumLabel(
      ScanBatchWorkbenchPageStatusFilterDescription,
      ScanBatchWorkbenchPageStatusFilterCode.ALL,
      '页轨状态筛选',
    ),
    count: pageRailCounts.value.total,
  },
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.PENDING,
    label: strictEnumLabel(
      ScanBatchWorkbenchPageStatusFilterDescription,
      ScanBatchWorkbenchPageStatusFilterCode.PENDING,
      '页轨状态筛选',
    ),
    count: pageRailCounts.value.pending,
  },
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.REGISTERED,
    label: strictEnumLabel(
      ScanBatchWorkbenchPageStatusFilterDescription,
      ScanBatchWorkbenchPageStatusFilterCode.REGISTERED,
      '页轨状态筛选',
    ),
    count: pageRailCounts.value.registered,
  },
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.EXCEPTION,
    label: strictEnumLabel(
      ScanBatchWorkbenchPageStatusFilterDescription,
      ScanBatchWorkbenchPageStatusFilterCode.EXCEPTION,
      '页轨状态筛选',
    ),
    count: pageRailCounts.value.exception,
  },
])

const pageRailEmptyDescription = computed(() => {
  const batch = workbench.value?.batch
  if (!batch) {
    return '暂无页轨数据'
  }
  if ((batch.receivedPageCount ?? 0) === 0 && (batch.sourceFileCount ?? 0) > 0) {
    return '原件待自动登记与身份识别'
  }
  if (
    pageStatusFilter.value !== ScanBatchWorkbenchPageStatusFilterCode.ALL
    || pageKeyword.value.trim()
  ) {
    return '当前筛选条件下无匹配页轨'
  }
  return '暂无页轨数据'
})
const isNarrowViewport = computed(() => viewportWidth.value > 0 && viewportWidth.value < 1366)

const workbench = ref<ExamScannerBatchWorkbenchResponse | null>(null)
const workbenchLoading = ref(false)
const pageItems = ref<ExamScannerBatchWorkbenchPageVO[]>([])
const pagesLoading = ref(false)
const pagesLoadingMore = ref(false)
const pagesNextCursor = ref<string | null | undefined>(undefined)
const pagesLoadMoreInFlight = ref(false)
const selectedPageKey = ref('')
const pageInspector = ref<ExamScannerBatchPageInspectorVO | null>(null)
const preferredTargetPaperInstanceId = ref<string | undefined>(undefined)
const inspectorLoading = ref(false)
const previewTab = ref<'page' | 'identity'>('page')
const previewImageUrl = ref('')
const previewLoading = ref(false)
const previewLoadFailed = ref(false)
const previewingOriginal = ref(false)
const actionLoading = ref<ScanBatchWorkbenchTopActionCode | ''>('')
const discardModalOpen = ref(false)
const supplementModalOpen = ref(false)
const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)
const collateAttentionDismissing = ref(false)
const orderAuditDrawerOpen = ref(false)
const orderAuditLoading = ref(false)
const orderAuditDetail = ref<ScanBatchOrderAuditResponse | null>(null)

const contextSubtitle = computed(() => {
  const batch = workbench.value?.batch
  if (!batch) {
    return ''
  }
  const device = `${batch.scannerDeviceId || '—'} · ${batch.scannerStationId || '—'}`
  return `${batch.batchNo} · ${device} · ${formatDateTimeWithSeconds(batch.scanStartTime)} 至 ${formatDateTimeWithSeconds(batch.scanEndTime)}`
})

const visibleTopActions = computed(() => workbench.value?.topActions ?? [])

/** 顶栏 1 主 + ≤1 次 + 更多；原始影像/返回收入次级与更多 */
const scanBatchPrimaryAction = computed((): ScanBatchWorkbenchTopActionCode | null => {
  const actions = visibleTopActions.value
  if (!actions.length) return null
  const preferred = actions.find(
    (action) =>
      action === ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER
      || action === ScanBatchWorkbenchTopActionCode.RETRY_PROCESSED_IMAGES,
  )
  return preferred || actions[0] || null
})

const scanBatchSecondaryAction = computed((): ScanBatchWorkbenchTopActionCode | null => {
  const primary = scanBatchPrimaryAction.value
  return visibleTopActions.value.find((action) => action !== primary) || null
})

const scanBatchMoreActionItems = computed(() => {
  const primary = scanBatchPrimaryAction.value
  const secondary = scanBatchSecondaryAction.value
  const items = visibleTopActions.value
    .filter((action) => action !== primary && action !== secondary)
    .map((action) => ({
      key: `top-${action}`,
      label: strictEnumLabel(ScanBatchWorkbenchTopActionDescription, action, '扫描批次顶栏动作'),
      danger:
        action === ScanBatchWorkbenchTopActionCode.DISCARD
        || action === ScanBatchWorkbenchTopActionCode.REBUILD_COMPOSITE_PAGES,
    }))
  if (canViewOriginalImage.value) {
    items.push({ key: 'preview-original', label: '查看原始影像', danger: false })
  }
  // 有主操作时「返回」进更多；无主操作时模板已直出返回
  if (primary) {
    items.push({ key: 'go-back', label: '返回监控台', danger: false })
  }
  return items
})

function isScanBatchPrimaryVariant(action: ScanBatchWorkbenchTopActionCode): boolean {
  return (
    action === ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER
    || action === ScanBatchWorkbenchTopActionCode.RETRY_PROCESSED_IMAGES
  )
}

function isScanBatchDangerAction(action: ScanBatchWorkbenchTopActionCode): boolean {
  return (
    action === ScanBatchWorkbenchTopActionCode.DISCARD
    || action === ScanBatchWorkbenchTopActionCode.REBUILD_COMPOSITE_PAGES
  )
}

function onScanBatchMoreAction(key: string): void {
  if (key === 'preview-original') {
    void loadOriginalPreview()
    return
  }
  if (key === 'go-back') {
    goBack()
    return
  }
  if (key.startsWith('top-')) {
    const action = key.slice(4) as ScanBatchWorkbenchTopActionCode
    void handleTopAction(action)
  }
}
const canViewOriginalImage = computed(() =>
  workbench.value?.canViewOriginalImage === true && Boolean(selectedPage.value?.pageId),
)

/** MVR-262/355：主考写动作能力位（与 BE canManageOwnerBatchActions = 主考∧ACTIVE 对齐） */
const canManageOwnerBatchActions = computed(
  () => workbench.value?.canManageOwnerBatchActions === true,
)

const workbenchSignalMetrics = computed((): SignalMetric[] => {
  const data = workbench.value
  if (!data) {
    return []
  }
  return [
    {
      key: 'received',
      label: '已收件',
      value: data.sourceReceivedCount ?? 0,
      unit: '份',
      tone: 'blue',
    },
    {
      key: 'registered',
      label: '已登记',
      value: data.pageRegisteredCount ?? 0,
      unit: '页',
      tone: 'purple',
    },
    { key: 'bound', label: '已绑定', value: data.paperBoundCount ?? 0, unit: '卷', tone: 'green' },
    {
      key: 'progress',
      label: '登记进度',
      value: data.registrationProgressPercent ?? '—',
      unit:
        data.registrationProgressPercent !== undefined && data.registrationProgressPercent !== null
          ? '%'
          : undefined,
      tone: 'gray',
    },
    {
      key: 'scanProgress',
      label: '扫描进度',
      value: data.progressPercent ?? '—',
      unit: data.progressPercent !== undefined && data.progressPercent !== null ? '%' : undefined,
      tone: 'blue',
    },
  ]
})

const scanBatchId = computed(() => String(route.params.scanBatchId ?? ''))

const workbenchSignalTone = computed((): UiAlertStripTone =>
  mapScanBatchWorkbenchSignalBandToneToAlert(workbench.value?.signalBandTone),
)

const workbenchProgressTitle = computed(() => {
  const display = workbench.value?.progressDisplay
  if (display) {
    return `扫描进度 ${display}`
  }
  const percent = workbench.value?.progressPercent
  return percent !== undefined && percent !== null ? `扫描进度 ${percent}%` : '批次信号'
})

const orderAuditDrawerTitle = computed(() => {
  const batch = workbench.value?.batch
  if (!batch) {
    return '批次顺序诊断'
  }
  return `批次顺序诊断 · ${batch.batchNo}`
})

const orderAuditIssueColumns: ColumnType<ScanBatchOrderAuditIssueResponse>[] = [
  {
    title: '异常码',
    key: 'auditCode',
    width: 140,
    customRender: ({ record }) =>
      strictEnumLabel(ScanBatchOrderAuditDescription, record.auditCode, '顺序审计异常码'),
  },
  { title: '说明', dataIndex: 'message', key: 'message' },
  { title: '进纸序', dataIndex: 'pageSeq', key: 'pageSeq', width: 72 },
  { title: '模板页', dataIndex: 'templatePageNo', key: 'templatePageNo', width: 72 },
]

const SCAN_BATCH_ATTRIBUTION_REVIEW_STATUS_TONE: Record<
  ScanBatchAttributionReviewStatusCode,
  BadgeTone
> = {
  [ScanBatchAttributionReviewStatusCode.UNASSIGNED]: 'orange',
  [ScanBatchAttributionReviewStatusCode.PENDING_BIND]: 'blue',
  [ScanBatchAttributionReviewStatusCode.PENDING_CONFIRM]: 'orange',
  [ScanBatchAttributionReviewStatusCode.BOUND_INCOMPLETE]: 'purple',
  [ScanBatchAttributionReviewStatusCode.BOUND_COMPLETE]: 'green',
  [ScanBatchAttributionReviewStatusCode.SUSPECTED_MIXED]: 'red',
}

const attributionSummary = computed(() => {
  const items = workbench.value?.attributionItems ?? []
  return {
    paperCount: items.filter((item) => !item.unassignedBucket).length,
    unassignedPageCount: items
      .filter((item) => item.unassignedBucket)
      .reduce((sum, item) => sum + item.pages.length, 0),
    manualReviewCount: items.filter((item) => item.manualReviewRequired).length,
  }
})

const attributionSealBlockReason = computed(() => {
  const items = workbench.value?.attributionItems ?? []
  if (!items.length) {
    return ''
  }
  const unassignedPages = items
    .filter((item) => item.unassignedBucket)
    .reduce((sum, item) => sum + item.pages.length, 0)
  if (unassignedPages > 0) {
    return `仍有 ${unassignedPages} 张扫描页未归卷`
  }
  const manualReviewCount = items.filter((item) => item.manualReviewRequired).length
  if (manualReviewCount > 0) {
    return `仍有 ${manualReviewCount} 份试卷待人工复核或页数不完整`
  }
  return ''
})

const attributionColumns: ColumnType<ExamScannerBatchAttributionItemVO>[] = [
  {
    title: '归卷状态',
    dataIndex: 'reviewStatus',
    key: 'reviewStatus',
    width: 156,
    customRender: ({ record }) =>
      h(
        UiTag,
        {
          tone: strictEnumTone(
            SCAN_BATCH_ATTRIBUTION_REVIEW_STATUS_TONE,
            record.reviewStatus,
            '扫描批次归卷复核状态',
          ),
          size: 'sm',
        },
        () =>
          strictEnumLabel(
            ScanBatchAttributionReviewStatusDescription,
            record.reviewStatus,
            '扫描批次归卷复核状态',
          ),
      ),
  },
  {
    title: '学生 / 卷实例',
    key: 'identity',
    width: 260,
    customRender: ({ record }) => {
      const primary = record.unassignedBucket
        ? '未归卷页'
        : record.studentName || record.recognizedStudentName || '待确认学生'
      const secondary = [
        record.studentNo || record.recognizedStudentNo || '无学号',
        record.className || record.recognizedClassName || '未识别班级',
      ].join(' · ')
      return h('div', { class: 'scan-batch-detail-workbench__attribution-cell' }, [
        h('div', { class: 'scan-batch-detail-workbench__attribution-main' }, primary),
        h('div', { class: 'scan-batch-detail-workbench__attribution-sub' }, secondary),
      ])
    },
  },
  {
    title: '页位',
    key: 'pages',
    width: 180,
    customRender: ({ record }) => {
      const text = record.pages
        .map((page) => `T${page.templatePageNo ?? '—'}·#${page.fileOrder}`)
        .join(' / ')
      const suffix = record.expectedPageCount
        ? `（${record.registeredPageCount ?? record.pages.length}/${record.expectedPageCount}）`
        : ''
      return `${text}${suffix}`
    },
  },
  {
    title: '识别线索',
    key: 'recognized',
    width: 220,
    customRender: ({ record }) =>
      [
        record.recognizedStudentName || record.studentName,
        record.recognizedStudentNo || record.studentNo,
        record.recognizedClassName || record.className,
      ]
        .filter(Boolean)
        .join(' · ') || '—',
  },
  { title: '诊断', dataIndex: 'diagnostic', key: 'diagnostic' },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    customRender: ({ record }) =>
      h('div', { class: 'scan-batch-detail-workbench__attribution-actions' }, [
        h(
          UiButton,
          {
            size: 'sm',
            variant: 'outline',
            onClick: () => locateAttributionItem(record),
          },
          () => '定位页轨',
        ),
        !record.unassignedBucket && record.paperInstanceId
          ? h(
              UiButton,
              {
                size: 'sm',
                variant: 'outline',
                onClick: () => setPreferredReassignTarget(record.paperInstanceId!),
              },
              () => '设为调卷目标',
            )
          : null,
      ]),
  },
]

const selectedPage = computed(() => {
  const fromRail = pageItems.value.find((item) => item.pageKey === selectedPageKey.value)
  if (fromRail) {
    return fromRail
  }
  const inspectorPage = pageInspector.value?.page
  if (inspectorPage?.pageKey === selectedPageKey.value) {
    return inspectorPage
  }
  return null
})

const showPreviewTabs = computed(() =>
  Boolean(
    canViewOriginalImage.value
    && selectedPage.value?.identitySliceFileId
    && selectedPage.value.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING,
  ),
)

const previewTabItems = computed(() => [
  { key: 'page', label: '登记页' },
  { key: 'identity', label: '身份切片' },
])

const previewCaption = computed(() => {
  const page = selectedPage.value
  if (!page) {
    return ''
  }
  if (previewTab.value === 'identity') {
    return `身份切片 · #${page.fileOrder}`
  }
  if (previewingOriginal.value) {
    return `原始影像 · #${page.fileOrder}`
  }
  return page.registerStatus === ScanBatchWorkbenchRegisterStatusCode.PENDING
    ? `原件 · #${page.fileOrder}`
    : `登记页 · #${page.fileOrder}`
})

const previewEmptyDescription = computed(() => {
  const page = selectedPage.value
  if (!page) {
    return '请选择页轨条目预览'
  }
  if (page.registerStatus === ScanBatchWorkbenchRegisterStatusCode.PENDING) {
    return '原件仅在后台登记和身份识别链路使用，工作台不显示未脱敏影像。请重试页登记。'
  }
  if (page.diagnostic?.trim()) {
    return page.diagnostic.trim()
  }
  if (!page.previewUrl) {
    return '匿名展示影像尚未生成，请使用顶栏「补跑脱敏」或检查制卷身份填涂区配置。'
  }
  return '请选择页轨条目预览'
})

function batchStatusTone(batch: ExamScannerBatchResponse): BadgeTone {
  if (batch.sealedTime) {
    return 'green'
  }
  return strictEnumTone(SCAN_BATCH_STATUS_TONE, batch.status, '扫描批次状态')
}

function batchStatusLabel(batch: ExamScannerBatchResponse): string {
  if (batch.sealedTime) {
    return '已封存'
  }
  return strictEnumLabel(ScanBatchStatusDescription, batch.status, '扫描批次状态')
}

function releasePreviewUrl(): void {
  if (previewImageUrl.value) {
    URL.revokeObjectURL(previewImageUrl.value)
    previewImageUrl.value = ''
  }
}

function parsePendingFileOrder(pageKey: string): number | null {
  const match = /^pending-(\d+)$/.exec(pageKey)
  if (!match) {
    return null
  }
  return Number(match[1])
}

/** 页登记成功后 pending-N 键会变为 REGISTERED 行 numeric pageKey，按 fileOrder 续接选中。 */
function resolvePageKeyAfterRefresh(
  previousKey: string,
  items: ExamScannerBatchWorkbenchPageVO[],
): string {
  if (!previousKey) {
    return ''
  }
  if (items.some((item) => item.pageKey === previousKey)) {
    return previousKey
  }
  const pendingFileOrder = parsePendingFileOrder(previousKey)
  if (pendingFileOrder !== null) {
    const registered = items.find(
      (item) =>
        item.fileOrder === pendingFileOrder
        && item.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING,
    )
    if (registered) {
      return registered.pageKey
    }
  }
  return previousKey
}

function ensureSelectedPageInRail(pageKey: string): void {
  if (!pageKey || pageItems.value.some((item) => item.pageKey === pageKey)) {
    return
  }
  const inspectorPage = pageInspector.value?.page
  if (inspectorPage?.pageKey === pageKey) {
    pageItems.value = [inspectorPage, ...pageItems.value]
  }
}

async function syncSelectedPageAfterRefresh(pageKey: string): Promise<void> {
  if (!pageKey) {
    pageInspector.value = null
    return
  }
  selectedPageKey.value = pageKey
  if (!pageItems.value.some((item) => item.pageKey === pageKey)) {
    const initialItem = workbench.value?.initialPageItems?.find((item) => item.pageKey === pageKey)
    if (initialItem) {
      pageItems.value = [initialItem, ...pageItems.value]
    } else {
      await loadInspector(pageKey)
      ensureSelectedPageInRail(pageKey)
      return
    }
  }
  await loadInspector(pageKey)
}

async function loadWorkbench(): Promise<void> {
  if (!selectedExamId.value || !scanBatchId.value) {
    workbench.value = null
    return
  }
  workbenchLoading.value = true
  const preservedPageKey = selectedPageKey.value
  const preservedFileOrder = parsePendingFileOrder(preservedPageKey)
  try {
    workbench.value = await getScannerBatchWorkbench({
      examId: selectedExamId.value,
      scanBatchId: scanBatchId.value,
    })
    pageItems.value = workbench.value.initialPageItems ?? []
    selectedPageKey.value
      = preservedPageKey || workbench.value.initialPageKey || pageItems.value[0]?.pageKey || ''
    pagesNextCursor.value = undefined
    await refreshPagesWindow()

    let pageKey = resolvePageKeyAfterRefresh(selectedPageKey.value, pageItems.value)
    if (!pageItems.value.some((item) => item.pageKey === pageKey) && preservedFileOrder !== null) {
      const byFileOrder = pageItems.value.find((item) => item.fileOrder === preservedFileOrder)
      if (byFileOrder) {
        pageKey = byFileOrder.pageKey
      }
    }
    await syncSelectedPageAfterRefresh(pageKey)
  } catch (error) {
    workbench.value = null
    showUserError(error, '批次工作台加载失败')
  } finally {
    workbenchLoading.value = false
  }
}

function syncPageRailCounts(response: {
  totalCount?: number
  pendingCount?: number
  registeredCount?: number
  exceptionCount?: number
}): void {
  const pending = response.pendingCount ?? 0
  const registered = response.registeredCount ?? 0
  pageRailCounts.value = {
    total: response.totalCount ?? pending + registered,
    pending,
    registered,
    exception: response.exceptionCount ?? 0,
  }
}

function buildPageQuery(cursor?: string) {
  return {
    examId: selectedExamId.value!,
    scanBatchId: scanBatchId.value,
    pageStatusFilter: pageStatusFilter.value,
    keyword: pageKeyword.value.trim() || undefined,
    pageSize: 50,
    cursor,
  }
}

async function handlePageStatusFilterChange(): Promise<void> {
  pagesNextCursor.value = undefined
  selectedPageKey.value = ''
  pageInspector.value = null
  await refreshPagesWindow()
}

async function handlePageKeywordSearch(): Promise<void> {
  pagesNextCursor.value = undefined
  selectedPageKey.value = ''
  pageInspector.value = null
  await refreshPagesWindow()
}

async function refreshPagesWindow(): Promise<void> {
  if (!selectedExamId.value || !scanBatchId.value) {
    return
  }
  pagesLoading.value = true
  try {
    const response = await pageScannerBatchWorkbenchPages(buildPageQuery())
    pageItems.value = response.items
    pagesNextCursor.value = response.nextCursor ?? null
    syncPageRailCounts(response)
    if (!selectedPageKey.value && pageItems.value[0]) {
      selectedPageKey.value = pageItems.value[0].pageKey
      await loadInspector(selectedPageKey.value)
    }
  } catch (error) {
    showUserError(error, '页轨加载失败')
  } finally {
    pagesLoading.value = false
  }
}

async function loadMorePages(): Promise<void> {
  if (
    !selectedExamId.value
    || !scanBatchId.value
    || !pagesNextCursor.value
    || pagesLoadingMore.value
  ) {
    return
  }
  if (pagesLoadMoreInFlight.value) {
    return
  }
  pagesLoadMoreInFlight.value = true
  pagesLoadingMore.value = true
  try {
    const response = await pageScannerBatchWorkbenchPages(buildPageQuery(pagesNextCursor.value))
    pageItems.value = [...pageItems.value, ...response.items]
    pagesNextCursor.value = response.nextCursor ?? null
    syncPageRailCounts(response)
  } catch (error) {
    showUserError(error, '页轨翻页加载失败')
  } finally {
    pagesLoadingMore.value = false
    pagesLoadMoreInFlight.value = false
  }
}

function formatPageRegisterRetryMessage(response: ExamScanBatchPageRegisterRetryResponse): string {
  const retried = response.retriedCount
  const skipped = response.skippedCount
  if (retried !== undefined && skipped !== undefined) {
    return `页登记重试完成：处理 ${retried} 份，跳过已登记 ${skipped} 份`
  }
  return '页登记重试成功'
}

async function handleInspectorBound(): Promise<void> {
  await handleInspectorReassigned()
}

async function handleInspectorReassigned(): Promise<void> {
  const pageKey = selectedPageKey.value
  try {
    await loadWorkbench()
    if (pageKey) {
      await syncSelectedPageAfterRefresh(pageKey)
    }
  } catch (error) {
    showUserError(error, '工作台刷新失败')
  }
}

async function loadInspector(pageKey: string): Promise<void> {
  if (!selectedExamId.value || !scanBatchId.value || !pageKey) {
    pageInspector.value = null
    return
  }
  inspectorLoading.value = true
  try {
    pageInspector.value = await getScannerBatchPageInspector({
      examId: selectedExamId.value,
      scanBatchId: scanBatchId.value,
      pageKey,
    })
  } catch (error) {
    pageInspector.value = null
    showUserError(error, '页检视面板加载失败')
  } finally {
    inspectorLoading.value = false
  }
}

async function loadPreview(): Promise<void> {
  releasePreviewUrl()
  previewLoadFailed.value = false
  previewingOriginal.value = false
  const page = selectedPage.value
  if (!page) {
    return
  }
  const previewPath
    = previewTab.value === 'identity' ? page.identitySlicePreviewUrl : page.previewUrl
  if (!previewPath) {
    previewLoadFailed.value = true
    return
  }
  previewLoading.value = true
  try {
    previewImageUrl.value = await fetchStoragePreviewBlobUrl(previewPath)
  } catch (error) {
    previewLoadFailed.value = true
    showUserError(error, '影像预览加载失败')
  } finally {
    previewLoading.value = false
  }
}

async function loadOriginalPreview(): Promise<void> {
  const page = selectedPage.value
  if (!page?.pageId || !selectedExamId.value || !canViewOriginalImage.value) {
    return
  }
  releasePreviewUrl()
  previewLoadFailed.value = false
  previewLoading.value = true
  try {
    const previewPath = `/api/mark/exams/scanner-batches/pages/original-image?examId=${selectedExamId.value}&pageId=${page.pageId}`
    previewImageUrl.value = await fetchStoragePreviewBlobUrl(previewPath)
    previewingOriginal.value = true
  } catch (error) {
    previewLoadFailed.value = true
    showUserError(error, '原始影像加载失败')
  } finally {
    previewLoading.value = false
  }
}

function handleSelectPage(pageKey: string): void {
  selectedPageKey.value = pageKey
  preferredTargetPaperInstanceId.value = undefined
  previewTab.value = 'page'
  void loadInspector(pageKey)
}

function locateAttributionItem(item: ExamScannerBatchAttributionItemVO): void {
  const pageKey = item.pages[0]?.pageKey
  if (!pageKey) {
    return
  }
  selectedPageKey.value = pageKey
  void loadInspector(pageKey)
}

function setPreferredReassignTarget(paperInstanceId: string): void {
  preferredTargetPaperInstanceId.value = paperInstanceId
  message.success('已设置调卷目标，请在右侧页检视面板选择待移动页后执行人工调卷')
}

async function openOrderAudit(): Promise<void> {
  const batch = workbench.value?.batch
  if (!batch?.scanBatchId || !selectedExamId.value) {
    return
  }
  orderAuditDrawerOpen.value = true
  orderAuditLoading.value = true
  orderAuditDetail.value = null
  try {
    orderAuditDetail.value = await getScanBatchOrderAudit({
      examId: selectedExamId.value,
      scanBatchId: batch.scanBatchId,
    })
  } catch (error) {
    showUserError(error, '加载顺序诊断失败')
  } finally {
    orderAuditLoading.value = false
  }
}

async function onDismissCollateAttention(): Promise<void> {
  const batch = workbench.value?.batch
  if (!batch?.scanBatchId || !selectedExamId.value || batch.orderAuditAttentionPending !== true) {
    return
  }
  // MVR-313：与 canManageOwnerBatchActions / BE requireExamOwnerPermission 同源
  if (!canManageOwnerBatchActions.value) {
    message.warning('仅主考可忽略余页异常')
    return
  }
  await confirmAsync({
    title: '忽略并继续',
    content: '余页将保留在扫描页中，不创建试卷实例。确认后可继续封存批次。',
    type: 'warning',
    onOk: async () => {
      collateAttentionDismissing.value = true
      try {
        await dismissScanBatchCollateAttention({
          examId: selectedExamId.value,
          scanBatchId: batch.scanBatchId,
        })
        message.success('已忽略余页异常，可继续封存')
        await loadWorkbench()
      } catch (error) {
        showUserError(error, '忽略余页异常失败')
      } finally {
        collateAttentionDismissing.value = false
      }
    },
  })
}

async function handleTopAction(action: ScanBatchWorkbenchTopActionCode): Promise<void> {
  const batch = workbench.value?.batch
  if (!batch?.scanBatchId || !selectedExamId.value) {
    return
  }
  if (actionLoading.value) {
    return
  }
  // MVR-298：顶栏写动作二次拦截；BE resolveTopActions 已对非主考返回空列表，防拆栏/缓存陈旧
  if (!canManageOwnerBatchActions.value) {
    message.warning('仅本场主考可执行批次写操作')
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER) {
    actionLoading.value = action
    try {
      const response = await retryScanBatchPageRegister({
        examId: selectedExamId.value,
        scanBatchId: batch.scanBatchId,
      })
      if (response.pageRegisterBlocked) {
        message.warning(response.pageRegisterDiagnostic ?? '页登记仍被阻断')
      } else if (response.pageRegisterPending) {
        message.warning(response.pageRegisterDiagnostic ?? '页登记待重试')
      } else {
        message.success(formatPageRegisterRetryMessage(response))
      }
      await loadWorkbench()
    } catch (error) {
      showUserError(error, '页登记重试失败')
    } finally {
      actionLoading.value = ''
    }
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.RETRY_PROCESSED_IMAGES) {
    actionLoading.value = action
    try {
      const count = await retryScanBatchProcessedImages({
        examId: selectedExamId.value,
        scanBatchId: batch.scanBatchId,
      })
      message.success(`已补跑 ${count} 页脱敏处理影像`)
      await loadWorkbench()
      if (selectedPageKey.value) {
        void loadInspector(selectedPageKey.value)
      }
    } catch (error) {
      showUserError(error, '补跑脱敏失败')
    } finally {
      actionLoading.value = ''
    }
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.REBUILD_COMPOSITE_PAGES) {
    void confirmAsync({
      title: '合成图物理页重建',
      content:
        '将作废当前批次内全部已登记扫描页与错误绑定，并按智能切分重新登记。此操作不可撤销，确认继续？',
      okText: '确认重建',
      cancelText: '取消',
      type: 'warning',
      width: 520,
      onOk: async () => {
        if (actionLoading.value) {
          return false
        }
        actionLoading.value = action
        try {
          const response = await rebuildCompositeScanPages({
            examId: selectedExamId.value,
            scanBatchId: batch.scanBatchId,
          })
          if (response.pageRegisterBlocked) {
            message.warning(response.pageRegisterDiagnostic ?? '页登记仍被阻断')
          } else if (response.pageRegisterPending) {
            message.warning(response.pageRegisterDiagnostic ?? '页登记待重试')
          } else {
            message.success(formatPageRegisterRetryMessage(response))
          }
          await loadWorkbench()
        } catch (error) {
          showUserError(error, '物理页重建失败')
          return false
        } finally {
          actionLoading.value = ''
        }
      },
    })
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.OPEN_PREP) {
    void router.push({
      name: 'TeacherExamWorkspaceLayoutDesigner',
      params: { examId: selectedExamId.value },
    })
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.SEAL) {
    if (attributionSealBlockReason.value) {
      message.warning(attributionSealBlockReason.value)
      return
    }
    if (!canSealBatch(batch)) {
      message.warning(batchSealBlockedReason(batch) || '当前批次不满足封存条件')
      return
    }
    void confirmAsync({
      title: '封存扫描批次',
      content: formatBatchSealConfirmContent(batch),
      okText: '确认封存',
      cancelText: '取消',
      type: 'warning',
      width: 520,
      onOk: async () => {
        if (actionLoading.value) {
          return false
        }
        actionLoading.value = action
        try {
          await sealScanBatchByTeacher({ scanBatchId: batch.scanBatchId })
          message.success(`扫描批次已封存：${batch.batchNo}`)
          await loadWorkbench()
        } catch (error) {
          showUserError(error, '扫描批次封存失败')
          return false
        } finally {
          actionLoading.value = ''
        }
      },
    })
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.DISCARD) {
    // MVR-322：打开废弃弹窗前叠主考写能力位
    if (!canManageOwnerBatchActions.value) {
      message.warning('当前账号不可废弃扫描批次')
      return
    }
    discardModalOpen.value = true
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.SUPPLEMENT) {
    // MVR-322：补扫弹窗同主考写能力位
    if (!canManageOwnerBatchActions.value) {
      message.warning('当前账号不可提交补扫')
      return
    }
    supplementModalOpen.value = true
  }
}

async function handleSupplementSuccess(): Promise<void> {
  supplementModalOpen.value = false
  await loadWorkbench()
}

async function confirmDiscardBatch(reason: string): Promise<void> {
  // MVR-322/376：与 canManageOwnerBatchActions / BE 主考写门禁二次拦截
  if (canManageOwnerBatchActions.value !== true) {
    message.warning('当前账号不可废弃扫描批次')
    discardModalOpen.value = false
    return
  }
  const batch = workbench.value?.batch
  if (!batch?.scanBatchId) {
    discardModalOpen.value = false
    return
  }
  if (actionLoading.value) {
    return
  }
  actionLoading.value = ScanBatchWorkbenchTopActionCode.DISCARD
  try {
    await discardScanBatchByTeacher({ scanBatchId: batch.scanBatchId, discardReason: reason })
    message.success(`扫描批次已废弃：${batch.batchNo}`)
    discardModalOpen.value = false
    await loadWorkbench()
  } catch (error) {
    showUserError(error, '扫描批次废弃失败')
  } finally {
    actionLoading.value = ''
  }
}

function goBack(): void {
  void router.push({
    name: 'TeacherExamWorkspaceScanMonitor',
    params: { examId: selectedExamId.value },
  })
}

watch(
  () => [selectedExamId.value, scanBatchId.value],
  () => {
    void loadWorkbench()
  },
  { immediate: true },
)

watch(
  () => [selectedPage.value, previewTab.value] as const,
  () => {
    void loadPreview()
  },
)

onUnmounted(() => {
  releasePreviewUrl()
})
</script>

<style lang="scss" scoped>
.scan-batch-detail-workbench__signal-alert {
  margin-bottom: 12px;
}

.scan-batch-detail-workbench__collate-alert {
  margin-bottom: 12px;
}

.scan-batch-detail-workbench__collate-alert :deep(.ui-alert-strip) {
  background: var(--dp-warning-bg);
  border-color: var(--dp-warning-border);
}

.scan-batch-detail-workbench__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.scan-batch-detail-workbench__attribution-surface {
  margin-bottom: 12px;
}

.scan-batch-detail-workbench__attribution-summary {
  color: var(--dp-text-tertiary);
  font-size: 12px;
}

.scan-batch-detail-workbench__attribution-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scan-batch-detail-workbench__attribution-main {
  color: var(--dp-text);
  font-weight: 600;
}

.scan-batch-detail-workbench__attribution-sub {
  color: var(--dp-text-secondary);
  font-size: 12px;
}

.scan-batch-detail-workbench__attribution-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.scan-batch-detail-workbench__keyword {
  width: min(280px, 100%);
}

.scan-batch-detail-workbench__rail-summary {
  padding: 8px 12px 0;
  color: var(--dp-text-tertiary);
  font-size: 12px;
}

.scan-batch-detail-workbench__narrow-toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.scan-batch-detail-workbench__layout {
  display: grid;
  grid-template-columns: minmax(240px, 24%) minmax(0, 52%) minmax(240px, 24%);
  gap: 12px;
  min-height: calc(100vh - 180px);

  &--narrow {
    grid-template-columns: minmax(0, 1fr);
  }
}

.scan-batch-detail-workbench__rail,
.scan-batch-detail-workbench__inspector {
  min-height: 0;
  border: 1px solid var(--dp-border-subtle);
  border-radius: 8px;
  background: var(--dp-bg-container);
}

.scan-batch-detail-workbench__inspector {
  padding: 12px;
  overflow-y: auto;
}

.scan-batch-detail-workbench__stage {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  min-height: 0;
}

.scan-batch-detail-workbench__preview-tabs {
  flex-shrink: 0;
}

.scan-batch-detail-workbench__preview-empty {
  /* 空态不占满预览舞台；有影像时由 viewer 自行撑开 */
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
