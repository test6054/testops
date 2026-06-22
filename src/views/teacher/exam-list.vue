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
      <section v-if="listTab === 'priority'" class="exam-list-page__tab-panel">
        <UiEmpty
          v-if="recommendedExams.length === 0"
          description="当前无需要优先推进的考试"
        />
        <ul v-else class="exam-list-page__recommend-list">
          <li
            v-for="item in recommendedExams"
            :key="item.examId"
            class="exam-list-page__recommend-item"
          >
            <div class="exam-list-page__recommend-main">
              <div class="exam-list-page__recommend-title-row">
                <strong>{{ item.examName }}</strong>
                <span v-if="item.examNo" class="exam-list-page__recommend-no">
                  考务编号 {{ item.examNo }}
                </span>
                <UiTag v-if="item.attention > 0" tone="red" size="sm">
                  {{ item.attention }} 条扫描异常
                </UiTag>
                <UiTag tone="orange" size="sm">待确认 {{ item.pending }} 题</UiTag>
                <UiTag tone="blue" size="sm">完成率 {{ item.completeRate }}%</UiTag>
              </div>
              <div class="exam-list-page__recommend-meta">
                已确认 {{ item.confirmedGrades }} / {{ item.totalGrades }} 题
              </div>
            </div>
            <div class="operations-cell exam-list-page__recommend-actions">
              <UiTextAction tone="primary" @click="goSmartExamEntry(item.examId)">
                进入考试
              </UiTextAction>
              <UiTextAction
                v-if="item.attention > 0"
                @click="goScanLiveMonitor(item.examId)"
              >
                异常
              </UiTextAction>
              <UiTextAction tone="primary" @click="goMarkingTaskPool(item.examId)">
                阅卷
              </UiTextAction>
            </div>
          </li>
        </ul>
      </section>

      <section v-else class="exam-list-page__tab-panel">
        <div class="exam-list-page__table-toolbar">
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



        <UiDataTable
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :columns="columns"
          :data-source="dataSource"
          :loading="loading"
          :total="pagination.total"
          row-key="examId"
          size="middle"
          flat
          class="exam-table student-detail-table__data-table"
          @page-change="handleUiPageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'examName'">
              <button type="button" class="link-cell" @click="goSmartExamEntry(record.examId)">
                {{ record.examName }}
              </button>
              <div v-if="record.examNo" class="link-cell__sub">编号：{{ record.examNo }}</div>
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
            <template v-else-if="column.key === 'progress'">
              <span v-if="getExamProgressText(record.examId)" class="exam-list-page__progress-text">
                {{ getExamProgressText(record.examId) }}
              </span>
              <span v-else class="muted">—</span>
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
              <div class="operations-cell" @click.stop>
                <UiTextAction
                  v-if="record.status !== 'CLOSED'"
                  tone="primary"
                  @click="goSmartExamEntry(record.examId)"
                >
                  进入考试
                </UiTextAction>
                <UiTextAction
                  v-if="record.status !== 'CLOSED'"
                  @click="openEditModal(record)"
                >
                  编辑
                </UiTextAction>
                <UiTextAction
                  v-if="record.status !== 'CLOSED' && isExamOwner(record)"
                  @click="confirmClose(record)"
                >
                  关闭
                </UiTextAction>
                <UiTextAction
                  v-if="record.status !== 'CLOSED' && isExamOwner(record)"
                  tone="danger"
                  @click="confirmDelete(record)"
                >
                  删除
                </UiTextAction>
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
  ExamStatusCode,
  ExamSummaryVO,
  GradingStrategyCode,
} from '@/apis/mark/exam'
import type { MarkingProgressVO } from '@/apis/mark/exam-progress'
import type { BadgeTone, FilterField, UiSectionTabItem, UiStatPanelItem } from '@/components/ui-guide/ui/types'
import CheckCircleOutlined from '@ant-design/icons-vue/CheckCircleOutlined'
import ClockCircleOutlined from '@ant-design/icons-vue/ClockCircleOutlined'
import FileSearchOutlined from '@ant-design/icons-vue/FileSearchOutlined'
import FilterOutlined from '@ant-design/icons-vue/FilterOutlined'
import LockOutlined from '@ant-design/icons-vue/LockOutlined'
import PlayCircleOutlined from '@ant-design/icons-vue/PlayCircleOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import SyncOutlined from '@ant-design/icons-vue/SyncOutlined'
import WarningOutlined from '@ant-design/icons-vue/WarningOutlined'
import message from 'ant-design-vue/es/message'
import Modal from 'ant-design-vue/es/modal'
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
  pageExams,
  updateExam,
} from '@/apis/mark/exam'
import { batchGetMarkingProgress } from '@/apis/mark/exam-progress'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiStatPanel from '@/components/ui-guide/ui/UiStatPanel.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
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

