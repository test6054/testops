<template>
  <StageWorkbenchShell class="score-finalize-page">
    <template
      v-if="
        effectiveRiskOverview?.readyToPublish
          || blockingRiskReasons.length > 0
          || canBatchConfirmSafe
      "
      #context
    >
      <ContextBar layout="workbench">
        <template #status>
          <UiTag v-if="effectiveRiskOverview?.readyToPublish" tone="green" size="sm">
            可进入发布
          </UiTag>
          <UiTag v-else-if="blockingRiskReasons.length > 0" tone="orange" size="sm">
            存在阻塞风险
          </UiTag>
        </template>
        <template #actions>
          <UiButton
            v-if="effectiveRiskOverview?.readyToPublish"
            variant="outline"
            size="sm"
            @click="handleGoScorePublish"
          >
            前往成绩发布
          </UiButton>
          <UiButton
            v-if="canBatchConfirmSafe"
            variant="primary"
            size="sm"
            :loading="batchConfirming"
            @click="handleBatchConfirmSafe"
          >
            批量确认无风险成绩
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand variant="tiles" :metrics="statMetrics" compact />
    </template>

    <UiEmpty v-if="!selectedExamId" description="请从考试工作台进入成绩确认" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <ScoreReleaseStepPipeline :overview="effectiveRiskOverview" />

      <WorkbenchNoticeBanner
        v-if="panelNotice"
        :title="panelNotice.title"
        :description="panelNotice.description"
        :tone="panelNotice.tone"
        class="score-finalize__notice-banner"
      >
        <UiButton
          v-if="panelNotice.action === 'layout'"
          variant="outline"
          size="sm"
          @click="goLayoutDesigner"
        >
          前往制卷设计
        </UiButton>
      </WorkbenchNoticeBanner>

      <UiAlertStrip
        v-if="blockingRiskReasons.length > 0"
        tone="warning"
        title="存在阻塞性成绩风险"
        :description="`共 ${blockingRiskReasons.length} 类风险待处理，确认或发布前须完成复核。`"
        dense
        class="score-finalize__alert"
      >
        <template #actions>
          <UiButton variant="primary" size="sm" @click="openRiskReviewDrawer"> 集中复核 </UiButton>
        </template>
      </UiAlertStrip>
      <UiAlertStrip
        v-if="delayedAutoConfirmNotice"
        tone="info"
        title="延迟自动确认进行中"
        :description="delayedAutoConfirmNotice"
        dense
        class="score-finalize__alert"
      />
      <UiAlertStrip
        v-if="blockedDelayedAutoConfirmNotice"
        tone="error"
        title="延迟自动确认已失败"
        :description="blockedDelayedAutoConfirmNotice"
        dense
        class="score-finalize__alert"
      >
        <template #actions>
          <UiButton variant="primary" size="sm" @click="goDelayedConfirmTasks">
            查看失败任务
          </UiButton>
        </template>
      </UiAlertStrip>
      <UiAlertStrip
        v-else-if="effectiveRiskOverview?.readyToPublish"
        tone="success"
        title="全场成绩已具备发布条件"
        description="确认环节已完成，可进入成绩发布页面向学生侧下发。"
        dense
        class="score-finalize__alert"
      >
        <template #actions>
          <UiButton variant="primary" size="sm" @click="handleGoScorePublish">
            前往成绩发布
          </UiButton>
        </template>
      </UiAlertStrip>

      <WorkbenchSurfaceCard flush class="score-finalize__table-section">
        <div class="score-finalize__table-shell">
          <h3 class="score-finalize__table-title">考生成绩</h3>
          <a-skeleton v-if="riskOverviewLoading" active :paragraph="{ rows: 1 }" />
          <UiSectionTabs
            v-else
            v-model="statusTabKey"
            :items="statusTabItems"
            compact
            class="score-finalize__status-tabs"
            @change="handleStatusTabChange"
          />
          <div class="score-finalize__table-toolbar">
            <UiButton
              v-if="blockingRiskReasons.length > 0"
              variant="outline"
              size="sm"
              @click="openRiskReviewDrawer"
            >
              集中复核异常成绩
            </UiButton>
            <div class="score-finalize__table-toolbar-main">
              <UiFilterBar
                v-model="scoreFilterModel"
                :fields="scoreFilterFields"
                variant="plain"
                show-labels
                search-text="查询"
                @search="handleSearch"
                @reset="handleReset"
              />
              <UiButton variant="outline" size="sm" @click="goExportTasks"> 导出任务 </UiButton>
            </div>
          </div>

          <UiDataTable
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
              <template v-if="column.key === 'studentNo'">
                <span class="score-summary-table__mono">{{
                  candidates[index].studentNo || '—'
                }}</span>
              </template>
              <template v-else-if="column.key === 'studentName'">
                {{ candidates[index].studentName || '—' }}
              </template>
              <template v-else-if="column.key === 'examScore'">
                <span v-if="candidates[index].examScore != null" class="score-summary-table__score">
                  {{ candidates[index].examScore }}
                </span>
                <span v-else class="score-finalize__hint">—</span>
              </template>
              <template v-else-if="column.key === 'dailyScore'">
                <span
                  v-if="candidates[index].dailyScore != null"
                  class="score-summary-table__score"
                >
                  {{ candidates[index].dailyScore }}
                </span>
                <span v-else class="score-finalize__hint">—</span>
              </template>
              <template v-else-if="column.key === 'finalScore'">
                <span
                  v-if="candidates[index].finalScore != null"
                  class="score-summary-table__score score-summary-table__score--total"
                >
                  {{ candidates[index].finalScore }}
                </span>
                <span v-else class="score-finalize__hint">—</span>
              </template>
              <template v-else-if="column.key === 'bias'">
                <div class="score-finalize__bias-cell">
                  <UiTag
                    :tone="
                      biasLevelTone(classifyScoreBias(candidates[index].finalScore, pageScoreStats))
                    "
                    size="sm"
                  >
                    {{
                      biasLevelLabel(
                        classifyScoreBias(candidates[index].finalScore, pageScoreStats),
                      )
                    }}
                  </UiTag>
                  <span
                    v-if="formatScoreBiasDelta(candidates[index].finalScore, pageScoreStats)"
                    class="score-finalize__bias-delta"
                  >
                    {{ formatScoreBiasDelta(candidates[index].finalScore, pageScoreStats) }}
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
                <UiTableActions
                  :items="buildFinalizeActions(candidates[index])"
                  split
                  @action="(key) => handleFinalizeRowAction(key, candidates[index])"
                />
              </template>
            </template>
          </UiDataTable>
        </div>
      </WorkbenchSurfaceCard>
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
      <UiSkeletonState v-if="detailLoading" variant="card" compact />
      <UiEmpty v-else-if="!paperScore" description="暂无成绩明细" />
      <div v-else>
        <a-descriptions :column="2" size="small" bordered class="score-finalize__detail-summary">
          <a-descriptions-item label="答卷">
            {{ detailCandidate?.paperDisplay.primaryText }}
          </a-descriptions-item>
          <a-descriptions-item label="班级">
            {{ detailCandidate?.studentClassName }}
          </a-descriptions-item>
          <a-descriptions-item v-if="hasDailyScoreConfig" label="考试分">
            <span class="score-summary-table__score">{{
              formatScorePoints(paperScore.examScore)
            }}</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="hasDailyScoreConfig" label="日常分">
            <span class="score-summary-table__score">{{
              formatScorePoints(paperScore.dailyScore)
            }}</span>
          </a-descriptions-item>
          <a-descriptions-item :label="hasDailyScoreConfig ? '总成绩' : '总分'">
            <span class="score-summary-table__score score-summary-table__score--total">
              {{ formatScorePoints(paperScore.totalScore) }}
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="最终状态" :span="2">
            <UiTag :tone="finalScoreStatusTone(paperScore.finalScoreStatus)" size="sm">
              {{ finalScoreStatusLabel(paperScore.finalScoreStatus) }}
            </UiTag>
          </a-descriptions-item>
        </a-descriptions>

        <h4 class="score-finalize__detail-section-title">题目得分明细</h4>
        <UiDataTable
          pagination-mode="none"
          :columns="paperItemColumns"
          :data-source="paperQuestions"
          :show-pagination="false"
          flat
          :total="paperQuestions.length"
          row-key="layoutQuestionId"
          size="small"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'questionNo'">
              <UiTag tone="blue" size="sm">{{ paperQuestions[index].questionNo }}</UiTag>
            </template>
            <template v-else-if="column.key === 'teacherReviewScore'">
              <span
                v-if="paperQuestions[index].teacherReviewScore != null"
                class="score-summary-table__score"
              >
                {{ paperQuestions[index].teacherReviewScore }}
              </span>
              <span v-else class="score-finalize__hint">-</span>
            </template>
          </template>
        </UiDataTable>

        <h4 class="score-finalize__detail-section-title">
          本课程历次成绩趋势
          <span v-if="historicalSummary" class="score-finalize__detail-section-helper">
            共 {{ historicalSummary.count }} 场考试
            <span v-if="historicalSummary.deltaText"> · {{ historicalSummary.deltaText }}</span>
          </span>
        </h4>
        <UiSkeletonState v-if="historicalLoading" variant="card" compact />
        <MarkTrendSection
          v-else
          title=""
          :hint="historicalTrendHint"
          :point-count="historicalTrendPoints.length"
          :option="historicalTrendChartOption"
          height="220px"
          :last-value="historicalTrendLastValue"
          value-unit=" 分"
          :single-point-description="MARK_CHART_EMPTY.trendSingleExam"
          :empty-description="MARK_CHART_EMPTY.trendNoHistory"
          :aria-label="historicalTrendAriaLabel"
        />

        <h4 class="score-finalize__detail-section-title">操作记录</h4>
        <UiSkeletonState v-if="auditLoading" variant="card" compact />
        <UiActivityTimeline
          v-else-if="auditTimelineGroups.length > 0"
          :groups="auditTimelineGroups"
          compact
        />
        <UiEmpty v-else description="暂无操作记录" />
      </div>
    </UiDrawer>

    <!-- 确认成绩 Drawer -->
    <UiDrawer
      :open="confirmOpen"
      title="确认最终成绩"
      :width="520"
      :confirm-loading="confirming"
      :hide-footer="false"
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
        <a-form-item
          :label="
            hasDailyScoreConfig
              ? '考试分（各题教师复核评分之和）'
              : '试卷计算总分将作为教师复核评分'
          "
        >
          <a-input
            :value="
              confirmComputedExamScore != null ? `${confirmComputedExamScore} 分` : '加载中...'
            "
            disabled
          />
        </a-form-item>
        <a-form-item v-if="hasDailyScoreConfig" label="日常成绩" :required="true">
          <a-input-number
            v-model:value="confirmDailyScore"
            :min="0"
            :max="dailyScoreFull ?? undefined"
            :precision="2"
            style="width: 100%"
            placeholder="请输入日常成绩"
          />
          <div v-if="dailyScoreFull != null" class="score-finalize__hint">
            日常满分 {{ dailyScoreFull }} 分
          </div>
        </a-form-item>
        <a-form-item v-if="hasDailyScoreConfig" label="总成绩预览">
          <a-input :value="formatScorePoints(confirmTotalScorePreview)" disabled />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="confirmAndPublish" :disabled="hasUnreviewedBlockingRisks">
            确认后立即发布并通知学生
          </a-checkbox>
        </a-form-item>
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
      <UiEmpty v-if="blockingRiskReasons.length === 0" description="暂无数据" />
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
            variant="outline"
            @click="goAbsenceConfirm"
          >
            前往缺考核对
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :loading="riskReviewSavingReasonCode === reason.reasonCode"
            :disabled="
              riskReviewSavingReasonCode !== null
                && riskReviewSavingReasonCode !== reason.reasonCode
            "
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
      :hide-footer="false"
      @update:open="(v: boolean) => (withdrawOpen = v)"
      @close="withdrawOpen = false"
      @confirm="handleWithdraw"
    >
      <a-form layout="vertical">
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

    <!-- D-3 下一步动作：确认成功后引导继续核对或跳转成绩发布 -->
    <UiDrawer
      :open="nextStep.visible"
      :title="nextStep.title"
      :width="480"
      :mask-closable="false"
      hide-footer
      @update:open="
        (v: boolean) => {
          if (!v) closeNextStep()
        }
      "
      @close="closeNextStep"
    >
      <div class="score-finalize__next-step">
        <a-typography-paragraph class="score-finalize__next-step-desc">
          {{ nextStep.description }}
        </a-typography-paragraph>
        <div class="score-finalize__next-step-actions">
          <UiButton
            v-if="nextStep.kind === 'all-confirmed'"
            variant="outline"
            size="md"
            @click="handleNextStepGoPublish"
          >
            前往成绩发布
          </UiButton>
          <UiButton
            v-else-if="nextStep.kind === 'continue-next' && nextStep.nextCandidate"
            variant="outline"
            size="md"
            @click="handleNextStepConfirmContinue"
          >
            继续确认下一份
          </UiButton>
          <UiButton variant="outline" size="md" @click="closeNextStep"> 稍后处理 </UiButton>
        </div>
      </div>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/_util/type'
