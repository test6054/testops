<template>
  <GiPageLayout>
    <div class="review-assignment-page">
      <!-- Hero -->
      <UiPageCard :show-header="false" class="review-assignment-page__hero-card">
        <a-spin :spinning="loading" class="hero-spin">
          <div class="review-assignment-page__hero">
            <div class="review-assignment-page__hero-main">
              <div class="review-assignment-page__title-row">
                <h1 class="review-assignment-page__title">复核任务池</h1>
                <UiTag tone="purple" size="md">匿名复核</UiTag>
                <UiTag tone="blue" size="md">{{ tasks.length }} 条任务</UiTag>
              </div>
            </div>
            <div class="review-assignment-page__hero-actions">
              <a-select
                :value="selectedExamId"
                style="width: 320px"
                placeholder="选择考试"
                :options="examOptions"
                :loading="examLoading"
                show-search
                option-filter-prop="label"
                allow-clear
                @change="onExamChange"
              />
              <UiButton
                variant="outline"
                size="md"
                :disabled="!selectedExamId"
                :loading="loading"
                @click="loadTasks"
              >
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </UiButton>
            </div>
          </div>

          <div v-if="selectedExamId" class="review-assignment-page__summary-grid">
            <div
              v-for="item in summaryTags"
              :key="item.code"
              class="workspace-summary"
              :class="{ 'workspace-summary--accent': item.code === 'PENDING' }"
            >
              <span class="workspace-summary__label">{{ item.label }}</span>
              <strong class="workspace-summary__value">{{ item.count }}</strong>
              <span class="workspace-summary__desc">条任务</span>
            </div>
          </div>
        </a-spin>
      </UiPageCard>

      <UiEmpty
        v-if="!selectedExamId"
        description="请选择一场考试以查看复核任务"
        class="empty-block"
      />

      <template v-else>
        <UiCard class="review-assignment-page__filter-card">
          <template #title>
            <SearchOutlined />
            <span>筛选条件</span>
          </template>

          <a-form layout="inline" :model="filterForm" @submit.prevent="loadTasks">
            <a-form-item label="状态">
              <a-select
                v-model:value="filterForm.status"
                style="width: 160px"
                placeholder="全部状态"
                allow-clear
                :options="statusOptions"
                @change="loadTasks"
              />
            </a-form-item>
            <a-form-item label="题目模板ID">
              <a-input
                v-model:value="filterForm.questionTemplateId"
                placeholder="精确匹配"
                allow-clear
                style="width: 220px"
                @press-enter="loadTasks"
              />
            </a-form-item>
            <a-form-item>
              <a-space>
                <UiButton size="sm" :loading="loading" @click="loadTasks">查询</UiButton>
                <UiButton size="sm" variant="outline" @click="resetFilter">重置</UiButton>
              </a-space>
            </a-form-item>
          </a-form>
        </UiCard>

        <UiCard class="review-assignment-page__table-card">
          <template #title>
            <TableOutlined />
            <span>任务列表</span>
            <UiBadge tone="blue">{{ tasks.length }} 条</UiBadge>
          </template>

          <UiEmpty v-if="!loading && tasks.length === 0" description="暂无符合条件的任务" />

          <a-table
            v-else
            :columns="columns"
            :data-source="tasks"
            :loading="loading"
            :pagination="{ pageSize: 20, showTotal: (t: number) => `共 ${t} 条` }"
            row-key="reviewTaskId"
            size="middle"
            class="review-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'anonymousNo'">
                <a-typography-text strong :content="record.anonymousNo || '-'" />
              </template>
              <template v-else-if="column.key === 'questionNo'">
                <UiTag tone="blue" size="sm">{{ record.questionNo || '-' }}</UiTag>
              </template>
              <template v-else-if="column.key === 'fullScore'">
                {{ record.fullScore ?? '-' }}
              </template>
              <template v-else-if="column.key === 'suggestedScore'">
                <span v-if="record.suggestedScore !== undefined && record.suggestedScore !== null">
                  {{ record.suggestedScore }}
                </span>
                <span v-else class="muted">-</span>
              </template>
              <template v-else-if="column.key === 'status'">
                <UiTag :tone="STATUS_TONE[record.status as ReviewTaskStatusCode] || 'gray'" size="sm">
                  {{ STATUS_LABEL[record.status as ReviewTaskStatusCode] || record.status || '-' }}
                </UiTag>
              </template>
              <template v-else-if="column.key === 'assignedTeacherUserId'">
                <span v-if="record.assignedTeacherUserId">
                  <UserOutlined class="mini-icon" />
                  {{ record.assignedTeacherUserId === currentUserId ? '我' : record.assignedTeacherUserId }}
                </span>
                <span v-else class="muted">未指派</span>
              </template>
              <template v-else-if="column.key === 'updateTime'">
                {{ formatTime(record.updateTime) }}
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space>
                  <a-popconfirm
                    v-if="record.status === 'PENDING'"
                    title="确认领取该任务？领取后将由你负责该题目的批改。"
                    ok-text="领取"
                    cancel-text="取消"
                    :disabled="claiming"
                    @confirm="handleClaim(record)"
                  >
                    <UiButton
                      size="sm"
                      :loading="claiming && claimingTaskId === record.reviewTaskId"
                    >
                      领取
                    </UiButton>
                  </a-popconfirm>
                  <UiButton
                    v-if="record.status === 'IN_PROGRESS'"
                    size="sm"
                    @click="goWorkspace(record)"
                  >
                    进入批阅
                  </UiButton>
                  <UiButton size="sm" variant="ghost" @click="goDetail(record)">详情</UiButton>
                </a-space>
              </template>
            </template>
          </a-table>
        </UiCard>
      </template>
    </div>
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ReviewTaskItemVO } from '@/apis/mark/exam'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { claimReviewTask, listReviewTasks } from '@/apis/mark/exam'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiPageCard, UiTag } from '@/components/ui-guide/ui'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { useUserStore } from '@/stores/modules/user'

