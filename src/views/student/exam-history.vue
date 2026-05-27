<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="exam-history-page__context">
        <div class="exam-history-page__context-left">
          <UiTag tone="blue" size="sm">{{ exams.length }} 场</UiTag>
          <UiTag v-if="publishedCount > 0" tone="green" size="sm">
            已发布 {{ publishedCount }}
          </UiTag>
        </div>
        <div class="exam-history-page__context-right">
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadExams">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <!-- 筛选 + 列表 -->
    <UiCard class="exam-history-page__list-card">
      <template #title>
        <FileSearchOutlined />
        <span>考试列表</span>
        <UiBadge tone="blue">{{ filteredExams.length }} 条</UiBadge>
      </template>
      <template #extra>
        <a-space wrap>
          <a-input
            v-model:value="keyword"
            placeholder="按考试名称或编号筛选"
            allow-clear
            style="width: 240px"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
          <a-select
            v-model:value="statusFilter"
            placeholder="成绩状态"
            allow-clear
            style="width: 160px"
            :options="statusOptions"
          />
        </a-space>
      </template>

      <!-- D-9 错误态：考试列表加载失败时提供重试入口（学生侧无上报入口） -->
      <UiErrorRetryPanel
        v-if="examsLoadError"
        :error="examsLoadError"
        title="考试列表加载失败"
        :show-report="false"
        compact
        @retry="loadExams"
      />
      <UiEmpty
        v-else-if="!loading && filteredExams.length === 0"
        description="没有符合条件的考试"
      />

      <UiDataTable
        v-else
        :columns="columns"
        :data-source="filteredExams"
        :loading="loading"
        :page-size="10"
        :total="filteredExams.length"
        flat
        row-key="examId"
        size="middle"
        class="history-table"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'examName'">
            <button type="button" class="link-cell" @click="goDetail(filteredExams[index].examId)">
              {{ filteredExams[index].examName }}
            </button>
            <div v-if="filteredExams[index].examNo" class="link-cell__sub">
              编号：{{ filteredExams[index].examNo }}
            </div>
          </template>
          <template v-else-if="column.key === 'finalScoreStatus'">
            <UiTag
              :tone="finalScoreStatusTone(filteredExams[index].finalScoreStatus)"
              size="sm"
            >
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
            <span v-else class="muted">--</span>
          </template>
          <template v-else-if="column.key === 'examStartTime'">
            {{ formatDateTime(filteredExams[index].examStartTime) }}
          </template>
          <template v-else-if="column.key === 'publishedTime'">
            {{ formatDateTime(filteredExams[index].publishedTime) }}
          </template>
          <template v-else-if="column.key === 'reviewWindowStatus'">
            <UiTag
              v-if="filteredExams[index].reviewWindowStatus === 'ACTIVE'"
              tone="orange"
              size="sm"
            >
              开放中
            </UiTag>
            <UiTag
              v-else-if="filteredExams[index].reviewWindowStatus === 'CLOSED'"
              tone="gray"
              size="sm"
            >
              已关闭
            </UiTag>
            <span v-else class="muted">未开放</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="filteredExams[index].finalScoreStatus !== 'PUBLISHED'"
                @click="goDetail(filteredExams[index].examId)"
              >
                查看详情
              </UiButton>
              <UiButton
                size="sm"
                variant="ghost"
                :disabled="!canSubmitReview(filteredExams[index])"
                @click="goAppeal(filteredExams[index].examId)"
              >
                提交复核
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { FinalScoreStatusCode, StudentExamItemVO } from '@/apis/mark/student-exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  canSubmitReview,
  FINAL_SCORE_STATUS_LABEL,
  FINAL_SCORE_STATUS_TONE,
  listMyExams,
} from '@/apis/mark/student-exam'
import {
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'StudentExamHistory' })

const router = useRouter()
const loading = ref(false)
// D-9 错误态：学生考试列表加载失败时 UiErrorRetryPanel 重试入口
const examsLoadError = ref<unknown>(null)
const exams = ref<StudentExamItemVO[]>([])
const keyword = ref('')
const statusFilter = ref<FinalScoreStatusCode | undefined>(undefined)

const statusOptions: Array<{ value: FinalScoreStatusCode, label: string }> = [
  { value: 'PENDING', label: '待计算' },
  { value: 'CALCULATED', label: '已计算' },
  { value: 'CONFIRMED', label: '已确认' },
  { value: 'CORRECTED', label: '已更正' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'WITHDRAWN', label: '已撤回' },
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
    if (statusFilter.value && item.finalScoreStatus !== statusFilter.value) {
      return false
    }
    if (keyword.value.trim()) {
      const kw = keyword.value.trim().toLowerCase()
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
    exams.value = await listMyExams()
  } catch (error) {
    examsLoadError.value = error
    const msg = error instanceof Error ? error.message : '加载考试失败'
    message.error(msg)
  } finally {
    loading.value = false
  }
}


function finalScoreStatusTone(status: FinalScoreStatusCode): BadgeTone {
  return strictEnumTone(FINAL_SCORE_STATUS_TONE, status, '最终成绩状态')
}

function finalScoreStatusLabel(status: FinalScoreStatusCode): string {
  return strictEnumLabel(FINAL_SCORE_STATUS_LABEL, status, '最终成绩状态')
}

function goDetail(examId: string) {
  router.push({ name: 'StudentScoreDetail', params: { examId } })
}

function goAppeal(examId: string) {
  router.push({ name: 'StudentAppeal', query: { examId } })
}

onMounted(loadExams)
</script>

<style lang="scss" scoped>
.exam-history-page {
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    flex-shrink: 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
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
  font-weight: 700;
  color: var(--ant-color-success);
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--ant-color-text-tertiary);
}
</style>