const filterForm = reactive<{
  status?: ExamStatusCode
  academicYear?: string
  semester?: string
  keyword?: string
  dateRange?: [string, string]
}>({
  status: undefined,
  academicYear: '',
  semester: undefined,
  keyword: '',
  dateRange: undefined,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm as Record<string, unknown>,
  set: (value) => {
    Object.assign(filterForm, value)
  },
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

const dataSource = ref<ExamSummaryVO[]>([])
const loading = ref(false)
const pagination = reactive<TablePaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns: ColumnType<ExamSummaryVO>[] = [
  { title: '考试名称', dataIndex: 'examName', key: 'examName', ellipsis: true, width: 240 },
  { title: '学年学期', key: 'academicTerm', width: 180 },
  { title: '状态', key: 'status', width: 100 },
  { title: '阅卷进度', key: 'progress', width: 120 },
  { title: '考试时间', key: 'examWindow', width: 280 },
  { title: '创建时间', key: 'createTime', width: 180 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

const examProgressMap = ref<Map<string, MarkingProgressVO>>(new Map())
const progressLoading = ref(false)

const progressReady = computed<boolean>(() => !progressLoading.value)

const progressAggregate = computed(() => {
  let pendingReview = 0
  let inProgressReview = 0
  let openProcessing = 0
  let scanAttention = 0
  let unconfirmedQuestionGrades = 0
  for (const p of examProgressMap.value.values()) {
    pendingReview += p.pendingReviewTaskCount
    inProgressReview += p.inProgressReviewTaskCount
    openProcessing += p.openProcessingTaskCount
    scanAttention += p.scanAttentionCount
    const gradeTotal = p.totalQuestionGradeCount
    const confirmed = p.confirmedQuestionGradeCount
    unconfirmedQuestionGrades += Math.max(0, gradeTotal - confirmed)
  }
  return {
    pendingReview,
    inProgressReview,
    openProcessing,
    scanAttention,
    unconfirmedQuestionGrades,
  }
})

const summaryStatItems = computed<UiStatPanelItem[]>(() => {
  const a = progressAggregate.value
  const dash = '—'
  const pendingValue = progressReady.value ? a.pendingReview : '…'
  const inProgressValue = progressReady.value ? a.inProgressReview : '…'
  const unconfirmedValue = progressReady.value ? a.unconfirmedQuestionGrades : '…'
  const scanValue = progressReady.value ? a.scanAttention : '…'
  return [
    {
      key: 'pending-review',
      label: '待阅卷',
      value: pendingValue,
      unit: '份',
      tone: (a.pendingReview > 0 ? 'orange' : 'gray') as BadgeTone,
      icon: FileSearchOutlined,
    },
    {
      key: 'in-progress',
      label: '进行中阅卷',
      value: inProgressValue,
      unit: '份',
      tone: (a.inProgressReview > 0 ? 'blue' : 'gray') as BadgeTone,
      icon: SyncOutlined,
    },
    {
      key: 'unconfirmed',
      label: '待确认成绩',
      value: unconfirmedValue,
      unit: '题',
      tone: (a.unconfirmedQuestionGrades > 0 ? 'purple' : 'gray') as BadgeTone,
      icon: CheckCircleOutlined,
    },
    {
      key: 'scan-monitor',
      label: '扫描异常',
      value: scanValue,
      unit: '条',
      tone: (a.scanAttention > 0 ? 'red' : 'gray') as BadgeTone,
      icon: WarningOutlined,
    },
    {
      key: 'filtered',
      label: '筛选命中',
      value: pagination.total ?? 0,
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

interface RecommendedExamItem {
  examId: string
  examName: string
  examNo: string
  totalGrades: number
  confirmedGrades: number
  pending: number
  attention: number
  completeRate: number
}

const recommendedExams = computed<RecommendedExamItem[]>(() => {
  const result: RecommendedExamItem[] = []
  for (const exam of dataSource.value) {
    if (exam.status !== 'ACTIVE') continue
    const p = examProgressMap.value.get(exam.examId)
    if (!p) continue
    const gradeTotal = p.totalQuestionGradeCount
    const confirmedGrades = p.confirmedQuestionGradeCount
    const pending = Math.max(0, gradeTotal - confirmedGrades)
    const attention = p.scanAttentionCount
    if (pending === 0 && attention === 0) continue
    const completeRate = gradeTotal > 0 ? Math.round((confirmedGrades / gradeTotal) * 100) : 0
    result.push({
      examId: exam.examId,
      examName: exam.examName,
      examNo: exam.examNo,
      totalGrades: gradeTotal,
      confirmedGrades,
      pending,
      attention,
      completeRate,
    })
  }
  result.sort((a, b) => b.pending - a.pending || b.attention - a.attention)
  return result.slice(0, 5)
})

type ExamListTabKey = 'priority' | 'all'

const listTab = ref<ExamListTabKey>('priority')

const examListTabs = computed<UiSectionTabItem[]>(() => [
  {
    key: 'priority',
    label: '优先推进的考试',
    count: recommendedExams.value.length,
    badgeTone: recommendedExams.value.length > 0 ? 'orange' : 'gray',
  },
  {
    key: 'all',
    label: '全部考试',
    count: pagination.total ?? 0,
    badgeTone: 'blue',
  },
])

watch(recommendedExams, (items) => {
  if (items.length === 0 && listTab.value === 'priority') {
    listTab.value = 'all'
  }
})

function getExamProgressText(examId: string): string {
  const p = examProgressMap.value.get(examId)
  if (!p) {
    return progressLoading.value ? '加载中…' : ''
  }
  const totalGrades = p.totalQuestionGradeCount
  const confirmed = p.confirmedQuestionGradeCount
  if (totalGrades <= 0) return '无题目'
  return `${confirmed}/${totalGrades} 题`
}

// helper 严格 typed 接收后端 API 对象 ExamSummaryVO，模板侧使用表格 slot record 保留当前行引用。
function examStatusTone(exam: ExamSummaryVO): BadgeTone {
  return strictEnumTone(EXAM_STATUS_TONE, exam.status, '考试状态')
}

function examStatusLabel(exam: ExamSummaryVO): string {
  return strictEnumLabel(EXAM_STATUS_LABEL, exam.status, '考试状态')
}

function formatAcademicTerm(exam: ExamSummaryVO): string {
  if (!exam.academicYear && !exam.semester) return ''
  return [exam.academicYear, formatSemester(exam.semester)].filter(Boolean).join(' · ')
}

async function loadExams(): Promise<void> {
  loading.value = true
  try {
    const [startTime, endTime] = filterForm.dateRange ?? []
    const result = await pageExams({
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 10,
      status: filterForm.status,
      academicYear: filterForm.academicYear?.trim() || undefined,
      semester: filterForm.semester,
      keyword: filterForm.keyword?.trim() || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      createUserId: isAdminView.value ? null : userStore.userInfo.userId || undefined,
    })
    dataSource.value = readPageList(result, '考试列表加载失败，请稍后重试')
    pagination.total = readPageTotal(result)
    if (result.pageNum != null) {
      pagination.current = result.pageNum
    }
    if (result.pageSize != null) {
      pagination.pageSize = result.pageSize
    }
  } catch (error) {
    showUserError(error, '考试列表加载失败')
    dataSource.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
  await loadAggregateProgress()
}

async function loadAggregateProgress(): Promise<void> {
  const activeExams = dataSource.value.filter((e) => e.status === 'ACTIVE')
  if (activeExams.length === 0) {
    examProgressMap.value = new Map()
    return
  }
  progressLoading.value = true
  try {
    const examIds = activeExams.map((e) => e.examId)
    const items = await batchGetMarkingProgress(examIds)
    const nextMap = new Map<string, MarkingProgressVO>()
    for (const item of items) {
      nextMap.set(item.examId, item)
    }
    examProgressMap.value = nextMap
    const failedCount = examIds.length - nextMap.size
    if (failedCount > 0) {
      showUserError(new Error(
        `${failedCount} 场进行中考试的阅卷进度未能读取，今日待办和阶段状态可能不完整，请刷新后重试。`,
      ), 
        `${failedCount} 场进行中考试的阅卷进度未能读取，今日待办和阶段状态可能不完整，请刷新后重试。`,
      )
    }
  } catch (error) {
    examProgressMap.value = new Map()
    showUserError(error, '阅卷进度批量加载失败')
  } finally {
    progressLoading.value = false
  }
}

function handleSearch(): void {
  pagination.current = 1
  void loadExams()
}

function handleReset(): void {
  pagination.current = 1
  void loadExams()
}
function handleUiPageChange(page: { current: number, pageSize: number }): void {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  void loadExams()
}



function goScanLiveMonitor(examId: string): void {
  void router.push({ name: 'TeacherExamWorkspaceScanMonitor', params: { examId } })
}

function goMarkingTaskPool(examId: string): void {
  void router.push({ name: 'TeacherExamWorkspaceMarkingTaskPool', params: { examId } })
}

/**
 * 根据考试当前进度，智能跳转到最优操作入口。
 *
 * <p>优先级：扫描异常待处理 → 准备工作台(准备未完成) → 批量复核确认(有待复核/复核中任务)
 * → 阅卷任务池(有进行中批阅任务或未确认得分) → 成绩确认与发布。</p>
 */
function goSmartExamEntry(examId: string): void {
  const p = examProgressMap.value.get(examId)
  if (!p) {
    void router.push({ name: 'TeacherExamWorkspaceOverview', params: { examId } })
    return
  }
  if (p.scanAttentionCount > 0) {
    void router.push(resolveScanStageEntryRoute(examId, { scanAttentionCount: p.scanAttentionCount }))
    return
  }
  if (p.totalQuestionGradeCount <= 0) {
    if (p.questionCount <= 0) {
      void router.push({ name: 'TeacherExamWorkspacePrep', params: { examId } })
    } else {
      void router.push(resolveScanStageEntryRoute(examId, { scanAttentionCount: 0 }))
    }
    return
  }
  if (p.pendingReviewTaskCount > 0 || p.inProgressReviewTaskCount > 0) {
    void router.push({ name: 'TeacherExamWorkspaceReviewBatchConfirm', params: { examId } })
    return
  }
  if (p.openProcessingTaskCount > 0) {
    void router.push({ name: 'TeacherExamWorkspaceMarkingTaskPool', params: { examId } })
    return
  }
  if (Math.max(0, p.totalQuestionGradeCount - p.confirmedQuestionGradeCount) > 0) {
    void router.push({ name: 'TeacherExamWorkspaceMarkingTaskPool', params: { examId } })
    return
  }
  void router.push({ name: 'TeacherExamWorkspaceScoreSummary', params: { examId } })
}

// ─── KPI 概览：单独维护进行中 / 已关闭的全量计数 ─────────────────
// 复用 pageExams 的 status 维度查询，pageSize=1 仅取 total，避免额外列表传输。
const activeTotal = ref<number>(0)
const closedTotal = ref<number>(0)
const statusTotalsFailed = ref(false)

async function loadStatusTotals(): Promise<void> {
  const createUserId = isAdminView.value ? null : userStore.userInfo.userId || undefined
  statusTotalsFailed.value = false
  try {
    const [activeRes, closedRes] = await Promise.all([
      pageExams({ pageNum: 1, pageSize: 1, status: 'ACTIVE', createUserId }),
      pageExams({ pageNum: 1, pageSize: 1, status: 'CLOSED', createUserId }),
    ])
    activeTotal.value = readPageTotal(activeRes, '考试状态计数加载失败')
    closedTotal.value = readPageTotal(closedRes, '考试状态计数加载失败')
  } catch {
    statusTotalsFailed.value = true
    activeTotal.value = 0
    closedTotal.value = 0
  }
}

// 当前页中创建超过 7 天且仍 ACTIVE 的考试数（推进风险信号，仅本页采样）
const staleExamCount = computed<number>(() => {
  const threshold = dayjs().subtract(7, 'day')
  return dataSource.value.filter((item) => {
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

function openEditModal(exam: ExamSummaryVO): void {
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
      pagination.current = 1
      formModalOpen.value = false
      await Promise.all([loadExams(), loadStatusTotals()])
      Modal.confirm({
        title: '下一步：配置考生名册',
        content: '考试已创建。请选定班级并纳入考生后保存名册，否则扫描后无法完成身份绑定。',
        okText: '去配置考生',
        cancelText: '稍后再说',
        onOk() {
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
    await Promise.all([loadExams(), loadStatusTotals()])
  } catch (error) {
    showUserError(error, '保存考试失败')
  } finally {
    saving.value = false
  }
}

function isExamOwner(exam: ExamSummaryVO): boolean {
  return !!exam.createUser && exam.createUser === userStore.userInfo.userId
}

function confirmClose(exam: ExamSummaryVO): void {
  Modal.confirm({
    title: `关闭考试 ${exam.examName}？`,
    content: '关闭后考试进入 CLOSED 状态，可进入考后归档与质量评价；关闭后不可再编辑考试主信息。',
    okText: '关闭考试',
    cancelText: '取消',
    async onOk() {
      await closeExam({ examId: exam.examId })
      message.success('考试已关闭')
      await Promise.all([loadExams(), loadStatusTotals()])
    },
  })
}

function confirmDelete(exam: ExamSummaryVO): void {
  Modal.confirm({
    title: `删除考试 ${exam.examName}？`,
    content: '已进入模板、考生、印刷、扫描或成绩流程的考试不能删除。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      await deleteExam({ examId: exam.examId })
      message.success('考试已删除')
      if (dataSource.value.length === 1 && (pagination.current ?? 1) > 1) {
        pagination.current = (pagination.current ?? 1) - 1
      }
      await Promise.all([loadExams(), loadStatusTotals()])
    },
  })
}

// 统一刷新入口：列表 + KPI 同步加载，避免顶部计数滞后于列表
async function reloadAll(): Promise<void> {
  await Promise.all([loadExams(), loadStatusTotals()])
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

.exam-list-page__recommend-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exam-list-page__recommend-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid var(--dp-border, #e2e8f0);
  border-radius: 6px;
  background: var(--dp-surface, #fff);
}

.exam-list-page__recommend-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exam-list-page__recommend-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.exam-list-page__recommend-no {
  font-size: 12px;
  color: var(--dp-text-secondary, #64748b);
}

.exam-list-page__recommend-meta {
  font-size: 12px;
  color: var(--dp-text-secondary, #64748b);
}

.exam-list-page__recommend-actions {
  flex-shrink: 0;
}

.exam-list-page__progress-text {
  font-size: 13px;
}

.link-cell {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--ant-color-primary);
  font-weight: 500;
  font-size: 14px;
  text-align: left;

  &:hover {
    text-decoration: underline;
  }

  &__sub {
    margin-top: 2px;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }
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
