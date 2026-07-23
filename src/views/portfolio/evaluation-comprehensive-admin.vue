<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioEvaluationComprehensiveAnalysisVO,
  PortfolioEvaluationComprehensiveTaskItemVO,
  PortfolioEvaluationComprehensiveTeacherRowVO,
  PortfolioEvaluationTaskVO,
} from '@/apis/portfolio/teacher-platform'
import type { EvaluationWorkgroupVO } from '@/apis/quality/evaluation-workgroup'
import type { BadgeTone, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES,
  PortfolioEvaluationModeDescription,
  PortfolioEvaluationSceneDescription,
} from '@/apis/portfolio/enums'
import {
  portfolioEvaluationEntryApi,
  portfolioEvaluationTaskApi,
} from '@/apis/portfolio/teacher-platform'
import { evaluationWorkgroupApi } from '@/apis/quality/evaluation-workgroup'
import { QUALITY_SELECTOR_PAGE_SIZE } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { loadAllPages } from '@/utils/load-all-pages'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const loading = ref(false)
const exporting = ref(false)
const tasksLoading = ref(false)
const analysisRequestToken = ref(0)
const tasks = ref<PortfolioEvaluationTaskVO[]>([])
const workgroups = ref<EvaluationWorkgroupVO[]>([])
const analysis = ref<PortfolioEvaluationComprehensiveAnalysisVO | null>(null)
const analysisParamsSnapshot = ref<ReturnType<typeof buildAnalysisParams> | null>(null)
interface PortfolioEvaluationComprehensiveFilter {
  planYear: string
  workgroupId: string
  selectedTaskIds: string[]
}

const filter = reactive<PortfolioEvaluationComprehensiveFilter>({
  planYear: '',
  workgroupId: '',
  selectedTaskIds: [],
})

const kpiItems = computed<UiStatPanelItem[]>(() => {
  if (!analysis.value) {
    return []
  }
  return [
    {
      key: 'tasks',
      label: '纳入任务',
      value: String(analysis.value.taskCount),
      tone: 'blue',
    },
    { key: 'entries', label: '填报条目', value: String(analysis.value.totalEntryCount) },
    { key: 'avg', label: '总体均分', value: analysis.value.overallAverageScore, unit: '分' },
  ]
})

const filteredTasks = computed(() => {
  let pool = tasks.value
  if (filter.workgroupId) {
    pool = pool.filter((item) => item.workgroupId === filter.workgroupId)
  }
  const planYear = filter.planYear.trim()
  if (planYear) {
    pool = pool.filter((item) => item.startTime?.startsWith(planYear))
  }
  return pool
})

const taskSelectOptions = computed(() =>
  filteredTasks.value.map((item) => ({ value: item.id, label: item.taskName })),
)

const hasReadableTasks = computed(() => tasks.value.length > 0)

const taskColumns: ColumnsType<PortfolioEvaluationComprehensiveTaskItemVO> = [
  { title: '任务', dataIndex: 'taskName', key: 'taskName' },
  { title: '场景', dataIndex: 'sceneCode', key: 'sceneCode', width: 120 },
  { title: '模式', dataIndex: 'evaluationMode', key: 'evaluationMode', width: 120 },
  { title: '条目数', dataIndex: 'entryCount', key: 'entryCount', width: 88, align: 'right' },
  { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 88, align: 'right' },
]

function lifecycleTagTone(record: { lifecycleStatus?: string }): BadgeTone {
  if (record.lifecycleStatus === 'ACTIVE') return 'green'
  if (record.lifecycleStatus === 'TEMP_HOLD') return 'orange'
  if (record.lifecycleStatus === 'SEALED' || record.lifecycleStatus === 'TRANSFERRED') return 'red'
  return 'gray'
}

const teacherColumns: ColumnsType<PortfolioEvaluationComprehensiveTeacherRowVO> = [
  { title: '被评教师', dataIndex: 'subjectTeacherUserId', key: 'subjectTeacherUserId', width: 160 },
  { title: '涉及场景', dataIndex: 'involvedSceneLabels', key: 'involvedSceneLabels', width: 160 },
  { title: '生命周期', key: 'lifecycleStatus', width: 100 },
  { title: '身份层', key: 'identityLayers', width: 160 },
  { title: '当前在岗', key: 'countsInCurrentFacultyStructure', width: 88 },
  {
    title: '涉及任务',
    dataIndex: 'involvedTaskCount',
    key: 'involvedTaskCount',
    width: 88,
    align: 'right',
  },
  { title: '条目数', dataIndex: 'entryCount', key: 'entryCount', width: 88, align: 'right' },
  { title: '平均分', dataIndex: 'averageScore', key: 'averageScore', width: 88, align: 'right' },
]

