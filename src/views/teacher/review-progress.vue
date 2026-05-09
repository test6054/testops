<template>
  <GiPageLayout>
    <div class="progress-page">
      <PageHeader title="复核进度">
        <template #tags>
          <UiTag v-if="selectedExamId" :tone="confirmedPercent >= 100 ? 'green' : 'blue'" size="md">
            已确认 {{ confirmedPercent }}%
          </UiTag>
        </template>
        <template #actions>
          <a-select
            :value="selectedExamId"
            style="width: 280px"
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
            size="sm"
            :disabled="!selectedExamId"
            :loading="loading"
            @click="loadAll"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
        </template>
      </PageHeader>

      <UiEmpty
        v-if="!selectedExamId"
        description="请选择一场考试以查看复核进度"
        class="empty-block"
      />

      <template v-else>
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
                  :stroke-color="confirmedPercent >= 100 ? '#16a34a' : '#2563eb'"
                  :width="160"
                />
                <div class="overview-meta">
                  <div>
                    <span class="meta-label">已确认 / 总数：</span>
                    <a-typography-text strong>
                      {{ progress?.confirmedQuestionGradeCount ?? 0 }} /
                      {{ progress?.totalQuestionGradeCount ?? 0 }}
                    </a-typography-text>
                  </div>
                  <div>
                    <span class="meta-label">题目模板：</span>{{ progress?.questionCount ?? 0 }} 道
                  </div>
                  <div>
                    <span class="meta-label">已扫描试卷：</span>{{ progress?.paperCount ?? 0 }} 份
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
                    :value="progress?.scanAttentionCount ?? 0"
                    suffix="条"
                    :value-style="{
                      color: (progress?.scanAttentionCount ?? 0) > 0 ? '#dc2626' : undefined,
                    }"
                  />
                </a-col>
                <a-col :xs="12" :md="8">
                  <a-statistic
                    title="处理中未闭合任务"
                    :value="progress?.openProcessingTaskCount ?? 0"
                    suffix="项"
                    :value-style="{
                      color: (progress?.openProcessingTaskCount ?? 0) > 0 ? '#ea580c' : undefined,
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

          <a-table
            v-else
            :columns="questionColumns"
            :data-source="questionRows"
            :loading="loading"
            :pagination="false"
            row-key="questionTemplateId"
            size="middle"
            class="question-table"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'questionNo'">
                <UiTag tone="blue" size="sm">{{ record.questionNo || '-' }}</UiTag>
              </template>
              <template v-else-if="column.key === 'progress'">
                <a-progress
                  :percent="
                    record.total === 0 ? 0 : Math.round((record.approved * 100) / record.total)
                  "
                  size="small"
                  :stroke-color="
                    record.total > 0 && record.approved >= record.total ? '#16a34a' : '#2563eb'
                  "
                />
                <div class="progress-detail">{{ record.approved }} / {{ record.total }} 已通过</div>
              </template>
              <template v-else-if="column.key === 'pending'">
                <UiTag v-if="record.pending > 0" tone="orange" size="sm">{{
                  record.pending
                }}</UiTag>
                <span v-else class="muted">0</span>
              </template>
              <template v-else-if="column.key === 'inProgress'">
                <UiTag v-if="record.inProgress > 0" tone="blue" size="sm">{{
                  record.inProgress
                }}</UiTag>
                <span v-else class="muted">0</span>
              </template>
              <template v-else-if="column.key === 'rejected'">
                <UiTag v-if="record.rejected > 0" tone="red" size="sm">{{ record.rejected }}</UiTag>
                <span v-else class="muted">0</span>
              </template>
              <template v-else-if="column.key === 'questionTemplateId'">
                <a-typography-text :content="record.questionTemplateId" copyable />
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
import type { MarkingProgressVO, ReviewTaskItemVO } from '@/apis/mark/exam'
import { getMarkingProgress, listReviewTasks } from '@/apis/mark/exam'
import DashboardOutlined from '@ant-design/icons-vue/DashboardOutlined'
import PieChartOutlined from '@ant-design/icons-vue/PieChartOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import TableOutlined from '@ant-design/icons-vue/TableOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiTag } from '@/components/ui-guide/ui'
import { useMarkExamSelector } from '@/composables/useMarkExamSelector'

defineOptions({ name: 'TeacherReviewProgress' })

type ReviewTaskStatusCode = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'
type ToneCode = 'gray' | 'blue' | 'green' | 'orange' | 'red' | 'purple'

const STATUS_LABEL: Record<ReviewTaskStatusCode, string> = {
  PENDING: '待领取',
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

const {
  examOptions,
  loading: examLoading,
  selectedExamId,
  onExamChange,
  init: initExamSelector,
} = useMarkExamSelector()

const progress = ref<MarkingProgressVO | null>(null)
const tasks = ref<ReviewTaskItemVO[]>([])
const loading = ref(false)

/** 题目维度聚合行 */
interface QuestionRow {
  questionTemplateId: string
  questionNo: string
  total: number
  pending: number
  inProgress: number
  approved: number
  rejected: number
}

const confirmedPercent = computed(() => {
  const total = progress.value?.totalQuestionGradeCount ?? 0
  const confirmed = progress.value?.confirmedQuestionGradeCount ?? 0
  if (total <= 0) return 0
  return Math.min(100, Math.round((confirmed * 100) / total))
})

const totalTaskCount = computed(() => tasks.value.length)

const statusBreakdown = computed(() => {
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
  return (Object.keys(counter) as ReviewTaskStatusCode[]).map((code) => ({
    code,
    label: STATUS_LABEL[code],
    tone: STATUS_TONE[code],
    count: counter[code],
  }))
})

const questionRows = computed<QuestionRow[]>(() => {
  const map = new Map<string, QuestionRow>()
  tasks.value.forEach((task) => {
    const id = task.questionTemplateId || '__unknown__'
    if (!map.has(id)) {
      map.set(id, {
        questionTemplateId: id,
        questionNo: task.questionNo || '-',
        total: 0,
        pending: 0,
        inProgress: 0,
        approved: 0,
        rejected: 0,
      })
    }
    const row = map.get(id)!
    row.total++
    switch (task.status as ReviewTaskStatusCode) {
      case 'PENDING':
        row.pending++
        break
      case 'IN_PROGRESS':
        row.inProgress++
        break
      case 'APPROVED':
        row.approved++
        break
      case 'REJECTED':
        row.rejected++
        break
    }
  })
  // 按题号排序（数字优先）
  return Array.from(map.values()).sort((a, b) => {
    const na = Number.parseInt(a.questionNo, 10)
    const nb = Number.parseInt(b.questionNo, 10)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return a.questionNo.localeCompare(b.questionNo)
  })
})

const questionColumns: ColumnType<QuestionRow>[] = [
  { title: '题号', key: 'questionNo', width: 100 },
  { title: '题目模板ID', key: 'questionTemplateId', ellipsis: true, width: 240 },
  { title: '复核进度', key: 'progress', width: 240 },
  { title: '待领取', key: 'pending', width: 100 },
  { title: '复核中', key: 'inProgress', width: 100 },
  { title: '已驳回', key: 'rejected', width: 100 },
]

async function loadAll(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const [progressData, taskList] = await Promise.all([
      getMarkingProgress(selectedExamId.value),
      listReviewTasks({ examId: selectedExamId.value }),
    ])
    progress.value = progressData
    tasks.value = taskList
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '复核进度加载失败'
    message.error(errMsg)
  } finally {
    loading.value = false
  }
}

watch(selectedExamId, (value) => {
  if (value) {
    void loadAll()
  } else {
    progress.value = null
    tasks.value = []
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
