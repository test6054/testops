<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioEvaluationSceneCode} from '@/apis/portfolio/enums';
import type {
  PortfolioEvaluationComprehensiveAnalysisVO,
  PortfolioEvaluationComprehensiveTaskItemVO,
  PortfolioEvaluationComprehensiveTeacherRowVO,
  PortfolioEvaluationTaskVO,
} from '@/apis/portfolio/teacher-platform'
import type { EvaluationWorkgroupVO } from '@/apis/quality/evaluation-workgroup'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES,
  PortfolioEvaluationModeDescription,
  PortfolioEvaluationSceneDescription,
} from '@/apis/portfolio/enums'
import { portfolioSecurityApi } from '@/apis/portfolio/governance'
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
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { PortfolioExportTypeCode } from '@/types/enums/portfolio-export-type-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { loadAllPages } from '@/utils/load-all-pages'
import { portfolioLifecycleStatusDisplay, portfolioLifecycleTagTone } from '@/utils/portfolio-lifecycle-tag'
import { formatPortfolioTeacherDisplay } from '@/utils/portfolio-teacher-display'
import { applySpotlightEmphasis } from '@/utils/signal-spotlight'
import { strictEnumLabel } from '@/utils/strict-enum'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const router = useRouter()
const loading = ref(false)
const exporting = ref(false)
const exportApplyOpen = ref(false)
const exportPurpose = ref('')
const tasksLoading = ref(false)
const analysisRequestToken = ref(0)
const workgroupRequestToken = ref(0)
const taskListRequestToken = ref(0)
const workgroupsLoadFailed = ref(false)
const tasksLoadFailed = ref(false)
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

const EvaluationComprehensiveSignalMetrics = computed<SignalMetric[]>(() => {
  if (!analysis.value) {
    return []
  }
  const metrics: SignalMetric[] = [
    {
      key: 'tasks',
      label: '纳入任务',
      value: analysis.value.taskCount,
      clickable: true,
    },
    {
      key: 'entries',
      label: '填报条目',
      value: analysis.value.totalEntryCount,
    },
    {
      key: 'avg',
      label: '总体均分',
      value: analysis.value.overallAverageScore,
      unit: '分',
    },
  ]
  return applySpotlightEmphasis(metrics, { primaryKey: 'tasks', actionLabel: '刷新分析' })
})

const EvaluationComprehensiveWorkbenchSubtitle = computed(() => {
  if (!analysis.value) return '选择任务后分析'
  return `任务 ${analysis.value.taskCount} · 条目 ${analysis.value.totalEntryCount}`
})

function onEvaluationComprehensiveSignalClick(_key: string) {
  void runAnalysis()
}

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


