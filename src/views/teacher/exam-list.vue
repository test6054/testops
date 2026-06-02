<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="exam-list-page__context">
        <div class="exam-list-page__context-left">
          <UiTag tone="blue" size="sm">{{ pagination.total ?? 0 }} 场</UiTag>
          <UiTag v-if="isAdminView" tone="purple" size="sm">全租户审计视角</UiTag>
          <UiTag v-else tone="gray" size="sm">我创建或被分配评阅</UiTag>
        </div>
        <div class="exam-list-page__context-right">
          <UiButton variant="outline" size="sm" :loading="loading" @click="reloadAll">
            <template #icon><ReloadOutlined /></template>
            刷新
          </UiButton>
          <UiButton size="sm" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            新建考试
          </UiButton>
        </div>
      </div>
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

    <!-- 筛选 -->
    <UiCard class="exam-list-page__filter-card">
      <template #title>
        <SearchOutlined />
        <span>筛选条件</span>
      </template>

      <a-form
        layout="inline"
        :model="filterForm"
        class="filter-form"
        @submit.prevent="handleSearch"
      >
        <a-form-item label="状态">
          <a-select
            v-model:value="filterForm.status"
            style="width: 140px"
            placeholder="全部状态"
            allow-clear
            :options="statusOptions"
          />
        </a-form-item>
        <a-form-item label="学年">
          <a-input
            v-model:value="filterForm.academicYear"
            placeholder="2024-2025"
            allow-clear
            style="width: 150px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="学期">
          <a-select
            v-model:value="filterForm.semester"
            style="width: 140px"
            placeholder="全部学期"
            allow-clear
            :options="semesterOptions"
          />
        </a-form-item>
        <a-form-item label="关键词">
          <a-input
            v-model:value="filterForm.keyword"
            placeholder="考试名称 / 编号"
            allow-clear
            style="width: 220px"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="创建时间">
          <a-range-picker
            v-model:value="filterForm.dateRange"
            style="width: 260px"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD HH:mm:ss"
            :placeholder="['开始日期', '结束日期']"
            allow-clear
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <UiButton size="sm" @click="handleSearch">查询</UiButton>
            <UiButton size="sm" variant="outline" @click="handleReset">重置</UiButton>
          </a-space>
        </a-form-item>
      </a-form>
    </UiCard>

    <!-- 列表 -->
    <UiCard class="exam-list-page__table-card">
      <template #title>
        <FileOutlined />
        <span>考试列表</span>
        <UiBadge tone="blue">{{ pagination.total ?? 0 }} 条</UiBadge>
      </template>

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
        class="exam-table"
        @page-change="handleUiPageChange"
      >
        <template #bodyCell="{ column, index }">
          <template v-if="column.key === 'examName'">
            <button type="button" class="link-cell" @click="goDetail(dataSource[index])">
              {{ dataSource[index].examName }}
            </button>
            <div v-if="dataSource[index].examNo" class="link-cell__sub">
              编号：{{ dataSource[index].examNo }}
            </div>
          </template>
          <template v-else-if="column.key === 'academicTerm'">
            <span v-if="formatAcademicTerm(dataSource[index])">
              {{ formatAcademicTerm(dataSource[index]) }}
            </span>
            <span v-else class="muted">未设置</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="examStatusTone(dataSource[index])" size="sm">
              {{ examStatusLabel(dataSource[index]) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'examWindow'">
            <span v-if="dataSource[index].examStartTime || dataSource[index].examEndTime">
              {{ formatDateTime(dataSource[index].examStartTime) }}
              <span class="time-divider">~</span>
              {{ formatDateTime(dataSource[index].examEndTime) }}
            </span>
            <span v-else class="muted">未设置</span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatDateTime(dataSource[index].createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton size="sm" variant="ghost" @click="goDetail(dataSource[index])">
                详情
              </UiButton>
              <UiButton
                v-if="dataSource[index].status !== 'CLOSED'"
                size="sm"
                variant="ghost"
                @click="openEditModal(dataSource[index])"
              >
                编辑
              </UiButton>
              <UiButton
                v-if="dataSource[index].status !== 'CLOSED'"
                size="sm"
                variant="ghost"
                status="danger"
                @click="confirmDelete(dataSource[index])"
              >
                删除
              </UiButton>
              <UiButton
                v-if="dataSource[index].status !== 'CLOSED'"
                size="sm"
                @click="goPrepWorkbench(dataSource[index])"
              >
                准备工作台
              </UiButton>
              <UiButton
                v-if="canAssignMarking(dataSource[index])"
                size="sm"
                @click="goMarkingOrganization(dataSource[index])"
              >
                分配批阅
              </UiButton>
              <UiButton
                v-if="dataSource[index].status !== 'CLOSED'"
                size="sm"
                variant="ghost"
                @click="goTemplate(dataSource[index])"
              >
                配置模板
              </UiButton>
              <UiButton
                v-if="dataSource[index].status !== 'CLOSED'"
                size="sm"
                variant="ghost"
                @click="goRoster(dataSource[index])"
              >
                考生名册
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </UiCard>
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
      <a-form-item label="考试模式" name="examMode" required>
        <a-radio-group v-model:value="examForm.examMode" :disabled="isEditMode">
          <a-radio-button value="OFFLINE_SCAN">线下扫描</a-radio-button>
          <a-radio-button value="ONLINE">在线作答</a-radio-button>
        </a-radio-group>
        <div class="exam-list-page__form-helper">
          {{
            isEditMode
              ? '考试模式一旦创建不可修改。'
              : '线下扫描：学生纸笔作答 + 扫描入站；在线作答：学生 Web 端直接答题，跳过扫描环节。'
          }}
        </div>
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
      <a-form-item label="批改策略（可选）" name="gradingStrategy">
        <a-input
          v-model:value="examForm.gradingStrategy"
          placeholder="如 SINGLE / DOUBLE_BLIND，留空使用租户默认"
          :maxlength="64"
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
import type { ExamCreateRequest, ExamStatusCode, ExamSummaryVO } from '@/apis/mark/exam'
import {
  createExam,
  deleteExam,
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  pageExams,
  updateExam,
} from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import message from 'ant-design-vue/es/message'
import Modal from 'ant-design-vue/es/modal'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import CatalogCourseSelector from '@/components/quality/selectors/CatalogCourseSelector.vue'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiErrorRetryPanel,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { getUserErrorMessage, showUserError, toUserError } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { readPageList, readPageTotal } from '@/utils/page-result'
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

const statusOptions: Array<{ label: string; value: ExamStatusCode }> = [
  { label: EXAM_STATUS_LABEL.ACTIVE, value: 'ACTIVE' },
  { label: EXAM_STATUS_LABEL.CLOSED, value: 'CLOSED' },
]

/** 学期下拉选项：直接复用 SemesterOptions 的强类型枚举，避免本地重复定义。 */
const semesterOptions = SemesterOptions

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
  { title: '考试时间', key: 'examWindow', width: 280 },
  { title: '创建时间', key: 'createTime', width: 180 },
  { title: '操作', key: 'actions', width: 420, fixed: 'right' },
]

// helper 严格 typed 接收后端 API 对象 ExamSummaryVO。
// 模板侧统一用 dataSource[index] 取同一个 VO 对象引用，避免 slot record 类型丢失。
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
}

function handleSearch(): void {
  pagination.current = 1
  void loadExams()
}

function handleReset(): void {
  filterForm.status = undefined
  filterForm.academicYear = ''
  filterForm.semester = undefined
  filterForm.keyword = ''
  filterForm.dateRange = undefined
  pagination.current = 1
  void loadExams()
}
function handleUiPageChange(page: { current: number; pageSize: number }): void {
  pagination.current = page.current
  pagination.pageSize = page.pageSize
  void loadExams()
}

function goDetail(exam: ExamSummaryVO): void {
  void router.push({ name: 'TeacherExamDetail', params: { examId: exam.examId } })
}

function goTemplate(exam: ExamSummaryVO): void {
  void router.push({ name: 'TeacherPaperTemplate', query: { examId: exam.examId } })
}

function goRoster(exam: ExamSummaryVO): void {
  void router.push({ name: 'TeacherCandidateRoster', query: { examId: exam.examId } })
}

function goPrepWorkbench(exam: ExamSummaryVO): void {
  void router.push({ name: 'TeacherExamPrepWorkbench', query: { examId: exam.examId } })
}

function canAssignMarking(exam: ExamSummaryVO): boolean {
  return (
    exam.status !== 'CLOSED' && !!exam.createUser && exam.createUser === userStore.userInfo.userId
  )
}

function goMarkingOrganization(exam: ExamSummaryVO): void {
  void router.push({ name: 'TeacherMarkingOrganizationIndex', query: { examId: exam.examId } })
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
    activeTotal.value = Number(activeRes.total)
    closedTotal.value = Number(closedRes.total)
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
  examMode: 'ONLINE' | 'OFFLINE_SCAN'
  examName: string
  examNo: string
  academicYear?: string
  semester?: string
  examWindow?: [string, string]
  gradingStrategy?: string
  remark?: string
}>({
  courseId: null,
  examMode: 'OFFLINE_SCAN',
  examName: '',
  examNo: '',
  academicYear: '',
  semester: undefined,
  examWindow: undefined,
  gradingStrategy: '',
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
  gradingStrategy: [{ max: 64, message: '批改策略最多 64 个字符', trigger: 'blur' }],
  remark: [{ max: 500, message: '备注最多 500 个字符', trigger: 'blur' }],
}

function resetExamForm(): void {
  editingExamId.value = null
  examForm.courseId = null
  examForm.examMode = 'OFFLINE_SCAN'
  examForm.examName = ''
  examForm.examNo = ''
  examForm.academicYear = ''
  examForm.semester = undefined
  examForm.examWindow = undefined
  examForm.gradingStrategy = ''
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
  examForm.examWindow =
    exam.examStartTime && exam.examEndTime ? [exam.examStartTime, exam.examEndTime] : undefined
  examForm.gradingStrategy = exam.gradingStrategy ?? ''
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
    gradingStrategy: examForm.gradingStrategy?.trim() || undefined,
    remark: examForm.remark?.trim() || undefined,
    examMode: examForm.examMode,
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
      // 考试模式一旦创建不可改，update 链路不传 examMode（后端 ExamUpdateRequest 也无此字段）
      const { examMode: _examMode, ...updateRequest } = request
      await updateExam({ examId: editingExamId.value, ...updateRequest })
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
  &__context {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__context-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__context-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.exam-list-page__kpi {
  margin-bottom: 4px;
}

.exam-list-page__alert {
  margin-bottom: 4px;
}

.filter-form {
  padding: 8px 0;
}

.exam-table {
  :deep(.ant-table-thead > tr > th) {
    background: var(--ant-color-fill-quaternary);
    font-weight: 600;
  }
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
