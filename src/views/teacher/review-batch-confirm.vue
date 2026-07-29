<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="批量复核确认" :subtitle="listLoadFailed ? undefined : `${pagination.total} 条待复核`">
        <template #status>
          <UiTag tone="blue" size="sm">
            待复核 {{ listLoadFailed ? '—' : pagination.total }} 条
          </UiTag>
          <UiTag v-if="selectedRowKeys.length > 0" tone="orange" size="sm">
            已选 {{ selectedRowKeys.length }}
          </UiTag>
        </template>
        <template #actions>
          <UiButton variant="ghost" size="sm" @click="goSingleReview"> 单题复核 </UiButton>
          <template v-if="canManageReviewerWrites === true">
            <UiButton
              size="sm"
              variant="outline"
              :disabled="rows.length === 0 || listLoadFailed"
              @click="applyAiScores"
            >
              填入建议分
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :disabled="selectedRowKeys.length === 0 || listLoadFailed"
              :loading="submitting"
              @click="openConfirm"
            >
              批量确认选中
            </UiButton>
          </template>
        </template>
      </ContextBar>
    </template>

    <template v-if="selectedExamId" #signal>
      <SignalBand layout="spotlight" compact variant="panel" :metrics="batchSignalMetrics" />
    </template>

    <ExamSelectGateStrip v-if="!selectedExamId" body="缺少考试上下文，请从考试列表进入批量确认" />

    <template v-else>
      <ExamWorkspaceJourneySubNav />

      <WorkbenchSurfaceCard flush>
        <UiAlertStrip
          v-if="listLoadFailed"
          tone="error"
          title="待复核列表加载失败"
          dense
        />
        <UiAlertStrip
          v-if="writeSettledMessage"
          :tone="writeSettledTone"
          title="批量确认结果"
          :description="writeSettledMessage"
          dense
        />
        <UiEmpty
          size="sm"
          v-if="!listLoadFailed && !loading && rows.length === 0"
          description="当前暂无待批量确认的复核任务（硬判或智能建议确认后会出现在此）"
          class="batch-confirm__empty"
        />
        <UiDataTable
          v-if="!listLoadFailed || rows.length > 0"
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
              <UiInputNumber
                :value="scoreDraftMap[record.gradeResultId]"
                :min="0"
                :max="record.fullScore"
                :step="0.5"
                size="sm"
                style="width: 88px"
                @update:value="(v: number | string | null) => updateScore(record.gradeResultId, v)"
              />
              <span class="batch-confirm__full-score">/ {{ record.fullScore }}</span>
            </template>
          </template>
        </UiDataTable>
        <UiList
          v-if="batchFailures.length"
          size="small"
          :data-source="batchFailures"
          class="batch-confirm__failures"
        >
          <template #renderItem="{ item }">
            <UiListItem>
              <UiListItemMeta>
                <template #title> 成绩记录 {{ item.gradeResultId }} </template>
                <template #description>
                  <UiTag tone="red" size="sm">{{ item.code }}</UiTag>
                  {{ item.message }}
                </template>
              </UiListItemMeta>
            </UiListItem>
          </template>
        </UiList>
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
import message from 'ant-design-vue/es/message'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { batchConfirmQuestionGrades } from '@/apis/mark/exam-grade'
import { getExamLayoutQuestionSummary } from '@/apis/mark/exam-layout-question'
import {
  GRADE_SOURCE_TONE,
  GradeSourceDescription,
  listReviewTasks,
  ReviewTaskStatusCode,
} from '@/apis/mark/exam-review-task'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiList from '@/components/ui-guide/ui/UiList.vue'
import UiListItem from '@/components/ui-guide/ui/UiListItem.vue'
import UiListItemMeta from '@/components/ui-guide/ui/UiListItemMeta.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import ExamSelectGateStrip from '@/components/workbench/ExamSelectGateStrip.vue'
import ExamWorkspaceJourneySubNav from '@/components/workbench/ExamWorkspaceJourneySubNav.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useMarkExamContext } from '@/composables/useMarkExamContext'
import { useMarkWorkbenchContext, useWorkspaceExamId } from '@/composables/useMarkWorkbenchContext'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherReviewBatchConfirm' })

const router = useRouter()
const { selectedExamId } = useMarkExamContext()
const { refreshSnapshot } = useWorkspaceExamId()
const { refreshing: workbenchRefreshing } = useMarkWorkbenchContext()

