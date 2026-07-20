<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="考试列表">
        <template #toolbar>
          <div class="exam-list__scope" role="group" aria-label="考试范围筛选">
            <div class="exam-list__scope-item">
              <UiSelect
                size="sm"
                v-model="filterForm.academicYear"
                :options="academicYearOptions"
                :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.academicYear"
                allow-clear
                @change="handleContextFilterChange"
              />
            </div>
            <div class="exam-list__scope-item">
              <UiSelect
                size="sm"
                v-model="filterForm.semester"
                :options="semesterSelectOptions"
                :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.semester"
                allow-clear
                :disabled="!filterForm.academicYear"
                @change="handleContextFilterChange"
              />
            </div>
            <div class="exam-list__scope-item exam-list__scope-item--status">
              <UiSelect
                size="sm"
                v-model="filterForm.status"
                :options="statusSelectOptions"
                :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.status"
                allow-clear
                @change="handleContextFilterChange"
              />
            </div>
          </div>
        </template>
        <template #actions>
          <UiButton size="sm" variant="primary" @click="goCreateExam">
            <template #icon><PlusOutlined /></template>
            新建考试
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand
        compact
        variant="panel"
        :metrics="summarySignalMetrics"
        @metric-click="handleSummaryMetricClick"
      />
    </template>

    <UiAlertStrip
      v-if="statusTotalsFailed"
      tone="warning"
      title="概览计数暂不可用"
      description="Tab 计数与 Signal 汇总加载失败，列表数据仍可浏览。"
      dense
      class="exam-list-page__count-alert"
    />

    <WorkbenchSurfaceCard flush>
      <template #head>
        <div class="exam-list-page__scope-head">
          <UiSectionTabs v-model="listTab" :items="examListTabs" compact divided />
        </div>
      </template>

      <template #toolbar>
        <UiFilterBar
          v-model="filterModel"
          :fields="filterFields"
          variant="plain"
          show-labels
          search-text="查询"
          actions-align="end"
          @search="handleSearch"
          @reset="handleReset"
        >
          <template #field-dateRange>
            <UiRangePicker
              v-model="filterForm.dateRange"
              size="sm"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD HH:mm:ss"
              :placeholder="['开始日期', '结束日期']"
              style="width: 260px"
            />
          </template>
        </UiFilterBar>
      </template>

      <UiEmpty
        size="sm"
        v-if="listLoadFailed"
        title="加载失败"
        description="请检查网络后重新查询"
        class="exam-list-page__empty"
      />
      <UiEmpty
        size="sm"
        v-else-if="listTab === 'priority' && !priorityLoading && priorityPagination.total === 0"
        title="暂无优先推进"
        description="当前筛选下没有需要优先处理的考试"
        class="exam-list-page__empty"
      />
      <UiEmpty
        size="sm"
        v-else-if="listTab === 'ongoing' && !ongoingLoading && ongoingPagination.total === 0"
        title="暂无进行中考试"
        description="可新建考试，或切换到「全部」查看历史"
        class="exam-list-page__empty"
      />

      <UiDataTable
        v-else-if="!listLoadFailed"
        v-model:current="currentPagination.current"
        v-model:page-size="currentPagination.pageSize"
        :columns="tableColumns"
        :data-source="currentDataSource"
        :loading="currentLoading"
        :total="currentPagination.total ?? 0"
        pagination-mode="server"
        row-key="examId"
        size="middle"
        flat
        class="exam-table"
        :custom-row="examListCustomRow"
        :row-class-name="examListRowClassName"
        @page-change="handleUiPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'examName'">
            <div class="exam-list-page__exam-name-cell">
              <div class="exam-list-page__exam-name-row">
                <span class="exam-list-page__exam-name exam-list-page__exam-name--link">
                  {{ record.examName }}
                </span>
                <UiTag v-if="isExamPriorityRow(record)" tone="orange" size="sm">优先</UiTag>
              </div>
              <div v-if="examListExamSubMeta(record)" class="exam-list-page__exam-no">
                <span class="exam-list-page__exam-no-code">{{ examListExamSubMeta(record) }}</span>
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'academicYear'">
            <span v-if="record.academicYear" class="exam-list-page__term-year">
              {{ record.academicYear }}
            </span>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'semester'">
            <span v-if="record.semester" class="exam-list-page__term-semester">
              {{ formatSemester(record.semester) }}
            </span>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <div class="exam-list-page__status-row">
              <UiTag :tone="examStatusTone(record)" size="sm">
                <span
                  v-if="record.status === ExamStatusCode.ACTIVE"
                  class="exam-list-page__status-pulse"
                  aria-hidden="true"
                />
                {{ examStatusLabel(record) }}
              </UiTag>
              <UiTag v-if="record.examKind" :tone="examKindTone(record)" size="sm">
                {{ examKindLabel(record) }}
              </UiTag>
            </div>
          </template>
          <template v-else-if="column.key === 'role'">
            <UiTag :tone="examParticipationTone(record)" size="sm">
              {{ examParticipationLabel(record) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'progress'">
            <div v-if="record.totalQuestionGradeCount > 0" class="exam-list-page__progress">
              <div class="exam-list-page__progress-track">
                <div
                  class="exam-list-page__progress-fill"
                  :class="progressFillClass(record)"
                  :style="{
                    transform: `scaleX(${Math.max(0, Math.min(1, getExamGradingPercent(record) / 100))})`,
                  }"
                />
              </div>
              <span class="exam-list-page__progress-pct" :class="progressPercentClass(record)">
                {{ getExamGradingPercent(record) }}%
              </span>
            </div>
            <span v-else-if="record.questionCount <= 0" class="muted">无题目</span>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'pendingConfirm'">
            <UiTag v-if="getPendingConfirmCount(record) > 0" tone="orange" size="sm">
              {{ getPendingConfirmCount(record) }} 题
            </UiTag>
            <span v-else class="muted">0</span>
          </template>
          <template v-else-if="column.key === 'scanAttention'">
            <UiTag v-if="getScanAttentionCount(record) > 0" tone="red" size="sm">
              {{ getScanAttentionCount(record) }} 条
            </UiTag>
            <span v-else class="muted">0</span>
          </template>
          <template v-else-if="column.key === 'openMarking'">
            <UiTag v-if="getOpenMarkingCount(record) > 0" tone="blue" size="sm">
              {{ getOpenMarkingCount(record) }} 份
            </UiTag>
            <span v-else class="muted">0</span>
          </template>
          <template v-else-if="column.key === 'examWindow'">
            <ExamListExamWindowCell :exam="record" />
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(record.createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildExamRowActions(record)"
              align="center"
              split
              @action="(key) => handleExamRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </WorkbenchSurfaceCard>
  </StageWorkbenchShell>

  <!-- 考试维护 Drawer -->
  <ExamEditDrawer
    v-model:open="formModalOpen"
    :exam-id="editingExamId"
    @saved="handleExamEdited"
  />
</template>

<script lang="ts" setup>
import type { ColumnType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type {
  ExamPageQueryRequest,
  ExamWorkbenchSummaryResponse,
} from '@/apis/mark/exam'
import type {
  BadgeTone,
  FilterField,
  UiSectionTabItem,
  UiTableRowActionItem,
} from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import type { SignalMetric } from '@/types/workbench'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArchiveVolumeExamGate } from '@/apis/mark/archive-volume'
import {
  closeExam,
  countExamWorkbenchScopes,
  deleteExam,
  EXAM_KIND_TONE,
  EXAM_STATUS_TONE,
  ExamKindDescription,
  ExamListScopeCode,
  ExamStatusCode,
  ExamStatusDescription,
  pageExamWorkbench,
} from '@/apis/mark/exam'
import ExamEditDrawer from '@/components/mark/ExamEditDrawer.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiRangePicker from '@/components/ui-guide/ui/RangePicker.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveS1AutoCreateAttention } from '@/composables/useArchiveS1AutoCreateAttention'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  buildCloseExamBlockedContent,
  buildCloseExamReadyContent,
} from '@/composables/useExamArchiveGateHint'
import { useMarkDashboardFilterOptions } from '@/composables/useMarkDashboardFilterOptions'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { formatSemester } from '@/types/enums/semester-enum'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import { showUserError } from '@/utils/error-handler'
import { formatExamSubMeta } from '@/utils/exam-display-meta'
import { readExamListDeepLinkQuery } from '@/utils/exam-list-navigation'
import {
  countBlockingScanAttention,
  resolveSmartExamEntryRouteName,
} from '@/utils/exam-workspace-entry-gates'
import { formatDateTime } from '@/utils/format'
import {
  buildMarkDashboardAcademicYearSelectOptions,
  buildMarkDashboardSemesterSelectOptions,
  buildMarkDashboardStatusSelectOptions,
  MARK_DASHBOARD_FILTER_PLACEHOLDERS,
} from '@/utils/mark-dashboard-filter-options'
import { resolveScanStageEntryRoute } from '@/utils/resolve-scan-stage-entry'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ExamListExamWindowCell from '@/views/teacher/components/ExamListExamWindowCell.vue'

