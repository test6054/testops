<template>
  <GiPageLayout>
    <div class="exam-list-page">
      <!-- Hero -->
      <UiPageCard :show-header="false" class="exam-list-page__hero-card">
        <a-spin :spinning="loading" class="hero-spin">
          <div class="exam-list-page__hero">
            <div class="exam-list-page__hero-main">
              <div class="exam-list-page__title-row">
                <h1 class="exam-list-page__title">考试列表</h1>
                <UiTag tone="blue" size="md">{{ pagination.total ?? 0 }} 场</UiTag>
                <UiTag v-if="isAdminView" tone="purple" size="md">管理员视角</UiTag>
                <UiTag v-else tone="gray" size="md">仅看本人创建</UiTag>
              </div>
            </div>
            <div class="exam-list-page__hero-actions">
              <UiButton variant="outline" size="md" :loading="loading" @click="loadExams">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </UiButton>
              <UiButton size="md" @click="openCreateModal">
                <template #icon>
                  <PlusOutlined />
                </template>
                新建考试
              </UiButton>
            </div>
          </div>

          <div class="exam-list-page__summary-grid">
            <div class="workspace-summary workspace-summary--accent">
              <span class="workspace-summary__label">考试总数</span>
              <strong class="workspace-summary__value">{{ pagination.total ?? 0 }}</strong>
              <span class="workspace-summary__desc">本次查询结果</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">活跃考试</span>
              <strong class="workspace-summary__value">{{ activeCount }}</strong>
              <span class="workspace-summary__desc">当前页面 ACTIVE</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">已关闭</span>
              <strong class="workspace-summary__value">{{ closedCount }}</strong>
              <span class="workspace-summary__desc">当前页面 CLOSED</span>
            </div>
            <div class="workspace-summary">
              <span class="workspace-summary__label">近 30 天新增</span>
              <strong class="workspace-summary__value">{{ recentCount }}</strong>
              <span class="workspace-summary__desc">基于创建时间</span>
            </div>
          </div>
        </a-spin>
      </UiPageCard>

      <!-- 筛选 -->
      <UiCard class="exam-list-page__filter-card">
        <template #title>
          <SearchOutlined />
          <span>筛选条件</span>
        </template>

        <a-form layout="inline" :model="filterForm" class="filter-form" @submit.prevent="handleSearch">
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

        <a-table
          v-else
          :columns="columns"
          :data-source="dataSource"
          :loading="loading"
          :pagination="pagination"
          row-key="examId"
          size="middle"
          class="exam-table"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'examName'">
              <button type="button" class="link-cell" @click="goDetail(record)">
                {{ record.examName || '未命名考试' }}
              </button>
              <div v-if="record.examNo" class="link-cell__sub">编号：{{ record.examNo }}</div>
            </template>
            <template v-else-if="column.key === 'status'">
              <UiTag :tone="EXAM_STATUS_TONE[record.status]" size="sm">
                {{ record.statusMessage || EXAM_STATUS_LABEL[record.status] }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'examWindow'">
              <span v-if="record.examStartTime || record.examEndTime">
                {{ formatTime(record.examStartTime) }}
                <span class="time-divider">~</span>
                {{ formatTime(record.examEndTime) }}
              </span>
              <span v-else class="muted">未设置</span>
            </template>
            <template v-else-if="column.key === 'createTime'">
              {{ formatTime(record.createTime) }}
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space>
                <UiButton size="sm" variant="ghost" @click="goDetail(record)">详情</UiButton>
                <UiButton
                  v-if="record.status !== 'CLOSED'"
                  size="sm"
                  variant="ghost"
                  @click="goTemplate(record)"
                >
                  配置模板
                </UiButton>
                <UiButton
                  v-if="record.status !== 'CLOSED'"
                  size="sm"
                  variant="ghost"
                  @click="goRoster(record)"
                >
                  考生名册
                </UiButton>
              </a-space>
            </template>
          </template>
        </a-table>
      </UiCard>
    </div>

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
      <a-form
        ref="createFormRef"
        :model="createForm"
        :rules="createFormRules"
        layout="vertical"
      >
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
  </GiPageLayout>
</template>

<script lang="ts" setup>
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { ColumnType, TablePaginationConfig } from 'ant-design-vue/es/table'
import type { ExamStatusCode, ExamSummaryVO } from '@/apis/mark/exam'
import FileOutlined from '@ant-design/icons-vue/FileOutlined'
import PlusOutlined from '@ant-design/icons-vue/PlusOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import message from 'ant-design-vue/es/message'
import dayjs from 'dayjs'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  createExam,
  EXAM_STATUS_LABEL,
  EXAM_STATUS_TONE,
  pageExams,
} from '@/apis/mark/exam'
import GiPageLayout from '@/components/GiPageLayout/index.vue'
import { UiBadge, UiButton, UiCard, UiEmpty, UiPageCard, UiTag } from '@/components/ui-guide/ui'
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

const activeCount = computed(() => dataSource.value.filter(e => e.status === 'ACTIVE').length)
const closedCount = computed(() => dataSource.value.filter(e => e.status === 'CLOSED').length)
const recentCount = computed(() => {
  const threshold = dayjs().subtract(30, 'day')
  return dataSource.value.filter((e) => {
    if (!e.createTime) return false
    return dayjs(e.createTime).isAfter(threshold)
  }).length
})

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
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : '考试列表加载失败'
    message.error(errMsg)
  }
  finally {
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

function goDetail(record: ExamSummaryVO): void {
  void router.push({ name: 'TeacherExamDetail', params: { examId: record.examId } })
}

function goTemplate(record: ExamSummaryVO): void {
  void router.push({ name: 'TeacherPaperTemplate', query: { examId: record.examId } })
}

function goRoster(record: ExamSummaryVO): void {
  void router.push({ name: 'TeacherCandidateRoster', query: { examId: record.examId } })
}

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
  }
  catch {
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
    await loadExams()
  }
  catch (error) {
    const errMsg = error instanceof Error ? error.message : '创建考试失败'
    message.error(errMsg)
  }
  finally {
    creating.value = false
  }
}

onMounted(() => {
  void loadExams()
})
</script>

<style lang="scss" scoped>
.exam-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 10px;
  min-height: 100vh;
}

.hero-spin {
  width: 100%;
}

.exam-list-page__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;

  &-main {
    flex: 1;
    min-width: 0;
  }

  &-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }
}

.exam-list-page__title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.exam-list-page__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--ant-color-text);
  margin: 0;
}


.exam-list-page__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ant-color-border-secondary);
}

.workspace-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  background: var(--ant-color-fill-quaternary);
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-md, 8px);

  &--accent {
    background: linear-gradient(135deg, rgba(22, 119, 255, 0.06) 0%, rgba(22, 119, 255, 0.02) 100%);
    border-color: rgba(22, 119, 255, 0.18);
  }

  &__label {
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
  }

  &__value {
    font-size: 22px;
    font-weight: 700;
    color: var(--ant-color-text);
  }

  &__desc {
    font-size: 12px;
    color: var(--ant-color-text-secondary);
  }
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
