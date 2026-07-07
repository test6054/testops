<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="考试列表" :subtitle="pageSubtitle">
        <template #status>
          <a-select
            v-model:value="filterForm.academicYear"
            :options="academicYearOptions"
            style="width: 120px"
            placeholder="学年"
            allow-clear
            @change="handleContextFilterChange"
          />
          <a-select
            v-model:value="filterForm.semester"
            :options="semesterSelectOptions"
            style="width: 120px"
            placeholder="学期"
            allow-clear
            :disabled="!filterForm.academicYear"
            @change="handleContextFilterChange"
          />
          <a-select
            v-model:value="filterForm.status"
            :options="statusSelectOptions"
            style="width: 120px"
            placeholder="状态"
            allow-clear
            @change="handleContextFilterChange"
          />
        </template>
        <template #actions>
          <UiButton size="sm" @click="goCreateExam">
            <template #icon><PlusOutlined /></template>
            新建考试
          </UiButton>
        </template>
      </ContextBar>
    </template>

    <template #signal>
      <SignalBand
        variant="tiles"
        compact
        :metrics="summarySignalMetrics"
        @metric-click="handleSummaryMetricClick"
      />
    </template>

    <UiAlertStrip
      v-if="statusTotalsFailed"
      tone="warning"
      title="概览计数暂不可用"
      description="Tab 计数与 Signal 汇总加载失败，列表数据仍可浏览；请稍后刷新重试。"
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
            <a-range-picker
              v-model:value="filterForm.dateRange"
              style="width: 260px"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD HH:mm:ss"
              :placeholder="['开始日期', '结束日期']"
              allow-clear
            />
          </template>
        </UiFilterBar>
      </template>

      <UiEmpty
        v-if="listLoadFailed"
        description="考试列表加载失败"
        action-label="重试"
        class="exam-list-page__empty"
        @action="() => reloadListAndCounts()"
      />
      <UiEmpty
        v-else-if="listTab === 'priority' && !priorityLoading && priorityPagination.total === 0"
        description="暂无优先推进的考试"
        class="exam-list-page__empty"
      />
      <UiEmpty
        v-else-if="listTab === 'ongoing' && !ongoingLoading && ongoingPagination.total === 0"
        description="暂无进行中的考试"
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
        class="exam-table student-detail-table__data-table"
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
                  :style="{ width: `${Math.min(getExamGradingPercent(record), 100)}%` }"
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

    <section class="exam-list-page__next-steps">
      <header class="exam-list-page__next-steps-head">
        <ClockCircleOutlined class="exam-list-page__next-steps-icon" />
        <span>下一步行动</span>
      </header>
      <div class="exam-list-page__next-steps-grid">
        <button type="button" class="exam-list-page__next-step" @click="goAiAnalysisCenter">
          <span class="exam-list-page__next-step-badge">AI</span>
          <span class="exam-list-page__next-step-body">
            <span class="exam-list-page__next-step-label">教学质量分析</span>
            <span class="exam-list-page__next-step-desc">跨考试维度的 AI 洞察与达成度分析</span>
          </span>
        </button>
        <button type="button" class="exam-list-page__next-step" @click="goArchiveVolumeList">
          <span class="exam-list-page__next-step-badge">归</span>
          <span class="exam-list-page__next-step-body">
            <span class="exam-list-page__next-step-label">历史归档管理</span>
            <span class="exam-list-page__next-step-desc">查看已关闭考试的归档卷状态</span>
          </span>
        </button>
        <button type="button" class="exam-list-page__next-step" @click="goAuditTrail">
          <span class="exam-list-page__next-step-badge">审</span>
          <span class="exam-list-page__next-step-body">
            <span class="exam-list-page__next-step-label">考试审计日志</span>
            <span class="exam-list-page__next-step-desc">全链路操作审计与合规追踪</span>
          </span>
        </button>
      </div>
    </section>
  </StageWorkbenchShell>

  <!-- 考试维护 Drawer -->
  <UiDrawer
    :open="formModalOpen"
    title="编辑考试"
    :width="560"
    :confirm-loading="saving"
    :mask-closable="false"
    ok-text="保存"
    :hide-footer="false"
    @update:open="(v: boolean) => (formModalOpen = v)"
    @close="formModalOpen = false"
    @confirm="handleSave"
  >
    <UiSkeletonState v-if="editDetailLoading" variant="card" compact />
    <a-form v-else ref="formRef" :model="examForm" :rules="examFormRules" layout="vertical">
      <a-form-item label="课程" name="courseId">
        <CatalogCourseSelector
          v-model:value="examForm.courseId"
          placeholder="选择课程"
          :allow-clear="false"
        />
      </a-form-item>
      <a-form-item label="考试名称" name="examName">
        <a-input
          v-model:value="examForm.examName"
          placeholder="例如：2026 春《工程制图》期末"
          :maxlength="100"
          show-count
        />
      </a-form-item>
      <a-form-item label="考务编号" name="examNo">
        <a-input
          v-model:value="examForm.examNo"
          placeholder="教务系统编号或自定义编号"
          :maxlength="64"
        />
      </a-form-item>
      <a-form-item label="学年" name="academicYear">
        <a-input v-model:value="examForm.academicYear" placeholder="2024-2025" :maxlength="9" />
      </a-form-item>
      <a-form-item label="学期" name="semester">
        <a-select
          v-model:value="examForm.semester"
          placeholder="选择学期"
          allow-clear
          :options="SemesterOptions"
        />
      </a-form-item>
      <a-form-item label="考试时间窗" name="examWindow">
        <a-range-picker
          v-model:value="examForm.examWindow"
          style="width: 100%"
          show-time
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          :placeholder="['开始时间', '结束时间']"
        />
      </a-form-item>
      <a-form-item label="阅卷策略" name="gradingStrategy">
        <a-input :value="ExamGradingStrategyDescription[ExamGradingStrategyCode.SINGLE]" disabled />
      </a-form-item>
      <a-form-item label="成绩构成" name="scoreCompositionMode">
        <a-radio-group v-model:value="examForm.scoreCompositionMode">
          <a-radio value="EXAM_ONLY">仅计入考试成绩（期末笔试）</a-radio>
          <a-radio value="EXAM_WITH_DAILY">期末考试 + 平时成绩合成</a-radio>
        </a-radio-group>
        <div class="exam-list-form__composition-hint">
          平时成绩指出勤、作业、课堂表现等；选择合成后，成绩确认时需为每位考生录入平时分，总成绩=考试分+平时分。
        </div>
      </a-form-item>
      <a-form-item
        v-if="examForm.scoreCompositionMode === 'EXAM_WITH_DAILY'"
        label="平时成绩满分"
        name="dailyScoreFull"
      >
        <a-input-number
          v-model:value="examForm.dailyScoreFull"
          :min="0.01"
          :max="1000"
          :precision="2"
          style="width: 100%"
          placeholder="例如 30（与培养方案中平时分满分一致）"
        />
      </a-form-item>
      <a-form-item label="备注" name="remark">
        <a-textarea
          v-model:value="examForm.remark"
          :rows="3"
          placeholder="可填写考试用途、班级范围说明等"
          :maxlength="500"
          show-count
        />
      </a-form-item>
      <a-form-item label="涉密场次" name="confidential">
        <a-switch v-model:checked="examForm.confidential" :disabled="editDetailLoading" />
      </a-form-item>
    </a-form>
    <template #footer>
      <UiButton variant="outline" :disabled="saving" @click="formModalOpen = false">取消</UiButton>
      <UiButton :loading="saving" :disabled="editDetailLoading" @click="handleSave">保存</UiButton>
    </template>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type {
  ExamPageQueryRequest,
  ExamScorePolicyCode,
  ExamUpdateRequest,
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
import ClockCircleOutlined from '@ant-design/icons-vue/ClockCircleOutlined'
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
  EXAM_STATUS_FILTER_OPTIONS,
  EXAM_STATUS_TONE,
  ExamGradingStrategyCode,
  ExamGradingStrategyDescription,
  ExamKindCode,
  ExamKindDescription,
  ExamListScopeCode,
  ExamStatusCode,
  ExamStatusDescription,
  getExamDetail,
  pageExamWorkbench,
  updateExam,
} from '@/apis/mark/exam'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  buildCloseExamBlockedContent,
  buildCloseExamReadyContent,
} from '@/composables/useExamArchiveGateHint'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import {
  generateAcademicYearOptions,
  getDefaultAcademicYearAndSemester,
} from '@/utils/academic-year'
import {
  buildOptionalAcademicYearSemesterQuery,
  ensureAcademicYearSemesterPair,
} from '@/utils/academic-year-semester-query'
import { rejectFormValidation, showUserError } from '@/utils/error-handler'
import { readExamListDeepLinkQuery } from '@/utils/exam-list-navigation'
import {
  countBlockingScanAttention,
  resolveSmartExamEntryRouteName,
} from '@/utils/exam-workspace-entry-gates'
import { formatDateTime } from '@/utils/format'
import { resolveScanStageEntryRoute } from '@/utils/resolve-scan-stage-entry'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ExamListExamWindowCell from '@/views/teacher/components/ExamListExamWindowCell.vue'

