<template>
  <StageWorkbenchShell class="scan-batch-detail-workbench">
    <template v-if="selectedExamId && scanBatchId" #context>
      <ContextBar layout="workbench" show-title title="扫描批次明细" :subtitle="contextSubtitle">
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
          <UiButton v-if="!scanBatchPrimaryAction" size="sm" variant="outline" @click="goBack">
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

    <ExamSelectGateStrip v-if="!selectedExamId" body="请先选择考试后再查看扫描批次明细" />
    <UiAlertStrip v-else-if="!scanBatchId" tone="info" size="sm" dense inline :show-icon="false">
      <template #default>
        <span style="display: inline-flex; align-items: center; gap: var(--dp-space-component-tight)">
          <UiTag tone="blue" size="sm">未选择批次</UiTag>
          <span>缺少扫描批次上下文，请从扫描监控或批次列表进入</span>
        </span>
      </template>
    </UiAlertStrip>
    <div v-else-if="workbenchLoadFailed && !workbench" class="scan-batch-detail-workbench__load-fail">
      <UiAlertStrip
        tone="error"
        :closable="false"
        dense
        title="批次工作台加载失败"
        :description="`批次 ID：${scanBatchId}`"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" @click="goBatchList">返回批次列表</UiButton>
        </template>
      </UiAlertStrip>
    </div>
    <UiSpin v-else-if="workbench || workbenchLoading" :spinning="workbenchLoading && !workbench">
      <UiAlertStrip
        v-if="workbenchLoadFailed && workbench"
        tone="warning"
        :closable="false"
        dense
        title="批次状态刷新失败"
        class="scan-batch-detail-workbench__signal-alert"
      />
      <UiAlertStrip
        v-if="pagesLoadFailed"
        tone="warning"
        :closable="false"
        dense
        title="页轨加载失败"
        class="scan-batch-detail-workbench__signal-alert"
      />
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
        <template v-if="canManageOwnerBatchActions === true" #actions>
          <UiButton
            size="sm"
            variant="primary"
            :loading="collateAttentionDismissing === true"
            @click="onDismissCollateAttention"
          >
            忽略并继续
          </UiButton>
          <UiButton size="sm" variant="outline" @click="openOrderAudit"> 人工合并 </UiButton>
        </template>
      </UiAlertStrip>

      <div class="scan-batch-detail-workbench__screen">
        <header class="scan-batch-detail-workbench__screen-head">
          <div class="scan-batch-detail-workbench__attribution-summary">
            识别卷 {{ attributionSummary.paperCount }} 份 · 未归卷页
            {{ attributionSummary.unassignedPageCount }} 张 · 待人工复核
            {{ attributionSummary.manualReviewCount }} 份
          </div>
          <div class="scan-batch-detail-workbench__screen-actions">
            <UiButton
              v-if="hasAttributionItems"
              size="sm"
              variant="outline"
              @click="browseAllPages = !browseAllPages"
            >
              {{ browseAllPages ? '归卷列表' : '全部页轨' }}
            </UiButton>
            <template v-if="isNarrowViewport">
              <UiButton size="sm" variant="outline" @click="leftDrawerOpen = true">列表</UiButton>
              <UiButton size="sm" variant="outline" @click="rightDrawerOpen = true">检视</UiButton>
            </template>
          </div>
        </header>

        <div
          class="scan-batch-detail-workbench__immersion"
          :class="{ 'scan-batch-detail-workbench__immersion--narrow': isNarrowViewport }"
        >
          <aside v-if="!isNarrowViewport" class="scan-batch-detail-workbench__queue">
            <div
              v-if="browseAllPages || !hasAttributionItems"
              class="scan-batch-detail-workbench__browse"
            >
              <UiSectionTabs
                v-model="pageStatusFilter"
                :items="pageStatusTabItems"
                compact
                @update:model-value="handlePageStatusFilterChange"
              />
              <UiSearchBox
                v-model="pageKeyword"
                allow-clear
                placeholder="学号 / 姓名 / 班级"
                class="scan-batch-detail-workbench__keyword"
                @search="handlePageKeywordSearch"
              />
              <ScanBatchPageRail
                layout="rail"
                :rail-viewport-height="420"
                :page-items="pageItems"
                :selected-page-key="selectedPageKey"
                :loading="pagesLoading"
                :loading-more="pagesLoadingMore"
                :empty-description="pageRailEmptyDescription"
                @select="handleSelectPage"
                @reach-end="loadMorePages"
              />
            </div>
            <div v-else class="scan-batch-detail-workbench__queue-list" role="listbox" aria-label="归卷列表">
              <article
                v-for="item in workbench?.attributionItems ?? []"
                :key="item.bucketKey"
                class="scan-batch-detail-workbench__queue-item"
                :class="{
                  'scan-batch-detail-workbench__queue-item--active':
                    item.bucketKey === selectedBucketKey,
                }"
              >
                <button
                  type="button"
                  class="scan-batch-detail-workbench__queue-main"
                  role="option"
                  :aria-selected="item.bucketKey === selectedBucketKey"
                  :aria-current="item.bucketKey === selectedBucketKey ? 'true' : undefined"
                  :aria-label="`${attributionPrimaryLabel(item)}，${attributionSecondaryLabel(item)}`"
                  @click="selectAttributionItem(item)"
                >
                  <UiTag
                    :tone="
                      strictEnumTone(
                        SCAN_BATCH_ATTRIBUTION_REVIEW_STATUS_TONE,
                        item.reviewStatus,
                        '扫描批次归卷复核状态',
                      )
                    "
                    size="sm"
                  >
                    {{
                      strictEnumLabel(
                        ScanBatchAttributionReviewStatusDescription,
                        item.reviewStatus,
                        '扫描批次归卷复核状态',
                      )
                    }}
                  </UiTag>
                  <span class="scan-batch-detail-workbench__queue-title">
                    {{ attributionPrimaryLabel(item) }}
                  </span>
                  <span class="scan-batch-detail-workbench__queue-meta">
                    {{ attributionSecondaryLabel(item) }}
                  </span>
                  <span v-if="item.diagnostic" class="scan-batch-detail-workbench__queue-diag">
                    {{ item.diagnostic }}
                  </span>
                </button>
                <UiButton
                  v-if="!item.unassignedBucket && item.paperInstanceId"
                  size="sm"
                  variant="outline"
                  class="scan-batch-detail-workbench__queue-action"
                  @click="setPreferredReassignTarget(item.paperInstanceId!)"
                >
                  设为调卷目标
                </UiButton>
              </article>
            </div>
          </aside>

          <section class="scan-batch-detail-workbench__stage">
            <div
              v-if="pageEvidenceAnchor"
              class="scan-batch-detail-workbench__evidence-anchor"
            >
              {{ pageEvidenceAnchor }}
            </div>
            <div
              v-if="selectedBucketPages.length"
              class="scan-batch-detail-workbench__bucket-pages"
              role="tablist"
              aria-label="当前归卷页"
            >
              <button
                v-for="page in selectedBucketPages"
                :key="page.pageKey"
                type="button"
                role="tab"
                :aria-selected="page.pageKey === selectedPageKey"
                class="scan-batch-detail-workbench__bucket-chip"
                :class="{
                  'scan-batch-detail-workbench__bucket-chip--active':
                    page.pageKey === selectedPageKey,
                  'scan-batch-detail-workbench__bucket-chip--exception': page.hasException,
                }"
                @click="selectBucketPage(page.pageKey)"
              >
                #{{ page.fileOrder }}
                <template v-if="page.pageSeq != null"> · 第{{ page.pageSeq }}页</template>
                <template v-else-if="page.templatePageNo != null">
                  · T{{ page.templatePageNo }}
                </template>
              </button>
            </div>
            <UiSectionTabs
              v-if="showPreviewTabs"
              v-model="previewTab"
              :items="previewTabItems"
              compact
              class="scan-batch-detail-workbench__preview-tabs"
            />
            <UiSkeletonState
              v-if="
                previewLoading || (Boolean(selectedPageKey) && inspectorLoading && !previewImageUrl)
              "
              variant="card"
              compact
            />
            <ScanImageStage
              v-else-if="previewImageUrl"
              :src="previewImageUrl"
              :caption="previewCaption"
              :confidential="isExamConfidential"
              :exam-label="examConfidentialLabel"
              :watermark-lines="watermarkLines"
              :min-height="360"
              empty-text="预览加载失败"
              class="scan-batch-detail-workbench__image"
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
              :can-manage-owner-writes="canManageOwnerPageWrites"
              @bound="handleInspectorBound"
              @reassigned="handleInspectorReassigned"
            />
          </aside>
        </div>
      </div>
    </UiSpin>

    <UiDrawer v-model:open="leftDrawerOpen" title="归卷列表" width="360" hide-footer>
      <div
        v-if="browseAllPages || !hasAttributionItems"
        class="scan-batch-detail-workbench__browse"
      >
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
      </div>
      <div v-else class="scan-batch-detail-workbench__queue-list" role="listbox" aria-label="归卷列表">
        <article
          v-for="item in workbench?.attributionItems ?? []"
          :key="item.bucketKey"
          class="scan-batch-detail-workbench__queue-item"
          :class="{
            'scan-batch-detail-workbench__queue-item--active': item.bucketKey === selectedBucketKey,
          }"
        >
          <button
            type="button"
            class="scan-batch-detail-workbench__queue-main"
            role="option"
            :aria-selected="item.bucketKey === selectedBucketKey"
            :aria-current="item.bucketKey === selectedBucketKey ? 'true' : undefined"
            :aria-label="`${attributionPrimaryLabel(item)}，${attributionSecondaryLabel(item)}`"
            @click="onDrawerSelectAttribution(item)"
          >
            <UiTag
              :tone="
                strictEnumTone(
                  SCAN_BATCH_ATTRIBUTION_REVIEW_STATUS_TONE,
                  item.reviewStatus,
                  '扫描批次归卷复核状态',
                )
              "
              size="sm"
            >
              {{
                strictEnumLabel(
                  ScanBatchAttributionReviewStatusDescription,
                  item.reviewStatus,
                  '扫描批次归卷复核状态',
                )
              }}
            </UiTag>
            <span class="scan-batch-detail-workbench__queue-title">
              {{ attributionPrimaryLabel(item) }}
            </span>
            <span class="scan-batch-detail-workbench__queue-meta">
              {{ attributionSecondaryLabel(item) }}
            </span>
          </button>
        </article>
      </div>
    </UiDrawer>

    <UiDrawer v-model:open="rightDrawerOpen" title="页检视面板" width="420" hide-footer>
      <ScanBatchPageInspectorPanel
        :inspector="pageInspector"
        :loading="inspectorLoading"
        :exam-id="selectedExamId"
        :scan-batch-id="scanBatchId"
        :attribution-items="workbench?.attributionItems ?? []"
        :preferred-target-paper-instance-id="preferredTargetPaperInstanceId"
        :can-manage-owner-writes="canManageOwnerPageWrites"
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
// MVR-951：函数式 can*(...) 写入口仅认 === true
// MVR-946：模板 canManage* 显隐/禁用仅认 === true
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
import { computed, onUnmounted, ref, watch } from 'vue'
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
import mittBus from '@/utils/mitt'
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
const { selectedExamId, refreshSnapshot } = useWorkspaceExamId()
const { width: viewportWidth } = useWindowSize()
const { isExamConfidential, examConfidentialLabel, watermarkLines }
  = useWorkspaceConfidentialContext()