import type { ColumnType } from 'ant-design-vue/es/table'
import type { TablePaginationConfig } from 'ant-design-vue/es/table/interface'
import type { OperationLogResponse, OperationTypeCode } from '@/apis/mark/admin-audit'
import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamPaperScoreResponse, ExamQuestionScoreResponse } from '@/apis/mark/exam-grade'
import type { ExamWorkbenchScorePanelResponse } from '@/apis/mark/exam-progress'
import type {
  ExamScoreSummaryItemResponse,
  FinalScoreRiskOverviewResponse,
  FinalScoreRiskReasonCode,
} from '@/apis/mark/exam-score'
import type { FinalScoreStatusCode } from '@/apis/mark/final-score-status'
import type { ScoreBiasLevelCode } from '@/apis/mark/score-bias'
import type {
  BadgeTone,
  FilterField,
  UiTableRowActionItem,
  UiTrendPoint,
} from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AuditTargetTypeCode,
  listOperationLogs,
  OperationTypeDescription,
} from '@/apis/mark/admin-audit'
import { getExamDetail, pageExams } from '@/apis/mark/exam'
import { getPaperScore } from '@/apis/mark/exam-grade'
import { getScorePanel } from '@/apis/mark/exam-progress'
import {
  batchConfirmSafeFinalScores,
  confirmFinalScore,
  getFinalScoreRiskOverview,
  pageExamScoreSummary,
  publishFinalScore,
  saveFinalScoreRiskReview,
  withdrawFinalScore,
} from '@/apis/mark/exam-score'
import {
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
import {
  classifyScoreBias,
  computeScoreBiasStats,
  formatScoreBiasDelta,
  SCORE_BIAS_LEVEL_TONE,
  ScoreBiasLevelDescription,
} from '@/apis/mark/score-bias'
import MarkTrendSection from '@/components/chart/MarkTrendSection.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiActivityTimeline from '@/components/ui-guide/ui/UiActivityTimeline.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import ScoreReleaseStepPipeline from '@/components/workbench/ScoreReleaseStepPipeline.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchNoticeBanner from '@/components/workbench/WorkbenchNoticeBanner.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useScorePublishPreconditions } from '@/composables/useScorePublishPreconditions'
import { useScoreReleaseNavigation } from '@/composables/useScoreReleaseNavigation'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { buildExamScoreSummaryTableColumns } from '@/utils/exam-score-summary-table-columns'
import { formatDateTime, formatDateTimeWithSeconds } from '@/utils/format'
import { formatTrendAriaLabel, MARK_CHART_EMPTY } from '@/utils/mark-chart-accessibility'
import { buildTrendChartInsight } from '@/utils/mark-chart-insights'
import { buildTrendLineChartOption } from '@/utils/mark-echarts-options'
import { readAllPages } from '@/utils/page-result'
import {
  buildScoreConfirmStatusTabItems,
  SCORE_STATUS_TAB_ALL,
} from '@/utils/score-workbench-analytics'
import { buildScoreFinalizeSignalMetrics } from '@/utils/score-workbench-signal'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScoreFinalize' })

