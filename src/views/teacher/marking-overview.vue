<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="marking-overview__context">
        <div class="marking-overview__context-info">
          <h2 class="marking-overview__title">阅卷交付 · 考试总览</h2>
        </div>
        <div class="marking-overview__context-actions">
          <a-input
            v-model:value="keyword"
            placeholder="考试名称 / 编号"
            allow-clear
            class="marking-overview__filter"
            @press-enter="reload"
          />
          <a-select
            v-model:value="statusFilter"
            placeholder="状态"
            allow-clear
            class="marking-overview__filter marking-overview__filter--sm"
            :options="statusOptions"
            @change="reload"
          />
          <UiButton variant="ghost" size="sm" @click="resetQuery">重置</UiButton>
          <UiButton variant="outline" size="sm" :loading="loading" @click="reload">查询</UiButton>
          <UiButton variant="ghost" size="sm" @click="goExamList">考试管理</UiButton>
        </div>
      </div>
    </template>

    <template #signal>
      <UiAlertStrip
        v-if="urgentBanner"
        tone="warning"
        :title="urgentBanner.title"
        :description="urgentBanner.description"
        dense
        class="marking-overview__banner"
      />
      <UiAlertStrip
        v-if="progressLoadError"
        tone="error"
        title="部分考试进度加载失败"
        :description="progressLoadError"
        dense
        class="marking-overview__banner"
      />
      <UiStatPanel
        title="今日待办"
        description="跨当前列表内进行中考试的批阅任务汇总"
        :items="statMetrics"
        :columns="4"
        variant="grid"
        compact
      />
    </template>

    <template #rail>
      <StageRail :stages="stages" compact />
    </template>

    <UiCard v-if="recommendedExams.length > 0" class="marking-overview__recommend-card">
      <template #title>
        <span>优先推进的考试</span>
        <UiBadge tone="orange">{{ recommendedExams.length }}</UiBadge>
      </template>
      <template #extra>
        <span class="marking-overview__panel-meta">按未确认题目数倒序</span>
      </template>

      <ul class="marking-overview__recommend-list">
        <li
          v-for="item in recommendedExams"
          :key="item.examId"
          class="marking-overview__recommend-item"
        >
          <div class="marking-overview__recommend-main">
            <div class="marking-overview__recommend-title-row">
              <strong class="marking-overview__recommend-title">{{ item.examName }}</strong>
              <span v-if="item.examNo" class="marking-overview__recommend-no">
                考务编号 {{ item.examNo }}
              </span>
              <UiTag v-if="item.attention > 0" tone="red" size="sm">
                {{ item.attention }} 条扫描异常
              </UiTag>
              <UiTag tone="orange" size="sm">待批阅 {{ item.pending }} 题</UiTag>
              <UiTag tone="blue" size="sm">完成率 {{ item.completeRate }}%</UiTag>
            </div>
            <div class="marking-overview__recommend-meta">
              已确认 {{ item.confirmedGrades }} / {{ item.totalGrades }} 题
            </div>
          </div>
          <div class="marking-overview__recommend-actions">
            <UiButton size="sm" variant="outline" @click="goReviewProgress(item.examId)">
              查看进度
            </UiButton>
            <UiButton size="sm" @click="goMarkingTaskPool(item.examId)">进入阅卷</UiButton>
          </div>
        </li>
      </ul>
    </UiCard>

    <UiCard class="marking-overview__table-card">
      <template #title>
        <span>考试列表</span>
        <UiBadge tone="blue">{{ total }}</UiBadge>
      </template>
      <template #extra>
        <span class="marking-overview__panel-meta">我创建或被分配评阅的考试</span>
      </template>

      <UiErrorRetryPanel
        v-if="examsLoadError"
        :error="examsLoadError"
        title="考试列表加载失败"
        compact
        @retry="loadExams"
      />
      <UiEmpty
        v-else-if="!loading && exams.length === 0"
        title="暂无考试"
        description="当前筛选下没有可参与批阅的考试，可调整筛选或前往考试管理创建。"
      >
        <template #action>
          <UiButton size="sm" @click="goExamList">前往考试管理</UiButton>
        </template>
      </UiEmpty>
      <UiDataTable
        v-else
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        :columns="tableColumns"
        :data-source="exams"
        :loading="loading"
        :total="total"
        row-key="examId"
        size="middle"
        flat
        class="marking-overview__table"
        :scroll="{ x: 1280 }"
        empty-title="暂无考试"
        empty-description="暂无可参与批阅的考试"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'examName'">
            <button
              type="button"
              class="marking-overview__exam-link"
              @click="goPrepWorkbench(record.examId)"
            >
              {{ record.examName }}
            </button>
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="examStatusTone(record.status)" size="sm">
              {{ examStatusLabel(record.status) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'progress'">
            <span v-if="getExamProgressText(record.examId)" class="marking-overview__progress-text">
              {{ getExamProgressText(record.examId) }}
            </span>
            <span v-else class="marking-overview__progress-muted">—</span>
          </template>
          <template v-else-if="column.key === 'examStartTime'">
            {{ formatTime(record.examStartTime, '未设置') }}
          </template>
          <template v-else-if="column.key === 'examEndTime'">
            {{ formatTime(record.examEndTime, '未设置') }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="4" wrap>
              <UiButton size="sm" @click="goPrepWorkbench(record.examId)"> 准备工作台 </UiButton>
              <UiButton size="sm" variant="ghost" @click="goMarkingTaskPool(record.examId)">
                阅卷
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="goScanAttention(record.examId)">
                异常
              </UiButton>
            </a-space>
          </template>
          <template v-else>
            {{ text ?? '—' }}
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ExamStatusCode, ExamSummaryVO, MarkingProgressVO } from '@/apis/mark/exam'
import {
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  getMarkingProgress,
  pageExams,
} from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageRail, StageWorkbenchShell } from '@/components/workbench'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherMarkingOverview' })

const URGENT_PENDING_REVIEW_THRESHOLD = 30

function examStatusTone(status: ExamStatusCode): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, status, '考试状态')
}

