<template>
  <StageWorkbenchShell class="score-publish-page">
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        :title="contextBarTitle"
        :subtitle="contextBarSubtitle"
      >
        <template #status>
          <UiTag tone="blue" size="sm">阶段 成绩发布</UiTag>
          <UiTag v-if="examArchiveGate?.allScoresPublished" tone="green" size="sm">已全部发布</UiTag>
          <UiTag v-else-if="pendingAbsenceCount > 0" tone="orange" size="sm">缺考待确认</UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goExportTasks">
            导出任务
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="goScoreConfirm">
            返回成绩确认
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="!canBulkPublish"
            @click="openBulkPublishModal"
          >
            <template #icon><ThunderboltOutlined /></template>
            全场发布
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand variant="tiles" :metrics="publishSignalMetrics" compact />
    </template>

    <UiEmpty v-if="!selectedExamId" description="请从考试工作台进入成绩发布" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <ScoreReleaseStepPipeline
        :overview="finalScoreOverview"
        :all-scores-published="examArchiveGate?.allScoresPublished === true"
      />

      <UiAlertStrip
        v-if="pendingAbsenceCount > 0"
        tone="warning"
        title="仍有缺考记录待确认"
        :description="`当前还有 ${pendingAbsenceCount} 条待确认缺考，发布前须完成核对。`"
        dense
        class="score-publish__alert"
      >
        <template #actions>
          <UiButton variant="primary" size="sm" @click="goAbsenceConfirm">
            前往缺考确认
          </UiButton>
        </template>
      </UiAlertStrip>

      <ScoreWorkbenchAnalyticsSection
        :panel="scorePanel"
        :loading="finalScoreOverviewLoading"
        mode="publish"
        :publishable-count="publishableOverviewCount"
        :gate="examArchiveGate"
      />

      <ExamArchiveGateBanner
        ref="gateBannerRef"
        :exam-id="selectedExamId"
        compact
        show-class-progress-table
        @go-close-exam="goExamListForClose"
        @loaded="onExamArchiveGateLoaded"
      />

      <WorkbenchSurfaceCard flush class="score-publish__table-section">
        <template #head>考生成绩</template>
        <template #toolbar>
          <UiFilterBar
            v-model="scoreFilterModel"
            :fields="scoreFilterFields"
            search-text="查询"
            @search="handleSearch"
            @reset="handleReset"
          />
          <div v-if="showIncompleteClassChip" class="score-publish__filter-chips">
            <button
              type="button"
              class="score-publish__filter-chip"
              :class="{ 'score-publish__filter-chip--active': scoreFilterForm.unpublishedBoundOnly }"
              @click="toggleIncompleteClassFilter"
            >
              仅看未齐班级
            </button>
          </div>
        </template>

        <UiDataTable
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :columns="columns"
          :data-source="candidates"
          :loading="loading"
          :total="pagination.total"
          flat
          row-key="candidateRosterId"
          size="middle"
          class="score-publish__table student-detail-table__data-table"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'studentNo'">
              <span class="score-summary-table__mono">{{ candidates[index].studentNo || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'studentName'">
              {{ candidates[index].studentName || '—' }}
            </template>
            <template v-else-if="column.key === 'examScore'">
              <span v-if="candidates[index].examScore != null" class="score-summary-table__score">
                {{ candidates[index].examScore }}
              </span>
              <span v-else class="score-publish__hint">—</span>
            </template>
            <template v-else-if="column.key === 'dailyScore'">
              <span v-if="candidates[index].dailyScore != null" class="score-summary-table__score">
                {{ candidates[index].dailyScore }}
              </span>
              <span v-else class="score-publish__hint">—</span>
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <span v-if="candidates[index].finalScore != null" class="score-summary-table__score score-summary-table__score--total">
                {{ candidates[index].finalScore }}
              </span>
              <span v-else class="score-publish__hint">—</span>
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
                <UiTextAction
                  v-if="candidates[index].paperInstanceId"
                  @click="openDetailDrawer(candidates[index])"
                >
                  明细
                </UiTextAction>
                <span v-else class="muted">—</span>
                <UiTextAction
                  tone="primary"
                  :disabled="!canPublish(candidates[index])"
                  @click="handlePublish(candidates[index])"
                >
                  {{ publishButtonLabel(candidates[index]) }}
                </UiTextAction>
                <UiTextAction
                  :disabled="!canWithdraw(candidates[index])"
                  @click="openWithdrawModal(candidates[index])"
                >
                  撤回
                </UiTextAction>
              </div>
            </template>
          </template>
        </UiDataTable>
      </WorkbenchSurfaceCard>

      <ScorePublishRelatedLinksCard variant="publish" />
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
        <a-descriptions :column="2" size="small" bordered class="score-publish__detail-summary">
          <a-descriptions-item label="答卷">
            {{ detailCandidate?.paperDisplay.primaryText }}
          </a-descriptions-item>
          <a-descriptions-item label="班级">
            {{ detailCandidate?.studentClassName }}
          </a-descriptions-item>
          <a-descriptions-item v-if="hasDailyScoreConfig" label="考试分">
            <span class="score-summary-table__score">{{ paperScore.examScore ?? 0 }} 分</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="hasDailyScoreConfig" label="日常分">
            <span class="score-summary-table__score">{{ paperScore.dailyScore ?? 0 }} 分</span>
          </a-descriptions-item>
          <a-descriptions-item :label="hasDailyScoreConfig ? '总成绩' : '总分'">
            <span class="score-summary-table__score score-summary-table__score--total">
              {{ paperScore.totalScore ?? 0 }} 分
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="最终状态" :span="2">
            <UiTag :tone="finalScoreStatusTone(paperScore.finalScoreStatus)" size="sm">
              {{ finalScoreStatusLabel(paperScore.finalScoreStatus) }}
            </UiTag>
          </a-descriptions-item>
        </a-descriptions>

        <h4 class="score-publish__detail-section-title">题目得分明细</h4>
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
              <span v-else class="score-publish__hint">-</span>
            </template>
          </template>
        </UiDataTable>
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

    <!-- 全场发布 Drawer：后端按考试全场口径筛选并逐卷发布 -->
    <UiDrawer
      :open="bulkOpen"
      title="全场发布成绩"
      :width="720"
      :mask-closable="!bulkRunning"
      :closable="!bulkRunning"
      hide-footer
      @update:open="(v: boolean) => { if (!bulkRunning) bulkOpen = v }"
      @close="bulkOpen = false"
    >
      <div v-if="finalScoreOverview" class="score-publish__bulk-stats analytics-stats">
        <div
          v-for="item in bulkModalStatItems"
          :key="item.key"
          class="analytics-stats__card"
        >
          <div class="analytics-stats__value" :class="bulkModalValueClass(item.valClass)">
            {{ item.value }}
          </div>
          <div class="analytics-stats__label">{{ item.label }}</div>
        </div>
      </div>
      <div v-if="bulkResult" class="score-publish__bulk-result">
        <a-progress
          :percent="bulkResultPercent"
          :status="bulkResult.failureCount > 0 || bulkResult.remainingCount > 0 ? 'exception' : 'success'"
        />
        <div class="score-publish__bulk-meta">
          本次成功 {{ bulkResult.successCount }} 条 · 失败 {{ bulkResult.failureCount }} 条 ·
          全场已发布 {{ bulkResult.alreadyPublishedCount }} / {{ bulkResult.totalCandidateCount }}
        </div>
      </div>
      <a-list
        v-if="bulkResult?.failures.length"
        size="small"
        :data-source="bulkResult.failures"
        class="score-publish__bulk-list"
      >
        <template #renderItem="{ item, index }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                试卷实例 {{ item.paperInstanceId }}
              </template>
              <template #description>
                <UiTag tone="red" size="sm" class="score-publish__bulk-error-tag">
                  {{ item.code }}
                </UiTag>
                {{ item.message }}
              </template>
            </a-list-item-meta>
            <UiTag tone="red" size="sm">失败 {{ index + 1 }}</UiTag>
          </a-list-item>
        </template>
      </a-list>
      <template #footer>
        <UiButton variant="outline" size="md" :disabled="bulkRunning" @click="bulkOpen = false">
          取消
        </UiButton>
        <UiButton
          size="md"
          :loading="bulkRunning"
          :disabled="!canBulkPublish"
          @click="runBulkPublish"
        >
          确认全场发布
        </UiButton>
      </template>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { TablePaginationConfig } from 'ant-design-vue/es/table/interface'
import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import type {
  ExamDetailResponse,
} from '@/apis/mark/exam'
import type { ExamPaperScoreResponse, ExamQuestionScoreResponse } from '@/apis/mark/exam-grade'
import type {ExamWorkbenchScorePanelResponse} from '@/apis/mark/exam-progress';
import type {
  ExamScoreSummaryItemResponse,
  FinalScoreBatchPublishResponse,
  FinalScoreRiskOverviewResponse,
} from '@/apis/mark/exam-score'
import type { FinalScoreStatusCode } from '@/apis/mark/final-score-status'
import type { FilterField } from '@/components/ui-guide/ui/types'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AbsenceStatusCode, listAbsenceRecords } from '@/apis/mark/absence'
import {
  getExamDetail,
} from '@/apis/mark/exam'
import { getPaperScore } from '@/apis/mark/exam-grade'
import { getScorePanel } from '@/apis/mark/exam-progress'
import {
  batchPublishFinalScores,
  pageExamScoreSummary,
  publishFinalScore,
  withdrawFinalScore,
} from '@/apis/mark/exam-score'
import {
  FINAL_SCORE_STATUS_OPTIONS,
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
import ExamArchiveGateBanner from '@/components/archive-volume/ExamArchiveGateBanner.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import ScorePublishRelatedLinksCard from '@/components/workbench/ScorePublishRelatedLinksCard.vue'
import ScoreReleaseStepPipeline from '@/components/workbench/ScoreReleaseStepPipeline.vue'
import ScoreWorkbenchAnalyticsSection from '@/components/workbench/ScoreWorkbenchAnalyticsSection.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useExamJourneyContextBar } from '@/composables/useExamJourneyContextBar'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useScoreReleaseNavigation } from '@/composables/useScoreReleaseNavigation'
import { showUserError } from '@/utils/error-handler'
import { buildExamScoreSummaryTableColumns } from '@/utils/exam-score-summary-table-columns'
import { formatDateTime } from '@/utils/format'
import { buildScoreBulkPublishModalStatItems } from '@/utils/score-workbench-analytics'
import { buildScorePublishSignalMetrics } from '@/utils/score-workbench-signal'
import { toSignalMetrics } from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScorePublish' })

function finalScoreStatusTone(value: FinalScoreStatusCode) {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, value, '最终成绩状态')
}

function finalScoreStatusLabel(value: FinalScoreStatusCode): string {
  return strictEnumLabel(FinalScoreStatusDescription, value, '最终成绩状态')
}

const statusOptions = FINAL_SCORE_STATUS_OPTIONS

const scoreFilterForm = reactive<{
  keyword: string
  statusFilter?: FinalScoreStatusCode
  classId?: string
  unpublishedBoundOnly: boolean
}>({
  keyword: '',
  statusFilter: undefined,
  classId: undefined,
  unpublishedBoundOnly: false,
})

const examArchiveGate = ref<ArchiveVolumeExamGateResponse | null>(null)

const scoreFilterModel = computed<Record<string, unknown>>({
  get: () => scoreFilterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(scoreFilterForm, value)
  },
})