const loading = ref(false)
const submitting = ref(false)
const listLoadFailed = ref(false)
let tasksLoadGeneration = 0
// MVR-332：列表/制卷摘要下发 canManageReviewerWrites，缺声明会导致写闸 ReferenceError
const canManageReviewerWrites = ref(false)
const batchFailures = ref<ExamGradeBatchConfirmFailureItem[]>([])
const writeSettledMessage = ref('')
const writeSettledTone = ref<'success' | 'warning' | 'error'>('success')
const rows = ref<ReviewTaskItemResponse[]>([])
const scoreDraftMap = reactive<Record<string, number>>({})
/** 当前页加载时的建议分基线，用于判断教师是否改过分。 */
const scoreDraftBaselineMap = reactive<Record<string, number | undefined>>({})
const selectedRowKeys = ref<string[]>([])
let bypassBatchDraftLeaveGuard = false
const committedPagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
})

const pagination = reactive({
  current: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

const batchSignalMetrics = computed((): SignalMetric[] => [
  {
    key: 'pending',
    label: '待复核',
    value: listLoadFailed.value ? '—' : pagination.total,
    unit: listLoadFailed.value ? undefined : '条',
    tone: listLoadFailed.value ? 'red' : pagination.total > 0 ? 'orange' : 'green',
    emphasis: 'primary',
    actionLabel: !listLoadFailed.value && pagination.total > 0 ? '批量确认' : undefined,
    helper: listLoadFailed.value ? '列表加载失败' : pagination.total > 0 ? '待批量复核队列' : '暂无待复核',
  },
  {
    key: 'selected',
    label: '已选',
    value: selectedRowKeys.value.length,
    unit: '条',
    tone: selectedRowKeys.value.length > 0 ? 'blue' : 'gray',
    emphasis: 'secondary',
  },
])

/** 已选行或改动过建议分基线时视为未提交草稿。 */
const isBatchDraftDirty = computed(() => {
  if (selectedRowKeys.value.length > 0) {
    return true
  }
  for (const gradeResultId of Object.keys(scoreDraftMap)) {
    if (scoreDraftMap[gradeResultId] !== scoreDraftBaselineMap[gradeResultId]) {
      return true
    }
  }
  for (const gradeResultId of Object.keys(scoreDraftBaselineMap)) {
    if (scoreDraftBaselineMap[gradeResultId] !== scoreDraftMap[gradeResultId]) {
      return true
    }
  }
  return false
})

async function confirmLeaveIfDirty(): Promise<boolean> {
  if (bypassBatchDraftLeaveGuard || !isBatchDraftDirty.value) {
    return true
  }
  const confirmed = await confirmAsync({
    title: '尚未提交的批量确认草稿将丢失',
    content: '尚未提交的教师复核分不会写入。确认离开当前页？',
    type: 'warning',
    okText: '继续离开',
    cancelText: '留在本页',
  })
  if (confirmed) {
    bypassBatchDraftLeaveGuard = true
  }
  return confirmed
}

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

function clearScoreDraftMap(): void {
  for (const key of Object.keys(scoreDraftMap)) {
    delete scoreDraftMap[key]
  }
  for (const key of Object.keys(scoreDraftBaselineMap)) {
    delete scoreDraftBaselineMap[key]
  }
}

/** 仅保留当前页草稿，避免跨页/跨考试分数残留。 */
function initScoreDraft(records: ReviewTaskItemResponse[]): void {
  clearScoreDraftMap()
  for (const record of records) {
    if (
      record.aiScore != null
      && record.aiScore >= 0
      && record.aiScore <= record.fullScore
    ) {
      scoreDraftMap[record.gradeResultId] = record.aiScore
      scoreDraftBaselineMap[record.gradeResultId] = record.aiScore
    }
  }
}

function updateScore(gradeResultId: string, value: number | string | null): void {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    delete scoreDraftMap[gradeResultId]
    return
  }
  const record = rows.value.find((item) => item.gradeResultId === gradeResultId)
  if (record != null && (value < 0 || value > record.fullScore)) {
    showFormValidationMessage(
      value < 0
        ? `题 ${record.questionNo} 确认得分不能为负，须在 0 到满分 ${record.fullScore} 之间`
        : `题 ${record.questionNo} 确认得分不能超过满分 ${record.fullScore}`,
    )
    return
  }
  scoreDraftMap[gradeResultId] = value
}

/** 批量提交前校验选中行得分闭区间 [0, 满分]，与后端 TeacherQuestionGradeFinalizeService 一致。 */
function assertSelectedScoresInRange(): boolean {
  for (const gradeResultId of selectedRowKeys.value) {
    const score = scoreDraftMap[gradeResultId]
    const record = rows.value.find((item) => item.gradeResultId === gradeResultId)
    if (score == null || record == null) {
      continue
    }
    if (score < 0 || score > record.fullScore) {
      showFormValidationMessage(
        score < 0
          ? `题 ${record.questionNo} 确认得分不能为负，须在 0 到满分 ${record.fullScore} 之间`
          : `题 ${record.questionNo} 确认得分不能超过满分 ${record.fullScore}`,
      )
      return false
    }
  }
  return true
}

function applyAiScores(): void {
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无批量复核写权限')
    return
  }
  let filled = 0
  let skipped = 0
  for (const record of rows.value) {
    if (
      record.aiScore != null
      && record.aiScore >= 0
      && record.aiScore <= record.fullScore
    ) {
      scoreDraftMap[record.gradeResultId] = record.aiScore
      scoreDraftBaselineMap[record.gradeResultId] = record.aiScore
      filled += 1
    } else {
      skipped += 1
    }
  }
  if (filled === 0) {
    showFormValidationMessage('当前页没有可填入的系统建议分（硬判失败或智能未出分须人工给分）')
    return
  }
  void message.success(
    skipped > 0
      ? `已用系统建议分填充 ${filled} 条，${skipped} 条无建议分需人工填写`
      : `已用系统建议分填充当前页 ${filled} 条（含客观题硬判与智能建议）`,
  )
}

