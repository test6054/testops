<template>
  <!-- Transition/KeepAlive 要求单元素根；Drawer 与壳并列需包一层 -->
  <div class="exam-list-page">
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
                  @change="handleContextFilterChange"
                />
              </div>
              <div class="exam-list__scope-item">
                <UiSelect
                  size="sm"
                  v-model="filterForm.semester"
                  :options="semesterSelectOptions"
                  :placeholder="MARK_DASHBOARD_FILTER_PLACEHOLDERS.semester"
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
              <UiButton
                size="sm"
                variant="outline"
                class="exam-list__scope-current-term"
                :disabled="isCurrentTermSelected"
                @click="handleUseCurrentTerm"
              >
                本学期
              </UiButton>
            </div>
          </template>
          <template #actions>
            <span
              v-if="selectedRowKeys.length > 0"
              class="exam-list-page__selection-count"
              role="status"
              aria-live="polite"
            >
              已选 {{ selectedRowKeys.length }}
            </span>
            <template v-if="selectedRowKeys.length > 0">
              <UiButton
                size="sm"
                variant="outline"
                :disabled="examActionLoading || batchLifecycle.running || batchCloseableExams.length === 0"
                @click="confirmBatchClose"
              >
                批量关闭
              </UiButton>
              <UiButton
                size="sm"
                variant="outline"
                :disabled="examActionLoading || batchLifecycle.running || batchDeletableExams.length === 0"
                @click="confirmBatchDelete"
              >
                批量删除
              </UiButton>
              <UiButton size="sm" variant="outline" :disabled="examActionLoading || batchLifecycle.running" @click="clearExamListSelection">
                清除选择
              </UiButton>
            </template>
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
          class="exam-list-page__empty"
        />
        <UiEmpty
          size="sm"
          v-else-if="listTab === 'priority' && !priorityLoading && priorityPagination.total === 0"
          :title="priorityReasonFilter ? '当前原因下暂无考试' : '暂无优先推进'"
          :description="
            priorityReasonFilter
              ? '可清除原因筛选，或切换学年学期后查看'
              : '当前筛选下没有需要优先处理的考试'
          "
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
          enable-selection
          :selected-row-keys="selectedRowKeys"
          :custom-row="examListCustomRow"
          :row-class-name="examListRowClassName"
          @page-change="handleUiPageChange"
          @selection-change="handleExamListSelectionChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'examName'">
              <div class="exam-list-page__exam-name-cell">
                <div class="exam-list-page__exam-name-row">
                  <button
                    type="button"
                    class="exam-list-page__exam-name exam-list-page__exam-name--link"
                    :aria-label="`进入考试工作台：${record.examName}`"
                    @click.stop="goSmartExamEntry(record)"
                  >
                    {{ record.examName }}
                  </button>
                  <template v-for="phaseTag in [examWindowPhaseTag(record)]" :key="'window-phase'">
                    <UiTag v-if="phaseTag" :tone="phaseTag.tone" size="sm">
                      {{ phaseTag.label }}
                    </UiTag>
                  </template>
                  <UiTag v-if="isExamPriorityRow(record)" tone="orange" size="sm">
                    {{ priorityReasonLabel(record) }}
                  </UiTag>
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
                    class="exam-list-page__status-dot"
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
    <ExamEditDrawer v-model:open="formModalOpen" :exam-id="editingExamId" @saved="handleExamEdited" />

    <ExamListBatchProgressDialog
      :open="batchLifecycle.open"
      :title="batchLifecycle.title"
      :action-label="batchLifecycle.actionLabel"
      :items="batchLifecycle.items"
      :running="batchLifecycle.running"
      :retrying-exam-id="batchLifecycle.retryingExamId"
      @close="handleBatchProgressClose"
      @retry="handleBatchProgressRetry"
      @skip="handleBatchProgressSkip"
    />
  </div>
</template>