defineOptions({ name: 'TeacherExamList' })

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const userStore = useUserStore()

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
const filterForm = reactive<ExamListFilterForm>(createDefaultFilterForm())

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const statusOptions = EXAM_STATUS_FILTER_OPTIONS
const academicYearOptions = computed(() =>
  generateAcademicYearOptions().map((year) => ({ label: year, value: year })),
)
const semesterSelectOptions = computed(() =>
  SemesterOptions.map((item) => ({ label: item.label, value: item.value })),
)
const statusSelectOptions = computed(() =>
  statusOptions.map((item) => ({ label: item.label, value: item.value })),
)

const pageSubtitle = computed(() => {
  const parts: string[] = []
  if (filterForm.academicYear) parts.push(filterForm.academicYear)
  if (filterForm.semester) parts.push(formatSemester(filterForm.semester))
  const scope = parts.length ? parts.join(' ') : '全部学年学期'
  return `${scope} · 共 ${allBadgeTotal.value} 场考试`
})

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

type ExamScoreCompositionMode = 'EXAM_ONLY' | 'EXAM_WITH_DAILY'

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
    align: 'center',
    ellipsis: true,
    width: 360,
    fixed: 'left',
  },
  { title: '学年', key: 'academicYear', width: 120, fixed: 'left' },
  { title: '学期', key: 'semester', width: 88, fixed: 'left' },
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
    align: 'center',
    ellipsis: true,
    width: 300,
    fixed: 'left',
  },
  { title: '学年', key: 'academicYear', width: 120, fixed: 'left' },
  { title: '学期', key: 'semester', width: 88, fixed: 'left' },
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
    align: 'center',
    ellipsis: true,
    width: 300,
    fixed: 'left',
  },
  { title: '学年', key: 'academicYear', width: 120, fixed: 'left' },
  { title: '学期', key: 'semester', width: 88, fixed: 'left' },
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
  return [
    {
      key: 'filtered',
      label: '筛选命中',
      value: filteredTotal,
      unit: '场',
      tone: 'blue',
      clickable: true,
    },
    {
      key: 'active',
      label: '进行中',
      value: statusTotalsFailed.value ? dash : ongoingBadgeTotal.value,
      unit: '场',
      tone: 'green',
      clickable: true,
    },
    {
      key: 'closed',
      label: '已关闭',
      value: statusTotalsFailed.value ? dash : closedTotal.value,
      unit: '场',
      tone: 'gray',
      clickable: !statusTotalsFailed.value,
    },
    {
      key: 'stale',
      label: '待推进',
      value: statusTotalsFailed.value ? dash : stalePushTotal.value,
      unit: '场',
      tone: stalePushTotal.value > 0 ? 'orange' : 'gray',
      clickable: !statusTotalsFailed.value && stalePushTotal.value > 0,
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
  const parts: string[] = []
  if (exam.examNo?.trim()) {
    parts.push(exam.examNo.trim())
  }
  if (exam.departmentName?.trim()) {
    parts.push(exam.departmentName.trim())
  }
  return parts.join(' · ')
}

function isExamArchiveReady(exam: ExamWorkbenchSummaryResponse): boolean {
  return exam.status === ExamStatusCode.CLOSED && getExamGradingPercent(exam) >= 100
}

function examListCustomRow(record: ExamWorkbenchSummaryResponse) {
  return {
    onClick: () => goSmartExamEntry(record),
  }
}

function examListRowClassName(record: ExamWorkbenchSummaryResponse): string {
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

/** 教师视角：主考为自己创建；其余可见考试均为被分配批阅任务或题组评阅。 */
function examParticipationLabel(exam: ExamWorkbenchSummaryResponse): string {
  if (!!exam.createUser && exam.createUser === userStore.userInfo.userId) {
    return '主考'
  }
  if (isAdminView.value) {
    return '—'
  }
  return '评阅'
}

function examParticipationTone(exam: ExamWorkbenchSummaryResponse): BadgeTone {
  if (!!exam.createUser && exam.createUser === userStore.userInfo.userId) {
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
    dataSourceRef.value = result.list
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
  } catch {
    statusTotalsFailed.value = true
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

function goArchiveVolumeList(): void {
  void router.push({ name: 'TeacherArchiveVolumeList' })
}

function goAiAnalysisCenter(): void {
  void router.push({ name: 'TeacherAiAnalysisCenter' })
}

function goAuditTrail(): void {
  void router.push({ name: 'AdminAuditTrail' })
}

// ─── KPI 概览：workbench-scope-counts 返回 CLOSED；Signal「进行中」与 Tab 共用 ongoingCount ─
const closedTotal = ref<number>(0)
const statusTotalsFailed = ref(false)

const formModalOpen = ref(false)
const editDetailLoading = ref(false)
const saving = ref(false)
const editingExamId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const examForm = reactive<{
  courseId: string | null
  examName: string
  examNo: string
  academicYear?: string
  semester?: SemesterCode
  examWindow?: [string, string]
  gradingStrategy: ExamGradingStrategyCode
  scoreCompositionMode: ExamScoreCompositionMode
  dailyScoreFull?: number
  confidential: boolean
  examKind: ExamKindCode
  sourceExamId?: string
  scorePolicy?: ExamScorePolicyCode
  remark?: string
}>({
  courseId: null,
  examName: '',
  examNo: '',
  academicYear: '',
  semester: undefined,
  examWindow: undefined,
  gradingStrategy: ExamGradingStrategyCode.SINGLE,
  scoreCompositionMode: 'EXAM_ONLY',
  dailyScoreFull: undefined,
  confidential: false,
  examKind: ExamKindCode.REGULAR,
  sourceExamId: undefined,
  scorePolicy: undefined,
  remark: '',
})

const examFormRules: Record<string, Rule[]> = {
  courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
  examName: [
    { required: true, message: '请输入考试名称', trigger: 'blur' },
    { max: 100, message: '考试名称最多 100 个字符', trigger: 'blur' },
  ],
  examNo: [
    { required: true, message: '请输入考务编号', trigger: 'blur' },
    { max: 64, message: '考务编号最多 64 个字符', trigger: 'blur' },
  ],
  academicYear: [
    {
      validator: async (): Promise<void> => {
        const academicYear = examForm.academicYear?.trim()
        if (!academicYear && !examForm.semester) return
        if (!academicYear || !examForm.semester) {
          return rejectFormValidation('学年与学期必须同时填写或同时留空')
        }
        const match = /^(\d{4})-(\d{4})$/.exec(academicYear)
        if (!match || Number(match[2]) !== Number(match[1]) + 1) {
          return rejectFormValidation('学年格式应为 2024-2025')
        }
      },
      trigger: 'blur',
    },
  ],
  semester: [
    {
      validator: async (): Promise<void> => {
        const academicYear = examForm.academicYear?.trim()
        if (!academicYear && !examForm.semester) return
        if (!academicYear || !examForm.semester) {
          return rejectFormValidation('学年与学期必须同时填写或同时留空')
        }
      },
      trigger: 'change',
    },
  ],
  examWindow: [
    {
      validator: async (): Promise<void> => {
        const [startTime, endTime] = examForm.examWindow ?? []
        if (!startTime || !endTime) {
          return rejectFormValidation('请选择考试时间窗')
        }
      },
      trigger: 'change',
    },
  ],
  dailyScoreFull: [
    {
      validator: async (): Promise<void> => {
        if (examForm.scoreCompositionMode !== 'EXAM_WITH_DAILY') return
        const value = examForm.dailyScoreFull
        if (value == null || value <= 0) {
          return rejectFormValidation('请填写平时成绩满分（须大于 0）')
        }
        if (value > 1000) {
          return rejectFormValidation('平时成绩满分不能超过 1000')
        }
      },
      trigger: 'change',
    },
  ],
  remark: [{ max: 500, message: '备注最多 500 个字符', trigger: 'blur' }],
}

function resetExamForm(): void {
  editingExamId.value = null
  editDetailLoading.value = false
  examForm.courseId = null
  examForm.examName = ''
  examForm.examNo = ''
  examForm.academicYear = ''
  examForm.semester = undefined
  examForm.examWindow = undefined
  examForm.gradingStrategy = ExamGradingStrategyCode.SINGLE
  examForm.scoreCompositionMode = 'EXAM_ONLY'
  examForm.dailyScoreFull = undefined
  examForm.confidential = false
  examForm.examKind = ExamKindCode.REGULAR
  examForm.sourceExamId = undefined
  examForm.scorePolicy = undefined
  examForm.remark = ''
  formRef.value?.clearValidate()
}

function goCreateExam(): void {
  void router.push({ name: 'TeacherExamCreate' })
}

async function openEditModal(exam: ExamWorkbenchSummaryResponse): Promise<void> {
  resetExamForm()
  editingExamId.value = exam.examId
  examForm.courseId = exam.courseId ?? null
  examForm.examName = exam.examName
  examForm.examNo = exam.examNo
  examForm.academicYear = exam.academicYear ?? ''
  examForm.semester = exam.semester
  examForm.examWindow
    = exam.examStartTime && exam.examEndTime ? [exam.examStartTime, exam.examEndTime] : undefined
  examForm.scoreCompositionMode = exam.dailyScoreFull != null ? 'EXAM_WITH_DAILY' : 'EXAM_ONLY'
  examForm.dailyScoreFull = exam.dailyScoreFull ?? undefined
  examForm.examKind = exam.examKind ?? ExamKindCode.REGULAR
  examForm.sourceExamId = exam.sourceExamId
  examForm.scorePolicy = exam.scorePolicy
  examForm.remark = exam.remark ?? ''
  editDetailLoading.value = true
  formModalOpen.value = true
  try {
    const detail = await getExamDetail(exam.examId)
    if (editingExamId.value !== exam.examId) return
    examForm.confidential = detail.confidential === true
    examForm.examKind = detail.examKind ?? examForm.examKind
    examForm.sourceExamId = detail.sourceExamId
    examForm.scorePolicy = detail.scorePolicy
  } catch (error) {
    formModalOpen.value = false
    editingExamId.value = null
    showUserError(error, '考试详情加载失败')
  } finally {
    if (editingExamId.value === exam.examId) {
      editDetailLoading.value = false
    }
  }
}

function buildExamUpdateRequest(): ExamUpdateRequest | null {
  const [startTime, endTime] = examForm.examWindow ?? []
  if (!examForm.courseId || !startTime || !endTime || !editingExamId.value) {
    message.error('请选择考试课程与考试时间')
    return null
  }
  const academicYear = examForm.academicYear?.trim()
  return {
    examId: editingExamId.value,
    courseId: examForm.courseId,
    examName: examForm.examName.trim(),
    examNo: examForm.examNo.trim(),
    academicYear: academicYear || undefined,
    semester: examForm.semester || undefined,
    examStartTime: startTime,
    examEndTime: endTime,
    gradingStrategy: ExamGradingStrategyCode.SINGLE,
    dailyScoreFull:
      examForm.scoreCompositionMode === 'EXAM_WITH_DAILY' ? examForm.dailyScoreFull : null,
    confidential: examForm.confidential,
    remark: examForm.remark?.trim() || undefined,
  }
}

async function handleSave(): Promise<void> {
  if (editDetailLoading.value) {
    message.warning('考试详情加载中，请稍候再保存')
    return
  }
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const request = buildExamUpdateRequest()
    if (!request) {
      return
    }
    await updateExam(request)
    message.success('考试已更新')
    formModalOpen.value = false
    await reloadAll()
  } catch (error) {
    showUserError(error, '保存考试失败')
  } finally {
    saving.value = false
  }
}

function isExamOwner(exam: ExamWorkbenchSummaryResponse): boolean {
  return !!exam.createUser && exam.createUser === userStore.userInfo.userId
}

/** 组装考试列表行内操作：默认展示 3 项，其余由 UiTableActions 收入「更多」。 */
function buildExamRowActions(exam: ExamWorkbenchSummaryResponse): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [{ key: 'enter', label: '进入' }]
  if (exam.status === ExamStatusCode.ACTIVE) {
    actions.push({ key: 'marking', label: '阅卷', tone: 'primary' })
  }
  if (isExamArchiveReady(exam)) {
    actions.push({ key: 'archive', label: '归档' })
  }
  if (exam.status !== ExamStatusCode.CLOSED) {
    actions.push({ key: 'edit', label: '编辑' })
    if (isExamOwner(exam)) {
      actions.push({ key: 'close', label: '关闭' })
      actions.push({ key: 'delete', label: '删除', tone: 'danger' })
    }
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
      goArchiveVolumeList()
      break
    case 'edit':
      openEditModal(exam)
      break
    case 'close':
      confirmClose(exam)
      break
    case 'delete':
      confirmDelete(exam)
      break
  }
}

function confirmClose(exam: ExamWorkbenchSummaryResponse): void {
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
          try {
            await closeExam({ examId: exam.examId })
            message.success('考试已关闭')
            await reloadAll()
          } catch (error) {
            showUserError(error, '关闭考试失败')
          }
        },
      })
    } catch (error) {
      showUserError(error, '加载关考前置条件失败')
    }
  })()
}

