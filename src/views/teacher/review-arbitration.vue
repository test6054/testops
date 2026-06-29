<template>
  <div class="arbitration-page">
    <div class="arbitration-page__toolbar">
      <UiTag :tone="pendingTotal > 0 ? 'red' : 'green'" size="sm">
        {{ pendingTotal > 0 ? `${pendingTotal} 条待处理` : '暂无待办' }}
      </UiTag>
      <UiButton
        variant="outline"
        size="sm"
        :loading="loading"
        @click="loadTasks"
      >
        <template #icon><ReloadOutlined /></template>
        刷新
      </UiButton>
    </div>

    <UiCard class="arbitration-page__list-card">
      <template #title>
        <ExclamationCircleOutlined />
        <span>客观题复核仲裁</span>
        <UiBadge :tone="reviewTasks.length > 0 ? 'red' : 'green'">
          {{ reviewTasks.length }}
        </UiBadge>
      </template>

      <UiDataTable
        pagination-mode="client"
        :columns="reviewColumns"
        :data-source="reviewTasks"
        :loading="loading"
        :page-size="20"
        :total="reviewTasks.length"
        row-key="reviewTaskId"
        size="middle"
        flat
        empty-kind="first-run"
        empty-description="无需仲裁的试卷，评分一致性良好"
        class="arbitration-table student-detail-table__data-table"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'paperDisplay'">
            <div class="arbitration-table__paper-cell">
              <a-typography-text strong :content="reviewTasks[index].paperDisplay.primaryText" />
              <span
                v-if="reviewTasks[index].paperDisplay.secondaryText"
                class="arbitration-table__hint"
              >
                {{ reviewTasks[index].paperDisplay.secondaryText }}
              </span>
            </div>
          </template>
          <template v-else-if="column.key === 'questionNo'">
            <UiTag tone="blue" size="sm">{{ reviewTasks[index].questionNo }}</UiTag>
          </template>
          <template v-else-if="column.key === 'fullScore'">
            {{ reviewTasks[index].fullScore }}
          </template>
          <template v-else-if="column.key === 'aiScore'">
            <template v-if="reviewTasks[index].aiScore != null">
              <strong>{{ reviewTasks[index].aiScore }}</strong>
              <UiTag
                v-if="getSuggestedRatio(reviewTasks[index]) !== null"
                :tone="getSuggestedRatioTone(reviewTasks[index])"
                size="sm"
                class="ai-score-ratio-tag"
              >
                {{ getSuggestedRatio(reviewTasks[index]) }}%
              </UiTag>
            </template>
            <span v-else class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'assignedTeacherUserId'">
            <span v-if="reviewTasks[index].assignedTeacherUserId">
              <UserOutlined class="mini-icon" />
              {{
                reviewTasks[index].assignedTeacherUserId === currentUserId
                  ? '我'
                  : reviewTasks[index].assignedTeacherUserId
              }}
            </span>
            <span v-else class="muted">未指派</span>
          </template>
          <template v-else-if="column.key === 'updateTime'">
            {{ formatDateTime(reviewTasks[index].updateTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="operations-cell" @click.stop>
              <UiTextAction @click="goReviewDetail(reviewTasks[index])">详情</UiTextAction>
              <UiTextAction tone="primary" @click="goReviewWorkspace(reviewTasks[index])">进入仲裁处理</UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
  </div>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type { ReviewTaskItemVO } from '@/apis/mark/exam-review-task'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import UserOutlined from '@ant-design/icons-vue/UserOutlined'
import { computed, onActivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  listReviewTasks,
  validateReviewTaskItemContract,
} from '@/apis/mark/exam-review-task'
import UiBadge from '@/components/ui-guide/ui/Badge.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { useUserStore } from '@/stores/modules/user'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readAllPages } from '@/utils/page-result'

defineOptions({ name: 'TeacherReviewArbitration' })

const router = useRouter()
const userStore = useUserStore()

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const currentUserId = computed(() => userStore.userInfo.userId || '')
const reviewTasks = ref<ReviewTaskItemVO[]>([])
const loading = ref(false)

const pendingTotal = computed(() => reviewTasks.value.length)

const reviewColumns: ColumnType<ReviewTaskItemVO>[] = [
  { title: '答卷', key: 'paperDisplay', width: 180 },
  { title: '题号', key: 'questionNo', width: 100 },
  { title: '满分', key: 'fullScore', width: 80 },
  { title: 'AI 评分', key: 'aiScore', width: 140 },
  { title: '指派教师', key: 'assignedTeacherUserId', width: 160 },
  { title: '更新时间', key: 'updateTime', width: 170 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

function getSuggestedRatio(record: ReviewTaskItemVO): number | null {
  const full = record.fullScore
  const sug = record.aiScore
  if (sug == null || full <= 0) return null
  return Math.round((sug / full) * 100)
}

function getSuggestedRatioTone(record: ReviewTaskItemVO): BadgeTone {
  const ratio = getSuggestedRatio(record)
  if (ratio == null) return 'gray'
  if (ratio < 60) return 'purple'
  if (ratio >= 80) return 'green'
  return 'blue'
}

async function loadQuestionArbitrationTasks(): Promise<void> {
  if (!selectedExamId.value) {
    reviewTasks.value = []
    return
  }
  const examId = selectedExamId.value
  try {
    const [pendingItems, inProgressItems] = await Promise.all([
      readAllPages(
        (pageNum) =>
          listReviewTasks({
            examId,
            reviewType: 'QUESTION_REVIEW_ARBITRATION',
            status: 'PENDING',
            pageNum,
            pageSize: 100,
          }),
        '题目复核仲裁任务加载失败',
      ),
      readAllPages(
        (pageNum) =>
          listReviewTasks({
            examId,
            reviewType: 'QUESTION_REVIEW_ARBITRATION',
            status: 'IN_PROGRESS',
            pageNum,
            pageSize: 100,
          }),
        '题目复核仲裁任务加载失败',
      ),
    ])
    const merged = new Map<string, ReviewTaskItemVO>()
    pendingItems.forEach((item) => {
      validateReviewTaskItemContract(item)
      merged.set(item.reviewTaskId, item)
    })
    inProgressItems.forEach((item) => {
      validateReviewTaskItemContract(item)
      if (item.assignedTeacherUserId === currentUserId.value) {
        merged.set(item.reviewTaskId, item)
      }
    })
    reviewTasks.value = Array.from(merged.values())
  } catch (error) {
    reviewTasks.value = []
    showUserError(error, '客观题复核仲裁任务加载失败')
  }
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    await loadQuestionArbitrationTasks()
  } catch (error) {
    showUserError(error, '客观题复核仲裁任务加载失败')
  } finally {
    loading.value = false
  }
}

function goReviewWorkspace(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceReviewWorkspace',
    params: { examId: selectedExamId.value, taskId: record.reviewTaskId },
    query: { source: 'arbitration' },
  })
}

function goReviewDetail(record: ReviewTaskItemVO): void {
  if (!selectedExamId.value) return
  void router.push({
    name: 'TeacherExamWorkspaceReviewTaskDetail',
    params: { examId: selectedExamId.value, taskId: record.reviewTaskId },
    query: { source: 'arbitration' },
  })
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadTasks()
  } else {
    reviewTasks.value = []
  }
}, { immediate: true })

onActivated(() => {
  if (selectedExamId.value) {
    void loadTasks()
    void refreshSnapshot()
  }
})
</script>

<style lang="scss" scoped>
.arbitration-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
}

.arbitration-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--dp-surface-soft, #f8fafc);
    font-weight: 600;
  }
}

.mini-icon {
  margin-right: 4px;
  color: var(--dp-text-muted, #64748b);
}

.ai-score-ratio-tag {
  margin-left: 6px;
}

.muted {
  color: var(--dp-text-muted, #94a3b8);
}
</style>
