<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <a-select
            :value="selectedExamId"
            class="score-publish__exam-select"
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
      description="请选择一场考试以查看成绩发布列表"
      class="score-publish__empty"
    />

    <template v-else>
      <UiAlertStrip
        v-if="pendingAbsenceCount > 0"
        tone="warning"
        :title="`当前考试仍有 ${pendingAbsenceCount} 条待确认缺考记录`"
        description="缺考未核对前禁止发布成绩，请先完成缺考确认，避免将缺考学生误发布为零分成绩。"
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
      <!-- D-9 错误态引导：成绩汇总加载失败时给出可恢复 + 可上报路径，避免空表格让教师无从下手 -->
      <UiErrorRetryPanel
        v-if="candidatesLoadError"
        :error="candidatesLoadError"
        title="成绩发布名单加载失败"
        :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
        compact
        @retry="loadCandidates"
      />
      <a-card :bordered="false" class="detail-table-card score-publish__table-card">
        <template #title>
          <FileDoneOutlined />
          <span>成绩发布列表</span>
        </template>

        <div class="filter-card">
          <a-form layout="inline" class="score-publish__filter-form filter-form filter-form--toolbar">
            <a-form-item label="关键词">
              <a-input
                v-model:value="keyword"
                placeholder="按学号 / 姓名搜索"
                allow-clear
                class="score-publish__search"
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
                class="score-publish__status-select"
                :options="statusOptions"
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
                  :loading="loading"
                  @click="loadCandidates"
                >
                  刷新
                </UiButton>
                <UiButton
                  variant="outline"
                  size="sm"
                  :disabled="!canBulkPublish"
                  @click="openBulkPublishModal"
                >
                  <template #icon><ThunderboltOutlined /></template>
                  批量发布
                </UiButton>
              </a-space>
            </a-form-item>
          </a-form>
        </div>

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
                <span
                  v-if="candidates[index].paperInstanceId"
                  class="op-link"
                  role="button"
                  @click="openDetailDrawer(candidates[index])"
                >
                  明细
                </span>
                <span v-else class="muted">—</span>
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
                  @click="canWithdraw(candidates[index]) && openWithdrawModal(candidates[index])"
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
          description="撤回后学生侧不再可见该成绩，撤回原因会落入审计日志。"
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

    <!-- B-5 批量发布 Modal：列出本页可发布候选，串行调用 publishFinalScore -->
    <a-modal
      v-model:open="bulkOpen"
      title="批量发布成绩预览"
      :confirm-loading="bulkRunning"
      :ok-button-props="{ disabled: bulkRunning || bulkCandidates.length === 0 }"
      :cancel-button-props="{ disabled: bulkRunning }"
      :mask-closable="!bulkRunning"
      :closable="!bulkRunning"
      :width="640"
      ok-text="确认发布"
      cancel-text="取消"
      @ok="runBulkPublish"
    >
      <div v-if="bulkProgress.total > 0" class="score-publish__bulk-progress">
        <a-progress
          :percent="
            bulkProgress.total > 0
              ? Math.round((bulkProgress.completed / bulkProgress.total) * 100)
              : 0
          "
          :status="bulkProgress.failed > 0 ? 'exception' : 'active'"
        />
        <div class="score-publish__bulk-meta">
          已发布 {{ bulkProgress.completed }} / {{ bulkProgress.total }} · 失败
          {{ bulkProgress.failed }} 条
        </div>
      </div>
      <a-list size="small" :data-source="bulkCandidates" class="score-publish__bulk-list">
        <template #renderItem="{ item, index }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                {{ item.paperDisplay.primaryText }}
              </template>
              <template #description>
                <span>当前 {{ finalScoreStatusLabel(item.finalScoreStatus) }}</span>
                <UiTag
                  v-if="bulkErrors[index]"
                  tone="red"
                  size="sm"
                  class="score-publish__bulk-error-tag"
                >
                  {{ bulkErrors[index] }}
                </UiTag>
              </template>
            </a-list-item-meta>
            <UiTag v-if="bulkSuccess[index]" tone="green" size="sm">已发布</UiTag>
          </a-list-item>
        </template>
      </a-list>
    </a-modal>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { TablePaginationConfig } from 'ant-design-vue/es/table/interface'