defineOptions({ name: 'TeacherReviewAssignment' })

/** ReviewTaskStatus 与后端 ReviewTaskStatus 枚举对齐 */
type ReviewTaskStatusCode = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'
type ToneCode = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

const STATUS_LABEL: Record<ReviewTaskStatusCode, string> = {
  PENDING: '待复核',
  IN_PROGRESS: '复核中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

const STATUS_TONE: Record<ReviewTaskStatusCode, ToneCode> = {
  PENDING: 'orange',
  IN_PROGRESS: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
}

const router = useRouter()
const userStore = useUserStore()

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const currentUserId = computed(() => userStore.userInfo.userId || '')

// ─── 列表筛选 + 数据 ─────────────────────────────
const filterForm = reactive<{
  status?: ReviewTaskStatusCode
  questionTemplateId?: string
}>({
  status: undefined,
  questionTemplateId: '',
})

const statusOptions = (Object.keys(STATUS_LABEL) as ReviewTaskStatusCode[]).map(code => ({
  label: STATUS_LABEL[code],
  value: code,
}))

const tasks = ref<ReviewTaskItemVO[]>([])
const loading = ref(false)

const summaryTags = computed(() => {
  const counter: Record<ReviewTaskStatusCode, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    APPROVED: 0,
    REJECTED: 0,
  }
  tasks.value.forEach((task) => {
    const code = task.status as ReviewTaskStatusCode
    if (code in counter) counter[code]++
  })
  return (Object.keys(counter) as ReviewTaskStatusCode[]).map(code => ({
    code,
    label: STATUS_LABEL[code],
    count: counter[code],
  }))
})

const columns: ColumnType<ReviewTaskItemVO>[] = [
  { title: '匿名号', key: 'anonymousNo', width: 140 },
  { title: '题号', key: 'questionNo', width: 100 },
  { title: '满分', key: 'fullScore', width: 80 },
  { title: 'AI 建议分', key: 'suggestedScore', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '指派教师', key: 'assignedTeacherUserId', width: 160 },
  { title: '更新时间', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    tasks.value = await listReviewTasks({
      examId: selectedExamId.value,
      status: filterForm.status,
      questionTemplateId: filterForm.questionTemplateId?.trim() || undefined,
    })
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : '复核任务加载失败'
    message.error(errMsg)
  }
  finally {
    loading.value = false
  }
}

function resetFilter(): void {
  filterForm.status = undefined
  filterForm.questionTemplateId = ''
  void loadTasks()
}

// ─── 领取任务 ─────────────────────────────
const claiming = ref(false)
const claimingTaskId = ref<string | null>(null)

async function handleClaim(record: ReviewTaskItemVO): Promise<void> {
  if (!selectedExamId.value) return
  claiming.value = true
  claimingTaskId.value = record.reviewTaskId
  try {
    await claimReviewTask({
      examId: selectedExamId.value,
      reviewTaskId: record.reviewTaskId,
    })
    message.success('任务领取成功，已进入复核中')
    await loadTasks()
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : '任务领取失败'
    message.error(errMsg)
  }
  finally {
    claiming.value = false
    claimingTaskId.value = null
  }
}

function goWorkspace(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherReviewWorkspace',
    query: { examId: selectedExamId.value, taskId: record.reviewTaskId },
  })
}

function goDetail(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherReviewTaskDetail',
    params: { taskId: record.reviewTaskId },
    query: { examId: selectedExamId.value },
  })
}

// ─── 初始化 ─────────────────────────────────────
watch(selectedExamId, (value) => {
  if (value) {
    void loadTasks()
  }
  else {
    tasks.value = []
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadTasks()
  }
})
</script>

<style lang="scss" scoped>
.review-assignment-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.hero-spin {
  width: 100%;
}

.review-assignment-page__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;

  &-main {
    flex: 1;
    min-width: 0;
  }

  &-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }
}

.review-assignment-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.review-assignment-page__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
}


.review-assignment-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ant-color-border-secondary);
}

.workspace-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 8px);

  &--accent {
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.06) 0%, rgba(22, 119, 255, 0.02) 100%);
    border-color: rgba(22, 119, 255, 0.18);
  }

  &__label {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    font-size: 22px;
    font-weight: 700;
    color: var(--ant-color-text);
  }

  &__desc {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
}

.review-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.mini-icon {
  margin-right: 4px;
  color: var(--ant-color-text-tertiary);
}

.empty-block {
  padding: 60px 0;
}
</style>