function confirmDelete(exam: ExamWorkbenchSummaryResponse): void {
  void confirmAsync({
    title: `删除考试 ${exam.examName}？`,
    content: '已进入模板、考生、印刷、扫描或成绩流程的考试不能删除。',
    okText: '删除',
    cancelText: '取消',
    type: 'error',
    onOk: async () => {
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
  await reloadListAndCounts()
}

onActivated(() => {
  applyExamListDeepLinkFromRoute()
  void reloadAll()
})
</script>

<style lang="scss" scoped>
.exam-list-page__count-alert {
  margin-bottom: var(--dp-space-3);
}

.exam-list-page__scope-head {
  display: flex;
  align-items: center;
  width: 100%;
}

.exam-list-page__empty {
  padding: var(--dp-space-10) var(--dp-space-5);
}

.exam-list-page__exam-name-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  text-align: center;
}

.exam-list-page__exam-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.exam-list-page__exam-name {
  font-weight: 500;
  color: var(--ant-color-text);
}

.exam-list-page__exam-name--link {
  color: var(--ant-color-primary);
}

.exam-list-page__exam-no {
  font-size: 12px;
  line-height: 1.4;
  color: var(--ant-color-text-tertiary);
}

.exam-list-page__exam-no-code {
  font-family: var(--dp-font-mono, ui-monospace, monospace);
}

.exam-list-page__term-year {
  font-family: var(--dp-font-mono, ui-monospace, monospace);
  font-size: 12px;
}

.exam-list-page__term-semester {
  margin-top: 1px;
  font-size: 11px;
  color: var(--ant-color-text-quaternary);
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
  background: var(--ant-color-primary);
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
  background: var(--ant-color-fill-quaternary);
}

.exam-list-page__progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--ant-color-primary);
  transition: width 200ms ease;
}

