<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="scan-attention__context">
        <div class="scan-attention__context-info">
          <h2 class="scan-attention__title">阅卷交付 - 扫描异常队列</h2>
          <a-select
            :value="selectedExamId"
            class="scan-attention__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
        </div>
        <div class="scan-attention__context-actions">
          <UiTag :tone="attentions.length > 0 ? 'red' : 'green'" size="sm">
            {{ attentions.length > 0 ? `${attentions.length} 条未闭合` : '当前无异常' }}
          </UiTag>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadAttentions"
          >
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看异常待办"
      class="scan-attention__empty"
    />

    <template v-else>
      <!-- 概览：KPI + 类型分布 -->
      <div class="scan-attention__overview">
        <UiStatPanel
          title="异常概览"
          :items="statPanelMetrics"
          :columns="4"
          variant="grid"
          compact
          class="scan-attention__stats"
        />
        <a-card :bordered="false" size="small" class="scan-attention__chart-card">
          <UiDonutChart
            :items="donutItems"
            center-label="异常总数"
            :center-value="attentions.length"
            :size="160"
            :stroke-width="14"
          />
        </a-card>
      </div>

      <section class="scan-attention__panel">
        <header class="scan-attention__panel-header">
          <h3 class="scan-attention__panel-title">筛选条件</h3>
        </header>
        <a-form
          layout="inline"
          :model="filterForm"
          class="scan-attention__filter-form"
          @submit.prevent="loadAttentions"
        >
          <a-form-item label="异常类型">
            <a-select
              v-model:value="filterForm.attentionType"
              placeholder="全部异常"
              :options="attentionTypeOptions"
              allow-clear
              class="scan-attention__type-select"
              @change="onAttentionTypeChange"
            />
          </a-form-item>
          <a-form-item label="扫描批次">
            <a-select
              v-model:value="filterForm.scanBatchId"
              placeholder="选择扫描批次"
              :options="scanBatchOptions"
              :loading="scanBatchesLoading"
              show-search
              option-filter-prop="label"
              allow-clear
              class="scan-attention__filter-select"
              @change="loadAttentions"
            />
          </a-form-item>
          <a-form-item label="答题卡">
            <a-select
              v-model:value="filterForm.paperInstanceId"
              placeholder="选择答题卡"
              :options="paperCandidateOptions"
              :loading="paperCandidatesLoading"
              show-search
              option-filter-prop="label"
              allow-clear
              class="scan-attention__filter-select"
              @change="loadAttentions"
            />
          </a-form-item>
          <a-form-item>
            <a-space>
              <UiButton size="sm" :loading="loading" @click="loadAttentions"> 查询 </UiButton>
              <UiButton size="sm" variant="outline" @click="resetFilter"> 重置 </UiButton>
            </a-space>
          </a-form-item>
        </a-form>
      </section>

      <section class="scan-attention__panel">
        <header class="scan-attention__panel-header">
          <h3 class="scan-attention__panel-title">异常待办列表</h3>
          <span class="scan-attention__panel-meta"> 共 {{ attentions.length }} 条 </span>
        </header>
        <!-- D-9 错误态：扫描异常列表加载失败时提供重试 + 上报入口 -->
        <UiErrorRetryPanel
          v-if="attentionsLoadError"
          :error="attentionsLoadError"
          title="扫描异常列表加载失败"
          :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
          compact
          @retry="loadAttentions"
        />
        <UiDataTable
          v-else
          :columns="columns"
          :data-source="attentions"
          :loading="loading"
          row-key="id"
          :enable-selection="true"
          :selected-row-keys="selectedRowKeys"
          :show-pagination="false"
          flat
          empty-title="当前无异常"
          empty-description="当前筛选条件下没有异常待办"
          v-bind="{ rowSelection }"
        >
          <template #toolbar-right>
            <UiButton
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
              <div class="scan-attention__source-cell">
                <span>
                  <b>{{ sourceTypeLabel(record.sourceType) }}</b>
                </span>
                <span class="scan-attention__hint">{{ record.sourceDisplayName }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'scanBatch'">
              <span>{{ record.scanBatchDisplayName }}</span>
            </template>
            <template v-else-if="column.key === 'paperDisplay'">
              <div class="scan-attention__paper-cell">
                <span>{{ record.paperDisplay.primaryText }}</span>
                <span v-if="record.paperDisplay.secondaryText" class="scan-attention__hint">
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
              <a-space>
                <UiButton
                  v-if="record.attentionType === 'RECOGNITION_REVIEW'"
                  size="sm"
                  :disabled="!record.paperInstanceId || !record.scanBatchId"
                  @click="openBindDrawer(record)"
                >
                  身份绑定
                </UiButton>
                <UiButton v-else size="sm" @click="openLedger">处置入口</UiButton>
                <UiButton
                  v-if="record.sourceType === 'SCANNED_PAGE' && record.pageId"
                  size="sm"
                  tone="danger"
                  variant="outline"
                  :loading="pageDiscarding === record.pageId"
                  title="将该扫描页标记为废弃，不影响所属批次"
                  @click="onDiscardPage(record)"
                >
                  废弃此页
                </UiButton>
                <UiButton size="sm" variant="ghost" @click="openDetail(record)">详情</UiButton>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </section>
    </template>

    <!-- 身份绑定抽屉 -->
    <UiDrawer
      :open="bindDrawerOpen"
      title="试卷身份绑定"
      :width="560"
      :confirm-loading="binding"
      @update:open="(v: boolean) => (bindDrawerOpen = v)"
      @close="bindDrawerOpen = false"
      @confirm="handleBind"
    >
      <a-form ref="bindFormRef" :model="bindForm" :rules="bindFormRules" layout="vertical">
        <UiAlertStrip
          tone="warning"
          title="操作提示"
          description="请从考生名册中选择正确的考生并提交绑定。绑定后将自动完成该试卷与考生的身份关联。"
          dense
          class="scan-attention__bind-alert"
        />
        <UiErrorRetryPanel
          v-if="candidatesLoadError"
          :error="candidatesLoadError"
          title="考生名册加载失败"
          compact
          class="scan-attention__bind-alert"
          @retry="retryLoadCandidates"
        />
        <UiAlertStrip
          v-if="bindSubmitError"
          tone="error"
          title="试卷身份绑定失败"
          :description="bindSubmitError"
          dense
          class="scan-attention__bind-alert"
        />
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
      @update:open="(v: boolean) => (batchBindDrawerOpen = v)"
      @close="closeBatchBindDrawer"
      @confirm="submitBatchBind"
    >
      <UiAlertStrip
        tone="warning"
        title="逐卷确认"
        description="批量绑定会直接写入试卷与考生名册关系，请逐张卷面选择正确考生后提交。"
        dense
        class="scan-attention__bind-alert"
      />
      <UiErrorRetryPanel
        v-if="candidatesLoadError"
        :error="candidatesLoadError"
        title="考生名册加载失败"
        compact
        class="scan-attention__bind-alert"
        @retry="retryLoadCandidates"
      />
      <UiAlertStrip
        v-if="batchBindError"
        tone="error"
        title="批量身份绑定失败"
        :description="batchBindError"
        dense
        class="scan-attention__bind-alert"
      />
      <div v-if="batchBindResult" class="scan-attention__batch-result">
        <UiAlertStrip
          :tone="batchBindResult.failureCount > 0 ? 'warning' : 'success'"
          title="批量绑定结果"
          :description="`成功 ${batchBindResult.successCount} 条，失败 ${batchBindResult.failureCount} 条`"
          dense
        />
        <div v-if="batchBindFailedItems.length > 0" class="scan-attention__batch-failures">
          <div
            v-for="item in batchBindFailedItems"
            :key="item.paperInstanceId"
            class="scan-attention__batch-failure"
          >
            <a-typography-text
              strong
              :content="batchBindRowDisplayNameMap.get(item.paperInstanceId)"
            />
            <span>{{ item.errorMessage }}</span>
          </div>
        </div>
      </div>
      <div class="scan-attention__batch-list">
        <div v-for="row in batchBindRows" :key="row.attentionId" class="scan-attention__batch-row">
          <div class="scan-attention__batch-main">
            <a-typography-text strong :content="row.paperDisplayName" />
            <span class="scan-attention__hint">{{ row.scanBatchDisplayName }}</span>
            <span v-if="row.diagnostic" class="scan-attention__batch-diagnostic">
              {{ scanAttentionDiagnosticText(row.diagnostic) }}
            </span>
          </div>
          <div class="scan-attention__batch-form">
            <a-input
              v-model:value="row.recognizedStudentNo"
              placeholder="识别学号"
              :maxlength="64"
              class="scan-attention__batch-input"
            />
            <a-select
              v-model:value="row.confirmedCandidateRosterId"
              placeholder="选择正确考生"
              show-search
              :options="candidateOptions"
              :filter-option="filterCandidate"
              :loading="candidatesLoading"
              class="scan-attention__batch-candidate"
              allow-clear
            />
            <a-select
              v-model:value="row.attemptStatus"
              placeholder="作答状态"
              :options="batchAttemptStatusOptions"
              class="scan-attention__batch-attempt-status"
            />
            <a-input
              v-model:value="row.attemptNo"
              placeholder="答卷编号（可选）"
              :maxlength="32"
              class="scan-attention__batch-attempt-no"
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
        <a-descriptions-item label="当前考试">{{ selectedExamLabel }}</a-descriptions-item>
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
          <div class="scan-attention__diagnostic-text">
            {{ scanAttentionDiagnosticText(detailRecord.diagnostic) }}
          </div>
        </a-descriptions-item>
        <a-descriptions-item label="更新时间">
          {{ formatDateTimeWithSeconds(detailRecord.updateTime) }}
        </a-descriptions-item>
      </a-descriptions>
    </UiDrawer>

    <a-modal
      v-model:open="pageDiscardModalOpen"
      title="废弃扫描页"
      ok-text="废弃"
      ok-type="danger"
      cancel-text="取消"
      :confirm-loading="Boolean(pageDiscarding)"
      @ok="confirmDiscardPage"
      @cancel="closePageDiscardModal"
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
      <UiAlertStrip
        v-if="pageDiscardError"
        tone="error"
        title="扫描页废弃失败"
        :description="pageDiscardError"
        dense
      />
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
/**
 * 阅卷交付 - 扫描异常队列
 *
 * 后端契约：
 * - listScanAttentions(examId, attentionType?, scanBatchId?, paperInstanceId?)
 * - bindPaper(...)、batchBindPapers(...)、listExamCandidates(examId)
 *
 * attentionType 枚举：QUALITY_BLOCK / PROCESSING_BLOCK / DUPLICATE_PENDING / RECOGNITION_REVIEW
 */
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { DefaultOptionType } from 'ant-design-vue/es/select'
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  DuplicateResolutionStatusCode,
  ExamCandidateVO,
  ExamScannerBatchVO,
  ExamScoreSummaryItemVO,
  QualityDecisionCode,
  ScanAttentionItemVO,
  ScanAttentionSourceTypeCode,
  ScanAttentionTypeCode,
  TaskStatusCode,
} from '@/apis/mark/exam'
import type { ExamPaperBatchBindResultVO } from '@/apis/mark/exam-mark-scanner'
import type { GradeStatusCode } from '@/apis/mark/student-exam'
import type { BadgeTone, UiChartSliceItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  bindPaper,
  FINAL_SCORE_STATUS_LABEL,
  listExamCandidates,
  listScanAttentions,
  pageExamScoreSummary,
  pageScannerBatches,
  SCAN_BATCH_STATUS_LABEL,
} from '@/apis/mark/exam'
import { batchBindPapers } from '@/apis/mark/exam-mark-scanner'
import { discardScannedPage } from '@/apis/mark/scanner-kiosk'
import {
  UiAlertStrip,
  UiButton,
  UiDataTable,
  UiDonutChart,
  UiDrawer,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScanAttention' })

const router = useRouter()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 列表筛选 + 数据 ─────────────────────────────
const filterForm = reactive<{
  attentionType?: ScanAttentionTypeCode | ''
  scanBatchId?: string
  paperInstanceId?: string
}>({
  attentionType: '',
  scanBatchId: '',
  paperInstanceId: '',
})

const attentions = ref<ScanAttentionItemVO[]>([])
const loading = ref(false)
// D-9 错误态：扫描异常列表加载失败时 UiErrorRetryPanel 重试 + 上报
const attentionsLoadError = ref<Error | null>(null)
const scanBatches = ref<ExamScannerBatchVO[]>([])
const scanBatchesLoading = ref(false)
const paperCandidates = ref<ExamScoreSummaryItemVO[]>([])
const paperCandidatesLoading = ref(false)
const scanBatchOptions = computed(() =>
  scanBatches.value.map((item) => ({
    value: item.scanBatchId,
    label: [
      item.batchNo || item.batchExternalNo || item.statusMessage,
      scanBatchStatusLabel(item),
      `${item.pageCount ?? 0} 页`,
    ].join(' · '),
  })),
)
const paperCandidateOptions = computed(() =>
  paperCandidates.value
    .filter((item) => item.paperInstanceId)
    .map((item) => ({
      value: item.paperInstanceId,
      label: [
        `${item.studentName}（${item.studentNo}）`,
        item.studentClassName,
        item.bindingStatus,
        finalScoreStatusLabel(item.finalScoreStatus),
      ]
        .filter(Boolean)
        .join(' · '),
    })),
)

const attentionTypeOptions: { label: string, value: ScanAttentionTypeCode }[] = [
  { label: '质量阻断', value: 'QUALITY_BLOCK' },
  { label: '处理阻断', value: 'PROCESSING_BLOCK' },
  { label: '重复影像', value: 'DUPLICATE_PENDING' },
  { label: '识别复核', value: 'RECOGNITION_REVIEW' },
]

function scanBatchStatusLabel(batch: ExamScannerBatchVO): string {
  return strictEnumLabel(SCAN_BATCH_STATUS_LABEL, batch.status, '扫描批次状态')
}

function finalScoreStatusLabel(status: ExamScoreSummaryItemVO['finalScoreStatus']): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, status, '最终成绩状态')
}

