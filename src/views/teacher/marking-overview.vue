<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar>
        <template v-if="overview" #status>
          <UiTag tone="blue" size="sm">筛选命中 {{ overview.filterContext.filteredExamCount }} 场</UiTag>
          <UiTag v-if="filterSummary" tone="gray" size="sm">{{ filterSummary }}</UiTag>
        </template>
        <template #actions>
          <a-select
            v-model:value="filter.academicYear"
            allow-clear
            placeholder="学年"
            class="marking-overview__filter-select"
            :options="academicYearOptions"
            @change="handleFilterChange"
          />
          <a-select
            v-model:value="filter.semester"
            allow-clear
            placeholder="学期"
            class="marking-overview__filter-select"
            :options="semesterOptions"
            @change="handleFilterChange"
          />
          <a-select
            v-model:value="filter.status"
            allow-clear
            placeholder="状态"
            class="marking-overview__filter-select"
            :options="statusOptions"
            @change="handleFilterChange"
          />
          <UiButton variant="outline" size="sm" :loading="loading" @click="() => load()">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" @click="goExamList">
            查看全部考试
          </UiButton>
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
        :placeholder="!overview"
      />
    </template>

    <UiEmpty
      v-if="contractError"
      :description="contractError"
    />
    <template v-else>
      <a-alert
        v-if="loadError"
        type="error"
        show-icon
        :message="loadError"
        class="marking-overview__alert"
      />

      <a-spin :spinning="loading && !overview">
        <UiSkeletonState
          v-if="loading && !overview"
          variant="card"
          :card-count="3"
          compact
          class="marking-overview__skeleton"
        />

        <template v-else>
          <a-row :gutter="16">
            <a-col :xs="24" :lg="14">
              <UiCard title="筛选范围内考试" :description="ongoingCardHint">
                <OngoingExamCardGrid
                  :exams="overview?.ongoingExams ?? []"
                  @navigate="goExamWorkspace"
                />
              </UiCard>
            </a-col>
            <a-col :xs="24" :lg="10">
              <MarkingOverviewAnalytics
                :journey-stage-summary="overview?.journeyStageSummary ?? []"
                :marking-progress-summary="overview?.markingProgressSummary ?? emptyMarkingProgressSummary"
                :todo-type-summary="overview?.todoTypeSummary ?? []"
                :filtered-exam-count="overview?.filterContext.filteredExamCount ?? 0"
              />
            </a-col>
          </a-row>

          <a-row :gutter="16" class="marking-overview__bottom-row">
            <a-col :xs="24" :lg="10">
              <UiCard title="待办事项" description="租户级 TopN 待办推送">
                <PendingTodoFeed
                  :todos="overview?.pendingTodos ?? []"
                  @navigate="goExamWorkspace"
                />
              </UiCard>
            </a-col>
            <a-col :xs="24" :lg="14">
              <UiCard title="已发布学情" description="已发布成绩考试学情摘要">
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
import { ReloadOutlined } from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { EXAM_STATUS_LABEL } from '@/apis/mark/exam'
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
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
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
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherMarkingOverview' })

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const contractError = ref('')
const loadError = ref('')
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
const statusOptions = computed(() =>
  (overview.value?.filterOptions.statuses ?? []).map(status => ({
    label: examStatusLabel(status),
    value: status,
  })),
)

const filterSummary = computed(() => {
  const parts: string[] = []
  if (filter.value.academicYear) parts.push(filter.value.academicYear)
  if (filter.value.semester) parts.push(formatSemester(filter.value.semester))
  if (filter.value.status) parts.push(examStatusLabel(filter.value.status))
  return parts.length ? parts.join(' · ') : '全部学年学期'
})

const ongoingCardHint = computed(() => {
  const count = overview.value?.ongoingExams.length ?? 0
  const total = overview.value?.filterContext.filteredExamCount ?? 0
  if (!overview.value) return '加载考试卡片'
  if (total === 0) return '当前筛选暂无考试'
  if (total > count) return `优先推进 Top ${count}，共 ${total} 场`
  return `共 ${count} 场`
})

function examStatusLabel(status: ExamStatusCode): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, status, '考试状态')
}

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
  loadError.value = ''
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
      loadError.value = failure instanceof Error ? failure.message : '阅卷概览加载失败'
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
.marking-overview__filter-select {
  width: 140px;
}

.marking-overview__bottom-row {
  margin-top: 16px;
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
