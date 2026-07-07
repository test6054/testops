<template>
  <StageWorkbenchShell class="scan-monitor">
    <template v-if="selectedExamId" #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="scanMonitorContextSubtitle"
      >
        <template #status>
          <UiTag v-if="examStatusLabel" :tone="examStatusTone" size="sm">
            {{ examStatusLabel }}
          </UiTag>
          <UiTag
            :tone="connectionTone"
            size="sm"
            :class="{ 'scan-monitor__connection--pulse': connectionPulsing }"
          >
            {{ connectionLabel }}
          </UiTag>
          <UiTag :tone="abnormalAttentionTotal > 0 ? 'red' : 'green'" size="sm">
            {{ abnormalAttentionTotal > 0 ? `${abnormalAttentionTotal} 条异常` : '无阻断异常' }}
          </UiTag>
          <UiTag :tone="duplicateAttentionTotal > 0 ? 'orange' : 'green'" size="sm">
            {{ duplicateAttentionTotal > 0 ? `${duplicateAttentionTotal} 条重复` : '无重复影像' }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="abnormalAttentionTotal > 0"
            size="sm"
            variant="primary"
            @click="jumpToAbnormalTab"
          >
            查看异常
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="!selectedExamId"
            @click="goToScanLedger"
          >
            影像账本
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand
        variant="tiles"
        :metrics="scanMonitorSignalMetrics"
        compact
        class="scan-monitor__stats"
        @metric-click="handleScanMonitorMetricClick"
      />
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="未进入考试工作台"
      class="scan-monitor__empty"
    />
    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <UiAlertStrip
        v-if="scanMonitorPanelLoadFailed"
        tone="error"
        title="扫描监控指标加载失败"
        description="批次汇总与实时指标暂不可用，请刷新后重试。"
        dense
        class="scan-monitor__panel-alert"
      />

      <ScanDeviceCardGrid
        class="scan-monitor__devices"
        :devices="scannerDevices"
        :loading="scannerDevicesLoading"
        :selected-device-id="filterForm.monitorDeviceId"
        @select="handleMonitorDeviceSelect"
      />

      <WorkbenchSurfaceCard flush class="scan-monitor__surface">
        <template #head>
          <UiSectionTabs
            v-model="activeTab"
            :items="monitorTabs"
            compact
            divided
            class="scan-monitor__tabs"
          />
        </template>

        <template #toolbar>
          <span class="scan-monitor__flow-hint">{{ SCAN_MONITOR_FLOW_HINT }}</span>
          <UiFilterBar
            v-model="filterModel"
            :fields="monitorFilterFields"
            show-labels
            search-text="查询"
            @search="handleMonitorFilterSearch"
            @reset="resetFilter"
          >
            <template v-if="hasMonitorScanBatchFilter" #field-scanBatchId>
              <UiSelect
                v-model="filterForm.scanBatchId"
                placeholder="选择扫描批次"
                :options="scanBatchOptions"
                :loading="scanBatchesLoading"
                allow-search
                :filter-option="false"
                @search="handleScanBatchSearch"
                @dropdown-visible-change="handleScanBatchDropdownVisibleChange"
                @change="handleScanBatchFilterChange"
              />
            </template>
            <template v-if="activeTab !== 'normal'" #field-paperInstanceId>
              <UiSelect
                v-model="filterForm.paperInstanceId"
                placeholder="选择答题卡"
                :options="paperCandidateOptions"
                :loading="paperCandidatesLoading"
                allow-search
                :filter-option="false"
                @search="handlePaperCandidateSearch"
                @dropdown-visible-change="handlePaperCandidateDropdownVisibleChange"
                @change="handlePaperCandidateFilterChange"
              />
            </template>
          </UiFilterBar>
        </template>

        <section v-if="activeTab === 'normal'" class="scan-monitor__normal-panel">
          <UiDataTable
            v-model:current="monitorBatchPagination.current"
            v-model:page-size="monitorBatchPagination.pageSize"
            class="student-detail-table__data-table"
            :columns="monitorBatchColumns"
            :data-source="monitorBatches"
            :loading="monitorBatchLoading"
            :total="monitorBatchPagination.total"
            :scroll="{ x: 1340 }"
            row-key="scanBatchId"
            flat
            empty-kind="first-run"
            :empty-description="normalTableEmptyDescription"
            @page-change="handleMonitorBatchPageChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'batchNo'">
                <a-typography-text strong :content="record.batchNo" />
                <div v-if="record.batchExternalNo" class="scan-monitor__hint">{{ record.batchExternalNo }}</div>
              </template>
              <template v-else-if="column.key === 'status'">
                <UiTag :tone="monitorBatchStatusTone(record)" size="sm">
                  {{ monitorBatchStatusLabel(record) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'pageCount'">
                {{ record.pageCount ?? 0 }}
              </template>
              <template v-else-if="column.key === 'boundPaperCount'">
                {{ record.boundPaperCount ?? 0 }}
              </template>
              <template v-else-if="column.key === 'pageProgress'">
                {{ record.receivedPageCount ?? 0 }} / {{ record.pageCount ?? 0 }}
              </template>
              <template v-else-if="column.key === 'scannerDevice'">
                {{ formatMonitorBatchDeviceLabel(record.scannerDeviceId) }}
              </template>
              <template v-else-if="column.key === 'operatorDisplayName'">
                {{ record.operatorDisplayName ?? '—' }}
              </template>
              <template v-else-if="column.key === 'dpi'">
                {{ record.scanConfig?.dpi ? `${record.scanConfig.dpi} DPI` : '—' }}
              </template>
              <template v-else-if="column.key === 'scanStartTime'">
                {{ formatDateTimeWithSeconds(record.scanStartTime) }}
              </template>
              <template v-else-if="column.key === 'scanEndTime'">
                {{ record.scanEndTime ? formatDateTimeWithSeconds(record.scanEndTime) : '—' }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <UiTextAction @click="openMonitorBatchDetail(record)">详情</UiTextAction>
              </template>
            </template>
          </UiDataTable>
        </section>
        <section v-else class="scan-monitor__attention-panel">
          <UiDataTable
            class="student-detail-table__data-table"
            v-model:current="attentionPagination.current"
            v-model:page-size="attentionPagination.pageSize"
            :columns="columns"
            :data-source="activeAttentionRows"
            :loading="loading"
            :total="attentionPagination.total"
            row-key="id"
            :enable-selection="activeTab === 'abnormal'"
            :selected-row-keys="selectedRowKeys"
            flat
            empty-kind="first-run"
            :empty-description="attentionTableEmptyDescription"
            v-bind="activeTab === 'abnormal' ? { rowSelection } : {}"
            @page-change="handleAttentionPageChange"
          >
            <template #toolbar-right>
              <UiButton
                v-if="activeTab === 'abnormal'"
                size="sm"
                :disabled="selectedRowKeys.length === 0"
                :loading="batchBinding"
                @click="handleBatchBind"
              >
                批量绑定 ({{ selectedRowKeys.length }})
              </UiButton>
            </template>

            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'attentionType'">
                <UiTag :tone="attentionTypeTone(record.attentionType)" size="sm">
                  {{ attentionTypeLabel(record.attentionType) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'sourceInfo'">
                <div class="scan-monitor__source-cell">
                  <span>
                    <b>{{ sourceTypeLabel(record.sourceType) }}</b>
                  </span>
                  <span class="scan-monitor__hint">{{ record.sourceDisplayName }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'scanBatch'">
                <span>{{ record.scanBatchDisplayName }}</span>
              </template>
              <template v-else-if="column.key === 'paperDisplay'">
                <div class="scan-monitor__paper-cell">
                  <span>{{ record.paperDisplay.primaryText }}</span>
                  <span v-if="record.paperDisplay.secondaryText" class="scan-monitor__hint">
                    {{ record.paperDisplay.secondaryText }}
                  </span>
                </div>
              </template>
              <template v-else-if="column.key === 'status'">
                <UiTag :tone="scanAttentionStatusTone(record)" size="sm">
                  {{ scanAttentionStatusLabel(record) }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'diagnostic'">
                <a-typography-text
                  :content="scanAttentionDiagnosticText(record.diagnostic)"
                  :ellipsis="{ tooltip: true }"
                />
              </template>
              <template v-else-if="column.key === 'updateTime'">
                {{ formatDateTimeWithSeconds(record.updateTime) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="operations-cell" @click.stop>
                  <UiTextAction @click="openDetail(record)">详情</UiTextAction>
                  <UiTextAction
                    v-if="record.attentionType === 'BINDING_CONFLICT'"
                    tone="primary"
                    :disabled="!record.paperInstanceId || !record.scanBatchId"
                    @click="openBindDrawer(record)"
                  >
                    身份绑定
                  </UiTextAction>
                  <UiTextAction
                    v-else-if="record.attentionType === 'RECOGNITION_REVIEW'"
                    tone="primary"
                    @click="openAttentionReviewWorkspace"
                  >
                    OCR/AI 复核
                  </UiTextAction>
                  <UiTextAction
                    v-else-if="record.attentionType === ScanAttentionTypeCode.DUPLICATE_PENDING"
                    tone="primary"
                    @click="goToScanLedger"
                  >
                    去影像账本处置
                  </UiTextAction>
                  <UiTextAction
                    v-else-if="record.attentionType === ScanAttentionTypeCode.QUALITY_BLOCK || record.attentionType === ScanAttentionTypeCode.PROCESSING_BLOCK"
                    tone="primary"
                    @click="openDetail(record)"
                  >
                    查看处置
                  </UiTextAction>
                  <UiTextAction
                    v-if="record.sourceType === 'SCANNED_PAGE' && record.pageId"
                    tone="danger"
                    :disabled="pageDiscarding === record.pageId"
                    title="将该扫描页标记为废弃，不影响所属批次"
                    @click="onDiscardPage(record)"
                  >
                    废弃此页
                  </UiTextAction>
                </div>
              </template>
            </template>
          </UiDataTable>
        </section>
      </WorkbenchSurfaceCard>

      <ScanBatchDetailDrawer
        v-model:open="batchDetailDrawerOpen"
        :exam-id="selectedExamId || ''"
        :scan-batch-id="batchDetailBatchId"
        :batch-summary="batchDetailSummary"
        @updated="handleMonitorBatchUpdated"
      />

      <!-- 身份绑定抽屉 -->
      <UiDrawer
        :open="bindDrawerOpen"
        title="试卷身份绑定"
        :width="560"
        :confirm-loading="binding"
        :hide-footer="false"
        @update:open="(v: boolean) => (bindDrawerOpen = v)"
        @close="bindDrawerOpen = false"
        @confirm="handleBind"
      >
        <a-form ref="bindFormRef" :model="bindForm" :rules="bindFormRules" layout="vertical">
          <section class="scan-monitor__identity-evidence">
            <div class="scan-monitor__identity-evidence-header">
              <div>
                <h3 class="scan-monitor__identity-evidence-title">身份区证据对比</h3>
                <p class="scan-monitor__identity-evidence-subtitle">
                  左侧为 OCR 自动裁切身份区，右侧为原始扫描页，用于人工核对姓名、学号与卷面来源
                </p>
              </div>
              <UiTag :tone="bindEvidenceTagTone" size="sm">
                {{ bindEvidenceTagLabel }}
              </UiTag>
            </div>
            <div class="scan-monitor__identity-compare">
              <div class="scan-monitor__identity-pane">
                <div class="scan-monitor__identity-pane-title">手写身份区切片</div>
                <UiSkeletonState
                  v-if="bindIdentitySliceLoading"
                  variant="card"
                  compact
                  class="scan-monitor__identity-skeleton"
                />
                <ScanImageStage
                  v-else-if="bindIdentitySliceImageUrl"
                  :src="bindIdentitySliceImageUrl"
                  :confidential="isExamConfidential"
                  :exam-label="examConfidentialLabel"
                  :watermark-lines="watermarkLines"
                  :min-height="220"
                  caption="手写身份区切片"
                  empty-text="暂无数据"
                />
                <UiEmpty
                  v-else
                  description="暂无数据"
                  class="scan-monitor__identity-empty"
                />
              </div>
              <div class="scan-monitor__identity-pane">
                <div class="scan-monitor__identity-pane-title">原始扫描页</div>
                <UiSkeletonState
                  v-if="bindSourcePageLoading"
                  variant="card"
                  compact
                  class="scan-monitor__identity-skeleton"
                />
                <ScanImageStage
                  v-else-if="bindSourcePageImageUrl"
                  :src="bindSourcePageImageUrl"
                  :confidential="isExamConfidential"
                  :exam-label="examConfidentialLabel"
                  :watermark-lines="watermarkLines"
                  :min-height="220"
                  caption="原始扫描页"
                  empty-text="暂无数据"
                />
                <UiEmpty
                  v-else
                  description="暂无数据"
                  class="scan-monitor__identity-empty"
                />
              </div>
            </div>
          </section>
          <a-form-item label="扫描批次">
            <a-input :value="bindForm.scanBatchDisplayName" disabled />
          </a-form-item>
          <a-form-item label="答卷">
            <a-input :value="bindForm.paperDisplayName" disabled />
          </a-form-item>
          <a-form-item label="识别学号（可选，留空表示未能识别）" name="recognizedStudentNo">
            <a-input
              v-model:value="bindForm.recognizedStudentNo"
              placeholder="OCR / 二维码识别到的学号线索，供后续审计使用"
              :maxlength="64"
            />
          </a-form-item>
          <a-form-item label="正确考生（从当前考试名册选择）" name="confirmedCandidateRosterId">
            <a-select
              v-model:value="bindForm.confirmedCandidateRosterId"
              placeholder="按姓名或学号搜索"
              show-search
              :options="candidateOptions"
              :filter-option="filterCandidate"
              :loading="candidatesLoading"
              allow-clear
            />
          </a-form-item>
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="答卷状态" name="attemptStatus">
                <a-select
                  v-model:value="bindForm.attemptStatus"
                  placeholder="选择答卷状态"
                  :options="batchAttemptStatusOptions"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="答卷编号（可选）">
                <a-input
                  v-model:value="bindForm.attemptNo"
                  placeholder="多试卷时区分"
                  :maxlength="32"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </UiDrawer>

      <!-- 批量身份绑定抽屉 -->
      <UiDrawer
        :open="batchBindDrawerOpen"
        title="批量试卷身份绑定"
        :width="880"
        :confirm-loading="batchBinding"
        :hide-footer="false"
        @update:open="(v: boolean) => (batchBindDrawerOpen = v)"
        @close="closeBatchBindDrawer"
        @confirm="submitBatchBind"
      >
        <div v-if="batchBindResult" class="scan-monitor__batch-result">
          <div v-if="batchBindFailedItems.length > 0" class="scan-monitor__batch-failures">
            <div
              v-for="item in batchBindFailedItems"
              :key="item.paperInstanceId"
              class="scan-monitor__batch-failure"
            >
              <a-typography-text
                strong
                :content="batchBindRowDisplayNameMap.get(item.paperInstanceId)"
              />
              <span>{{ item.errorMessage }}</span>
            </div>
          </div>
        </div>
        <div class="scan-monitor__batch-list">
          <div v-for="row in batchBindRows" :key="row.attentionId" class="scan-monitor__batch-row">
            <div class="scan-monitor__batch-main">
              <a-typography-text strong :content="row.paperDisplayName" />
              <span class="scan-monitor__hint">{{ row.scanBatchDisplayName }}</span>
              <span v-if="row.diagnostic" class="scan-monitor__batch-diagnostic">
                {{ scanAttentionDiagnosticText(row.diagnostic) }}
              </span>
            </div>
            <div class="scan-monitor__batch-form">
              <a-input
                v-model:value="row.recognizedStudentNo"
                placeholder="识别学号"
                :maxlength="64"
                class="scan-monitor__batch-input"
              />
              <a-select
                v-model:value="row.confirmedCandidateRosterId"
                placeholder="选择正确考生"
                show-search
                :options="candidateOptions"
                :filter-option="filterCandidate"
                :loading="candidatesLoading"
                class="scan-monitor__batch-candidate"
                allow-clear
              />
              <a-select
                v-model:value="row.attemptStatus"
                placeholder="作答状态"
                :options="batchAttemptStatusOptions"
                class="scan-monitor__batch-attempt-status"
              />
              <a-input
                v-model:value="row.attemptNo"
                placeholder="答卷编号（可选）"
                :maxlength="32"
                class="scan-monitor__batch-attempt-no"
              />
            </div>
          </div>
        </div>
      </UiDrawer>

      <!-- 详情抽屉 -->
      <UiDrawer
        :open="detailDrawerOpen"
        title="异常详情"
        :width="560"
        hide-footer
        @update:open="(v: boolean) => (detailDrawerOpen = v)"
        @close="detailDrawerOpen = false"
      >
        <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
          <a-descriptions-item label="异常类型">
            {{ attentionTypeLabel(detailRecord.attentionType) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            {{ scanAttentionStatusLabel(detailRecord) }}
          </a-descriptions-item>
          <a-descriptions-item label="来源">
            {{ sourceTypeLabel(detailRecord.sourceType) }}
          </a-descriptions-item>
          <a-descriptions-item label="来源说明">
            {{ detailRecord.sourceDisplayName }}
          </a-descriptions-item>
          <a-descriptions-item label="扫描批次">
            {{ detailRecord.scanBatchDisplayName }}
          </a-descriptions-item>
          <a-descriptions-item label="答题卡">
            {{ detailRecord.paperDisplay.primaryText }}
          </a-descriptions-item>
          <a-descriptions-item label="扫描页">{{ detailRecord.pageDisplayName }}</a-descriptions-item>
          <a-descriptions-item label="题目">
            {{ detailRecord.questionDisplayName }}
          </a-descriptions-item>
          <a-descriptions-item label="处理说明">
            <div class="scan-monitor__diagnostic-text">
              {{ scanAttentionDiagnosticText(detailRecord.diagnostic) }}
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="更新时间">
            {{ formatDateTimeWithSeconds(detailRecord.updateTime) }}
          </a-descriptions-item>
        </a-descriptions>
      </UiDrawer>

      <UiDrawer
        v-model:open="pageDiscardModalOpen"
        title="废弃扫描页"
        :width="480"
        hide-footer
        @close="closePageDiscardModal"
      >
        <a-form layout="vertical">
          <a-form-item
            label="废弃原因"
            required
            :validate-status="pageDiscardReasonError ? 'error' : undefined"
            :help="pageDiscardReasonError"
          >
            <a-textarea
              v-model:value="pageDiscardReason"
              placeholder="请输入废弃原因（必填，1-255 字）"
              :maxlength="255"
              show-count
              :rows="4"
            />
          </a-form-item>
        </a-form>
        <template #footer>
          <UiButton variant="outline" @click="closePageDiscardModal">取消</UiButton>
          <UiButton
            status="danger"
            :loading="Boolean(pageDiscarding)"
            @click="confirmDiscardPage"
          >
            废弃
          </UiButton>
        </template>
      </UiDrawer>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
/**
 * 阅卷交付 - 扫描监控中控台
 *
 * 后端契约：
   * - listScanAttentions(examId, pageNum, pageSize, queryGroup?, attentionType?, scanBatchId?, paperInstanceId?)
 * - bindPaper(...)、batchBindPapers(...)、listExamCandidates(examId)
 *
 * attentionType 枚举：QUALITY_BLOCK / PROCESSING_BLOCK / DUPLICATE_PENDING / RECOGNITION_REVIEW / BINDING_CONFLICT / MISSING_CANDIDATE_ROSTER
 */
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamPaperBatchBindResponse, ExamScannerDeviceResponse } from '@/apis/mark/exam-mark-scanner'
import type {ExamWorkbenchScanMonitorPanelResponse} from '@/apis/mark/exam-progress';
import type {
  ExamScannerBatchResponse,
  ScanAttentionItemResponse,
  ScanAttentionSourceTypeCode,
  ScanBatchStatusCode,
} from '@/apis/mark/exam-scan'
import type {
  CandidateStatusCode,
  ExamCandidateResponse,
} from '@/apis/mark/exam-scope'
import type { ExamScoreSummaryItemResponse } from '@/apis/mark/exam-score'
import type { BadgeTone, FilterField, UiSectionTabItem, UiSelectOption } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getImageBlobUrl } from '@/apis/edu/file-management'
import {
  DUPLICATE_RESOLUTION_STATUS_TONE,
  DuplicateResolutionStatusDescription,
} from '@/apis/mark/duplicate-resolution-status'
import {
  BindingStatusDescription,
  bindPaper,
} from '@/apis/mark/exam-binding'
import { batchBindPapers, isScannerDeviceOnline, listActiveScannerDevices } from '@/apis/mark/exam-mark-scanner'
import { getScanMonitorPanel } from '@/apis/mark/exam-progress'
import {
  listScanAttentions,
  pageScannerBatches,
  QUALITY_DECISION_TONE,
  QualityDecisionDescription,
  SCAN_ATTENTION_TYPE_OPTIONS,
  SCAN_ATTENTION_TYPE_TONE,
  SCAN_BATCH_STATUS_OPTIONS,
  SCAN_BATCH_STATUS_TONE,
  SCAN_MONITOR_FLOW_HINT,
  ScanAttentionQueryGroupCode,
  ScanAttentionSourceTypeDescription,
  ScanAttentionTypeCode,
  ScanAttentionTypeDescription,
  ScanBatchStatusDescription,
} from '@/apis/mark/exam-scan'
import {
  CandidateStatusDescription,
  listExamCandidates,
} from '@/apis/mark/exam-scope'
import { pageExamScoreSummary } from '@/apis/mark/exam-score'
import { FinalScoreStatusDescription } from '@/apis/mark/final-score-status'
import { GRADE_STATUS_TONE, GradeStatusDescription } from '@/apis/mark/grade-status'
import { discardScannedPage } from '@/apis/mark/scanner-kiosk'
import { TASK_STATUS_TONE, TaskStatusDescription } from '@/apis/mark/task-status'
import ScanBatchDetailDrawer from '@/components/mark/ScanBatchDetailDrawer.vue'
import ScanDeviceCardGrid from '@/components/mark/ScanDeviceCardGrid.vue'
import ScanImageStage from '@/components/mark/ScanImageStage.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useScanLiveStream } from '@/composables/useScanLiveStream'
import { useWorkspaceConfidentialContext } from '@/composables/useWorkspaceConfidentialContext'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import mittBus from '@/utils/mitt'
import { readAllPages } from '@/utils/page-result'
import { toSignalMetrics } from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScanLiveMonitor' })

const SCAN_BATCH_FILTER_PAGE_SIZE = 50
const MONITOR_BATCH_PAGE_SIZE = 10
const PAPER_CANDIDATE_FILTER_PAGE_SIZE = 50

const router = useRouter()
const route = useRoute()

enum ScanMonitorTabQuery {
  NORMAL = 'normal',
  ABNORMAL = 'abnormal',
  DUPLICATE = 'duplicate',
}

function isScanMonitorTabQuery(value: unknown): value is ScanMonitorTabQuery {
  return value === ScanMonitorTabQuery.NORMAL
    || value === ScanMonitorTabQuery.ABNORMAL
    || value === ScanMonitorTabQuery.DUPLICATE
}

const { selectedExamId } = useMarkExamContext()
const {
  contextBarTitle,
  contextBarSubtitle,
  examStatusLabel,
  examStatusTone,
} = useExamJourneyContextBar('扫描监控')

const scanMonitorContextSubtitle = computed(() => {
  const journeySubtitle = contextBarSubtitle.value
  if (journeySubtitle.includes('/api/')) {
    return '扫描监控 · 实时批次与异常处置'
  }
  return journeySubtitle
})
const { refreshSnapshot } = useWorkspaceExamId()
const {
  isExamConfidential,
  examConfidentialLabel,
  watermarkLines,
} = useWorkspaceConfidentialContext()

/** 扫描链写操作后同步 StageRail 与本页数据。 */
async function syncScanWorkbenchState(): Promise<void> {
  await refreshSnapshot()
  mittBus.emit('scan-workbench:refresh')
}

// ─── 列表筛选 + 数据 ─────────────────────────────
const filterForm = reactive<{
  attentionType?: ScanAttentionTypeCode | ''
  scanBatchId?: string
  paperInstanceId?: string
  eventKeyword: string
  batchStatus?: ScanBatchStatusCode
  monitorDeviceId: string
}>({
  attentionType: '',
  scanBatchId: '',
  paperInstanceId: '',
  eventKeyword: '',
  monitorDeviceId: '',
})

const scannerDevices = ref<ExamScannerDeviceResponse[]>([])
const scannerDevicesLoading = ref(false)
const scanMonitorPanel = ref<ExamWorkbenchScanMonitorPanelResponse | null>(null)
const scanMonitorPanelLoadFailed = ref(false)
const SCANNER_DEVICE_POLL_INTERVAL_MS = 60_000
const ATTENTION_FALLBACK_POLL_INTERVAL_MS = 15_000
let monitorFallbackPollTimer: ReturnType<typeof setInterval> | null = null

const connectedDevices = computed(() => scannerDevices.value.filter(isScannerDeviceOnline))

function formatMonitorDeviceLabel(device: ExamScannerDeviceResponse): string {
  const name = device.deviceName || device.scannerDeviceId
  return device.scannerIp ? `${name}（${device.scannerIp}）` : name
}

const normalFilterApplied = reactive<{
  keyword: string
  scanBatchId: string
  batchStatus?: ScanBatchStatusCode
  scannerDeviceId: string
}>({
  keyword: '',
  scanBatchId: '',
  batchStatus: undefined,
  scannerDeviceId: '',
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const activeTab = ref<'normal' | 'abnormal' | 'duplicate'>('normal')

function syncActiveTabFromRoute(): void {
  const tab = route.query.tab
  if (isScanMonitorTabQuery(tab)) {
    activeTab.value = tab
    return
  }
  if (tab === undefined || tab === null || tab === '') {
    activeTab.value = 'normal'
  }
}

const attentionTableEmptyDescription = computed(() => {
  if (activeTab.value === 'abnormal') {
    return '暂无异常待处理，当前扫描识别正常'
  }
  if (activeTab.value === 'duplicate') {
    return '暂无重复影像待处置，可在影像账本查看历史记录'
  }
  return '暂无待关注项'
})

const normalTableEmptyDescription = computed(() => {
  if (hasActiveNormalFilters.value) {
    return '当前筛选条件下无匹配批次，请调整条件后重试'
  }
  return '暂无扫描批次，请先在扫描终端完成扫描'
})

const hasActiveNormalFilters = computed(() =>
  Boolean(
    normalFilterApplied.keyword
    || normalFilterApplied.scanBatchId
    || normalFilterApplied.batchStatus
    || normalFilterApplied.scannerDeviceId,
  ),
)

const normalFilterFields = computed<FilterField[]>(() => {
  const fields: FilterField[] = []
  if (connectedDevices.value.length > 0) {
    fields.push({
      key: 'monitorDeviceId',
      type: 'select',
      label: '在线扫描仪',
      placeholder: '选择监控设备',
      allowClear: false,
      width: 220,
      minWidth: 200,
      maxWidth: 280,
      triggerSearchOnChange: false,
      options: connectedDevices.value
        .filter((device) => !!device.scannerDeviceId)
        .map((device) => ({
          value: device.scannerDeviceId,
          label: formatMonitorDeviceLabel(device),
        })),
    })
  }
  fields.push(
    {
      key: 'eventKeyword',
      type: 'input',
      label: '关键词',
      placeholder: '批次号 / 外部编号 / 设备',
      inputPrefixIcon: 'search',
      triggerSearchOnChange: false,
      allowClear: true,
      width: 260,
      minWidth: 220,
      maxWidth: 320,
    },
    {
      key: 'batchStatus',
      type: 'select',
      label: '状态',
      placeholder: '全部状态',
      allowClear: true,
      width: 140,
      minWidth: 120,
      maxWidth: 160,
      triggerSearchOnChange: false,
      options: SCAN_BATCH_STATUS_OPTIONS,
    },
  )
  return fields
})

const attentionFilterFields = computed<FilterField[]>(() => {
  const fields: FilterField[] = []
  if (activeTab.value === 'abnormal') {
    fields.push({
      key: 'attentionType',
      type: 'select',
      label: '异常类型',
      placeholder: '全部异常',
      allowClear: true,
      width: 160,
      minWidth: 140,
      maxWidth: 200,
      options: attentionTypeOptions.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    })
  }
  fields.push(
    {
      key: 'scanBatchId',
      type: 'custom',
      label: '扫描批次',
      width: 200,
      minWidth: 180,
      maxWidth: 260,
    },
    {
      key: 'paperInstanceId',
      type: 'custom',
      label: '答题卡',
      width: 200,
      minWidth: 180,
      maxWidth: 260,
    },
  )
  return fields
})

const monitorFilterFields = computed<FilterField[]>(() =>
  activeTab.value === 'normal' ? normalFilterFields.value : attentionFilterFields.value,
)

const hasMonitorScanBatchFilter = computed(() =>
  monitorFilterFields.value.some((field) => field.key === 'scanBatchId'),
)

const monitorBatches = ref<ExamScannerBatchResponse[]>([])
const monitorBatchLoading = ref(false)
const monitorBatchPagination = reactive({
  current: 1,
  pageSize: MONITOR_BATCH_PAGE_SIZE,
  total: 0,
})
const batchDetailDrawerOpen = ref(false)
const batchDetailBatchId = ref<string | null>(null)
const batchDetailSummary = ref<ExamScannerBatchResponse | null>(null)

const monitorBatchColumns: ColumnType<ExamScannerBatchResponse>[] = [
  { title: '批次号', key: 'batchNo', width: 200, ellipsis: true },
  { title: '状态', key: 'status', width: 100 },
  { title: '页数', key: 'pageCount', width: 72, align: 'right' },
  { title: '答卷数', key: 'boundPaperCount', width: 72, align: 'right' },
  { title: '落库', key: 'pageProgress', width: 88, align: 'right' },
  { title: '设备', key: 'scannerDevice', width: 160, ellipsis: true },
  { title: '操作员', key: 'operatorDisplayName', width: 120, ellipsis: true },
  { title: 'DPI', key: 'dpi', width: 88, align: 'right' },
  { title: '开始时间', key: 'scanStartTime', width: 168 },
  { title: '结束时间', key: 'scanEndTime', width: 168 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

function monitorBatchStatusTone(batch: ExamScannerBatchResponse): BadgeTone {
  if (batch.sealedTime) {
    return 'green'
  }
  return strictEnumTone(SCAN_BATCH_STATUS_TONE, batch.status, '扫描批次状态')
}

function monitorBatchStatusLabel(batch: ExamScannerBatchResponse): string {
  if (batch.sealedTime) {
    return '已封存'
  }
  return strictEnumLabel(ScanBatchStatusDescription, batch.status, '扫描批次状态')
}

function formatMonitorBatchDeviceLabel(deviceId?: string): string {
  if (!deviceId) {
    return '—'
  }
  const device = scannerDevices.value.find((item) => item.scannerDeviceId === deviceId)
  if (!device) {
    return deviceId
  }
  return formatMonitorDeviceLabel(device)
}

function openMonitorBatchDetail(batch: ExamScannerBatchResponse): void {
  batchDetailBatchId.value = batch.scanBatchId
  batchDetailSummary.value = batch
  batchDetailDrawerOpen.value = true
}

function handleMonitorBatchUpdated(): void {
  void loadMonitorBatches()
  void loadScanOverview(selectedExamId.value!)
}

function handleMonitorBatchPageChange(pageEvent: { current: number, pageSize: number }): void {
  monitorBatchPagination.current = pageEvent.current
  monitorBatchPagination.pageSize = pageEvent.pageSize
  void loadMonitorBatches()
}

async function loadMonitorBatches(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId || activeTab.value !== 'normal') {
    monitorBatches.value = []
    monitorBatchPagination.total = 0
    return
  }
  monitorBatchLoading.value = true
  try {
    const result = await pageScannerBatches({
      examId,
      pageNum: monitorBatchPagination.current,
      pageSize: monitorBatchPagination.pageSize,
      keyword: normalFilterApplied.keyword || undefined,
      scannerDeviceId: normalFilterApplied.scannerDeviceId || undefined,
      status: normalFilterApplied.batchStatus,
      includeDiscarded: false,
    })
    monitorBatches.value = result.list
    monitorBatchPagination.total = Number(result.total)
  } catch (error) {
    monitorBatches.value = []
    monitorBatchPagination.total = 0
    showUserError(error, '扫描批次加载失败')
  } finally {
    monitorBatchLoading.value = false
  }
}

function applyNormalFilters(): void {
  normalFilterApplied.keyword = filterForm.eventKeyword.trim()
  normalFilterApplied.scanBatchId = filterForm.scanBatchId || ''
  normalFilterApplied.batchStatus = filterForm.batchStatus
  normalFilterApplied.scannerDeviceId = filterForm.monitorDeviceId || ''
  monitorBatchPagination.current = 1
  void loadMonitorBatches()
}

const attentions = ref<ScanAttentionItemResponse[]>([])
const loading = ref(false)
const attentionPagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})
const scanBatches = ref<ExamScannerBatchResponse[]>([])
const scanBatchesLoading = ref(false)
const scanBatchKeyword = ref('')
const paperCandidates = ref<ExamScoreSummaryItemResponse[]>([])
const paperCandidatesLoading = ref(false)
const paperCandidateKeyword = ref('')
const scanBatchOptions = computed<UiSelectOption[]>(() =>
  scanBatches.value
    .filter((item): item is ExamScannerBatchResponse & { scanBatchId: string } => Boolean(item.scanBatchId))
    .map((item) => ({
      value: item.scanBatchId,
      label: [
        item.batchNo || item.batchExternalNo || item.statusMessage,
        scanBatchStatusLabel(item),
        `${item.pageCount ?? 0} 页`,
      ].join(' · '),
    })),
)
const paperCandidateOptions = computed<UiSelectOption[]>(() =>
  paperCandidates.value
    .filter((item): item is ExamScoreSummaryItemResponse & { paperInstanceId: string } => Boolean(item.paperInstanceId))
    .map((item) => ({
      value: item.paperInstanceId,
      label: [
        `${item.studentName}（${item.studentNo}）`,
        item.studentClassName,
        strictEnumLabel(BindingStatusDescription, item.bindingStatus, '试卷绑定状态'),
        finalScoreStatusLabel(item.finalScoreStatus),
      ]
        .filter(Boolean)
        .join(' · '),
    })),
)

const abnormalAttentionTotal = ref(0)
const duplicateAttentionTotal = ref(0)
const activeAttentionRows = computed(() => attentions.value)

const scanLiveStream = useScanLiveStream({
  filter: () => ({ examId: selectedExamId.value ?? undefined }),
})

let monitorBatchReloadTimer: ReturnType<typeof setTimeout> | null = null

function scheduleMonitorBatchReload(): void {
  if (monitorBatchReloadTimer) {
    clearTimeout(monitorBatchReloadTimer)
  }
  monitorBatchReloadTimer = setTimeout(() => {
    monitorBatchReloadTimer = null
    const examId = selectedExamId.value
    if (!examId) {
      return
    }
    void loadScanOverview(examId)
    void loadConnectedScannerDevices()
    if (activeTab.value === 'normal') {
      void loadMonitorBatches()
    } else if (activeTab.value === 'abnormal' || activeTab.value === 'duplicate') {
      void loadAttentions()
    }
  }, 800)
}

const connectionTone = computed<BadgeTone>(() => {
  const phase = scanLiveStream.connectionPhase.value
  if (phase === 'ready' && scanLiveStream.ready.value) {
    return 'green'
  }
  if (phase === 'reconnecting' || phase === 'connecting') {
    return 'orange'
  }
  return connectedDevices.value.length > 0 ? 'gray' : 'gray'
})

const connectionLabel = computed(() => {
  const phase = scanLiveStream.connectionPhase.value
  if (phase === 'ready' && scanLiveStream.ready.value) {
    return '实时同步中'
  }
  if (phase === 'reconnecting') {
    return '重连中'
  }
  if (phase === 'connecting') {
    return connectedDevices.value.length > 0
      ? `连接中 · ${connectedDevices.value.length} 台在线`
      : '连接中'
  }
  return connectedDevices.value.length > 0
    ? `${connectedDevices.value.length} 台在线（轮询）`
    : '无在线设备'
})

const connectionPulsing = computed(() =>
  scanLiveStream.connectionPhase.value === 'ready' && scanLiveStream.ready.value,
)

watch(() => scanLiveStream.events.value.length, () => {
  scheduleMonitorBatchReload()
})

function handleMonitorDeviceSelect(device: ExamScannerDeviceResponse): void {
  filterForm.monitorDeviceId = device.scannerDeviceId
  if (activeTab.value === 'normal') {
    applyNormalFilters()
  }
}

async function loadScanOverview(examId: string): Promise<void> {
  scanMonitorPanelLoadFailed.value = false
  try {
    scanMonitorPanel.value = await getScanMonitorPanel(examId)
    await loadAttentionCounters()
  } catch (error) {
    scanMonitorPanel.value = null
    scanMonitorPanelLoadFailed.value = true
    showUserError(error, '扫描监控指标加载失败')
  }
}

function jumpToAbnormalTab(): void {
  activeTab.value = 'abnormal'
  filterForm.attentionType = ''
  reloadAttentionsFromFirstPage()
}

function jumpToDuplicateTab(): void {
  activeTab.value = 'duplicate'
  filterForm.attentionType = ''
  reloadAttentionsFromFirstPage()
}

function jumpToMissingCandidateAttention(): void {
  activeTab.value = 'abnormal'
  filterForm.attentionType = ScanAttentionTypeCode.MISSING_CANDIDATE_ROSTER
  reloadAttentionsFromFirstPage()
}

function goToScanBatchOrphanRecovery(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceScanBatches',
    params: { examId: selectedExamId.value },
    query: { focus: 'orphan' },
  })
}

function handleScanMonitorMetricClick(key: string): void {
  if (key === 'attention') {
    jumpToAbnormalTab()
    return
  }
  if (key === 'missing-candidate') {
    jumpToMissingCandidateAttention()
    return
  }
  if (key === 'orphan-event') {
    goToScanBatchOrphanRecovery()
    return
  }
  if (key === 'duplicate-page') {
    jumpToDuplicateTab()
  }
}

const statPanelMetrics = computed<SignalMetric[]>(() => {
  if (scanMonitorPanelLoadFailed.value) {
    return [{ key: 'monitor-load-failed', label: '监控 KPI', value: '加载失败', tone: 'red' }]
  }
  const panel = scanMonitorPanel.value
  if (!panel) {
    return [{ key: 'monitor-empty', label: '监控 KPI', value: '—', tone: 'gray' }]
  }
  return [
    {
      key: 'batch',
      label: '扫描批次',
      value: `${panel.settledBatchCount}/${panel.batchTotal}`,
      tone: 'blue',
    },
    {
      key: 'scanned-page',
      label: '已扫描页',
      value: panel.scannedPageCount,
      tone: panel.scannedPageCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'bound-paper',
      label: '已绑定',
      value: panel.boundPaperCount,
      tone: panel.boundPaperCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'missing-candidate',
      label: '缺失考生',
      value: panel.missingCandidateCount,
      tone: panel.missingCandidateCount > 0 ? 'red' : 'green',
      clickable: panel.missingCandidateCount > 0,
      helper: panel.missingCandidateCount > 0 ? '查看缺失名册异常' : undefined,
    },
    {
      key: 'duplicate-page',
      label: '重复影像',
      value: panel.duplicatePageCount,
      tone: panel.duplicatePageCount > 0 ? 'orange' : 'green',
      clickable: panel.duplicatePageCount > 0,
      helper: panel.duplicatePageCount > 0 ? '打开重复 tab' : undefined,
    },
    {
      key: 'attention',
      label: '扫描异常',
      value: abnormalAttentionTotal.value,
      unit: '条',
      tone: abnormalAttentionTotal.value > 0 ? 'orange' : 'green',
      clickable: abnormalAttentionTotal.value > 0,
      active: activeTab.value === 'abnormal' && !filterForm.attentionType,
      helper: abnormalAttentionTotal.value > 0 ? '打开异常 tab' : undefined,
    },
    {
      key: 'orphan-event',
      label: '游离页事件',
      value: panel.orphanPendingEventCount,
      unit: '条',
      tone: panel.orphanPendingEventCount > 0 ? 'orange' : 'gray',
      clickable: panel.orphanPendingEventCount > 0,
      helper: panel.orphanPendingEventCount > 0 ? '前往批次工作台回收' : undefined,
    },
  ]
})

const monitorTabs = computed<UiSectionTabItem[]>(() => [
  {
    key: 'normal',
    label: '扫描批次',
    count: monitorBatchPagination.total,
    badgeTone: monitorBatchPagination.total > 0 ? 'blue' : 'gray',
  },
  {
    key: 'abnormal',
    label: '异常',
    count: abnormalAttentionTotal.value,
    badgeTone: abnormalAttentionTotal.value > 0 ? 'red' : 'gray',
  },
  {
    key: 'duplicate',
    label: '重复',
    count: duplicateAttentionTotal.value,
    badgeTone: duplicateAttentionTotal.value > 0 ? 'purple' : 'gray',
  },
])

async function loadConnectedScannerDevices(): Promise<void> {
  if (!selectedExamId.value) {
    scannerDevices.value = []
    filterForm.monitorDeviceId = ''
    return
  }
  scannerDevicesLoading.value = true
  try {
    scannerDevices.value = await listActiveScannerDevices()
    const online = connectedDevices.value
    if (online.length === 0) {
      filterForm.monitorDeviceId = ''
      return
    }
    const previousDeviceId = filterForm.monitorDeviceId
    const nextDeviceId = online.some((device) => device.scannerDeviceId === filterForm.monitorDeviceId)
      ? filterForm.monitorDeviceId
      : online[0].scannerDeviceId
    if (nextDeviceId !== previousDeviceId) {
      filterForm.monitorDeviceId = nextDeviceId
    }
  } catch (error) {
    scannerDevices.value = []
    filterForm.monitorDeviceId = ''
    showUserError(error, '在线扫描仪加载失败')
  } finally {
    scannerDevicesLoading.value = false
  }
}

function isScanLiveStreamReady(): boolean {
  return scanLiveStream.connectionPhase.value === 'ready' && scanLiveStream.ready.value
}

function isAttentionMonitorTab(): boolean {
  return activeTab.value === 'abnormal' || activeTab.value === 'duplicate'
}

function tickMonitorFallbackPoll(): void {
  if (!selectedExamId.value) {
    return
  }
  if (activeTab.value === 'normal') {
    void loadConnectedScannerDevices()
    return
  }
  if (isAttentionMonitorTab() && !isScanLiveStreamReady()) {
    void loadAttentions()
  }
}

function startMonitorFallbackPolling(): void {
  stopMonitorFallbackPolling()
  const intervalMs = activeTab.value === 'normal'
    ? SCANNER_DEVICE_POLL_INTERVAL_MS
    : ATTENTION_FALLBACK_POLL_INTERVAL_MS
  monitorFallbackPollTimer = setInterval(tickMonitorFallbackPoll, intervalMs)
}

function stopMonitorFallbackPolling(): void {
  if (monitorFallbackPollTimer) {
    clearInterval(monitorFallbackPollTimer)
    monitorFallbackPollTimer = null
  }
}

async function handleRefresh(): Promise<void> {
  await Promise.all([
    refreshSnapshot(),
    loadConnectedScannerDevices(),
    loadAttentions(),
    loadScanBatches(),
    loadPaperCandidates(),
    loadMonitorBatches(),
  ])
  if (selectedExamId.value) {
    await loadScanOverview(selectedExamId.value)
  }
}

function goToScanLedger(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceScanLedger',
    params: { examId: selectedExamId.value },
  })
}

function openAttentionReviewWorkspace(): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceReviewBatchConfirm',
    params: { examId: selectedExamId.value },
  })
}

const attentionTypeOptions = SCAN_ATTENTION_TYPE_OPTIONS

function scanBatchStatusLabel(batch: ExamScannerBatchResponse): string {
  return strictEnumLabel(ScanBatchStatusDescription, batch.status, '扫描批次状态')
}

function finalScoreStatusLabel(status: ExamScoreSummaryItemResponse['finalScoreStatus']): string {
  return strictEnumLabel(FinalScoreStatusDescription, status, '最终成绩状态')
}

const columns: ColumnType<ScanAttentionItemResponse>[] = [
  { title: '异常类型', key: 'attentionType', width: 160 },
  { title: '来源', key: 'sourceInfo', width: 180 },
  { title: '扫描批次', key: 'scanBatch', width: 220, ellipsis: true },
  { title: '答卷', key: 'paperDisplay', width: 220 },
  { title: '状态', key: 'status', width: 120 },
  { title: '处理说明', key: 'diagnostic', ellipsis: true },
  { title: '更新时间', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

async function loadAttentions(): Promise<void> {
  if (!selectedExamId.value) {
    attentions.value = []
    attentionPagination.total = 0
    abnormalAttentionTotal.value = 0
    duplicateAttentionTotal.value = 0
    return
  }
  loading.value = true
  try {
    await loadAttentionCounters()
    const queryGroup = currentAttentionQueryGroup()
    if (!queryGroup) {
      attentions.value = []
      attentionPagination.total = 0
      return
    }
    await loadAttentionPage(queryGroup)
  } catch (error) {
    showUserError(error, '扫描异常列表加载失败')
  } finally {
    loading.value = false
  }
}

function currentAttentionQueryGroup(): ScanAttentionQueryGroupCode | undefined {
  if (activeTab.value === 'abnormal') return ScanAttentionQueryGroupCode.ABNORMAL
  if (activeTab.value === 'duplicate') return ScanAttentionQueryGroupCode.DUPLICATE
  return undefined
}

function currentAttentionType(): ScanAttentionTypeCode | undefined {
  if (activeTab.value !== 'abnormal') return undefined
  return filterForm.attentionType || undefined
}

async function loadAttentionCounters(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    abnormalAttentionTotal.value = 0
    duplicateAttentionTotal.value = 0
    return
  }
  const [abnormalResult, duplicateResult] = await Promise.all([
    listScanAttentions({
      examId,
      pageNum: 1,
      pageSize: 1,
      queryGroup: ScanAttentionQueryGroupCode.ABNORMAL,
    }),
    listScanAttentions({
      examId,
      pageNum: 1,
      pageSize: 1,
      queryGroup: ScanAttentionQueryGroupCode.DUPLICATE,
    }),
  ])
  abnormalAttentionTotal.value = Number(abnormalResult.total)
  duplicateAttentionTotal.value = Number(duplicateResult.total)
}

let attentionLoadGeneration = 0

async function loadAttentionPage(queryGroup: ScanAttentionQueryGroupCode): Promise<void> {
  const loadGeneration = ++attentionLoadGeneration
  const examId = selectedExamId.value
  if (!examId) {
    attentions.value = []
    attentionPagination.total = 0
    return
  }
  const result = await listScanAttentions({
    examId,
    pageNum: attentionPagination.current,
    pageSize: attentionPagination.pageSize,
    queryGroup,
    attentionType: currentAttentionType(),
    scanBatchId: filterForm.scanBatchId?.trim() || undefined,
    paperInstanceId: filterForm.paperInstanceId?.trim() || undefined,
  })
  if (loadGeneration !== attentionLoadGeneration) {
    return
  }
  const total = Number(result.total)
  const rows = result.list
  if (rows.length === 0 && total > 0 && attentionPagination.current > 1) {
    attentionPagination.current = Math.ceil(total / attentionPagination.pageSize)
    await loadAttentionPage(queryGroup)
    return
  }
  attentionPagination.total = total
  if (result.pageNum != null) {
    attentionPagination.current = result.pageNum
  }
  if (result.pageSize != null) {
    attentionPagination.pageSize = result.pageSize
  }
  attentions.value = rows
}

function reloadAttentionsFromFirstPage(): void {
  attentionPagination.current = 1
  selectedRowKeys.value = []
  void loadAttentions()
}

function handleAttentionPageChange(pageEvent: { current: number, pageSize: number }): void {
  attentionPagination.current = pageEvent.current
  attentionPagination.pageSize = pageEvent.pageSize
  selectedRowKeys.value = []
  void loadAttentions()
}

async function loadScanBatches(keyword = scanBatchKeyword.value): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    scanBatches.value = []
    return
  }
  const normalizedKeyword = keyword.trim()
  scanBatchesLoading.value = true
  try {
    scanBatches.value = await readAllPages(
      (pageNum) => pageScannerBatches({
        examId,
        pageNum,
        pageSize: SCAN_BATCH_FILTER_PAGE_SIZE,
        keyword: normalizedKeyword || undefined,
        includeDiscarded: false,
      }),
      '扫描批次加载失败',
    )
  } catch (error) {
    scanBatches.value = []
    showUserError(error, '扫描批次加载失败')
  } finally {
    scanBatchesLoading.value = false
  }
}

async function loadPaperCandidates(keyword = paperCandidateKeyword.value): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) {
    paperCandidates.value = []
    return
  }
  const normalizedKeyword = keyword.trim()
  paperCandidatesLoading.value = true
  try {
    const list = await readAllPages(
      (pageNum) => pageExamScoreSummary({
        examId,
        pageNum,
        pageSize: PAPER_CANDIDATE_FILTER_PAGE_SIZE,
        keyword: normalizedKeyword || undefined,
      }),
      '答卷筛选加载失败',
    )
    paperCandidates.value = list
      .filter((item) => item.paperInstanceId)
  } catch (error) {
    paperCandidates.value = []
    showUserError(error, '答题卡列表加载失败')
  } finally {
    paperCandidatesLoading.value = false
  }
}

function handleScanBatchSearch(value: string): void {
  scanBatchKeyword.value = value
  void loadScanBatches(value)
}

function handleScanBatchDropdownVisibleChange(open: boolean): void {
  if (open) {
    void loadScanBatches()
  }
}

function handleScanBatchFilterChange(value: SelectValue): void {
  if (!value) {
    scanBatchKeyword.value = ''
    void loadScanBatches('')
  }
  if (activeTab.value === 'normal') {
    return
  }
  reloadAttentionsFromFirstPage()
}

function handlePaperCandidateSearch(value: string): void {
  paperCandidateKeyword.value = value
  void loadPaperCandidates(value)
}

function handlePaperCandidateDropdownVisibleChange(open: boolean): void {
  if (open) {
    void loadPaperCandidates()
  }
}

function handlePaperCandidateFilterChange(value: SelectValue): void {
  if (!value) {
    paperCandidateKeyword.value = ''
    void loadPaperCandidates('')
  }
  reloadAttentionsFromFirstPage()
}

// ─── 类型色彩编码 ─────────────────────────────────

function attentionTypeTone(type: ScanAttentionTypeCode): BadgeTone {
  return strictEnumTone(SCAN_ATTENTION_TYPE_TONE, type, '扫描异常类型')
}

function attentionTypeLabel(type: ScanAttentionTypeCode): string {
  return strictEnumLabel(ScanAttentionTypeDescription, type, '扫描异常类型')
}

function sourceTypeLabel(type: ScanAttentionSourceTypeCode): string {
  return strictEnumLabel(ScanAttentionSourceTypeDescription, type, '扫描异常来源类型')
}

function assertNeverScanAttentionType(_type: never): never {
  throw toUserError(null, '扫描异常类型无法识别，请刷新后重试')
}

function scanAttentionStatusLabel(record: ScanAttentionItemResponse): string {
  switch (record.attentionType) {
    case ScanAttentionTypeCode.QUALITY_BLOCK:
      return strictEnumLabel(QualityDecisionDescription, record.qualityDecision, '扫描页质量判定')
    case ScanAttentionTypeCode.PROCESSING_BLOCK:
      return strictEnumLabel(TaskStatusDescription, record.processingStatus, '处理任务状态')
    case ScanAttentionTypeCode.DUPLICATE_PENDING:
      return strictEnumLabel(
        DuplicateResolutionStatusDescription,
        record.duplicateResolutionStatus,
        '重复影像处置状态',
      )
    case ScanAttentionTypeCode.RECOGNITION_REVIEW:
      return strictEnumLabel(GradeStatusDescription, record.gradeStatus, '题目阅卷状态')
    case ScanAttentionTypeCode.BINDING_CONFLICT:
      return '待人工绑定'
    case ScanAttentionTypeCode.MISSING_CANDIDATE_ROSTER:
      return '待补录名单'
    default:
      return assertNeverScanAttentionType(record.attentionType)
  }
}

function scanAttentionStatusTone(record: ScanAttentionItemResponse): BadgeTone {
  switch (record.attentionType) {
    case ScanAttentionTypeCode.QUALITY_BLOCK:
      return strictEnumTone(QUALITY_DECISION_TONE, record.qualityDecision, '扫描页质量判定')
    case ScanAttentionTypeCode.PROCESSING_BLOCK:
      return strictEnumTone(TASK_STATUS_TONE, record.processingStatus, '处理任务状态')
    case ScanAttentionTypeCode.DUPLICATE_PENDING:
      return strictEnumTone(
        DUPLICATE_RESOLUTION_STATUS_TONE,
        record.duplicateResolutionStatus,
        '重复影像处置状态',
      )
    case ScanAttentionTypeCode.RECOGNITION_REVIEW:
      return strictEnumTone(GRADE_STATUS_TONE, record.gradeStatus, '题目阅卷状态')
    case ScanAttentionTypeCode.BINDING_CONFLICT:
      return 'orange'
    case ScanAttentionTypeCode.MISSING_CANDIDATE_ROSTER:
      return 'orange'
    default:
      return assertNeverScanAttentionType(record.attentionType)
  }
}

const scanMonitorSignalMetrics = computed(() => toSignalMetrics(statPanelMetrics.value))

function resetFilter(): void {
  normalFilterApplied.keyword = ''
  normalFilterApplied.scanBatchId = ''
  normalFilterApplied.batchStatus = undefined
  normalFilterApplied.scannerDeviceId = ''
  filterForm.eventKeyword = ''
  filterForm.batchStatus = undefined
  filterForm.scanBatchId = ''
  if (activeTab.value === 'normal') {
    const firstOnline = connectedDevices.value[0]
    filterForm.monitorDeviceId = firstOnline?.scannerDeviceId ?? ''
    applyNormalFilters()
    return
  }
  filterForm.attentionType = ''
  filterForm.paperInstanceId = ''
  reloadAttentionsFromFirstPage()
}

function handleMonitorFilterSearch(): void {
  if (activeTab.value === 'normal') {
    applyNormalFilters()
    return
  }
  reloadAttentionsFromFirstPage()
}

/**
 * 教师把扫描页（QUALITY_BLOCK / PROCESSING_BLOCK 等异常 SCANNED_PAGE）显式废弃。
 *
 * <p>仅对 sourceType === 'SCANNED_PAGE' 且持有 pageId 的记录可用；后端会校验：
 *   - SUPERSEDED 页拒绝再次废弃；DISCARDED 页幂等返回；
 *   - 所属批次已 sealed 时拒绝；
 *   - 影响仅限当前扫描页 effective_status，不联动批次状态。</p>
 */
const pageDiscarding = ref<string | null>(null)
const pageDiscardModalOpen = ref(false)
const pageDiscardTarget = ref<ScanAttentionItemResponse | null>(null)
const pageDiscardReason = ref('')
const pageDiscardReasonError = ref('')
async function onDiscardPage(record: ScanAttentionItemResponse): Promise<void> {
  if (record.sourceType !== 'SCANNED_PAGE' || !record.pageId) {
    message.warning('该异常不是扫描页来源，无法废弃')
    return
  }
  pageDiscardTarget.value = record
  pageDiscardReason.value = ''
  pageDiscardReasonError.value = ''
  pageDiscardModalOpen.value = true
}

function closePageDiscardModal(): void {
  if (pageDiscarding.value) return
  pageDiscardModalOpen.value = false
  pageDiscardTarget.value = null
  pageDiscardReason.value = ''
  pageDiscardReasonError.value = ''
}

async function confirmDiscardPage(): Promise<void> {
  const record = pageDiscardTarget.value
  if (!record?.pageId) {
    closePageDiscardModal()
    return
  }
  const trimmed = pageDiscardReason.value.trim()
  if (!trimmed) {
    pageDiscardReasonError.value = '废弃原因不能为空'
    return
  }
  if (trimmed.length > 255) {
    pageDiscardReasonError.value = '废弃原因长度不能超过 255 字'
    return
  }
  pageDiscardReasonError.value = ''
  pageDiscarding.value = record.pageId
  try {
    await discardScannedPage({ scannedPageId: record.pageId, discardReason: trimmed })
    message.success('扫描页已废弃')
    pageDiscardModalOpen.value = false
    pageDiscardTarget.value = null
    pageDiscardReason.value = ''
    await loadAttentions()
    await syncScanWorkbenchState()
  } catch (error) {
    showUserError(error, '扫描页废弃失败')
  } finally {
    pageDiscarding.value = null
  }
}

// ─── 身份绑定弹窗 ────────────────────────────────
const bindDrawerOpen = ref(false)
const binding = ref(false)
const bindFormRef = ref<FormInstance>()
const bindForm = reactive<{
  scanBatchId: string
  scanBatchDisplayName: string
  paperInstanceId: string
  paperDisplayName: string
  recognizedStudentNo?: string
  confirmedCandidateRosterId?: string
  attemptStatus: string
  attemptNo?: string
}>({
  scanBatchId: '',
  scanBatchDisplayName: '',
  paperInstanceId: '',
  paperDisplayName: '',
  recognizedStudentNo: '',
  confirmedCandidateRosterId: undefined,
  attemptStatus: '',
  attemptNo: '',
})

const bindFormRules: Record<string, Rule[]> = {
  confirmedCandidateRosterId: [
    { required: true, message: '请从名册中选择正确考生', trigger: 'change' },
  ],
  attemptStatus: [{ required: true, message: '请选择答卷状态', trigger: 'change' }],
  recognizedStudentNo: [{ max: 64, message: '学号最多 64 个字符', trigger: 'blur' }],
}

// 考生名册缓存
const candidates = ref<ExamCandidateResponse[]>([])
const candidatesLoading = ref(false)
const bindIdentitySliceFileId = ref('')
const bindIdentitySliceImageUrl = ref('')
const bindIdentitySliceLoading = ref(false)
const bindIdentitySliceLoadFailed = ref(false)
const bindSourcePageFileId = ref('')
const bindSourcePageImageUrl = ref('')
const bindSourcePageLoading = ref(false)
const bindSourcePageLoadFailed = ref(false)

/**
 * 证据门禁：有身份切片时须切片可见；原页有 fileId 时须原页可见。
 * pageId 缺失时允许切片+名册人工确认（与 kiosk 异常面板一致）。
 */
const bindIdentityEvidenceBlockReason = computed(() => {
  if (!bindDrawerOpen.value) return ''
  if (bindIdentitySliceFileId.value) {
    if (bindIdentitySliceLoading.value) return '手写身份切片仍在加载，确认可见后才能提交身份绑定。'
    if (bindIdentitySliceLoadFailed.value) return '手写身份切片加载失败，请刷新影像后重试身份绑定。'
    if (!bindIdentitySliceImageUrl.value) return '手写身份切片尚未显示，不能提交身份绑定。'
    if (bindSourcePageFileId.value) {
      if (bindSourcePageLoading.value) return '原始扫描页仍在加载，确认可见后才能提交身份绑定。'
      if (bindSourcePageLoadFailed.value) return '原始扫描页加载失败，请刷新影像后重试身份绑定。'
      if (!bindSourcePageImageUrl.value) return '原始扫描页尚未显示，不能提交身份绑定。'
    }
    return ''
  }
  if (bindSourcePageFileId.value) {
    if (bindSourcePageLoading.value) return '原始扫描页仍在加载，确认可见后才能提交身份绑定。'
    if (bindSourcePageLoadFailed.value) return '原始扫描页加载失败，请刷新影像后重试身份绑定。'
    if (!bindSourcePageImageUrl.value) return '原始扫描页尚未显示，不能提交身份绑定。'
  }
  return ''
})

const bindEvidenceTagLabel = computed(() => {
  if (bindIdentitySliceFileId.value && bindSourcePageFileId.value) return '双证据'
  if (bindIdentitySliceFileId.value) return '切片证据'
  if (bindSourcePageFileId.value) return '原页证据'
  return '名册人工确认'
})

const bindEvidenceTagTone = computed(() =>
  bindIdentitySliceFileId.value || bindSourcePageFileId.value ? 'blue' : 'orange',
)

const candidateOptions = computed(() =>
  candidates.value.map((item) => ({
    value: item.candidateRosterId,
    label: `${item.studentName}（${item.studentNo}）· ${candidateStatusLabel(item.status)}`,
    disabled: !isCandidateBindable(item),
  })),
)

/** 判断名册考生是否允许用于答卷身份绑定，缺考和状态异常必须在教师提交前阻断。 */
function isCandidateBindable(candidate: ExamCandidateResponse): boolean {
  return candidate.status === 'ACTIVE'
}

/** 输出名册状态文案，状态缺失或未知时显式暴露合同异常而不是默认按正常处理。 */
function candidateStatusLabel(status: CandidateStatusCode | undefined): string {
  if (!status || !CandidateStatusDescription[status]) {
    return '状态异常'
  }
  return CandidateStatusDescription[status]
}

function filterCandidate(input: string, option?: DefaultOptionType): boolean {
  const kw = input.trim().toLowerCase()
  if (!kw || !option) return true
  const candidate = candidates.value.find((item) => item.candidateRosterId === option.value)
  if (!candidate) return false
  return (
    (candidate.studentName ?? '').toLowerCase().includes(kw)
    || (candidate.studentNo ?? '').toLowerCase().includes(kw)
  )
}

/** 按名册绑定规则解析被教师选中的考生，不存在、缺考或状态异常时返回可展示的阻断原因。 */
function candidateBindingBlockReason(candidateRosterId: string | undefined): string {
  if (!candidateRosterId) {
    return '请从名册中选择正确考生'
  }
  const candidate = candidates.value.find((item) => item.candidateRosterId === candidateRosterId)
  if (!candidate) {
    return '所选考生不在当前考试名册中，请刷新名册后重试'
  }
  if (!isCandidateBindable(candidate)) {
    return `${candidate.studentName}（${candidate.studentNo}）当前状态为${candidateStatusLabel(candidate.status)}，不能绑定试卷`
  }
  return ''
}

async function ensureCandidatesLoaded(): Promise<boolean> {
  if (!selectedExamId.value) return false
  if (candidates.value.length > 0) {
    return true
  }
  candidatesLoading.value = true
  try {
    candidates.value = await listExamCandidates(selectedExamId.value)
    return true
  } catch (error) {
    showUserError(error, '考生名册加载失败')
    return false
  } finally {
    candidatesLoading.value = false
  }
}

function releaseBindIdentitySliceImage(): void {
  if (bindIdentitySliceImageUrl.value) {
    URL.revokeObjectURL(bindIdentitySliceImageUrl.value)
    bindIdentitySliceImageUrl.value = ''
  }
}

function releaseBindSourcePageImage(): void {
  if (bindSourcePageImageUrl.value) {
    URL.revokeObjectURL(bindSourcePageImageUrl.value)
    bindSourcePageImageUrl.value = ''
  }
}

async function loadBindIdentitySliceImage(): Promise<void> {
  releaseBindIdentitySliceImage()
  bindIdentitySliceLoadFailed.value = false
  if (!bindIdentitySliceFileId.value) {
    return
  }
  bindIdentitySliceLoading.value = true
  try {
    bindIdentitySliceImageUrl.value = await getImageBlobUrl(bindIdentitySliceFileId.value)
  } catch (error) {
    bindIdentitySliceLoadFailed.value = true
    showUserError(error, '手写身份切片加载失败')
  } finally {
    bindIdentitySliceLoading.value = false
  }
}

async function loadBindSourcePageImage(): Promise<void> {
  releaseBindSourcePageImage()
  bindSourcePageLoadFailed.value = false
  if (!bindSourcePageFileId.value) {
    return
  }
  bindSourcePageLoading.value = true
  try {
    bindSourcePageImageUrl.value = await getImageBlobUrl(bindSourcePageFileId.value)
  } catch (error) {
    bindSourcePageLoadFailed.value = true
    showUserError(error, '原始扫描页加载失败')
  } finally {
    bindSourcePageLoading.value = false
  }
}

function openBindDrawer(record: ScanAttentionItemResponse): void {
  if (!record.paperInstanceId || !record.scanBatchId) {
    message.warning('该异常缺少答题卡或扫描批次信息，无法进行身份绑定')
    return
  }
  bindForm.scanBatchId = record.scanBatchId
  bindForm.scanBatchDisplayName = record.scanBatchDisplayName ?? ''
  bindForm.paperInstanceId = record.paperInstanceId
  bindForm.paperDisplayName = record.paperDisplay.primaryText
  bindForm.recognizedStudentNo = record.studentNo?.trim() || ''
  bindForm.confirmedCandidateRosterId = undefined
  bindForm.attemptStatus = 'NORMAL'
  bindForm.attemptNo = ''
  bindIdentitySliceFileId.value = record.identitySliceFileId || ''
  bindSourcePageFileId.value = record.sourceScanPage?.fileId || ''
  bindDrawerOpen.value = true
  void loadBindIdentitySliceImage()
  void loadBindSourcePageImage()
  void ensureCandidatesLoaded()
}

async function handleBind(): Promise<void> {
  if (!selectedExamId.value) return
  if (!bindFormRef.value) return
  if (bindIdentityEvidenceBlockReason.value) {
    message.warning(bindIdentityEvidenceBlockReason.value)
    return
  }
  try {
    await bindFormRef.value.validate()
  } catch {
    return
  }
  const attemptStatus = bindForm.attemptStatus.trim()
  const validAttemptStatus = parseBindAttemptStatus(attemptStatus)
  if (!validAttemptStatus) {
    message.error('答卷状态只能选择普通答卷、补考答卷或重考答卷')
    return
  }
  const confirmedCandidateRosterId = bindForm.confirmedCandidateRosterId ?? ''
  const candidateBlockReason = candidateBindingBlockReason(confirmedCandidateRosterId)
  if (candidateBlockReason) {
    message.error(candidateBlockReason)
    return
  }
  binding.value = true
  try {
    await bindPaper({
      examId: selectedExamId.value,
      scanBatchId: bindForm.scanBatchId,
      paperInstanceId: bindForm.paperInstanceId,
      recognizedStudentNo: bindForm.recognizedStudentNo?.trim() || undefined,
      confirmedCandidateRosterId,
      attemptStatus: validAttemptStatus,
      attemptNo: bindForm.attemptNo?.trim() || undefined,
    })
    message.success('试卷身份绑定成功')
    bindDrawerOpen.value = false
    releaseBindIdentitySliceImage()
    releaseBindSourcePageImage()
    await loadAttentions()
    await syncScanWorkbenchState()
  } catch (error) {
    showUserError(error, '试卷身份绑定失败')
  } finally {
    binding.value = false
  }
}

// ─── 详情弹窗 ────────────────────────────────────
const detailDrawerOpen = ref(false)
const detailRecord = ref<ScanAttentionItemResponse | null>(null)

function openDetail(record: ScanAttentionItemResponse): void {
  detailRecord.value = record
  detailDrawerOpen.value = true
}

// ─── 行选择与批量绑定 ─────────────────────────────
const selectedRowKeys = ref<string[]>([])
const batchBinding = ref(false)
const batchBindDrawerOpen = ref(false)
const batchBindResult = ref<ExamPaperBatchBindResponse | null>(null)
type BatchBindAttemptStatus = 'NORMAL' | 'MAKEUP' | 'RETAKE'

const batchAttemptStatusOptions: Array<{ label: string, value: BatchBindAttemptStatus }> = [
  { label: '普通答卷', value: 'NORMAL' },
  { label: '补考答卷', value: 'MAKEUP' },
  { label: '重考答卷', value: 'RETAKE' },
]

function parseBindAttemptStatus(value: string): BatchBindAttemptStatus | null {
  if (value === 'NORMAL' || value === 'MAKEUP' || value === 'RETAKE') {
    return value
  }
  return null
}

/** 将扫描异常诊断转为教师可执行的处置提示，避免展示接口、字段或识别链路内部细节。 */
function scanAttentionDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    '扫描异常需要人工核对，请根据异常类型补充绑定或重新扫描',
  )
}

