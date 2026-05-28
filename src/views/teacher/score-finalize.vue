<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="score-finalize__context">
        <div class="score-finalize__context-info">
          <h2 class="score-finalize__title">阅卷交付 - 成绩核定</h2>
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
        </div>
        <div class="score-finalize__context-actions">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadCandidates"
          >
            刷新
          </UiButton>
        </div>
      </div>
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

      <!-- B-2 核定状态机引导：计算 → 确认 → 发布 -->
      <UiProgressStepList
        :items="finalizeStepItems"
        title="核定流程引导"
        description="按状态机推进：计算总分 → 确认核定 → 发布到学生侧"
        compact
        class="score-finalize__guide"
      />

      <!-- D-3 当前页偏差提示：z-score >= 1.5 的考生需要复核 -->
      <UiAlertStrip
        v-if="biasAlert.visible"
        tone="warning"
        title="当前页存在显著偏离均值的成绩"
        :description="biasAlert.message"
        dense
        class="score-finalize__bias-alert"
      />

      <!-- 筛选区 -->
      <a-form layout="inline" class="score-finalize__filter-form">
        <a-form-item>
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
        <a-form-item>
          <a-select
            v-model:value="statusFilter"
            placeholder="按最终状态过滤"
            allow-clear
            class="score-finalize__status-select"
            :options="finalStatusOptions"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <UiButton size="sm" @click="handleSearch">查询</UiButton>
            <UiButton size="sm" variant="outline" @click="handleReset">重置</UiButton>
          </a-space>
        </a-form-item>
      </a-form>

      <UiCard class="score-finalize__table-card" flat>
        <template #title>
          <CheckCircleOutlined />
          <span>考生名单</span>
          <UiBadge tone="blue">{{ pagination.total ?? 0 }} 条</UiBadge>
        </template>

        <!-- D-9 错误态：考生名单加载失败时提供重试 + 上报入口 -->
        <UiErrorRetryPanel
          v-if="candidatesLoadError"
          :error="candidatesLoadError"
          title="成绩确认列表加载失败"
          :helper="`考试 ID：${selectedExamId}`"
          compact
          @retry="loadCandidates"
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
          class="score-finalize__table"
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.key === 'studentName'">
              <a-typography-text strong :content="candidates[index].studentName" />
            </template>
            <template v-else-if="column.key === 'finalScore'">
              <a-typography-text v-if="candidates[index].finalScore != null" strong type="success">
                {{ candidates[index].finalScore }} 分
              </a-typography-text>
              <span v-else class="score-finalize__hint">-</span>
            </template>
            <template v-else-if="column.key === 'bias'">
              <div class="score-finalize__bias-cell">
                <UiTag
                  :tone="BIAS_LEVEL_TONE[classifyBias(candidates[index].finalScore)]"
                  size="sm"
                >
                  {{ BIAS_LEVEL_LABEL[classifyBias(candidates[index].finalScore)] }}
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
              <a-space>
                <UiButton
                  size="sm"
                  variant="ghost"
                  :disabled="!candidates[index].paperInstanceId"
                  @click="openDetailDrawer(candidates[index])"
                >
                  明细
                </UiButton>
                <UiButton
                  size="sm"
                  :disabled="!canConfirm(candidates[index])"
                  @click="openConfirmModal(candidates[index])"
                >
                  {{ confirmButtonLabel(candidates[index]) }}
                </UiButton>
                <UiButton
                  size="sm"
                  variant="outline"
                  :disabled="!canPublish(candidates[index])"
                  @click="handlePublish(candidates[index])"
                >
                  {{ publishButtonLabel(candidates[index]) }}
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  :disabled="!canWithdraw(candidates[index])"
                  @click="openWithdrawModal(candidates[index])"
                >
                  撤回
                </UiButton>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
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
            <a-descriptions-item label="考生">
              {{ detailCandidate?.studentName }}（{{ detailCandidate?.studentNo }}）
            </a-descriptions-item>
            <a-descriptions-item label="班级">
              {{ detailCandidate?.studentClassName }}
            </a-descriptions-item>
            <a-descriptions-item label="试卷实例">
              <a-typography-text :content="paperScore.paperInstanceId" copyable />
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
              <template v-else-if="column.key === 'finalScore'">
                <a-typography-text v-if="paperQuestions[index].finalScore != null" strong>
                  {{ paperQuestions[index].finalScore }}
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
          <UiButton
            v-if="
              detailCandidate?.paperInstanceId && detailCandidate?.finalScoreStatus === 'PUBLISHED'
            "
            variant="outline"
            size="sm"
            @click="handleDeanonymize"
          >
            <template #icon>
              <EyeOutlined />
            </template>
            解匿名查看
          </UiButton>
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
        <UiAlertStrip
          tone="info"
          title="确认说明"
          description="后端将以题目确认得分重新汇总作为最终总分。确认后状态进入「已确认」，需要进一步「发布」才会通知学生。"
          dense
          class="score-finalize__alert"
        />
        <a-form-item label="考生">
          <a-input
            :value="
              confirmCandidate
                ? `${confirmCandidate.studentName}（${confirmCandidate.studentNo}）`
                : ''
            "
            disabled
          />
        </a-form-item>
        <a-form-item label="试卷计算总分将作为最终分">
          <a-input
            :value="confirmComputedScore != null ? `${confirmComputedScore} 分` : '加载中...'"
            disabled
          />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model:checked="confirmAndPublish"> 确认后立即发布并通知学生 </a-checkbox>
        </a-form-item>
      </a-form>
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
            :value="
              withdrawCandidate
                ? `${withdrawCandidate.studentName}（${withdrawCandidate.studentNo}）`
                : ''
            "
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

    <!-- D-3 下一步建议：确认成功后弹出，可选择继续核对下一份 / 跳转成绩发布 -->
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
import type { OperationLogVO } from '@/apis/mark/admin-audit'
import type {
  ExamPaperScoreVO,
  ExamQuestionScoreVO,
  ExamScoreSummaryItemVO,
  FinalScoreStatusCode,
} from '@/apis/mark/exam'
import type { BadgeTone, UiStatPanelItem, UiTrendPoint } from '@/components/ui-guide/ui/types'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import EyeOutlined from '@ant-design/icons-vue/EyeOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listOperationLogs } from '@/apis/mark/admin-audit'
import {
  confirmFinalScore,
  deanonymizePaper,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  getPaperScore,
  pageExams,
  pageExamScoreSummary,
  publishFinalScore,
  withdrawFinalScore,
} from '@/apis/mark/exam'
import {
  UiActivityTimeline,
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiDrawer,
  UiEmpty,
  UiErrorRetryPanel,
  UiProgressStepList,
  UiStatPanel,
  UiTag,
  UiTrendChart,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { formatDateTime, formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherScoreFinalize' })

function finalScoreStatusTone(value: FinalScoreStatusCode) {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, value, '最终成绩状态')
}

function finalScoreStatusLabel(value: FinalScoreStatusCode): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, value, '最终成绩状态')
}

