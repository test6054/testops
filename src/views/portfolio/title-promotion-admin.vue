<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioTitlePromotionApplicationVO,
  PortfolioTitlePromotionTaskVO,
} from '@/apis/portfolio/title-promotion'
import type { UiDataTableChangeEvent } from '@/components/ui-guide/ui/data-table'
import { Input, InputNumber, message, Select, Textarea } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { portfolioTitlePromotionApi } from '@/apis/portfolio/title-promotion'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import { readUiDataTablePagination } from '@/components/ui-guide/ui/data-table'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiEmpty from '@/components/ui-guide/ui/UiEmpty.vue'
import UiTag from '@/components/ui-guide/ui/UiTag.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination'
import {
  ALL_PORTFOLIO_TITLE_PROMOTION_APPLICATION_STATUS_CODES,
  PortfolioTitlePromotionApplicationStatusCode,
  PortfolioTitlePromotionApplicationStatusDescription,
} from '@/types/enums/portfolio-title-promotion-application-status-enum'
import {
  PortfolioTitlePromotionTaskStatusCode,
  PortfolioTitlePromotionTaskStatusDescription,
} from '@/types/enums/portfolio-title-promotion-task-status-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const activeTab = ref<'task' | 'application'>('task')
const taskLoading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const appLoading = ref(false)
const saving = ref(false)
const tasks = ref<PortfolioTitlePromotionTaskVO[]>([])
const apps = ref<PortfolioTitlePromotionApplicationVO[]>([])
const taskTotal = ref(0)
const appTotal = ref(0)
const editorOpen = ref(false)
const reviewOpen = ref(false)
const expertOpen = ref(false)
const publicityOpen = ref(false)
const editingId = ref<string | undefined>()
const reviewTarget = ref<PortfolioTitlePromotionApplicationVO | null>(null)
const expertTarget = ref<PortfolioTitlePromotionApplicationVO | null>(null)
const publicityTarget = ref<PortfolioTitlePromotionApplicationVO | null>(null)

const taskQuery = reactive({ pageNum: 1, pageSize: DEFAULT_LIST_PAGE_SIZE })
const appQuery = reactive({
  pageNum: 1,
  pageSize: DEFAULT_LIST_PAGE_SIZE,
  applicationStatus: undefined as PortfolioTitlePromotionApplicationStatusCode | undefined,
})

const form = reactive({
  taskName: '',
  targetTitleLevel: '',
  reviewYear: String(new Date().getFullYear()),
  minOfficialArchiveCount: 1,
})

const reviewForm = reactive({
  opinion: '',
})

const expertForm = reactive({
  opinion: '',
})

const publicityForm = reactive({
  days: 7,
  remark: '',
})

const taskColumns: ColumnsType = [
  { title: '任务', dataIndex: 'taskName', key: 'taskName' },
  { title: '目标层级', dataIndex: 'targetTitleLevel', key: 'targetTitleLevel', width: 120 },
  { title: '年度', dataIndex: 'reviewYear', key: 'reviewYear', width: 80 },
  { title: '最少档案', dataIndex: 'minOfficialArchiveCount', key: 'minOfficialArchiveCount', width: 90 },
  { title: '状态', key: 'taskStatus', width: 100 },
  { title: '操作', key: 'actions', width: 220 },
]

const appColumns: ColumnsType = [
  { title: '单号', dataIndex: 'applicationNo', key: 'applicationNo', width: 180 },
  { title: '任务', dataIndex: 'taskName', key: 'taskName' },
  { title: '教师', dataIndex: 'teacherUserId', key: 'teacherUserId', width: 120 },
  { title: '匹配度', dataIndex: 'matchScore', key: 'matchScore', width: 90 },
  { title: '红线', key: 'redlineBlocked', width: 80 },
  { title: '状态', key: 'applicationStatus', width: 120 },
  { title: '操作', key: 'actions', width: 220 },
]