function examStatusLabel(status: ExamStatusCode): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, status, '考试状态')
}

const statusOptions: Array<{ label: string; value: ExamStatusCode }> = [
  { label: EXAM_STATUS_LABEL.ACTIVE, value: 'ACTIVE' },
  { label: EXAM_STATUS_LABEL.CLOSED, value: 'CLOSED' },
]

const tableColumns: ColumnType<ExamSummaryVO>[] = [
  { title: '考试名称', dataIndex: 'examName', key: 'examName', ellipsis: true, width: 260 },
  { title: '编号', dataIndex: 'examNo', key: 'examNo', width: 160, ellipsis: true },
  { title: '状态', dataIndex: 'status', key: 'status', width: 96 },
  { title: '批改进度', key: 'progress', width: 140 },
  { title: '开始时间', dataIndex: 'examStartTime', key: 'examStartTime', width: 168 },
  { title: '结束时间', dataIndex: 'examEndTime', key: 'examEndTime', width: 168 },
  { title: '操作', key: 'actions', width: 280 },
]

const router = useRouter()

const exams = ref<ExamSummaryVO[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const examsLoadError = ref<Error | null>(null)
const keyword = ref('')
const statusFilter = ref<ExamStatusCode | undefined>(undefined)

const examProgressMap = ref<Map<string, MarkingProgressVO>>(new Map())
const progressLoading = ref(false)
const progressLoadError = ref('')

const progressReady = computed<boolean>(() => !progressLoading.value)

const aggregate = computed(() => {
  let pendingReview = 0
  let inProgressReview = 0
  let openProcessing = 0
  let scanAttention = 0
  let unconfirmedQuestionGrades = 0
  for (const p of examProgressMap.value.values()) {
    pendingReview += p.pendingReviewTaskCount
    inProgressReview += p.inProgressReviewTaskCount
    openProcessing += p.openProcessingTaskCount
    scanAttention += p.scanAttentionCount
    const gradeTotal = p.totalQuestionGradeCount
    const confirmed = p.confirmedQuestionGradeCount
    unconfirmedQuestionGrades += Math.max(0, gradeTotal - confirmed)
  }
  return {
    pendingReview,
    inProgressReview,
    openProcessing,
    scanAttention,
    unconfirmedQuestionGrades,
  }
})

const statMetrics = computed(() => {
  const a = aggregate.value
  const pendingValue = progressLoadError.value
    ? '不可用'
    : progressReady.value
      ? a.pendingReview
      : '…'
  const inProgressValue = progressLoadError.value
    ? '不可用'
    : progressReady.value
      ? a.inProgressReview
      : '…'
  const unconfirmedValue = progressLoadError.value
    ? '不可用'
    : progressReady.value
      ? a.unconfirmedQuestionGrades
      : '…'
  const scanValue = progressLoadError.value ? '不可用' : progressReady.value ? a.scanAttention : '…'
  return [
    {
      key: 'pending-review',
      label: '待批改任务',
      value: pendingValue,
      unit: '份',
      helper: '同题剩余待批阅数量',
      tone: (a.pendingReview > 0 ? 'orange' : 'gray') as BadgeTone,
      clickable: a.pendingReview > 0,
      onClick: () => router.push({ name: 'TeacherMarkingTaskPool' }),
    },
    {
      key: 'in-progress',
      label: '我的进行中批阅',
      value: inProgressValue,
      unit: '份',
      helper: '已认领尚未提交',
      tone: (a.inProgressReview > 0 ? 'blue' : 'gray') as BadgeTone,
      clickable: a.inProgressReview > 0,
      onClick: () => router.push({ name: 'TeacherMarkingTaskPool' }),
    },
    {
      key: 'unconfirmed',
      label: '待确认成绩',
      value: unconfirmedValue,
      unit: '题',
      helper: '需进入成绩确认推进',
      tone: (a.unconfirmedQuestionGrades > 0 ? 'purple' : 'gray') as BadgeTone,
      clickable: a.unconfirmedQuestionGrades > 0,
      onClick: () => router.push({ name: 'TeacherScoreFinalize' }),
    },
    {
      key: 'scan-attention',
      label: '扫描异常待处理',
      value: scanValue,
      unit: '条',
      helper: '影响阅卷推进',
      tone: (a.scanAttention > 0 ? 'red' : 'gray') as BadgeTone,
      clickable: a.scanAttention > 0,
      onClick: () => router.push({ name: 'TeacherScanAttention' }),
    },
  ]
})

interface RecommendedExamItem {
  examId: string
  examName: string
  examNo: string
  totalGrades: number
  confirmedGrades: number
  pending: number
  attention: number
  completeRate: number
}

const recommendedExams = computed<RecommendedExamItem[]>(() => {
  const result: RecommendedExamItem[] = []
  for (const exam of exams.value) {
    if (exam.status !== 'ACTIVE') continue
    const p = examProgressMap.value.get(exam.examId)
    if (!p) continue
    const gradeTotal = p.totalQuestionGradeCount
    const confirmedGrades = p.confirmedQuestionGradeCount
    const pending = Math.max(0, gradeTotal - confirmedGrades)
    const attention = p.scanAttentionCount
    if (pending === 0 && attention === 0) continue
    const completeRate = gradeTotal > 0 ? Math.round((confirmedGrades / gradeTotal) * 100) : 0
    result.push({
      examId: exam.examId,
      examName: exam.examName,
      examNo: exam.examNo,
      totalGrades: gradeTotal,
      confirmedGrades,
      pending,
      attention,
      completeRate,
    })
  }
  result.sort((a, b) => b.pending - a.pending || b.attention - a.attention)
  return result.slice(0, 5)
})

function getExamProgressText(examId: string): string {
  const p = examProgressMap.value.get(examId)
  if (!p) {
    return progressLoading.value ? '加载中…' : ''
  }
  const totalGrades = p.totalQuestionGradeCount
  const confirmed = p.confirmedQuestionGradeCount
  if (totalGrades <= 0) return '无题目'
  return `${confirmed}/${totalGrades} 题`
}

function inferStageStatus(predicate: () => boolean): WorkbenchStageStatus {
  return predicate() ? 'active' : 'pending'
}

const stages = computed<WorkbenchStage[]>(() => {
  const a = aggregate.value
  return [
    { key: 'prep', title: '考试准备', status: 'pending', statusText: '形态 / 答卷 / 题目 / 名册' },
    {
      key: 'scan',
      title: '扫描识别',
      status: inferStageStatus(() => a.scanAttention > 0),
      statusText: a.scanAttention > 0 ? `${a.scanAttention} 条异常待处理` : '扫描 / OCR / 异常',
    },
    { key: 'organize', title: '阅卷组织', status: 'pending', statusText: '题组 / 教师 / 试阅' },
    {
      key: 'review',
      title: '批阅工作区',
      status: inferStageStatus(() => a.pendingReview > 0 || a.inProgressReview > 0),
      statusText:
        a.pendingReview + a.inProgressReview > 0
          ? `${a.pendingReview + a.inProgressReview} 份待批 / 进行中`
          : '主阅 / 他阅 / 进度',
    },
    {
      key: 'quality',
      title: '质量控制',
      status: inferStageStatus(() => a.openProcessing > 0),
      statusText: a.openProcessing > 0 ? `${a.openProcessing} 个未闭合处理任务` : '抽检 / 仲裁',
    },
    {
      key: 'publish',
      title: '成绩发布',
      status: inferStageStatus(() => a.unconfirmedQuestionGrades > 0),
      statusText:
        a.unconfirmedQuestionGrades > 0
          ? `${a.unconfirmedQuestionGrades} 题待确认`
          : '确认 / 发布 / 导出',
    },
    { key: 'archive', title: '考后归档', status: 'pending', statusText: '归档 / 鉴定 / 销毁' },
  ]
})

const urgentBanner = computed<{ title: string; description: string } | null>(() => {
  const a = aggregate.value
  if (!progressReady.value || progressLoadError.value) return null
  if (a.scanAttention > 0) {
    return {
      title: `${a.scanAttention} 条扫描异常待处理，影响后续阅卷推进`,
      description: '点击下方「扫描异常待处理」卡片可直接进入处理工作台。',
    }
  }
  if (a.pendingReview >= URGENT_PENDING_REVIEW_THRESHOLD) {
    return {
      title: `当前累计 ${a.pendingReview} 份待批阅任务，可进入阅卷任务池批量推进`,
      description: '使用批阅工作区底部「提交并取下一份」可流水线接力批阅。',
    }
  }
  return null
})

function formatTime(value: string | undefined, emptyText: string): string {
  return formatDateTime(value, emptyText)
}

async function loadExams(): Promise<void> {
  loading.value = true
  examsLoadError.value = null
  try {
    const result = await pageExams({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
      status: statusFilter.value,
    })
    exams.value = readPageList(result, '阅卷考试列表加载失败，请稍后重试')
    total.value = readPageTotal(result)
  } catch (error) {
    exams.value = []
    total.value = 0
    examsLoadError.value = toUserError(error, '阅卷考试列表加载失败')
    showUserError(error, '阅卷考试列表加载失败')
  } finally {
    loading.value = false
  }
  await loadAggregateProgress()
}

async function loadAggregateProgress(): Promise<void> {
  const activeExams = exams.value.filter((e) => e.status === 'ACTIVE')
  progressLoadError.value = ''
  if (activeExams.length === 0) {
    examProgressMap.value = new Map()
    return
  }
  progressLoading.value = true
  try {
    const settled = await Promise.allSettled(
      activeExams.map((e) => getMarkingProgress(e.examId).then((p) => ({ examId: e.examId, p }))),
    )
    const nextMap = new Map<string, MarkingProgressVO>()
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        nextMap.set(r.value.examId, r.value.p)
      }
    }
    examProgressMap.value = nextMap
    const failedCount = settled.length - nextMap.size
    if (failedCount > 0) {
      progressLoadError.value = `${failedCount} 场进行中考试的批改进度未能读取，今日待办和阶段状态可能不完整，请刷新后重试。`
    }
  } finally {
    progressLoading.value = false
  }
}