<script lang="ts" setup>
import type { ColumnType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type { ExamPageQueryRequest, ExamWorkbenchSummaryResponse } from '@/apis/mark/exam'
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
import { debounce } from 'lodash-es'
import { computed, defineAsyncComponent, onActivated, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArchiveVolumeExamGate } from '@/apis/mark/archive-volume'
import {
  closeExam,
  countExamWorkbenchScopes,
  deleteExam,
  EXAM_BATCH_LIFECYCLE_MAX,
  EXAM_KIND_TONE,
  EXAM_STATUS_TONE,
  ExamKindDescription,
  ExamListScopeCode,
  ExamStatusCode,
  ExamStatusDescription,
  pageExamWorkbench,
} from '@/apis/mark/exam'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiRangePicker from '@/components/ui-guide/ui/RangePicker.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { useArchiveS1AutoCreateAttention } from '@/composables/useArchiveS1AutoCreateAttention'
import { useExamListBatchLifecycle } from '@/composables/useExamListBatchLifecycle'
import { useExamListKeyboard } from '@/composables/useExamListKeyboard'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  buildCloseExamBlockedContent,
  buildCloseExamReadyContent,
} from '@/composables/useExamArchiveGateHint'
import { useMarkDashboardFilterOptions } from '@/composables/useMarkDashboardFilterOptions'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import {
  ExamWorkbenchPriorityReasonCode,
  ExamWorkbenchPriorityReasonEnterActionLabel,
  ExamWorkbenchPriorityReasonWorkspaceRoute,
} from '@/types/enums/exam-workbench-priority-reason-code-enum'
import { formatSemester } from '@/types/enums/semester-enum'
import { getDefaultAcademicYearAndSemester } from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import { showUserError } from '@/utils/error-handler'
import {
  examListExamSubMeta,
  examParticipationLabel as resolveExamParticipationLabel,
  examParticipationTone as resolveExamParticipationTone,
  getExamGradingPercent,
  getOpenMarkingCount,
  getPendingConfirmCount,
  getScanAttentionCount,
  isExamArchiveReady as resolveExamArchiveReady,
  isExamPriorityRow,
  priorityReasonLabel,
  progressFillClass,
  progressPercentClass,
  resolveExamProgressSnapshot,
} from '@/utils/exam-list-display'
import {
  hasExamListDeepLinkQuery,
  readExamListDeepLinkQuery,
} from '@/utils/exam-list-navigation'
import {
  resolveSmartExamEntryRouteName,
} from '@/utils/exam-workspace-entry-gates'
import { formatDateTime, formatExamWindowPhaseLabel, resolveExamWindowPhase } from '@/utils/format'
import {
  buildMarkDashboardAcademicYearSelectOptions,
  buildMarkDashboardSemesterSelectOptions,
  buildMarkDashboardStatusSelectOptions,
  MARK_DASHBOARD_FILTER_PLACEHOLDERS,
} from '@/utils/mark-dashboard-filter-options'
import {
  resolveCurrentWorkbenchTerm,
  resolveMarkWorkbenchTermFilter,
  writeMarkWorkbenchTermPreference,
} from '@/utils/mark-workbench-term-scope'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ExamListExamWindowCell from '@/views/teacher/components/ExamListExamWindowCell.vue'


/** 编辑抽屉 / 批量进度非首屏；按需加载降低考试列表 chunk */
const ExamEditDrawer = defineAsyncComponent(() => import('@/components/mark/ExamEditDrawer.vue'))
const ExamListBatchProgressDialog = defineAsyncComponent(
  () => import('@/views/teacher/components/ExamListBatchProgressDialog.vue'),
)
defineOptions({ name: 'TeacherExamList' })

const router = useRouter()
const { load: loadS1AutoCreateAttention, isAttentionExam } = useArchiveS1AutoCreateAttention()
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
  const defaults = resolveMarkWorkbenchTermFilter()
  return {
    status: defaults.status,
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
const listLoadFailed = ref(false)

/** 最近一次列表加载成功时的筛选快照，供搜索失败回滚（3.7.2 乐观筛选） */
let lastSuccessfulExamFilter = createDefaultFilterForm()

function snapshotExamFilterForm(): ExamListFilterForm {
  return {
    status: filterForm.status,
    academicYear: filterForm.academicYear,
    semester: filterForm.semester,
    keyword: filterForm.keyword,
    dateRange: filterForm.dateRange ? [filterForm.dateRange[0], filterForm.dateRange[1]] : undefined,
  }
}

function rememberSuccessfulExamFilter(): void {
  if (!listLoadFailed.value) {
    lastSuccessfulExamFilter = snapshotExamFilterForm()
  }
}

function rollbackExamFilterOnLoadFailure(): void {
  if (listLoadFailed.value) {
    Object.assign(filterForm, lastSuccessfulExamFilter)
  } else {
    lastSuccessfulExamFilter = snapshotExamFilterForm()
  }
}

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
    shortcutTarget: 'exam-list-search',
    triggerSearchOnChange: false,
  },
  { key: 'dateRange', type: 'custom', width: 260, minWidth: 260, maxWidth: 320 },
])

