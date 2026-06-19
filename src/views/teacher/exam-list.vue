<template>
  <StageWorkbenchShell>
    <template #signal>
      <UiAlertStrip
        v-if="urgentBanner"
        tone="warning"
        :title="urgentBanner.title"
        :description="urgentBanner.description"
        dense
        class="exam-list-page__banner"
      />
      <UiAlertStrip
        v-if="progressLoadError"
        tone="error"
        title="部分考试进度加载失败"
        :description="progressLoadError"
        dense
        class="exam-list-page__banner"
      />
      <UiStatPanel
        title="今日待办"
        :items="todayStatMetrics"
        :columns="4"
        variant="strip"
        compact
        class="exam-list-page__today-stats"
      />
    </template>

    <template #rail>
      <StageRail :stages="workbenchStages" compact />
    </template>

    <!-- KPI 概览：总场次 / 进行中 / 已关闭 / 超期未完成 -->
    <UiStatPanel
      :items="kpiItems"
      :columns="4"
      variant="grid"
      compact
      class="exam-list-page__kpi"
    />
    <UiAlertStrip
      v-if="statusTotalsError"
      tone="error"
      title="考试状态计数加载失败"
      :description="statusTotalsError"
      dense
      class="exam-list-page__alert"
    />

    <!-- 行动提示：当存在超期待推进考试时显示 -->
    <UiAlertStrip
      v-if="staleExamCount > 0"
      tone="warning"
      :title="`${staleExamCount} 场进行中考试创建超过 7 天，请核查推进状态`"
      dense
      class="exam-list-page__alert"
    />

    <UiCard v-if="recommendedExams.length > 0" class="exam-list-page__recommend-card">
      <template #title>
        <span class="section-title">优先推进的考试</span>
      </template>
      <ul class="exam-list-page__recommend-list">
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
            <UiTextAction tone="primary" @click="goPrepWorkbenchById(item.examId)">
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
    </UiCard>

    <!-- P0-1 批阅路径指引：帮助教师理解 OCR/AI复核 与 阅卷组织正评 的关系 -->
    <UiAlertStrip
      v-if="progressReady && recommendedExams.length > 0"
      tone="info"
      title="批阅流程说明"
      dense
      class="exam-list-page__grading-guide"
    >
      系统支持两种批阅模式：<strong>单人批阅</strong>请进入「OCR/AI 复核」逐题确认 AI 建议；
      <strong>多人协作</strong>请先设置「阅卷安排」分配题组后再进入「阅卷任务池」批阅。
      单人批阅确认完成后，可直接进入成绩确认与发布。
    </UiAlertStrip>

    <a-card :bordered="false" class="detail-table-card exam-list-page__table-card">
      <template #title>
        <span class="section-title">全部考试</span>
      </template>
      <template #extra>
        <UiButton size="sm" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新建考试
        </UiButton>
      </template>

      <UiFilterBar
        v-model="filterForm"
        :fields="filterFields"
        search-text="查询"
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

      <!-- D-9 错误态：考试列表加载失败时提供重试 + 上报入口 -->
      <UiErrorRetryPanel
        v-if="examsLoadError"
        :error="examsLoadError"
        title="考试列表加载失败"
        compact
        @retry="loadExams"
      />
      <UiEmpty v-else-if="!loading && dataSource.length === 0" description="暂无考试数据" />

      <UiDataTable
        v-else
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
                v-if="record.status !== 'CLOSED'"
                tone="danger"
                @click="confirmDelete(record)"
              >
                删除
              </UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </a-card>
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
          :options="semesterOptions"
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
  MarkingProgressVO,
} from '@/apis/mark/exam'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type { WorkbenchStage, WorkbenchStageStatus } from '@/types/workbench'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import message from 'ant-design-vue/es/message'
import Modal from 'ant-design-vue/es/modal'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  batchGetMarkingProgress,
  closeExam,
  createExam,
  deleteExam,
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  GRADING_STRATEGY_LABEL,
  pageExams,
  updateExam,
} from '@/apis/mark/exam'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import {
  UiAlertStrip,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiFilterBar,
  UiStatPanel,
  UiTag,
  UiTextAction,
} from '@/components/ui-guide/ui'
import { StageRail, StageWorkbenchShell } from '@/components/workbench'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'TeacherExamList' })