const taskPagination = computed(() => ({
  current: taskQuery.pageNum,
  pageSize: taskQuery.pageSize,
  total: taskTotal.value,
}))

const appPagination = computed(() => ({
  current: appQuery.pageNum,
  pageSize: appQuery.pageSize,
  total: appTotal.value,
}))

const statusOptions = ALL_PORTFOLIO_TITLE_PROMOTION_APPLICATION_STATUS_CODES.map(code => ({
  value: code,
  label: PortfolioTitlePromotionApplicationStatusDescription[code],
}))

function taskStatusLabel(code: string) {
  return strictEnumLabel(
    PortfolioTitlePromotionTaskStatusDescription,
    code as PortfolioTitlePromotionTaskStatusCode,
    '任务状态',
  )
}

function appStatusLabel(code: string) {
  return strictEnumLabel(
    PortfolioTitlePromotionApplicationStatusDescription,
    code as PortfolioTitlePromotionApplicationStatusCode,
    '申请状态',
  )
}

async function loadTasks() {
  beginLoad()
  taskLoading.value = true
  try {
    const page = await portfolioTitlePromotionApi.pageTask({
      pageNum: taskQuery.pageNum,
      pageSize: taskQuery.pageSize,
    })
    tasks.value = page.list ?? []
    taskTotal.value = page.total ?? 0
  
    okLoad()
  } catch (error) {
    failLoad()
    showUserError(error, '加载职称任务失败')
  } finally {
    taskLoading.value = false
  }
}

async function loadApps() {
  beginLoad()
  appLoading.value = true
  try {
    const page = await portfolioTitlePromotionApi.pageApplication({
      pageNum: appQuery.pageNum,
      pageSize: appQuery.pageSize,
      applicationStatus: appQuery.applicationStatus,
    })
    apps.value = page.list ?? []
    appTotal.value = page.total ?? 0
  
    okLoad()
  } catch (error) {
    failLoad()
    showUserError(error, '加载职称申报失败')
  } finally {
    appLoading.value = false
  }
}

function openCreate() {
  editingId.value = undefined
  form.taskName = ''
  form.targetTitleLevel = ''
  form.reviewYear = String(new Date().getFullYear())
  form.minOfficialArchiveCount = 1
  editorOpen.value = true
}

function openEdit(row: PortfolioTitlePromotionTaskVO) {
  if (row.taskStatus !== PortfolioTitlePromotionTaskStatusCode.DRAFT) {
    message.warning('仅草稿可编辑')
    return
  }
  editingId.value = row.id
  form.taskName = row.taskName
  form.targetTitleLevel = row.targetTitleLevel
  form.reviewYear = row.reviewYear
  form.minOfficialArchiveCount = row.minOfficialArchiveCount
  editorOpen.value = true
}

async function saveTask() {
  if (!form.taskName.trim() || !form.targetTitleLevel.trim() || !form.reviewYear.trim()) {
    message.error('任务名称、目标层级与年度不能为空')
    return
  }
  saving.value = true
  try {
    await portfolioTitlePromotionApi.saveTask({
      id: editingId.value,
      taskName: form.taskName.trim(),
      targetTitleLevel: form.targetTitleLevel.trim(),
      reviewYear: form.reviewYear.trim(),
      minOfficialArchiveCount: form.minOfficialArchiveCount,
    })
    message.success('任务已保存')
    editorOpen.value = false
    await loadTasks()
  } catch (error) {
    showUserError(error, '保存任务失败')
  } finally {
    saving.value = false
  }
}

async function publishTask(row: PortfolioTitlePromotionTaskVO) {
  try {
    await portfolioTitlePromotionApi.publishTask({ id: row.id })
    message.success('任务已发布')
    await loadTasks()
  } catch (error) {
    showUserError(error, '发布失败')
  }
}