const batchBindRows = ref<
  Array<{
    attentionId: string
    scanBatchId: string
    scanBatchDisplayName: string
    paperInstanceId: string
    paperDisplayName: string
    recognizedStudentNo?: string
    confirmedCandidateRosterId?: string
    attemptStatus: BatchBindAttemptStatus
    attemptNo?: string
    diagnostic?: string
  }>
>([])

const batchBindFailedItems = computed(() =>
  batchBindResult.value ? batchBindResult.value.items.filter((item) => !item.success) : [],
)

const batchBindRowDisplayNameMap = computed(
  () => new Map(batchBindRows.value.map((item) => [item.paperInstanceId, item.paperDisplayName])),
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String)
  },
  getCheckboxProps: (record: ScanAttentionItemResponse) => ({
    disabled:
      record.attentionType !== 'BINDING_CONFLICT'
      || !record.paperInstanceId
      || !record.scanBatchId,
  }),
}))

async function handleBatchBind(): Promise<void> {
  if (!selectedExamId.value) {
    message.error('请先选择考试')
    return
  }
  const selected = attentions.value.filter(
    (item) =>
      selectedRowKeys.value.includes(item.id)
      && item.attentionType === 'BINDING_CONFLICT'
      && item.paperInstanceId
      && item.scanBatchId,
  )
  if (selected.length === 0) {
    message.error('请选择可身份绑定的绑定冲突异常项')
    return
  }
  const scanBatchIds = new Set(selected.map((item) => item.scanBatchId))
  if (scanBatchIds.size !== 1) {
    message.error('批量绑定必须选择同一扫描批次内的试卷')
    return
  }
  const candidatesReady = await ensureCandidatesLoaded()
  if (!candidatesReady) {
    return
  }
  if (candidates.value.length === 0) {
    message.error('当前考试无考生名册，无法绑定')
    return
  }
  batchBindResult.value = null
  batchBindRows.value = selected.map((item) => ({
    attentionId: item.id,
    scanBatchId: item.scanBatchId!,
    scanBatchDisplayName: item.scanBatchDisplayName,
    paperInstanceId: item.paperInstanceId!,
    paperDisplayName: item.paperDisplay.primaryText,
    recognizedStudentNo: item.studentNo?.trim() || '',
    confirmedCandidateRosterId: undefined,
    attemptStatus: 'NORMAL',
    attemptNo: '',
    diagnostic: item.diagnostic,
  }))
  batchBindDrawerOpen.value = true
}