const scoreFilterFields = computed<FilterField[]>(() => {
  const classOptions = (examArchiveGate.value?.classPublishProgress ?? [])
    .map(item => ({
      label: item.className?.trim() || (item.classId ? `班级 ${item.classId}` : '未分班'),
      value: item.classId,
    }))
  const fields: FilterField[] = [
    {
      key: 'keyword',
      type: 'input',
      placeholder: '按学号 / 姓名搜索',
      allowClear: true,
      width: 240,
      inputPrefixIcon: 'search',
      triggerSearchOnChange: false,
    },
    {
      key: 'statusFilter',
      type: 'select',
      placeholder: '按最终状态过滤',
      allowClear: true,
      width: 200,
      options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
    },
  ]
  if (classOptions.length > 0) {
    fields.push({
      key: 'classId',
      type: 'select',
      placeholder: '按班级过滤',
      allowClear: true,
      width: 200,
      options: classOptions,
    })
  }
  return fields
})

const showIncompleteClassChip = computed(() =>
  (examArchiveGate.value?.unpublishedBoundPaperCount ?? 0) > 0,
)

const router = useRouter()
const { goScoreConfirm, goExportTasks } = useScoreReleaseNavigation()
const gateBannerRef = ref<InstanceType<typeof ExamArchiveGateBanner> | null>(null)

