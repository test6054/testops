<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template #status>
          <UiTag tone="blue" size="sm">
            待复核 {{ pagination.total }} 条
          </UiTag>
          <UiTag v-if="selectedRowKeys.length > 0" tone="orange" size="sm">
            已选 {{ selectedRowKeys.length }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadTasks">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :disabled="rows.length === 0"
            @click="applyAiScores"
          >
            采纳 AI 建议分
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

    <UiEmpty v-if="!selectedExamId" description="请先选择考试" />

    <UiErrorRetryPanel
      v-else-if="loadError"
      :error="loadError"
      @retry="loadTasks"
    />

    <UiCard v-else>
      <UiDataTable
        pagination-mode="server"
        row-key="gradeResultId"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :total="pagination.total"
        :page-num="pagination.current"
        :page-size="pagination.pageSize"
        :row-selection="rowSelection"
        flat
        size="middle"
        @page-change="onPageChange"
      >
        <template #bodyCell="{ column, record }">
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
    </UiCard>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ColumnType } from 'ant-design-vue/es/table'
import type {
  ExamGradeBatchConfirmResponse,
  GradeSourceCode,
  ReviewTaskItemVO,
} from '@/apis/mark/exam'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import {
  batchConfirmQuestionGrades,
  listReviewTasks,
  validateReviewTaskItemContract,
} from '@/apis/mark/exam'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiErrorRetryPanel from '@/components/ui-guide/ui/UiErrorRetryPanel.vue'
import { ContextBar, StageWorkbenchShell } from '@/components/workbench'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherReviewBatchConfirm' })

const GRADE_SOURCE_LABEL: Record<GradeSourceCode, string> = {
  AUTO_OBJECTIVE: '客观自动',
  AUTO_OBJECTIVE_AI: '客观 AI',
  LOCAL_SUBJECTIVE_AI: '主观 AI',
  TEACHER: '教师',
  RECOGNITION_FAILURE: '识别失败',
}

const GRADE_SOURCE_TONE: Record<GradeSourceCode, 'blue' | 'green' | 'orange' | 'red' | 'gray'> = {
  AUTO_OBJECTIVE: 'green',
  AUTO_OBJECTIVE_AI: 'blue',
  LOCAL_SUBJECTIVE_AI: 'blue',
  TEACHER: 'orange',
  RECOGNITION_FAILURE: 'red',
}

const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()

const loading = ref(false)
const submitting = ref(false)
const loadError = ref<Error | null>(null)
const rows = ref<ReviewTaskItemVO[]>([])
const scoreDraftMap = reactive<Record<string, number>>({})
const selectedRowKeys = ref<string[]>([])

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

const columns: ColumnType<ReviewTaskItemVO>[] = [
  { title: '答卷', key: 'paper', width: 200 },
  { title: '题号', key: 'question', width: 100 },
  { title: '来源', key: 'gradeSource', width: 110 },
  { title: 'AI 建议分', key: 'aiScore', width: 100 },
  { title: '确认得分', key: 'teacherReviewScore', width: 140 },
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String)
  },
}))

function gradeSourceLabel(source: GradeSourceCode): string {
  return strictEnumLabel(GRADE_SOURCE_LABEL, source, '批改来源')
}

function gradeSourceTone(source: GradeSourceCode): 'blue' | 'green' | 'orange' | 'red' | 'gray' {
  return GRADE_SOURCE_TONE[source]
}

function initScoreDraft(records: ReviewTaskItemVO[]): void {
  for (const record of records) {
    if (scoreDraftMap[record.gradeResultId] == null) {
      scoreDraftMap[record.gradeResultId] = record.aiScore ?? 0
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
  for (const record of rows.value) {
    if (record.aiScore != null) {
      scoreDraftMap[record.gradeResultId] = record.aiScore
    }
  }
  message.success('已用 AI 建议分填充当前页得分')
}

async function loadTasks(): Promise<void> {
  if (!selectedExamId.value) return
  loading.value = true
  loadError.value = null
  try {
    const result = await listReviewTasks({
      examId: selectedExamId.value,
      status: 'PENDING',
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    const records = readPageList(result, '复核任务列表加载失败')
    records.forEach(validateReviewTaskItemContract)
    rows.value = records
    pagination.total = readPageTotal(result)
    initScoreDraft(records)
    selectedRowKeys.value = selectedRowKeys.value.filter((id) =>
      records.some((row) => row.gradeResultId === id),
    )
  } catch (error) {
    rows.value = []
    pagination.total = 0
    loadError.value = toUserError(error, '待复核任务加载失败')
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

function openConfirm(): void {
  if (selectedRowKeys.value.length === 0) return
  const missingScore = selectedRowKeys.value.some((id) => scoreDraftMap[id] == null)
  if (missingScore) {
    message.warning('请为每条选中记录填写确认得分')
    return
  }
  void confirmAsync({
    title: '批量确认复核得分',
    content: `将批量确认 ${selectedRowKeys.value.length} 条复核得分，确认后写入教师复核分并推进复核任务状态。`,
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
    if (response.failureCount > 0) {
      message.warning(`成功 ${response.successCount} 条，失败 ${response.failureCount} 条`)
    } else {
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

watch(selectedExamId, (value) => {
  pagination.current = 1
  selectedRowKeys.value = []
  if (value) {
    void loadTasks()
  } else {
    rows.value = []
    pagination.total = 0
  }
}, { immediate: true })
</script>

<style lang="scss" scoped>
.batch-confirm__full-score {
  margin-left: 4px;
  color: var(--dp-text-secondary, #64748b);
  font-size: 12px;
}
</style>
