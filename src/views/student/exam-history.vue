<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="考试历史">
        <template #status>
          <UiTag tone="blue" size="sm">{{ examStats?.totalExamCount ?? 0 }} 场</UiTag>
          <UiTag v-if="(examStats?.publishedCount ?? 0) > 0" tone="green" size="sm">
            已发布 {{ examStats?.publishedCount }}
          </UiTag>
        </template>
      </ContextBar>
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
              :disabled="item.finalScoreStatus !== FinalScoreStatusCode.PUBLISHED"
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
                item.finalScoreStatus === FinalScoreStatusCode.PUBLISHED && item.finalScore != null
              "
              class="score-cell"
            >
              {{ Number(item.finalScore).toFixed(2) }}
            </span>
            <span v-else class="muted">{{ unpublishedScoreText(item.finalScoreStatus) }}</span>
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
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import { onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  FINAL_SCORE_STATUS_CODES,
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusCode,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
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
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useQueryTable } from '@/composables/useQueryTable'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentExamHistory' })

interface StudentExamHistoryFilters extends Record<string, unknown> {
  keyword: string
  statusFilter?: FinalScoreStatusCode
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

const statusOptions = FINAL_SCORE_STATUS_CODES.map((value) => ({
  value,
  label: strictEnumLabel(FinalScoreStatusDescription, value, '最终成绩状态'),
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
  { title: '操作', key: 'actions', width: 200 },
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

function finalScoreStatusTone(status: FinalScoreStatusCode): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, status, '最终成绩状态')
}

function finalScoreStatusLabel(status: FinalScoreStatusCode): string {
  return strictEnumLabel(FinalScoreStatusDescription, status, '最终成绩状态')
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

function unpublishedScoreText(status: FinalScoreStatusCode): string {
  if (status === FinalScoreStatusCode.PUBLISHED) {
    return '--'
  }
  if (status === FinalScoreStatusCode.CORRECTED) {
    return '更正待重发'
  }
  if (status === FinalScoreStatusCode.WITHDRAWN) {
    return '成绩已撤回'
  }
  return '尚未公布'
}

function buildExamHistoryActions(record: StudentExamItemVO): UiTableRowActionItem[] {
  return [
    {
      key: 'detail',
      label: '查看详情',
      disabled: record.finalScoreStatus !== FinalScoreStatusCode.PUBLISHED,
    },
    {
      key: 'appeal',
      label: '提交复核',
      tone: canSubmitReview(record) ? 'primary' : 'default',
      disabled: !canSubmitReview(record),
    },
  ]
}

function handleExamHistoryAction(key: string, record: StudentExamItemVO): void {
  if (key === 'detail') {
    goDetail(record.examId)
  } else if (key === 'appeal') {
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
  gap: 8px;
}

.link-cell {
  padding: 0;
  border: none;
  background: none;
  color: var(--dp-primary);
  cursor: pointer;
  text-align: left;
}

.link-cell:disabled {
  color: inherit;
  cursor: default;
}

.link-cell__sub {
  margin-top: 2px;
  font-size: 12px;
  color: var(--dp-text-secondary);
}

.score-cell {
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--dp-text-secondary);
}
</style>