async function loadTasks(): Promise<void> {
  const examId = selectedExamId.value
  if (!examId) return
  const generation = ++tasksLoadGeneration
  loading.value = true
  try {
    // MVR-980：先拉列表；空列表再用制卷摘要补齐 canManageReviewerWrites（禁止静默 catch）
    const result = await listReviewTasks({
      examId,
      status: ReviewTaskStatusCode.PENDING,
      excludeArbitration: true,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    })
    if (generation !== tasksLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    const records = result.list
    rows.value = records
    pagination.total = result.total
    listLoadFailed.value = false
    // MVR-328：列表有项时仅认行级 can===true；空列表用制卷摘要 can===true 补齐
    if (records.length > 0) {
      canManageReviewerWrites.value = records[0].canManageReviewerWrites === true
    } else {
      try {
        const layoutSummary = await getExamLayoutQuestionSummary(selectedExamId.value)
        canManageReviewerWrites.value = layoutSummary.canManageReviewerWrites === true
      } catch (layoutError) {
        canManageReviewerWrites.value = false
        showUserError(layoutError, '复核写权限能力位加载失败，写入口暂不可用')
      }
    }
    initScoreDraft(records)
    selectedRowKeys.value = selectedRowKeys.value.filter((id) =>
      records.some((row) => row.gradeResultId === id),
    )
    committedPagination.current = pagination.current
    committedPagination.pageSize = pagination.pageSize
    bypassBatchDraftLeaveGuard = false
  } catch (error) {
    if (generation !== tasksLoadGeneration || selectedExamId.value !== examId) {
      return
    }
    listLoadFailed.value = true
    canManageReviewerWrites.value = false
    showUserError(error, '待复核任务加载失败')
  } finally {
    if (generation === tasksLoadGeneration) {
      loading.value = false
    }
  }
}

async function onPageChange(page: { current: number, pageSize: number }): Promise<void> {
  if (
    page.current === committedPagination.current
    && page.pageSize === committedPagination.pageSize
  ) {
    return
  }
  if (!(await confirmLeaveIfDirty())) {
    pagination.current = committedPagination.current
    pagination.pageSize = committedPagination.pageSize
    return
  }
  bypassBatchDraftLeaveGuard = false
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  selectedRowKeys.value = []
  void loadTasks()
}

async function goSingleReview(): Promise<void> {
  if (!selectedExamId.value) {
    return
  }
  if (!(await confirmLeaveIfDirty())) {
    return
  }
  void router.push({
    name: 'TeacherExamWorkspaceMarkingReview',
    params: { examId: selectedExamId.value },
  })
}

function openConfirm(): void {
  // MVR-394：仅认 canManageReviewerWrites===true
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无批量复核写权限')
    return
  }
  if (selectedRowKeys.value.length === 0) return
  const missingScore = selectedRowKeys.value.some((id) => scoreDraftMap[id] == null)
  if (missingScore) {
    showFormValidationMessage('请为每条选中记录填写确认得分')
    return
  }
  if (!assertSelectedScoresInRange()) {
    return
  }
  void confirmAsync({
    title: '批量确认教师复核分',
    content: `将把 ${selectedRowKeys.value.length} 条题目写入教师复核分。客观题硬判与智能建议仅作线索，确认后才进入最终成绩汇总。`,
    okText: '确认提交',
    onOk: submitBatch,
  })
}

