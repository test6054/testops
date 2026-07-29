<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="考试历史" :subtitle="ExamHistoryWorkbenchSubtitle">
        <template #status>
          <UiTag tone="blue" size="sm">
            {{ examStats == null ? '—' : `${examStats.totalExamCount} 场` }}
          </UiTag>
          <UiTag v-if="(examStats?.publishedCount ?? 0) > 0" tone="green" size="sm">
            已发布 {{ examStats?.publishedCount }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <template v-if="ExamHistorySignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="ExamHistorySignalMetrics"
        @metric-click="onExamHistorySignalClick"
      />
    </template>

    <WorkbenchSurfaceCard flush class="exam-history-page__table-card">
      <template #head>
        <div class="exam-history-page__list-head">
          <FileSearchOutlined />
          <span>考试列表</span>
        </div>
      </template>
      <template #toolbar>
        <UiFilterBar
          v-model="historyFilters"
          :fields="historyFilterFields"
          variant="plain"
          search-text="查询"
          @search="searchExams"
          @reset="resetExamFilters"
        />
      </template>

      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :load-error="loadError"
        :total="pageTotal"
        flat
        row-key="examId"
        size="middle"
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record: item }">
          <template v-if="column.key === 'examName'">
            <button
              type="button"
              class="link-cell"
              :disabled="item.finalScoreStatus !== StudentFacingFinalScoreStatusCode.PUBLISHED"
              @click="goDetail(item.examId)"
            >
              {{ item.examName }}
            </button>
            <div v-if="item.examNo" class="link-cell__sub">编号：{{ item.examNo }}</div>
          </template>
          <template v-else-if="column.key === 'finalScoreStatus'">
            <UiTag :tone="finalScoreStatusTone(item.finalScoreStatus)" size="sm">
              {{ finalScoreStatusLabel(item.finalScoreStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'finalScore'">
            <span
              v-if="
                item.finalScoreStatus === StudentFacingFinalScoreStatusCode.PUBLISHED && item.finalScore != null
              "
              class="score-cell"
            >
              {{ Number(item.finalScore).toFixed(2) }}
            </span>
            <span v-else class="dp-text-muted">{{ unpublishedScoreText(item.finalScoreStatus) }}</span>
          </template>
          <template v-else-if="column.key === 'examStartTime'">
            {{ formatDateTime(item.examStartTime) }}
          </template>
          <template v-else-if="column.key === 'publishedTime'">
            {{ formatDateTime(item.publishedTime) }}
          </template>
          <template v-else-if="column.key === 'reviewWindowStatus'">
            <UiTag :tone="reviewWindowStatusTone(item)" size="sm">
              {{ reviewWindowStatusLabel(item) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :max-visible="2"
              :items="buildExamHistoryActions(item)"
              split
              @action="(key) => handleExamHistoryAction(key, item)"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { StudentExamItemVO, StudentExamStatsResponse } from '@/apis/mark/student-exam'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  canSubmitReview,
  getMyExamStats,
  pageMyExams,
  ReviewWindowPolicyStatusDescription,
  STUDENT_REVIEW_WINDOW_STATUS_TONE,
} from '@/apis/mark/student-exam'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useQueryTable } from '@/composables/useQueryTable'
import {
  ALL_STUDENT_FACING_FINAL_SCORE_STATUS_CODES,
  StudentFacingFinalScoreStatusCode,
  StudentFacingFinalScoreStatusDescription,
} from '@/types/enums/student-facing-final-score-status-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import {
  studentFacingFinalScoreStatusLabel,
  studentFacingFinalScoreStatusTone,
  studentFacingUnpublishedScoreText,
} from '@/utils/student-final-score-status'

defineOptions({ name: 'StudentExamHistory' })

interface StudentExamHistoryFilters extends Record<string, unknown> {
  keyword: string
  statusFilter?: StudentFacingFinalScoreStatusCode
}

const router = useRouter()
const examStats = ref<StudentExamStatsResponse | null>(null)

const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  filters: historyFilters,
  loadError,
  search: searchExams,
  resetFilters: resetExamFilters,
  handlePageChange,
  reload: reloadExams,
} = useQueryTable<StudentExamItemVO, StudentExamHistoryFilters>(
  (params) =>
    pageMyExams({
      keyword: params.keyword?.trim() || undefined,
      finalScoreStatus: params.statusFilter,
      pageNum: params.pageNum,
      pageSize: params.pageSize,
    }),
  {
    defaultFilters: (): StudentExamHistoryFilters => ({
      keyword: '',
      statusFilter: undefined,
    }),
    errorMessage: '考试列表加载失败',
  },
)

const ExamHistorySignalMetrics = computed<SignalMetric[]>(() => {
  if (!examStats.value) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'total',
      label: '考试场次',
      value: examStats.value.totalExamCount ?? 0,
      clickable: true,
    },
  ]
  if ((examStats.value.publishedCount ?? 0) > 0) {
    metrics.push({
      key: 'published',
      label: '已发布成绩',
      value: examStats.value.publishedCount ?? 0,
    })
  }
  metrics.push({
    key: 'page',
    label: '本页',
    value: pageTotal.value,
    helper: '仅当前页',
  })
  return applySpotlightEmphasis(metrics, {
    primaryKey: 'total',
    actionLabel: '刷新',
  })
})