const URGENT_PENDING_REVIEW_THRESHOLD = 30

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
    options: statusOptions.map((item) => ({ label: item.label, value: item.value })),
  },
  {
    key: 'academicYear',
    type: 'input',
    placeholder: '2024-2025',
    allowClear: true,
    width: 150,
    triggerSearchOnChange: false,
  },
  {
    key: 'semester',
    type: 'select',
    placeholder: '全部学期',
    allowClear: true,
    width: 140,
    options: semesterOptions.map((item) => ({ label: item.label, value: item.value })),
  },
  {
    key: 'keyword',
    type: 'input',
    placeholder: '考试名称 / 编号',
    allowClear: true,
    width: 220,
    inputPrefixIcon: 'search',
    triggerSearchOnChange: false,
  },
  { key: 'dateRange', type: 'custom', width: 260, minWidth: 260, maxWidth: 320 },
]

const gradingStrategyOptions = Object.entries(GRADING_STRATEGY_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const dataSource = ref<ExamSummaryVO[]>([])
const loading = ref(false)
// D-9 错误态：考试列表加载失败时 UiErrorRetryPanel 重试 + 上报
const examsLoadError = ref<Error | null>(null)
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
const progressLoadError = ref('')

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

const todayStatMetrics = computed(() => {
  const a = progressAggregate.value
  const pendingValue = progressLoadError.value
    ? '不可用'
    : progressReady.value
      ? a.pendingReview
      : '…'
  const inProgressValue = progressLoadError.value
    ? '不可用'
    : progressReady.value
      ? a.inProgressReview
      : '…'
  const unconfirmedValue = progressLoadError.value
    ? '不可用'
    : progressReady.value
      ? a.unconfirmedQuestionGrades
      : '…'
  const scanValue = progressLoadError.value ? '不可用' : progressReady.value ? a.scanAttention : '…'
  return [
    {
      key: 'pending-review',
      label: '待阅卷任务',
      value: pendingValue,
      unit: '份',
      helper: '同题剩余待阅卷数量',
      tone: (a.pendingReview > 0 ? 'orange' : 'gray') as BadgeTone,
      clickable: a.pendingReview > 0,
      onClick: () => router.push({ name: 'TeacherMarkingTaskPool' }),
    },
    {
      key: 'in-progress',
      label: '我的进行中阅卷',
      value: inProgressValue,
      unit: '份',
      helper: '已认领尚未提交',
      tone: (a.inProgressReview > 0 ? 'blue' : 'gray') as BadgeTone,
      clickable: a.inProgressReview > 0,
      onClick: () => router.push({ name: 'TeacherMarkingTaskPool' }),
    },
    {
      key: 'unconfirmed',
      label: '待确认成绩',
      value: unconfirmedValue,
      unit: '题',
      helper: '需进入成绩确认推进',
      tone: (a.unconfirmedQuestionGrades > 0 ? 'purple' : 'gray') as BadgeTone,
      clickable: a.unconfirmedQuestionGrades > 0,
      onClick: () => router.push({ name: 'TeacherScoreFinalize' }),
    },
    {
      key: 'scan-monitor',
      label: '扫描监控',
      value: scanValue,
      unit: '条',
      helper: '扫描入账、异常和重复影像',
      tone: (a.scanAttention > 0 ? 'red' : 'gray') as BadgeTone,
      clickable: a.scanAttention > 0,
      onClick: () => router.push({ name: 'TeacherScanLiveMonitor' }),
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

function inferStageStatus(predicate: () => boolean): WorkbenchStageStatus {
  return predicate() ? 'active' : 'pending'
}

const workbenchStages = computed<WorkbenchStage[]>(() => {
  const a = progressAggregate.value
  return [
    { key: 'prep', title: '考试准备', status: 'pending', statusText: '形态 / 答卷 / 题目 / 名册' },
    {
      key: 'scan',
      title: '扫描识别',
      status: inferStageStatus(() => a.scanAttention > 0),
      statusText: a.scanAttention > 0 ? `${a.scanAttention} 条异常待处理` : '扫描 / OCR / 异常',
    },
    { key: 'organize', title: '阅卷安排', status: 'pending', statusText: '题组 / 教师 / 试阅' },
    {
      key: 'review',
      title: '阅卷执行',
      status: inferStageStatus(() => a.pendingReview > 0 || a.inProgressReview > 0),
      statusText:
        a.pendingReview + a.inProgressReview > 0
          ? `${a.pendingReview + a.inProgressReview} 份待阅卷 / 进行中`
          : '阅卷任务池',
    },
    {
      key: 'quality',
      title: '质量控制',
      status: inferStageStatus(() => a.openProcessing > 0),
      statusText: a.openProcessing > 0 ? `${a.openProcessing} 个未闭合处理任务` : '抽检 / 仲裁',
    },
    {
      key: 'publish',
      title: '成绩发布',
      status: inferStageStatus(() => a.unconfirmedQuestionGrades > 0),
      statusText:
        a.unconfirmedQuestionGrades > 0
          ? `${a.unconfirmedQuestionGrades} 题待确认`
          : '确认 / 发布',
    },
    { key: 'archive', title: '考后归档', status: 'pending', statusText: '归档 / 质量评价' },
  ]
})

const urgentBanner = computed<{ title: string, description: string } | null>(() => {
  const a = progressAggregate.value
  if (!progressReady.value || progressLoadError.value) return null
  if (a.scanAttention > 0) {
    return {
      title: `${a.scanAttention} 条扫描异常待处理，影响后续阅卷推进`,
      description: '点击下方「扫描监控」卡片可进入中控台处理异常和重复影像。',
    }
  }
  if (a.pendingReview >= URGENT_PENDING_REVIEW_THRESHOLD) {
    return {
      title: `当前累计 ${a.pendingReview} 份待阅卷任务，可进入阅卷任务池批量推进`,
      description: '使用阅卷工作区底部「提交并取下一份」可流水线接力阅卷。',
    }
  }
  return null
})

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
  examsLoadError.value = null
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
  } catch (error) {
    examsLoadError.value = toUserError(error, '考试列表加载失败')
    showUserError(error, '考试列表加载失败')
  } finally {
    loading.value = false
  }
  await loadAggregateProgress()
}

async function loadAggregateProgress(): Promise<void> {
  const activeExams = dataSource.value.filter((e) => e.status === 'ACTIVE')
  progressLoadError.value = ''
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
      progressLoadError.value = `${failedCount} 场进行中考试的阅卷进度未能读取，今日待办和阶段状态可能不完整，请刷新后重试。`
    }
  } catch (error) {
    examProgressMap.value = new Map()
    progressLoadError.value = getUserErrorMessage(error, '阅卷进度批量加载失败')
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

function goPrepWorkbench(exam: ExamSummaryVO): void {
  void router.push({ name: 'TeacherExamPrepWorkbench', query: { examId: exam.examId } })
}

function goPrepWorkbenchById(examId: string): void {
  void router.push({ name: 'TeacherExamPrepWorkbench', query: { examId } })
}

function goScanLiveMonitor(examId: string): void {
  void router.push({ name: 'TeacherScanLiveMonitor', query: { examId } })
}

function goMarkingTaskPool(examId: string): void {
  void router.push({ name: 'TeacherMarkingTaskPool', query: { examId } })
}

/**
 * 根据考试当前进度，智能跳转到最优操作入口。
 *
 * <p>优先级：扫描异常待处理 → 准备工作台(准备未完成) → 教师复核(有AI建议待确认)
 * → 阅卷任务池(有未批阅任务) → 成绩确认与发布。</p>
 */
function goSmartExamEntry(examId: string): void {
  const p = examProgressMap.value.get(examId)
  if (!p) {
    // 无进度数据时默认回到准备工作台
    void router.push({ name: 'TeacherExamPrepWorkbench', query: { examId } })
    return
  }
  if (p.scanAttentionCount > 0) {
    void router.push({ name: 'TeacherScanLiveMonitor', query: { examId } })
    return
  }
  if (p.totalQuestionGradeCount <= 0) {
    void router.push({ name: 'TeacherExamPrepWorkbench', query: { examId } })
    return
  }
  if (Math.max(0, p.totalQuestionGradeCount - p.confirmedQuestionGradeCount) > 0) {
    void router.push({ name: 'TeacherReviewWorkspace', query: { examId } })
    return
  }
  if (p.pendingReviewTaskCount > 0 || p.inProgressReviewTaskCount > 0) {
    void router.push({ name: 'TeacherMarkingTaskPool', query: { examId } })
    return
  }
  void router.push({ name: 'TeacherScoreFinalize', query: { examId } })
}

// ─── KPI 概览：单独维护进行中 / 已关闭的全量计数 ─────────────────
// 复用 pageExams 的 status 维度查询，pageSize=1 仅取 total，避免额外列表传输。
const activeTotal = ref<number>(0)
const closedTotal = ref<number>(0)
const statusTotalsError = ref('')

async function loadStatusTotals(): Promise<void> {
  const createUserId = isAdminView.value ? null : userStore.userInfo.userId || undefined
  statusTotalsError.value = ''
  try {
    const [activeRes, closedRes] = await Promise.all([
      pageExams({ pageNum: 1, pageSize: 1, status: 'ACTIVE', createUserId }),
      pageExams({ pageNum: 1, pageSize: 1, status: 'CLOSED', createUserId }),
    ])
    activeTotal.value = readPageTotal(activeRes, '考试状态计数加载失败')
    closedTotal.value = readPageTotal(closedRes, '考试状态计数加载失败')
  } catch (error) {
    statusTotalsError.value = getUserErrorMessage(error, '考试状态计数加载失败')
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

const kpiItems = computed(() => [
  {
    key: 'filtered',
    label: '当前筛选命中',
    value: pagination.total ?? 0,
    helper: '受顶部筛选条件影响',
    tone: 'blue' as BadgeTone,
  },
  {
    key: 'active',
    label: '进行中考试',
    value: statusTotalsError.value ? '不可用' : activeTotal.value,
    helper: isAdminView.value ? '租户全部 ACTIVE' : '我创建或被分配 ACTIVE',
    tone: 'green' as BadgeTone,
  },
  {
    key: 'closed',
    label: '已关闭',
    value: statusTotalsError.value ? '不可用' : closedTotal.value,
    helper: isAdminView.value ? '租户全部 CLOSED' : '我创建或被分配 CLOSED',
    tone: 'gray' as BadgeTone,
  },
  {
    key: 'stale',
    label: '本页待推进',
    value: staleExamCount.value,
    helper: '创建超 7 天且未关闭',
    tone: (staleExamCount.value > 0 ? 'orange' : 'gray') as BadgeTone,
  },
])

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
  remark?: string
}>({
  courseId: null,
  examName: '',
  examNo: '',
  academicYear: '',
  semester: undefined,
  examWindow: undefined,
  gradingStrategy: undefined,
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
            name: 'TeacherCandidateRoster',
            query: { examId, setup: '1' },
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
      await Promise.all([loadExams(), loadStatusTotals(), loadAggregateProgress()])
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
</script>

<style lang="scss" scoped>
.exam-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exam-list-page__kpi {
  margin-bottom: 4px;
}

.exam-list-page__alert {
  margin-bottom: 4px;
}

.exam-list-page__banner {
  margin-bottom: 8px;
}

.exam-list-page__today-stats {
  margin-bottom: 0;
}

.exam-list-page__recommend-card {
  margin-bottom: 0;
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
</style>