function closeBatchBindDrawer(): void {
  if (batchBinding.value) return
  batchBindDrawerOpen.value = false
  batchBindRows.value = []
  batchBindResult.value = null
}

async function submitBatchBind(): Promise<void> {
  if (!selectedExamId.value) {
    message.error('请先选择考试')
    return
  }
  if (batchBindRows.value.length === 0) {
    message.error('没有可提交的批量绑定项')
    return
  }
  const missing = batchBindRows.value.find((item) => !item.confirmedCandidateRosterId)
  if (missing) {
    message.error(`${missing.paperDisplayName} 尚未选择考生`)
    return
  }
  const blockedCandidateRow = batchBindRows.value.find(
    (item) => candidateBindingBlockReason(item.confirmedCandidateRosterId),
  )
  if (blockedCandidateRow) {
    const blockReason = candidateBindingBlockReason(blockedCandidateRow.confirmedCandidateRosterId)
    message.error(`${blockedCandidateRow.paperDisplayName}：${blockReason}`)
    return
  }
  const invalidAttemptStatus = batchBindRows.value.find(
    (item) => !parseBindAttemptStatus(item.attemptStatus),
  )
  if (invalidAttemptStatus) {
    message.error(`${invalidAttemptStatus.paperDisplayName} 的作答状态无效`)
    return
  }
  const scanBatchIds = new Set(batchBindRows.value.map((item) => item.scanBatchId))
  if (scanBatchIds.size !== 1) {
    message.error('批量绑定必须选择同一扫描批次内的试卷')
    return
  }
  batchBinding.value = true
  batchBindResult.value = null
  try {
    const result = await batchBindPapers({
      examId: selectedExamId.value,
      scanBatchId: batchBindRows.value[0].scanBatchId,
      items: batchBindRows.value.map((item) => ({
        paperInstanceId: item.paperInstanceId,
        recognizedStudentNo: item.recognizedStudentNo?.trim() || undefined,
        confirmedCandidateRosterId: item.confirmedCandidateRosterId!,
        attemptStatus: parseBindAttemptStatus(item.attemptStatus)!,
        attemptNo: item.attemptNo?.trim() || undefined,
      })),
    })
    batchBindResult.value = result
    message.success(`批量绑定：成功 ${result.successCount} 条，失败 ${result.failureCount} 条`)
    await loadAttentions()
    await syncScanWorkbenchState()
    if (result.failureCount === 0) {
      selectedRowKeys.value = []
      batchBindRows.value = []
      batchBindDrawerOpen.value = false
    }
  } catch (error) {
    showUserError(error, '批量绑定失败')
  } finally {
    batchBinding.value = false
  }
}