const columns: ColumnType<ScanAttentionItemVO>[] = [
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
  if (!selectedExamId.value) return
  loading.value = true
  attentionsLoadError.value = null
  try {
    const result = await listScanAttentions({
      examId: selectedExamId.value,
      attentionType: filterForm.attentionType || undefined,
      scanBatchId: filterForm.scanBatchId?.trim() || undefined,
      paperInstanceId: filterForm.paperInstanceId?.trim() || undefined,
    })
    if (!Array.isArray(result)) {
      const error = new TypeError('扫描异常列表接口返回格式错误')
      attentionsLoadError.value = toUserError(error, '扫描异常列表加载失败')
      showUserError(error, '扫描异常列表加载失败')
      return
    }
    attentions.value = result
  } catch (error) {
    attentionsLoadError.value = toUserError(error, '扫描异常列表加载失败')
    showUserError(error, '扫描异常列表加载失败')
  } finally {
    loading.value = false
  }
}

function onAttentionTypeChange(): void {
  void loadAttentions()
}

async function loadScanBatches(): Promise<void> {
  if (!selectedExamId.value) {
    scanBatches.value = []
    return
  }
  scanBatchesLoading.value = true
  try {
    const result = await pageScannerBatches({
      examId: selectedExamId.value,
      pageNum: 1,
      pageSize: 200,
      includeDiscarded: false,
    })
    scanBatches.value = result.list
  } catch (error) {
    scanBatches.value = []
    showUserError(error, '扫描批次加载失败')
  } finally {
    scanBatchesLoading.value = false
  }
}