.exam-list-page__progress-fill--success {
  background: var(--ant-color-success);
}

.exam-list-page__progress-fill--warning {
  background: var(--ant-color-warning);
}

.exam-list-page__progress-pct {
  flex-shrink: 0;
  min-width: 32px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--ant-color-text-secondary);
}

.exam-list-page__progress-pct--ok {
  color: var(--ant-color-success);
}

.exam-list-page__progress-pct--warn {
  color: var(--ant-color-warning);
}

.exam-list-page__progress-pct--zero {
  color: var(--ant-color-text-quaternary);
}

.exam-list-page__next-steps {
  margin-top: var(--dp-space-4);
  padding: var(--dp-space-4);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-panel, 8px);
  background: var(--dp-surface, #fff);
}

.exam-list-page__next-steps-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: var(--dp-space-3);
  font-size: 14px;
  font-weight: 600;
  color: var(--ant-color-text);
}

.exam-list-page__next-steps-icon {
  color: var(--ant-color-primary);
  font-size: 14px;
}

.exam-list-page__next-steps-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-3);
}

.exam-list-page__next-step {
  display: flex;
  flex: 1;
  min-width: 160px;
  gap: var(--dp-space-2);
  padding: var(--dp-space-3);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: 6px;
  background: var(--dp-surface, #fff);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;

  &:hover {
    border-color: var(--ant-color-primary-border);
    box-shadow: 0 2px 8px rgb(22 119 255 / 8%);
  }
}

.exam-list-page__next-step-badge {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--ant-color-primary) 10%, transparent);
  font-size: 11px;
  font-weight: 700;
  color: var(--ant-color-primary);
}