defineOptions({ name: 'TeacherExamList' })

const router = useRouter()
const {
  load: loadS1AutoCreateAttention,
  isAttentionExam,
} = useArchiveS1AutoCreateAttention()
const route = useRoute()
const authStore = useAuthStore()
const userStore = useUserStore()
const { filterOptions: dashboardFilterOptions, loadFilterOptions } = useMarkDashboardFilterOptions()

/**
 * 是否全租户审计读视角。
 *
 * <p>与后端 ExamMarkPermissionService.hasFullTenantReadView() 对齐：
 * 仅平台超管享有跨主考可见性；
 * 租户管理员（SCH_TECH + isTenantAdmin）在阅卷链路上与普通教师一致，
 * 仅可见自己创建 + 被分配评阅的考试。这是用户口径下的"禁止越权"硬约束。</p>
 *
 * <p>后端 listExamPage 已按角色注入创建人 / 评阅人可见性；
 * 这个 computed 仅用于 UI 显隐（创建人列、教师下钻控件、KPI 文案）。</p>
 */
const isAdminView = computed(() => authStore.userRole === RoleEnum.SUPER_ADMIN)

interface ExamListFilterForm {
  status?: ExamStatusCode
  academicYear?: string
  semester?: SemesterCode
  keyword?: string
  dateRange?: [string, string]
}

function createDefaultFilterForm(): ExamListFilterForm {
  const defaults = getDefaultAcademicYearAndSemester()
  return {
    status: ExamStatusCode.ACTIVE,
    academicYear: defaults.academicYear,
    semester: defaults.semester,
    keyword: '',
    dateRange: undefined,
  }
}

function createPaginationState(): TablePaginationConfig {
  return {
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showTotal: (total: number) => `共 ${total} 条`,
  }
}

/** 三 Tab 共用同一套筛选条件，切换 Tab 时保留已填写的搜索项。 */
const examActionLoading = ref(false)

