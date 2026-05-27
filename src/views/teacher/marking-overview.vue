<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="marking-overview__context">
        <div class="marking-overview__context-info">
          <h2 class="marking-overview__title">阅卷交付 - 考试总览</h2>
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
          <UiButton variant="ghost" size="sm" @click="resetQuery"> 重置 </UiButton>
          <UiButton variant="outline" size="sm" :loading="loading" @click="reload"> 查询 </UiButton>
        </div>
      </div>
    </template>

    <!-- D-1 紧急横幅：仅在累计扫描异常 / 大量待批阅时显示 -->
    <UiAlertStrip
      v-if="urgentBanner"
      tone="warning"
      :title="urgentBanner.title"
      :description="urgentBanner.description"
      class="marking-overview__urgent"
    />
    <UiAlertStrip
      v-if="progressLoadError"
      tone="error"
      title="部分考试进度加载失败"
      :description="progressLoadError"
      class="marking-overview__urgent"
    />

    <!-- 今日待办 KPI（任务驱动入口，每张卡可点击直跳） -->
    <UiStatPanel
      :items="statMetrics"
      :columns="4"
      variant="grid"
      compact
      class="marking-overview__signals"
    />

    <StageRail :stages="stages" compact class="marking-overview__stages" />

    <!-- D-1 建议优先推进的考试 top 5 -->
    <UiCard v-if="recommendedExams.length > 0" class="marking-overview__recommend-card">
      <template #title>
        <span>建议优先推进的考试</span>
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
              <strong class="marking-overview__recommend-title">
                {{ item.examName }}
              </strong>
              <span v-if="item.examNo" class="marking-overview__recommend-no">#{{ item.examNo }}</span>
              <UiTag v-if="item.attention > 0" tone="red" size="sm">
                {{ item.attention }} 条扫描异常
              </UiTag>
              <UiTag tone="orange" size="sm"> 待批阅 {{ item.pending }} 题 </UiTag>
              <UiTag tone="blue" size="sm"> 完成率 {{ item.completeRate }}% </UiTag>
            </div>
            <div class="marking-overview__recommend-meta">
              已确认 {{ item.confirmedGrades }} / {{ item.totalGrades }} 题
            </div>
          </div>
          <div class="marking-overview__recommend-actions">
            <UiButton size="sm" variant="outline" @click="goReviewProgress(item.examId)">
              查看进度
            </UiButton>
            <UiButton size="sm" @click="goMarkingTaskPool(item.examId)"> 进入阅卷 </UiButton>
          </div>
        </li>
      </ul>
    </UiCard>

    <section class="marking-overview__panel">
      <header class="marking-overview__panel-header">
        <h3 class="marking-overview__panel-title">考试列表</h3>
        <span class="marking-overview__panel-meta"> 共 {{ total }} 场考试 </span>
      </header>

      <!-- D-9 错误态：考试列表加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="examsLoadError"
        :error="examsLoadError"
        title="考试列表加载失败"
        compact
        @retry="loadExams"
      />
      <UiDataTable
        v-else
        :columns="tableColumns"
        :data-source="exams"
        :loading="loading"
        row-key="examId"
        :show-pagination="true"
        :pagination="{
          current: pageNum,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 场`,
          onChange: handlePageChange,
        }"
        flat
        empty-title="暂无考试"
        empty-description="暂无可参与批阅的考试"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'examName'">
            <span class="marking-overview__exam-name">{{ record.examName }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <UiTag :tone="examStatusTone(record.status)" size="sm">
              {{ record.statusMessage }}
            </UiTag>
          </template>
          <template v-else-if="column.dataIndex === 'examStartTime'">
            {{ formatTime(record.examStartTime) || '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'examEndTime'">
            {{ formatTime(record.examEndTime) || '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'actions'">
            <a-space :size="4" wrap>
              <UiButton size="sm" @click="goPrepWorkbench(record.examId)"> 准备工作台 </UiButton>
              <UiButton size="sm" variant="ghost" @click="goScanMonitor(record.examId)">
                扫描监控
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="goScanAttention(record.examId)">
                异常处理
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="goReviewProgress(record.examId)">
                复核进度
              </UiButton>
              <UiButton size="sm" variant="ghost" @click="goScoreFinalize(record.examId)">
                成绩确认
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
/**
 * 阅卷交付 - 考试总览
 *
 * 后端契约：
 * - POST /api/mark/exams/page  分页查询 ExamPageQueryPayload（keyword / status / courseId / createUserId）
 *
 * 阅卷主流程阶段（作为全局引导 StageRail）：
 *   考试准备 -> 扫描识别 -> 阅卷组织 -> 批阅工作区 -> 质量控制 -> 成绩发布 -> 考后归档
 */
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ExamStatusCode, ExamSummaryVO, MarkingProgressVO } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import message from 'ant-design-vue/es/message'

import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  getMarkingProgress,
  pageExams,
} from '@/apis/mark/exam'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageRail, StageWorkbenchShell } from '@/components/workbench'
import { formatDateTime } from '@/utils/format'

defineOptions({ name: 'TeacherMarkingOverview' })

/**
 * 紧急横幅触发阈值
 *
 * 阅卷概览页跨考试聚合后，达到这个待批改任务数即提示批量推进。
 * 阈值参考依据：教师单次集中批阅 30 份属于工作日内可消化的常规上限；
 * 当后端开放租户级配置后，此处可改为读取 tenantStore 配置值。
 */
const URGENT_PENDING_REVIEW_THRESHOLD = 30

function examStatusTone(status: ExamStatusCode): BadgeTone {
  return EXAM_STATUS_TONE[status]
}

const statusOptions: Array<{ label: string, value: ExamStatusCode }> = [
  { label: EXAM_STATUS_LABEL.ACTIVE, value: 'ACTIVE' },
  { label: EXAM_STATUS_LABEL.CLOSED, value: 'CLOSED' },
]

const tableColumns: ColumnsType = [
  { title: '考试名称', dataIndex: 'examName', ellipsis: true },
  { title: '编号', dataIndex: 'examNo', width: 120 },
  { title: '状态', dataIndex: 'status', width: 110 },
  { title: '开始时间', dataIndex: 'examStartTime', width: 160 },
  { title: '结束时间', dataIndex: 'examEndTime', width: 160 },
  { title: '操作', dataIndex: 'actions', width: 360, fixed: 'right' },
]

const router = useRouter()

const exams = ref<ExamSummaryVO[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(20)
const loading = ref(false)
// D-9 错误态：考试列表加载失败时 UiErrorRetryPanel 重试 + 上报
const examsLoadError = ref<unknown>(null)
const keyword = ref('')
const statusFilter = ref<ExamStatusCode | undefined>(undefined)

// ─── D-1 任务驱动：跨考试进度聚合 ────────────────────
/**
 * 缓存每场 ACTIVE 考试的批改进度快照（来自后端 getMarkingProgress）。
 * 教师视角下通常关注 5-30 场考试；并行 RPC 控制在 max 30 场内，避免页面打开过慢。
 */
const examProgressMap = ref<Map<string, MarkingProgressVO>>(new Map())
const progressLoading = ref(false)
const progressLoadError = ref('')

/** 是否所有进度都已就绪，用于 KPI 数字"…"占位 */
const progressReady = computed<boolean>(() => !progressLoading.value)

/** 跨考试聚合：每个 KPI 都是「我作为教师当前该处理的任务总量」 */
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
    const total = p.totalQuestionGradeCount
    const confirmed = p.confirmedQuestionGradeCount
    unconfirmedQuestionGrades += Math.max(0, total - confirmed)
  }
  return {
    pendingReview,
    inProgressReview,
    openProcessing,
    scanAttention,
    unconfirmedQuestionGrades,
  }
})

/**
 * 今日待办（任务驱动 KPI）：每张卡可点击直跳到对应工作台。
 * 取代原"考试规模"指标 — 教师每天打开系统第一眼看到的是「我该做什么」而不是「系统有多少考试」。
 */
const statMetrics = computed(() => {
  const a = aggregate.value
  return [
    {
      key: 'pending-review',
      label: '待批改任务',
      value: progressLoadError.value ? '不可用' : progressReady.value ? a.pendingReview : '…',
      unit: '份',
      helper: '同题剩余 PENDING 总数',
      tone: (a.pendingReview > 0 ? 'orange' : 'gray') as BadgeTone,
      clickable: a.pendingReview > 0,
      onClick: () => router.push({ name: 'TeacherMarkingTaskPool' }),
    },
    {
      key: 'in-progress',
      label: '我的进行中批阅',
      value: progressLoadError.value ? '不可用' : progressReady.value ? a.inProgressReview : '…',
      unit: '份',
      helper: '已认领尚未提交',
      tone: (a.inProgressReview > 0 ? 'blue' : 'gray') as BadgeTone,
      clickable: a.inProgressReview > 0,
      onClick: () => router.push({ name: 'TeacherMarkingTaskPool' }),
    },
    {
      key: 'unconfirmed',
      label: '待确认成绩',
      value: progressLoadError.value
        ? '不可用'
        : progressReady.value
          ? a.unconfirmedQuestionGrades
          : '…',
      unit: '题',
      helper: '需进入「成绩确认」推进',
      tone: (a.unconfirmedQuestionGrades > 0 ? 'purple' : 'gray') as BadgeTone,
      clickable: a.unconfirmedQuestionGrades > 0,
      onClick: () => router.push({ name: 'TeacherScoreFinalize' }),
    },
    {
      key: 'scan-attention',
      label: '扫描异常待处理',
      value: progressLoadError.value ? '不可用' : progressReady.value ? a.scanAttention : '…',
      unit: '条',
      helper: '影响阅卷推进',
      tone: (a.scanAttention > 0 ? 'red' : 'gray') as BadgeTone,
      clickable: a.scanAttention > 0,
      onClick: () => router.push({ name: 'TeacherScanAttention' }),
    },
  ]
})

/**
 * 推荐优先推进的考试 top 5：以「未确认题目数」倒序，反映"哪场考试卡在批改环节"。
 * 仅在当前页 ACTIVE 考试范围内统计；用户改变筛选/翻页后会重新聚合。
 */
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
    const totalGrades = p.totalQuestionGradeCount
    const confirmedGrades = p.confirmedQuestionGradeCount
    const pending = Math.max(0, totalGrades - confirmedGrades)
    const attention = p.scanAttentionCount
    // 推进价值排序信号：未确认题目 + 扫描异常都计入紧迫度
    if (pending === 0 && attention === 0) continue
    const completeRate = totalGrades > 0 ? Math.round((confirmedGrades / totalGrades) * 100) : 0
    result.push({
      examId: exam.examId,
      examName: exam.examName,
      examNo: exam.examNo,
      totalGrades,
      confirmedGrades,
      pending,
      attention,
      completeRate,
    })
  }
  // 紧迫度倒序：未确认题目数为主，异常数为辅
  result.sort((a, b) => b.pending - a.pending || b.attention - a.attention)
  return result.slice(0, 5)
})

/**
 * StageRail 全局阶段状态由聚合进度推断：
 *  - 扫描异常 > 0 → scan 阶段 active；
 *  - 待批改 > 0 → review 阶段 active；
 *  - 待确认成绩 > 0 → publish 阶段 active；
 *  - 其余 → pending。
 */
function inferStageStatus(predicate: () => boolean): WorkbenchStageStatus {
  return predicate() ? 'active' : 'pending'
}

const stages = computed<WorkbenchStage[]>(() => {
  const a = aggregate.value
  return [
    { key: 'prep', title: '考试准备', status: 'pending', statusText: '考试 / 模板 / 名册' },
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

/** 是否需要展示「需立即关注」红色横幅 */
const urgentBanner = computed<{ title: string, description: string } | null>(() => {
  const a = aggregate.value
  if (a.scanAttention > 0) {
    return {
      title: `${a.scanAttention} 条扫描异常待处理，影响后续阅卷推进`,
      description: '点击下方「扫描异常待处理」KPI 可直接进入处理工作台。',
    }
  }
  if (a.pendingReview >= URGENT_PENDING_REVIEW_THRESHOLD) {
    return {
      title: `当前累计 ${a.pendingReview} 份待批阅任务，建议进入「阅卷任务池」批量推进`,
      description: '使用批阅工作区底部「提交并取下一份」可流水线接力批阅。',
    }
  }
  return null
})

/**
 * 列表场景的日期时间格式化：空值返回空串以便模板侧 `|| '-'` 兜底。
 * 委托统一 utils/format#formatDateTime。
 */
function formatTime(value?: string): string {
  return formatDateTime(value, '')
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
    exams.value = result.list
    total.value = result.total
  } catch (error) {
    examsLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '考试列表加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
  // 列表就位后即可启动跨考试进度聚合（独立 loading 不阻塞表格渲染）
  await loadAggregateProgress()
}

/** D-1 聚合加载：任一考试进度失败都暴露诊断，避免任务 KPI 呈现伪完整状态。 */
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

function handlePageChange(page: number, size: number): void {
  pageNum.value = page
  pageSize.value = size
  void loadExams()
}

function goScanMonitor(examId: string): void {
  void router.push({ name: 'TeacherScanUpload', query: { examId } })
}

function goScanAttention(examId: string): void {
  void router.push({ name: 'TeacherScanAttention', query: { examId } })
}

function goReviewProgress(examId: string): void {
  void router.push({ name: 'TeacherReviewProgress', query: { examId } })
}

function goScoreFinalize(examId: string): void {
  void router.push({ name: 'TeacherScoreFinalize', query: { examId } })
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

  &__filter {
    width: 220px;

    &--sm {
      width: 140px;
    }
  }

  &__stages {
    margin-bottom: 0;
  }

  &__signals {
    margin-bottom: 0;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
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
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__exam-name {
    font-weight: 500;
    color: var(--dp-text-primary, #0f172a);
  }

  &__urgent {
    margin-bottom: 0;
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
    border-radius: var(--dp-radius-md, 6px);
    background: var(--dp-surface, #fff);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      border-color: rgba(22, 119, 255, 0.3);
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
    }
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
    color: var(--dp-text-secondary, #475569);
  }

  &__recommend-meta {
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
  }

  &__recommend-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}
</style>