const SCORE_AUDIT_LOG_PAGE_SIZE = 100

function finalScoreStatusTone(value: FinalScoreStatusCode) {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, value, '最终成绩状态')
}

function finalScoreStatusLabel(value: FinalScoreStatusCode): string {
  return strictEnumLabel(FinalScoreStatusDescription, value, '最终成绩状态')
}

interface ScoreFilterForm {
  [key: string]: unknown
  keyword: string
}

const scoreFilterForm = reactive<ScoreFilterForm>({
  keyword: '',
})

const statusTabKey = ref<Key>(SCORE_STATUS_TAB_ALL)

const scoreFilterModel = computed<Record<string, unknown>>({
  get: () => scoreFilterForm,
  set: (value) => {
    Object.assign(scoreFilterForm, value)
  },
})

const scoreFilterFields: FilterField[] = [
  {
    key: 'keyword',
    type: 'input',
    placeholder: '按学号 / 姓名搜索',
    allowClear: true,
    width: 240,
    inputPrefixIcon: 'search',
    triggerSearchOnChange: false,
  },
]

const router = useRouter()
const { goScorePublish, goExportTasks } = useScoreReleaseNavigation()

function goLayoutDesigner(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceLayoutDesigner',
    params: { examId: selectedExamId.value },
  })
}

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const examDetail = ref<ExamDetailResponse | null>(null)