const filterForm = reactive<ExamListFilterForm>(createDefaultFilterForm())

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const academicYearOptions = computed(() =>
  buildMarkDashboardAcademicYearSelectOptions(dashboardFilterOptions.value?.academicYears),
)
const semesterSelectOptions = computed(() =>
  buildMarkDashboardSemesterSelectOptions(dashboardFilterOptions.value?.semesters),
)
const statusSelectOptions = computed(() =>
  buildMarkDashboardStatusSelectOptions(dashboardFilterOptions.value?.statuses),
)

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'keyword',
    type: 'input',
    placeholder: '考试名称 / 编号',
    allowClear: true,
    width: 220,
    minWidth: 220,
    inputPrefixIcon: 'search',
    triggerSearchOnChange: false,
  },
  { key: 'dateRange', type: 'custom', width: 260, minWidth: 260, maxWidth: 320 },
])

watch(
  () => filterForm.academicYear,
  (academicYear) => {
    if (!academicYear?.trim()) {
      filterForm.semester = undefined
    }
  },
)

const priorityDataSource = ref<ExamWorkbenchSummaryResponse[]>([])
const ongoingDataSource = ref<ExamWorkbenchSummaryResponse[]>([])
const allDataSource = ref<ExamWorkbenchSummaryResponse[]>([])
const priorityLoading = ref(false)
const ongoingLoading = ref(false)
const allLoading = ref(false)
const priorityPagination = reactive<TablePaginationConfig>(createPaginationState())
const ongoingPagination = reactive<TablePaginationConfig>(createPaginationState())
const allPagination = reactive<TablePaginationConfig>(createPaginationState())
const priorityBadgeTotal = ref(0)
const ongoingBadgeTotal = ref(0)
const allBadgeTotal = ref(0)
const stalePushTotal = ref(0)
const listLoadFailed = ref(false)

const allTabColumns: ColumnType<ExamWorkbenchSummaryResponse>[] = [
  {
    title: '考试名称',
    dataIndex: 'examName',
    key: 'examName',
    ellipsis: true,
    width: 360,
    fixed: 'left',
  },
  { title: '学年', key: 'academicYear', width: 120 },
  { title: '学期', key: 'semester', width: 88 },
  { title: '状态', key: 'status', width: 140 },
  { title: '阅卷进度', key: 'progress', width: 140 },
  { title: '考试时间', key: 'examWindow', width: 160 },
  { title: '创建时间', key: 'createTime', width: 180 },
  { title: '操作', key: 'actions', align: 'center', width: 200 },
]

const workbenchTabColumns: ColumnType<ExamWorkbenchSummaryResponse>[] = [
  {
    title: '考试名称',
    dataIndex: 'examName',
    key: 'examName',
    ellipsis: true,
    width: 300,
    fixed: 'left',
  },
  { title: '学年', key: 'academicYear', width: 120 },
  { title: '学期', key: 'semester', width: 88 },
  { title: '状态', key: 'status', width: 132 },
  { title: '阅卷进度', key: 'progress', width: 140 },
  { title: '待确认题数', key: 'pendingConfirm', width: 108 },
  { title: '扫描异常', key: 'scanAttention', width: 96 },
  { title: '进行中批阅', key: 'openMarking', width: 108 },
  { title: '考试时间', key: 'examWindow', width: 160 },
  { title: '创建时间', key: 'createTime', width: 168 },
  { title: '操作', key: 'actions', align: 'center', width: 200 },
]

const ongoingTabColumns: ColumnType<ExamWorkbenchSummaryResponse>[] = [
  {
    title: '考试名称',
    dataIndex: 'examName',
    key: 'examName',
    ellipsis: true,
    width: 300,
    fixed: 'left',
  },
  { title: '学年', key: 'academicYear', width: 120 },
  { title: '学期', key: 'semester', width: 88 },
  { title: '状态', key: 'status', width: 132 },
  { title: '参与角色', key: 'role', width: 88 },
  { title: '阅卷进度', key: 'progress', width: 140 },
  { title: '待确认题数', key: 'pendingConfirm', width: 108 },
  { title: '扫描异常', key: 'scanAttention', width: 96 },
  { title: '进行中批阅', key: 'openMarking', width: 108 },
  { title: '考试时间', key: 'examWindow', width: 160 },
  { title: '创建时间', key: 'createTime', width: 168 },
  { title: '操作', key: 'actions', align: 'center', width: 200 },
]

type ExamListTabKey = 'priority' | 'ongoing' | 'all'

const listTab = ref<ExamListTabKey>('priority')

/** 路由深链写入 Tab 时抑制 watch 重复拉数。 */
let suppressListTabWatch = false

function applyExamListDeepLinkFromRoute(): void {
  const deepLink = readExamListDeepLinkQuery(route.query)
  suppressListTabWatch = true
  try {
    if (deepLink.tab) {
      listTab.value = deepLink.tab
    }
    if (deepLink.academicYear !== undefined) {
      filterForm.academicYear = deepLink.academicYear
    }
    if (deepLink.semester !== undefined) {
      filterForm.semester = deepLink.semester
    }
    if (deepLink.status !== undefined) {
      filterForm.status = deepLink.status
    }
  } finally {
    suppressListTabWatch = false
  }
}

const tableColumns = computed<ColumnType<ExamWorkbenchSummaryResponse>[]>(() => {
  if (listTab.value === 'all') {
    return allTabColumns
  }
  if (listTab.value === 'ongoing') {
    return ongoingTabColumns
  }
  return workbenchTabColumns
})