async function refreshArchiveGate(): Promise<void> {
  await gateBannerRef.value?.refresh()
}

function onExamArchiveGateLoaded(gate: ArchiveVolumeExamGateResponse): void {
  examArchiveGate.value = gate
}

function toggleIncompleteClassFilter(): void {
  scoreFilterForm.unpublishedBoundOnly = !scoreFilterForm.unpublishedBoundOnly
  if (scoreFilterForm.unpublishedBoundOnly) {
    scoreFilterForm.classId = undefined
  }
  pagination.current = 1
  void loadCandidates()
}

function goExamListForClose(): void {
  void router.push({ name: 'TeacherExamList' })
}

function goAbsenceConfirm(): void {
  const examId = selectedExamId.value
  if (!examId) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScoreAbsence',
    params: { examId },
  })
}

const { selectedExamId } = useMarkExamContext()
const { contextBarTitle, contextBarSubtitle } = useExamJourneyContextBar('成绩发布')
const { refreshSnapshot } = useWorkspaceExamId()

const examDetail = ref<ExamDetailResponse | null>(null)

async function loadExamDetail(): Promise<void> {
  if (!selectedExamId.value) {
    examDetail.value = null
    return
  }
  try {
    examDetail.value = await getExamDetail(selectedExamId.value)
  } catch {
    examDetail.value = null
  }
}

