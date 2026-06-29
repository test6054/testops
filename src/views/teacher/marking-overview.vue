<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="工作台总览"
        :subtitle="pageSubtitle"
      >
        <template #toolbar>
          <UiFilterBar
            v-model="filterBarModel"
            :fields="dashboardFilterFields"
            variant="panel"
            show-labels
            search-text="应用"
            actions-align="end"
            @search="handleFilterChange"
          >
            <template #actions>
              <UiButton variant="outline" size="sm" :loading="loading" @click="() => load()">
                <template #icon><ReloadOutlined /></template>
                刷新
              </UiButton>
              <UiButton size="sm" @click="goExamList">
                查看全部考试
              </UiButton>
            </template>
          </UiFilterBar>
        </template>
      </ContextBar>
    </template>

    <template #rail>
      <MarkingOverviewStageRail
        :exams="overview?.ongoingExams ?? []"
        :journey-stage-summary="overview?.journeyStageSummary ?? []"
        :filtered-count="overview?.filterContext.filteredExamCount ?? 0"
      />
    </template>

    <template #signal>
      <MarkingOverviewSignalBand
        :filter-context="overview?.filterContext"
        :signal-metrics="overview?.signalMetrics"
        :marking-progress-summary="overview?.markingProgressSummary"
        :placeholder="!overview"
      />
    </template>

    <UiEmpty
      v-if="contractError"
      :description="contractError"
    />
    <template v-else>
      <a-spin :spinning="loading && !overview">
        <UiSkeletonState
          v-if="loading && !overview"
          variant="card"
          :card-count="3"
          compact
          class="marking-overview__skeleton"
        />

        <template v-else>
          <div class="marking-overview__content-grid">
            <UiCard title="进行中的考试" :description="ongoingCardHint" bordered>
              <template #extra>
                <UiButton variant="outline" size="sm" @click="goExamList">
                  查看全部
                </UiButton>
              </template>
              <OngoingExamCardGrid
                :exams="overview?.ongoingExams ?? []"
                @navigate="goExamWorkspace"
              />
            </UiCard>
            <UiCard
              title="需要您关注的事项"
              :description="pendingTodoHint"
              bordered
            >
              <template #extra>
                <UiButton variant="ghost" size="sm" @click="goExamList">
                  全部待办
                </UiButton>
              </template>
              <PendingTodoFeed
                :todos="overview?.pendingTodos ?? []"
                @navigate="goExamWorkspace"
              />
            </UiCard>
          </div>

          <a-row :gutter="20" class="marking-overview__analytics-row">
            <a-col :span="24">
              <MarkingOverviewAnalytics
                :journey-stage-summary="overview?.journeyStageSummary ?? []"
                :marking-progress-summary="overview?.markingProgressSummary ?? emptyMarkingProgressSummary"
                :todo-type-summary="overview?.todoTypeSummary ?? []"
                :filtered-exam-count="overview?.filterContext.filteredExamCount ?? 0"
              />
            </a-col>
          </a-row>

          <a-row :gutter="20" class="marking-overview__bottom-row">
            <a-col :span="24">
              <UiCard title="已发布学情" description="已发布成绩考试学情摘要" bordered>
                <PublishedExamInsightChart
                  :insights="overview?.publishedExamInsights ?? []"
                />
                <PublishedExamInsightTable
                  :insights="overview?.publishedExamInsights ?? []"
                  class="marking-overview__insight-table"
                  @statistics="goArchiveStatistics"
                />
              </UiCard>
            </a-col>
          </a-row>
        </template>
      </a-spin>
    </template>
  </StageWorkbenchShell>
</template>