function evaluationModeLabel(
  mode: PortfolioEvaluationComprehensiveTaskItemVO['evaluationMode'],
): string {
  return strictEnumLabel(PortfolioEvaluationModeDescription, mode, '多元评价模式')
}

function evaluationSceneLabel(
  scene?: PortfolioEvaluationComprehensiveTaskItemVO['sceneCode'],
): string {
  if (!scene) {
    return '—'
  }
  return strictEnumLabel(PortfolioEvaluationSceneDescription, scene, '评价任务场景')
}

function buildAnalysisParams() {
  return {
    planYear: filter.planYear.trim() || undefined,
    workgroupId: filter.workgroupId || undefined,
    evaluationTaskIds: filter.selectedTaskIds.length ? filter.selectedTaskIds : undefined,
  }
}

/** 筛选改变后，旧分析结论不再代表当前条件，必须失效显示与导出快照。 */
function resetAnalysisContext() {
  analysisRequestToken.value += 1
  analysis.value = null
  analysisParamsSnapshot.value = null
}

function canRunAnalysis(): boolean {
  if (filter.selectedTaskIds.length > 0) {
    return true
  }
  return filteredTasks.value.length > 0
}

async function loadWorkgroups() {
  try {
    workgroups.value = await loadAllPages(
      ({ pageNum, pageSize }) =>
        evaluationWorkgroupApi.page({
          pageNum,
          pageSize,
        }),
      QUALITY_SELECTOR_PAGE_SIZE,
    )
  } catch (error) {
    showUserError(error, '加载评价工作组失败')
  }
}

async function loadTasks() {
  tasksLoading.value = true
  try {
    const taskRows = await loadAllPages(
      ({ pageNum, pageSize }) =>
        portfolioEvaluationTaskApi.page({
          pageNum,
          pageSize,
        }),
      QUALITY_SELECTOR_PAGE_SIZE,
    )
    tasks.value = taskRows.filter((item) =>
      PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES.includes(item.taskStatus),
    )
  } catch (error) {
    showUserError(error, '加载评价任务失败')
  } finally {
    tasksLoading.value = false
  }
}

async function runAnalysis() {
  if (!canRunAnalysis()) {
    resetAnalysisContext()
    showFormValidationMessage('当前筛选下无可分析任务，请调整评价组、年度或任务范围')
    return
  }
  const currentToken = ++analysisRequestToken.value
  const params = buildAnalysisParams()
  loading.value = true
  analysis.value = null
  try {
    const result = await portfolioEvaluationEntryApi.comprehensiveAnalysis(params)
    if (currentToken !== analysisRequestToken.value) {
      return
    }
    analysis.value = result
    analysisParamsSnapshot.value = params
  } catch (error) {
    if (currentToken !== analysisRequestToken.value) {
      return
    }
    showUserError(error, '评价综合分析失败')
  } finally {
    if (currentToken === analysisRequestToken.value) {
      loading.value = false
    }
  }
}

async function exportAnalysis() {
  if (!analysis.value || !analysisParamsSnapshot.value) {
    return
  }
  exporting.value = true
  try {
    const result = await portfolioEvaluationEntryApi.exportComprehensiveAnalysis(
      analysisParamsSnapshot.value,
    )
    await downloadPortfolioExcelExport(result)
    void message.success(`已导出 ${result.rowCount} 条填报`)
  } catch (error) {
    showUserError(error, '导出综合分析失败')
  } finally {
    exporting.value = false
  }
}

watch(
  () => filter.workgroupId,
  () => {
    resetAnalysisContext()
    if (!filter.workgroupId) {
      return
    }
    filter.selectedTaskIds = filter.selectedTaskIds.filter((id) =>
      tasks.value.some((task) => task.id === id && task.workgroupId === filter.workgroupId),
    )
  },
)