// ─── 初始化 ─────────────────────────────────────

watch(selectedExamId, (value) => {
  // 切换考试需要重置名册缓存
  candidates.value = []
  scanBatches.value = []
  scanBatchKeyword.value = ''
  paperCandidates.value = []
  paperCandidateKeyword.value = ''
  attentions.value = []
  selectedRowKeys.value = []
  attentionPagination.current = 1
  attentionPagination.total = 0
  abnormalAttentionTotal.value = 0
  duplicateAttentionTotal.value = 0
  filterForm.attentionType = ''
  filterForm.scanBatchId = ''
  filterForm.paperInstanceId = ''
  filterForm.eventKeyword = ''
  filterForm.batchStatus = undefined
  filterForm.monitorDeviceId = ''
  monitorBatches.value = []
  monitorBatchPagination.current = 1
  monitorBatchPagination.total = 0
  bindIdentitySliceFileId.value = ''
  bindSourcePageFileId.value = ''
  releaseBindIdentitySliceImage()
  releaseBindSourcePageImage()
  bindIdentitySliceLoadFailed.value = false
  bindSourcePageLoadFailed.value = false
  batchBindResult.value = null
  scanMonitorPanel.value = null
  scanMonitorPanelLoadFailed.value = false
  if (value) {
    void loadScanOverview(value)
    void loadScanBatches()
    void loadPaperCandidates()
    void loadAttentions()
    void loadConnectedScannerDevices()
    startMonitorFallbackPolling()
    void scanLiveStream.start()
    if (activeTab.value === 'normal') {
      void loadMonitorBatches()
    }
  } else {
    stopMonitorFallbackPolling()
    scanLiveStream.stop()
    scannerDevices.value = []
    attentions.value = []
  }
}, { immediate: true })