async function loadPaperCandidates(): Promise<void> {
  if (!selectedExamId.value) {
    paperCandidates.value = []
    return
  }
  paperCandidatesLoading.value = true
  try {
    const result = await pageExamScoreSummary({
      examId: selectedExamId.value,
      pageNum: 1,
      pageSize: 500,
    })
    paperCandidates.value = result.list.filter((item) => item.paperInstanceId)
  } catch (error) {
    paperCandidates.value = []
    showUserError(error, '答题卡列表加载失败')
  } finally {
    paperCandidatesLoading.value = false
  }
}

// ─── 类型色彩编码 ─────────────────────────────────
const ATTENTION_TYPE_TONE: Record<ScanAttentionTypeCode, 'red' | 'orange' | 'purple' | 'blue'> = {
  QUALITY_BLOCK: 'red',
  PROCESSING_BLOCK: 'orange',
  DUPLICATE_PENDING: 'purple',
  RECOGNITION_REVIEW: 'blue',
}

const ATTENTION_TYPE_LABEL: Record<ScanAttentionTypeCode, string> = {
  QUALITY_BLOCK: '质量阻断',
  PROCESSING_BLOCK: '处理阻断',
  DUPLICATE_PENDING: '重复影像',
  RECOGNITION_REVIEW: '识别复核',
}