watch(
  () => filterForm.academicYear,
  (academicYear) => {
    // 学年不得为空：清空时回退本学期，避免「全量列表 + 再选两级」的额外点击
    if (!academicYear?.trim()) {
      const current = resolveCurrentWorkbenchTerm()
      filterForm.academicYear = current.academicYear
      filterForm.semester = current.semester
      return
    }
    // 学年切换时保留学期编码；若学期仍空则补当前季节学期（一次切换即可查询）
    if (!filterForm.semester) {
      filterForm.semester = getDefaultAcademicYearAndSemester().semester
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
  { title: '操作', key: 'actions', align: 'center', width: 200, fixed: 'right' },
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
  { title: '操作', key: 'actions', align: 'center', width: 200, fixed: 'right' },
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
  { title: '操作', key: 'actions', align: 'center', width: 200, fixed: 'right' },
]

type ExamListTabKey = 'priority' | 'ongoing' | 'all'

const listTab = ref<ExamListTabKey>('priority')
/** 优先推进原因深链筛选；列表命中以服务端 priorityReasonCode 为唯一真源。 */
const priorityReasonFilter = ref<ExamWorkbenchPriorityReasonCode | undefined>(undefined)
/** SignalBand 显式下钻键；stale 等无法仅由 Tab/状态反推的范围依赖此字段。 */
type ExamListSignalDrillKey = 'filtered' | 'active' | 'closed' | 'stale'
const signalDrillKey = ref<ExamListSignalDrillKey | null>(null)

/** 路由深链写入 Tab 时抑制 watch 重复拉数。 */
let suppressListTabWatch = false
/** 路由显式 Tab：计数推断不得改写。 */
let routeExplicitListTab = false
/** 无显式 Tab 时仅允许成功计数后自动回退一次。 */
let autoResolvedListTabOnce = false
/** 列表加载世代：丢弃过期响应，避免 KPI/Tab 竞态覆盖。 */
let listLoadGeneration = 0

/** 考试时间窗相对阶段：挂在考试名称后，不占用考试时间列浮层。 */
function examWindowPhaseTag(
  exam: ExamWorkbenchSummaryResponse,
): { label: string, tone: 'orange' | 'green' | 'gray' } | null {
  const phase = resolveExamWindowPhase(exam.examStartTime, exam.examEndTime)
  if (!phase) {
    return null
  }
  return {
    label: formatExamWindowPhaseLabel(exam.examStartTime, exam.examEndTime),
    tone: phase === 'upcoming' ? 'orange' : phase === 'ongoing' ? 'green' : 'gray',
  }
}

function applyExamListDeepLinkFromRoute(): void {
  try {
    if (!hasExamListDeepLinkQuery(route.query)) {
      return
    }
    const deepLink = readExamListDeepLinkQuery(route.query)
    suppressListTabWatch = true
    try {
      if (deepLink.tab) {
        listTab.value = deepLink.tab
        routeExplicitListTab = true
      }
      if (deepLink.academicYear !== undefined) {
        filterForm.academicYear = deepLink.academicYear
      }
      if (deepLink.semester !== undefined) {
        filterForm.semester = deepLink.semester
      }
      // 概览 KPI 深链：带 tab/term/reason 时 status 以 query 为准；缺省=全部状态（对齐概览清空状态）
      if (
        Object.prototype.hasOwnProperty.call(route.query, 'status')
        || deepLink.tab
        || deepLink.academicYear
        || deepLink.priorityReason
      ) {
        filterForm.status = deepLink.status
      }
      // 深链覆盖 keep-alive 残留的 Signal 下钻
      signalDrillKey.value = null
      if (deepLink.priorityReason) {
        priorityReasonFilter.value = deepLink.priorityReason
        listTab.value = 'priority'
        routeExplicitListTab = true
      } else if (hasExamListDeepLinkQuery(route.query)) {
        // 显式深链但无原因时清掉旧原因筛选，避免 keep-alive 残留
        priorityReasonFilter.value = undefined
        if (deepLink.tab === 'ongoing') {
          signalDrillKey.value = 'active'
        } else if (deepLink.tab === 'all' && deepLink.status === ExamStatusCode.CLOSED) {
          signalDrillKey.value = 'closed'
        } else if (deepLink.tab === 'all') {
          signalDrillKey.value = 'filtered'
        }
      }
      if (filterForm.academicYear?.trim() && filterForm.semester) {
        writeMarkWorkbenchTermPreference({
          academicYear: filterForm.academicYear,
          semester: filterForm.semester,
          status: filterForm.status ?? null,
        })
      }
      resetAllTabPaginations()
    } finally {
      suppressListTabWatch = false
    }
  } catch (error) {
    priorityReasonFilter.value = undefined
    showUserError(error, '考试列表深链合同无效')
  }
}

function clearPriorityReasonFilter(): void {
  priorityReasonFilter.value = undefined
  const nextQuery = { ...route.query }
  delete nextQuery.priorityReason
  void router.replace({ query: nextQuery })
  resetAllTabPaginations()
  void loadTabData(ExamListScopeCode.PRIORITY)
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
    count: statusTotalsFailed.value ? '—' : priorityBadgeTotal.value,
    badgeTone: !statusTotalsFailed.value && priorityBadgeTotal.value > 0 ? 'orange' : 'gray',
  },
  {
    key: 'ongoing',
    label: '进行中',
    count: statusTotalsFailed.value ? '—' : ongoingBadgeTotal.value,
    badgeTone: !statusTotalsFailed.value && ongoingBadgeTotal.value > 0 ? 'green' : 'gray',
  },
  {
    key: 'all',
    label: '全部',
    count: statusTotalsFailed.value ? '—' : allBadgeTotal.value,
    badgeTone: 'blue',
  },
])

watch(listTab, () => {
  if (suppressListTabWatch) return
  // 用户或 KPI 显式切 Tab 后，禁止后续计数推断覆盖意图。
  routeExplicitListTab = true
  if (listTab.value !== 'priority' && priorityReasonFilter.value) {
    priorityReasonFilter.value = undefined
    const nextQuery = { ...route.query }
    delete nextQuery.priorityReason
    void router.replace({ query: nextQuery })
  }
  // Tab 与 Signal 下钻不一致时丢弃显式 drill，避免「高亮与列表脱节」
  const drill = signalDrillKey.value
  if (
    (drill === 'stale' && listTab.value !== 'priority')
    || (drill === 'active' && listTab.value !== 'ongoing')
    || (drill === 'filtered' && listTab.value !== 'all')
    || (drill === 'closed' && listTab.value !== 'all')
  ) {
    signalDrillKey.value = null
  }
  void reloadListAndCounts({ resolveTab: false })
})

/** 优先推进 / 进行中无数据时，依次回退到下一 Tab（全部始终可停留）。 */
function resolveListTabFromCounts(): void {
  if (statusTotalsFailed.value || routeExplicitListTab || autoResolvedListTabOnce) {
    return
  }
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
    autoResolvedListTabOnce = true
  } finally {
    suppressListTabWatch = false
  }
}

/**
 * SignalBand 高亮键：显式 drill 优先；Tab/状态可反推时同步高亮（不含「优先推进」默认态）。
 * 注意：不得把「优先为空自动回退进行中」当成用户 Signal 下钻。
 */
