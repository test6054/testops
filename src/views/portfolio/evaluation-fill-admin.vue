<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationMode } from '@/apis/portfolio/enums'
import type {
  PortfolioEvaluationEntrySummaryItemVO,
  PortfolioEvaluationEntrySummaryVO,
  PortfolioEvaluationEntryVO,
  PortfolioEvaluationIndicatorOptionVO,
  PortfolioEvaluationSubjectTeacherOptionVO,
  PortfolioEvaluationTaskVO,
} from '@/apis/portfolio/teacher-platform'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { PORTFOLIO_EVALUATION_MODE_LABEL } from '@/apis/portfolio/enums'
import {
  portfolioEvaluationEntryApi,
  portfolioEvaluationTaskApi,
} from '@/apis/portfolio/teacher-platform'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel } from '@/utils/strict-enum'

const activeTab = ref('fill')
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const tasks = ref<PortfolioEvaluationTaskVO[]>([])
const selectedTaskId = ref('')
const entries = ref<PortfolioEvaluationEntryVO[]>([])
const summary = ref<PortfolioEvaluationEntrySummaryVO | null>(null)
const subjectTeacherOptions = ref<PortfolioEvaluationSubjectTeacherOptionVO[]>([])
const indicatorOptions = ref<PortfolioEvaluationIndicatorOptionVO[]>([])

const fillForm = reactive({
  subjectTeacherUserId: '',
  indicatorCode: '',
  score: '',
  commentText: '',
})

const selectedTask = computed(() => tasks.value.find(item => item.id === selectedTaskId.value))
const isByIndicator = computed(() => selectedTask.value?.evaluationMode === 'BY_INDICATOR')

const entryColumns: ColumnsType<PortfolioEvaluationEntryVO> = [
  { title: '被评教师', dataIndex: 'subjectTeacherUserId', key: 'subjectTeacherUserId', width: 100 },
  { title: '指标', dataIndex: 'indicatorCode', key: 'indicatorCode', width: 88 },
  { title: '得分', dataIndex: 'score', key: 'score', width: 72 },
  { title: '评语', dataIndex: 'commentText', key: 'commentText' },
  { title: '评价人', dataIndex: 'evaluatorUserId', key: 'evaluatorUserId', width: 100 },
]

const summaryColumns = computed<ColumnsType<PortfolioEvaluationEntrySummaryItemVO>>(() => {
  const metricColumns: ColumnsType<PortfolioEvaluationEntrySummaryItemVO> = [
    { title: '条目数', dataIndex: 'entryCount', key: 'entryCount', width: 80 },
    { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 88 },
  ]
  if (summary.value?.evaluationMode === 'BY_INDICATOR') {
    return [
      { title: '指标编码', dataIndex: 'indicatorCode', key: 'indicatorCode' },
      ...metricColumns,
    ]
  }
  return [
    { title: '被评教师', dataIndex: 'subjectTeacherUserId', key: 'subjectTeacherUserId', width: 100 },
    ...metricColumns,
  ]
})

function evaluationModeLabel(mode: PortfolioEvaluationMode): string {
  return strictEnumLabel(PORTFOLIO_EVALUATION_MODE_LABEL, mode, '多元评价模式')
}

function summaryRowKey(record: unknown): string {
  const row = record as PortfolioEvaluationEntrySummaryItemVO
  if (row.indicatorCode) {
    return row.indicatorCode
  }
  if (row.subjectTeacherUserId) {
    return row.subjectTeacherUserId
  }
  return `${row.entryCount}-${row.averageScore}`
}

function subjectTeacherLabel(teacherUserId: string): string {
  const option = subjectTeacherOptions.value.find(item => item.teacherUserId === teacherUserId)
  return option ? `${option.fullName} (${teacherUserId})` : teacherUserId
}