async function closeTask(row: PortfolioTitlePromotionTaskVO) {
  try {
    await portfolioTitlePromotionApi.closeTask({ id: row.id })
    message.success('任务已关闭')
    await loadTasks()
  } catch (error) {
    showUserError(error, '关闭失败')
  }
}

function openExpertReview(row: PortfolioTitlePromotionApplicationVO) {
  expertTarget.value = row
  expertForm.opinion = ''
  expertOpen.value = true
}

function openPublicity(row: PortfolioTitlePromotionApplicationVO) {
  publicityTarget.value = row
  publicityForm.days = 7
  publicityForm.remark = ''
  publicityOpen.value = true
}

async function runExpertReview(approve: boolean) {
  if (!expertTarget.value?.id) return
  try {
    await portfolioTitlePromotionApi.expertReview({
      id: expertTarget.value.id,
      opinion: expertForm.opinion.trim() || undefined,
      approve,
    })
    message.success(approve ? '专家评审已通过' : '专家评审已驳回')
    expertOpen.value = false
    await loadApps()
  } catch (error) {
    showUserError(error, '专家评审失败')
  }
}

async function runStartPublicity() {
  if (!publicityTarget.value?.id) return
  if (!publicityForm.days || publicityForm.days < 1) {
    message.error('公示天数须 >= 1')
    return
  }
  try {
    await portfolioTitlePromotionApi.startPublicity({
      id: publicityTarget.value.id,
      days: publicityForm.days,
      remark: publicityForm.remark.trim() || undefined,
    })
    message.success('公示已发布')
    publicityOpen.value = false
    await loadApps()
  } catch (error) {
    showUserError(error, '发布公示失败')
  }
}

async function runArchivePublicity(row: PortfolioTitlePromotionApplicationVO) {
  if (!row.id) return
  try {
    await portfolioTitlePromotionApi.archivePublicity({ id: row.id })
    message.success('公示已归档')
    await loadApps()
  } catch (error) {
    showUserError(error, '归档失败')
  }
}

function canArchivePublicity(row: PortfolioTitlePromotionApplicationVO) {
  if (row.applicationStatus !== PortfolioTitlePromotionApplicationStatusCode.PUBLICITY) return false
  if (!row.publicityEndTime) return false
  return new Date(row.publicityEndTime).getTime() <= Date.now()
}

function openReview(row: PortfolioTitlePromotionApplicationVO) {
  reviewTarget.value = row
  reviewForm.opinion = ''
  reviewOpen.value = true
}

async function runReview(action: 'collegeApprove' | 'collegeReturn' | 'hrApprove' | 'hrReturn' | 'hrReject') {
  if (!reviewTarget.value?.id) return
  try {
    const payload = { id: reviewTarget.value.id, opinion: reviewForm.opinion.trim() || undefined }
    await portfolioTitlePromotionApi[action](payload)
    message.success('审核操作已完成')
    reviewOpen.value = false
    await loadApps()
  } catch (error) {
    showUserError(error, '审核失败')
  }
}

function onTaskTableChange(e: UiDataTableChangeEvent) {
  const page = readUiDataTablePagination(e, DEFAULT_LIST_PAGE_SIZE)
  taskQuery.pageNum = page.pageNum
  taskQuery.pageSize = page.pageSize
  void loadTasks()
}

function onAppTableChange(e: UiDataTableChangeEvent) {
  const page = readUiDataTablePagination(e, DEFAULT_LIST_PAGE_SIZE)
  appQuery.pageNum = page.pageNum
  appQuery.pageSize = page.pageSize
  void loadApps()
}