const pageStatusFilter = ref<ScanBatchWorkbenchPageStatusFilterCode>(
  ScanBatchWorkbenchPageStatusFilterCode.ALL,
)
const pageKeyword = ref('')
const pageRailCounts = ref<{
  total: number | null
  pending: number | null
  registered: number | null
  exception: number | null
}>({
  total: null,
  pending: null,
  registered: null,
  exception: null,
})

const pageStatusTabItems = computed(() => [
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.ALL,
    label: strictEnumLabel(
      ScanBatchWorkbenchPageStatusFilterDescription,
      ScanBatchWorkbenchPageStatusFilterCode.ALL,
      '页轨状态筛选',
    ),
    count: pageRailCounts.value.total == null ? '—' : pageRailCounts.value.total,
  },
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.PENDING,
    label: strictEnumLabel(
      ScanBatchWorkbenchPageStatusFilterDescription,
      ScanBatchWorkbenchPageStatusFilterCode.PENDING,
      '页轨状态筛选',
    ),
    count: pageRailCounts.value.pending == null ? '—' : pageRailCounts.value.pending,
  },
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.REGISTERED,
    label: strictEnumLabel(
      ScanBatchWorkbenchPageStatusFilterDescription,
      ScanBatchWorkbenchPageStatusFilterCode.REGISTERED,
      '页轨状态筛选',
    ),
    count: pageRailCounts.value.registered == null ? '—' : pageRailCounts.value.registered,
  },
  {
    key: ScanBatchWorkbenchPageStatusFilterCode.EXCEPTION,
    label: strictEnumLabel(
      ScanBatchWorkbenchPageStatusFilterDescription,
      ScanBatchWorkbenchPageStatusFilterCode.EXCEPTION,
      '页轨状态筛选',
    ),
    count: pageRailCounts.value.exception == null ? '—' : pageRailCounts.value.exception,
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
const workbenchLoadFailed = ref(false)
const pagesLoadFailed = ref(false)
const pageItems = ref<ExamScannerBatchWorkbenchPageVO[]>([])
const pagesLoading = ref(false)
const pagesLoadingMore = ref(false)
const pagesNextCursor = ref<string | null | undefined>(undefined)
const pagesLoadMoreInFlight = ref(false)
const selectedPageKey = ref('')
const selectedBucketKey = ref('')
const browseAllPages = ref(false)
const pageInspector = ref<ExamScannerBatchPageInspectorVO | null>(null)
const preferredTargetPaperInstanceId = ref<string | undefined>(undefined)
const inspectorLoading = ref(false)
const previewTab = ref<'page' | 'identity'>('page')
const previewImageUrl = ref('')
const previewLoading = ref(false)
const previewLoadFailed = ref(false)
const previewingOriginal = ref(false)
let previewRequestSeq = 0
let workbenchLoadGeneration = 0
let pageSelectionGeneration = 0
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
  const parts: string[] = [batch.batchNo]
  const deviceName = batch.scannerDeviceName?.trim()
  if (deviceName) {
    parts.push(deviceName)
  }
  parts.push(
    `${formatDateTimeWithSeconds(batch.scanStartTime)} 至 ${formatDateTimeWithSeconds(batch.scanEndTime)}`,
  )
  return parts.join(' · ')
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
  if (canViewOriginalImage.value === true) {
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
const canViewOriginalImage = computed(
  () => workbench.value?.canViewOriginalImage === true && Boolean(selectedPage.value?.pageId),
)

/** MVR-262/355：主考写动作能力位（与 BE canManageOwnerBatchActions = 主考∧ACTIVE 对齐） */
const canManageOwnerBatchActions = computed(
  () => workbench.value?.canManageOwnerBatchActions === true,
)

/** 页轨子请求失败时禁止页级写，保留批次顶栏写能力 */
const canManageOwnerPageWrites = computed(
  () => canManageOwnerBatchActions.value && !pagesLoadFailed.value,
)

const pageEvidenceAnchor = computed(() => {
  const page = selectedPage.value
  if (!page) {
    return ''
  }
  const parts: string[] = [`#${page.fileOrder}`]
  if (page.pageId) {
    parts.push(`pageId ${page.pageId}`)
  }
  if (page.paperInstanceId) {
    parts.push(`卷 ${page.paperInstanceId}`)
  }
  return parts.join(' · ')
})

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

const hasAttributionItems = computed(() => (workbench.value?.attributionItems?.length ?? 0) > 0)

const selectedAttributionItem = computed(() => {
  const items = workbench.value?.attributionItems ?? []
  if (!selectedBucketKey.value) {
    return null
  }
  return items.find((item) => item.bucketKey === selectedBucketKey.value) ?? null
})

const selectedBucketPages = computed(() => selectedAttributionItem.value?.pages ?? [])

function attributionPrimaryLabel(item: ExamScannerBatchAttributionItemVO): string {
  if (item.unassignedBucket) {
    return '未归卷页'
  }
  return item.studentName || item.recognizedStudentName || '待确认学生'
}

function attributionSecondaryLabel(item: ExamScannerBatchAttributionItemVO): string {
  const pagesText = item.pages
    .map((page) => `T${page.templatePageNo ?? '—'}·#${page.fileOrder}`)
    .join(' / ')
  const identity = [
    item.studentNo || item.recognizedStudentNo || '无学号',
    item.className || item.recognizedClassName || '未识别班级',
  ].join(' · ')
  return pagesText ? `${identity} · ${pagesText}` : identity
}

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

const selectedPage = computed(() => {
  const pageKey = selectedPageKey.value
  if (!pageKey) {
    return null
  }
  const inspectorPage = pageInspector.value?.page
  if (inspectorPage?.pageKey === pageKey) {
    return inspectorPage
  }
  return pageItems.value.find((item) => item.pageKey === pageKey) ?? null
})

const showPreviewTabs = computed(() =>
  canViewOriginalImage.value === true
  && Boolean(selectedPage.value?.identitySliceFileId)
  && selectedPage.value?.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING,
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
    return hasAttributionItems.value
      ? '请在上方归卷列表点选一卷，下方将展示对应影像'
      : '请选择页轨条目预览'
  }
  if (page.registerStatus === ScanBatchWorkbenchRegisterStatusCode.PENDING) {
    return '原件仅在后台登记和身份识别链路使用，工作台不显示未脱敏影像。请重试页登记。'
  }
  if (page.diagnostic?.trim()) {
    return page.diagnostic.trim()
  }
  if (!page.previewUrl) {
    if (canViewOriginalImage.value === true) {
      return '匿名展示影像尚未生成，正在尝试加载原始影像…'
    }
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
    beginPageSelection('')
    return
  }
  if (!pageItems.value.some((item) => item.pageKey === pageKey)) {
    const initialItem = workbench.value?.initialPageItems?.find((item) => item.pageKey === pageKey)
    if (initialItem) {
      pageItems.value = [initialItem, ...pageItems.value]
    } else {
      beginPageSelection(pageKey)
      ensureSelectedPageInRail(pageKey)
      return
    }
  }
  beginPageSelection(pageKey)
}

function clearPageSelectionState(): void {
  selectedPageKey.value = ''
  selectedBucketKey.value = ''
  pageInspector.value = null
  preferredTargetPaperInstanceId.value = undefined
  previewTab.value = 'page'
  releasePreviewUrl()
  previewLoadFailed.value = false
  previewingOriginal.value = false
  pageItems.value = []
  pagesNextCursor.value = undefined
  pageRailCounts.value = {
    total: null,
    pending: null,
    registered: null,
    exception: null,
  }
  pagesLoadFailed.value = false
}

/**
 * 写 API 成功后的统一刷新：工作台 → 扫描列表/账本失效通知 → 阶段快照。
 * 任一分段失败只提示状态刷新失败，不重复提交写操作。
 */
async function afterSuccessfulWriteRefresh(options?: { pageKey?: string }): Promise<void> {
  const generation = workbenchLoadGeneration
  const refreshed = await loadWorkbench(generation)
  if (!refreshed) {
    void message.warning('操作已成功，状态刷新失败；请切换范围或重新进入本页后核对最新状态')
    return
  }
  if (options?.pageKey) {
    await syncSelectedPageAfterRefresh(options.pageKey)
  }
  mittBus.emit('scan-workbench:refresh')
  try {
    await refreshSnapshot()
  } catch (error) {
    void message.warning('操作已成功，状态刷新失败；请切换范围或重新进入本页后核对最新状态')
    showUserError(error, '阶段快照刷新失败')
  }
}

async function loadWorkbench(expectedGeneration = workbenchLoadGeneration): Promise<boolean> {
  if (!selectedExamId.value || !scanBatchId.value) {
    workbench.value = null
    workbenchLoadFailed.value = false
    return false
  }
  workbenchLoading.value = true
  const examId = selectedExamId.value
  const batchId = scanBatchId.value
  const hadWorkbench = workbench.value != null
  const preservedPageKey = selectedPageKey.value
  const preservedBucketKey = selectedBucketKey.value
  const preservedFileOrder = parsePendingFileOrder(preservedPageKey)
  try {
    const next = await getScannerBatchWorkbench({
      examId,
      scanBatchId: batchId,
    })
    if (
      expectedGeneration !== workbenchLoadGeneration
      || selectedExamId.value !== examId
      || scanBatchId.value !== batchId
    ) {
      return false
    }
    workbench.value = next
    workbenchLoadFailed.value = false
    pageItems.value = next.initialPageItems ?? []
    pagesNextCursor.value = undefined
    await refreshPagesWindow(expectedGeneration)

    if (
      expectedGeneration !== workbenchLoadGeneration
      || selectedExamId.value !== examId
      || scanBatchId.value !== batchId
    ) {
      return false
    }

    const attributionItems = workbench.value.attributionItems ?? []
    let pageKey = resolvePageKeyAfterRefresh(preservedPageKey, pageItems.value)
    if (!pageItems.value.some((item) => item.pageKey === pageKey) && preservedFileOrder !== null) {
      const byFileOrder = pageItems.value.find((item) => item.fileOrder === preservedFileOrder)
      if (byFileOrder) {
        pageKey = byFileOrder.pageKey
      }
    }
    if (!pageKey && attributionItems.length) {
      const preferredBucket
        = attributionItems.find((item) => item.bucketKey === preservedBucketKey)
          ?? attributionItems.find((item) => item.manualReviewRequired)
          ?? attributionItems[0]
      pageKey = preferredBucket?.pages[0]?.pageKey || ''
      if (preferredBucket) {
        selectedBucketKey.value = preferredBucket.bucketKey
      }
    }
    if (!pageKey) {
      pageKey = workbench.value.initialPageKey || pageItems.value[0]?.pageKey || ''
    }
    await syncSelectedPageAfterRefresh(pageKey)
    syncBucketKeyForPage(pageKey)
    return true
  } catch (error) {
    if (
      expectedGeneration !== workbenchLoadGeneration
      || selectedExamId.value !== examId
      || scanBatchId.value !== batchId
    ) {
      return false
    }
    if (!hadWorkbench) {
      workbench.value = null
    }
    workbenchLoadFailed.value = true
    showUserError(error, '批次工作台加载失败')
    return false
  } finally {
    if (
      expectedGeneration === workbenchLoadGeneration
      && selectedExamId.value === examId
      && scanBatchId.value === batchId
    ) {
      workbenchLoading.value = false
    }
  }
}

function syncPageRailCounts(response: {
  totalCount?: number
  pendingCount?: number
  registeredCount?: number
  exceptionCount?: number
}): void {
  const pending = response.pendingCount
  const registered = response.registeredCount
  const exception = response.exceptionCount
  const total = response.totalCount
  if (pending === undefined || registered === undefined || exception === undefined) {
    pageRailCounts.value = {
      total: total ?? null,
      pending: pending ?? null,
      registered: registered ?? null,
      exception: exception ?? null,
    }
    return
  }
  pageRailCounts.value = {
    total: total ?? pending + registered,
    pending,
    registered,
    exception,
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
  beginPageSelection('')
  await refreshPagesWindow()
}

async function handlePageKeywordSearch(): Promise<void> {
  pagesNextCursor.value = undefined
  beginPageSelection('')
  await refreshPagesWindow()
}

async function refreshPagesWindow(
  expectedWorkbenchGeneration = workbenchLoadGeneration,
): Promise<void> {
  if (!selectedExamId.value || !scanBatchId.value) {
    return
  }
  const examId = selectedExamId.value
  const batchId = scanBatchId.value
  pagesLoading.value = true
  try {
    const response = await pageScannerBatchWorkbenchPages(buildPageQuery())
    if (
      expectedWorkbenchGeneration !== workbenchLoadGeneration
      || selectedExamId.value !== examId
      || scanBatchId.value !== batchId
    ) {
      return
    }
    pageItems.value = response.items
    pagesNextCursor.value = response.nextCursor ?? null
    syncPageRailCounts(response)
    pagesLoadFailed.value = false
    if (!selectedPageKey.value && pageItems.value[0]) {
      beginPageSelection(pageItems.value[0].pageKey)
    }
  } catch (error) {
    if (
      expectedWorkbenchGeneration !== workbenchLoadGeneration
      || selectedExamId.value !== examId
      || scanBatchId.value !== batchId
    ) {
      return
    }
    pagesLoadFailed.value = true
    showUserError(error, '页轨加载失败')
  } finally {
    if (
      expectedWorkbenchGeneration === workbenchLoadGeneration
      && selectedExamId.value === examId
      && scanBatchId.value === batchId
    ) {
      pagesLoading.value = false
    }
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
  const examId = selectedExamId.value
  const batchId = scanBatchId.value
  const expectedWorkbenchGeneration = workbenchLoadGeneration
  pagesLoadMoreInFlight.value = true
  pagesLoadingMore.value = true
  try {
    const response = await pageScannerBatchWorkbenchPages(buildPageQuery(pagesNextCursor.value))
    if (
      expectedWorkbenchGeneration !== workbenchLoadGeneration
      || selectedExamId.value !== examId
      || scanBatchId.value !== batchId
    ) {
      return
    }
    pageItems.value = [...pageItems.value, ...response.items]
    pagesNextCursor.value = response.nextCursor ?? null
    syncPageRailCounts(response)
  } catch (error) {
    if (
      expectedWorkbenchGeneration !== workbenchLoadGeneration
      || selectedExamId.value !== examId
      || scanBatchId.value !== batchId
    ) {
      return
    }
    pagesLoadFailed.value = true
    showUserError(error, '页轨翻页加载失败')
  } finally {
    if (
      expectedWorkbenchGeneration === workbenchLoadGeneration
      && selectedExamId.value === examId
      && scanBatchId.value === batchId
    ) {
      pagesLoadingMore.value = false
      pagesLoadMoreInFlight.value = false
    }
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
  await afterSuccessfulWriteRefresh({ pageKey: pageKey || undefined })
}

function beginPageSelection(pageKey: string): void {
  const generation = ++pageSelectionGeneration
  selectedPageKey.value = pageKey
  preferredTargetPaperInstanceId.value = undefined
  if (!pageKey) {
    pageInspector.value = null
    releasePreviewUrl()
    previewLoadFailed.value = false
    previewingOriginal.value = false
    return
  }
  void loadInspector(pageKey, generation)
}

async function loadInspector(
  pageKey: string,
  expectedGeneration = pageSelectionGeneration,
): Promise<void> {
  if (!selectedExamId.value || !scanBatchId.value || !pageKey) {
    if (expectedGeneration === pageSelectionGeneration) {
      pageInspector.value = null
    }
    return
  }
  const examId = selectedExamId.value
  const batchId = scanBatchId.value
  inspectorLoading.value = true
  try {
    const inspector = await getScannerBatchPageInspector({
      examId,
      scanBatchId: batchId,
      pageKey,
    })
    if (
      expectedGeneration !== pageSelectionGeneration
      || selectedPageKey.value !== pageKey
      || selectedExamId.value !== examId
      || scanBatchId.value !== batchId
    ) {
      return
    }
    if (inspector.page?.pageKey && inspector.page.pageKey !== pageKey) {
      return
    }
    pageInspector.value = inspector
  } catch (error) {
    if (
      expectedGeneration !== pageSelectionGeneration
      || selectedPageKey.value !== pageKey
      || selectedExamId.value !== examId
      || scanBatchId.value !== batchId
    ) {
      return
    }
    pageInspector.value = null
    showUserError(error, '页检视面板加载失败')
  } finally {
    if (
      expectedGeneration === pageSelectionGeneration
      && selectedPageKey.value === pageKey
    ) {
      inspectorLoading.value = false
    }
  }
}

async function loadPreview(): Promise<void> {
  const requestSeq = ++previewRequestSeq
  const expectedPageGeneration = pageSelectionGeneration
  const expectedPageKey = selectedPageKey.value
  releasePreviewUrl()
  previewLoadFailed.value = false
  previewingOriginal.value = false
  const page = selectedPage.value
  if (!page || page.pageKey !== expectedPageKey) {
    return
  }
  if (previewTab.value === 'identity') {
    if (!page.identitySlicePreviewUrl) {
      return
    }
    previewLoading.value = true
    try {
      const blobUrl = await fetchStoragePreviewBlobUrl(page.identitySlicePreviewUrl)
      if (
        requestSeq !== previewRequestSeq
        || expectedPageGeneration !== pageSelectionGeneration
        || selectedPageKey.value !== expectedPageKey
      ) {
        URL.revokeObjectURL(blobUrl)
        return
      }
      previewImageUrl.value = blobUrl
    } catch (error) {
      if (
        requestSeq !== previewRequestSeq
        || expectedPageGeneration !== pageSelectionGeneration
        || selectedPageKey.value !== expectedPageKey
      ) {
        return
      }
      previewLoadFailed.value = true
      showUserError(error, '身份切片加载失败')
    } finally {
      if (
        requestSeq === previewRequestSeq
        && expectedPageGeneration === pageSelectionGeneration
      ) {
        previewLoading.value = false
      }
    }
    return
  }
  if (!page.previewUrl) {
    if (
      page.registerStatus !== ScanBatchWorkbenchRegisterStatusCode.PENDING
      && canViewOriginalImage.value === true
      && page.pageId
    ) {
      await loadOriginalPreview(requestSeq, expectedPageGeneration, expectedPageKey)
    }
    return
  }
  previewLoading.value = true
  try {
    const blobUrl = await fetchStoragePreviewBlobUrl(page.previewUrl)
    if (
      requestSeq !== previewRequestSeq
      || expectedPageGeneration !== pageSelectionGeneration
      || selectedPageKey.value !== expectedPageKey
    ) {
      URL.revokeObjectURL(blobUrl)
      return
    }
    previewImageUrl.value = blobUrl
  } catch (error) {
    if (
      requestSeq !== previewRequestSeq
      || expectedPageGeneration !== pageSelectionGeneration
      || selectedPageKey.value !== expectedPageKey
    ) {
      return
    }
    previewLoadFailed.value = true
    showUserError(error, '影像预览加载失败')
  } finally {
    if (
      requestSeq === previewRequestSeq
      && expectedPageGeneration === pageSelectionGeneration
    ) {
      previewLoading.value = false
    }
  }
}

async function loadOriginalPreview(
  requestSeq = ++previewRequestSeq,
  expectedPageGeneration = pageSelectionGeneration,
  expectedPageKey = selectedPageKey.value,
): Promise<void> {
  const page = selectedPage.value
  if (!page?.pageId || !selectedExamId.value || canViewOriginalImage.value !== true) {
    return
  }
  if (page.pageKey !== expectedPageKey) {
    return
  }
  if (requestSeq === previewRequestSeq) {
    releasePreviewUrl()
    previewLoadFailed.value = false
  }
  previewLoading.value = true
  try {
    const previewPath = `/api/mark/exams/scanner-batches/pages/original-image?examId=${selectedExamId.value}&pageId=${page.pageId}`
    const blobUrl = await fetchStoragePreviewBlobUrl(previewPath)
    if (
      requestSeq !== previewRequestSeq
      || expectedPageGeneration !== pageSelectionGeneration
      || selectedPageKey.value !== expectedPageKey
    ) {
      URL.revokeObjectURL(blobUrl)
      return
    }
    previewImageUrl.value = blobUrl
    previewingOriginal.value = true
  } catch (error) {
    if (
      requestSeq !== previewRequestSeq
      || expectedPageGeneration !== pageSelectionGeneration
      || selectedPageKey.value !== expectedPageKey
    ) {
      return
    }
    previewLoadFailed.value = true
    showUserError(error, '原始影像加载失败')
  } finally {
    if (
      requestSeq === previewRequestSeq
      && expectedPageGeneration === pageSelectionGeneration
    ) {
      previewLoading.value = false
    }
  }
}

function syncBucketKeyForPage(pageKey: string): void {
  if (!pageKey) {
    return
  }
  const items = workbench.value?.attributionItems ?? []
  const matched = items.find((item) => item.pages.some((page) => page.pageKey === pageKey))
  if (matched) {
    selectedBucketKey.value = matched.bucketKey
  }
}

function selectAttributionItem(item: ExamScannerBatchAttributionItemVO): void {
  selectedBucketKey.value = item.bucketKey
  const pageKey = item.pages[0]?.pageKey
  if (!pageKey) {
    return
  }
  previewTab.value = 'page'
  beginPageSelection(pageKey)
}

function onDrawerSelectAttribution(item: ExamScannerBatchAttributionItemVO): void {
  selectAttributionItem(item)
  leftDrawerOpen.value = false
}

function selectBucketPage(pageKey: string): void {
  if (!pageKey) {
    return
  }
  previewTab.value = 'page'
  beginPageSelection(pageKey)
}

function handleSelectPage(pageKey: string): void {
  syncBucketKeyForPage(pageKey)
  previewTab.value = 'page'
  beginPageSelection(pageKey)
}

function setPreferredReassignTarget(paperInstanceId: string): void {
  preferredTargetPaperInstanceId.value = paperInstanceId
  void message.success('已设置调卷目标，请在右侧页检视面板选择待移动页后执行人工调卷')
}

async function openOrderAudit(): Promise<void> {
  // MVR-393：「人工合并」属主考写路径入口，打开前叠 canManageOwnerBatchActions===true
  if (canManageOwnerBatchActions.value !== true) {
    void message.warning('仅本场主考可打开人工合并')
    return
  }
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
  if (canManageOwnerBatchActions.value !== true) {
    void message.warning('仅主考可忽略余页异常')
    return
  }
  await confirmAsync({
    title: '忽略并继续',
    content: '余页将保留在扫描页中，不创建试卷实例。确认后可继续封存批次。',
    type: 'warning',
    onOk: async () => {
      // MVR-953：确认后再次认主考写权，防对话框期间权限/批次态漂移
      if (canManageOwnerBatchActions.value !== true) {
        void message.warning('仅主考可忽略余页异常')
        return false
      }
      if (collateAttentionDismissing.value === true) {
        return false
      }
      collateAttentionDismissing.value = true
      try {
        await dismissScanBatchCollateAttention({
          examId: selectedExamId.value,
          scanBatchId: batch.scanBatchId,
        })
        void message.success('已忽略余页异常，可继续封存')
        await afterSuccessfulWriteRefresh()
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
  if (canManageOwnerBatchActions.value !== true) {
    void message.warning('仅本场主考可执行批次写操作')
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.RETRY_PAGE_REGISTER) {
    actionLoading.value = action
    try {
      const response = await retryScanBatchPageRegister({
        examId: selectedExamId.value,
        scanBatchId: batch.scanBatchId,
      })
      if (response.pageRegisterBlocked === true) {
        void message.warning(response.pageRegisterDiagnostic ?? '页登记仍被阻断')
      } else if (response.pageRegisterPending === true) {
        void message.warning(response.pageRegisterDiagnostic ?? '页登记待重试')
      } else {
        void message.success(formatPageRegisterRetryMessage(response))
      }
      await afterSuccessfulWriteRefresh()
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
      void message.success(`已补跑 ${count} 页脱敏处理影像`)
      await afterSuccessfulWriteRefresh({ pageKey: selectedPageKey.value || undefined })
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
        // MVR-933：确认后再次认主考写权，防对话框期间权限/批次态漂移
        if (canManageOwnerBatchActions.value !== true) {
          void message.warning('仅本场主考可执行批次写操作')
          return false
        }
        if (actionLoading.value) {
          return false
        }
        actionLoading.value = action
        try {
          const response = await rebuildCompositeScanPages({
            examId: selectedExamId.value,
            scanBatchId: batch.scanBatchId,
          })
          if (response.pageRegisterBlocked === true) {
            void message.warning(response.pageRegisterDiagnostic ?? '页登记仍被阻断')
          } else if (response.pageRegisterPending === true) {
            void message.warning(response.pageRegisterDiagnostic ?? '页登记待重试')
          } else {
            void message.success(formatPageRegisterRetryMessage(response))
          }
          await afterSuccessfulWriteRefresh()
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
  if (action === ScanBatchWorkbenchTopActionCode.SEAL) {
    if (attributionSealBlockReason.value) {
      void message.warning(attributionSealBlockReason.value)
      return
    }
    if (canSealBatch(batch) !== true) {
      void message.warning(batchSealBlockedReason(batch) || '当前批次不满足封存条件')
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
        // MVR-933：确认后再次认主考写权 + canSealBatch，防对话框期间状态漂移
        if (canManageOwnerBatchActions.value !== true) {
          void message.warning('仅本场主考可执行批次写操作')
          return false
        }
        if (attributionSealBlockReason.value) {
          void message.warning(attributionSealBlockReason.value)
          return false
        }
        if (canSealBatch(batch) !== true) {
          void message.warning(batchSealBlockedReason(batch) || '当前批次不满足封存条件')
          return false
        }
        if (actionLoading.value) {
          return false
        }
        actionLoading.value = action
        try {
          await sealScanBatchByTeacher({ scanBatchId: batch.scanBatchId })
          void message.success(`扫描批次已封存：${batch.batchNo}`)
          await afterSuccessfulWriteRefresh()
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
    if (canManageOwnerBatchActions.value !== true) {
      void message.warning('当前账号不可废弃扫描批次')
      return
    }
    discardModalOpen.value = true
    return
  }
  if (action === ScanBatchWorkbenchTopActionCode.SUPPLEMENT) {
    // MVR-322：补扫弹窗同主考写能力位
    if (canManageOwnerBatchActions.value !== true) {
      void message.warning('当前账号不可提交补扫')
      return
    }
    supplementModalOpen.value = true
  }
}

async function handleSupplementSuccess(): Promise<void> {
  supplementModalOpen.value = false
  await afterSuccessfulWriteRefresh()
}

async function confirmDiscardBatch(reason: string): Promise<void> {
  // MVR-322/376：与 canManageOwnerBatchActions / BE 主考写门禁二次拦截
  if (canManageOwnerBatchActions.value !== true) {
    void message.warning('当前账号不可废弃扫描批次')
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
    void message.success(`扫描批次已废弃：${batch.batchNo}`)
    discardModalOpen.value = false
    await afterSuccessfulWriteRefresh()
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

function goBatchList(): void {
  void router.push({
    name: 'TeacherExamWorkspaceScanBatches',
    params: { examId: selectedExamId.value },
  })
}

watch(
  () => [selectedExamId.value, scanBatchId.value] as const,
  ([examId, batchId]) => {
    const generation = ++workbenchLoadGeneration
    pageSelectionGeneration += 1
    workbench.value = null
    workbenchLoadFailed.value = false
    workbenchLoading.value = Boolean(examId && batchId)
    clearPageSelectionState()
    if (examId && batchId) {
      void loadWorkbench(generation)
    }
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
  margin-bottom: var(--dp-space-component-tight);
}

.scan-batch-detail-workbench__load-fail {
  padding: var(--dp-space-block) 0;
}

.scan-batch-detail-workbench__evidence-anchor {
  flex-shrink: 0;
  margin-bottom: var(--dp-space-component-xs);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
  line-height: 1.4;
}

.scan-batch-detail-workbench__collate-alert {
  margin-bottom: var(--dp-space-component-tight);
}

.scan-batch-detail-workbench__collate-alert :deep(.ui-alert-strip) {
  background: var(--dp-warning-bg);
  border-color: var(--dp-warning-border);
}

.scan-batch-detail-workbench__screen {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  height: calc(100vh - 168px);
  min-height: 560px;
}

.scan-batch-detail-workbench__screen-head {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
  justify-content: space-between;
}

.scan-batch-detail-workbench__screen-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
}

.scan-batch-detail-workbench__attribution-summary {
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}

.scan-batch-detail-workbench__immersion {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr) minmax(300px, 380px);
  gap: var(--dp-space-component);
  flex: 1;
  min-height: 0;

  &--narrow {
    grid-template-columns: minmax(0, 1fr);
  }
}

.scan-batch-detail-workbench__queue,
.scan-batch-detail-workbench__inspector,
.scan-batch-detail-workbench__stage {
  min-height: 0;
  border: 1px solid var(--dp-border-subtle);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
}

.scan-batch-detail-workbench__queue {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scan-batch-detail-workbench__queue-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  overflow-y: auto;
  padding: var(--dp-space-component-tight);
}

.scan-batch-detail-workbench__queue-item {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  padding: var(--dp-space-component-tight);
  border: 1px solid var(--dp-border-subtle);
  border-radius: 6px;
  background: var(--dp-surface);

  &--active {
    border-color: var(--dp-color-primary);
    background: var(--dp-blue-50);
  }
}

.scan-batch-detail-workbench__queue-main {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-xs);
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.scan-batch-detail-workbench__queue-title {
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}

.scan-batch-detail-workbench__queue-meta,
.scan-batch-detail-workbench__queue-diag {
  overflow: hidden;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-batch-detail-workbench__queue-diag {
  color: var(--dp-text-muted);
}

.scan-batch-detail-workbench__queue-action {
  align-self: flex-start;
}

.scan-batch-detail-workbench__browse {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  min-height: 0;
  padding: var(--dp-space-component-tight);
}

.scan-batch-detail-workbench__keyword {
  width: 100%;
}

.scan-batch-detail-workbench__stage {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  padding: var(--dp-space-component-tight);
}

.scan-batch-detail-workbench__bucket-pages {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
}

.scan-batch-detail-workbench__bucket-chip {
  min-height: 32px;
  padding: var(--dp-space-component-xs) var(--dp-space-component);
  border: 1px solid var(--dp-border-subtle);
  border-radius: 6px;
  background: var(--dp-surface);
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-sm);
  cursor: pointer;

  &--active {
    border-color: var(--dp-color-primary);
    background: var(--dp-blue-50);
  }

  &--exception {
    border-color: var(--dp-danger);
    background: color-mix(in srgb, var(--dp-danger) 6%, var(--dp-surface));
  }
}

.scan-batch-detail-workbench__preview-tabs {
  flex-shrink: 0;
}

.scan-batch-detail-workbench__image {
  flex: 1;
  min-height: 0;
}

.scan-batch-detail-workbench__preview-empty {
  flex: 1;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-batch-detail-workbench__inspector {
  padding: var(--dp-space-component);
  overflow-y: auto;
}
</style>