watch(
  () => [filter.planYear, filter.selectedTaskIds.join(',')],
  () => {
    resetAnalysisContext()
  },
)

onMounted(async () => {
  await loadWorkgroups()
  await loadTasks()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="评价综合分析" subtitle="多任务数据采集 · 跨任务汇总 · 表格文件导出" />
    </template>
    <UiCard>
      <div class="filter-row">
        <UiSelect
          size="sm"
          v-model="filter.workgroupId"
          allow-clear
          placeholder="评价工作组"
          style="width: 200px"
          :options="workgroups.map((item) => ({ value: item.id, label: item.workgroupName }))"
        />
        <UiInput
          size="sm"
          v-model="filter.planYear"
          placeholder="任务开始年度，如 2026"
          style="width: 160px"
        />
        <UiSelect
          size="sm"
          v-model="filter.selectedTaskIds"
          mode="multiple"
          allow-clear
          placeholder="限定任务（默认当前筛选下全部）"
          style="min-width: 280px"
          :loading="tasksLoading"
          :options="taskSelectOptions"
        />
        <UiButton
          size="sm"
          variant="primary"
          :loading="loading"
          :disabled="!hasReadableTasks"
          @click="runAnalysis"
        >
          分析
        </UiButton>
        <UiButton size="sm" :loading="exporting" :disabled="!analysis" @click="exportAnalysis">
          导出表格文件
        </UiButton>
      </div>
      <UiEmpty
        size="sm"
        v-if="!tasksLoading && !hasReadableTasks"
        title="暂无可分析任务"
        description="需存在已发布或已进入评审/公示/归档阶段的评价任务，且您具备对应工作组查看权限"
      />
      <UiEmpty
        v-else-if="!loading && !analysis"
        size="sm"
        description="按评价组、年度或任务范围筛选后，点击工具栏「分析」生成跨任务汇总"
      />
      <template v-else-if="analysis">
        <UiStatPanel :items="kpiItems" compact style="margin-top: 16px" />
        <h3 class="section-title">任务汇总</h3>
        <UiDataTable
          pagination-mode="none"
          :columns="taskColumns"
          :data-source="analysis.tasks"
          :loading="loading"
          row-key="evaluationTaskId"
          :show-pagination="false"
          :sticky-header="false"
          flat
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'sceneCode'">
              {{ evaluationSceneLabel(record.sceneCode) }}
            </template>
            <template v-else-if="column.key === 'evaluationMode'">
              {{ evaluationModeLabel(record.evaluationMode) }}
            </template>
          </template>
        </UiDataTable>
        <h3 class="section-title">被评教师跨任务汇总</h3>
        <UiDataTable
          pagination-mode="none"
          :columns="teacherColumns"
          :data-source="analysis.teacherRows"
          :loading="loading"
          row-key="subjectTeacherUserId"
          :show-pagination="false"
          :sticky-header="false"
          flat
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'subjectTeacherUserId'">
              {{
                formatPortfolioTeacherDisplay(
                  record.subjectTeacherName,
                  record.subjectTeacherNumber,
                )
              }}
            </template>
            <template v-else-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="record.lifecycleStatus" :tone="lifecycleTagTone(record)">
                {{ record.lifecycleStatusLabel || record.lifecycleStatus }}
              </UiTag>
              <UiTag v-if="record.evaluationHeld" tone="orange" class="ml-1">参评 hold</UiTag>
              <span v-else-if="!record.lifecycleStatus">-</span>
            </template>
            <template v-else-if="column.key === 'identityLayers'">
              <PortfolioOwnerIdentityLayersCell
                :layers="record.ownerIdentityLayers"
                :note="record.ownerMultiIdentityNote"
                :row-key="record.subjectTeacherUserId"
              />
            </template>
            <template v-else-if="column.key === 'countsInCurrentFacultyStructure'">
              <UiTag :tone="record.countsInCurrentFacultyStructure === true ? 'green' : 'gray'">
                {{
                  record.countsInCurrentFacultyStructure === true
                    ? '是'
                    : record.countsInCurrentFacultyStructure === false
                      ? '否'
                      : '-'
                }}
              </UiTag>
            </template>
          </template>
        </UiDataTable>
      </template>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.section-title {
  margin: 16px 0 8px;
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}
</style>