const hasDailyScoreConfig = computed(() => examDetail.value?.dailyScoreFull != null)

const columns = computed(() =>
  buildExamScoreSummaryTableColumns('publish', hasDailyScoreConfig.value),
)

// ─── 数据加载（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemResponse[]>([])
const loading = ref(false)
const pendingAbsenceCount = ref(0)
const finalScoreOverview = ref<FinalScoreRiskOverviewResponse | null>(null)
const scorePanel = ref<ExamWorkbenchScorePanelResponse | null>(null)
const finalScoreOverviewLoading = ref(false)

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
})

async function loadCandidates(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const result = await pageExamScoreSummary({
      examId: selectedExamId.value,
      keyword: scoreFilterForm.keyword.trim() || undefined,
      finalScoreStatus: scoreFilterForm.statusFilter,
      classId: scoreFilterForm.classId,
      unpublishedBoundOnly: scoreFilterForm.unpublishedBoundOnly || undefined,
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
    })
    candidates.value = result.list
    pagination.total = Number(result.total)
    if (result.pageNum != null) {
      pagination.current = result.pageNum
    }
    if (result.pageSize != null) {
      pagination.pageSize = result.pageSize
    }
  } catch (error) {
    showUserError(error, '成绩发布名单加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function loadFinalScoreOverview(): Promise<void> {
  if (!selectedExamId.value) {
    finalScoreOverview.value = null
    scorePanel.value = null
    return
  }
  finalScoreOverviewLoading.value = true
  try {
    const panel = await getScorePanel(selectedExamId.value)
    scorePanel.value = panel
    finalScoreOverview.value = panel.riskOverview
  } catch (error) {
    finalScoreOverview.value = null
    scorePanel.value = null
    showUserError(error, '全场成绩概览加载失败')
  } finally {
    finalScoreOverviewLoading.value = false
  }
}

async function loadPendingAbsenceCount(): Promise<void> {
  if (!selectedExamId.value) {
    pendingAbsenceCount.value = 0
    return
  }
  try {
    const result = await listAbsenceRecords({
      examId: selectedExamId.value,
      absenceStatus: AbsenceStatusCode.PENDING,
      pageNum: 1,
      pageSize: 1,
    })
    pendingAbsenceCount.value = Number(result.total)
  } catch (error) {
    pendingAbsenceCount.value = 0
    showUserError(error, '待确认缺考记录查询失败')
  }
}

function goToAbsenceConfirm(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceScoreAbsence',
    params: { examId: selectedExamId.value },
  })
}

async function ensureNoPendingAbsenceBeforePublish(): Promise<boolean> {
  if (!selectedExamId.value) {
    return false
  }
  await loadPendingAbsenceCount()
  if (pendingAbsenceCount.value > 0) {
    message.warning(
      `当前考试仍有 ${pendingAbsenceCount.value} 条待确认缺考记录，请先完成核对后再发布成绩`,
    )
    goToAbsenceConfirm()
    return false
  }
  const overview = finalScoreOverview.value
  if (overview && overview.unreconciledAbsenceCount > 0) {
    message.warning(
      `仍有 ${overview.unreconciledAbsenceCount} 名应考学生未完成缺考核对，请先完成缺考 reconcile 后再发布`,
    )
    goToAbsenceConfirm()
    return false
  }
  if (overview && !overview.readyToPublish && overview.blockedCount > 0) {
    message.warning(`仍有 ${overview.blockedCount} 项成绩风险未处置，请先完成确认或风险复核后再发布`)
    return false
  }
  return true
}