function attentionTypeTone(type: ScanAttentionTypeCode): 'red' | 'orange' | 'purple' | 'blue' {
  return strictEnumTone(ATTENTION_TYPE_TONE, type, '扫描异常类型')
}

function attentionTypeLabel(type: ScanAttentionTypeCode): string {
  return strictEnumLabel(ATTENTION_TYPE_LABEL, type, '扫描异常类型')
}

const SCAN_ATTENTION_SOURCE_TYPE_LABEL: Record<ScanAttentionSourceTypeCode, string> = {
  SCANNED_PAGE: '扫描页',
  PROCESSING_TASK: '处理任务',
  DUPLICATE_RESOLUTION: '重复扫描处置',
  GRADE_RESULT: '批改结果',
}

function sourceTypeLabel(type: ScanAttentionSourceTypeCode): string {
  return strictEnumLabel(SCAN_ATTENTION_SOURCE_TYPE_LABEL, type, '扫描异常来源类型')
}

function assertNeverScanAttentionType(type: never): never {
  throw new Error(`扫描异常类型前后端合同不一致：${type}`)
}

const QUALITY_DECISION_LABEL: Record<QualityDecisionCode, string> = {
  PASS: '质量通过',
  BLOCKED: '已阻断',
}

const QUALITY_DECISION_TONE: Record<QualityDecisionCode, BadgeTone> = {
  PASS: 'green',
  BLOCKED: 'red',
}

