<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench">
        <template #status>
          <UiTag tone="blue" size="sm"> 待复核 {{ pagination.total }} 条 </UiTag>
          <UiTag v-if="selectedRowKeys.length > 0" tone="orange" size="sm">
            已选 {{ selectedRowKeys.length }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" @click="goSingleReview"> 单题复核 </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="rows.length === 0"
            @click="applyAiScores"
          >
            填入建议分
          </UiButton>
          <UiButton
            size="sm"
            :disabled="selectedRowKeys.length === 0"
            :loading="submitting"
            @click="openConfirm"
          >
            批量确认选中
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand variant="tiles" compact :metrics="batchSignalMetrics" />
    </template>

    <UiEmpty v-if="!selectedExamId" description="缺少考试上下文，请从考试列表进入" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard flush>
        <UiEmpty
          v-if="!loading && rows.length === 0"
          description="当前暂无待批量确认的复核任务（硬判/AI 建议确认后会出现在此）"
          class="batch-confirm__empty"
        />
        <UiDataTable
          pagination-mode="server"
          row-key="gradeResultId"
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :columns="columns"
          :data-source="rows"
          :loading="loading"
          :total="pagination.total"
          :row-selection="rowSelection"
          flat
          size="middle"
          @page-change="onPageChange"
        >
          <template
            #bodyCell="{
              column,
              record,
            }: {
              column: ColumnType<ReviewTaskItemResponse>
              record: ReviewTaskItemResponse
            }"
          >
            <template v-if="column.key === 'paper'">
              {{ record.paperDisplay.primaryText }}
            </template>
            <template v-else-if="column.key === 'question'">
              <UiTag tone="blue" size="sm">题 {{ record.questionNo }}</UiTag>
            </template>
            <template v-else-if="column.key === 'gradeSource'">
              <UiTag :tone="gradeSourceTone(record.gradeSource)" size="sm">
                {{ gradeSourceLabel(record.gradeSource) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'aiScore'">
              <span v-if="record.aiScore != null">{{ record.aiScore }}</span>
              <UiTag v-else tone="gray" size="sm">未派生</UiTag>
            </template>
            <template v-else-if="column.key === 'teacherReviewScore'">
              <a-input-number
                :value="scoreDraftMap[record.gradeResultId]"
                :min="0"
                :max="record.fullScore"
                :step="0.5"
                size="small"
                style="width: 88px"
                @update:value="(v) => updateScore(record.gradeResultId, v)"
              />
              <span class="batch-confirm__full-score">/ {{ record.fullScore }}</span>
            </template>
          </template>
        </UiDataTable>
        <a-list
          v-if="batchFailures.length"
          size="small"
          :data-source="batchFailures"
          class="batch-confirm__failures"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title> 成绩记录 {{ item.gradeResultId }} </template>
                <template #description>
                  <UiTag tone="red" size="sm">{{ item.code }}</UiTag>
                  {{ item.message }}
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </WorkbenchSurfaceCard>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamGradeBatchConfirmFailureItem,
  ExamGradeBatchConfirmResponse,
} from '@/apis/mark/exam-grade'
import type { GradeSourceCode, ReviewTaskItemResponse } from '@/apis/mark/exam-review-task'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { batchConfirmQuestionGrades } from '@/apis/mark/exam-grade'
import {
  GRADE_SOURCE_TONE,
  GradeSourceDescription,
  listReviewTasks,
  ReviewTaskStatusCode,
} from '@/apis/mark/exam-review-task'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherReviewBatchConfirm' })

const router = useRouter()
const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const { refreshing: workbenchRefreshing } = useMarkWorkbenchContext()

const loading = ref(false)
const submitting = ref(false)
const batchFailures = ref<ExamGradeBatchConfirmFailureItem[]>([])
const rows = ref<ReviewTaskItemResponse[]>([])
const scoreDraftMap = reactive<Record<string, number>>({})
const selectedRowKeys = ref<string[]>([])

const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const batchSignalMetrics = computed((): SignalMetric[] => [
  {
    key: 'pending',
    label: '待复核',
    value: pagination.total,
    unit: '条',
    tone: pagination.total > 0 ? 'orange' : 'green',
  },
  {
    key: 'selected',
    label: '已选',
    value: selectedRowKeys.value.length,
    unit: '条',
    tone: selectedRowKeys.value.length > 0 ? 'blue' : 'gray',
  },
])

const columns: ColumnType<ReviewTaskItemResponse>[] = [
  { title: '答卷', key: 'paper', width: 220, ellipsis: true, fixed: 'left' },
  { title: '题号', key: 'question', width: 100 },
  { title: '来源', key: 'gradeSource', width: 110 },
  { title: '系统建议分', key: 'aiScore', width: 100, align: 'right' },
  { title: '确认得分', key: 'teacherReviewScore', width: 140 },
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String)
  },
}))