function handleSearch(): void {
  pagination.current = 1
  void loadCandidates()
}

function handleReset(): void {
  scoreFilterForm.keyword = ''
  scoreFilterForm.statusFilter = undefined
  scoreFilterForm.classId = undefined
  scoreFilterForm.unpublishedBoundOnly = false
  pagination.current = 1
  void loadCandidates()
}

function handlePageChange(pageInfo: { current: number, pageSize: number }): void {
  pagination.current = pageInfo.current
  pagination.pageSize = pageInfo.pageSize
  void loadCandidates()
}
// ─── 全场发布 ─────────────────────────────
const publishableOverviewCount = computed(() => {
  const overview = finalScoreOverview.value
  if (!overview) return 0
  return overview.confirmedCount + overview.withdrawnCount + overview.correctedCount
})

const bulkModalStatItems = computed(() => {
  const overview = finalScoreOverview.value
  if (!overview) {
    return []
  }
  return buildScoreBulkPublishModalStatItems(overview, publishableOverviewCount.value)
})

function bulkModalValueClass(valClass?: string): string | undefined {
  if (valClass === 'stat-card__val--ok') {
    return 'analytics-stats__value--green'
  }
  if (valClass === 'stat-card__val--warn') {
    return 'analytics-stats__value--warn'
  }
  return undefined
}

const canBulkPublish = computed(() =>
  Boolean(selectedExamId.value)
  && publishableOverviewCount.value > 0
  && finalScoreOverview.value?.readyToPublish === true
  && (finalScoreOverview.value?.blockedCount ?? 0) === 0,
)

const bulkOpen = ref(false)
const bulkRunning = ref(false)
const bulkResult = ref<FinalScoreBatchPublishResponse | null>(null)
const bulkResultPercent = computed(() => {
  const result = bulkResult.value
  if (!result || result.totalCandidateCount <= 0) return 0
  return Math.round((result.alreadyPublishedCount / result.totalCandidateCount) * 100)
})

function resetBulkState(): void {
  bulkResult.value = null
}

function openBulkPublishModal(): void {
  if (!canBulkPublish.value) {
    message.warning('当前考试没有可发布的最终成绩')
    return
  }
  void (async () => {
    await loadFinalScoreOverview()
    const canContinue = await ensureNoPendingAbsenceBeforePublish()
    if (!canContinue) {
      return
    }
    resetBulkState()
    bulkOpen.value = true
  })()
}

/** 调用后端全场发布入口，避免前端用当前分页候选误当全场候选。 */
async function runBulkPublish(): Promise<void> {
  if (!selectedExamId.value || bulkRunning.value) return
  const canContinue = await ensureNoPendingAbsenceBeforePublish()
  if (!canContinue) {
    bulkOpen.value = false
    return
  }
  bulkRunning.value = true
  try {
    bulkResult.value = await batchPublishFinalScores({ examId: selectedExamId.value })
    finalScoreOverview.value = bulkResult.value.afterOverview
    if (bulkResult.value.failureCount === 0 && bulkResult.value.remainingCount === 0) {
      message.success('全场成绩已发布，学生通知已下发')
      bulkOpen.value = false
    } else if (bulkResult.value.failureCount === 0) {
      message.warning(
        `全场发布完成：成功 ${bulkResult.value.successCount} 条，仍有 ${bulkResult.value.remainingCount} 条需处理`,
      )
    } else {
      message.warning(
        `全场发布完成：成功 ${bulkResult.value.successCount} 条，失败 ${bulkResult.value.failureCount} 条，请查看明细`,
      )
    }
    await Promise.all([loadCandidates(), loadFinalScoreOverview(), refreshArchiveGate()])
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '全场成绩发布失败')
  } finally {
    bulkRunning.value = false
  }
}

/* ========== 信号指标：发布流程状态分布 ========== */

const publishSignalMetrics = computed(() =>
  toSignalMetrics(
    buildScorePublishSignalMetrics(
      scorePanel.value,
      finalScoreOverview.value,
      examArchiveGate.value,
      publishableOverviewCount.value,
      pagination.total ?? 0,
    ),
  ),
)

