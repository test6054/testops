<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="考试历史">
        <template #status>
          <UiTag tone="blue" size="sm">{{ exams.length }} 场</UiTag>
          <UiTag v-if="publishedCount > 0" tone="green" size="sm">
            已发布 {{ publishedCount }}
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
          v-model="historyFilterForm"
          :fields="historyFilterFields"
          variant="plain"
          search-text="查询"
        />
      </template>

      <UiDataTable
        pagination-mode="client"
        :columns="columns"
        :data-source="filteredExams"
        :loading="loading"
        :page-size="10"
        :total="filteredExams.length"
        flat
        row-key="examId"
        size="middle"
        class="history-table student-detail-table__data-table"
      >
        <template #bodyCell="{ column, record: item }">
          <template v-if="column.key === 'examName'">
            <button
              type="button"
              class="link-cell"
              :disabled="item.finalScoreStatus !== 'PUBLISHED'"
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
              v-if="item.finalScoreStatus === 'PUBLISHED' && item.finalScore != null"
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
import type { FinalScoreStatusCode } from '@/apis/mark/final-score-status'
import type { StudentExamItemVO } from '@/apis/mark/student-exam'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  FINAL_SCORE_STATUS_CODES,
  FINAL_SCORE_STATUS_TONE,
  FinalScoreStatusDescription,
} from '@/apis/mark/final-score-status'
import {
  canSubmitReview,
  listMyExams,
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
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentExamHistory' })

const router = useRouter()
const loading = ref(false)
const exams = ref<StudentExamItemVO[]>([])

const historyFilterForm = reactive<{
  keyword: string
  statusFilter?: FinalScoreStatusCode
}>({
  keyword: '',
  statusFilter: undefined,
})

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
  { title: '考试', key: 'examName', dataIndex: 'examName', width: 260 },
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
  { title: '操作', key: 'actions', fixed: 'right', width: 200 },
]

const filteredExams = computed<StudentExamItemVO[]>(() => {
  return exams.value.filter((item) => {
    if (
      historyFilterForm.statusFilter
      && item.finalScoreStatus !== historyFilterForm.statusFilter
    ) {
      return false
    }
    if (historyFilterForm.keyword.trim()) {
      const kw = historyFilterForm.keyword.trim().toLowerCase()
      const name = item.examName.toLowerCase()
      const no = item.examNo.toLowerCase()
      if (!name.includes(kw) && !no.includes(kw)) {
        return false
      }
    }
    return true
  })
})

const publishedCount = computed(
  () => exams.value.filter((e) => e.finalScoreStatus === 'PUBLISHED').length,
)

async function loadExams() {
  loading.value = true
  try {
    exams.value = await listMyExams()
  } catch (error) {
    exams.value = []
    showUserError(error, '考试列表加载失败')
  } finally {
    loading.value = false
  }
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

/** 未发布成绩列展示固定文案，避免 `--` 让学生误以为数据缺失 */
function unpublishedScoreText(status: FinalScoreStatusCode): string {
  if (status === 'PUBLISHED') {
    return '--'
  }
  return '尚未公布'
}

function buildExamHistoryActions(record: StudentExamItemVO): UiTableRowActionItem[] {
  return [
    {
      key: 'detail',
      label: '查看详情',
      disabled: record.finalScoreStatus !== 'PUBLISHED',
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

onMounted(loadExams)

onActivated(loadExams)
</script>

<style lang="scss" scoped>
.exam-history-page__list-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: var(--dp-font-weight-title);
}

.history-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.link-cell {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--ant-color-primary);
  font-weight: 500;
  font-size: 14px;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }

  &__sub {
    margin-top: 2px;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }
}

.score-cell {
  font-weight: 600;
  color: var(--ant-color-success);
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--ant-color-text-tertiary);
}
</style>