const teacherColumns: ColumnsType<PortfolioEvaluationComprehensiveTeacherRowVO> = [
  { title: '被评教师', dataIndex: 'subjectTeacherUserId', key: 'subjectTeacherUserId', width: 160 },
  { title: '涉及场景', dataIndex: 'involvedSceneCodes', key: 'involvedSceneCodes', width: 160 },
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

function involvedSceneCodesLabel(codes?: string): string {
  if (!codes) {
    return '—'
  }
  return codes
    .split('/')
    .map((code) =>
      strictEnumLabel(
        PortfolioEvaluationSceneDescription,
        code.trim() as PortfolioEvaluationSceneCode,
        '评价任务场景',
      ),
    )
    .join('/')
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
  const currentToken = ++workgroupRequestToken.value
  try {
    const rows = await loadAllPages(
      ({ pageNum, pageSize }) =>
        evaluationWorkgroupApi.page({
          pageNum,
          pageSize,
        }),
      QUALITY_SELECTOR_PAGE_SIZE,
    )
    if (workgroupRequestToken.value !== currentToken) {
      return
    }
    workgroups.value = rows
    workgroupsLoadFailed.value = false
  } catch (error) {
    if (workgroupRequestToken.value !== currentToken) {
      return
    }
    workgroupsLoadFailed.value = true
    showUserError(error, '加载评价工作组失败')
  }
}

async function loadTasks() {
  const currentToken = ++taskListRequestToken.value
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
    if (taskListRequestToken.value !== currentToken) {
      return
    }
    tasks.value = taskRows.filter((item) =>
      PORTFOLIO_EVALUATION_ENTRY_DATA_READABLE_STATUSES.includes(item.taskStatus),
    )
    tasksLoadFailed.value = false
  } catch (error) {
    if (taskListRequestToken.value !== currentToken) {
      return
    }
    tasksLoadFailed.value = true
    showUserError(error, '加载评价任务失败')
  } finally {
    if (taskListRequestToken.value === currentToken) {
      tasksLoading.value = false
    }
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

function openExportApply() {
  if (!analysis.value || !analysisParamsSnapshot.value || exporting.value) {
    return
  }
  exportPurpose.value = ''
  exportApplyOpen.value = true
}

async function submitExportApply() {
  const purpose = exportPurpose.value.trim()
  if (!purpose) {
    showFormValidationMessage('请填写导出用途')
    return Promise.reject(new Error('导出用途为空'))
  }
  const snapshot = analysisParamsSnapshot.value
  if (!analysis.value || !snapshot || exporting.value) {
    return Promise.reject(new Error('导出申请进行中'))
  }
  exporting.value = true
  try {
    await portfolioSecurityApi.applyExport({
      exportType: PortfolioExportTypeCode.EVALUATION_COMPREHENSIVE_ANALYSIS,
      businessRef: {
        planYear: snapshot.planYear,
        evaluationWorkgroupId: snapshot.workgroupId,
        evaluationTaskIds: snapshot.evaluationTaskIds,
      },
      exportPurpose: purpose,
    })
    exportApplyOpen.value = false
    void message.success('已提交多元评价综合分析导出审批')
    await router.push({ name: 'PortfolioExportApprovalMine' })
  } catch (error) {
    showUserError(error, '提交多元评价综合分析导出审批失败')
    return Promise.reject(error)
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
      <ContextBar show-title layout="workbench" title="评价综合分析" :subtitle="EvaluationComprehensiveWorkbenchSubtitle" />
    </template>
    <template v-if="EvaluationComprehensiveSignalMetrics.length > 0" #signal>
      <SignalBand
        layout="spotlight"
        variant="inline"
        compact
        :metrics="EvaluationComprehensiveSignalMetrics"
        @metric-click="onEvaluationComprehensiveSignalClick"
      />
    </template>
    <UiAlertStrip
      v-if="workgroupsLoadFailed"
      tone="error"
      title="评价工作组加载失败"
      class="dp-mb-component"
    />
    <UiAlertStrip
      v-if="tasksLoadFailed"
      tone="error"
      title="评价任务加载失败"
      class="dp-mb-component"
    />
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
        <UiButton size="sm" :loading="exporting" :disabled="!analysis" @click="openExportApply">
          申请导出
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
            <template v-else-if="column.key === 'involvedSceneCodes'">
              {{ involvedSceneCodesLabel(record.involvedSceneCodes) }}
            </template>
            <template v-else-if="column.key === 'lifecycleStatus'">
              <UiTag v-if="record.lifecycleStatus" :tone="portfolioLifecycleTagTone(record.lifecycleStatus)">
                {{ portfolioLifecycleStatusDisplay(record.lifecycleStatus) }}
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
    <UiDialog
      v-model:open="exportApplyOpen"
      title="申请导出多元评价综合分析"
      ok-text="提交审批"
      cancel-text="取消"
      :confirm-loading="exporting"
      @ok="submitExportApply"
    >
      <UiTextarea
        size="sm"
        v-model="exportPurpose"
        :rows="3"
        placeholder="请填写导出用途（必填，将写入审批记录）"
      />
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped>
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
}
.section-title {
  margin: var(--dp-space-block) 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-md);
  font-weight: 600;
}
</style>