const currentDataSource = computed<ExamWorkbenchSummaryResponse[]>(() => {
  if (listTab.value === 'priority') {
    return priorityDataSource.value
  }
  if (listTab.value === 'ongoing') {
    return ongoingDataSource.value
  }
  return allDataSource.value
})

const currentLoading = computed<boolean>(() => {
  if (listTab.value === 'priority') {
    return priorityLoading.value
  }
  if (listTab.value === 'ongoing') {
    return ongoingLoading.value
  }
  return allLoading.value
})

const currentPagination = computed<TablePaginationConfig>(() => {
  if (listTab.value === 'priority') {
    return priorityPagination
  }
  if (listTab.value === 'ongoing') {
    return ongoingPagination
  }
  return allPagination
})

const examListTabs = computed<UiSectionTabItem[]>(() => [
  {
    key: 'priority',
    label: '优先推进',
    count: priorityBadgeTotal.value,
    badgeTone: priorityBadgeTotal.value > 0 ? 'orange' : 'gray',
  },
  {
    key: 'ongoing',
    label: '进行中',
    count: ongoingBadgeTotal.value,
    badgeTone: ongoingBadgeTotal.value > 0 ? 'green' : 'gray',
  },
  {
    key: 'all',
    label: '全部',
    count: allBadgeTotal.value,
    badgeTone: 'blue',
  },
])

watch(listTab, () => {
  if (suppressListTabWatch) return
  void reloadListAndCounts({ resolveTab: false })
})

/** 优先推进 / 进行中无数据时，依次回退到下一 Tab（全部始终可停留）。 */
function resolveListTabFromCounts(): void {
  suppressListTabWatch = true
  try {
    let tab = listTab.value
    if (tab === 'priority' && priorityBadgeTotal.value === 0) {
      tab = 'ongoing'
    }
    if (tab === 'ongoing' && ongoingBadgeTotal.value === 0) {
      tab = 'all'
    }
    listTab.value = tab
  } finally {
    suppressListTabWatch = false
  }
}

const summarySignalMetrics = computed((): SignalMetric[] => {
  const dash = '—'
  const filteredTotal = currentPagination.value.total ?? 0
  const ongoing = ongoingBadgeTotal.value
  const closed = closedTotal.value
  const stale = stalePushTotal.value
  return [
    {
      key: 'filtered',
      label: '筛选命中',
      value: filteredTotal,
      unit: '场',
      tone: 'blue',
      iconTone: 'blue',
      helper: listTab.value === 'all' ? '当前筛选结果' : '切换到「全部」查看',
      clickable: true,
    },
    {
      key: 'active',
      label: '进行中',
      value: statusTotalsFailed.value ? dash : ongoing,
      unit: '场',
      tone: 'green',
      iconTone: 'green',
      helper: statusTotalsFailed.value ? '计数暂不可用' : '可进入阅卷推进',
      clickable: true,
    },
    {
      key: 'closed',
      label: '已关闭',
      value: statusTotalsFailed.value ? dash : closed,
      unit: '场',
      tone: 'gray',
      iconTone: 'gray',
      helper: statusTotalsFailed.value ? '计数暂不可用' : '历史已关闭考试',
      clickable: !statusTotalsFailed.value,
    },
    {
      key: 'stale',
      label: '待推进',
      value: statusTotalsFailed.value ? dash : stale,
      unit: '场',
      tone: stale > 0 ? 'orange' : 'gray',
      iconTone: stale > 0 ? 'orange' : 'gray',
      helper: statusTotalsFailed.value
        ? '计数暂不可用'
        : stale > 0
          ? '优先处理阻塞项'
          : '暂无阻塞待办',
      clickable: !statusTotalsFailed.value && stale > 0,
    },
  ]
})

function handleSummaryMetricClick(key: string): void {
  if (key === 'filtered') {
    listTab.value = 'all'
    return
  }
  if (key === 'active') {
    if (filterForm.status === ExamStatusCode.CLOSED) {
      filterForm.status = undefined
    }
    listTab.value = 'ongoing'
    resetCurrentTabPagination()
    void reloadListAndCounts({ resolveTab: false })
    return
  }
  if (key === 'closed' && !statusTotalsFailed.value) {
    listTab.value = 'all'
    filterForm.status = ExamStatusCode.CLOSED
    resetCurrentTabPagination()
    void reloadListAndCounts({ resolveTab: false })
    return
  }
  if (key === 'stale' && !statusTotalsFailed.value && stalePushTotal.value > 0) {
    if (filterForm.status === ExamStatusCode.CLOSED) {
      filterForm.status = undefined
    }
    listTab.value = 'priority'
    resetCurrentTabPagination()
    void reloadListAndCounts({ resolveTab: false })
  }
}

function handleContextFilterChange(): void {
  if (!filterForm.academicYear) {
    filterForm.semester = undefined
  }
  if (!ensureAcademicYearSemesterPair(filterForm.academicYear, filterForm.semester)) {
    return
  }
  resetCurrentTabPagination()
  void reloadListAndCounts()
}

function getExamGradingPercent(exam: ExamWorkbenchSummaryResponse): number {
  const total = exam.totalQuestionGradeCount
  if (total <= 0) return 0
  return Math.round((exam.confirmedQuestionGradeCount / total) * 100)
}

function progressFillClass(exam: ExamWorkbenchSummaryResponse): string {
  const percent = getExamGradingPercent(exam)
  if (percent >= 100) return 'exam-list-page__progress-fill--success'
  if (percent < 50) return 'exam-list-page__progress-fill--warning'
  return ''
}

