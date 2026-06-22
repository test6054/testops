<template>
  <div class="score-publish-page">
    <div class="score-publish-page__toolbar">
      <a-segmented
        :value="scoreReleaseStep"
        :options="scoreReleaseStepOptions"
        @change="onScoreReleaseStepChange"
      />
    </div>

    <template v-if="selectedExamId">
      <UiAlertStrip
        v-if="pendingAbsenceCount > 0"
        tone="warning"
        :title="`当前考试仍有 ${pendingAbsenceCount} 条待确认缺考记录`"
        :closable="false"
        class="score-publish__absence-alert"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" @click="goToAbsenceConfirm">
            去核对
          </UiButton>
        </template>
      </UiAlertStrip>
      <UiStatPanel
        :items="statMetrics"
        :columns="3"
        variant="grid"
        compact
        class="score-publish__signals"
      />
      <a-card :bordered="false" class="detail-table-card score-publish__table-card">
        <template #title>
          <FileDoneOutlined />
          <span>成绩发布列表</span>
        </template>
        <template #extra>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!canBulkPublish"
            @click="openBulkPublishModal"
          >
            <template #icon><ThunderboltOutlined /></template>
            全场发布
          </UiButton>
        </template>

        <UiFilterBar
          v-model="scoreFilterForm"
          :fields="scoreFilterFields"
          search-text="查询"
          @search="handleSearch"
          @reset="handleReset"
        />



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
            <template v-if="column.key === 'paperDisplay'">
              <div class="score-publish__identity-cell">
                <a-typography-text strong :content="candidates[index].paperDisplay.primaryText" />
                <span
                  v-if="candidates[index].paperDisplay.secondaryText"
                  class="score-publish__hint"
                >
                  {{ candidates[index].paperDisplay.secondaryText }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'examScore'">
              <a-typography-text v-if="candidates[index].examScore != null" strong>
                {{ candidates[index].examScore }} 分
              </a-typography-text>
              <span v-else class="score-publish__hint">-</span>
            </template>
            <template v-else-if="column.key === 'dailyScore'">
              <a-typography-text v-if="candidates[index].dailyScore != null" strong>
                {{ candidates[index].dailyScore }} 分
              </a-typography-text>
              <span v-else class="score-publish__hint">-</span>
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <a-typography-text v-if="candidates[index].finalScore != null" strong type="success">
                {{ candidates[index].finalScore }} 分
              </a-typography-text>
              <span v-else class="score-publish__hint">-</span>
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
        <UiEmpty v-if="!paperScore" description="暂无数据" />
        <div v-else>
          <a-descriptions :column="2" size="small" bordered class="score-publish__detail-summary">
            <a-descriptions-item label="答卷">
              {{ detailCandidate?.paperDisplay.primaryText }}
            </a-descriptions-item>
            <a-descriptions-item label="班级">
              {{ detailCandidate?.studentClassName }}
            </a-descriptions-item>
            <a-descriptions-item v-if="hasDailyScoreConfig" label="考试分">
              <a-typography-text strong>{{ paperScore.examScore ?? 0 }} 分</a-typography-text>
            </a-descriptions-item>
            <a-descriptions-item v-if="hasDailyScoreConfig" label="日常分">
              <a-typography-text strong>{{ paperScore.dailyScore ?? 0 }} 分</a-typography-text>
            </a-descriptions-item>
            <a-descriptions-item :label="hasDailyScoreConfig ? '总成绩' : '总分'">
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

          <h4 class="score-publish__detail-section-title">题目得分明细</h4>
          <UiDataTable
            pagination-mode="none"
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
                <span v-else class="score-publish__hint">-</span>
              </template>
            </template>
          </UiDataTable>
        </div>
      </a-spin>
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
          dense
          class="score-publish__alert"
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

    <!-- 全场发布 Modal：后端按考试全场口径筛选并逐卷发布 -->
    <a-modal
      v-model:open="bulkOpen"
      title="全场发布成绩"
      :confirm-loading="bulkRunning"
      :ok-button-props="{ disabled: bulkRunning || !canBulkPublish }"
      :cancel-button-props="{ disabled: bulkRunning }"
      :mask-closable="!bulkRunning"
      :closable="!bulkRunning"
      :width="720"
      ok-text="确认全场发布"
      cancel-text="取消"
      @ok="runBulkPublish"
    >
      <UiAlertStrip
        tone="warning"
        title="全场发布确认"
        dense
        class="score-publish__alert"
      />
      <a-descriptions
        v-if="finalScoreOverview"
        :column="3"
        size="small"
        bordered
        class="score-publish__bulk-overview"
      >
        <a-descriptions-item label="全场考生">
          {{ finalScoreOverview.totalCandidateCount }} 人
        </a-descriptions-item>
        <a-descriptions-item label="可发布">
          {{ publishableOverviewCount }} 人
        </a-descriptions-item>
        <a-descriptions-item label="已发布">
          {{ finalScoreOverview.publishedCount }} 人
        </a-descriptions-item>
        <a-descriptions-item label="未确认">
          {{ finalScoreOverview.pendingCount + finalScoreOverview.calculatedCount }} 人
        </a-descriptions-item>
        <a-descriptions-item label="阻塞">
          {{ finalScoreOverview.blockedCount }} 人
        </a-descriptions-item>
        <a-descriptions-item label="可安全确认">
          {{ finalScoreOverview.safeConfirmableCount }} 人
        </a-descriptions-item>
      </a-descriptions>
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
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { TablePaginationConfig } from 'ant-design-vue/es/table/interface'
import type {
  ExamDetailVO,
} from '@/apis/mark/exam'
import type { ExamPaperScoreVO, ExamQuestionScoreVO } from '@/apis/mark/exam-grade'
import type {
  ExamScoreSummaryItemVO,
  FinalScoreBatchPublishVO,
  FinalScoreRiskOverviewVO,
  FinalScoreStatusCode,
} from '@/apis/mark/exam-score'
import type { FilterField } from '@/components/ui-guide/ui/types'
import FileDoneOutlined from '@ant-design/icons-vue/FileDoneOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listAbsenceRecords } from '@/apis/mark/absence'
import {
  getExamDetail,
} from '@/apis/mark/exam'
import { getPaperScore } from '@/apis/mark/exam-grade'
import {
  batchPublishFinalScores,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_OPTIONS,
  FINAL_SCORE_STATUS_TONE,
  getFinalScoreRiskOverview,
  pageExamScoreSummary,
  publishFinalScore,
  withdrawFinalScore,
} from '@/apis/mark/exam-score'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScorePublish' })

function finalScoreStatusTone(value: FinalScoreStatusCode) {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, value, '最终成绩状态')
}