<script lang="ts" setup>
import type { ExamStatusCode } from '@/apis/mark/exam'
import type {
  MarkTeacherDashboardMarkingProgressSummaryVO,
  MarkTeacherDashboardOverviewVO,
  MarkTeacherDashboardQuery,
} from '@/apis/mark/teacher-dashboard'
import type { FilterField } from '@/components/ui-guide/ui/types'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_STATUS_FILTER_OPTIONS } from '@/apis/mark/exam'
import { loadTeacherDashboardOverview } from '@/apis/mark/teacher-dashboard'
import MarkingOverviewAnalytics from '@/components/mark/dashboard/MarkingOverviewAnalytics.vue'
import MarkingOverviewSignalBand from '@/components/mark/dashboard/MarkingOverviewSignalBand.vue'
import MarkingOverviewStageRail from '@/components/mark/dashboard/MarkingOverviewStageRail.vue'
import OngoingExamCardGrid from '@/components/mark/dashboard/OngoingExamCardGrid.vue'
import PendingTodoFeed from '@/components/mark/dashboard/PendingTodoFeed.vue'
import PublishedExamInsightChart from '@/components/mark/dashboard/PublishedExamInsightChart.vue'
import PublishedExamInsightTable from '@/components/mark/dashboard/PublishedExamInsightTable.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUserStore } from '@/stores'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import {
  generateAcademicYearOptions,
  getDefaultAcademicYearAndSemester,
  resolveDefaultDashboardFilter,
} from '@/utils/academic-year'
import { showUserError } from '@/utils/error-handler'

defineOptions({ name: 'TeacherMarkingOverview' })

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const contractError = ref('')
const overview = ref<MarkTeacherDashboardOverviewVO | null>(null)
const defaultYearSemester = getDefaultAcademicYearAndSemester()
const emptyMarkingProgressSummary: MarkTeacherDashboardMarkingProgressSummaryVO = {
  candidateCount: 0,
  scanAttentionCount: 0,
  openProcessingTaskCount: 0,
  pendingReviewTaskCount: 0,
  pendingGradeCount: 0,
  confirmedUnpublishedScoreCount: 0,
  totalQuestionGradeCount: 0,
  confirmedQuestionGradeCount: 0,
}
const filter = ref<MarkTeacherDashboardQuery>({
  academicYear: defaultYearSemester.academicYear,
  semester: defaultYearSemester.semester,
  status: 'ACTIVE',
})
const committedFilter = ref<MarkTeacherDashboardQuery>({ ...filter.value })

const academicYearOptions = computed(() => {
  const apiYears = overview.value?.filterOptions.academicYears
  const years = apiYears?.length ? apiYears : generateAcademicYearOptions()
  return years.map(year => ({ label: year, value: year }))
})
const semesterOptions = computed(() => {
  const apiSemesters = overview.value?.filterOptions.semesters
  const codes = apiSemesters?.length
    ? apiSemesters
    : SemesterOptions.map(item => item.value)
  return codes.map(code => ({
    label: formatSemester(code),
    value: code,
  }))
})
const statusOptions = EXAM_STATUS_FILTER_OPTIONS

const filterBarModel = computed({
  get: () => ({
    academicYear: filter.value.academicYear ?? undefined,
    semester: filter.value.semester ?? undefined,
    status: filter.value.status ?? undefined,
  }),
  set: (value: Record<string, unknown>) => {
    filter.value = {
      academicYear: value.academicYear as string | undefined,
      semester: value.semester as string | undefined,
      status: value.status as ExamStatusCode | undefined,
    }
  },
})

const dashboardFilterFields = computed<FilterField[]>(() => [
  {
    key: 'academicYear',
    label: '学年',
    type: 'select',
    placeholder: '全部学年',
    options: academicYearOptions.value,
    allowClear: true,
    triggerSearchOnChange: true,
  },
  {
    key: 'semester',
    label: '学期',
    type: 'select',
    placeholder: '全部学期',
    options: semesterOptions.value,
    allowClear: true,
    triggerSearchOnChange: true,
  },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    placeholder: '全部状态',
    options: statusOptions,
    allowClear: true,
    defaultValue: 'ACTIVE',
    triggerSearchOnChange: true,
  },
])

const pageSubtitle = computed(() => {
  if (!overview.value) return '加载筛选范围内考试概览'
  const total = overview.value.filterContext.filteredExamCount
  const parts: string[] = []
  if (filter.value.academicYear) parts.push(filter.value.academicYear)
  if (filter.value.semester) parts.push(formatSemester(filter.value.semester))
  const scope = parts.length ? parts.join(' ') : '全部学年学期'
  return `${scope} · 共 ${total} 场考试`
})