async function loadExamDetail(): Promise<void> {
  if (!selectedExamId.value) {
    examDetail.value = null
    return
  }
  try {
    examDetail.value = await getExamDetail(selectedExamId.value)
  } catch (error) {
    examDetail.value = null
    showUserError(error, '考试详情加载失败')
  }
}

// ─── 考生名单（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemResponse[]>([])
const loading = ref(false)
const riskOverview = ref<FinalScoreRiskOverviewResponse | null>(null)
const scorePanel = ref<ExamWorkbenchScorePanelResponse | null>(null)
const riskOverviewLoading = ref(false)
const panelLoadError = ref('')

const statusTabItems = computed(() => buildScoreConfirmStatusTabItems(effectiveRiskOverview.value))

const effectiveRiskOverview = computed(
  () => riskOverview.value ?? scorePanel.value?.riskOverview ?? null,
)

const panelNotice = computed(() => {
  if (scorePanel.value?.panelBlockedReason) {
    return {
      title: '制卷前置条件未满足',
      description: scorePanel.value.panelBlockedReason,
      tone: 'warning' as const,
      action: 'layout' as const,
    }
  }
  if (panelLoadError.value && !effectiveRiskOverview.value) {
    return {
      title: '成绩风险概览暂不可用',
      description: panelLoadError.value,
      tone: 'info' as const,
      action: null,
    }
  }
  return null
})

