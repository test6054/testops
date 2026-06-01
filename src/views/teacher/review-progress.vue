<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="progress-page__context">
        <div class="progress-page__context-left">
          <a-select
            :value="selectedExamId"
            class="progress-page__exam-select"
            placeholder="选择考试"
            :options="examOptions"
            :loading="examLoading"
            show-search
            option-filter-prop="label"
            allow-clear
            @change="onExamChange"
          />
          <UiTag v-if="selectedExamId" :tone="confirmedPercent >= 100 ? 'green' : 'blue'" size="sm">
            已确认 {{ confirmedPercent }}%
          </UiTag>
        </div>
        <div class="progress-page__context-right">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadAll"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </div>
      </div>
    </template>

    <!-- D-9 错误态：复核进度加载失败时提供重试 + 上报入口 -->
    <UiErrorRetryPanel
      v-if="selectedExamId && progressLoadError"
      :error="progressLoadError"
      title="复核进度加载失败"
      :helper="selectedExamLabel ? `当前考试：${selectedExamLabel}` : undefined"
      @retry="loadAll"
    />
    <UiEmpty
      v-else-if="!selectedExamId"
      description="请选择一场考试以查看复核进度"
      class="progress-page__empty"
    />

    <template v-else-if="progress">
      <a-row :gutter="16" class="overview-row">
        <a-col :xs="24" :md="8">
          <UiCard class="overview-card">
            <template #title>
              <DashboardOutlined />
              <span>整体批改进度</span>
            </template>
            <div class="overview-progress">
              <a-progress
                type="circle"
                :percent="confirmedPercent"
                :stroke-color="confirmedPercent >= 100 ? successColor : primaryColor"
                :width="160"
              />
              <div class="overview-meta">
                <div>
                  <span class="meta-label">已确认 / 应批阅：</span>
                  <a-typography-text strong>
                    {{ progress.confirmedQuestionGradeCount }} /
                    {{ progress.totalQuestionGradeCount }}
                  </a-typography-text>
                </div>
                <div><span class="meta-label">题目：</span>{{ progress.questionCount }} 道</div>
                <div><span class="meta-label">已扫描试卷：</span>{{ progress.paperCount }} 份</div>
                <div>
                  <span class="meta-label">可阅卷试卷：</span>
                  <a-typography-text strong>
                    {{ progress.gradablePaperCount }}
                  </a-typography-text>
                  <span class="meta-hint">（已绑定身份，完成率分母真源）</span>
                </div>
              </div>
            </div>
          </UiCard>
        </a-col>
        <a-col :xs="24" :md="16">
          <UiCard class="status-card">
            <template #title>
              <PieChartOutlined />
              <span>复核任务状态分布</span>
              <UiBadge tone="blue">{{ totalTaskCount }} 条任务</UiBadge>
            </template>
            <a-row :gutter="16">
              <a-col v-for="item in statusBreakdown" :key="item.code" :xs="12" :md="6">
                <div class="status-item">
                  <div class="status-label">
                    <UiTag :tone="item.tone" size="sm">{{ item.label }}</UiTag>
                  </div>
                  <div class="status-value">{{ item.count }}</div>
                  <div class="status-percent">
                    {{
                      totalTaskCount === 0 ? 0 : Math.round((item.count * 100) / totalTaskCount)
                    }}%
                  </div>
                </div>
              </a-col>
            </a-row>
            <a-row :gutter="16" class="aux-row">
              <a-col :xs="12" :md="8">
                <a-statistic
                  title="扫描异常待办"
                  :value="progress.scanAttentionCount"
                  suffix="条"
                  :value-style="{
                    color: progress.scanAttentionCount > 0 ? '#dc2626' : undefined,
                  }"
                />
              </a-col>
              <a-col :xs="12" :md="8">
                <a-statistic
                  title="处理中未闭合任务"
                  :value="progress.openProcessingTaskCount"
                  suffix="项"
                  :value-style="{
                    color: progress.openProcessingTaskCount > 0 ? '#ea580c' : undefined,
                  }"
                />
              </a-col>
            </a-row>
          </UiCard>
        </a-col>
      </a-row>

      <UiCard class="question-card">
        <template #title>
          <TableOutlined />
          <span>按题目维度的复核进度</span>
          <UiBadge tone="blue">{{ questionRows.length }} 道</UiBadge>
        </template>

        <UiEmpty v-if="!loading && questionRows.length === 0" description="暂无题目复核数据" />

        <UiDataTable
          v-else
          :columns="questionColumns"
          :data-source="questionRows"
          :loading="loading"
          :show-pagination="false"
          flat
          :total="questionRows.length"
          row-key="questionTemplateId"
          size="middle"
          class="question-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'questionNo'">
              <div class="question-cell">
                <UiTag tone="blue" size="sm">题{{ record.questionNo }}</UiTag>
                <span class="question-type">{{ record.questionType }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'progress'">
              <a-progress
                :percent="
                  record.totalTaskCount === 0
                    ? 0
                    : Math.round((record.approvedTaskCount * 100) / record.totalTaskCount)
                "
                size="small"
                :stroke-color="
                  record.totalTaskCount > 0 && record.approvedTaskCount >= record.totalTaskCount
                    ? '#16a34a'
                    : '#2563eb'
                "
              />
              <div class="progress-detail">
                {{ record.approvedTaskCount }} / {{ record.totalTaskCount }} 已通过
              </div>
            </template>
            <template v-else-if="column.key === 'pending'">
              <UiTag v-if="record.pendingTaskCount > 0" tone="orange" size="sm">
                {{ record.pendingTaskCount }}
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
            <template v-else-if="column.key === 'inProgress'">
              <UiTag v-if="record.inProgressTaskCount > 0" tone="blue" size="sm">
                {{ record.inProgressTaskCount }}
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
            <template v-else-if="column.key === 'rejected'">
              <UiTag v-if="record.rejectedTaskCount > 0" tone="red" size="sm">
                {{ record.rejectedTaskCount }}
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>
    <a-spin v-else :spinning="loading" tip="正在加载复核进度...">
      <UiEmpty description="正在加载复核进度" class="progress-page__empty" />
    </a-spin>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  MarkingProgressVO,
  ReviewQuestionProgressItemVO,
  ReviewTaskStatusCode,
} from '@/apis/mark/exam'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import PieChartOutlined from '@ant-design/icons-vue/PieChartOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import { computed, onMounted, ref, watch } from 'vue'
import {
  getMarkingProgress,
  REVIEW_TASK_STATUS_LABEL as STATUS_LABEL,
  REVIEW_TASK_STATUS_TONE as STATUS_TONE,
} from '@/apis/mark/exam'
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
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherReviewProgress' })

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  selectedExamLabel,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const successColor = 'var(--ant-color-success, #16a34a)'
const primaryColor = 'var(--ant-color-primary, #2563eb)'