const activeExamListSignalKey = computed<ExamListSignalDrillKey | null>(() => {
  if (signalDrillKey.value) {
    return signalDrillKey.value
  }
  if (priorityReasonFilter.value) {
    return null
  }
  if (listTab.value === 'ongoing') {
    return 'active'
  }
  if (listTab.value === 'all' && filterForm.status === ExamStatusCode.CLOSED) {
    return 'closed'
  }
  return null
})

const summarySignalMetrics = computed((): SignalMetric[] => {
  const dash = '—'
  const allHitTotal = allBadgeTotal.value
  const ongoing = ongoingBadgeTotal.value
  const closed = closedTotal.value
  const stale = stalePushTotal.value
  const activeKey = activeExamListSignalKey.value
  const drill = signalDrillKey.value
  const closedSubset
    = listTab.value === 'all' && filterForm.status === ExamStatusCode.CLOSED
  return [
    {
      key: 'filtered',
      label: '全部命中',
      value: statusTotalsFailed.value ? dash : allHitTotal,
      unit: '场',
      tone: 'blue',
      iconTone: 'blue',
      helper: statusTotalsFailed.value
        ? undefined
        : drill === 'filtered'
          ? '当前筛选'
          : '点击筛选全部范围',
      clickable: !statusTotalsFailed.value,
      active: activeKey === 'filtered',
    },
    {
      key: 'active',
      label: '进行中',
      value: statusTotalsFailed.value ? dash : ongoing,
      unit: '场',
      tone: 'green',
      iconTone: 'green',
      helper: statusTotalsFailed.value
        ? undefined
        : drill === 'active'
          ? '当前筛选'
          : activeKey === 'active'
            ? '当前 Tab'
            : '点击筛选进行中',
      clickable: true,
      active: activeKey === 'active',
    },
    {
      key: 'closed',
      label: '已关闭',
      value: statusTotalsFailed.value ? dash : closed,
      unit: '场',
      tone: 'gray',
      iconTone: 'gray',
      helper: statusTotalsFailed.value
        ? undefined
        : drill === 'closed' || closedSubset
          ? '当前筛选'
          : '点击筛选已关闭',
      clickable: !statusTotalsFailed.value,
      active: activeKey === 'closed',
    },
    {
      key: 'stale',
      label: '超30天未推进',
      value: statusTotalsFailed.value ? dash : stale,
      unit: '场',
      tone: stale > 0 || activeKey === 'stale' ? 'orange' : 'gray',
      iconTone: 'gray',
      helper: statusTotalsFailed.value
        ? undefined
        : drill === 'stale'
          ? '当前筛选'
          : stale > 0
            ? '点击进入优先推进关注'
            : '暂无长期未推进',
      clickable: !statusTotalsFailed.value && (stale > 0 || activeKey === 'stale'),
      active: activeKey === 'stale',
    },
  ]
})

/** KPI 改状态/Tab 并写入下钻锚点；列表加载由 listTab watch 或同 Tab reload 承接。 */
function handleSummaryMetricClick(key: string): void {
  if (key === 'filtered') {
    if (statusTotalsFailed.value) {
      return
    }
    signalDrillKey.value = 'filtered'
    priorityReasonFilter.value = undefined
    if (filterForm.status === ExamStatusCode.CLOSED) {
      filterForm.status = undefined
    }
    resetAllTabPaginations()
    if (listTab.value === 'all') {
      void reloadListAndCounts({ resolveTab: false })
      return
    }
    listTab.value = 'all'
    return
  }
  if (key === 'active') {
    signalDrillKey.value = 'active'
    priorityReasonFilter.value = undefined
    if (filterForm.status === ExamStatusCode.CLOSED) {
      filterForm.status = undefined
    }
    resetAllTabPaginations()
    if (listTab.value === 'ongoing') {
      void reloadListAndCounts({ resolveTab: false })
      return
    }
    listTab.value = 'ongoing'
    return
  }
  if (key === 'closed' && !statusTotalsFailed.value) {
    signalDrillKey.value = 'closed'
    priorityReasonFilter.value = undefined
    filterForm.status = ExamStatusCode.CLOSED
    resetAllTabPaginations()
    if (listTab.value === 'all') {
      void reloadListAndCounts({ resolveTab: false })
      return
    }
    listTab.value = 'all'
    return
  }
  if (key === 'stale' && !statusTotalsFailed.value && stalePushTotal.value > 0) {
    signalDrillKey.value = 'stale'
    priorityReasonFilter.value = undefined
    if (filterForm.status === ExamStatusCode.CLOSED) {
      filterForm.status = undefined
    }
    resetAllTabPaginations()
    if (listTab.value === 'priority') {
      void reloadListAndCounts({ resolveTab: false })
      return
    }
    listTab.value = 'priority'
  }
}

const CONTEXT_FILTER_DEBOUNCE_MS = 250

/** 学年学期须始终成对；禁止空学年导致全量扫描后再手选两级。 */
function ensureExamListTermPair(): boolean {
  if (!filterForm.academicYear?.trim() || !filterForm.semester) {
    const current = resolveCurrentWorkbenchTerm()
    filterForm.academicYear = current.academicYear
    filterForm.semester = current.semester
  }
  return ensureAcademicYearSemesterPair(filterForm.academicYear, filterForm.semester)
}