watch(() => filterForm.monitorDeviceId, (deviceId, previousDeviceId) => {
  if (!selectedExamId.value || activeTab.value !== 'normal') return
  if (deviceId !== previousDeviceId) {
    applyNormalFilters()
  }
})

watch(activeTab, (value) => {
  attentionPagination.current = 1
  attentionPagination.total = 0
  selectedRowKeys.value = []
  attentions.value = []
  if (value !== 'abnormal') {
    filterForm.attentionType = ''
  }
  if (value === 'normal') {
    startMonitorFallbackPolling()
    void loadConnectedScannerDevices()
    void loadMonitorBatches()
    return
  }
  startMonitorFallbackPolling()
  void loadAttentions()
  if (!isScanLiveStreamReady()) {
    tickMonitorFallbackPoll()
  }
})

watch(
  () => scanLiveStream.connectionPhase.value,
  () => {
    if (!selectedExamId.value || !isAttentionMonitorTab()) {
      return
    }
    startMonitorFallbackPolling()
    if (!isScanLiveStreamReady()) {
      tickMonitorFallbackPoll()
    }
  },
)

watch(bindDrawerOpen, (open) => {
  if (!open) {
    bindIdentitySliceFileId.value = ''
    bindSourcePageFileId.value = ''
    bindIdentitySliceLoadFailed.value = false
    bindSourcePageLoadFailed.value = false
    releaseBindIdentitySliceImage()
    releaseBindSourcePageImage()
  }
})