const progress = ref<MarkingProgressVO | null>(null)
const loading = ref(false)
// D-9 错误态：复核进度加载失败时 UiErrorRetryPanel 重试 + 上报
const progressLoadError = ref<Error | null>(null)

const confirmedPercent = computed(() => {
  if (!progress.value) return 0
  const total = progress.value.totalQuestionGradeCount
  const confirmed = progress.value.confirmedQuestionGradeCount
  if (total <= 0) return 0
  return Math.min(100, Math.round((confirmed * 100) / total))
})

const totalTaskCount = computed(
  () =>
    progress.value?.reviewTaskStatusSummaryList.reduce((sum, item) => sum + item.taskCount, 0) ?? 0,
)

const statusBreakdown = computed(() => {
  const taskCountMap = new Map<ReviewTaskStatusCode, number>()
  progress.value?.reviewTaskStatusSummaryList.forEach((item) => {
    taskCountMap.set(item.statusCode, item.taskCount)
  })
  // 显式列出全部枚举值，避免 Object.keys + as 推断。
  const codes: ReviewTaskStatusCode[] = ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED']
  return codes.map((code) => ({
    code,
    label: strictEnumLabel(STATUS_LABEL, code, '复核任务状态'),
    tone: strictEnumTone(STATUS_TONE, code, '复核任务状态'),
    count: taskCountMap.get(code) ?? 0,
  }))
})

const questionRows = computed<ReviewQuestionProgressItemVO[]>(
  () => progress.value?.reviewQuestionProgressList ?? [],
)

const questionColumns: ColumnType<ReviewQuestionProgressItemVO>[] = [
  { title: '题目', dataIndex: 'questionNo', key: 'questionNo', width: 180 },
  { title: '复核进度', dataIndex: 'approvedTaskCount', key: 'progress', width: 240 },
  { title: '待领取', dataIndex: 'pendingTaskCount', key: 'pending', width: 100 },
  { title: '复核中', dataIndex: 'inProgressTaskCount', key: 'inProgress', width: 100 },
  { title: '已驳回', dataIndex: 'rejectedTaskCount', key: 'rejected', width: 100 },
]

async function loadAll(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  progressLoadError.value = null
  try {
    progress.value = await getMarkingProgress(selectedExamId.value)
  } catch (error) {
    progressLoadError.value
      = error instanceof Error ? error : new Error(getUserErrorMessage(error, '复核进度加载失败'))
    showUserError(error, '复核进度加载失败')
  } finally {
    loading.value = false
  }
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadAll()
  } else {
    progress.value = null
  }
})

onMounted(async () => {
  await initExamSelector()
  if (selectedExamId.value) {
    await loadAll()
  }
})
</script>

<style lang="scss" scoped>
.progress-page {
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

  &__exam-select {
    width: 280px;
  }

  &__empty {
    padding: 60px 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.overview-row {
  row-gap: 16px;
}

.overview-card,
.status-card,
.question-card {
  height: 100%;
}

.overview-progress {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 0;
}

.overview-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: var(--ant-color-text);
}

.meta-label {
  color: var(--ant-color-text-secondary);
  margin-right: 4px;
}

.meta-hint {
  color: var(--ant-color-text-secondary);
  font-size: 12px;
  margin-left: 6px;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 16px;
  border-radius: var(--dp-radius-md, 6px);
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
}

.status-label {
  font-size: 12px;
}

.status-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.status-percent {
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.aux-row {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ant-color-border-secondary);
}

.question-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
}

.question-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.question-type {
  color: var(--ant-color-text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.progress-detail {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.empty-block {
  padding: 60px 0;
}
</style>