const TASK_STATUS_LABEL: Record<TaskStatusCode, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  COMPLETED: '已完成',
  BLOCKED: '已阻断',
  FAILED: '处理失败',
}

const TASK_STATUS_TONE: Record<TaskStatusCode, BadgeTone> = {
  PENDING: 'orange',
  PROCESSING: 'blue',
  COMPLETED: 'green',
  BLOCKED: 'red',
  FAILED: 'red',
}

const DUPLICATE_RESOLUTION_STATUS_LABEL: Record<DuplicateResolutionStatusCode, string> = {
  PENDING: '待处置',
  RESOLVED: '已处置',
}

const DUPLICATE_RESOLUTION_STATUS_TONE: Record<DuplicateResolutionStatusCode, BadgeTone> = {
  PENDING: 'orange',
  RESOLVED: 'green',
}

const GRADE_STATUS_LABEL: Record<GradeStatusCode, string> = {
  PENDING: '待批改',
  NEED_REVIEW: '待复核',
  CONFIRMED: '已确认',
}

const GRADE_STATUS_TONE: Record<GradeStatusCode, BadgeTone> = {
  PENDING: 'orange',
  NEED_REVIEW: 'blue',
  CONFIRMED: 'green',
}

function scanAttentionStatusLabel(record: ScanAttentionItemVO): string {
  switch (record.attentionType) {
    case 'QUALITY_BLOCK':
      return strictEnumLabel(QUALITY_DECISION_LABEL, record.qualityDecision, '扫描页质量判定')
    case 'PROCESSING_BLOCK':
      return strictEnumLabel(TASK_STATUS_LABEL, record.processingStatus, '处理任务状态')
    case 'DUPLICATE_PENDING':
      return strictEnumLabel(
        DUPLICATE_RESOLUTION_STATUS_LABEL,
        record.duplicateResolutionStatus,
        '重复影像处置状态',
      )
    case 'RECOGNITION_REVIEW':
      return strictEnumLabel(GRADE_STATUS_LABEL, record.gradeStatus, '题目批改状态')
    default:
      return assertNeverScanAttentionType(record.attentionType)
  }
}

