<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">{{ exams.length }} 场</UiTag>
          <UiTag v-if="publishedCount > 0" tone="green" size="sm">
            已发布 {{ publishedCount }}
          </UiTag>
        </template>
      </ContextBar>
    </template>

    <a-card :bordered="false" class="detail-table-card exam-history-page__table-card">
      <template #title>
        <FileSearchOutlined />
        <span>考试列表</span>
      </template>

      <UiFilterBar
        v-model="historyFilterForm"
        :fields="historyFilterFields"
        search-text="查询"
      />

      <UiErrorRetryPanel
        v-if="examsLoadError"
        :error="examsLoadError"
        @retry="loadExams"
      />

      <UiDataTable
        v-else
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
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'examName'">
            <button
              type="button"
              class="link-cell"
              :disabled="filteredExams[index].finalScoreStatus !== 'PUBLISHED'"
              @click="goDetail(filteredExams[index].examId)"
            >
              {{ filteredExams[index].examName }}
            </button>
            <div v-if="filteredExams[index].examNo" class="link-cell__sub">
              编号：{{ filteredExams[index].examNo }}
            </div>
          </template>
          <template v-else-if="column.key === 'finalScoreStatus'">
            <UiTag :tone="finalScoreStatusTone(filteredExams[index].finalScoreStatus)" size="sm">
              {{ finalScoreStatusLabel(filteredExams[index].finalScoreStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'finalScore'">
            <span
              v-if="
                filteredExams[index].finalScoreStatus === 'PUBLISHED'
                  && filteredExams[index].finalScore != null
              "
              class="score-cell"
            >
              {{ filteredExams[index].finalScore.toFixed(2) }}
            </span>
            <span v-else class="muted">{{ unpublishedScoreText(filteredExams[index].finalScoreStatus) }}</span>
          </template>
          <template v-else-if="column.key === 'examStartTime'">
            {{ formatDateTime(filteredExams[index].examStartTime) }}
          </template>
          <template v-else-if="column.key === 'publishedTime'">
            {{ formatDateTime(filteredExams[index].publishedTime) }}
          </template>
          <template v-else-if="column.key === 'reviewWindowStatus'">
            <UiTag :tone="reviewWindowStatusTone(filteredExams[index])" size="sm">
              {{ reviewWindowStatusLabel(filteredExams[index]) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction
                :disabled="filteredExams[index].finalScoreStatus !== 'PUBLISHED'"
                @click="goDetail(filteredExams[index].examId)"
              >
                查看详情
              </UiTextAction>
              <UiTextAction
                :disabled="!canSubmitReview(filteredExams[index])"
                @click="goAppeal(filteredExams[index].examId)"
              >
                提交复核
              </UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </a-card>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FinalScoreStatusCode, StudentExamItemVO } from '@/apis/mark/student-exam'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  canSubmitReview,
  FINAL_SCORE_STATUS_CODES,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  listMyExams,
  STUDENT_REVIEW_WINDOW_STATUS_LABEL,
  STUDENT_REVIEW_WINDOW_STATUS_TONE,
} from '@/apis/mark/student-exam'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiErrorRetryPanel from '@/components/ui-guide/ui/UiErrorRetryPanel.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { assertUserFacing } from '@/utils/contract-guard'
import { showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentExamHistory' })

const router = useRouter()
const loading = ref(false)
// D-9 错误态：学生考试列表加载失败时 UiErrorRetryPanel 重试入口
const examsLoadError = ref<Error | null>(null)
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
  label: strictEnumLabel(FINAL_SCORE_STATUS_LABEL, value, '最终成绩状态'),
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

const columns = [
  { title: '考试', key: 'examName', dataIndex: 'examName', width: 260 },
  { title: '开始时间', key: 'examStartTime', dataIndex: 'examStartTime', width: 170 },
  { title: '成绩状态', key: 'finalScoreStatus', dataIndex: 'finalScoreStatus', width: 110 },
  {
    title: '得分',
    key: 'finalScore',
    dataIndex: 'finalScore',
    width: 100,
    align: 'right' as const,
  },
  { title: '发布时间', key: 'publishedTime', dataIndex: 'publishedTime', width: 170 },
  { title: '复核窗口', key: 'reviewWindowStatus', dataIndex: 'reviewWindowStatus', width: 120 },
  { title: '操作', key: 'actions', fixed: 'right' as const, width: 200 },
]

const filteredExams = computed<StudentExamItemVO[]>(() => {
  return exams.value.filter((item) => {
    if (historyFilterForm.statusFilter && item.finalScoreStatus !== historyFilterForm.statusFilter) {
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
  examsLoadError.value = null
  try {
    const loadedExams = await listMyExams()
    validatePublishedExamContracts(loadedExams)
    exams.value = loadedExams
  } catch (error) {
    examsLoadError.value = toUserError(error, '考试列表加载失败')
    showUserError(error, '历次考试加载失败')
  } finally {
    loading.value = false
  }
}

/** 校验学生考试列表的发布态合同，避免模板渲染阶段才暴露缺失字段。 */
function validatePublishedExamContracts(list: StudentExamItemVO[]): void {
  const dataError = '成绩数据异常，请刷新后重试'
  for (const item of list) {
    if (item.finalScoreStatus === 'PUBLISHED') {
      assertUserFacing(item.finalScore != null, dataError)
      assertUserFacing(Boolean(item.publishedTime), dataError)
    }
  }
}

function finalScoreStatusTone(status: FinalScoreStatusCode): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, status, '最终成绩状态')
}

function finalScoreStatusLabel(status: FinalScoreStatusCode): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, status, '最终成绩状态')
}

function reviewWindowStatusTone(item: StudentExamItemVO): BadgeTone {
  return strictEnumTone(STUDENT_REVIEW_WINDOW_STATUS_TONE, item.reviewWindowStatus, '复核窗口状态')
}

function reviewWindowStatusLabel(item: StudentExamItemVO): string {
  return strictEnumLabel(
    STUDENT_REVIEW_WINDOW_STATUS_LABEL,
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
.exam-history-page__table-card {
  :deep(.ant-card-body) {
    padding-top: 0;
  }
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