function progressPercentClass(exam: ExamWorkbenchSummaryResponse): string {
  const percent = getExamGradingPercent(exam)
  if (percent >= 100) return 'exam-list-page__progress-pct--ok'
  if (percent <= 0) return 'exam-list-page__progress-pct--zero'
  if (percent <= 50) return 'exam-list-page__progress-pct--warn'
  return ''
}

function isExamPriorityRow(exam: ExamWorkbenchSummaryResponse): boolean {
  if (listTab.value === 'priority') return true
  if (exam.status !== ExamStatusCode.ACTIVE) return false
  return (
    getScanAttentionCount(exam) > 0
    || getPendingConfirmCount(exam) > 0
    || getExamGradingPercent(exam) < 50
  )
}

/** 考试名列副行：编号 · 院系（院系名由后端按 reference_department_id 反查）。 */
function examListExamSubMeta(exam: ExamWorkbenchSummaryResponse): string {
  return formatExamSubMeta(exam.examNo, exam.departmentName)
}

/** 关考 / tip 待建袋 / 阅卷已满均可进 S1 复盘，避免协调人误走「新建课程考核袋」。 */
function isExamArchiveReady(exam: ExamWorkbenchSummaryResponse): boolean {
  if (isAttentionExam(exam.examId)) {
    return true
  }
  if (exam.status === ExamStatusCode.CLOSED) {
    return true
  }
  return getExamGradingPercent(exam) >= 100
}

function examListCustomRow(record: ExamWorkbenchSummaryResponse) {
  return {
    onClick: () => goSmartExamEntry(record),
  }
}

function examListRowClassName(record: ExamWorkbenchSummaryResponse): string {
  if (isAttentionExam(record.examId)) return 'exam-list-row--archive-attention'
  if (record.status === ExamStatusCode.CLOSED) return ''
  if (isExamPriorityRow(record)) return 'exam-list-row--priority'
  if (record.status === ExamStatusCode.ACTIVE) return 'exam-list-row--active'
  return ''
}

/** 从列表行内嵌进度字段提取待确认题数、扫描异常与进行中批阅任务数。 */
function resolveExamProgressSnapshot(exam: ExamWorkbenchSummaryResponse): {
  pendingGrades: number
  scanAttention: number
  openMarking: number
} {
  return {
    pendingGrades: Math.max(0, exam.totalQuestionGradeCount - exam.confirmedQuestionGradeCount),
    scanAttention: exam.scanAttentionCount,
    openMarking: exam.openProcessingTaskCount,
  }
}

function getPendingConfirmCount(exam: ExamWorkbenchSummaryResponse): number {
  return resolveExamProgressSnapshot(exam).pendingGrades
}

function getScanAttentionCount(exam: ExamWorkbenchSummaryResponse): number {
  return resolveExamProgressSnapshot(exam).scanAttention
}

function getOpenMarkingCount(exam: ExamWorkbenchSummaryResponse): number {
  return resolveExamProgressSnapshot(exam).openMarking
}

/** 教师视角：主考与 BE canManageOwnerExamLifecycleWrites 同源；其余为评阅。 */
function examParticipationLabel(exam: ExamWorkbenchSummaryResponse): string {
  if (exam.canManageOwnerExamLifecycleWrites === true) {
    return '主考'
  }
  if (isAdminView.value) {
    return '—'
  }
  return '评阅'
}

function examParticipationTone(exam: ExamWorkbenchSummaryResponse): BadgeTone {
  if (exam.canManageOwnerExamLifecycleWrites === true) {
    return 'green'
  }
  if (isAdminView.value) {
    return 'gray'
  }
  return 'blue'
}

function tabToScope(tab: ExamListTabKey): ExamListScopeCode {
  if (tab === 'priority') {
    return ExamListScopeCode.PRIORITY
  }
  if (tab === 'ongoing') {
    return ExamListScopeCode.ONGOING
  }
  return ExamListScopeCode.ALL
}

function getPaginationByScope(scope: ExamListScopeCode): TablePaginationConfig {
  if (scope === ExamListScopeCode.PRIORITY) {
    return priorityPagination
  }
  if (scope === ExamListScopeCode.ONGOING) {
    return ongoingPagination
  }
  return allPagination
}

function getDataSourceRefByScope(scope: ExamListScopeCode): typeof priorityDataSource {
  if (scope === ExamListScopeCode.PRIORITY) {
    return priorityDataSource
  }
  if (scope === ExamListScopeCode.ONGOING) {
    return ongoingDataSource
  }
  return allDataSource
}

function getLoadingRefByScope(scope: ExamListScopeCode): typeof priorityLoading {
  if (scope === ExamListScopeCode.PRIORITY) {
    return priorityLoading
  }
  if (scope === ExamListScopeCode.ONGOING) {
    return ongoingLoading
  }
  return allLoading
}

function buildScopeCountQuery(): ExamPageQueryRequest {
  const [startTime, endTime] = filterForm.dateRange ?? []
  const termQuery
    = buildOptionalAcademicYearSemesterQuery(filterForm.academicYear, filterForm.semester) ?? {}
  return {
    status: filterForm.status,
    ...termQuery,
    keyword: filterForm.keyword?.trim() || undefined,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
  }
}

function buildWorkbenchQuery(
  scope: ExamListScopeCode,
  pageNum: number,
  pageSize: number,
): Parameters<typeof pageExamWorkbench>[0] {
  const [startTime, endTime] = filterForm.dateRange ?? []
  const termQuery
    = buildOptionalAcademicYearSemesterQuery(filterForm.academicYear, filterForm.semester) ?? {}
  return {
    listScope: scope,
    pageNum,
    pageSize,
    status: filterForm.status,
    ...termQuery,
    keyword: filterForm.keyword?.trim() || undefined,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
  }
}