const pendingTodoHint = computed(() => {
  const todos = overview.value?.pendingTodos ?? []
  if (!overview.value) return ''
  if (!todos.length) return '暂无待办'
  const urgent = todos.filter(item =>
    item.blocking
    || item.todoType === 'SCAN_ATTENTION'
    || item.todoType === 'REVIEW_PENDING',
  ).length
  if (urgent > 0) return `共 ${todos.length} 项待处理，${urgent} 项紧急`
  return `共 ${todos.length} 项待处理`
})

const ongoingCardHint = computed(() => {
  if (!overview.value) return ''
  const count = overview.value.ongoingExams.length
  if (count === 0) return '当前筛选暂无进行中的考试'
  return '优先推进中的考试，点击进入工作台'
})

function assertTenantContract(data: MarkTeacherDashboardOverviewVO) {
  const sessionTenantId = userStore.userInfo.tenantId
  if (sessionTenantId && String(data.filterContext.tenantId) !== String(sessionTenantId)) {
    throw new TypeError('阅卷概览租户契约不一致')
  }
}

function isFilterRangeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return message.includes('不在可选范围内')
}

async function load(options?: { rollbackFilterOnError?: boolean }) {
  loading.value = true
  contractError.value = ''
  try {
    const data = await loadTeacherDashboardOverview({ ...filter.value })
    assertTenantContract(data)
    overview.value = data
    committedFilter.value = { ...filter.value }
  } catch (error) {
    let failure: unknown = error
    if (isFilterRangeError(failure) && (filter.value.academicYear || filter.value.semester)) {
      try {
        const bootstrap = await loadTeacherDashboardOverview({})
        assertTenantContract(bootstrap)
        const reconciled = resolveDefaultDashboardFilter(bootstrap.filterOptions)
        filter.value = {
          ...filter.value,
          academicYear: reconciled.academicYear || undefined,
          semester: reconciled.semester || undefined,
        }
        if (reconciled.academicYear || reconciled.semester) {
          const data = await loadTeacherDashboardOverview({ ...filter.value })
          assertTenantContract(data)
          overview.value = data
          committedFilter.value = { ...filter.value }
          return
        }
        overview.value = bootstrap
        committedFilter.value = { ...filter.value }
        return
      } catch (bootstrapError) {
        failure = bootstrapError
      }
    }
    if (options?.rollbackFilterOnError) {
      filter.value = { ...committedFilter.value }
    }
    if (!(failure instanceof TypeError)) {
      showUserError(failure, '阅卷概览加载失败')
    } else {
      overview.value = null
      contractError.value = failure.message
    }
  } finally {
    loading.value = false
  }
}

function handleFilterChange() {
  if (!filter.value.academicYear) {
    filter.value.semester = undefined
  }
  void load({ rollbackFilterOnError: true })
}

function goExamList() {
  void router.push({ name: 'TeacherExamList' })
}

function goExamWorkspace(routeName: string | undefined, examId: string | undefined) {
  if (!routeName || !examId) return
  void router.push({ name: routeName, params: { examId } })
}

function goArchiveStatistics(examId: string) {
  void router.push({ name: 'TeacherExamWorkspaceArchiveStatistics', params: { examId } })
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.marking-overview__content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: var(--dp-space-5);
  margin-bottom: var(--dp-space-5);
}

.marking-overview__analytics-row,
.marking-overview__bottom-row {
  margin-bottom: 0;
}

.marking-overview__analytics-row {
  margin-bottom: var(--dp-space-5);
}

.marking-overview__bottom-row {
  margin-top: 0;
}

@media (max-width: 1199px) {
  .marking-overview__content-grid {
    grid-template-columns: 1fr;
  }
}

.marking-overview__insight-table {
  margin-top: 16px;
}

.marking-overview__alert {
  margin-bottom: 12px;
}

.marking-overview__skeleton {
  margin-bottom: 16px;
}
</style>