function gradeSourceLabel(source: GradeSourceCode): string {
  return strictEnumLabel(GradeSourceDescription, source, '成绩来源')
}

function gradeSourceTone(source: GradeSourceCode): BadgeTone {
  return GRADE_SOURCE_TONE[source]
}

function initScoreDraft(records: ReviewTaskItemResponse[]): void {
  for (const record of records) {
    if (scoreDraftMap[record.gradeResultId] == null && record.aiScore != null) {
      scoreDraftMap[record.gradeResultId] = record.aiScore
    }
  }
}

function updateScore(gradeResultId: string, value: number | string | null): void {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    delete scoreDraftMap[gradeResultId]
    return
  }
  scoreDraftMap[gradeResultId] = value
}

function applyAiScores(): void {
  let filled = 0
  let skipped = 0
  for (const record of rows.value) {
    if (record.aiScore != null) {
      scoreDraftMap[record.gradeResultId] = record.aiScore
      filled += 1
    } else {
      skipped += 1
    }
  }
  if (filled === 0) {
    message.warning('当前页没有可填入的系统建议分（硬判失败或 AI 未出分须人工给分）')
    return
  }
  message.success(
    skipped > 0
      ? `已用系统建议分填充 ${filled} 条，${skipped} 条无建议分需人工填写`
      : `已用系统建议分填充当前页 ${filled} 条（含客观题硬判与 AI 建议）`,
  )
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  try {
    const result = await listReviewTasks({
      examId: selectedExamId.value,
      status: ReviewTaskStatusCode.PENDING,
      excludeArbitration: true,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    const records = result.list
    rows.value = records
    pagination.total = result.total
    initScoreDraft(records)
    selectedRowKeys.value = selectedRowKeys.value.filter((id) =>
      records.some((row) => row.gradeResultId === id),
    )
  } catch (error) {
    rows.value = []
    pagination.total = 0
    showUserError(error, '待复核任务加载失败')
  } finally {
    loading.value = false
  }
}

function onPageChange(page: { current: number, pageSize: number }): void {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  void loadTasks()
}

function goSingleReview(): void {
  if (!selectedExamId.value) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceMarkingReview',
    params: { examId: selectedExamId.value },
  })
}

function openConfirm(): void {
  if (selectedRowKeys.value.length === 0) return
  const missingScore = selectedRowKeys.value.some((id) => scoreDraftMap[id] == null)
  if (missingScore) {
    message.warning('请为每条选中记录填写确认得分')
    return
  }
  void confirmAsync({
    title: '批量确认教师复核分',
    content: `将把 ${selectedRowKeys.value.length} 条题目写入教师复核分（CONFIRMED）。客观题硬判与 AI 建议仅作线索，确认后才进入最终成绩汇总。`,
    okText: '确认提交',
    onOk: submitBatch,
  })
}

async function submitBatch(): Promise<void> {
  if (!selectedExamId.value || selectedRowKeys.value.length === 0) return
  submitting.value = true
  try {
    const items = selectedRowKeys.value.map((gradeResultId) => ({
      gradeResultId,
      teacherReviewScore: scoreDraftMap[gradeResultId],
    }))
    const response: ExamGradeBatchConfirmResponse = await batchConfirmQuestionGrades({
      examId: selectedExamId.value,
      items,
    })
    batchFailures.value = response.failures ?? []
    if (response.failureCount > 0) {
      message.warning(
        `成功 ${response.successCount} 条，失败 ${response.failureCount} 条，请查看下方失败明细`,
      )
    } else {
      batchFailures.value = []
      message.success(`已确认 ${response.successCount} 条复核得分`)
    }
    selectedRowKeys.value = []
    await loadTasks()
    await refreshSnapshot()
  } catch (error) {
    showUserError(error, '批量确认失败')
  } finally {
    submitting.value = false
  }
}

const skipFirstActivatedLoad = ref(true)

watch(
  selectedExamId,
  (value) => {
    pagination.current = 1
    selectedRowKeys.value = []
    if (value) {
      void loadTasks()
    } else {
      rows.value = []
      pagination.total = 0
    }
  },
  { immediate: true },
)

onActivated(() => {
  if (skipFirstActivatedLoad.value) {
    skipFirstActivatedLoad.value = false
    return
  }
  if (selectedExamId.value) {
    void loadTasks()
  }
})

watch(workbenchRefreshing, (isRefreshing, wasRefreshing) => {
  if (wasRefreshing && !isRefreshing && selectedExamId.value) {
    void loadTasks()
  }
})
</script>

<style lang="scss" scoped>
.batch-confirm__empty {
  padding: 40px 0;
}

.batch-confirm__full-score {
  margin-left: 4px;
  color: var(--dp-text-secondary);
  font-size: 12px;
}

.batch-confirm__failures {
  margin-top: 16px;
}
</style>