.exam-list-page__next-step-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.exam-list-page__next-step-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ant-color-text);
}

.exam-list-page__next-step-desc {
  font-size: 12px;
  line-height: 1.4;
  color: var(--ant-color-text-quaternary);
}

.exam-table :deep(.ant-table-tbody > tr > td) {
  vertical-align: middle;
}

.exam-table :deep(.ant-table-tbody > tr) {
  cursor: pointer;
}

.exam-table :deep(.exam-list-row--priority > td:first-child) {
  box-shadow: inset 3px 0 0 var(--ant-color-warning);
}

.exam-table :deep(.exam-list-row--active > td:first-child) {
  box-shadow: inset 3px 0 0 var(--ant-color-primary-border);
}

.exam-table :deep(.ant-table-cell-fix-left),
.exam-table :deep(.ant-table-cell-fix-right) {
  background: var(--dp-surface, #fff);
}

.exam-table :deep(.ant-table-tbody > tr:hover > td.ant-table-cell-fix-left),
.exam-table :deep(.ant-table-tbody > tr:hover > td.ant-table-cell-fix-right) {
  background: var(--dp-gray-50, #f8fafc) !important;
}

.exam-list-page__exam-window {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.4;
}

.exam-list-page__exam-window-range {
  font-size: 13px;
  white-space: nowrap;
}

.exam-list-page__exam-window-phase {
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.exam-list-page__exam-window-phase--upcoming {
  color: var(--ant-color-warning);
}

.exam-list-page__exam-window-phase--ongoing {
  color: #52c41a;
}

.muted {
  color: var(--ant-color-text-tertiary);
}

.exam-list-form__composition-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ant-color-text-tertiary);
}
</style>