import type {
  ExamPaperScoreVO,
  ExamQuestionScoreVO,
  ExamScoreSummaryItemVO,
  FinalScoreStatusCode,
} from '@/apis/mark/exam'
import FileDoneOutlined from '@ant-design/icons-vue/FileDoneOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import ThunderboltOutlined from '@ant-design/icons-vue/ThunderboltOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listAbsenceRecords } from '@/apis/mark/absence'
import {
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_OPTIONS,
  FINAL_SCORE_STATUS_TONE,
  getPaperScore,
  pageExamScoreSummary,
  publishFinalScore,
  withdrawFinalScore,
} from '@/apis/mark/exam'
import {
  UiAlertStrip,
  UiButton,
  UiDataTable,
  UiDrawer,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useMarkStageStore } from '@/stores/modules/markStage'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
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
  selectedExam,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const hasDailyScoreConfig = computed(() => selectedExam.value?.dailyScoreFull != null)

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
  const query = examId ? { examId } : {}
  if (value === 'publish') {
    void router.push({ name: 'TeacherScorePublish', query })
    return
  }
  void router.push({ name: 'TeacherScoreFinalize', query })
}

const markStageStore = useMarkStageStore()

// ─── 数据加载（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemVO[]>([])
const loading = ref(false)
// D-9 错误态：捕获 loadCandidates 加载失败，给 UiErrorRetryPanel 渲染重试 + 上报入口
const candidatesLoadError = ref<Error | null>(null)
const pendingAbsenceCount = ref(0)
const absenceGuardLoading = ref(false)
const keyword = ref('')
const statusFilter = ref<FinalScoreStatusCode | undefined>(undefined)

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
  // D-9：每次重试前清空错误态，让 UiErrorRetryPanel 在新失败时重新渲染
  candidatesLoadError.value = null
  try {
    const result = await pageExamScoreSummary({
      examId: selectedExamId.value,
      keyword: keyword.value.trim() || undefined,
      finalScoreStatus: statusFilter.value,
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
    })
    candidates.value = readPageList(result, '成绩发布名单加载失败，请稍后重试')
    pagination.total = readPageTotal(result)
  } catch (error) {
    candidatesLoadError.value = toUserError(error, '成绩发布名单加载失败，请稍后重试')
    showUserError(error, '成绩发布名单加载失败，请稍后重试')
  } finally {
    loading.value = false
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
    name: 'TeacherAbsenceConfirm',
    query: { examId: selectedExamId.value },
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
// ─── B-5 批量发布 ─────────────────────────────
/** 本页中处于「可发布」状态（CONFIRMED / WITHDRAWN / CORRECTED）且具备 paperInstanceId 的候选 */
const bulkCandidates = computed<ExamScoreSummaryItemVO[]>(() => candidates.value.filter(canPublish))
const canBulkPublish = computed(
  () => Boolean(selectedExamId.value) && bulkCandidates.value.length > 0,
)

const bulkOpen = ref(false)
const bulkRunning = ref(false)
const bulkProgress = reactive({ total: 0, completed: 0, failed: 0 })
const bulkSuccess = ref<boolean[]>([])
const bulkErrors = ref<string[]>([])

function resetBulkState(): void {
  bulkProgress.total = 0
  bulkProgress.completed = 0
  bulkProgress.failed = 0
  bulkSuccess.value = []
  bulkErrors.value = []
}

function openBulkPublishModal(): void {
  if (!canBulkPublish.value) {
    message.warning('本页没有可发布的候选；请切换分页或筛选状态后再试')
    return
  }
  void (async () => {
    const canContinue = await ensureNoPendingAbsenceBeforePublish()
    if (!canContinue) {
      return
    }
    resetBulkState()
    bulkOpen.value = true
  })()
}

/** 串行调用 publishFinalScore，逐条更新进度；过程中可见已成功/失败明细 */
async function runBulkPublish(): Promise<void> {
  if (!selectedExamId.value || bulkRunning.value) return
  const canContinue = await ensureNoPendingAbsenceBeforePublish()
  if (!canContinue) {
    bulkOpen.value = false
    return
  }
  const targets = bulkCandidates.value
  if (targets.length === 0) {
    bulkOpen.value = false
    return
  }
  bulkRunning.value = true
  bulkProgress.total = targets.length
  bulkProgress.completed = 0
  bulkProgress.failed = 0
  bulkSuccess.value = Array.from({ length: targets.length }, () => false)
  bulkErrors.value = Array.from({ length: targets.length }, () => '')
  for (let i = 0; i < targets.length; i += 1) {
    const item = targets[i]
    if (!item.paperInstanceId) {
      bulkErrors.value[i] = '该考生暂未关联可发布的试卷'
      bulkProgress.failed += 1
      continue
    }
    try {
      await publishFinalScore({
        examId: selectedExamId.value,
        paperInstanceId: item.paperInstanceId,
      })
      bulkSuccess.value[i] = true
      bulkProgress.completed += 1
    } catch (err) {
      bulkErrors.value[i] = getUserErrorMessage(err, '成绩发布失败')
      bulkProgress.failed += 1
    }
  }
  bulkRunning.value = false
  if (bulkProgress.failed === 0) {
    message.success(`已批量发布 ${bulkProgress.completed} 条成绩`)
    bulkOpen.value = false
  } else {
    message.warning(
      `批量发布完成：成功 ${bulkProgress.completed} 条，失败 ${bulkProgress.failed} 条，请查看明细`,
    )
  }
  await loadCandidates()
}

/* ========== 信号指标：发布流程状态分布 ========== */

/**
 * 同步发布阶段状态到阅卷主链 Store。
 * 规则：
 * - 存在 PUBLISHED 且无 PENDING/CALCULATED/CONFIRMED → SCORE_PUBLISH=completed
 * - 全部为 PENDING → SCORE_PUBLISH=pending
 * - 其余过程中 → SCORE_PUBLISH=active
 * - 存在 WITHDRAWN → SCORE_PUBLISH=blocked（需要重新处理）
 */
function syncPublishStageToStore(buckets: Record<FinalScoreStatusCode, number>): void {
  const examId = selectedExamId.value
  if (!examId) return
  const totalLoaded = Object.values(buckets).reduce((sum, n) => sum + n, 0)
  if (totalLoaded === 0) return
  const published = buckets.PUBLISHED
  const pendingPipeline = buckets.PENDING + buckets.CALCULATED + buckets.CONFIRMED
  const withdrawn = buckets.WITHDRAWN
  let stageStatus: 'pending' | 'active' | 'completed' | 'blocked' = 'pending'
  let hint = ''
  if (withdrawn > 0) {
    stageStatus = 'blocked'
    hint = `${withdrawn} 人已撤回，需重新发布`
  } else if (published > 0 && pendingPipeline === 0) {
    stageStatus = 'completed'
    hint = `全部 ${published} 人已发布`
  } else if (published > 0) {
    stageStatus = 'active'
    hint = `已发布 ${published} / 待发布 ${pendingPipeline}`
  } else if (buckets.CONFIRMED > 0 || buckets.CALCULATED > 0) {
    stageStatus = 'active'
    hint = `已确认 ${buckets.CONFIRMED}，待发布`
  }
  markStageStore.setStageStatus(examId, 'SCORE_PUBLISH', stageStatus, hint)
  if (stageStatus === 'completed') {
    markStageStore.setCurrentStage(examId, 'GRADE_REVIEW')
  } else if (stageStatus !== 'pending') {
    markStageStore.setCurrentStage(examId, 'SCORE_PUBLISH')
  }
}

const statMetrics = computed(() => {
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
  syncPublishStageToStore(buckets)
  const total = pagination.total ?? 0
  const publishable = buckets.CONFIRMED + buckets.WITHDRAWN + buckets.CORRECTED
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
      value: buckets.PUBLISHED,
      unit: '人',
      tone: (buckets.PUBLISHED > 0 ? 'green' : 'gray') as 'green' | 'gray',
    },
    {
      label: '已订正',
      value: buckets.CORRECTED,
      unit: '人',
      tone: (buckets.CORRECTED > 0 ? 'purple' : 'gray') as 'purple' | 'gray',
    },
    {
      label: '已撤回',
      value: buckets.WITHDRAWN,
      unit: '人',
      tone: (buckets.WITHDRAWN > 0 ? 'red' : 'gray') as 'red' | 'gray',
    },
    {
      label: '未确认',
      value: buckets.PENDING + buckets.CALCULATED,
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
    await loadCandidates()
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
    await loadCandidates()
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
    void Promise.all([loadCandidates(), loadPendingAbsenceCount()])
  } else {
    candidates.value = []
    pagination.total = 0
    pendingAbsenceCount.value = 0
  }
})

watch(statusFilter, () => {
  pagination.current = 1
  void loadCandidates()
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await Promise.all([loadCandidates(), loadPendingAbsenceCount()])
  }
})
</script>

<style lang="scss" scoped>
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