onMounted(() => {
  void loadTasks()
  void loadApps()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="职称申报辅助"
        subtitle="任务发布 · 匹配度核验"
      >
        <template #actions>
          <UiButton v-if="activeTab === 'task'" @click="openCreate">
            新建任务
          </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <a-tabs v-model:active-key="activeTab">
        <a-tab-pane key="task" tab="申报任务">
          <a-spin :spinning="taskLoading">
            <UiEmpty v-if="!taskLoading && !tasks.length" description="暂无职称申报任务" />
            <UiDataTable
              :load-error="loadError"
              v-else
              row-key="id"
              :columns="taskColumns"
              :data-source="tasks"
              :pagination="taskPagination"
              @change="onTaskTableChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'taskStatus'">
                  <UiTag>{{ taskStatusLabel(record.taskStatus) }}</UiTag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiButton
                    v-if="record.taskStatus === 'DRAFT'"
                    size="sm"
                    variant="soft"
                    @click="openEdit(record)"
                  >
                    编辑
                  </UiButton>
                  <UiButton
                    v-if="record.taskStatus === 'DRAFT'"
                    size="sm"
                    @click="publishTask(record)"
                  >
                    发布
                  </UiButton>
                  <UiButton
                    v-if="record.taskStatus === 'PUBLISHED'"
                    size="sm"
                    variant="soft"
                    @click="closeTask(record)"
                  >
                    关闭
                  </UiButton>
                </template>
              </template>
            </UiDataTable>
          </a-spin>
        </a-tab-pane>
        <a-tab-pane key="application" tab="申报审核">
          <div class="title-promo__filters">
            <Select
              v-model:value="appQuery.applicationStatus"
              allow-clear
              placeholder="申请状态"
              style="width: 180px"
              :options="statusOptions"
              @change="() => { appQuery.pageNum = 1; void loadApps() }"
            />
          </div>
          <a-spin :spinning="appLoading">
            <UiEmpty v-if="!appLoading && !apps.length" description="暂无申报单" />
            <UiDataTable
              :load-error="loadError"
              v-else
              row-key="id"
              :columns="appColumns"
              :data-source="apps"
              :pagination="appPagination"
              @change="onAppTableChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'redlineBlocked'">
                  <UiTag :tone="record.redlineBlocked ? 'red' : 'green'">
                    {{ record.redlineBlocked ? '阻断' : '通过' }}
                  </UiTag>
                </template>
                <template v-else-if="column.key === 'applicationStatus'">
                  <UiTag>{{ appStatusLabel(record.applicationStatus) }}</UiTag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <UiButton
                    v-if="record.applicationStatus === 'COLLEGE_PENDING' || record.applicationStatus === 'HR_PENDING'"
                    size="sm"
                    @click="openReview(record)"
                  >
                    审核
                  </UiButton>
                  <UiButton
                    v-if="record.applicationStatus === 'EXPERT_PENDING'"
                    size="sm"
                    @click="openExpertReview(record)"
                  >
                    专家评审
                  </UiButton>
                  <UiButton
                    v-if="record.applicationStatus === 'PUBLICITY' && !record.publicityStartTime"
                    size="sm"
                    @click="openPublicity(record)"
                  >
                    发布公示
                  </UiButton>
                  <UiButton
                    v-if="canArchivePublicity(record)"
                    size="sm"
                    variant="soft"
                    @click="runArchivePublicity(record)"
                  >
                    归档
                  </UiButton>
                </template>
              </template>
            </UiDataTable>
          </a-spin>
        </a-tab-pane>
      </a-tabs>
    </UiCard>

    <UiDrawer v-model:open="editorOpen" :title="editingId ? '编辑职称评审任务' : '新建职称评审任务'" width="480">
      <div class="title-promo__form">
        <label>任务名称</label>
        <Input v-model:value="form.taskName" />
        <label>目标职称层级</label>
        <Input v-model:value="form.targetTitleLevel" placeholder="如：副教授" />
        <label>评审年度</label>
        <Input v-model:value="form.reviewYear" />
        <label>最少正式档案数</label>
        <InputNumber v-model:value="form.minOfficialArchiveCount" :min="1" class="w-full" />
      </div>
      <template #footer>
        <UiButton variant="soft" @click="editorOpen = false">
          取消
        </UiButton>
        <UiButton :loading="saving" @click="saveTask">
          保存
        </UiButton>
      </template>
    </UiDrawer>

    <UiDrawer v-model:open="reviewOpen" title="审核申报" width="520">
      <div v-if="reviewTarget" class="title-promo__form">
        <p>{{ reviewTarget.taskName }} · {{ reviewTarget.applicationNo }}</p>
        <p>匹配度 {{ reviewTarget.matchScore }} · 硬性 {{ reviewTarget.hardRate }} · 材料 {{ reviewTarget.materialRate }} · 指标 {{ reviewTarget.indicatorRate }}</p>
        <ul class="title-promo__match">
          <li v-for="item in reviewTarget.matchDetails" :key="item.itemCode">
            <UiTag :tone="item.satisfied ? 'green' : 'red'" size="sm">
              {{ item.satisfied ? '满足' : '不满足' }}
            </UiTag>
            {{ item.itemTitle }}：{{ item.evidenceSummary }}
            <span v-if="item.gapHint">（{{ item.gapHint }}）</span>
          </li>
        </ul>
        <label>审核意见</label>
        <Textarea v-model:value="reviewForm.opinion" :rows="3" />
        <div class="title-promo__actions">
          <template v-if="reviewTarget.applicationStatus === 'COLLEGE_PENDING'">
            <UiButton @click="runReview('collegeApprove')">
              院审通过
            </UiButton>
            <UiButton variant="soft" @click="runReview('collegeReturn')">
              院审退回
            </UiButton>
          </template>
          <template v-else-if="reviewTarget.applicationStatus === 'HR_PENDING'">
            <UiButton @click="runReview('hrApprove')">
              人事复审通过
            </UiButton>
            <UiButton variant="soft" @click="runReview('hrReturn')">
              人事退回
            </UiButton>
            <UiButton variant="soft" @click="runReview('hrReject')">
              驳回
            </UiButton>
          </template>
        </div>
      </div>
    </UiDrawer>

    <UiDrawer v-model:open="expertOpen" title="专家评审" width="520">
      <div v-if="expertTarget" class="title-promo__form">
        <p>{{ expertTarget.taskName }} · {{ expertTarget.applicationNo }}</p>
        <p>匹配度 {{ expertTarget.matchScore }} · 硬性 {{ expertTarget.hardRate }} · 材料 {{ expertTarget.materialRate }} · 指标 {{ expertTarget.indicatorRate }}</p>
        <label>专家意见</label>
        <Textarea v-model:value="expertForm.opinion" :rows="3" />
        <div class="title-promo__actions">
          <UiButton @click="runExpertReview(true)">
            通过并进入公示
          </UiButton>
          <UiButton variant="soft" @click="runExpertReview(false)">
            驳回
          </UiButton>
        </div>
      </div>
    </UiDrawer>

    <UiDrawer v-model:open="publicityOpen" title="发布公示" width="480">
      <div v-if="publicityTarget" class="title-promo__form">
        <p>{{ publicityTarget.taskName }} · {{ publicityTarget.applicationNo }}</p>
        <label>公示天数</label>
        <InputNumber v-model:value="publicityForm.days" :min="1" class="w-full" />
        <label>公示说明</label>
        <Textarea v-model:value="publicityForm.remark" :rows="3" />
        <div class="title-promo__actions">
          <UiButton @click="runStartPublicity">
            发布公示
          </UiButton>
        </div>
      </div>
    </UiDrawer>
  </StageWorkbenchShell>
</template>

<style scoped>
.title-promo__filters {
  margin-bottom: 12px;
}
.title-promo__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.title-promo__form label {
  font-size: 13px;
  color: var(--dp-text-secondary, #64748b);
}
.title-promo__match {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  line-height: 1.6;
}
.title-promo__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.w-full {
  width: 100%;
}
</style>