function syncTabBadgeFromPagination(scope: ExamListScopeCode): void {
  const total = getPaginationByScope(scope).total ?? 0
  if (scope === ExamListScopeCode.PRIORITY) {
    priorityBadgeTotal.value = total
    return
  }
  if (scope === ExamListScopeCode.ONGOING) {
    ongoingBadgeTotal.value = total
    return
  }
  allBadgeTotal.value = total
}

/** 当前页内将 S1 待自动建袋考试置顶，不改后端排序契约。 */
function prioritizeAttentionExams(
  exams: ExamWorkbenchSummaryResponse[],
): ExamWorkbenchSummaryResponse[] {
  if (exams.length <= 1) {
    return exams
  }
  const attention: ExamWorkbenchSummaryResponse[] = []
  const others: ExamWorkbenchSummaryResponse[] = []
  for (const exam of exams) {
    if (isAttentionExam(exam.examId)) {
      attention.push(exam)
    } else {
      others.push(exam)
    }
  }
  if (attention.length === 0) {
    return exams
  }
  return [...attention, ...others]
}

function resortTabDataByAttention(scope: ExamListScopeCode): void {
  const dataSourceRef = getDataSourceRefByScope(scope)
  dataSourceRef.value = prioritizeAttentionExams(dataSourceRef.value)
}

async function loadTabData(scope: ExamListScopeCode): Promise<void> {
  const paginationState = getPaginationByScope(scope)
  const dataSourceRef = getDataSourceRefByScope(scope)
  const loadingRef = getLoadingRefByScope(scope)
  loadingRef.value = true
  listLoadFailed.value = false
  try {
    const result = await pageExamWorkbench(
      buildWorkbenchQuery(scope, paginationState.current ?? 1, paginationState.pageSize ?? 10),
    )
    dataSourceRef.value = prioritizeAttentionExams(result.list ?? [])
    paginationState.total = result.total
    if (result.pageNum != null) {
      paginationState.current = result.pageNum
    }
    if (result.pageSize != null) {
      paginationState.pageSize = result.pageSize
    }
    syncTabBadgeFromPagination(scope)
  } catch (error) {
    listLoadFailed.value = true
    showUserError(error, '考试列表加载失败')
    dataSourceRef.value = []
    paginationState.total = 0
  } finally {
    loadingRef.value = false
  }
}

async function loadWorkbenchScopeCounts(): Promise<void> {
  statusTotalsFailed.value = false
  try {
    const counts = await countExamWorkbenchScopes(buildScopeCountQuery())
    priorityBadgeTotal.value = counts.priorityCount
    ongoingBadgeTotal.value = counts.ongoingCount
    allBadgeTotal.value = counts.allCount
    closedTotal.value = counts.closedCount
    stalePushTotal.value = counts.stalePushCount
  } catch (error) {
    statusTotalsFailed.value = true
    showUserError(error, '考试工作台数量统计加载失败')
  }
}

function resetCurrentTabPagination(): void {
  getPaginationByScope(tabToScope(listTab.value)).current = 1
}

function handleSearch(): void {
  resetCurrentTabPagination()
  void reloadListAndCounts()
}

function handleReset(): void {
  Object.assign(filterForm, createDefaultFilterForm())
  resetCurrentTabPagination()
  void reloadListAndCounts()
}

function handleUiPageChange(page: { current: number, pageSize: number }): void {
  const scope = tabToScope(listTab.value)
  const paginationState = getPaginationByScope(scope)
  paginationState.current = page.current
  paginationState.pageSize = page.pageSize
  void loadTabData(scope)
}

// helper 严格 typed 接收后端 API 对象 ExamWorkbenchSummaryResponse，模板侧使用表格 slot record 保留当前行引用。
function examStatusTone(exam: ExamWorkbenchSummaryResponse): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, exam.status, '考试状态')
}

function examStatusLabel(exam: ExamWorkbenchSummaryResponse): string {
  return strictEnumLabel(ExamStatusDescription, exam.status, '考试状态')
}

function examKindTone(exam: ExamWorkbenchSummaryResponse): BadgeTone {
  return strictEnumTone(EXAM_KIND_TONE, exam.examKind, '考试性质')
}

function examKindLabel(exam: ExamWorkbenchSummaryResponse): string {
  if (exam.examKindMessage?.trim()) {
    return exam.examKindMessage.trim()
  }
  return strictEnumLabel(ExamKindDescription, exam.examKind, '考试性质')
}

/**
 * 根据考试当前进度，智能跳转到最优操作入口。
 *
 * ACTIVE：扫描异常 → 准备 → 复核 → 阅卷 → 成绩确认。
 * CLOSED：进入考试概览，工作台内各阶段为只读查看。
 */
function goSmartExamEntry(exam: ExamWorkbenchSummaryResponse): void {
  const examId = exam.examId
  const blockingScanAttention = countBlockingScanAttention(
    exam.scanAttentionCount,
    exam.needReviewGradeResultCount,
  )
  if (blockingScanAttention > 0) {
    void router.push(
      resolveScanStageEntryRoute(examId, { scanAttentionCount: blockingScanAttention }),
    )
    return
  }
  const routeName = resolveSmartExamEntryRouteName(exam)
  void router.push({ name: routeName, params: { examId } })
}

function goMarkingTaskPool(exam: ExamWorkbenchSummaryResponse): void {
  void router.push({
    name: 'TeacherExamWorkspaceMarkingTaskPool',
    params: { examId: String(exam.examId) },
  })
}