function persistExamListTermPreference(): void {
  if (!filterForm.academicYear?.trim() || !filterForm.semester) {
    return
  }
  writeMarkWorkbenchTermPreference({
    academicYear: filterForm.academicYear,
    semester: filterForm.semester,
    status: filterForm.status ?? null,
  })
}

const debouncedContextFilterReload = debounce(() => {
  if (!ensureExamListTermPair()) {
    return
  }
  persistExamListTermPreference()
  resetAllTabPaginations()
  void reloadListAndCounts({ resolveTab: false })
}, CONTEXT_FILTER_DEBOUNCE_MS)

function handleContextFilterChange(): void {
  if (!filterForm.academicYear?.trim()) {
    const current = resolveCurrentWorkbenchTerm()
    filterForm.academicYear = current.academicYear
    filterForm.semester = current.semester
  } else if (!filterForm.semester) {
    filterForm.semester = getDefaultAcademicYearAndSemester().semester
  }
  // 学期/状态变更后旧 Signal 下钻语义失效，避免锚点撒谎
  signalDrillKey.value = null
  debouncedContextFilterReload()
}

const isCurrentTermSelected = computed(() => {
  const current = resolveCurrentWorkbenchTerm()
  return filterForm.academicYear === current.academicYear
    && filterForm.semester === current.semester
})

/** 一键回到当前学年学期，保留状态筛选。 */
function handleUseCurrentTerm(): void {
  const current = resolveCurrentWorkbenchTerm()
  filterForm.academicYear = current.academicYear
  filterForm.semester = current.semester
  debouncedContextFilterReload()
}

onUnmounted(() => {
  debouncedContextFilterReload.cancel()
})

/** 关考 / tip 待建袋 / 阅卷已满均可进 S1 复盘，避免协调人误走「新建课程考核袋」。 */
function isExamArchiveReady(exam: ExamWorkbenchSummaryResponse): boolean {
  return resolveExamArchiveReady(exam, isAttentionExam(exam.examId))
}

/** 教师视角：主考与 BE canManageOwnerExamLifecycleWrites 同源；其余为评阅。 */
function examParticipationLabel(exam: ExamWorkbenchSummaryResponse): string {
  return resolveExamParticipationLabel(exam, isAdminView.value)
}

function examParticipationTone(exam: ExamWorkbenchSummaryResponse): BadgeTone {
  return resolveExamParticipationTone(exam, isAdminView.value)
}

function examListCustomRow(record: ExamWorkbenchSummaryResponse) {
  return {
    onClick: (event: Event) => {
      const target = event.target
      if (
        target instanceof Element
        && target.closest(
          '.ant-checkbox-wrapper, .ant-table-selection-column, input[type="checkbox"]',
        )
      ) {
        return
      }
      goSmartExamEntry(record)
    },
  }
}

function examListRowClassName(record: ExamWorkbenchSummaryResponse): string {
  if (isAttentionExam(record.examId)) return 'exam-list-row--archive-attention'
  if (record.status === ExamStatusCode.CLOSED) return ''
  if (isExamPriorityRow(record)) return 'exam-list-row--priority'
  if (record.status === ExamStatusCode.ACTIVE) return 'exam-list-row--active'
  return ''
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
    priorityReasonCode:
      scope === ExamListScopeCode.PRIORITY ? priorityReasonFilter.value : undefined,
  }
}