// ─── 状态机按钮 ─────────────────────────────
function canPublish(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  const overview = finalScoreOverview.value
  if (overview && (!overview.readyToPublish || overview.blockedCount > 0)) {
    return false
  }
  const s = record.finalScoreStatus
  return s === 'CONFIRMED' || s === 'WITHDRAWN' || s === 'CORRECTED'
}
function publishButtonLabel(record: ExamScoreSummaryItemResponse): string {
  return record.finalScoreStatus === 'WITHDRAWN' ? '重新发布' : '发布'
}
function canWithdraw(record: ExamScoreSummaryItemResponse): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  return s === 'PUBLISHED' || s === 'CORRECTED'
}

async function handlePublish(record: ExamScoreSummaryItemResponse): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  const canContinue = await ensureNoPendingAbsenceBeforePublish()
  if (!canContinue) {
    return
  }
  try {
    await publishFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    message.success('成绩已发布，学生通知已下发')
    await Promise.all([loadCandidates(), loadFinalScoreOverview(), refreshArchiveGate()])
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
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
    await Promise.all([loadCandidates(), loadFinalScoreOverview(), refreshArchiveGate()])
    try {
      await refreshSnapshot()
    } catch {
      // 非工作台上下文时忽略
    }
  } catch (error) {
    showUserError(error, '成绩撤回失败')
  } finally {
    withdrawing.value = false
  }
}

// ─── 成绩明细 Drawer ─────────────────────────────
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailCandidate = ref<ExamScoreSummaryItemResponse | null>(null)
const paperScore = ref<ExamPaperScoreResponse | null>(null)

// computed 派生强类型题目数组，模板侧用 paperQuestions[index] 取 VO，避免 a-table slot record 类型丢失。
const paperQuestions = computed<ExamQuestionScoreResponse[]>(() => paperScore.value?.questions ?? [])

const paperItemColumns: ColumnType<ExamQuestionScoreResponse>[] = [
  { title: '题号', key: 'questionNo', width: 80 },
  { title: '题型', dataIndex: 'questionType', key: 'questionType', width: 100 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '题目得分', key: 'teacherReviewScore', width: 100 },
  { title: '状态', dataIndex: 'gradeStatus', key: 'gradeStatus', width: 110 },
]

async function openDetailDrawer(record: ExamScoreSummaryItemResponse): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  detailCandidate.value = record
  detailOpen.value = true
  detailLoading.value = true
  paperScore.value = null
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
}

// ─── 初始化 ─────────────────────────────────────
watch(selectedExamId, (value) => {
  pagination.current = 1
  if (value) {
    void Promise.all([
      loadExamDetail(),
      loadCandidates(),
      loadPendingAbsenceCount(),
      loadFinalScoreOverview(),
    ])
  } else {
    examDetail.value = null
    candidates.value = []
    pagination.total = 0
    pendingAbsenceCount.value = 0
    finalScoreOverview.value = null
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.score-publish-page {
  min-width: 0;
}

.score-publish {
  &__alert {
    margin-top: var(--dp-space-3, 12px);
  }

  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: 60px 0;
  }

  &__table-card {
    margin-top: 8px;
  }

  &__filter-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-2, 8px);
  }

  &__filter-chip {
    padding: 2px 10px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: var(--dp-radius-control, 4px);
    background: var(--dp-surface, #fff);
    font-size: 12px;
    line-height: 1.5;
    color: var(--dp-text-secondary, #475569);
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;

    &:hover {
      border-color: var(--dp-primary-light, #93c5fd);
      color: var(--dp-primary, #2563eb);
    }

    &--active {
      border-color: var(--dp-primary, #2563eb);
      background: color-mix(in srgb, var(--dp-primary, #2563eb) 8%, #fff);
      color: var(--dp-primary, #2563eb);
      font-weight: 600;
    }
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
    font-weight: 600;
  }

  &__hint {
    color: var(--dp-text-muted, #64748b);
  }

  &__bulk-progress {
    margin: 12px 0 4px;
  }

  &__bulk-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
    margin-top: 4px;
  }

  &__bulk-list {
    max-height: 320px;
    overflow-y: auto;
    margin-top: 8px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: var(--dp-radius-panel, 6px);
    background: var(--dp-surface, #fff);
  }

  &__bulk-error-tag {
    margin-left: 8px;
  }
}
</style>