function scanAttentionStatusTone(record: ScanAttentionItemVO): BadgeTone {
  switch (record.attentionType) {
    case 'QUALITY_BLOCK':
      return strictEnumTone(QUALITY_DECISION_TONE, record.qualityDecision, '扫描页质量判定')
    case 'PROCESSING_BLOCK':
      return strictEnumTone(TASK_STATUS_TONE, record.processingStatus, '处理任务状态')
    case 'DUPLICATE_PENDING':
      return strictEnumTone(
        DUPLICATE_RESOLUTION_STATUS_TONE,
        record.duplicateResolutionStatus,
        '重复影像处置状态',
      )
    case 'RECOGNITION_REVIEW':
      return strictEnumTone(GRADE_STATUS_TONE, record.gradeStatus, '题目批改状态')
    default:
      return assertNeverScanAttentionType(record.attentionType)
  }
}

const typeCounts = computed(() => {
  const counts: Record<string, number> = {
    QUALITY_BLOCK: 0,
    PROCESSING_BLOCK: 0,
    DUPLICATE_PENDING: 0,
    RECOGNITION_REVIEW: 0,
  }
  for (const a of attentions.value) {
    counts[a.attentionType] += 1
  }
  return counts
})

const statPanelMetrics = computed(() => [
  {
    label: '质量阻断',
    value: typeCounts.value.QUALITY_BLOCK,
    unit: '条',
    tone: typeCounts.value.QUALITY_BLOCK > 0 ? ('red' as const) : ('gray' as const),
  },
  {
    label: '处理阻断',
    value: typeCounts.value.PROCESSING_BLOCK,
    unit: '条',
    tone: typeCounts.value.PROCESSING_BLOCK > 0 ? ('orange' as const) : ('gray' as const),
  },
  {
    label: '重复影像',
    value: typeCounts.value.DUPLICATE_PENDING,
    unit: '条',
    tone: typeCounts.value.DUPLICATE_PENDING > 0 ? ('purple' as const) : ('gray' as const),
  },
  {
    label: '识别复核',
    value: typeCounts.value.RECOGNITION_REVIEW,
    unit: '条',
    tone: typeCounts.value.RECOGNITION_REVIEW > 0 ? ('blue' as const) : ('gray' as const),
  },
])

const donutItems = computed<UiChartSliceItem[]>(() => [
  { key: 'quality', label: '质量阻断', value: typeCounts.value.QUALITY_BLOCK, tone: 'red' },
  {
    key: 'processing',
    label: '处理阻断',
    value: typeCounts.value.PROCESSING_BLOCK,
    tone: 'orange',
  },
  {
    key: 'duplicate',
    label: '重复影像',
    value: typeCounts.value.DUPLICATE_PENDING,
    tone: 'purple',
  },
  {
    key: 'recognition',
    label: '识别复核',
    value: typeCounts.value.RECOGNITION_REVIEW,
    tone: 'blue',
  },
])