async function submitBatch(): Promise<void> {
  // MVR-960：确认后再次认写权/选择/得分完整性，防对话框期间权限或勾选漂移
  if (!selectedExamId.value || selectedRowKeys.value.length === 0) return
  if (canManageReviewerWrites.value !== true) {
    void message.warning('当前账号无批量复核写权限')
    return
  }
  if (listLoadFailed.value === true) {
    void message.warning('列表加载失败，请切换范围或离开再进入本页后再批量确认')
    return
  }
  if (submitting.value === true) {
    return
  }
  const missingScore = selectedRowKeys.value.some((id) => scoreDraftMap[id] == null)
  if (missingScore) {
    showFormValidationMessage('请为每条选中记录填写确认得分')
    return
  }
  if (!assertSelectedScoresInRange()) {
    return
  }
  const examId = selectedExamId.value
  const confirmedKeys = [...selectedRowKeys.value]
  submitting.value = true
  try {
    const items = confirmedKeys.map((gradeResultId) => ({
      gradeResultId,
      teacherReviewScore: scoreDraftMap[gradeResultId],
    }))
    const response: ExamGradeBatchConfirmResponse = await batchConfirmQuestionGrades({
      examId,
      items,
    })
    batchFailures.value = response.failures ?? []
    if (response.failureCount > 0) {
      writeSettledTone.value = 'warning'
      writeSettledMessage.value = `写入成功 ${response.successCount} 条，失败 ${response.failureCount} 条；请查看下方失败明细，勿重复提交已成功行`
      void message.warning(writeSettledMessage.value)
    } else {
      batchFailures.value = []
      writeSettledTone.value = 'success'
      writeSettledMessage.value = `已确认写入 ${response.successCount} 条复核得分`
      void message.success(writeSettledMessage.value)
    }
    selectedRowKeys.value = []
    for (const gradeResultId of confirmedKeys) {
      delete scoreDraftMap[gradeResultId]
      delete scoreDraftBaselineMap[gradeResultId]
    }
    bypassBatchDraftLeaveGuard = true
    try {
      await loadTasks()
    } catch (error) {
      writeSettledTone.value = 'warning'
      writeSettledMessage.value = `复核得分已写入（成功 ${response.successCount} 条），但列表刷新失败；切换范围或离开再进入本页后同步视图`
      showUserError(error, '复核得分已写入，但列表刷新失败')
      return
    }
    try {
      await refreshSnapshot()
    } catch (error) {
      writeSettledTone.value = 'warning'
      writeSettledMessage.value = `复核得分已写入（成功 ${response.successCount} 条），但阶段快照刷新失败；列表已同步`
      showUserError(error, '复核得分已写入，但阶段快照刷新失败')
    }
  } catch (error) {
    writeSettledTone.value = 'error'
    writeSettledMessage.value = '批量确认写入失败'
    showUserError(error, '批量确认失败')
  } finally {
    submitting.value = false
  }
}

const skipFirstActivatedLoad = ref(true)

watch(
  selectedExamId,
  (value) => {
    bypassBatchDraftLeaveGuard = false
    pagination.current = 1
    committedPagination.current = 1
    selectedRowKeys.value = []
    clearScoreDraftMap()
    batchFailures.value = []
    writeSettledMessage.value = ''
    listLoadFailed.value = false
    if (value) {
      void loadTasks()
    } else {
      tasksLoadGeneration += 1
      rows.value = []
      pagination.total = 0
      canManageReviewerWrites.value = false
    }
  },
  { immediate: true },
)

onBeforeRouteLeave(async () => {
  return confirmLeaveIfDirty()
})

onActivated(() => {
  if (skipFirstActivatedLoad.value) {
    skipFirstActivatedLoad.value = false
    return
  }
  // 有未提交草稿时不因 keep-alive 激活覆盖当前页输入
  if (selectedExamId.value && !isBatchDraftDirty.value) {
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
  padding: var(--dp-space-component) 0;
}

.batch-confirm__full-score {
  margin-left: var(--dp-space-component-xs);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-xs);
}

.batch-confirm__failures {
  margin-top: var(--dp-space-block);
}
</style>
