<template>
  <StageWorkbenchShell>
    <template #signal>
      <UiStatPanel
        :items="summaryStatItems"
        :columns="4"
        variant="strip"
        compact
        class="exam-list-page__signals"
      />
    </template>

    <UiSectionTabs
      v-model="listTab"
      :items="examListTabs"
      compact
      class="exam-list-page__tabs"
    >
      <section class="exam-list-page__tab-panel">
        <div v-if="listTab === 'all'" class="exam-list-page__table-toolbar">
          <UiButton size="sm" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            新建考试
          </UiButton>
        </div>

        <UiFilterBar
          v-model="filterModel"
          :fields="filterFields"
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

        <UiEmpty
          v-if="listTab === 'priority' && !priorityLoading && priorityPagination.total === 0"
          description="暂无优先推进的考试"
        />
        <UiEmpty
          v-else-if="listTab === 'ongoing' && !ongoingLoading && ongoingPagination.total === 0"
          description="暂无进行中的考试"
        />

        <UiDataTable
          v-else
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
          @page-change="handleUiPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'examName'">
              <span class="exam-list-page__exam-name">{{ record.examName }}</span>
              <div v-if="record.examNo" class="exam-list-page__exam-no">编号：{{ record.examNo }}</div>
            </template>
            <template v-else-if="column.key === 'academicTerm'">
              <span v-if="formatAcademicTerm(record)">
                {{ formatAcademicTerm(record) }}
              </span>
              <span v-else class="muted">未设置</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="examStatusTone(record)" size="sm">
                {{ examStatusLabel(record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'role'">
              <UiTag :tone="examParticipationTone(record)" size="sm">
                {{ examParticipationLabel(record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'progress'">
              <span v-if="getExamProgressText(record)" class="exam-list-page__progress-text">
                {{ getExamProgressText(record) }}
              </span>
              <span v-else class="muted">—</span>
            </template>
            <template v-else-if="column.key === 'pendingConfirm'">
              <UiTag
                v-if="getPendingConfirmCount(record) > 0"
                tone="orange"
                size="sm"
              >
                {{ getPendingConfirmCount(record) }} 题
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
            <template v-else-if="column.key === 'scanAttention'">
              <UiTag
                v-if="getScanAttentionCount(record) > 0"
                tone="red"
                size="sm"
              >
                {{ getScanAttentionCount(record) }} 条
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
            <template v-else-if="column.key === 'openMarking'">
              <UiTag
                v-if="getOpenMarkingCount(record) > 0"
                tone="blue"
                size="sm"
              >
                {{ getOpenMarkingCount(record) }} 份
              </UiTag>
              <span v-else class="muted">0</span>
            </template>
            <template v-else-if="column.key === 'examWindow'">
              <span v-if="record.examStartTime || record.examEndTime">
                {{ formatDateTime(record.examStartTime) }}
                <span class="time-divider">~</span>
                {{ formatDateTime(record.examEndTime) }}
              </span>
              <span v-else class="muted">未设置</span>
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatDateTime(record.createTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="operations-cell operations-cell--split" @click.stop>
                <button
                  type="button"
                  class="op-link"
                  :class="{ 'op-link--primary': record.status !== 'CLOSED' }"
                  @click="goSmartExamEntry(record)"
                >
                  进入考试
                </button>
                <template v-if="record.status !== 'CLOSED'">
                  <span class="operations-cell__sep" aria-hidden="true" />
                  <button type="button" class="op-link" @click="openEditModal(record)">
                    编辑
                  </button>
                  <template v-if="isExamOwner(record)">
                    <span class="operations-cell__sep" aria-hidden="true" />
                    <button type="button" class="op-link" @click="confirmClose(record)">
                      关闭
                    </button>
                    <span class="operations-cell__sep" aria-hidden="true" />
                    <button type="button" class="op-link op-link--danger" @click="confirmDelete(record)">
                      删除
                    </button>
                  </template>
                </template>
              </div>
            </template>
          </template>
        </UiDataTable>
      </section>
    </UiSectionTabs>
  </StageWorkbenchShell>

  <!-- 考试维护弹窗 -->
  <a-modal
    v-model:open="formModalOpen"
    :title="isEditMode ? '编辑考试' : '新建考试'"
    :confirm-loading="saving"
    :destroy-on-close="true"
    :mask-closable="false"
    width="560px"
    @ok="handleSave"
  >
    <a-form ref="formRef" :model="examForm" :rules="examFormRules" layout="vertical">
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
      <a-form-item label="阅卷策略（可选）" name="gradingStrategy">
        <a-select
          v-model:value="examForm.gradingStrategy"
          placeholder="选择阅卷策略，留空使用租户默认"
          allow-clear
          :options="gradingStrategyOptions"
        />
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
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type {
  ExamCreateRequest,
  ExamListScopeCode,
  ExamStatusCode,
  ExamWorkbenchSummaryVO,
  GradingStrategyCode,
} from '@/apis/mark/exam'
import type { BadgeTone, FilterField, UiSectionTabItem, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import ClockCircleOutlined from '@ant-design/icons-vue/ClockCircleOutlined'
import FilterOutlined from '@ant-design/icons-vue/FilterOutlined'
import LockOutlined from '@ant-design/icons-vue/LockOutlined'
import PlayCircleOutlined from '@ant-design/icons-vue/PlayCircleOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  closeExam,
  createExam,
  deleteExam,
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  GRADING_STRATEGY_LABEL,
  pageExamWorkbench,
  updateExam,
} from '@/apis/mark/exam'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { resolveScanStageEntryRoute } from '@/utils/resolve-scan-stage-entry'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamList' })

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

/**
 * 是否全租户审计读视角。
 *
 * <p>与后端 ExamMarkPermissionService.hasFullTenantReadView() 对齐：
 * 仅平台超管 + 企业管理员（CROP_ADMIN / CROP_USER）享有跨主考可见性；
 * 租户管理员（SCH_TECH + isTenantAdmin）在阅卷链路上与普通教师一致，
 * 仅可见自己创建 + 被分配评阅的考试。这是用户口径下的"禁止越权"硬约束。</p>
 *
 * <p>后端 listExamPage 切面已强制按角色注入 createUserId，前端传值在教师视角下被忽略；
 * 这个 computed 仅用于 UI 显隐（创建人列、教师下钻控件、KPI 文案）。</p>
 */
const isAdminView = computed(() => {
  const role = authStore.userRole
  return (
    role === RoleEnum.SUPER_ADMIN || role === RoleEnum.CROP_ADMIN || role === RoleEnum.CROP_USER
  )
})

interface ExamListFilterForm {
  status?: ExamStatusCode
  academicYear?: string
  semester?: string
  keyword?: string
  dateRange?: [string, string]
}

function createDefaultFilterForm(): ExamListFilterForm {
  return {
    status: undefined,
    academicYear: '',
    semester: undefined,
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
  set: (value) => { Object.assign(filterForm, value) },
})

const statusOptions: Array<{ label: string, value: ExamStatusCode }> = [
  { label: EXAM_STATUS_LABEL.ACTIVE, value: 'ACTIVE' },
  { label: EXAM_STATUS_LABEL.CLOSED, value: 'CLOSED' },
]
const filterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    placeholder: '全部状态',
    allowClear: true,
    width: 140,
    minWidth: 140,
    options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
  },
  {
    key: 'academicYear',
    type: 'input',
    placeholder: '2024-2025',
    allowClear: true,
    width: 150,
    minWidth: 150,
    triggerSearchOnChange: false,
  },
  {
    key: 'semester',
    type: 'select',
    placeholder: '全部学期',
    allowClear: true,
    width: 140,
    minWidth: 140,
    options: SemesterOptions.map((item) => ({ label: item.label, value: item.value })),
  },
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
]

const gradingStrategyOptions = Object.entries(GRADING_STRATEGY_LABEL).map(([value, label]) => ({
  value,
  label,
}))

type ExamScoreCompositionMode = 'EXAM_ONLY' | 'EXAM_WITH_DAILY'

const priorityDataSource = ref<ExamWorkbenchSummaryVO[]>([])
const ongoingDataSource = ref<ExamWorkbenchSummaryVO[]>([])
const allDataSource = ref<ExamWorkbenchSummaryVO[]>([])
const priorityLoading = ref(false)
const ongoingLoading = ref(false)
const allLoading = ref(false)
const priorityPagination = reactive<TablePaginationConfig>(createPaginationState())
const ongoingPagination = reactive<TablePaginationConfig>(createPaginationState())
const allPagination = reactive<TablePaginationConfig>(createPaginationState())
const priorityBadgeTotal = ref(0)
const ongoingBadgeTotal = ref(0)
const allBadgeTotal = ref(0)

const allTabColumns: ColumnType<ExamWorkbenchSummaryVO>[] = [
  { title: '考试名称', dataIndex: 'examName', key: 'examName', ellipsis: true, width: 240, fixed: 'left' },
  { title: '学年学期', key: 'academicTerm', width: 180, fixed: 'left' },
  { title: '状态', key: 'status', width: 100 },
  { title: '阅卷进度', key: 'progress', width: 120 },
  { title: '考试时间', key: 'examWindow', width: 280 },
  { title: '创建时间', key: 'createTime', width: 180 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const workbenchTabColumns: ColumnType<ExamWorkbenchSummaryVO>[] = [
  { title: '考试名称', dataIndex: 'examName', key: 'examName', ellipsis: true, width: 220, fixed: 'left' },
  { title: '学年学期', key: 'academicTerm', width: 160, fixed: 'left' },
  { title: '状态', key: 'status', width: 88 },
  { title: '阅卷进度', key: 'progress', width: 108 },
  { title: '待确认题数', key: 'pendingConfirm', width: 108 },
  { title: '扫描异常', key: 'scanAttention', width: 96 },
  { title: '进行中批阅', key: 'openMarking', width: 108 },
  { title: '考试时间', key: 'examWindow', width: 240 },
  { title: '创建时间', key: 'createTime', width: 168 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

const ongoingTabColumns: ColumnType<ExamWorkbenchSummaryVO>[] = [
  { title: '考试名称', dataIndex: 'examName', key: 'examName', ellipsis: true, width: 220, fixed: 'left' },
  { title: '学年学期', key: 'academicTerm', width: 160, fixed: 'left' },
  { title: '状态', key: 'status', width: 88 },
  { title: '参与角色', key: 'role', width: 88 },
  { title: '阅卷进度', key: 'progress', width: 108 },
  { title: '待确认题数', key: 'pendingConfirm', width: 108 },
  { title: '扫描异常', key: 'scanAttention', width: 96 },
  { title: '进行中批阅', key: 'openMarking', width: 108 },
  { title: '考试时间', key: 'examWindow', width: 240 },
  { title: '创建时间', key: 'createTime', width: 168 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

type ExamListTabKey = 'priority' | 'ongoing' | 'all'

const listTab = ref<ExamListTabKey>('priority')

const tableColumns = computed<ColumnType<ExamWorkbenchSummaryVO>[]>(() => {
  if (listTab.value === 'all') {
    return allTabColumns
  }
  if (listTab.value === 'ongoing') {
    return ongoingTabColumns
  }
  return workbenchTabColumns
})

const currentDataSource = computed<ExamWorkbenchSummaryVO[]>(() => {
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

watch(listTab, (tab) => {
  void loadTabData(tabToScope(tab))
})

const summaryStatItems = computed<UiStatPanelItem[]>(() => {
  const dash = '—'
  const filteredTotal = currentPagination.value.total ?? 0
  return [
    {
      key: 'filtered',
      label: '筛选命中',
      value: filteredTotal,
      unit: '场',
      tone: 'blue',
      icon: FilterOutlined,
    },
    {
      key: 'active',
      label: '进行中',
      value: statusTotalsFailed.value ? dash : activeTotal.value,
      unit: '场',
      tone: 'green',
      icon: PlayCircleOutlined,
    },
    {
      key: 'closed',
      label: '已关闭',
      value: statusTotalsFailed.value ? dash : closedTotal.value,
      unit: '场',
      tone: 'gray',
      icon: LockOutlined,
    },
    {
      key: 'stale',
      label: '待推进',
      value: staleExamCount.value,
      unit: '场',
      tone: (staleExamCount.value > 0 ? 'orange' : 'gray') as BadgeTone,
      icon: ClockCircleOutlined,
    },
  ]
})

/** 从列表行内嵌进度字段提取待确认题数、扫描异常与进行中批阅任务数。 */
function resolveExamProgressSnapshot(exam: ExamWorkbenchSummaryVO): {
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

function getPendingConfirmCount(exam: ExamWorkbenchSummaryVO): number {
  return resolveExamProgressSnapshot(exam).pendingGrades
}

function getScanAttentionCount(exam: ExamWorkbenchSummaryVO): number {
  return resolveExamProgressSnapshot(exam).scanAttention
}

function getOpenMarkingCount(exam: ExamWorkbenchSummaryVO): number {
  return resolveExamProgressSnapshot(exam).openMarking
}

/** 教师视角：主考为自己创建；其余可见考试均为被分配批阅任务或题组评阅。 */
function examParticipationLabel(exam: ExamWorkbenchSummaryVO): string {
  if (!!exam.createUser && exam.createUser === userStore.userInfo.userId) {
    return '主考'
  }
  if (isAdminView.value) {
    return '—'
  }
  return '评阅'
}

function examParticipationTone(exam: ExamWorkbenchSummaryVO): BadgeTone {
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
    return 'PRIORITY'
  }
  if (tab === 'ongoing') {
    return 'ONGOING'
  }
  return 'ALL'
}

function getPaginationByScope(scope: ExamListScopeCode): TablePaginationConfig {
  if (scope === 'PRIORITY') {
    return priorityPagination
  }
  if (scope === 'ONGOING') {
    return ongoingPagination
  }
  return allPagination
}

function getDataSourceRefByScope(scope: ExamListScopeCode): typeof priorityDataSource {
  if (scope === 'PRIORITY') {
    return priorityDataSource
  }
  if (scope === 'ONGOING') {
    return ongoingDataSource
  }
  return allDataSource
}

function getLoadingRefByScope(scope: ExamListScopeCode): typeof priorityLoading {
  if (scope === 'PRIORITY') {
    return priorityLoading
  }
  if (scope === 'ONGOING') {
    return ongoingLoading
  }
  return allLoading
}

function getBadgeTotalRefByScope(scope: ExamListScopeCode): typeof priorityBadgeTotal {
  if (scope === 'PRIORITY') {
    return priorityBadgeTotal
  }
  if (scope === 'ONGOING') {
    return ongoingBadgeTotal
  }
  return allBadgeTotal
}

function buildWorkbenchQuery(
  scope: ExamListScopeCode,
  pageNum: number,
  pageSize: number,
): Parameters<typeof pageExamWorkbench>[0] {
  const [startTime, endTime] = filterForm.dateRange ?? []
  return {
    listScope: scope,
    pageNum,
    pageSize,
    status: filterForm.status,
    academicYear: filterForm.academicYear?.trim() || undefined,
    semester: filterForm.semester,
    keyword: filterForm.keyword?.trim() || undefined,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    createUserId: isAdminView.value ? null : userStore.userInfo.userId || undefined,
  }
}

async function loadTabData(scope: ExamListScopeCode): Promise<void> {
  const paginationState = getPaginationByScope(scope)
  const dataSourceRef = getDataSourceRefByScope(scope)
  const loadingRef = getLoadingRefByScope(scope)
  const badgeRef = getBadgeTotalRefByScope(scope)
  loadingRef.value = true
  try {
    const result = await pageExamWorkbench(buildWorkbenchQuery(
      scope,
      paginationState.current ?? 1,
      paginationState.pageSize ?? 10,
    ))
    dataSourceRef.value = readPageList(result, '考试列表加载失败，请稍后重试')
    paginationState.total = readPageTotal(result)
    badgeRef.value = readPageTotal(result)
    if (result.pageNum != null) {
      paginationState.current = result.pageNum
    }
    if (result.pageSize != null) {
      paginationState.pageSize = result.pageSize
    }
  } catch (error) {
    showUserError(error, '考试列表加载失败')
    dataSourceRef.value = []
    paginationState.total = 0
    badgeRef.value = 0
  } finally {
    loadingRef.value = false
  }
}

async function loadTabBadgeTotal(scope: ExamListScopeCode): Promise<void> {
  const badgeRef = getBadgeTotalRefByScope(scope)
  try {
    const result = await pageExamWorkbench(buildWorkbenchQuery(scope, 1, 1))
    badgeRef.value = readPageTotal(result, '考试列表计数加载失败')
  } catch {
    badgeRef.value = 0
  }
}

async function refreshAllTabBadges(): Promise<void> {
  await Promise.all([
    loadTabBadgeTotal('PRIORITY'),
    loadTabBadgeTotal('ONGOING'),
    loadTabBadgeTotal('ALL'),
  ])
}

function resetCurrentTabPagination(): void {
  getPaginationByScope(tabToScope(listTab.value)).current = 1
}

function handleSearch(): void {
  resetCurrentTabPagination()
  void loadTabData(tabToScope(listTab.value))
  void refreshAllTabBadges()
}

function handleReset(): void {
  Object.assign(filterForm, createDefaultFilterForm())
  resetCurrentTabPagination()
  void loadTabData(tabToScope(listTab.value))
  void refreshAllTabBadges()
}

function handleUiPageChange(page: { current: number, pageSize: number }): void {
  const scope = tabToScope(listTab.value)
  const paginationState = getPaginationByScope(scope)
  paginationState.current = page.current
  paginationState.pageSize = page.pageSize
  void loadTabData(scope)
}

function getExamProgressText(exam: ExamWorkbenchSummaryVO): string {
  const totalGrades = exam.totalQuestionGradeCount
  const confirmed = exam.confirmedQuestionGradeCount
  if (totalGrades <= 0) {
    return exam.questionCount <= 0 ? '无题目' : ''
  }
  return `${confirmed}/${totalGrades} 题`
}

// helper 严格 typed 接收后端 API 对象 ExamWorkbenchSummaryVO，模板侧使用表格 slot record 保留当前行引用。
function examStatusTone(exam: ExamWorkbenchSummaryVO): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, exam.status, '考试状态')
}

function examStatusLabel(exam: ExamWorkbenchSummaryVO): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, exam.status, '考试状态')
}

function formatAcademicTerm(exam: ExamWorkbenchSummaryVO): string {
  if (!exam.academicYear && !exam.semester) return ''
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}

/**
 * 根据考试当前进度，智能跳转到最优操作入口。
 *
 * ACTIVE：扫描异常 → 准备 → 复核 → 阅卷 → 成绩确认。
 * CLOSED：进入考试概览，工作台内各阶段为只读查看。
 */
function goSmartExamEntry(exam: ExamWorkbenchSummaryVO): void {
  const examId = exam.examId
  if (exam.status === 'CLOSED') {
    void router.push({ name: 'TeacherExamWorkspaceOverview', params: { examId } })
    return
  }
  if (exam.scanAttentionCount > 0) {
    void router.push(resolveScanStageEntryRoute(examId, { scanAttentionCount: exam.scanAttentionCount }))
    return
  }
  if (exam.totalQuestionGradeCount <= 0) {
    if (exam.questionCount <= 0) {
      void router.push({ name: 'TeacherExamWorkspacePrep', params: { examId } })
    } else {
      void router.push(resolveScanStageEntryRoute(examId, { scanAttentionCount: 0 }))
    }
    return
  }
  if (exam.pendingReviewTaskCount > 0 || exam.inProgressReviewTaskCount > 0) {
    void router.push({ name: 'TeacherExamWorkspaceReviewBatchConfirm', params: { examId } })
    return
  }
  if (exam.openProcessingTaskCount > 0) {
    void router.push({ name: 'TeacherExamWorkspaceMarkingTaskPool', params: { examId } })
    return
  }
  if (Math.max(0, exam.totalQuestionGradeCount - exam.confirmedQuestionGradeCount) > 0) {
    void router.push({ name: 'TeacherExamWorkspaceMarkingTaskPool', params: { examId } })
    return
  }
  void router.push({ name: 'TeacherExamWorkspaceScoreSummary', params: { examId } })
}

// ─── KPI 概览：单独维护进行中 / 已关闭的全量计数 ─────────────────
const activeTotal = ref<number>(0)
const closedTotal = ref<number>(0)
const statusTotalsFailed = ref(false)

async function loadStatusTotals(): Promise<void> {
  statusTotalsFailed.value = false
  try {
    const [activeResult, closedResult] = await Promise.all([
      pageExamWorkbench({
        ...buildWorkbenchQuery('ALL', 1, 1),
        status: 'ACTIVE',
      }),
      pageExamWorkbench({
        ...buildWorkbenchQuery('ALL', 1, 1),
        status: 'CLOSED',
      }),
    ])
    activeTotal.value = readPageTotal(activeResult, '考试状态计数加载失败')
    closedTotal.value = readPageTotal(closedResult, '考试状态计数加载失败')
  } catch {
    statusTotalsFailed.value = true
    activeTotal.value = 0
    closedTotal.value = 0
  }
}

// 当前 Tab 当前页中创建超过 7 天且仍 ACTIVE 的考试数（推进风险信号，仅本页采样）
const staleExamCount = computed<number>(() => {
  const threshold = dayjs().subtract(7, 'day')
  return currentDataSource.value.filter((item) => {
    if (item.status !== 'ACTIVE' || !item.createTime) return false
    return dayjs(item.createTime).isBefore(threshold)
  }).length
})

const formModalOpen = ref(false)
const saving = ref(false)
const editingExamId = ref<string | null>(null)
const isEditMode = computed(() => !!editingExamId.value)
const formRef = ref<FormInstance>()
const examForm = reactive<{
  courseId: string | null
  examName: string
  examNo: string
  academicYear?: string
  semester?: string
  examWindow?: [string, string]
  gradingStrategy?: GradingStrategyCode
  scoreCompositionMode: ExamScoreCompositionMode
  dailyScoreFull?: number
  remark?: string
}>({
  courseId: null,
  examName: '',
  examNo: '',
  academicYear: '',
  semester: undefined,
  examWindow: undefined,
  gradingStrategy: undefined,
  scoreCompositionMode: 'EXAM_ONLY',
  dailyScoreFull: undefined,
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
          throw new Error('学年与学期必须同时填写或同时留空')
        }
        const match = /^(\d{4})-(\d{4})$/.exec(academicYear)
        if (!match || Number(match[2]) !== Number(match[1]) + 1) {
          throw new Error('学年格式应为 2024-2025')
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
          throw new Error('学年与学期必须同时填写或同时留空')
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
          throw new Error('请选择考试时间窗')
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
          throw new Error('请填写平时成绩满分（须大于 0）')
        }
        if (value > 1000) {
          throw new Error('平时成绩满分不能超过 1000')
        }
      },
      trigger: 'change',
    },
  ],
  remark: [{ max: 500, message: '备注最多 500 个字符', trigger: 'blur' }],
}

function resetExamForm(): void {
  editingExamId.value = null
  examForm.courseId = null
  examForm.examName = ''
  examForm.examNo = ''
  examForm.academicYear = ''
  examForm.semester = undefined
  examForm.examWindow = undefined
  examForm.gradingStrategy = undefined
  examForm.scoreCompositionMode = 'EXAM_ONLY'
  examForm.dailyScoreFull = undefined
  examForm.remark = ''
  formRef.value?.clearValidate()
}

function openCreateModal(): void {
  resetExamForm()
  formModalOpen.value = true
}

function openEditModal(exam: ExamWorkbenchSummaryVO): void {
  resetExamForm()
  editingExamId.value = exam.examId
  examForm.courseId = exam.courseId ?? null
  examForm.examName = exam.examName
  examForm.examNo = exam.examNo
  examForm.academicYear = exam.academicYear ?? ''
  examForm.semester = exam.semester
  examForm.examWindow
    = exam.examStartTime && exam.examEndTime ? [exam.examStartTime, exam.examEndTime] : undefined
  examForm.gradingStrategy = exam.gradingStrategy
  examForm.scoreCompositionMode = exam.dailyScoreFull != null ? 'EXAM_WITH_DAILY' : 'EXAM_ONLY'
  examForm.dailyScoreFull = exam.dailyScoreFull ?? undefined
  examForm.remark = exam.remark ?? ''
  formModalOpen.value = true
}

function buildExamRequest(): ExamCreateRequest | null {
  const [startTime, endTime] = examForm.examWindow ?? []
  if (!examForm.courseId || !startTime || !endTime) {
    message.error('请选择考试课程与考试时间')
    return null
  }
  return {
    courseId: examForm.courseId,
    examName: examForm.examName.trim(),
    examNo: examForm.examNo.trim(),
    academicYear: examForm.academicYear?.trim() || undefined,
    semester: examForm.semester,
    examStartTime: startTime,
    examEndTime: endTime,
    gradingStrategy: examForm.gradingStrategy,
    dailyScoreFull: examForm.scoreCompositionMode === 'EXAM_WITH_DAILY'
      ? examForm.dailyScoreFull
      : null,
    remark: examForm.remark?.trim() || undefined,
  }
}

async function handleSave(): Promise<void> {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    const request = buildExamRequest()
    if (!request) {
      return
    }
    if (editingExamId.value) {
      await updateExam({ examId: editingExamId.value, ...request })
      message.success('考试已更新')
    } else {
      const examId = await createExam(request)
      message.success('考试已创建')
      allPagination.current = 1
      formModalOpen.value = false
      listTab.value = 'all'
      await reloadAll()
      void confirmAsync({
        title: '下一步：配置考生名册',
        content: '考试已创建。请选定班级并纳入考生后保存名册，否则扫描后无法完成身份绑定。',
        okText: '去配置考生',
        cancelText: '稍后再说',
        type: 'info',
        onOk: () => {
          void router.push({
            name: 'TeacherExamWorkspaceCandidateRoster',
            params: { examId },
            query: { setup: '1' },
          })
        },
      })
      return
    }
    formModalOpen.value = false
    await reloadAll()
  } catch (error) {
    showUserError(error, '保存考试失败')
  } finally {
    saving.value = false
  }
}

function isExamOwner(exam: ExamWorkbenchSummaryVO): boolean {
  return !!exam.createUser && exam.createUser === userStore.userInfo.userId
}

function confirmClose(exam: ExamWorkbenchSummaryVO): void {
  void confirmAsync({
    title: `关闭考试 ${exam.examName}？`,
    content: '关闭后考试进入 CLOSED 状态，可进入考后归档与质量评价；关闭后不可再编辑考试主信息。',
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
}

function confirmDelete(exam: ExamWorkbenchSummaryVO): void {
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

async function reloadAll(): Promise<void> {
  await Promise.all([
    loadTabData(tabToScope(listTab.value)),
    refreshAllTabBadges(),
    loadStatusTotals(),
  ])
}

onMounted(() => {
  void reloadAll()
})

onActivated(() => {
  void reloadAll()
})
</script>

<style lang="scss" scoped>
.exam-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exam-list-page__signals {
  margin-bottom: 0;
}

.exam-list-page__tabs {
  margin-bottom: 0;
}

.exam-list-page__tab-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.exam-list-page__table-toolbar {
  display: flex;
  justify-content: flex-end;
}

.exam-list-page__progress-text {
  font-size: 13px;
}

.exam-list-page__exam-name {
  font-weight: 500;
  color: var(--ant-color-text);
}

.exam-list-page__exam-no {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.exam-table :deep(.ant-table-cell-fix-left),
.exam-table :deep(.ant-table-cell-fix-right) {
  background: var(--dp-surface, #fff);
}

.exam-table :deep(.ant-table-tbody > tr:hover > td.ant-table-cell-fix-left),
.exam-table :deep(.ant-table-tbody > tr:hover > td.ant-table-cell-fix-right) {
  background: var(--dp-gray-50, #f8fafc) !important;
}

.time-divider {
  margin: 0 4px;
  color: var(--ant-color-text-tertiary);
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