const ExamHistoryWorkbenchSubtitle = computed(() => {
  if (!examStats.value) {
    return undefined
  }
  const parts = [`${examStats.value.totalExamCount ?? 0} 场`]
  if ((examStats.value.publishedCount ?? 0) > 0) {
    parts.push(`已发布 ${examStats.value.publishedCount}`)
  }
  return parts.join(' · ')
})

function onExamHistorySignalClick(_key: string) {
  void reloadPage()
}

const statusOptions = ALL_STUDENT_FACING_FINAL_SCORE_STATUS_CODES.map((value) => ({
  value,
  label: StudentFacingFinalScoreStatusDescription[value],
}))

const historyFilterFields: FilterField[] = [
  {
    key: 'keyword',
    type: 'input',
    placeholder: '按考试名称或编号筛选',
    allowClear: true,
    width: 240,
    inputPrefixIcon: 'search',
    triggerSearchOnChange: false,
  },
  {
    key: 'statusFilter',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 160,
    options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
  },
]

const columns: ColumnsType<StudentExamItemVO> = [
  {
    title: '考试',
    key: 'examName',
    dataIndex: 'examName',
    width: 280,
    ellipsis: true,
    fixed: 'left',
  },
  { title: '开始时间', key: 'examStartTime', dataIndex: 'examStartTime', width: 170 },
  { title: '成绩状态', key: 'finalScoreStatus', dataIndex: 'finalScoreStatus', width: 110 },
  {
    title: '得分',
    key: 'finalScore',
    dataIndex: 'finalScore',
    width: 100,
    align: 'right',
  },
  { title: '发布时间', key: 'publishedTime', dataIndex: 'publishedTime', width: 170 },
  { title: '复核窗口', key: 'reviewWindowStatus', dataIndex: 'reviewWindowStatus', width: 120 },
  { title: '主行动', key: 'actions', width: 200 },
]

async function loadExamStats(): Promise<void> {
  try {
    examStats.value = await getMyExamStats({})
  } catch (error) {
    examStats.value = null
    showUserError(error, '考试统计加载失败')
  }
}

async function reloadPage(): Promise<void> {
  await Promise.all([reloadExams(), loadExamStats()])
}

function finalScoreStatusTone(status: StudentFacingFinalScoreStatusCode): BadgeTone {
  return studentFacingFinalScoreStatusTone(status)
}

function finalScoreStatusLabel(status: StudentFacingFinalScoreStatusCode): string {
  return studentFacingFinalScoreStatusLabel(status)
}

function reviewWindowStatusTone(item: StudentExamItemVO): BadgeTone {
  return strictEnumTone(STUDENT_REVIEW_WINDOW_STATUS_TONE, item.reviewWindowStatus, '复核窗口状态')
}

function reviewWindowStatusLabel(item: StudentExamItemVO): string {
  return strictEnumLabel(
    ReviewWindowPolicyStatusDescription,
    item.reviewWindowStatus,
    '复核窗口状态',
  )
}

function unpublishedScoreText(status: StudentFacingFinalScoreStatusCode): string {
  return studentFacingUnpublishedScoreText(status)
}

function buildExamHistoryActions(record: StudentExamItemVO): UiTableRowActionItem[] {
  return [
    {
      key: 'detail',
      label: '查看详情',
      disabled: record.finalScoreStatus !== StudentFacingFinalScoreStatusCode.PUBLISHED, tone: 'primary' },
    {
      key: 'appeal',
      label: '提交复核',
      tone: canSubmitReview(record) === true ? 'primary' : 'default',
      disabled: canSubmitReview(record) !== true,
    },
  ]
}

function handleExamHistoryAction(key: string, record: StudentExamItemVO): void {
  if (key === 'detail') {
    goDetail(record.examId)
  } else if (key === 'appeal') {
    // MVR-320：与 canSubmitReview / BE canSubmitReviewRequest 二次拦截
    if (canSubmitReview(record) !== true) {
      void message.warning('当前暂不能提交复核申请')
      return
    }
    goAppeal(record.examId)
  }
}

function goDetail(examId: string) {
  router.push({ name: 'StudentScoreDetail', params: { examId } })
}

function goAppeal(examId: string) {
  router.push({ name: 'StudentAppeal', query: { examId } })
}

onMounted(reloadPage)

onActivated(reloadPage)
</script>

<style scoped>
.exam-history-page__table-card {
  margin-top: 0;
}

.exam-history-page__list-head {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
}

.link-cell {
  padding: 0;
  border: none;
  background: none;
  color: var(--dp-color-primary);
  cursor: pointer;
  text-align: left;
}

.link-cell:disabled {
  color: inherit;
  cursor: default;
}

.link-cell__sub {
  margin-top: 2px;
  font-size: var(--dp-font-size-xs);
  color: var(--dp-text-secondary);
}

.score-cell {
  font-variant-numeric: tabular-nums;
}
</style>