async function loadTasks() {
  loading.value = true
  try {
    const page = await portfolioEvaluationTaskApi.page({
      pageNum: 1,
      pageSize: 100,
      taskStatus: 'PUBLISHED',
    })
    tasks.value = readPageList(page, '加载评价任务失败')
    if (!selectedTaskId.value && tasks.value.length) {
      selectedTaskId.value = tasks.value[0].id
    }
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function loadFillContext() {
  if (!selectedTaskId.value) {
    subjectTeacherOptions.value = []
    indicatorOptions.value = []
    fillForm.subjectTeacherUserId = ''
    fillForm.indicatorCode = ''
    return
  }
  try {
    const context = await portfolioEvaluationTaskApi.fillContext({ id: selectedTaskId.value })
    subjectTeacherOptions.value = context.subjectTeacherOptions
    indicatorOptions.value = context.indicatorOptions
    fillForm.indicatorCode = ''
  }
  catch (error) {
    showUserError(error)
  }
}

async function loadEntries() {
  if (!selectedTaskId.value) {
    entries.value = []
    return
  }
  loading.value = true
  try {
    const page = await portfolioEvaluationEntryApi.page({
      evaluationTaskId: selectedTaskId.value,
      pageNum: 1,
      pageSize: 100,
    })
    entries.value = readPageList(page, '加载填报条目失败')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function loadSummary() {
  if (!selectedTaskId.value) {
    summary.value = null
    return
  }
  loading.value = true
  try {
    summary.value = await portfolioEvaluationEntryApi.summary({ id: selectedTaskId.value })
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    loading.value = false
  }
}

async function saveEntry() {
  if (!selectedTaskId.value) {
    message.warning('请选择已发布任务')
    return
  }
  if (!fillForm.subjectTeacherUserId.trim() || !fillForm.score.trim()) {
    message.warning('请填写被评教师与得分')
    return
  }
  if (isByIndicator.value && !fillForm.indicatorCode.trim()) {
    message.warning('以指标为主模式须选择指标')
    return
  }
  saving.value = true
  try {
    await portfolioEvaluationEntryApi.save({
      evaluationTaskId: selectedTaskId.value,
      subjectTeacherUserId: fillForm.subjectTeacherUserId.trim(),
      indicatorCode: isByIndicator.value ? fillForm.indicatorCode.trim() : undefined,
      score: fillForm.score.trim(),
      commentText: fillForm.commentText.trim() || undefined,
    })
    message.success('评价已保存')
    fillForm.score = ''
    fillForm.commentText = ''
    await Promise.all([loadEntries(), loadSummary()])
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    saving.value = false
  }
}

async function exportSummaryCsv() {
  if (!selectedTaskId.value) {
    message.warning('请选择已发布任务')
    return
  }
  exporting.value = true
  try {
    const result = await portfolioEvaluationEntryApi.exportSummary({ id: selectedTaskId.value })
    await downloadPortfolioExcelExport(result)
    message.success('汇总已导出')
  }
  catch (error) {
    showUserError(error)
  }
  finally {
    exporting.value = false
  }
}

watch(selectedTaskId, async () => {
  await loadFillContext()
  if (activeTab.value === 'fill') {
    void loadEntries()
  }
  else {
    void loadSummary()
  }
})

watch(activeTab, (tab) => {
  if (tab === 'summary') {
    void loadSummary()
  }
  else {
    void loadEntries()
  }
})

onMounted(async () => {
  await loadTasks()
  if (selectedTaskId.value) {
    await loadFillContext()
    await loadEntries()
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="多元评价填报" subtitle="已发布任务 · 在线填报 · 汇总分析" />
    <UiCard>
      <div class="toolbar">
        <a-select
          v-model:value="selectedTaskId"
          placeholder="选择已发布任务"
          style="width: 280px"
          :loading="loading"
        >
          <a-select-option v-for="task in tasks" :key="task.id" :value="task.id">
            {{ task.taskName }}（{{ evaluationModeLabel(task.evaluationMode) }}）
          </a-select-option>
        </a-select>
        <UiButton @click="loadTasks">
          刷新任务
        </UiButton>
      </div>
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="fill" tab="在线填报">
          <div class="form-grid">
            <a-select
              v-model:value="fillForm.subjectTeacherUserId"
              placeholder="被评教师"
              style="width: 220px"
              show-search
              option-filter-prop="label"
            >
              <a-select-option
                v-for="teacher in subjectTeacherOptions"
                :key="teacher.teacherUserId"
                :value="teacher.teacherUserId"
                :label="teacher.fullName"
              >
                {{ teacher.fullName }}
              </a-select-option>
            </a-select>
            <a-select
              v-if="isByIndicator"
              v-model:value="fillForm.indicatorCode"
              placeholder="评价指标"
              style="width: 200px"
              show-search
              option-filter-prop="label"
            >
              <a-select-option
                v-for="indicator in indicatorOptions"
                :key="indicator.indicatorCode"
                :value="indicator.indicatorCode"
                :label="indicator.indicatorName"
              >
                {{ indicator.indicatorName }}
              </a-select-option>
            </a-select>
            <a-input v-model:value="fillForm.score" placeholder="得分" style="width: 100px" />
            <a-input v-model:value="fillForm.commentText" placeholder="评语" style="flex: 1" />
            <UiButton variant="primary" :loading="saving" @click="saveEntry">
              保存评价
            </UiButton>
          </div>
          <UiDataTable
            :columns="entryColumns"
            :data-source="entries"
            :loading="loading"
            row-key="id"
            style="margin-top: 16px"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'subjectTeacherUserId'">
                {{ subjectTeacherLabel(record.subjectTeacherUserId) }}
              </template>
            </template>
          </UiDataTable>
        </a-tab-pane>
        <a-tab-pane key="summary" tab="汇总分析">
          <div v-if="summary" class="summary-meta">
            <span>条目 {{ summary.entryCount }}</span>
            <span>平均分 {{ summary.averageScore }}</span>
            <span>模式 {{ evaluationModeLabel(summary.evaluationMode) }}</span>
            <UiButton :loading="exporting" @click="exportSummaryCsv">
              导出 CSV
            </UiButton>
          </div>
          <UiDataTable
            :columns="summaryColumns"
            :data-source="summary?.rows ?? []"
            :loading="loading"
            :row-key="summaryRowKey"
            :pagination="false"
          />
        </a-tab-pane>
      </a-tabs>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.toolbar, .form-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}
.summary-meta {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}
</style>
