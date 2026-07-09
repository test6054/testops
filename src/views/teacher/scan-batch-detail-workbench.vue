<template>
  <StageWorkbenchShell class="scan-batch-detail-workbench">
    <template v-if="selectedExamId && scanBatchId" #context>
      <ContextBar layout="workbench" :subtitle="contextSubtitle">
        <template #status>
          <UiTag v-if="workbench?.batch" :tone="batchStatusTone(workbench.batch)" size="sm">
            {{ batchStatusLabel(workbench.batch) }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-for="action in visibleTopActions"
            :key="action"
            size="sm"
            :variant="
              action === ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER ? 'primary' : 'outline'
            "
            :status="action === ScanBatchWorkbenchTopActionCode.DISCARD ? 'danger' : undefined"
            :loading="actionLoading === action"
            @click="handleTopAction(action)"
          >
            {{ ScanBatchWorkbenchTopActionDescription[action] }}
          </UiButton>
          <UiButton size="sm" variant="outline" @click="goBack"> 返回监控台 </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="workbench" #signal>
      <SignalBand variant="tiles" compact :metrics="workbenchSignalMetrics" />
    </template>

    <UiEmpty v-if="!selectedExamId || !scanBatchId" description="缺少批次上下文" />
    <a-spin v-else :spinning="workbenchLoading">
      <UiAlertStrip
        v-if="workbench?.signalBandMessage"
        :tone="workbenchSignalTone"
        :title="workbenchProgressTitle"
        :description="workbench.signalBandMessage"
        dense
        class="scan-batch-detail-workbench__signal-alert"
      />

      <ScanBatchWorkbenchAttentionPanel
        v-if="workbench?.batch"
        :exam-id="selectedExamId"
        :scan-batch-id="scanBatchId"
        :attention-count="workbench.batch.attentionItemCount"
        @select-page="handleAttentionSelectPage"
      />

      <div class="scan-batch-detail-workbench__filters">
        <UiSectionTabs
          v-model="pageStatusFilter"
          :items="pageStatusTabItems"
          compact
          @update:model-value="handlePageStatusFilterChange"
        />
        <a-input-search
          v-model:value="pageKeyword"
          allow-clear
          placeholder="学号 / 姓名 / 班级搜索"
          class="scan-batch-detail-workbench__keyword"
          @search="handlePageKeywordSearch"
        />
      </div>

      <div v-if="isNarrowViewport" class="scan-batch-detail-workbench__narrow-toolbar">
        <UiButton size="sm" variant="outline" @click="leftDrawerOpen = true"> 页轨 </UiButton>
        <UiButton size="sm" variant="outline" @click="rightDrawerOpen = true"> Inspector </UiButton>
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
            v-else-if="previewLoadFailed"
            description="影像预览加载失败"
            class="scan-batch-detail-workbench__preview-empty"
          />
          <UiEmpty
            v-else
            description="请选择页轨条目预览"
            class="scan-batch-detail-workbench__preview-empty"
          />
        </section>

        <aside v-if="!isNarrowViewport" class="scan-batch-detail-workbench__inspector">
          <ScanBatchPageInspectorPanel
            :inspector="pageInspector"
            :loading="inspectorLoading"
            :exam-id="selectedExamId"
            :scan-batch-id="scanBatchId"
            @bound="handleInspectorBound"
          />
        </aside>
      </div>
    </a-spin>

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

    <UiDrawer v-model:open="rightDrawerOpen" title="页 Inspector" width="420" hide-footer>
      <ScanBatchPageInspectorPanel
        :inspector="pageInspector"
        :loading="inspectorLoading"
        :exam-id="selectedExamId"
        :scan-batch-id="scanBatchId"
        @bound="handleInspectorBound"
      />
    </UiDrawer>

    <ScanBatchDiscardDialog
      v-model:open="discardModalOpen"
      :confirm-loading="actionLoading === ScanBatchWorkbenchTopActionCode.DISCARD"
      @confirm="confirmDiscardBatch"
    />

    <ScanBatchSupplementModal
      v-model:open="supplementModalOpen"
      :exam-id="selectedExamId"
      :batch="workbench?.batch ?? null"
      @success="handleSupplementSuccess"
    />
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type {
  ExamScanBatchPageRegisterRetryResponse,
  ExamScannerBatchPageInspectorVO,
  ExamScannerBatchResponse,
  ExamScannerBatchWorkbenchPageVO,
  ExamScannerBatchWorkbenchResponse,
} from '@/apis/mark/exam-scan'
import {
  getScannerBatchPageInspector,
  getScannerBatchWorkbench,
  pageScannerBatchWorkbenchPages,
  retryScanBatchPageRegister,
  SCAN_BATCH_STATUS_TONE,
  ScanBatchStatusDescription,
  ScanBatchWorkbenchTopActionDescription,
  sealScanBatchByTeacher,
} from '@/apis/mark/exam-scan'
import type { BadgeTone, UiAlertStripTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { useWindowSize } from '@vueuse/core'
import message from 'ant-design-vue/es/message'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchStoragePreviewBlobUrl } from '@/apis/edu/file-management'
import { discardScannerKioskBatch } from '@/apis/mark/scanner-kiosk'
import ScanBatchDiscardDialog from '@/components/mark/ScanBatchDiscardDialog.vue'
import ScanBatchPageInspectorPanel from '@/components/mark/ScanBatchPageInspectorPanel.vue'
import ScanBatchPageRail from '@/components/mark/ScanBatchPageRail.vue'
import ScanBatchSupplementModal from '@/components/mark/ScanBatchSupplementModal.vue'
import ScanBatchWorkbenchAttentionPanel from '@/components/mark/ScanBatchWorkbenchAttentionPanel.vue'
import ScanImageStage from '@/components/mark/ScanImageStage.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
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
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamWorkspaceScanBatchDetail' })

const route = useRoute()
const router = useRouter()
const { selectedExamId } = useWorkspaceExamId()
const { width: viewportWidth } = useWindowSize()
const { isExamConfidential, examConfidentialLabel, watermarkLines } =
  useWorkspaceConfidentialContext()

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
    label:
      ScanBatchWorkbenchPageStatusFilterDescription[ScanBatchWorkbenchPageStatusFilterCode.ALL],
    count: pageRailCounts.value.total,
  },
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.PENDING,
    label:
      ScanBatchWorkbenchPageStatusFilterDescription[ScanBatchWorkbenchPageStatusFilterCode.PENDING],
    count: pageRailCounts.value.pending,
  },
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.REGISTERED,
    label:
      ScanBatchWorkbenchPageStatusFilterDescription[
        ScanBatchWorkbenchPageStatusFilterCode.REGISTERED
      ],
    count: pageRailCounts.value.registered,
  },
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.EXCEPTION,
    label:
      ScanBatchWorkbenchPageStatusFilterDescription[
        ScanBatchWorkbenchPageStatusFilterCode.EXCEPTION
      ],
    count: pageRailCounts.value.exception,
  },
])

