<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <a-select
            :value="selectedExamId"
            class="score-finalize__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
        </template>
        <template #actions>
          <a-segmented
            :value="scoreReleaseStep"
            :options="scoreReleaseStepOptions"
            @change="onScoreReleaseStepChange"
          />
        </template>
      </ContextBar>
    </template>

    <UiEmpty
      v-if="!selectedExamId"
      description="请选择一场考试以查看考生名单"
      class="score-finalize__empty"
    />

    <template v-else>
      <UiStatPanel
        :items="statMetrics"
        :columns="3"
        variant="grid"
        compact
        class="score-finalize__signals"
      />

      <UiAlertStrip
        v-if="riskOverviewAlert.visible"
        :tone="riskOverviewAlert.tone"
        :title="riskOverviewAlert.title"
        dense
        class="score-finalize__risk-alert"
      >
        {{ riskOverviewAlert.message }}
        <template #actions>
          <UiButton
            v-if="canBatchConfirmSafe"
            variant="primary"
            size="sm"
            :loading="batchConfirming"
            @click="handleBatchConfirmSafe"
          >
            批量确认无风险成绩
          </UiButton>
          <UiButton
            v-if="blockingRiskReasons.length > 0"
            variant="outline"
            size="sm"
            @click="openRiskReviewDrawer"
          >
            集中复核异常成绩
          </UiButton>
        </template>
      </UiAlertStrip>

      <!-- D-3 当前页偏差提示：z-score >= 1.5 的考生需要复核 -->
      <UiAlertStrip
        v-if="biasAlert.visible"
        tone="warning"
        title="当前页存在显著偏离均值的成绩参考"
        :description="biasAlert.message"
        dense
        class="score-finalize__bias-alert"
      />

      <a-card :bordered="false" class="detail-table-card score-finalize__table-card">
        <template #title>
          <CheckCircleOutlined />
          <span>考生名单</span>
        </template>

        <div class="filter-card">
          <a-form layout="inline" class="score-finalize__filter-form filter-form filter-form--toolbar">
            <a-form-item label="关键词">
              <a-input
                v-model:value="keyword"
                placeholder="按学号 / 姓名搜索"
                allow-clear
                class="score-finalize__search"
                @press-enter="handleSearch"
              >
                <template #prefix>
                  <SearchOutlined />
                </template>
              </a-input>
            </a-form-item>
            <a-form-item label="最终状态">
              <a-select
                v-model:value="statusFilter"
                placeholder="按最终状态过滤"
                allow-clear
                class="score-finalize__status-select"
                :options="finalStatusOptions"
              />
            </a-form-item>
            <a-form-item class="filter-form__actions">
              <a-space class="filter-form__action-group">
                <UiButton size="sm" @click="handleSearch">查询</UiButton>
                <span class="op-link" role="button" @click="handleReset">重置</span>
                <UiButton
                  variant="outline"
                  size="sm"
                  :disabled="!selectedExamId"
                  :loading="loading || riskOverviewLoading"
                  @click="refreshScoreFinalizeData"
                >
                  刷新
                </UiButton>
              </a-space>
            </a-form-item>
          </a-form>
        </div>

        <!-- D-9 错误态：考生名单加载失败时提供重试 + 上报入口 -->
        <UiErrorRetryPanel
          v-if="candidatesLoadError"
          :error="candidatesLoadError"
          title="成绩确认列表加载失败"
          :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
          compact
          @retry="refreshScoreFinalizeData"
        />
        <UiDataTable
          v-else
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :columns="columns"
          :data-source="candidates"
          :loading="loading"
          :total="pagination.total"
          row-key="candidateRosterId"
          size="middle"
          flat
          class="score-finalize__table student-detail-table__data-table"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'paperDisplay'">
              <div class="score-finalize__identity-cell">
                <a-typography-text strong :content="candidates[index].paperDisplay.primaryText" />
                <span
                  v-if="candidates[index].paperDisplay.secondaryText"
                  class="score-finalize__hint"
                >
                  {{ candidates[index].paperDisplay.secondaryText }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <a-typography-text v-if="candidates[index].finalScore != null" strong type="success">
                {{ candidates[index].finalScore }} 分
              </a-typography-text>
              <span v-else class="score-finalize__hint">-</span>
            </template>
            <template v-else-if="column.key === 'bias'">
              <div class="score-finalize__bias-cell">
                <UiTag :tone="biasLevelTone(classifyBias(candidates[index].finalScore))" size="sm">
                  {{ biasLevelLabel(classifyBias(candidates[index].finalScore)) }}
                </UiTag>
                <span
                  v-if="biasDelta(candidates[index].finalScore)"
                  class="score-finalize__bias-delta"
                >
                  {{ biasDelta(candidates[index].finalScore) }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'finalScoreStatus'">
              <UiTag :tone="finalScoreStatusTone(candidates[index].finalScoreStatus)" size="sm">
                {{ finalScoreStatusLabel(candidates[index].finalScoreStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'confirmedTime'">
              {{ formatDateTime(candidates[index].confirmedTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell" @click.stop>
                <span
                  class="op-link"
                  role="button"
                  :class="{ 'is-disabled': !candidates[index].paperInstanceId }"
                  @click="
                    candidates[index].paperInstanceId && openDetailDrawer(candidates[index])
                  "
                >
                  明细
                </span>
                <span
                  class="op-link primary"
                  role="button"
                  :class="{ 'is-disabled': !canConfirm(candidates[index]) }"
                  @click="canConfirm(candidates[index]) && openConfirmModal(candidates[index])"
                >
                  {{ confirmButtonLabel(candidates[index]) }}
                </span>
                <span
                  class="op-link primary"
                  role="button"
                  :class="{ 'is-disabled': !canPublish(candidates[index]) }"
                  @click="canPublish(candidates[index]) && handlePublish(candidates[index])"
                >
                  {{ publishButtonLabel(candidates[index]) }}
                </span>
                <span
                  class="op-link"
                  role="button"
                  :class="{ 'is-disabled': !canWithdraw(candidates[index]) }"
                  @click="
                    canWithdraw(candidates[index]) && openWithdrawModal(candidates[index])
                  "
                >
                  撤回
                </span>
              </div>
            </template>
          </template>
        </UiDataTable>
      </a-card>
    </template>

    <!-- 成绩明细 Drawer -->
    <UiDrawer
      :open="detailOpen"
      title="试卷成绩明细"
      :width="640"
      hide-footer
      @update:open="(v: boolean) => (detailOpen = v)"
      @close="detailOpen = false"
    >
      <a-spin :spinning="detailLoading" tip="加载明细中...">
        <UiEmpty v-if="!paperScore" description="暂无成绩明细" />
        <div v-else>
          <a-descriptions :column="2" size="small" bordered class="score-finalize__detail-summary">
            <a-descriptions-item label="答卷">
              {{ detailCandidate?.paperDisplay.primaryText }}
            </a-descriptions-item>
            <a-descriptions-item label="班级">
              {{ detailCandidate?.studentClassName }}
            </a-descriptions-item>
            <a-descriptions-item label="总分">
              <a-typography-text strong type="success">
                {{ paperScore.totalScore ?? 0 }} 分
              </a-typography-text>
            </a-descriptions-item>
            <a-descriptions-item label="最终状态" :span="2">
              <UiTag :tone="finalScoreStatusTone(paperScore.finalScoreStatus)" size="sm">
                {{ finalScoreStatusLabel(paperScore.finalScoreStatus) }}
              </UiTag>
            </a-descriptions-item>
          </a-descriptions>

          <h4 class="score-finalize__detail-section-title">题目得分明细</h4>
          <UiDataTable
            :columns="paperItemColumns"
            :data-source="paperQuestions"
            :show-pagination="false"
            flat
            :total="paperQuestions.length"
            row-key="questionTemplateId"
            size="small"
          >
            <template #bodyCell="{ column, index }">
              <template v-if="column.key === 'questionNo'">
                <UiTag tone="blue" size="sm">{{ paperQuestions[index].questionNo }}</UiTag>
              </template>
              <template v-else-if="column.key === 'teacherReviewScore'">
                <a-typography-text v-if="paperQuestions[index].teacherReviewScore != null" strong>
                  {{ paperQuestions[index].teacherReviewScore }}
                </a-typography-text>
                <span v-else class="score-finalize__hint">-</span>
              </template>
            </template>
          </UiDataTable>

          <!-- B-2 历次成绩趋势：本课程同学生的纵向参照 -->
          <h4 class="score-finalize__detail-section-title">
            本课程历次成绩趋势
            <span v-if="historicalSummary" class="score-finalize__detail-section-helper">
              共 {{ historicalSummary.count }} 场考试
              <span v-if="historicalSummary.deltaText"> · {{ historicalSummary.deltaText }}</span>
            </span>
          </h4>
          <a-spin :spinning="historicalLoading" tip="加载历次成绩...">
            <UiTrendChart
              v-if="historicalTrendPoints.length >= 2"
              :items="historicalTrendPoints"
              :model-value="selectedExamId ?? ''"
              area
              show-bubble
              show-active-halo
              class="score-finalize__history-chart"
            />
            <UiEmpty
              v-else-if="!historicalLoading"
              :description="
                historicalTrendPoints.length === 1
                  ? '本课程仅有当前 1 场考试，暂无纵向趋势可对照'
                  : '该学生在本课程暂无可对照的历次成绩'
              "
            />
          </a-spin>

          <!-- B-6 审计可追溯：本试卷的成绩状态变更操作记录 -->
          <h4 class="score-finalize__detail-section-title">操作记录</h4>
          <a-spin :spinning="auditLoading" tip="加载操作记录...">
            <UiActivityTimeline
              v-if="auditTimelineGroups.length > 0"
              :groups="auditTimelineGroups"
              compact
              empty-title="暂无成绩操作记录"
              empty-description="本试卷尚未在最终成绩状态机上发生变更。"
            />
            <UiEmpty v-else-if="!auditLoading" description="本试卷尚未发生成绩状态变更" />
          </a-spin>
        </div>
      </a-spin>
      <template #header>
        <div
          style="display: flex; align-items: center; justify-content: space-between; width: 100%"
        >
          <h3 class="ui-drawer__title">试卷成绩明细</h3>
        </div>
      </template>
    </UiDrawer>

    <!-- 确认成绩 Drawer -->
    <UiDrawer
      :open="confirmOpen"
      title="确认最终成绩"
      :width="520"
      :confirm-loading="confirming"
      @update:open="(v: boolean) => (confirmOpen = v)"
      @close="confirmOpen = false"
      @confirm="handleConfirm"
    >
      <a-form layout="vertical">
        <a-form-item label="考生">
          <a-input
            :value="confirmCandidate ? confirmCandidate.paperDisplay.primaryText : ''"
            disabled
          />
        </a-form-item>
        <a-form-item label="试卷计算总分将作为教师复核评分">
          <a-input
            :value="confirmComputedScore != null ? `${confirmComputedScore} 分` : '加载中...'"
            disabled
          />
        </a-form-item>
        <a-form-item>
          <a-checkbox
            v-model:checked="confirmAndPublish"
            :disabled="hasUnreviewedBlockingRisks"
          >
            确认后立即发布并通知学生
          </a-checkbox>
        </a-form-item>
        <UiAlertStrip
          v-if="hasUnreviewedBlockingRisks"
          tone="warning"
          title="异常成绩未完成集中复核"
          description="可先确认成绩，但未集中复核异常项前不能发布或确认后立即发布。"
          dense
        />
      </a-form>
    </UiDrawer>

    <UiDrawer
      :open="riskReviewDrawerOpen"
      title="异常成绩集中复核"
      :width="620"
      hide-footer
      @update:open="(v: boolean) => (riskReviewDrawerOpen = v)"
      @close="riskReviewDrawerOpen = false"
    >
      <UiAlertStrip
        tone="warning"
        title="发布前复核闸门"
        description="请逐项核对异常成绩原因。全部标记为已复核后，本页面才允许发布成绩。"
        dense
        class="score-finalize__alert"
      />
      <UiEmpty
        v-if="blockingRiskReasons.length === 0"
        description="当前没有阻塞发布的异常成绩"
      />
      <div v-else class="score-finalize__risk-review-list">
        <div
          v-for="reason in blockingRiskReasons"
          :key="reason.reasonCode"
          class="score-finalize__risk-review-item"
        >
          <div class="score-finalize__risk-review-main">
            <UiTag :tone="riskReasonStatusTone(reason.reasonCode)" size="sm">
              {{ riskReasonStatusLabel(reason.reasonCode) }}
            </UiTag>
            <div>
              <div class="score-finalize__risk-review-title">
                {{ reason.reasonName }}
              </div>
              <div class="score-finalize__risk-review-desc">
                原因编码 {{ reason.reasonCode }} · 涉及 {{ reason.count }} 项
              </div>
            </div>
          </div>
          <UiButton
            v-if="isHardBlockingRiskReason(reason.reasonCode)"
            size="sm"
            variant="primary"
            @click="goAbsenceConfirm"
          >
            前往缺考核对
          </UiButton>
          <UiButton
            v-else
            size="sm"
            :variant="isRiskReasonReviewed(reason.reasonCode) ? 'outline' : 'primary'"
            :loading="riskReviewSavingReasonCode === reason.reasonCode"
            :disabled="riskReviewSavingReasonCode !== null && riskReviewSavingReasonCode !== reason.reasonCode"
            @click="toggleRiskReasonReviewed(reason.reasonCode)"
          >
            {{ isRiskReasonReviewed(reason.reasonCode) ? '取消复核标记' : '标记已复核' }}
          </UiButton>
        </div>
      </div>
    </UiDrawer>

    <!-- 撤回成绩 Drawer -->
    <UiDrawer
      :open="withdrawOpen"
      title="撤回最终成绩"
      :width="520"
      :confirm-loading="withdrawing"
      @update:open="(v: boolean) => (withdrawOpen = v)"
      @close="withdrawOpen = false"
      @confirm="handleWithdraw"
    >
      <a-form layout="vertical">
        <UiAlertStrip
          tone="warning"
          title="撤回说明"
          description="撤回后学生侧不再可见该成绩，撤回原因会落入审计日志。"
          dense
          class="score-finalize__alert"
        />
        <a-form-item label="考生">
          <a-input
            :value="withdrawCandidate ? withdrawCandidate.paperDisplay.primaryText : ''"
            disabled
          />
        </a-form-item>
        <a-form-item label="撤回原因" required>
          <a-textarea
            v-model:value="withdrawReason"
            placeholder="请输入撤回原因（必填）"
            :rows="3"
            :max-length="200"
            show-count
          />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <!-- D-3 下一步动作：确认成功后弹出，可选择继续核对下一份 / 跳转成绩发布 -->
    <a-modal
      :open="nextStep.visible"
      :title="nextStep.title"
      :mask-closable="false"
      :footer="null"
      width="480px"
      @cancel="closeNextStep"
    >
      <div class="score-finalize__next-step">
        <a-typography-paragraph class="score-finalize__next-step-desc">
          {{ nextStep.description }}
        </a-typography-paragraph>
        <div class="score-finalize__next-step-actions">
          <UiButton
            v-if="nextStep.kind === 'all-confirmed'"
            variant="primary"
            size="md"
            @click="handleNextStepGoPublish"
          >
            前往成绩发布
          </UiButton>
          <UiButton
            v-else-if="nextStep.kind === 'continue-next' && nextStep.nextCandidate"
            variant="primary"
            size="md"
            @click="handleNextStepConfirmContinue"
          >
            继续确认下一份
          </UiButton>
          <UiButton variant="outline" size="md" @click="closeNextStep"> 稍后处理 </UiButton>
        </div>
      </div>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { TablePaginationConfig } from 'ant-design-vue/es/table/interface'
import type { OperationLogVO, OperationTypeCode } from '@/apis/mark/admin-audit'
import type {
  ExamPaperScoreVO,
  ExamQuestionScoreVO,
  ExamScoreSummaryItemVO,
  FinalScoreRiskOverviewVO,
  FinalScoreStatusCode,
} from '@/apis/mark/exam'
import type { BadgeTone, UiStatPanelItem, UiTrendPoint } from '@/components/ui-guide/ui/types'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listOperationLogs, OPERATION_TYPE_LABEL } from '@/apis/mark/admin-audit'
import {
  batchConfirmSafeFinalScores,
  confirmFinalScore,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_OPTIONS,
  FINAL_SCORE_STATUS_TONE,
  getFinalScoreRiskOverview,
  getPaperScore,
  pageExams,
  pageExamScoreSummary,
  publishFinalScore,
  saveFinalScoreRiskReview,
  withdrawFinalScore,
} from '@/apis/mark/exam'
import type { FinalScoreRiskReasonCode } from '@/apis/mark/exam'
import {
  UiActivityTimeline,
  UiAlertStrip,
  UiButton,
  UiDataTable,
  UiDrawer,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
  UiTrendChart,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime, formatDateTimeWithSeconds } from '@/utils/format'
import { readAllPages, readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScoreFinalize' })

const SCORE_AUDIT_LOG_PAGE_SIZE = 100

function finalScoreStatusTone(value: FinalScoreStatusCode) {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, value, '最终成绩状态')
}

function finalScoreStatusLabel(value: FinalScoreStatusCode): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, value, '最终成绩状态')
}

const finalStatusOptions = FINAL_SCORE_STATUS_OPTIONS

const router = useRouter()
const route = useRoute()

const scoreReleaseStepOptions = [
  { label: '① 成绩确认', value: 'confirm' },
  { label: '② 成绩发布', value: 'publish' },
]

const scoreReleaseStep = computed(() =>
  route.name === 'TeacherScorePublish' ? 'publish' : 'confirm',
)

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  selectedExam,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

function onScoreReleaseStepChange(value: string | number): void {
  const examId = selectedExamId.value
  const query = examId ? { examId } : {}
  if (value === 'publish') {
    void router.push({ name: 'TeacherScorePublish', query })
    return
  }
  void router.push({ name: 'TeacherScoreFinalize', query })
}

// ─── 考生名单（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemVO[]>([])
const loading = ref(false)
const candidatesLoadError = ref<Error | null>(null)
const riskOverview = ref<FinalScoreRiskOverviewVO | null>(null)
const riskOverviewLoading = ref(false)
const batchConfirming = ref(false)
const riskReviewDrawerOpen = ref(false)
const riskReviewSavingReasonCode = ref<FinalScoreRiskReasonCode | null>(null)
const reviewedRiskReasonCodes = ref<Set<FinalScoreRiskReasonCode>>(new Set())
const keyword = ref('')
const statusFilter = ref<FinalScoreStatusCode | undefined>(undefined)

const HARD_BLOCKING_RISK_REASON_CODES = new Set<FinalScoreRiskReasonCode>([
  'UNRECONCILED_ABSENCE',
])

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
})

const columns: ColumnType<ExamScoreSummaryItemVO>[] = [
  { title: '答卷', key: 'paperDisplay', width: 220 },
  { title: '班级', dataIndex: 'studentClassName', key: 'studentClassName', width: 160 },
  { title: '教师复核评分', key: 'finalScore', width: 130 },
  { title: '偏差', key: 'bias', width: 130 },
  { title: '成绩状态', key: 'finalScoreStatus', width: 110 },
  { title: '确认时间', key: 'confirmedTime', width: 170 },
  { title: '操作', key: 'actions', width: 320, fixed: 'right' },
]

async function loadCandidates(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  candidatesLoadError.value = null
  try {
    const result = await pageExamScoreSummary({
      examId: selectedExamId.value,
      keyword: keyword.value.trim() || undefined,
      finalScoreStatus: statusFilter.value,
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
    })
    candidates.value = readPageList(result, '成绩确认名单加载失败，请稍后重试')
    pagination.total = readPageTotal(result)
  } catch (error) {
    candidatesLoadError.value = toUserError(error, '成绩确认名单加载失败，请稍后重试')
    showUserError(error, '成绩确认名单加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function loadRiskOverview(): Promise<void> {
  if (!selectedExamId.value) {
    riskOverview.value = null
    return
  }
  riskOverviewLoading.value = true
  try {
    riskOverview.value = await getFinalScoreRiskOverview({ examId: selectedExamId.value })
    const validReasonCodes = new Set(blockingRiskReasons.value.map((reason) => reason.reasonCode))
    reviewedRiskReasonCodes.value = new Set(
      (riskOverview.value.reviewedReasonCodes ?? []).filter((reasonCode) => validReasonCodes.has(reasonCode)),
    )
  } catch (error) {
    riskOverview.value = null
    showUserError(error, '成绩风险概览加载失败')
  } finally {
    riskOverviewLoading.value = false
  }
}

async function refreshScoreFinalizeData(): Promise<void> {
  await Promise.all([loadCandidates(), loadRiskOverview()])
}

function handleSearch(): void {
  pagination.current = 1
  void loadCandidates()
}

function handleReset(): void {
  keyword.value = ''
  statusFilter.value = undefined
  pagination.current = 1
  void loadCandidates()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void loadCandidates()
}

// ─── 状态机按钮可用性 ─────────────────────────────
function canConfirm(record: ExamScoreSummaryItemVO): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  return s === 'PENDING' || s === 'CALCULATED' || s === 'WITHDRAWN' || s === 'CORRECTED'
}
function confirmButtonLabel(record: ExamScoreSummaryItemVO): string {
  const s = record.finalScoreStatus
  if (s === 'WITHDRAWN' || s === 'CORRECTED') return '重新确认'
  return '确认'
}
function canPublish(record: ExamScoreSummaryItemVO): boolean {
  if (!record.paperInstanceId) return false
  if (hasHardBlockingRisks.value || hasUnreviewedBlockingRisks.value) return false
  const s = record.finalScoreStatus
  // CONFIRMED / WITHDRAWN / CORRECTED 可以发布
  return s === 'CONFIRMED' || s === 'WITHDRAWN' || s === 'CORRECTED'
}
function publishButtonLabel(record: ExamScoreSummaryItemVO): string {
  return record.finalScoreStatus === 'WITHDRAWN' ? '重新发布' : '发布'
}

type RiskOverviewTone = 'info' | 'success' | 'warning' | 'error'

const blockingRiskReasons = computed(() => {
  const reasons = riskOverview.value?.riskReasons ?? []
  return reasons.filter((reason) => reason.reasonCode !== 'SAFE_CONFIRMABLE' && reason.count > 0)
})

const hardBlockingRiskReasons = computed(() => {
  return blockingRiskReasons.value.filter((reason) =>
    HARD_BLOCKING_RISK_REASON_CODES.has(reason.reasonCode),
  )
})

const hasHardBlockingRisks = computed(() => hardBlockingRiskReasons.value.length > 0)

const hasUnreviewedBlockingRisks = computed(() => {
  return blockingRiskReasons.value.some(
    (reason) =>
      !HARD_BLOCKING_RISK_REASON_CODES.has(reason.reasonCode)
      && !reviewedRiskReasonCodes.value.has(reason.reasonCode),
  )
})

function openRiskReviewDrawer(): void {
  riskReviewDrawerOpen.value = true
}

function isRiskReasonReviewed(reasonCode: FinalScoreRiskReasonCode): boolean {
  return reviewedRiskReasonCodes.value.has(reasonCode)
}

function isHardBlockingRiskReason(reasonCode: FinalScoreRiskReasonCode): boolean {
  return HARD_BLOCKING_RISK_REASON_CODES.has(reasonCode)
}

function riskReasonStatusTone(reasonCode: FinalScoreRiskReasonCode): 'green' | 'red' {
  if (isHardBlockingRiskReason(reasonCode)) return 'red'
  return isRiskReasonReviewed(reasonCode) ? 'green' : 'red'
}

function riskReasonStatusLabel(reasonCode: FinalScoreRiskReasonCode): string {
  if (isHardBlockingRiskReason(reasonCode)) return '需处理'
  return isRiskReasonReviewed(reasonCode) ? '已复核' : '待复核'
}

function goAbsenceConfirm(): void {
  const examId = selectedExamId.value
  riskReviewDrawerOpen.value = false
  void router.push({
    name: 'TeacherAbsenceConfirm',
    query: examId ? { examId } : {},
  })
}

async function toggleRiskReasonReviewed(reasonCode: FinalScoreRiskReasonCode): Promise<void> {
  if (HARD_BLOCKING_RISK_REASON_CODES.has(reasonCode)) return
  if (!selectedExamId.value || riskReviewSavingReasonCode.value) return
  const next = new Set(reviewedRiskReasonCodes.value)
  if (next.has(reasonCode)) {
    next.delete(reasonCode)
  } else {
    next.add(reasonCode)
  }
  riskReviewSavingReasonCode.value = reasonCode
  try {
    riskOverview.value = await saveFinalScoreRiskReview({
      examId: selectedExamId.value,
      reviewedReasonCodes: [...next],
    })
    const validReasonCodes = new Set(blockingRiskReasons.value.map((reason) => reason.reasonCode))
    reviewedRiskReasonCodes.value = new Set(
      (riskOverview.value.reviewedReasonCodes ?? []).filter((code) => validReasonCodes.has(code)),
    )
    message.success(next.has(reasonCode) ? '异常成绩风险已标记复核' : '异常成绩风险复核标记已取消')
  } catch (error) {
    showUserError(error, '异常成绩复核状态保存失败')
  } finally {
    riskReviewSavingReasonCode.value = null
  }
}

function warnUnreviewedBlockingRisks(): boolean {
  if (hasHardBlockingRisks.value) {
    riskReviewDrawerOpen.value = true
    message.warning('存在未完成缺考核对学生，请先完成缺考核对后再确认或发布成绩')
    return true
  }
  if (!hasUnreviewedBlockingRisks.value) return false
  riskReviewDrawerOpen.value = true
  message.warning('存在未复核的异常成绩，请先完成集中复核后再发布')
  return true
}

const canBatchConfirmSafe = computed(() => {
  const overview = riskOverview.value
  return Boolean(
    overview
      && overview.safeConfirmableCount > 0
      && blockingRiskReasons.value.length === 0
      && !hasHardBlockingRisks.value
      && !batchConfirming.value,
  )
})

const riskOverviewAlert = computed<{
  visible: boolean
  tone: RiskOverviewTone
  title: string
  message: string
}>(() => {
  const overview = riskOverview.value
  if (!overview) {
    return { visible: false, tone: 'info', title: '', message: '' }
  }
  if (hasHardBlockingRisks.value) {
    const count = hardBlockingRiskReasons.value
      .reduce((sum, reason) => sum + reason.count, 0)
    return {
      visible: true,
      tone: 'error',
      title: '缺考核对未完成',
      message: `当前仍有 ${count} 名学生缺考核对未完成。请先完成缺考核对，再确认或发布成绩。`,
    }
  }
  if (blockingRiskReasons.value.length > 0) {
    const reasonText = blockingRiskReasons.value
      .map((reason) => `${reason.reasonName} ${reason.count} 项`)
      .join('，')
    return {
      visible: true,
      tone: overview.blockedCount > 0 ? 'error' : 'warning',
      title: '发布前存在全场风险',
      message: `${reasonText}。请先处理阻塞项，再确认或发布成绩。`,
    }
  }
  if (overview.safeConfirmableCount > 0) {
    return {
      visible: true,
      tone: 'info',
      title: '存在可安全批量确认成绩',
      message: `后端已判定 ${overview.safeConfirmableCount} 份已计算成绩满足确认条件，可批量确认后再进入发布。`,
    }
  }
  if (overview.readyToPublish) {
    return {
      visible: true,
      tone: 'success',
      title: '全场成绩已具备发布条件',
      message: '可进入成绩发布处理学生侧通知。',
    }
  }
  return { visible: false, tone: 'info', title: '', message: '' }
})

async function handleBatchConfirmSafe(): Promise<void> {
  if (!selectedExamId.value || !riskOverview.value) return
  if (warnUnreviewedBlockingRisks()) return
  batchConfirming.value = true
  try {
    const result = await batchConfirmSafeFinalScores({ examId: selectedExamId.value })
    if (result.successCount > 0) {
      message.success(`已批量确认 ${result.successCount} 份无风险成绩`)
    } else if (result.skippedCount > 0) {
      const reasonText = result.skipReasons
        .map((reason) => `${reason.reasonName} ${reason.count}`)
        .join('，')
      message.warning(reasonText ? `批量确认已跳过：${reasonText}` : '当前没有可批量确认的成绩')
    } else {
      message.info('当前没有可批量确认的成绩')
    }
    if (result.failureCount > 0) {
      message.warning(`有 ${result.failureCount} 份成绩确认失败，请查看列表后逐份处理`)
    }
    await refreshScoreFinalizeData()
  } catch (error) {
    showUserError(error, '批量确认无风险成绩失败')
  } finally {
    batchConfirming.value = false
  }
}

/* ========== 信号指标：核定流程状态分布 ========== */

const statMetrics = computed<UiStatPanelItem[]>(() => {
  const overview = riskOverview.value
  const total = overview?.totalCandidateCount ?? 0
  const pending = overview?.pendingCount ?? 0
  const calculated = overview?.calculatedCount ?? 0
  const confirmed = overview?.confirmedCount ?? 0
  const published = overview?.publishedCount ?? 0
  const blocked = overview?.blockedCount ?? 0
  return [
    { key: 'total', label: '全场考生', value: total, unit: '人', tone: 'blue' },
    {
      key: 'pending',
      label: '待计算',
      value: pending,
      unit: '人',
      tone: pending > 0 ? 'orange' : 'gray',
    },
    {
      key: 'calculated',
      label: '可确认',
      value: calculated,
      unit: '人',
      tone: calculated > 0 ? 'blue' : 'gray',
    },
    {
      key: 'confirmed',
      label: '已确认',
      value: confirmed,
      unit: '人',
      tone: confirmed > 0 ? 'blue' : 'gray',
    },
    {
      key: 'published',
      label: '已发布',
      value: published,
      unit: '人',
      tone: published > 0 ? 'green' : 'gray',
    },
    {
      key: 'blocked',
      label: '阻塞风险',
      value: blocked,
      unit: '项',
      tone: blocked > 0 ? 'red' : 'gray',
    },
  ]
})

/** 当前页候选状态分桶，仅用于页内偏差提示与下一份核对引导。 */
const candidateBuckets = computed<Record<FinalScoreStatusCode, number>>(() => {
  const buckets: Record<FinalScoreStatusCode, number> = {
    PENDING: 0,
    CALCULATED: 0,
    CONFIRMED: 0,
    PUBLISHED: 0,
    CORRECTED: 0,
    WITHDRAWN: 0,
  }
  for (const c of candidates.value) {
    const s = c.finalScoreStatus
    buckets[s] += 1
  }
  return buckets
})

/**
 * D-3 当前页成绩偏差统计：
 * 仅基于当前页 finalScore 非空的候选计算均值与样本标准差，用于「偏差」列与顶部偏差提示。
 * 因后端为服务端分页，统计口径在视觉上限定为「当前页」，避免误导教师把页内异常当作整考试异常。
 * 当样本数 < 3 或方差为 0 时，stddev 返回 0，模板侧降级为「样本不足」展示。
 */
const pageScoreStats = computed<{ count: number, mean: number, stddev: number }>(() => {
  const scores = candidates.value
    .map((c) => c.finalScore)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  const count = scores.length
  if (count === 0) return { count: 0, mean: 0, stddev: 0 }
  const mean = scores.reduce((acc, v) => acc + v, 0) / count
  if (count < 3) return { count, mean, stddev: 0 }
  const variance = scores.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (count - 1)
  return { count, mean, stddev: Math.sqrt(variance) }
})

/** 偏差类型与色调：|z| ≥ 1.5 严重偏离，|z| ≥ 1 轻度偏离，否则正常 */
type BiasLevel = 'normal' | 'mild-high' | 'mild-low' | 'severe-high' | 'severe-low' | 'insufficient'

function classifyBias(score: number | undefined): BiasLevel {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'insufficient'
  const { count, mean, stddev } = pageScoreStats.value
  if (count < 3 || stddev === 0) return 'insufficient'
  const z = (score - mean) / stddev
  if (z >= 1.5) return 'severe-high'
  if (z <= -1.5) return 'severe-low'
  if (z >= 1) return 'mild-high'
  if (z <= -1) return 'mild-low'
  return 'normal'
}

const BIAS_LEVEL_LABEL: Record<BiasLevel, string> = {
  "normal": '≈ 正常',
  'mild-high': '↑ 偏高',
  'mild-low': '↓ 偏低',
  'severe-high': '⇈ 显著偏高',
  'severe-low': '⇊ 显著偏低',
  "insufficient": '-',
}

const BIAS_LEVEL_TONE: Record<BiasLevel, BadgeTone> = {
  "normal": 'gray',
  'mild-high': 'blue',
  'mild-low': 'orange',
  'severe-high': 'purple',
  'severe-low': 'red',
  "insufficient": 'gray',
}

function biasLevelLabel(level: BiasLevel): string {
  return strictEnumLabel(BIAS_LEVEL_LABEL, level, '成绩偏差等级')
}

function biasLevelTone(level: BiasLevel): BadgeTone {
  return strictEnumTone(BIAS_LEVEL_TONE, level, '成绩偏差等级')
}

/** D-3 顶部偏差提示：当前页严重偏离样本数 */
const biasAlert = computed<{ visible: boolean, severeCount: number, message: string }>(() => {
  const { count, mean, stddev } = pageScoreStats.value
  if (count < 3 || stddev === 0) {
    return { visible: false, severeCount: 0, message: '' }
  }
  let severe = 0
  for (const c of candidates.value) {
    const lvl = classifyBias(c.finalScore)
    if (lvl === 'severe-high' || lvl === 'severe-low') severe += 1
  }
  if (severe === 0) return { visible: false, severeCount: 0, message: '' }
  const meanText = mean.toFixed(1)
  const stdText = stddev.toFixed(1)
  return {
    visible: true,
    severeCount: severe,
    message: `当前页有 ${severe} 名考生教师复核评分偏离均值 ≥ 1.5 倍标准差（均值 ${meanText} / σ ${stdText}），请对照原卷复核。`,
  }
})

function biasDelta(score: number | undefined): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) return ''
  const { count, mean, stddev } = pageScoreStats.value
  if (count < 3 || stddev === 0) return ''
  const delta = score - mean
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} 分`
}

function canWithdraw(record: ExamScoreSummaryItemVO): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  return s === 'PUBLISHED' || s === 'CORRECTED'
}

// ─── 成绩明细 Drawer ─────────────────────────────
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailCandidate = ref<ExamScoreSummaryItemVO | null>(null)
const paperScore = ref<ExamPaperScoreVO | null>(null)

// computed 派生强类型题目数组，模板侧用 paperQuestions[index] 取 VO，避免 a-table slot record 类型丢失。
const paperQuestions = computed<ExamQuestionScoreVO[]>(() => paperScore.value?.questions ?? [])

const paperItemColumns: ColumnType<ExamQuestionScoreVO>[] = [
  { title: '题号', key: 'questionNo', width: 80 },
  { title: '题型', dataIndex: 'questionType', key: 'questionType', width: 100 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '题目得分', key: 'teacherReviewScore', width: 100 },
  { title: '状态', dataIndex: 'gradeStatus', key: 'gradeStatus', width: 110 },
]

// ─── B-6 操作记录（审计可追溯） ─────────────────────────────
const auditLogs = ref<OperationLogVO[]>([])
const auditLoading = ref(false)
const TRACE_TAG_TONE: BadgeTone = 'gray'

const SCORE_AUDIT_TONE: Record<OperationTypeCode, BadgeTone> = {
  SCORE_CHANGE: 'orange',
  SCORE_CONFIRM: 'blue',
  SCORE_PUBLISH: 'green',
  SCORE_WITHDRAW: 'red',
  REVIEW_REQUEST_HANDLE: 'blue',
  GRADE_CORRECTION_CREATE: 'orange',
  QUALITY_OVERRIDE: 'orange',
  ABSENCE_CONFIRM: 'gray',
  ABSENCE_REVOKE: 'gray',
  ABSENCE_RECONCILE: 'gray',
  DUPLICATE_RESOLVE: 'orange',
  BINDING_CONFIRM: 'blue',
  DEANONYMIZE: 'purple',
  REPAIR_SUBMIT: 'orange',
  SPOT_CHECK_ABNORMAL: 'red',
  BATCH_REPROCESS: 'orange',
  GRADE_PASSBACK_EXECUTE: 'blue',
  GRADE_PASSBACK_RECONCILE: 'blue',
  GRADE_PASSBACK_CALLBACK: 'blue',
  SYNC_TASK_RETRY: 'orange',
  SYNC_TASK_CANCEL: 'gray',
  EXPORT_CREATE: 'blue',
  EXPORT_START: 'blue',
  EXPORT_COMPLETE: 'green',
  EXPORT_FAIL: 'red',
  ARCHIVE_CREATE: 'blue',
  ARCHIVE_PACKAGE_START: 'blue',
  ARCHIVE_PACKAGE_COMPLETE: 'green',
  ARCHIVE_PACKAGE_FAIL: 'red',
  ARCHIVE_APPRAISAL_REQUEST: 'orange',
  ARCHIVE_APPRAISAL_DECIDE: 'blue',
  ARCHIVE_RETENTION_EXTEND: 'orange',
  ARCHIVE_DESTRUCTION_REQUEST: 'orange',
  ARCHIVE_DESTRUCTION_APPROVE: 'red',
  ARCHIVE_DESTROY: 'red',
}

function scoreAuditTitle(log: OperationLogVO): string {
  return strictEnumLabel(OPERATION_TYPE_LABEL, log.operationType, '审计操作类型')
}

function scoreAuditTone(log: OperationLogVO): BadgeTone {
  return strictEnumTone(SCORE_AUDIT_TONE, log.operationType, '审计操作类型')
}

async function loadPaperAuditLogs(): Promise<void> {
  if (!selectedExamId.value || !detailCandidate.value?.paperInstanceId) {
    auditLogs.value = []
    return
  }
  auditLoading.value = true
  const examId = selectedExamId.value
  const paperInstanceId = detailCandidate.value.paperInstanceId
  try {
    const logs = await readAllPages(
      (pageNum) => listOperationLogs({
        examId,
        targetType: 'EXAM_FINAL_SCORE',
        targetId: paperInstanceId,
        pageNum,
        pageSize: SCORE_AUDIT_LOG_PAGE_SIZE,
      }),
      '操作记录加载失败，请刷新后重试',
    )
    auditLogs.value = logs.sort((a, b) => {
      const ta = a.createTime ? dayjs(a.createTime).valueOf() : 0
      const tb = b.createTime ? dayjs(b.createTime).valueOf() : 0
      return tb - ta
    })
  } catch (error) {
    message.warning(getUserErrorMessage(error, '操作记录加载失败'))
    auditLogs.value = []
  } finally {
    auditLoading.value = false
  }
}

/** 把审计日志聚合到一个时间分组，喂给 UiActivityTimeline */
const auditTimelineGroups = computed(() => {
  const items = auditLogs.value.map((log, idx) => {
    return {
      key: log.id ?? idx,
      title: scoreAuditTitle(log),
      content: log.reason || undefined,
      time: log.createTime ? formatDateTimeWithSeconds(log.createTime, '') : undefined,
      actor: log.operatorRole ? `操作角色：${log.operatorRole}` : undefined,
      tone: scoreAuditTone(log),
      tags: log.traceId
        ? [{ label: `处理追踪编号 ${log.traceId.slice(0, 8)}…`, tone: TRACE_TAG_TONE }]
        : undefined,
    }
  })
  if (items.length === 0) return []
  return [
    {
      key: 'final-score-audit',
      label: '成绩状态变更',
      countText: `${items.length} 条记录`,
      items,
    },
  ]
})

// ─── B-2 该学生本课程历次成绩趋势 ─────────────────────────────
interface HistoricalScorePoint {
  examId: string
  examName: string
  examEndTime?: string
  finalScore: number
  isCurrent: boolean
}

const historicalScores = ref<HistoricalScorePoint[]>([])
const historicalLoading = ref(false)
/** 同课程历次考试上限：超过 20 场不再回查（避免 N+1 雪崩；典型课程一学期 ≤ 10 场） */
const HISTORICAL_EXAMS_MAX = 20

/**
 * 加载该学生在「同 courseId」考试中的历次最终成绩。
 * 调用链：pageExams({ courseId }) → 对每场 pageExamScoreSummary({ examId, keyword: studentNo, pageSize: 1 })
 * 仅纳入 finalScore != null 的考试，按 examEndTime 升序绘制。
 */
async function loadHistoricalScores(): Promise<void> {
  const courseId = selectedExam.value?.courseId
  const candidate = detailCandidate.value
  if (!courseId || !candidate?.studentNo) {
    historicalScores.value = []
    return
  }
  historicalLoading.value = true
  try {
    const examsPage = await pageExams({
      pageNum: 1,
      pageSize: HISTORICAL_EXAMS_MAX,
      courseId,
    })
    const courseExams = examsPage.list
    const settled = await Promise.all(
      courseExams.map(async (exam) => {
        const result = await pageExamScoreSummary({
          examId: exam.examId,
          keyword: candidate.studentNo,
          pageNum: 1,
          pageSize: 1,
        })
        const item = result.list[0]
        if (!item || item.finalScore == null) return null
        const point: HistoricalScorePoint = {
          examId: exam.examId,
          examName: exam.examName,
          examEndTime: exam.examEndTime,
          finalScore: item.finalScore,
          isCurrent: exam.examId === selectedExamId.value,
        }
        return point
      }),
    )
    historicalScores.value = settled
      .filter((p): p is HistoricalScorePoint => p !== null)
      .sort((a: HistoricalScorePoint, b: HistoricalScorePoint) => {
        const ta = a.examEndTime ? dayjs(a.examEndTime).valueOf() : 0
        const tb = b.examEndTime ? dayjs(b.examEndTime).valueOf() : 0
        return ta - tb
      })
  } catch (error) {
    message.warning(getUserErrorMessage(error, '历次成绩趋势加载失败'))
    historicalScores.value = []
  } finally {
    historicalLoading.value = false
  }
}

/** UiTrendChart 输入：考试名为 label，教师复核评分为 value，当前考试 key 用于 modelValue 高亮 */
const historicalTrendPoints = computed<UiTrendPoint[]>(() => {
  return historicalScores.value.map((p) => ({
    key: p.examId,
    label: p.examName.length > 8 ? `${p.examName.slice(0, 8)}…` : p.examName,
    value: p.finalScore,
  }))
})

/** 历次成绩派生的统计文本，避免模板里堆三元 */
const historicalSummary = computed(() => {
  const points = historicalScores.value
  if (points.length === 0) return null
  const current = points.find((p) => p.isCurrent)
  const others = points.filter((p) => !p.isCurrent)
  if (!current || others.length === 0) {
    return { count: points.length, currentScore: current?.finalScore ?? null, deltaText: '' }
  }
  const previous = others[others.length - 1]
  const delta = current.finalScore - previous.finalScore
  const deltaSign = delta > 0 ? '+' : ''
  return {
    count: points.length,
    currentScore: current.finalScore,
    deltaText: `较上次（${previous.examName}）${deltaSign}${delta.toFixed(1)} 分`,
  }
})

async function openDetailDrawer(record: ExamScoreSummaryItemVO): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  detailCandidate.value = record
  detailOpen.value = true
  detailLoading.value = true
  paperScore.value = null
  auditLogs.value = []
  historicalScores.value = []
  try {
    paperScore.value = await getPaperScore(selectedExamId.value, record.paperInstanceId)
  } catch (error) {
    showUserError(error, '成绩明细加载失败')
  } finally {
    detailLoading.value = false
  }
  // 操作记录、历次成绩趋势与成绩明细并行展示但顺序加载，避免单点失败阻断主明细
  void loadPaperAuditLogs()
  void loadHistoricalScores()
}

// ─── 确认成绩 Modal ─────────────────────────────
const confirmOpen = ref(false)
const confirming = ref(false)
const confirmCandidate = ref<ExamScoreSummaryItemVO | null>(null)
const confirmComputedScore = ref<number | null>(null)
const confirmAndPublish = ref(false)

async function openConfirmModal(record: ExamScoreSummaryItemVO): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  confirmCandidate.value = record
  confirmOpen.value = true
  confirmComputedScore.value = null
  confirmAndPublish.value = false
  try {
    const score = await getPaperScore(selectedExamId.value, record.paperInstanceId)
    confirmComputedScore.value = score.totalScore ?? 0
  } catch (error) {
    message.warning(getUserErrorMessage(error, '试卷总分加载失败'))
  }
}

// ─── D-3 下一步动作 ─────────────────────────────
type NextStepKind = 'all-confirmed' | 'continue-next' | 'none'

interface NextStepState {
  visible: boolean
  kind: NextStepKind
  /** 主标题文案 */
  title: string
  /** 描述详情 */
  description: string
  /** 下一份待确认学生（kind === 'continue-next' 时有效） */
  nextCandidate: ExamScoreSummaryItemVO | null
}

const nextStep = ref<NextStepState>({
  visible: false,
  kind: 'none',
  title: '',
  description: '',
  nextCandidate: null,
})

function closeNextStep(): void {
  nextStep.value = { visible: false, kind: 'none', title: '', description: '', nextCandidate: null }
}

/**
 * 根据最新状态推导下一步：
 * - 全部已确认（CONFIRMED + PUBLISHED + WITHDRAWN + CORRECTED == total）→ 引导跳转 score-publish
 * - 否则在当前页找下一份未确认（PENDING / CALCULATED）的学生，提示继续核对
 * - 若当前页无待确认但全场仍有 PENDING/CALCULATED → 提示翻页
 */
function deriveNextStepSuggestion(): void {
  const overview = riskOverview.value
  const b = candidateBuckets.value
  if (overview?.readyToPublish) {
    nextStep.value = {
      visible: true,
      kind: 'all-confirmed',
      title: '全场成绩已具备发布条件',
      description: `共 ${overview.totalCandidateCount} 名考生：已确认 ${overview.confirmedCount} · 已发布 ${overview.publishedCount} · 已撤回 ${overview.withdrawnCount} · 已更正 ${overview.correctedCount}。进入「成绩发布」可推进到学生侧。`,
      nextCandidate: null,
    }
    return
  }
  // 当前页找下一份未确认
  const next
    = candidates.value.find(
      (c) => c.finalScoreStatus === 'CALCULATED' || c.finalScoreStatus === 'PENDING',
    ) ?? null
  if (next) {
    nextStep.value = {
      visible: true,
      kind: 'continue-next',
      title: '继续核对下一份',
      description: `当前页还有 ${b.CALCULATED + b.PENDING} 名考生待确认。下一份待确认：${next.paperDisplay.primaryText}。`,
      nextCandidate: next,
    }
    return
  }
  // 当前页已全部处理，但全场未完成 → 翻页提示
  nextStep.value = {
    visible: true,
    kind: 'continue-next',
    title: '当前页已全部核对',
    description: '当前页成绩已处理，全场仍有待确认或风险项，请切换筛选 / 翻页或处理风险概览中的问题。',
    nextCandidate: null,
  }
}

function handleNextStepConfirmContinue(): void {
  const next = nextStep.value.nextCandidate
  closeNextStep()
  if (next) {
    void openConfirmModal(next)
  }
}

function handleNextStepGoPublish(): void {
  const examId = selectedExamId.value
  closeNextStep()
  if (examId) {
    void router.push({ name: 'TeacherScorePublish', query: { examId } })
  }
}

async function handleConfirm(): Promise<void> {
  if (!selectedExamId.value || !confirmCandidate.value?.paperInstanceId) return
  if (warnUnreviewedBlockingRisks()) return
  const examId = selectedExamId.value
  const paperInstanceId = confirmCandidate.value.paperInstanceId
  confirming.value = true
  try {
    await confirmFinalScore({ examId, paperInstanceId })
    if (confirmAndPublish.value) {
      await publishFinalScore({ examId, paperInstanceId })
      message.success('成绩已确认并发布，学生通知已下发')
    } else {
      message.success('成绩已确认，可在列表点击「发布」推送到学生侧')
    }
    confirmOpen.value = false
    await refreshScoreFinalizeData()
    deriveNextStepSuggestion()
  } catch (error) {
    showUserError(error, '成绩确认失败')
  } finally {
    confirming.value = false
  }
}

// ─── 发布成绩 ─────────────────────────────
async function handlePublish(record: ExamScoreSummaryItemVO): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  if (warnUnreviewedBlockingRisks()) return
  try {
    await publishFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    message.success('成绩已发布，学生通知已下发')
    await refreshScoreFinalizeData()
  } catch (error) {
    showUserError(error, '成绩发布失败')
  }
}

// ─── 撤回成绩 Modal ─────────────────────────────
const withdrawOpen = ref(false)
const withdrawing = ref(false)
const withdrawCandidate = ref<ExamScoreSummaryItemVO | null>(null)
const withdrawReason = ref('')

function openWithdrawModal(record: ExamScoreSummaryItemVO): void {
  withdrawCandidate.value = record
  withdrawReason.value = ''
  withdrawOpen.value = true
}

async function handleWithdraw(): Promise<void> {
  if (!selectedExamId.value || !withdrawCandidate.value?.paperInstanceId) return
  const reason = withdrawReason.value.trim()
  if (!reason) {
    message.warning('请填写撤回原因')
    return
  }
  withdrawing.value = true
  try {
    await withdrawFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: withdrawCandidate.value.paperInstanceId,
      reason,
    })
    message.success('成绩已撤回')
    withdrawOpen.value = false
    await refreshScoreFinalizeData()
  } catch (error) {
    showUserError(error, '成绩撤回失败')
  } finally {
    withdrawing.value = false
  }
}

// ─── 初始化 ─────────────────────────────────────
watch(selectedExamId, (value) => {
  pagination.current = 1
  reviewedRiskReasonCodes.value = new Set()
  riskReviewDrawerOpen.value = false
  if (value) {
    void refreshScoreFinalizeData()
  } else {
    candidates.value = []
    riskOverview.value = null
    pagination.total = 0
  }
})

watch(statusFilter, () => {
  pagination.current = 1
  void loadCandidates()
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await refreshScoreFinalizeData()
  }
})
</script>

<style lang="scss" scoped>
.score-finalize {
  &__signals {
    margin-bottom: 12px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__guide {
    margin-bottom: 12px;
  }

  &__exam-select {
    width: 280px;
  }

  &__filter-form {
    margin-bottom: 16px;
  }

  &__search {
    width: 240px;
  }

  &__status-select {
    width: 200px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__table-card {
    margin-top: 8px;
  }

  &__table {
    :deep(.ant-table-thead > tr > th) {
      background: var(--dp-surface-soft, #f8fafc);
      font-weight: 600;
    }
  }

  &__detail-summary {
    margin-bottom: 16px;
  }

  &__detail-section-title {
    margin: 16px 0 8px 0;
    font-size: 14px;
    font-weight: 700;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
  }

  &__alert {
    margin-bottom: 12px;
  }

  &__bias-alert {
    margin-bottom: 12px;
  }

  &__risk-alert {
    margin-bottom: 12px;
  }

  &__risk-review-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__risk-review-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: var(--dp-radius-panel, 8px);
    background: var(--dp-surface, #fff);
  }

  &__risk-review-main {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  &__risk-review-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--dp-text-primary, #0f172a);
  }

  &__risk-review-desc {
    margin-top: 4px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__bias-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__bias-delta {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__detail-section-helper {
    margin-left: 8px;
    font-size: 12px;
    font-weight: normal;
    color: var(--dp-text-muted, #64748b);
  }

  &__history-chart {
    margin-top: 8px;
  }

  &__next-step {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__next-step-desc {
    margin: 0;
    color: var(--dp-text, #1f2937);
  }

  &__next-step-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
}
</style>