function syncTabBadgeFromPagination(scope: ExamListScopeCode): void {
  // 原因筛选下的分页 total 不是全量优先推进数，徽章仍以 scope-counts 为准。
  if (scope === ExamListScopeCode.PRIORITY && priorityReasonFilter.value) {
    return
  }
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

/** 当前页内不再重排：S1 关注仅行样式/标签表达，排序以后端 ORDER BY 为准。 */

async function loadTabData(scope: ExamListScopeCode): Promise<void> {
  const generation = ++listLoadGeneration
  const paginationState = getPaginationByScope(scope)
  const dataSourceRef = getDataSourceRefByScope(scope)
  const loadingRef = getLoadingRefByScope(scope)
  loadingRef.value = true
  listLoadFailed.value = false
  try {
    const pageNum = paginationState.current ?? 1
    let result = await pageExamWorkbench(
      buildWorkbenchQuery(scope, pageNum, paginationState.pageSize ?? 10),
    )
    if (generation !== listLoadGeneration) {
      return
    }
    // 共享筛选变更后旧页码可能越界：空页且仍有命中时回第 1 页重试一次。
    if (
      (result.list?.length ?? 0) === 0
      && pageNum > 1
      && (result.total ?? 0) > 0
    ) {
      paginationState.current = 1
      result = await pageExamWorkbench(
        buildWorkbenchQuery(scope, 1, paginationState.pageSize ?? 10),
      )
      if (generation !== listLoadGeneration) {
        return
      }
    }
    dataSourceRef.value = result.list ?? []
    paginationState.total = result.total
    listLoadFailed.value = false
    lastSuccessfulExamFilter = snapshotExamFilterForm()
    if (result.pageNum != null) {
      paginationState.current = result.pageNum
    }
    if (result.pageSize != null) {
      paginationState.pageSize = result.pageSize
    }
    syncTabBadgeFromPagination(scope)
  } catch (error) {
    if (generation !== listLoadGeneration) {
      return
    }
    listLoadFailed.value = true
    showUserError(error, '考试列表加载失败')
    // 失败保留上一屏数据与 total，避免筛选失败后表格被清空（3.7.2 感知速度）
  } finally {
    if (generation === listLoadGeneration) {
      loadingRef.value = false
    }
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

function resetAllTabPaginations(): void {
  priorityPagination.current = 1
  ongoingPagination.current = 1
  allPagination.current = 1
}

function handleSearch(): void {
  resetAllTabPaginations()
  selectedRowKeys.value = []
  void reloadListAndCounts({ resolveTab: false }).then(() => {
    rollbackExamFilterOnLoadFailure()
  })
}

function handleReset(): void {
  // 重置 = 当前学期 + ACTIVE，并清关键字/日期/Signal 下钻；与「本学期」快捷一致
  const current = resolveCurrentWorkbenchTerm()
  Object.assign(filterForm, {
    academicYear: current.academicYear,
    semester: current.semester,
    status: ExamStatusCode.ACTIVE,
    keyword: '',
    dateRange: undefined,
  })
  signalDrillKey.value = null
  if (priorityReasonFilter.value) {
    priorityReasonFilter.value = undefined
    const nextQuery = { ...route.query }
    delete nextQuery.priorityReason
    void router.replace({ query: nextQuery })
  }
  resetAllTabPaginations()
  selectedRowKeys.value = []
  void reloadListAndCounts({ resolveTab: false }).then(() => {
    rollbackExamFilterOnLoadFailure()
  })
}

function handleUiPageChange(page: { current: number, pageSize: number }): void {
  const scope = tabToScope(listTab.value)
  const paginationState = getPaginationByScope(scope)
  paginationState.current = page.current
  paginationState.pageSize = page.pageSize
  selectedRowKeys.value = []
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
 * 原因筛选深链：入口唯一真源为行上 workspaceRouteName（后端已按筛选原因覆写）。
 * 无原因筛选：消费后端主因 workspaceRouteName / 智能入口合同。
 */
function goSmartExamEntry(exam: ExamWorkbenchSummaryResponse): void {
  const examId = exam.examId
  try {
    const reasonFilter = priorityReasonFilter.value
    if (reasonFilter) {
      if (!exam.priorityReasonCodes?.includes(reasonFilter)) {
        throw new Error(
          `考试 ${exam.examId} 未包含深链原因 ${reasonFilter}，与服务端过滤合同不一致`,
        )
      }
      const routeName = exam.workspaceRouteName?.trim()
      if (!routeName) {
        throw new Error(`考试 ${exam.examId} 缺少 workspaceRouteName 合同字段`)
      }
      if (routeName !== ExamWorkbenchPriorityReasonWorkspaceRoute[reasonFilter]) {
        throw new Error(
          `考试 ${exam.examId} 入口路由与筛选原因 ${reasonFilter} 不一致`,
        )
      }
      void router.push({ name: routeName, params: { examId } })
      return
    }
    const routeName = resolveSmartExamEntryRouteName(exam)
    void router.push({ name: routeName, params: { examId } })
  } catch (error) {
    showUserError(error, '考试入口路由合同无效')
  }
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

const selectedRowKeys = ref<Array<string | number>>([])
const hasPageRows = computed(() => currentDataSource.value.length > 0)

function handleExamListSelectionChange(rowKeys: Array<string | number>): void {
  selectedRowKeys.value = rowKeys
}

function selectAllCurrentPage(): void {
  selectedRowKeys.value = currentDataSource.value.map((row) => row.examId)
}

function clearExamListSelection(): void {
  selectedRowKeys.value = []
}

/** 当前页选中行（按 examId 映射） */
const selectedExamRows = computed(() => {
  const keySet = new Set(selectedRowKeys.value.map((key) => String(key)))
  return currentDataSource.value.filter((row) => keySet.has(String(row.examId)))
})

/** 可选批量关闭：主考生命周期写权限 + 未关闭 */
const batchCloseableExams = computed(() =>
  selectedExamRows.value.filter(
    (exam) => canManageOwnerExamLifecycle(exam) && exam.status !== ExamStatusCode.CLOSED,
  ),
)

/** 可选批量删除：主考生命周期写权限 + ACTIVE（与单场删除门禁一致） */
const batchDeletableExams = computed(() =>
  selectedExamRows.value.filter(
    (exam) => canManageOwnerExamLifecycle(exam) && exam.status === ExamStatusCode.ACTIVE,
  ),
)

const batchLifecycle = reactive(useExamListBatchLifecycle())

function confirmBatchClose(): void {
  if (examActionLoading.value || batchLifecycle.running) {
    return
  }
  const targets = batchCloseableExams.value
  if (targets.length === 0) {
    void message.warning('当前选中项均不可关闭（需主考权限且考试未关闭）')
    return
  }
  if (targets.length > EXAM_BATCH_LIFECYCLE_MAX) {
    void message.warning(`单次最多处理 ${EXAM_BATCH_LIFECYCLE_MAX} 场考试，请减少选择后重试`)
    return
  }
  const skipped = selectedRowKeys.value.length - targets.length
  void confirmAsync({
    title: `批量关闭 ${targets.length} 场考试？`,
    content:
      (skipped > 0 ? `将跳过 ${skipped} 场无权限或已关闭考试。` : '')
      + '关闭后考试进入 CLOSED，不可再编辑主信息；将逐场执行并实时展示进度，未发布成绩等门禁失败可重试或跳过。',
    okText: '开始关闭',
    cancelText: '取消',
    type: 'warning',
    onOk: async () => {
      clearExamListSelection()
      batchLifecycle.start('close', targets)
    },
  })
}

function confirmBatchDelete(): void {
  if (examActionLoading.value || batchLifecycle.running) {
    return
  }
  const targets = batchDeletableExams.value
  if (targets.length === 0) {
    void message.warning('当前选中项均不可删除（需主考权限且考试仍为进行中）')
    return
  }
  if (targets.length > EXAM_BATCH_LIFECYCLE_MAX) {
    void message.warning(`单次最多处理 ${EXAM_BATCH_LIFECYCLE_MAX} 场考试，请减少选择后重试`)
    return
  }
  const skipped = selectedRowKeys.value.length - targets.length
  void confirmAsync({
    title: `批量删除 ${targets.length} 场考试？`,
    content:
      (skipped > 0 ? `将跳过 ${skipped} 场无权限或不可删除考试。` : '')
      + '已进入模板、考生、印刷、扫描或成绩流程的考试不能删除；将逐场执行并实时展示进度，失败项可重试或跳过。',
    okText: '开始删除',
    cancelText: '取消',
    type: 'error',
    onOk: async () => {
      clearExamListSelection()
      batchLifecycle.start('delete', targets)
    },
  })
}

async function handleBatchProgressClose(): Promise<void> {
  if (batchLifecycle.running) {
    return
  }
  const hadSuccess = batchLifecycle.items.some((item) => item.status === 'success')
  batchLifecycle.closeDialog()
  if (hadSuccess) {
    await reloadAll()
  }
}

function handleBatchProgressRetry(examId: string): void {
  void batchLifecycle.retry(examId)
}

function handleBatchProgressSkip(examId: string): void {
  batchLifecycle.skip(examId)
}

function focusExamListSearch(): void {
  const field = document.querySelector(
    '.exam-list-page [data-shortcut-target="exam-list-search"]',
  )
  const input = field?.querySelector('input') as HTMLInputElement | null
  if (!input) {
    return
  }
  input.focus()
  input.select()
}

useExamListKeyboard({
  focusSearch: focusExamListSearch,
  createExam: goCreateExam,
  selectAllCurrentPage,
  hasPageRows,
})

watch(listTab, () => {
  selectedRowKeys.value = []
})

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
function resolveExamEnterActionLabel(exam: ExamWorkbenchSummaryResponse): string {
  const reasonFilter = priorityReasonFilter.value
  if (reasonFilter) {
    return ExamWorkbenchPriorityReasonEnterActionLabel[reasonFilter]
  }
  if (
    exam.primaryPriorityReasonCode
    === ExamWorkbenchPriorityReasonCode.CONFIRMED_UNPUBLISHED_SCORE
  ) {
    return '去发布'
  }
  return '进入'
}

function buildExamRowActions(exam: ExamWorkbenchSummaryResponse): UiTableRowActionItem[] {
  // 行内仅 1 个 primary：进入为默认主路径；阅卷为次操作
  const actions: UiTableRowActionItem[] = [
    { key: 'enter', label: resolveExamEnterActionLabel(exam), tone: 'primary' },
  ]
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
  if (!canManageOwnerExamLifecycle(exam) || examActionLoading.value || batchLifecycle.running) {
    return
  }
  void (async () => {
    try {
      const gate = await getArchiveVolumeExamGate(exam.examId)
      if ((gate.unpublishedBoundPaperCount ?? 0) > 0) {
        void confirmAsync({
          title: '尚不能关考',
          content: buildCloseExamBlockedContent(gate),
          okText: '前往成绩确认与发布',
          cancelText: '知道了',
          type: 'warning',
          onOk: async () => {
            await router.push({
              name: 'TeacherExamWorkspaceScoreSummary',
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
            void message.success('考试已关闭')
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
  if (!canManageOwnerExamLifecycle(exam) || examActionLoading.value || batchLifecycle.running) {
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
        void message.success('考试已删除')
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
  if (!ensureExamListTermPair()) {
    return
  }
  persistExamListTermPreference()
  await loadWorkbenchScopeCounts()
  if (options?.resolveTab !== false) {
    resolveListTabFromCounts()
  }
  await loadTabData(tabToScope(listTab.value))
}

async function reloadAll(): Promise<void> {
  await loadS1AutoCreateAttention()
  await reloadListAndCounts()
}

/**
 * 深链 / 激活统一入口：先应用 KPI query，再保证学期成对，最后拉数。
 * keep-alive 下同页仅 query 变化时也必须重跑（onActivated 不会再次触发）。
 */
async function bootstrapExamListFromRoute(): Promise<void> {
  applyExamListDeepLinkFromRoute()
  ensureExamListTermPair()
  const options = await loadFilterOptions()
  if (options) {
    const yearOk = !options.academicYears?.length
      || options.academicYears.includes(filterForm.academicYear ?? '')
    const semesterOk = !options.semesters?.length
      || (filterForm.semester != null && options.semesters.includes(filterForm.semester))
    if (!yearOk || !semesterOk) {
      const reconciled = resolveMarkWorkbenchTermFilter({
        academicYears: options.academicYears,
        semesters: options.semesters,
      })
      filterForm.academicYear = reconciled.academicYear
      filterForm.semester = reconciled.semester
    }
  }
  await reloadAll()
}

onActivated(() => {
  void bootstrapExamListFromRoute()
})

watch(
  () => [
    route.query.tab,
    route.query.academicYear,
    route.query.semester,
    route.query.status,
    route.query.priorityReason,
  ],
  (next, prev) => {
    if (route.name !== 'TeacherExamList') {
      return
    }
    if (prev == null) {
      return
    }
    if (JSON.stringify(next) === JSON.stringify(prev)) {
      return
    }
    void bootstrapExamListFromRoute()
  },
)
</script>

<style lang="scss" scoped>
.exam-list-page {
  width: 100%;
}

.exam-list__scope {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
  min-width: 0;
  max-width: 100%;
}

.exam-list__scope-item {
  flex: 0 1 8.25rem;
  width: 8.25rem;
  min-width: 7rem;
  max-width: 10rem;
}

.exam-list__scope-item--status {
  flex-basis: 7rem;
  width: 7rem;
  min-width: 6.5rem;
  max-width: 8.5rem;
}

.exam-list__scope-item :deep(.ui-select) {
  width: 100%;
  max-width: 100%;
}

.exam-list__scope-current-term {
  flex: 0 0 auto;
  white-space: nowrap;
}

.exam-list-page__selection-count {
  margin-right: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  font-variant-numeric: tabular-nums;
}

.exam-list-page__scope-head {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
}

.exam-list-page__empty {
  padding: var(--dp-space-page) var(--dp-space-block);
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
  gap: var(--dp-space-component-tight);
  min-width: 0;
  max-width: 100%;
}

.exam-list-page__exam-name {
  font-weight: 500;
  color: var(--dp-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.exam-list-page__exam-name--link {
  display: inline;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--dp-text-primary);
  font: inherit;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: color var(--dp-duration-fast) var(--dp-ease-default);

  &:hover {
    color: var(--dp-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--dp-color-primary);
    outline-offset: 2px;
    border-radius: 2px;
  }
}

.exam-list-page__exam-no {
  font-size: var(--dp-font-size-xs);
  line-height: 1.4;
  color: var(--dp-text-muted);
}

.exam-list-page__exam-no-code {
  font-family: var(--dp-font-family-code);
}

.exam-list-page__term-year {
  font-family: var(--dp-font-family-code);
  font-size: var(--dp-font-size-xs);
}

.exam-list-page__term-semester {
  margin-top: 1px;
  font-size: var(--dp-font-size-xxs);
  color: var(--dp-text-quaternary);
}

.exam-list-page__status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
}

.exam-list-page__status-dot {
  /* 高频列表：静态圆点 + Tag 文字；禁止无限 pulse */
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: var(--dp-space-component-xs);
  border-radius: 50%;
  background: var(--dp-success);
  animation: none;
}

.exam-list-page__progress {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
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
  transition: transform var(--dp-duration-normal) var(--dp-ease-default);
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
  font-size: var(--dp-font-size-xs);
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
  overflow: hidden;
  transition: background var(--dp-duration-fast) var(--dp-ease-default);
}

.exam-table :deep(.ant-table-tbody > tr:hover > td) {
  background: color-mix(in srgb, var(--dp-color-primary) 4%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--priority > td) {
  background: color-mix(in srgb, var(--dp-warning) 8%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--priority:hover > td) {
  background: color-mix(in srgb, var(--dp-warning) 12%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--active > td) {
  background: color-mix(in srgb, var(--dp-color-primary) 6%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--active:hover > td) {
  background: color-mix(in srgb, var(--dp-color-primary) 10%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--archive-attention > td) {
  background: color-mix(in srgb, var(--dp-warning) 10%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--archive-attention:hover > td) {
  background: color-mix(in srgb, var(--dp-warning) 14%, var(--dp-surface));
}

.exam-table :deep(.ant-table-cell-fix-left),
.exam-table :deep(.ant-table-cell-fix-right) {
  background: var(--dp-surface);
}

.exam-table :deep(.exam-list-row--priority > td.ant-table-cell-fix-left),
.exam-table :deep(.exam-list-row--priority > td.ant-table-cell-fix-right) {
  background: color-mix(in srgb, var(--dp-warning) 8%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--active > td.ant-table-cell-fix-left),
.exam-table :deep(.exam-list-row--active > td.ant-table-cell-fix-right) {
  background: color-mix(in srgb, var(--dp-color-primary) 6%, var(--dp-surface));
}

.exam-table :deep(tr:hover > td.ant-table-cell-fix-left),
.exam-table :deep(tr:hover > td.ant-table-cell-fix-right) {
  background: color-mix(in srgb, var(--dp-color-primary) 4%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--priority:hover > td.ant-table-cell-fix-left),
.exam-table :deep(.exam-list-row--priority:hover > td.ant-table-cell-fix-right) {
  background: color-mix(in srgb, var(--dp-warning) 12%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--active:hover > td.ant-table-cell-fix-left),
.exam-table :deep(.exam-list-row--active:hover > td.ant-table-cell-fix-right) {
  background: color-mix(in srgb, var(--dp-color-primary) 10%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--archive-attention > td.ant-table-cell-fix-left),
.exam-table :deep(.exam-list-row--archive-attention > td.ant-table-cell-fix-right) {
  background: color-mix(in srgb, var(--dp-warning) 10%, var(--dp-surface));
}

.exam-table :deep(.exam-list-row--archive-attention:hover > td.ant-table-cell-fix-left),
.exam-table :deep(.exam-list-row--archive-attention:hover > td.ant-table-cell-fix-right) {
  background: color-mix(in srgb, var(--dp-warning) 14%, var(--dp-surface));
}

.muted {
  color: var(--dp-text-muted);
}
</style>