function resetFilter(): void {
  filterForm.attentionType = ''
  filterForm.scanBatchId = ''
  filterForm.paperInstanceId = ''
  void loadAttentions()
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
const pageDiscardTarget = ref<ScanAttentionItemVO | null>(null)
const pageDiscardReason = ref('')
const pageDiscardReasonError = ref('')
const pageDiscardError = ref('')
async function onDiscardPage(record: ScanAttentionItemVO): Promise<void> {
  if (record.sourceType !== 'SCANNED_PAGE' || !record.pageId) {
    message.warning('该异常不是扫描页来源，无法废弃')
    return
  }
  pageDiscardTarget.value = record
  pageDiscardReason.value = ''
  pageDiscardReasonError.value = ''
  pageDiscardError.value = ''
  pageDiscardModalOpen.value = true
}

function closePageDiscardModal(): void {
  if (pageDiscarding.value) return
  pageDiscardModalOpen.value = false
  pageDiscardTarget.value = null
  pageDiscardReason.value = ''
  pageDiscardReasonError.value = ''
  pageDiscardError.value = ''
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
  pageDiscardError.value = ''
  pageDiscarding.value = record.pageId
  try {
    await discardScannedPage({ scannedPageId: record.pageId, discardReason: trimmed })
    message.success('扫描页已废弃')
    pageDiscardModalOpen.value = false
    pageDiscardTarget.value = null
    pageDiscardReason.value = ''
    await loadAttentions()
  } catch (error) {
    pageDiscardError.value = getUserErrorMessage(error, '扫描页废弃失败')
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
const candidates = ref<ExamCandidateVO[]>([])
const candidatesLoading = ref(false)
const candidatesLoadError = ref<Error | null>(null)
const bindSubmitError = ref('')

const candidateOptions = computed(() =>
  candidates.value.map((item) => ({
    value: item.candidateRosterId,
    label: `${item.studentName}（${item.studentNo}）`,
  })),
)

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

async function ensureCandidatesLoaded(): Promise<boolean> {
  if (!selectedExamId.value) return false
  if (candidates.value.length > 0) {
    candidatesLoadError.value = null
    return true
  }
  candidatesLoading.value = true
  candidatesLoadError.value = null
  try {
    const result = await listExamCandidates(selectedExamId.value)
    if (!Array.isArray(result)) {
      const error = new TypeError('考生名册接口返回格式错误')
      candidatesLoadError.value = toUserError(error, '考生名册加载失败')
      showUserError(error, '考生名册加载失败')
      return false
    }
    candidates.value = result
    return true
  } catch (error) {
    candidatesLoadError.value = toUserError(error, '考生名册加载失败')
    showUserError(error, '考生名册加载失败')
    return false
  } finally {
    candidatesLoading.value = false
  }
}

async function retryLoadCandidates(): Promise<void> {
  await ensureCandidatesLoaded()
}

function openBindDrawer(record: ScanAttentionItemVO): void {
  if (!record.paperInstanceId || !record.scanBatchId) {
    message.warning('该异常缺少答题卡或扫描批次信息，无法进行身份绑定')
    return
  }
  bindForm.scanBatchId = record.scanBatchId
  bindForm.scanBatchDisplayName = record.scanBatchDisplayName
  bindForm.paperInstanceId = record.paperInstanceId
  bindForm.paperDisplayName = record.paperDisplay.primaryText
  bindForm.recognizedStudentNo = ''
  bindForm.confirmedCandidateRosterId = undefined
  bindForm.attemptStatus = 'NORMAL'
  bindForm.attemptNo = ''
  bindSubmitError.value = ''
  bindDrawerOpen.value = true
  void ensureCandidatesLoaded()
}

function openLedger(): void {
  if (!selectedExamId.value) return
  void router.push({
    path: '/teacher/image-ledger',
    query: {
      examId: selectedExamId.value,
    },
  })
}

async function handleBind(): Promise<void> {
  if (!selectedExamId.value) return
  if (!bindFormRef.value) return
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
  binding.value = true
  bindSubmitError.value = ''
  try {
    await bindPaper({
      examId: selectedExamId.value,
      scanBatchId: bindForm.scanBatchId,
      paperInstanceId: bindForm.paperInstanceId,
      recognizedStudentNo: bindForm.recognizedStudentNo?.trim() || undefined,
      confirmedCandidateRosterId: bindForm.confirmedCandidateRosterId,
      attemptStatus: validAttemptStatus,
      attemptNo: bindForm.attemptNo?.trim() || undefined,
    })
    message.success('试卷身份绑定成功')
    bindDrawerOpen.value = false
    await loadAttentions()
  } catch (error) {
    bindSubmitError.value = getUserErrorMessage(error, '试卷身份绑定失败')
    showUserError(error, '试卷身份绑定失败')
  } finally {
    binding.value = false
  }
}

// ─── 详情弹窗 ────────────────────────────────────
const detailDrawerOpen = ref(false)
const detailRecord = ref<ScanAttentionItemVO | null>(null)

function openDetail(record: ScanAttentionItemVO): void {
  detailRecord.value = record
  detailDrawerOpen.value = true
}

// ─── 行选择与批量绑定 ─────────────────────────────
const selectedRowKeys = ref<string[]>([])
const batchBinding = ref(false)
const batchBindDrawerOpen = ref(false)
const batchBindError = ref('')
const batchBindResult = ref<ExamPaperBatchBindResultVO | null>(null)
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

/** 将扫描异常诊断转为教师可执行的处置提示，避免展示接口、字段或识别链路调试信息。 */
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
  getCheckboxProps: (record: ScanAttentionItemVO) => ({
    disabled:
      record.attentionType !== 'RECOGNITION_REVIEW'
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
      && item.attentionType === 'RECOGNITION_REVIEW'
      && item.paperInstanceId
      && item.scanBatchId,
  )
  if (selected.length === 0) {
    message.error('请选择可身份绑定的识别复核异常项')
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
  batchBindError.value = ''
  batchBindResult.value = null
  batchBindRows.value = selected.map((item) => ({
    attentionId: item.id,
    scanBatchId: item.scanBatchId!,
    scanBatchDisplayName: item.scanBatchDisplayName,
    paperInstanceId: item.paperInstanceId!,
    paperDisplayName: item.paperDisplay.primaryText,
    recognizedStudentNo: '',
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
  batchBindError.value = ''
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
  batchBindError.value = ''
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
    if (result.failureCount === 0) {
      selectedRowKeys.value = []
      batchBindRows.value = []
      batchBindDrawerOpen.value = false
    }
  } catch (error) {
    batchBindError.value = getUserErrorMessage(error, '批量绑定失败')
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
  paperCandidates.value = []
  filterForm.scanBatchId = ''
  filterForm.paperInstanceId = ''
  candidatesLoadError.value = null
  bindSubmitError.value = ''
  batchBindError.value = ''
  batchBindResult.value = null
  if (value) {
    void loadScanBatches()
    void loadPaperCandidates()
    void loadAttentions()
  } else {
    attentions.value = []
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadScanBatches()
    await loadPaperCandidates()
    await loadAttentions()
  }
})
</script>

<style lang="scss" scoped>
.scan-attention {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 280px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__exam-select {
    width: 280px;
  }

  &__overview {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 16px;
    align-items: start;
  }

  &__stats {
    min-width: 0;
  }

  &__chart-card {
    min-width: 0;
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
  }

  &__type-select {
    width: 240px;
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

  &__bind-alert {
    margin-bottom: 16px;
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
    &__batch-form {
      grid-template-columns: 1fr;
    }
  }
}
</style>