const { ensureScorePublishPreconditions } = useScorePublishPreconditions({
  examId: selectedExamId,
  riskOverview: effectiveRiskOverview,
  scorePanel,
})

const batchConfirming = ref(false)
const riskReviewDrawerOpen = ref(false)
const riskReviewSavingReasonCode = ref<FinalScoreRiskReasonCode | null>(null)
const reviewedRiskReasonCodes = ref<Set<FinalScoreRiskReasonCode>>(new Set())

const HARD_BLOCKING_RISK_REASON_CODES = new Set<FinalScoreRiskReasonCode>(['UNRECONCILED_ABSENCE'])

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
})

const columns = computed(() =>
  buildExamScoreSummaryTableColumns('finalize', hasDailyScoreConfig.value),
)

const hasDailyScoreConfig = computed(() => examDetail.value?.dailyScoreFull != null)
const dailyScoreFull = computed(() => examDetail.value?.dailyScoreFull ?? null)

async function loadCandidates(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const result = await pageExamScoreSummary({
      examId: selectedExamId.value,
      keyword: scoreFilterForm.keyword.trim() || undefined,
      finalScoreStatus: resolveStatusTabFilter(statusTabKey.value),
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? DEFAULT_LIST_PAGE_SIZE,
    })
    candidates.value = result.list
    pagination.total = result.total
    if (result.pageNum != null) {
      pagination.current = result.pageNum
    }
    if (result.pageSize != null) {
      pagination.pageSize = result.pageSize
    }
  } catch (error) {
    showUserError(error, '成绩确认名单加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function loadRiskOverview(): Promise<void> {
  if (!selectedExamId.value) {
    riskOverview.value = null
    panelLoadError.value = ''
    return
  }
  riskOverviewLoading.value = true
  panelLoadError.value = ''
  try {
    riskOverview.value = await getFinalScoreRiskOverview({ examId: selectedExamId.value })
    const validReasonCodes = new Set(blockingRiskReasons.value.map((reason) => reason.reasonCode))
    reviewedRiskReasonCodes.value = new Set(
      (riskOverview.value.reviewedReasonCodes ?? []).filter((reasonCode) =>
        validReasonCodes.has(reasonCode),
      ),
    )
  } catch (error) {
    riskOverview.value = null
    if (!scorePanel.value?.riskOverview) {
      panelLoadError.value = getUserErrorMessage(error, '成绩风险概览加载失败')
    }
  } finally {
    riskOverviewLoading.value = false
  }
}

async function loadScorePanel(): Promise<void> {
  if (!selectedExamId.value) {
    scorePanel.value = null
    return
  }
  try {
    scorePanel.value = await getScorePanel(selectedExamId.value)
  } catch {
    scorePanel.value = null
  }
}

async function refreshScoreFinalizeData(): Promise<void> {
  await loadScorePanel()
  await Promise.all([loadCandidates(), loadRiskOverview()])
}

async function refreshAfterScoreWrite(): Promise<void> {
  await refreshScoreFinalizeData()
  try {
    await refreshSnapshot()
  } catch {
    // 非工作台上下文时忽略
  }
}

function handleSearch(): void {
  pagination.current = 1
  void loadCandidates()
}

function handleReset(): void {
  scoreFilterForm.keyword = ''
  statusTabKey.value = SCORE_STATUS_TAB_ALL
  pagination.current = 1
  void loadCandidates()
}

function resolveStatusTabFilter(tabKey: Key): FinalScoreStatusCode | undefined {
  if (tabKey === SCORE_STATUS_TAB_ALL) {
    return undefined
  }
  return tabKey as FinalScoreStatusCode
}

function handleStatusTabChange(tabKey: Key): void {
  statusTabKey.value = tabKey
  pagination.current = 1
  void loadCandidates()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void loadCandidates()
}

// ─── 状态机按钮可用性 ─────────────────────────────
function canConfirm(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  return s === 'PENDING' || s === 'CALCULATED' || s === 'WITHDRAWN' || s === 'CORRECTED'
}
function confirmButtonLabel(record: ExamScoreSummaryItemResponse): string {
  const s = record.finalScoreStatus
  if (s === 'WITHDRAWN' || s === 'CORRECTED') return '重新确认'
  return '确认'
}
function canPublish(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  if (hasHardBlockingRisks.value || hasUnreviewedBlockingRisks.value) return false
  const s = record.finalScoreStatus
  // CONFIRMED / WITHDRAWN / CORRECTED 可以发布
  return s === 'CONFIRMED' || s === 'WITHDRAWN' || s === 'CORRECTED'
}
function publishButtonLabel(record: ExamScoreSummaryItemResponse): string {
  return record.finalScoreStatus === 'WITHDRAWN' ? '重新发布' : '发布'
}

const blockingRiskReasons = computed(() => {
  const reasons = effectiveRiskOverview.value?.riskReasons ?? []
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
    name: 'TeacherExamWorkspaceScoreAbsence',
    params: examId ? { examId } : {},
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
  const overview = effectiveRiskOverview.value
  return Boolean(
    overview
    && overview.safeConfirmableCount > 0
    && blockingRiskReasons.value.length === 0
    && !hasHardBlockingRisks.value
    && !hasDailyScoreConfig.value
    && !batchConfirming.value,
  )
})

async function handleBatchConfirmSafe(): Promise<void> {
  if (!selectedExamId.value || !effectiveRiskOverview.value) return
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
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '批量确认无风险成绩失败')
  } finally {
    batchConfirming.value = false
  }
}