function finalScoreStatusLabel(value: FinalScoreStatusCode): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, value, '最终成绩状态')
}

const statusOptions = FINAL_SCORE_STATUS_OPTIONS

const scoreFilterForm = reactive<{
  keyword: string
  statusFilter?: FinalScoreStatusCode
}>({
  keyword: '',
  statusFilter: undefined,
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
  {
    key: 'statusFilter',
    type: 'select',
    placeholder: '按最终状态过滤',
    allowClear: true,
    width: 200,
    options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
  },
]

const router = useRouter()
const route = useRoute()

const scoreReleaseStepOptions = [
  { label: '① 成绩确认', value: 'confirm' },
  { label: '② 成绩发布', value: 'publish' },
]

const scoreReleaseStep = computed(() =>
  route.name === 'TeacherExamWorkspaceScoreRelease' ? 'publish' : 'confirm',
)

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const examDetail = ref<ExamDetailVO | null>(null)

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

const columns = computed<ColumnType<ExamScoreSummaryItemVO>[]>(() => {
  const scoreColumns: ColumnType<ExamScoreSummaryItemVO>[] = hasDailyScoreConfig.value
    ? [
        { title: '考试分', key: 'examScore', width: 90 },
        { title: '日常分', key: 'dailyScore', width: 90 },
        { title: '总成绩', key: 'finalScore', width: 90 },
      ]
    : [{ title: '教师复核评分', key: 'finalScore', width: 120 }]
  return [
    { title: '答卷', key: 'paperDisplay', width: 220 },
    { title: '班级', dataIndex: 'studentClassName', key: 'studentClassName', width: 160 },
    ...scoreColumns,
    { title: '成绩状态', key: 'finalScoreStatus', width: 110 },
    { title: '确认时间', key: 'confirmedTime', width: 170 },
    { title: '操作', key: 'actions', width: 320, fixed: 'right' },
  ]
})

function onScoreReleaseStepChange(value: string | number): void {
  const examId = selectedExamId.value
  if (!examId) {
    return
  }
  if (value === 'publish') {
    void router.push({ name: 'TeacherExamWorkspaceScoreRelease', params: { examId } })
    return
  }
  void router.push({ name: 'TeacherExamWorkspaceScoreSummary', params: { examId } })
}

// ─── 数据加载（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemVO[]>([])
const loading = ref(false)
const pendingAbsenceCount = ref(0)
const absenceGuardLoading = ref(false)
const finalScoreOverview = ref<FinalScoreRiskOverviewVO | null>(null)

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
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
    })
    candidates.value = readPageList(result, '成绩发布名单加载失败，请稍后重试')
    pagination.total = readPageTotal(result)
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
    return
  }
  try {
    finalScoreOverview.value = await getFinalScoreRiskOverview({ examId: selectedExamId.value })
  } catch (error) {
    finalScoreOverview.value = null
    showUserError(error, '全场成绩概览加载失败')
  }
}