const pageRailEmptyDescription = computed(() => {
  const batch = workbench.value?.batch
  if (!batch) {
    return '暂无页轨数据'
  }
  if ((batch.receivedPageCount ?? 0) === 0 && (batch.sourceFileCount ?? 0) > 0) {
    return '原件待登记，可在中栏预览原件'
  }
  if (
    pageStatusFilter.value !== ScanBatchWorkbenchPageStatusFilterCode.ALL ||
    pageKeyword.value.trim()
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
const inspectorLoading = ref(false)
const previewTab = ref<'page' | 'identity'>('page')
const previewImageUrl = ref('')
const previewLoading = ref(false)
const previewLoadFailed = ref(false)
const actionLoading = ref<ScanBatchWorkbenchTopActionCode | ''>('')
const discardModalOpen = ref(false)
const supplementModalOpen = ref(false)
const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)

const contextSubtitle = computed(() => {
  const batch = workbench.value?.batch
  if (!batch) {
    return ''
  }
  const device = `${batch.scannerDeviceId || '—'} · ${batch.scannerStationId || '—'}`
  return `${batch.batchNo} · ${device} · ${formatDateTimeWithSeconds(batch.scanStartTime)} 至 ${formatDateTimeWithSeconds(batch.scanEndTime)}`
})

const visibleTopActions = computed(() => workbench.value?.topActions ?? [])

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

const workbenchSignalTone = computed((): UiAlertStripTone => {
  const tone = workbench.value?.signalBandTone
  if (tone === 'error' || tone === 'warning' || tone === 'info' || tone === 'success') {
    return tone
  }
  if (tone === 'red') {
    return 'error'
  }
  if (tone === 'amber') {
    return 'warning'
  }
  if (tone === 'blue') {
    return 'info'
  }
  return 'info'
})

const workbenchProgressTitle = computed(() => {
  const display = workbench.value?.progressDisplay
  if (display) {
    return `扫描进度 ${display}`
  }
  const percent = workbench.value?.progressPercent
  return percent !== undefined && percent !== null ? `扫描进度 ${percent}%` : '批次信号'
})

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
    selectedPage.value?.identitySliceFileId &&
    selectedPage.value.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING,
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
  return page.registerStatus === ScanBatchWorkbenchRegisterStatusCode.PENDING
    ? `原件 · #${page.fileOrder}`
    : `登记页 · #${page.fileOrder}`
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
        item.fileOrder === pendingFileOrder &&
        item.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING,
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
    selectedPageKey.value =
      preservedPageKey || workbench.value.initialPageKey || pageItems.value[0]?.pageKey || ''
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
    !selectedExamId.value ||
    !scanBatchId.value ||
    !pagesNextCursor.value ||
    pagesLoadingMore.value
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
  const pageKey = selectedPageKey.value
  if (!selectedExamId.value || !scanBatchId.value) {
    return
  }
  try {
    const refreshed = await getScannerBatchWorkbench({
      examId: selectedExamId.value,
      scanBatchId: scanBatchId.value,
    })
    if (workbench.value) {
      workbench.value = {
        ...workbench.value,
        batch: refreshed.batch,
        signalBandMessage: refreshed.signalBandMessage,
        signalBandTone: refreshed.signalBandTone,
        progressPercent: refreshed.progressPercent,
        progressDisplay: refreshed.progressDisplay,
        registrationProgressPercent: refreshed.registrationProgressPercent,
        sourceReceivedCount: refreshed.sourceReceivedCount,
        pageRegisteredCount: refreshed.pageRegisteredCount,
        paperBoundCount: refreshed.paperBoundCount,
        topActions: refreshed.topActions,
      }
    }
    await refreshPagesWindow()
    if (pageKey) {
      await syncSelectedPageAfterRefresh(pageKey)
    }
  } catch (error) {
    showUserError(error, '绑定后刷新工作台失败')
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
    showUserError(error, 'Inspector 加载失败')
  } finally {
    inspectorLoading.value = false
  }
}

async function loadPreview(): Promise<void> {
  releasePreviewUrl()
  previewLoadFailed.value = false
  const page = selectedPage.value
  if (!page) {
    return
  }
  const previewPath =
    previewTab.value === 'identity' ? page.identitySlicePreviewUrl : page.previewUrl
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

function handleSelectPage(pageKey: string): void {
  selectedPageKey.value = pageKey
  previewTab.value = 'page'
  void loadInspector(pageKey)
}

async function handleAttentionSelectPage(pageId: string): Promise<void> {
  const pageKey = pageId
  selectedPageKey.value = pageKey
  previewTab.value = 'page'
  await syncSelectedPageAfterRefresh(pageKey)
}

async function handleTopAction(action: ScanBatchWorkbenchTopActionCode): Promise<void> {
  const batch = workbench.value?.batch
  if (!batch?.scanBatchId || !selectedExamId.value) {
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
  if (action === ScanBatchWorkbenchTopActionCode.OPEN_PREP) {
    void router.push({
      name: 'TeacherExamWorkspaceLayoutDesigner',
      params: { examId: selectedExamId.value },
    })
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.SEAL) {
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
    discardModalOpen.value = true
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.SUPPLEMENT) {
    supplementModalOpen.value = true
  }
}

async function handleSupplementSuccess(): Promise<void> {
  supplementModalOpen.value = false
  await loadWorkbench()
}

async function confirmDiscardBatch(reason: string): Promise<void> {
  const batch = workbench.value?.batch
  if (!batch?.scanBatchId) {
    discardModalOpen.value = false
    return
  }
  actionLoading.value = ScanBatchWorkbenchTopActionCode.DISCARD
  try {
    await discardScannerKioskBatch({ scanBatchId: batch.scanBatchId, discardReason: reason })
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

.scan-batch-detail-workbench__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.scan-batch-detail-workbench__keyword {
  width: min(280px, 100%);
}

.scan-batch-detail-workbench__rail-summary {
  padding: 8px 12px 0;
  color: var(--ant-color-text-tertiary);
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
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: 8px;
  background: var(--ant-color-bg-container);
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
  min-height: 480px;
}
</style>