function goExamArchiveReview(exam: ExamWorkbenchSummaryResponse): void {
  void router.push({
    name: 'TeacherExamWorkspaceArchivePackage',
    params: { examId: String(exam.examId) },
  })
}

// ─── KPI 概览：workbench-scope-counts 返回 CLOSED；Signal「进行中」与 Tab 共用 ongoingCount ─
const closedTotal = ref<number>(0)
const statusTotalsFailed = ref(false)

const formModalOpen = ref(false)
const editingExamId = ref<string | null>(null)

function goCreateExam(): void {
  void router.push({ name: 'TeacherCreateExam' })
}

function openEditModal(exam: ExamWorkbenchSummaryResponse): void {
  if (!canManageOwnerExamLifecycle(exam)) {
    return
  }
  editingExamId.value = exam.examId
  formModalOpen.value = true
}

async function handleExamEdited(): Promise<void> {
  await reloadAll()
}

/** MVR-327：仅认 BE canManageOwnerExamLifecycleWrites===true；禁止 createUser 本地回退 */
function canManageOwnerExamLifecycle(exam: ExamWorkbenchSummaryResponse): boolean {
  return exam.canManageOwnerExamLifecycleWrites === true
}

/** 组装考试列表行内操作：默认展示 3 项，其余由 UiTableActions 收入「更多」。 */
function buildExamRowActions(exam: ExamWorkbenchSummaryResponse): UiTableRowActionItem[] {
  // 行内仅 1 个 primary：进入为默认主路径；阅卷为次操作
  const actions: UiTableRowActionItem[] = [{ key: 'enter', label: '进入', tone: 'primary' }]
  if (exam.status === ExamStatusCode.ACTIVE) {
    actions.push({ key: 'marking', label: '阅卷' })
  }
  if (isExamArchiveReady(exam)) {
    actions.push({
      key: 'archive',
      label: isAttentionExam(exam.examId) ? '待建袋·归档复盘' : '归档复盘',
      tone: isAttentionExam(exam.examId) ? 'primary' : undefined,
    })
  }
  // MVR-272：编辑/关闭/删除均仅主考；与 BE requireExamOwnerPermission 对齐
  if (exam.status !== ExamStatusCode.CLOSED && canManageOwnerExamLifecycle(exam)) {
    actions.push({ key: 'edit', label: '编辑' })
    actions.push({ key: 'close', label: '关闭' })
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  return actions
}

function handleExamRowAction(key: string, exam: ExamWorkbenchSummaryResponse): void {
  switch (key) {
    case 'enter':
      goSmartExamEntry(exam)
      break
    case 'marking':
      goMarkingTaskPool(exam)
      break
    case 'archive':
      goExamArchiveReview(exam)
      break
    case 'edit':
      if (!canManageOwnerExamLifecycle(exam)) {
        return
      }
      openEditModal(exam)
      break
    case 'close':
      if (!canManageOwnerExamLifecycle(exam)) {
        return
      }
      confirmClose(exam)
      break
    case 'delete':
      if (!canManageOwnerExamLifecycle(exam)) {
        return
      }
      confirmDelete(exam)
      break
  }
}

function confirmClose(exam: ExamWorkbenchSummaryResponse): void {
  if (!canManageOwnerExamLifecycle(exam) || examActionLoading.value) {
    return
  }
  void (async () => {
    try {
      const gate = await getArchiveVolumeExamGate(exam.examId)
      if ((gate.unpublishedBoundPaperCount ?? 0) > 0) {
        void confirmAsync({
          title: '尚不能关考',
          content: buildCloseExamBlockedContent(gate),
          okText: '前往成绩发布',
          cancelText: '知道了',
          type: 'warning',
          onOk: async () => {
            await router.push({
              name: 'TeacherExamWorkspaceScoreRelease',
              params: { examId: exam.examId },
            })
          },
        })
        return
      }
      void confirmAsync({
        title: `关闭考试 ${exam.examName}？`,
        content: gate.allScoresPublished
          ? buildCloseExamReadyContent(gate)
          : '关闭后考试进入 CLOSED 状态，可进入考后归档与质量评价；关闭后不可再编辑考试主信息。',
        okText: '关闭考试',
        cancelText: '取消',
        type: 'warning',
        onOk: async () => {
          if (examActionLoading.value) {
            return false
          }
          examActionLoading.value = true
          try {
            await closeExam({ examId: exam.examId })
            message.success('考试已关闭')
            await reloadAll()
          } catch (error) {
            showUserError(error, '关闭考试失败')
            return false
          } finally {
            examActionLoading.value = false
          }
        },
      })
    } catch (error) {
      showUserError(error, '加载关考前置条件失败')
    }
  })()
}

function confirmDelete(exam: ExamWorkbenchSummaryResponse): void {
  if (!canManageOwnerExamLifecycle(exam) || examActionLoading.value) {
    return
  }
  void confirmAsync({
    title: `删除考试 ${exam.examName}？`,
    content: '已进入模板、考生、印刷、扫描或成绩流程的考试不能删除。',
    okText: '删除',
    cancelText: '取消',
    type: 'error',
    onOk: async () => {
      if (examActionLoading.value) {
        return false
      }
      examActionLoading.value = true
      try {
        await deleteExam({ examId: exam.examId })
        message.success('考试已删除')
        const scope = tabToScope(listTab.value)
        const dataSourceRef = getDataSourceRefByScope(scope)
        const paginationState = getPaginationByScope(scope)
        if (dataSourceRef.value.length === 1 && (paginationState.current ?? 1) > 1) {
          paginationState.current = (paginationState.current ?? 1) - 1
        }
        await reloadAll()
      } catch (error) {
        showUserError(error, '删除考试失败')
        return false
      } finally {
        examActionLoading.value = false
      }
    },
  })
}

async function reloadListAndCounts(options?: { resolveTab?: boolean }): Promise<void> {
  if (!ensureAcademicYearSemesterPair(filterForm.academicYear, filterForm.semester)) {
    return
  }
  await loadWorkbenchScopeCounts()
  if (options?.resolveTab !== false) {
    resolveListTabFromCounts()
  }
  await loadTabData(tabToScope(listTab.value))
}

async function reloadAll(): Promise<void> {
  // 先拉 S1 关注 examId 集合，再拉列表，保证本页置顶排序可用
  await loadS1AutoCreateAttention()
  await reloadListAndCounts()
  resortTabDataByAttention(tabToScope(listTab.value))
}

onActivated(() => {
  applyExamListDeepLinkFromRoute()
  void (async () => {
    await loadFilterOptions()
    await reloadAll()
  })()
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
.exam-list__scope {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
  max-width: 100%;
}

.exam-list__scope-item {
  flex: 0 0 132px;
  width: 132px;
  min-width: 132px;
  max-width: 132px;
}

.exam-list__scope-item--status {
  flex-basis: 112px;
  width: 112px;
  min-width: 112px;
  max-width: 112px;
}

.exam-list__scope-item :deep(.ui-select) {
  width: 100%;
  max-width: 100%;
}

@media (max-width: #{bp.$ant-grid-xl - 1px}) {
  .exam-list__scope {
    overflow-x: auto;
  }

  .exam-list__scope-item {
    flex: 0 0 120px;
    width: 120px;
    min-width: 120px;
    max-width: 120px;
  }

  .exam-list__scope-item--status {
    flex-basis: 100px;
    width: 100px;
    min-width: 100px;
    max-width: 100px;
  }
}

.exam-list-page__count-alert {
  margin-bottom: var(--dp-space-3);
}

.exam-list-page__scope-head {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
}

.exam-list-page__empty {
  padding: var(--dp-space-6) var(--dp-space-4);
}

.exam-list-page__exam-name-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 2px;
  min-height: 40px;
  min-width: 0;
  text-align: left;
}

.exam-list-page__exam-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
}

.exam-list-page__exam-name {
  font-weight: 500;
  color: var(--dp-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.exam-list-page__exam-name--link {
  color: var(--dp-text-primary);
  font-weight: 500;
  transition: color var(--dp-duration-fast) ease;

  &:hover {
    color: var(--dp-color-primary);
  }
}

.exam-list-page__exam-no {
  font-size: 12px;
  line-height: 1.4;
  color: var(--dp-text-tertiary);
}

.exam-list-page__exam-no-code {
  font-family: var(--dp-font-mono);
}

.exam-list-page__term-year {
  font-family: var(--dp-font-mono);
  font-size: 12px;
}

.exam-list-page__term-semester {
  margin-top: 1px;
  font-size: 11px;
  color: var(--dp-text-quaternary);
}

.exam-list-page__status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.exam-list-page__status-pulse {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 4px;
  border-radius: 50%;
  background: var(--dp-color-primary);
  animation: exam-list-pulse 1.5s ease-in-out infinite;
}

@keyframes exam-list-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .exam-list-page__status-pulse {
    animation: none;
  }
}

.exam-list-page__progress {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.exam-list-page__progress-track {
  flex: 1;
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--dp-fill-quaternary);
}

.exam-list-page__progress-fill {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  border-radius: 3px;
  background: var(--dp-color-primary);
  transition: transform var(--dp-duration-normal, 200ms) ease;
}

@media (prefers-reduced-motion: reduce) {
  .exam-list-page__progress-fill {
    transition: none;
  }
}

.exam-list-page__progress-fill--success {
  background: var(--dp-success);
}

.exam-list-page__progress-fill--warning {
  background: var(--dp-warning);
}

.exam-list-page__progress-pct {
  flex-shrink: 0;
  min-width: 32px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--dp-text-secondary);
}

.exam-list-page__progress-pct--ok {
  color: var(--dp-success);
}

.exam-list-page__progress-pct--warn {
  color: var(--dp-warning);
}

.exam-list-page__progress-pct--zero {
  color: var(--dp-text-quaternary);
}

.exam-table :deep(.ant-table-tbody > tr > td) {
  vertical-align: middle;
  transition: background var(--dp-duration-fast, 150ms) ease;
}

.exam-table :deep(.ant-table-tbody > tr:hover > td) {
  background: color-mix(in srgb, var(--dp-color-primary) 4%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--priority > td) {
  background: color-mix(in srgb, var(--dp-warning) 8%, transparent);
}

.exam-table :deep(.exam-list-row--priority:hover > td) {
  background: color-mix(in srgb, var(--dp-warning) 12%, transparent);
}

.exam-table :deep(.exam-list-row--active > td) {
  background: color-mix(in srgb, var(--dp-color-primary) 6%, transparent);
}

.exam-table :deep(.exam-list-row--active:hover > td) {
  background: color-mix(in srgb, var(--dp-color-primary) 10%, transparent);
}

.exam-table :deep(.exam-list-row--archive-attention > td) {
  background: color-mix(in srgb, var(--dp-warning) 10%, transparent);
}

.exam-table :deep(.exam-list-row--archive-attention:hover > td) {
  background: color-mix(in srgb, var(--dp-warning) 14%, transparent);
}

.muted {
  color: var(--dp-text-tertiary);
}
</style>