async function loadPendingAbsenceCount(): Promise<void> {
  if (!selectedExamId.value) {
    pendingAbsenceCount.value = 0
    return
  }
  absenceGuardLoading.value = true
  try {
    const result = await listAbsenceRecords({
      examId: selectedExamId.value,
      absenceStatus: 'PENDING',
      pageNum: 1,
      pageSize: 1,
    })
    pendingAbsenceCount.value = readPageTotal(result)
  } catch (error) {
    pendingAbsenceCount.value = 0
    showUserError(error, '待确认缺考记录查询失败')
  } finally {
    absenceGuardLoading.value = false
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
  return true
}

function handleSearch(): void {
  pagination.current = 1
  void loadCandidates()
}

function handleReset(): void {
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

const canBulkPublish = computed(() => Boolean(selectedExamId.value) && publishableOverviewCount.value > 0)

const bulkOpen = ref(false)
const bulkRunning = ref(false)
const bulkResult = ref<FinalScoreBatchPublishVO | null>(null)
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
    await Promise.all([loadCandidates(), loadFinalScoreOverview()])
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

const statMetrics = computed(() => {
  const overview = finalScoreOverview.value
  const total = overview?.totalCandidateCount ?? pagination.total ?? 0
  const publishable = publishableOverviewCount.value
  const published = overview?.publishedCount ?? 0
  const corrected = overview?.correctedCount ?? 0
  const withdrawn = overview?.withdrawnCount ?? 0
  const unconfirmed = overview ? overview.pendingCount + overview.calculatedCount : 0
  return [
    { label: '考生总数', value: total, unit: '人', tone: 'blue' as const },
    {
      label: '可发布',
      value: publishable,
      unit: '人',
      tone: (publishable > 0 ? 'orange' : 'gray') as 'orange' | 'gray',
    },
    {
      label: '已发布',
      value: published,
      unit: '人',
      tone: (published > 0 ? 'green' : 'gray') as 'green' | 'gray',
    },
    {
      label: '已订正',
      value: corrected,
      unit: '人',
      tone: (corrected > 0 ? 'purple' : 'gray') as 'purple' | 'gray',
    },
    {
      label: '已撤回',
      value: withdrawn,
      unit: '人',
      tone: (withdrawn > 0 ? 'red' : 'gray') as 'red' | 'gray',
    },
    {
      label: '未确认',
      value: unconfirmed,
      unit: '人',
      tone: 'gray' as const,
    },
  ]
})

// ─── 状态机按钮 ─────────────────────────────
function canPublish(record: ExamScoreSummaryItemVO): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  return s === 'CONFIRMED' || s === 'WITHDRAWN' || s === 'CORRECTED'
}
function publishButtonLabel(record: ExamScoreSummaryItemVO): string {
  return record.finalScoreStatus === 'WITHDRAWN' ? '重新发布' : '发布'
}
function canWithdraw(record: ExamScoreSummaryItemVO): boolean {
  if (!record.paperInstanceId) return false
  const s = record.finalScoreStatus
  return s === 'PUBLISHED' || s === 'CORRECTED'
}

async function handlePublish(record: ExamScoreSummaryItemVO): Promise<void> {
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
    await Promise.all([loadCandidates(), loadFinalScoreOverview()])
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
    await Promise.all([loadCandidates(), loadFinalScoreOverview()])
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

async function openDetailDrawer(record: ExamScoreSummaryItemVO): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  detailCandidate.value = record
  detailOpen.value = true
  detailLoading.value = true
  paperScore.value = null
  try {
    paperScore.value = await getPaperScore(selectedExamId.value, record.paperInstanceId)
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
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
}

.score-publish {
  &__absence-alert {
    margin-bottom: 12px;
  }

  &__signals {
    margin-bottom: 12px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
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

  &__alert {
    margin-bottom: 12px;
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
    border-radius: var(--dp-radius-md, 6px);
    background: var(--dp-surface, #fff);
  }

  &__bulk-error-tag {
    margin-left: 8px;
  }
}
</style>