const statMetrics = computed((): SignalMetric[] =>
  buildScoreFinalizeSignalMetrics(scorePanel.value, effectiveRiskOverview.value),
)

const delayedAutoConfirmNotice = computed(() => {
  const panel = scorePanel.value
  if (!panel || panel.manualFinalScoreConfirmRequired) {
    return null
  }
  const pending = panel.pendingDelayedFinalScoreConfirmCount
  if (pending <= 0) {
    return null
  }
  return `当前有 ${pending} 份答卷处于 ${panel.delayedFinalScoreConfirmMinutes} 分钟延迟自动确认窗口内，到期后将自动汇总确认最终成绩。`
})

const blockedDelayedAutoConfirmNotice = computed(() => {
  const panel = scorePanel.value
  if (!panel || panel.manualFinalScoreConfirmRequired) {
    return null
  }
  const blocked = panel.blockedDelayedFinalScoreConfirmCount
  if (blocked <= 0) {
    return null
  }
  return `有 ${blocked} 份答卷延迟自动确认连续失败，成绩仍停留在可确认态。请在本页逐份确认最终成绩，或前往批改进度查看任务诊断。`
})

function goDelayedConfirmTasks(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceMarkingReviewProgress',
    params: { examId: selectedExamId.value },
    query: { taskType: 'DELAYED_FINAL_SCORE_CONFIRM' },
  })
}

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
const pageScoreStats = computed(() =>
  computeScoreBiasStats(
    candidates.value
      .map((candidate) => candidate.finalScore)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
  ),
)

function biasLevelLabel(level: ScoreBiasLevelCode): string {
  return strictEnumLabel(ScoreBiasLevelDescription, level, '成绩偏差等级')
}

function biasLevelTone(level: ScoreBiasLevelCode): BadgeTone {
  return strictEnumTone(SCORE_BIAS_LEVEL_TONE, level, '成绩偏差等级')
}

function buildFinalizeActions(record: ExamScoreSummaryItemResponse): UiTableRowActionItem[] {
  return [
    { key: 'detail', label: '明细', disabled: !record.paperInstanceId },
    {
      key: 'confirm',
      label: confirmButtonLabel(record),
      disabled: !canConfirm(record),
    },
    {
      key: 'publish',
      label: publishButtonLabel(record),
      disabled: !canPublish(record),
    },
    { key: 'withdraw', label: '撤回', disabled: !canWithdraw(record) },
  ]
}

function handleFinalizeRowAction(key: string, record: ExamScoreSummaryItemResponse): void {
  switch (key) {
    case 'detail':
      void openDetailDrawer(record)
      break
    case 'confirm':
      void openConfirmModal(record)
      break
    case 'publish':
      void handlePublish(record)
      break
    case 'withdraw':
      openWithdrawModal(record)
      break
  }
}

function canWithdraw(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  return s === 'PUBLISHED' || s === 'CORRECTED'
}

// ─── 成绩明细 Drawer ─────────────────────────────
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const paperScore = ref<ExamPaperScoreResponse | null>(null)

// computed 派生强类型题目数组，模板侧用 paperQuestions[index] 取 VO，避免 a-table slot record 类型丢失。
const paperQuestions = computed<ExamQuestionScoreResponse[]>(
  () => paperScore.value?.questions ?? [],
)

const paperItemColumns: ColumnType<ExamQuestionScoreResponse>[] = [
  { title: '题号', key: 'questionNo', width: 80 },
  { title: '题型', dataIndex: 'questionType', key: 'questionType', width: 100 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '题目得分', key: 'teacherReviewScore', width: 100 },
  { title: '状态', dataIndex: 'gradeStatus', key: 'gradeStatus', width: 110 },
]

