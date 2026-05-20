<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="exam-list-page__context">
        <div class="exam-list-page__context-left">
          <UiTag tone="blue" size="sm">{{ pagination.total ?? 0 }} 场</UiTag>
          <UiTag v-if="isAdminView" tone="purple" size="sm">管理员视角</UiTag>
          <UiTag v-else tone="gray" size="sm">仅看本人创建</UiTag>
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

    <!-- 行动提示：当存在超期待推进考试时显示 -->
    <UiAlertStrip
      v-if="staleExamCount > 0"
      tone="warning"
      :title="`${staleExamCount} 场进行中考试创建超过 7 天，建议核查推进状态`"
      description="未配置考试时间窗或长期未关闭的考试可能存在配置疏漏，请进入「准备工作台」检查模板、答案、考生名册是否完整。"
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

      <UiEmpty v-if="!loading && dataSource.length === 0" description="暂无考试数据" />

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
              {{ dataSource[index].examName || '未命名考试' }}
            </button>
            <div v-if="dataSource[index].examNo" class="link-cell__sub">
              编号：{{ dataSource[index].examNo }}
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="examStatusTone(dataSource[index])" size="sm">
              {{ examStatusLabel(dataSource[index]) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'examWindow'">
            <span v-if="dataSource[index].examStartTime || dataSource[index].examEndTime">
              {{ formatTime(dataSource[index].examStartTime) }}
              <span class="time-divider">~</span>
              {{ formatTime(dataSource[index].examEndTime) }}
            </span>
            <span v-else class="muted">未设置</span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ formatTime(dataSource[index].createTime) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton size="sm" variant="ghost" @click="goDetail(dataSource[index])">
                详情
              </UiButton>
              <UiButton
                v-if="dataSource[index].status !== 'CLOSED'"
                size="sm"
                @click="goPrepWorkbench(dataSource[index])"
              >
                准备工作台
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

  <!-- 创建考试弹窗 -->
  <a-modal
    v-model:open="createModalOpen"
    title="新建考试"
    :confirm-loading="creating"
    :destroy-on-close="true"
    :mask-closable="false"
    width="560px"
    @ok="handleCreate"
  >
    <a-form ref="createFormRef" :model="createForm" :rules="createFormRules" layout="vertical">
      <a-form-item label="考试名称" name="examName">
        <a-input
          v-model:value="createForm.examName"
          placeholder="例如：2026 春《工程制图》期末"
          :maxlength="100"
          show-count
        />
      </a-form-item>
      <a-form-item label="考试编号（可选）" name="examNo">
        <a-input
          v-model:value="createForm.examNo"
          placeholder="教务系统编号或自定义编号"
          :maxlength="64"
        />
      </a-form-item>
      <a-form-item label="考试时间窗">
        <a-range-picker
          v-model:value="createForm.examWindow"
          style="width: 100%"
          show-time
          format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm:ss"
          :placeholder="['开始时间', '结束时间']"
        />
      </a-form-item>
      <a-form-item label="批改策略（可选）" name="gradingStrategy">
        <a-input
          v-model:value="createForm.gradingStrategy"
          placeholder="如 SINGLE / DOUBLE_BLIND，留空使用租户默认"
          :maxlength="64"
        />
      </a-form-item>
      <a-form-item label="备注" name="remark">
        <a-textarea
          v-model:value="createForm.remark"
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
import type { ExamStatusCode, ExamSummaryVO } from '@/apis/mark/exam'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createExam, EXAM_STATUS_LABEL, EXAM_STATUS_TONE, pageExams } from '@/apis/mark/exam'
import {
  UiAlertStrip,
  UiBadge,
  UiButton,
  UiCard,
  UiDataTable,
  UiEmpty,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { StageWorkbenchShell } from '@/components/workbench'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'

defineOptions({ name: 'TeacherExamList' })

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

/**
 * 是否管理员视角：平台超级管理员 + 租户管理员可看本租户全部考试，
 * 其他角色（普通教师）只看自己创建的考试。
 */
const isAdminView = computed(() => authStore.isAdmin || userStore.isTenantAdmin)

const filterForm = reactive<{
  status?: ExamStatusCode
  keyword?: string
  dateRange?: [string, string]
}>({
  status: undefined,
  keyword: '',
  dateRange: undefined,
})

const statusOptions: Array<{ label: string, value: ExamStatusCode }> = [
  { label: EXAM_STATUS_LABEL.ACTIVE, value: 'ACTIVE' },
  { label: EXAM_STATUS_LABEL.CLOSED, value: 'CLOSED' },
]

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
  { title: '状态', key: 'status', width: 100 },
  { title: '考试时间', key: 'examWindow', width: 280 },
  { title: '创建时间', key: 'createTime', width: 180 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

// helper 严格 typed 接收后端 API 对象 ExamSummaryVO。
// 模板侧统一用 dataSource[index] 取同一个 VO 对象引用，避免 slot record:any。
function examStatusTone(exam: ExamSummaryVO): BadgeTone {
  return EXAM_STATUS_TONE[exam.status] ?? 'gray'
}

function examStatusLabel(exam: ExamSummaryVO): string {
  return exam.statusMessage || EXAM_STATUS_LABEL[exam.status] || exam.status
}

function formatTime(value?: string): string {
  if (!value) return '-'
  return dayjs(value).format('YYYY-MM-DD HH:mm')
}

async function loadExams(): Promise<void> {
  loading.value = true
  try {
    const [startTime, endTime] = filterForm.dateRange ?? []
    const result = await pageExams({
      pageNum: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 10,
      status: filterForm.status,
      keyword: filterForm.keyword?.trim() || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      createUserId: isAdminView.value ? null : userStore.userInfo.userId || undefined,
    })
    dataSource.value = result.list ?? []
    pagination.total = result.total ?? 0
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '考试列表加载失败'
    message.error(errMsg)
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
  filterForm.keyword = ''
  filterForm.dateRange = undefined
  pagination.current = 1
  void loadExams()
}

function handleTableChange(next: TablePaginationConfig): void {
  pagination.current = next.current ?? 1
  pagination.pageSize = next.pageSize ?? 10
  void loadExams()
}

function handleUiPageChange(payload: { current: number, pageSize: number }): void {
  pagination.current = payload.current
  pagination.pageSize = payload.pageSize
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

// ─── KPI 概览：单独维护进行中 / 已关闭的全量计数 ─────────────────
// 复用 pageExams 的 status 维度查询，pageSize=1 仅取 total，避免额外列表传输。
const activeTotal = ref<number>(0)
const closedTotal = ref<number>(0)

async function loadStatusTotals(): Promise<void> {
  const createUserId = isAdminView.value ? null : userStore.userInfo.userId || undefined
  try {
    const [activeRes, closedRes] = await Promise.all([
      pageExams({ pageNum: 1, pageSize: 1, status: 'ACTIVE', createUserId }),
      pageExams({ pageNum: 1, pageSize: 1, status: 'CLOSED', createUserId }),
    ])
    activeTotal.value = activeRes.total ?? 0
    closedTotal.value = closedRes.total ?? 0
  } catch {
    // 计数加载失败不阻塞主列表，KPI 静默回退到 0
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
    value: activeTotal.value,
    helper: isAdminView.value ? '租户全部 ACTIVE' : '本人创建 ACTIVE',
    tone: 'green' as BadgeTone,
  },
  {
    key: 'closed',
    label: '已关闭',
    value: closedTotal.value,
    helper: isAdminView.value ? '租户全部 CLOSED' : '本人创建 CLOSED',
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

// 创建考试弹窗
const createModalOpen = ref(false)
const creating = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive<{
  examName: string
  examNo?: string
  examWindow?: [string, string]
  gradingStrategy?: string
  remark?: string
}>({
  examName: '',
  examNo: '',
  examWindow: undefined,
  gradingStrategy: '',
  remark: '',
})

const createFormRules: Record<string, Rule[]> = {
  examName: [
    { required: true, message: '请输入考试名称', trigger: 'blur' },
    { max: 100, message: '考试名称最多 100 个字符', trigger: 'blur' },
  ],
  examNo: [{ max: 64, message: '考试编号最多 64 个字符', trigger: 'blur' }],
  gradingStrategy: [{ max: 64, message: '批改策略最多 64 个字符', trigger: 'blur' }],
  remark: [{ max: 500, message: '备注最多 500 个字符', trigger: 'blur' }],
}

function openCreateModal(): void {
  createForm.examName = ''
  createForm.examNo = ''
  createForm.examWindow = undefined
  createForm.gradingStrategy = ''
  createForm.remark = ''
  createModalOpen.value = true
}

async function handleCreate(): Promise<void> {
  if (!createFormRef.value) return
  try {
    await createFormRef.value.validate()
  } catch {
    return
  }
  creating.value = true
  try {
    const [startTime, endTime] = createForm.examWindow ?? []
    await createExam({
      examName: createForm.examName.trim(),
      examNo: createForm.examNo?.trim() || undefined,
      examStartTime: startTime || undefined,
      examEndTime: endTime || undefined,
      gradingStrategy: createForm.gradingStrategy?.trim() || undefined,
      remark: createForm.remark?.trim() || undefined,
    })
    message.success('考试已创建，进入草稿态')
    createModalOpen.value = false
    pagination.current = 1
    await Promise.all([loadExams(), loadStatusTotals()])
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : '创建考试失败'
    message.error(errMsg)
  } finally {
    creating.value = false
  }
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