// 直接从后端真实枚举 LABEL 对象派生 select options，零 as 断言。
const finalStatusOptions = Object.entries(FINAL_SCORE_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const router = useRouter()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExam,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

// ─── 考生名单（服务端分页） ─────────────────────────────
const candidates = ref<ExamScoreSummaryItemVO[]>([])
const loading = ref(false)
const candidatesLoadError = ref<unknown>(null)
const keyword = ref('')
const statusFilter = ref<FinalScoreStatusCode | undefined>(undefined)

const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
})

const columns: ColumnType<ExamScoreSummaryItemVO>[] = [
  { title: '学号', dataIndex: 'studentNo', key: 'studentNo', width: 140 },
  { title: '姓名', key: 'studentName', width: 120 },
  { title: '班级', dataIndex: 'studentClassName', key: 'studentClassName', width: 160 },
  { title: '最终分', key: 'finalScore', width: 110 },
  { title: '偏差', key: 'bias', width: 130 },
  { title: '最终状态', key: 'finalScoreStatus', width: 110 },
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
    if (!Array.isArray(result.list)) {
      const errMsg = '成绩确认候选列表响应缺少 list 数组'
      candidatesLoadError.value = new TypeError(errMsg)
      message.error(errMsg)
      return
    }
    candidates.value = result.list
    pagination.total = result.total
  } catch (error) {
    candidatesLoadError.value = error
    const errMsg = error instanceof Error ? error.message : '成绩汇总加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
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

function handlePageChange(payload: { current: number, pageSize: number }): void {
  pagination.current = payload.current
  pagination.pageSize = payload.pageSize
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
  const s = record.finalScoreStatus
  // CONFIRMED / WITHDRAWN / CORRECTED 可以发布
  return s === 'CONFIRMED' || s === 'WITHDRAWN' || s === 'CORRECTED'
}
function publishButtonLabel(record: ExamScoreSummaryItemVO): string {
  return record.finalScoreStatus === 'WITHDRAWN' ? '重新发布' : '发布'
}

/* ========== 信号指标：核定流程状态分布 ========== */

const statMetrics = computed<UiStatPanelItem[]>(() => {
  const buckets = candidateBuckets.value
  const total = pagination.total ?? 0
  return [
    { key: 'total', label: '考生总数', value: total, unit: '人', tone: 'blue' },
    { key: 'pending', label: '待计算', value: buckets.PENDING, unit: '人', tone: 'gray' },
    {
      key: 'calculated',
      label: '已计算',
      value: buckets.CALCULATED,
      unit: '人',
      tone: buckets.CALCULATED > 0 ? 'blue' : 'gray',
    },
    {
      key: 'confirmed',
      label: '已确认',
      value: buckets.CONFIRMED,
      unit: '人',
      tone: buckets.CONFIRMED > 0 ? 'blue' : 'gray',
    },
    {
      key: 'published',
      label: '已发布',
      value: buckets.PUBLISHED,
      unit: '人',
      tone: buckets.PUBLISHED > 0 ? 'green' : 'gray',
    },
    {
      key: 'withdrawn',
      label: '已撤回',
      value: buckets.WITHDRAWN,
      unit: '人',
      tone: buckets.WITHDRAWN > 0 ? 'orange' : 'gray',
    },
  ]
})

/** 共享：当前页候选状态分桶（去重，避免 statMetrics 与 finalizeStepItems 各算一遍） */
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
    message: `当前页有 ${severe} 名考生最终分偏离均值 ≥ 1.5 倍标准差（均值 ${meanText} / σ ${stdText}），建议对照原卷复核。`,
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

/**
 * B-2 核定状态机引导：把 6 桶状态收敛为 3 步可视化（计算 / 确认 / 发布）。
 * - 已计算 = CALCULATED + CONFIRMED + CORRECTED + PUBLISHED + WITHDRAWN（凡进入流程都已完成"计算"）
 * - 已确认 = CONFIRMED + CORRECTED + PUBLISHED + WITHDRAWN
 * - 已发布 = PUBLISHED
 * 当 candidates 为空时三步均为 pending，避免 0/0 派生 NaN。
 */
const finalizeStepItems = computed(() => {
  const b = candidateBuckets.value
  const total = pagination.total ?? 0
  const calculated = b.CALCULATED + b.CONFIRMED + b.CORRECTED + b.PUBLISHED + b.WITHDRAWN
  const confirmed = b.CONFIRMED + b.CORRECTED + b.PUBLISHED + b.WITHDRAWN
  const published = b.PUBLISHED
  const calcPercent = total > 0 ? Math.round((calculated / total) * 100) : 0
  const confirmPercent = total > 0 ? Math.round((confirmed / total) * 100) : 0
  const publishPercent = total > 0 ? Math.round((published / total) * 100) : 0
  function deriveStatus(percent: number, doneTrigger: number): 'pending' | 'active' | 'completed' {
    if (total === 0) return 'pending'
    if (doneTrigger >= total) return 'completed'
    if (percent > 0) return 'active'
    return 'pending'
  }
  return [
    {
      key: 'calculate',
      title: '1. 计算总分',
      description: '后端按题目得分汇总到 paper_total_score；进入此步后教师可点击「确认」。',
      meta: total > 0 ? `${calculated} / ${total}` : '-',
      percent: calcPercent,
      status: deriveStatus(calcPercent, calculated),
      helper: b.PENDING > 0 ? `${b.PENDING} 人尚未计算` : '所有考生已完成总分计算',
    },
    {
      key: 'confirm',
      title: '2. 教师确认',
      description: '确认即冻结当前总分；订正/撤回后需要重新确认才能发布。',
      meta: total > 0 ? `${confirmed} / ${total}` : '-',
      percent: confirmPercent,
      status: deriveStatus(confirmPercent, confirmed),
      helper: b.CALCULATED > 0 ? `${b.CALCULATED} 人已计算待确认` : '所有候选已通过确认环节',
    },
    {
      key: 'publish',
      title: '3. 发布给学生',
      description:
        '发布后学生侧成绩入口可见；撤回后学生侧不再可见。可使用列表中的「批量发布」一次推进。',
      meta: total > 0 ? `${published} / ${total}` : '-',
      percent: publishPercent,
      status: deriveStatus(publishPercent, published),
      helper:
        b.WITHDRAWN > 0
          ? `${b.WITHDRAWN} 人已撤回，需重新发布`
          : confirmed - published > 0
            ? `${confirmed - published} 人已确认待发布`
            : '已发布人数已覆盖确认队列',
    },
  ]
})

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

// computed 派生强类型题目数组，模板侧用 paperQuestions[index] 取 VO，避免 a-table slot record:any。
const paperQuestions = computed<ExamQuestionScoreVO[]>(() => paperScore.value?.questions ?? [])

const paperItemColumns: ColumnType<ExamQuestionScoreVO>[] = [
  { title: '题号', key: 'questionNo', width: 80 },
  { title: '题型', dataIndex: 'questionType', key: 'questionType', width: 100 },
  { title: '满分', dataIndex: 'fullScore', key: 'fullScore', width: 80 },
  { title: '最终得分', key: 'finalScore', width: 100 },
  { title: '状态', dataIndex: 'gradeStatus', key: 'gradeStatus', width: 110 },
]

// ─── B-6 操作记录（审计可追溯） ─────────────────────────────
const auditLogs = ref<OperationLogVO[]>([])
const auditLoading = ref(false)

type ScoreAuditOperationType = 'SCORE_CONFIRM' | 'SCORE_PUBLISH' | 'SCORE_WITHDRAW' | 'SCORE_CHANGE'

/** 后端真实操作类型与文案（admin-audit 中的 OPERATION_TYPE_LABEL 用的是不同 key，本页按真实落库口径再列一次） */
const SCORE_AUDIT_LABEL: Record<ScoreAuditOperationType, string> = {
  SCORE_CONFIRM: '确认最终成绩',
  SCORE_PUBLISH: '发布最终成绩',
  SCORE_WITHDRAW: '撤回最终成绩',
  SCORE_CHANGE: '题目得分变更',
}

const SCORE_AUDIT_TONE: Record<ScoreAuditOperationType, BadgeTone> = {
  SCORE_CONFIRM: 'blue',
  SCORE_PUBLISH: 'green',
  SCORE_WITHDRAW: 'red',
  SCORE_CHANGE: 'orange',
}

function isScoreAuditOperationType(value: unknown): value is ScoreAuditOperationType {
  return (
    value === 'SCORE_CONFIRM'
    || value === 'SCORE_PUBLISH'
    || value === 'SCORE_WITHDRAW'
    || value === 'SCORE_CHANGE'
  )
}

function scoreAuditTitle(log: OperationLogVO): string {
  if (isScoreAuditOperationType(log.operationType)) return SCORE_AUDIT_LABEL[log.operationType]
  return '审计操作类型异常'
}

function scoreAuditTone(log: OperationLogVO): BadgeTone {
  if (isScoreAuditOperationType(log.operationType)) return SCORE_AUDIT_TONE[log.operationType]
  return 'red'
}

async function loadPaperAuditLogs(): Promise<void> {
  if (!selectedExamId.value || !detailCandidate.value?.paperInstanceId) {
    auditLogs.value = []
    return
  }
  auditLoading.value = true
  try {
    const all = await listOperationLogs({
      examId: selectedExamId.value,
      targetType: 'FINAL_SCORE',
      targetId: detailCandidate.value.paperInstanceId,
    })
    auditLogs.value = all.sort((a, b) => {
      const ta = a.createTime ? dayjs(a.createTime).valueOf() : 0
      const tb = b.createTime ? dayjs(b.createTime).valueOf() : 0
      return tb - ta
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '操作记录加载失败'
    message.warning(errMsg)
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
        ? [{ label: `traceId ${log.traceId.slice(0, 8)}…`, tone: 'gray' as BadgeTone }]
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
    const errMsg = error instanceof Error ? error.message : '历次成绩趋势加载失败'
    message.warning(errMsg)
    historicalScores.value = []
  } finally {
    historicalLoading.value = false
  }
}

/** UiTrendChart 输入：考试名为 label，最终分为 value，当前考试 key 用于 modelValue 高亮 */
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
    const errMsg = error instanceof Error ? error.message : '成绩明细加载失败'
    message.error(errMsg)
  } finally {
    detailLoading.value = false
  }
  // 操作记录、历次成绩趋势与成绩明细并行展示但顺序加载，避免单点失败阻断主明细
  void loadPaperAuditLogs()
  void loadHistoricalScores()
}

async function handleDeanonymize(): Promise<void> {
  if (!selectedExamId.value || !detailCandidate.value?.paperInstanceId) return
  try {
    const result = await deanonymizePaper({
      examId: selectedExamId.value,
      paperInstanceId: detailCandidate.value.paperInstanceId,
      revealScenario: 'SCORE_FINALIZE_REVIEW',
      reason: '成绩确认明细查看考生身份',
    })
    message.success(`解匿名成功：${result.studentName}（${result.studentNo}）`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '解匿名失败'
    message.error(errMsg)
  }
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
    const errMsg = error instanceof Error ? error.message : '试卷计算总分加载失败'
    message.warning(errMsg)
  }
}

// ─── D-3 下一步建议 ─────────────────────────────
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
  const b = candidateBuckets.value
  const settled = b.CONFIRMED + b.PUBLISHED + b.WITHDRAWN + b.CORRECTED
  const total = pagination.total ?? 0
  if (total > 0 && settled >= total) {
    nextStep.value = {
      visible: true,
      kind: 'all-confirmed',
      title: '本场全部成绩已核定',
      description: `共 ${total} 名考生：已确认 ${b.CONFIRMED} · 已发布 ${b.PUBLISHED} · 已撤回 ${b.WITHDRAWN} · 已更正 ${b.CORRECTED}。建议进入「成绩发布」推进到学生侧。`,
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
      description: `当前页还有 ${b.CALCULATED + b.PENDING} 名考生待确认。下一位待确认：${next.studentName}（${next.studentNo}）。`,
      nextCandidate: next,
    }
    return
  }
  // 当前页已全部处理，但全场未完成 → 翻页提示
  nextStep.value = {
    visible: true,
    kind: 'continue-next',
    title: '当前页已全部核对',
    description: `当前页 ${pagination.pageSize} 条已处理，全场仍有未确认成绩。建议翻到下一页继续核对。`,
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
    void router.push({ path: '/teacher/score-publish', query: { examId } })
  }
}

async function handleConfirm(): Promise<void> {
  if (!selectedExamId.value || !confirmCandidate.value?.paperInstanceId) return
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
    await loadCandidates()
    deriveNextStepSuggestion()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '成绩确认失败'
    message.error(errMsg)
  } finally {
    confirming.value = false
  }
}

// ─── 发布成绩 ─────────────────────────────
async function handlePublish(record: ExamScoreSummaryItemVO): Promise<void> {
  if (!selectedExamId.value || !record.paperInstanceId) return
  try {
    await publishFinalScore({
      examId: selectedExamId.value,
      paperInstanceId: record.paperInstanceId,
    })
    message.success('成绩已发布，学生通知已下发')
    await loadCandidates()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '成绩发布失败'
    message.error(errMsg)
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
    const errMsg = error instanceof Error ? error.message : '成绩撤回失败'
    message.error(errMsg)
  } finally {
    withdrawing.value = false
  }
}

// ─── 初始化 ─────────────────────────────────────
watch(selectedExamId, (value) => {
  pagination.current = 1
  if (value) {
    void loadCandidates()
  } else {
    candidates.value = []
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
    await loadCandidates()
  }
})
</script>

<style lang="scss" scoped>
.score-finalize {
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