function reload(): void {
  pageNum.value = 1
  void loadExams()
}

function resetQuery(): void {
  keyword.value = ''
  statusFilter.value = undefined
  pageNum.value = 1
  void loadExams()
}

function handlePageChange(page: { current: number; pageSize: number }): void {
  pageNum.value = page.current
  pageSize.value = page.pageSize
  void loadExams()
}

function goExamList(): void {
  void router.push({ name: 'TeacherExamList' })
}

function goScanAttention(examId: string): void {
  void router.push({ name: 'TeacherScanAttention', query: { examId } })
}

function goReviewProgress(examId: string): void {
  void router.push({ name: 'TeacherReviewProgress', query: { examId } })
}

function goPrepWorkbench(examId: string): void {
  void router.push({ name: 'TeacherExamPrepWorkbench', query: { examId } })
}

function goMarkingTaskPool(examId: string): void {
  void router.push({ name: 'TeacherMarkingTaskPool', query: { examId } })
}

onMounted(() => {
  void loadExams()
})
</script>

<style lang="scss" scoped>
.marking-overview {
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 240px;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 220px;

    &--sm {
      width: 140px;
    }
  }

  &__banner {
    margin-bottom: 8px;
  }

  &__panel-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #64748b);
  }

  &__recommend-card {
    margin-bottom: 0;
  }

  &__recommend-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__recommend-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 14px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 6px;
    background: var(--dp-surface, #fff);
  }

  &__recommend-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__recommend-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__recommend-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__recommend-no {
    font-size: 12px;
    color: var(--dp-text-secondary, #64748b);
  }

  &__recommend-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #64748b);
  }

  &__recommend-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__table-card {
    margin-bottom: 0;

    :deep(.ui-data-table__table-wrap) {
      overflow: auto;
    }

    :deep(.ant-table-thead > tr > th) {
      white-space: nowrap;
    }
  }

  &__table {
    width: 100%;
  }

  &__exam-link {
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
    font-weight: 500;
    color: var(--dp-primary, #1677ff);
    cursor: pointer;
    text-align: left;

    &:hover {
      text-decoration: underline;
    }
  }

  &__progress-text {
    font-size: 13px;
    color: var(--dp-text-primary, #0f172a);
  }

  &__progress-muted {
    font-size: 13px;
    color: var(--dp-text-muted, #94a3b8);
  }
}
</style>