// ─── B-6 操作记录（审计可追溯） ─────────────────────────────
const auditLogs = ref<OperationLogResponse[]>([])
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

function scoreAuditTitle(log: OperationLogResponse): string {
  return strictEnumLabel(OperationTypeDescription, log.operationType, '审计操作类型')
}

function scoreAuditTone(log: OperationLogResponse): BadgeTone {
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
      (pageNum) =>
        listOperationLogs({
          examId,
          targetType: AuditTargetTypeCode.EXAM_FINAL_SCORE,
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
  const courseId = examDetail.value?.courseId
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

/** 历次成绩趋势图：考试名为 label，教师复核评分为 value，当前考试 key 高亮 */
const historicalTrendPoints = computed<UiTrendPoint[]>(() => {
  return historicalScores.value.map((p) => ({
    key: p.examId,
    label: p.examName.length > 8 ? `${p.examName.slice(0, 8)}…` : p.examName,
    value: p.finalScore,
  }))
})

const historicalTrendHint = computed(() =>
  buildTrendChartInsight(historicalTrendPoints.value, { valueUnit: ' 分' }),
)

const { chartOption: historicalTrendChartOption } = useChartOption(() =>
  buildTrendLineChartOption(historicalTrendPoints.value, {
    yAxisName: '教师复核分',
    area: true,
    highlightKey: selectedExamId.value ?? '',
    emptyText: MARK_CHART_EMPTY.trendNoHistory,
  }),
)

const historicalTrendLastValue = computed(() => {
  const points = historicalTrendPoints.value
  if (points.length === 0) {
    return null
  }
  return Number(points[points.length - 1]?.value)
})

const historicalTrendAriaLabel = computed(() =>
  formatTrendAriaLabel(
    '本课程历次成绩趋势',
    historicalTrendPoints.value.length,
    historicalTrendLastValue.value,
    ' 分',
  ),
)

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

async function openDetailDrawer(record: ExamScoreSummaryItemResponse): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  detailCandidate.value = record
  detailOpen.value = true
  detailLoading.value = true
  paperScore.value = null
  auditLogs.value = []
  historicalScores.value = []
  try {
    paperScore.value = await getPaperScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
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
const confirmCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const confirmComputedExamScore = ref<number | null>(null)
const confirmDailyScore = ref<number | undefined>(undefined)
const confirmAndPublish = ref(false)

const confirmTotalScorePreview = computed<number | null>(() => {
  const examScore = confirmComputedExamScore.value
  if (examScore == null) {
    return null
  }
  if (hasDailyScoreConfig.value) {
    if (confirmDailyScore.value == null) {
      return null
    }
    return Number((examScore + confirmDailyScore.value).toFixed(2))
  }
  return Number(examScore.toFixed(2))
})

function formatScorePoints(score: number | null | undefined): string {
  return score != null ? `${score} 分` : '—'
}

/** 按试卷题目明细计算确认弹窗卷面分预览；后端 confirmFinalScore 仍是最终写入真源。 */
function resolveConfirmExamScorePreview(score: ExamPaperScoreResponse): number {
  if (score.examScore != null) {
    return score.examScore
  }
  if (score.totalScore != null && !hasDailyScoreConfig.value) {
    return score.totalScore
  }
  const questions = score.questions ?? []
  if (
    questions.length === 0
    || questions.some(
      (question) => question.gradeStatus !== 'CONFIRMED' || question.teacherReviewScore == null,
    )
  ) {
    return 0
  }
  return Number(
    questions
      .reduce((sum, question) => sum + Number(question.teacherReviewScore ?? 0), 0)
      .toFixed(2),
  )
}

async function openConfirmModal(record: ExamScoreSummaryItemResponse): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  confirmCandidate.value = record
  confirmOpen.value = true
  confirmComputedExamScore.value = null
  confirmDailyScore.value = undefined
  confirmAndPublish.value = false
  try {
    const score = await getPaperScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    confirmComputedExamScore.value = resolveConfirmExamScorePreview(score)
    if (hasDailyScoreConfig.value) {
      confirmDailyScore.value = score.dailyScore ?? undefined
    }
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
  nextCandidate: ExamScoreSummaryItemResponse | null
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
  const overview = effectiveRiskOverview.value
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
    description:
      '当前页成绩已处理，全场仍有待确认或风险项，请切换筛选 / 翻页或处理风险概览中的问题。',
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
  closeNextStep()
  void handleGoScorePublish()
}

async function handleGoScorePublish(): Promise<void> {
  const canContinue = await ensureScorePublishPreconditions()
  if (!canContinue) {
    return
  }
  goScorePublish()
}

async function handleConfirm(): Promise<void> {
  if (!selectedExamId.value || !confirmCandidate.value?.paperInstanceId) return
  if (warnUnreviewedBlockingRisks()) return
  if (hasDailyScoreConfig.value && confirmDailyScore.value == null) {
    message.warning('请录入日常成绩')
    return
  }
  const examId = selectedExamId.value
  const paperInstanceId = confirmCandidate.value.paperInstanceId
  confirming.value = true
  try {
    await confirmFinalScore({
      examId,
      paperInstanceId,
      dailyScore: hasDailyScoreConfig.value ? (confirmDailyScore.value ?? undefined) : undefined,
    })
    if (confirmAndPublish.value) {
      const canContinue = await ensureScorePublishPreconditions()
      if (!canContinue) {
        message.success('成绩已确认，发布前请先完成缺考核对或风险处置')
        confirmOpen.value = false
        await refreshAfterScoreWrite()
        deriveNextStepSuggestion()
        return
      }
      await publishFinalScore({ examId, paperInstanceId })
      message.success('成绩已确认并发布，学生通知已下发')
    } else {
      message.success('成绩已确认，可在列表点击「发布」推送到学生侧')
    }
    confirmOpen.value = false
    await refreshAfterScoreWrite()
    deriveNextStepSuggestion()
  } catch (error) {
    showUserError(error, '成绩确认失败')
  } finally {
    confirming.value = false
  }
}

// ─── 发布成绩 ─────────────────────────────
async function handlePublish(record: ExamScoreSummaryItemResponse): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  if (warnUnreviewedBlockingRisks()) return
  const canContinue = await ensureScorePublishPreconditions()
  if (!canContinue) {
    return
  }
  try {
    await publishFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    message.success('成绩已发布，学生通知已下发')
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '成绩发布失败')
  }
}

// ─── 撤回成绩 Modal ─────────────────────────────
const withdrawOpen = ref(false)
const withdrawing = ref(false)
const withdrawCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const withdrawReason = ref('')

function openWithdrawModal(record: ExamScoreSummaryItemResponse): void {
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
    await refreshAfterScoreWrite()
  } catch (error) {
    showUserError(error, '成绩撤回失败')
  } finally {
    withdrawing.value = false
  }
}

// ─── 初始化 ─────────────────────────────────────
watch(
  selectedExamId,
  (value) => {
    pagination.current = 1
    statusTabKey.value = SCORE_STATUS_TAB_ALL
    scoreFilterForm.keyword = ''
    reviewedRiskReasonCodes.value = new Set()
    riskReviewDrawerOpen.value = false
    examDetail.value = null
    candidates.value = []
    riskOverview.value = null
    scorePanel.value = null
    panelLoadError.value = ''
    pagination.total = 0
    if (value) {
      void Promise.all([loadExamDetail(), refreshScoreFinalizeData()])
    }
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
.score-finalize-page {
  min-width: 0;
}

.score-finalize {
  &__notice-banner {
    margin-top: var(--dp-space-3);
  }

  &__alert {
    margin-top: var(--dp-space-3);
  }

  &__guide {
    margin-bottom: 12px;
  }

  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__table-section {
    margin-top: var(--dp-space-3);
  }

  &__table-shell {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-4);
    padding: var(--dp-space-4) var(--dp-space-5) var(--dp-space-5);
  }

  &__status-tabs {
    :deep(.ui-section-tabs__nav) {
      align-self: stretch;
      width: 100%;
    }
  }

  &__table-toolbar {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-3);
    width: 100%;
  }

  &__table-toolbar-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--dp-space-3);
    flex-wrap: wrap;
    width: 100%;
  }

  &__table-title {
    margin: 0;
    font-size: 16px;
    font-weight: var(--dp-font-weight-title);
    line-height: 1.5;
    color: var(--dp-text-primary);
  }

  &__table {
    :deep(.ant-table-thead > tr > th) {
      background: var(--dp-surface-soft);
      font-weight: 600;
    }
  }

  &__detail-summary {
    margin-bottom: 16px;
  }

  &__detail-section-title {
    margin: 16px 0 8px 0;
    font-size: 14px;
    font-weight: 600;
  }

  &__hint {
    color: var(--dp-text-muted);
  }

  &__table-actions {
    display: flex;
    align-items: center;
    gap: 8px;
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
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface);
  }

  &__risk-review-main {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  &__risk-review-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__risk-review-desc {
    margin-top: 4px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__bias-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__bias-delta {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__detail-section-helper {
    margin-left: 8px;
    font-size: 12px;
    font-weight: normal;
    color: var(--dp-text-muted);
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
    color: var(--dp-text);
  }

  &__next-step-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
}
</style>