function onWorkbenchRefresh(): void {
  if (selectedExamId.value) {
    void handleRefresh()
  }
}

onMounted(() => {
  syncActiveTabFromRoute()
  mittBus.on('scan-workbench:refresh', onWorkbenchRefresh)
})

watch(
  () => route.query.tab,
  () => {
    syncActiveTabFromRoute()
  },
)

onBeforeUnmount(() => {
  mittBus.off('scan-workbench:refresh', onWorkbenchRefresh)
  stopMonitorFallbackPolling()
  scanLiveStream.stop()
  if (monitorBatchReloadTimer) {
    clearTimeout(monitorBatchReloadTimer)
  }
  releaseBindIdentitySliceImage()
  releaseBindSourcePageImage()
})
</script>

<style lang="scss" scoped>
.scan-monitor {
  &__exam-select {
    width: 280px;
  }

  &__devices {
    margin-bottom: var(--dp-space-4, 16px);
  }

  &__stats {
    min-width: 0;
  }

  &__chart-card {
    min-width: 0;
  }

  &__health-card {
    margin-bottom: var(--dp-space-4, 16px);
    max-width: 320px;
    min-width: 0;
    display: flex;
    align-items: stretch;
  }

  &__health-card :deep(.dp-card__body) {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 14px 16px;
  }

  &__health-card :deep(.mark-gauge-block) {
    width: 100%;
  }

  &__connection--pulse {
    animation: scan-monitor-connection-pulse 1.6s ease-in-out infinite;
  }

  &__health-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
  }

  &__tabs {
    margin-top: 0;
    padding: 16px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: var(--dp-radius-panel, 8px);
    background: var(--dp-surface, #fff);
  }

  &__panel-alert {
    margin-bottom: var(--dp-space-4, 16px);
  }

  &__flow-hint {
    width: 100%;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
    line-height: 1.5;
  }

  &__normal-panel,
  &__attention-panel {
    min-height: 280px;
  }

  @media (max-width: 900px) {
    &__overview {
      grid-template-columns: 1fr;
    }
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__panel-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__filter-form {
    margin: 0;

    :deep(.ant-form-item) {
      margin-inline-end: 16px;
      margin-bottom: 8px;
    }
  }

  &__filter-input {
    width: 200px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__source-cell {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }

  &__diagnostic-text {
    margin: 0;
    font-size: 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--dp-text-primary, #0f172a);
  }

  &__identity-evidence {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
    padding: 16px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface-subtle, #f8fafc);
  }

  &__identity-evidence-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  &__identity-evidence-title {
    margin: 0;
    color: var(--dp-text-primary, #0f172a);
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
  }

  &__identity-evidence-subtitle {
    margin: 4px 0 0;
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
    line-height: 1.5;
  }

  &__identity-skeleton {
    padding: 8px 0;
  }

  &__identity-compare {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 12px;
  }

  &__identity-pane {
    min-width: 0;
  }

  &__identity-pane-title {
    margin-bottom: 8px;
    color: var(--dp-text-primary, #0f172a);
    font-size: 13px;
    font-weight: 600;
  }

  &__identity-image-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    min-height: 200px;
    max-height: 360px;
    padding: 12px;
    border: 1px solid var(--scan-canvas-border, #dde2ea);
    border-radius: 6px;
    background: var(--scan-canvas-bg, #f1f3f7);
  }

  &__identity-image {
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 336px;
    object-fit: contain;
    background: #fff;
    box-shadow: var(--scan-paper-shadow, 0 6px 24px rgba(15, 23, 42, 0.12));
  }

  &__identity-empty {
    padding: 16px 0;
    background: var(--dp-surface, #fff);
    border: 1px dashed var(--dp-border, #e2e8f0);
    border-radius: 6px;
  }

  &__batch-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__batch-row {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) minmax(360px, 1.4fr);
    gap: 16px;
    padding: 12px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface, #fff);
  }

  &__batch-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__batch-diagnostic {
    color: var(--dp-text-secondary, #475569);
    font-size: 12px;
    line-height: 1.5;
    word-break: break-all;
  }

  &__batch-form {
    display: grid;
    grid-template-columns: minmax(140px, 0.8fr) minmax(220px, 1.2fr);
    gap: 12px;
    align-items: start;
  }

  &__batch-input,
  &__batch-candidate,
  &__batch-attempt-status,
  &__batch-attempt-no {
    width: 100%;
  }

  @media (max-width: 900px) {
    &__batch-row,
    &__batch-form,
    &__identity-compare {
      grid-template-columns: 1fr;
    }
  }
}

@keyframes scan-monitor-connection-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}
</style>
