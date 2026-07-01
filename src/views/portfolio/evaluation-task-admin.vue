<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationMode, PortfolioEvaluationTaskStatus } from '@/apis/portfolio/enums'
import type { PortfolioEvaluationTaskVO } from '@/apis/portfolio/teacher-platform'
import type { EvaluationWorkgroupVO } from '@/apis/quality/evaluation-workgroup'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  PORTFOLIO_EVALUATION_MODE_LABEL,
  PORTFOLIO_EVALUATION_TASK_STATUS_LABEL,
  PORTFOLIO_EVALUATION_TASK_STATUS_TONE,
} from '@/apis/portfolio/enums'
import { portfolioEvaluationTaskApi } from '@/apis/portfolio/teacher-platform'
import { evaluationWorkgroupApi } from '@/apis/quality/evaluation-workgroup'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const loading = ref(false)
const rows = ref<PortfolioEvaluationTaskVO[]>([])
const total = ref(0)
const workgroups = ref<EvaluationWorkgroupVO[]>([])
const form = reactive({
  taskName: '',
  evaluationMode: 'BY_PERSON' as PortfolioEvaluationMode,
  workgroupId: '' as string,
  startTime: '',
  endTime: '',
})
const query = reactive({
  pageNum: 1,
  pageSize: 20,
  taskStatus: '' as '' | PortfolioEvaluationTaskStatus,
})

const evaluationModeOptions = (
  Object.keys(PORTFOLIO_EVALUATION_MODE_LABEL) as PortfolioEvaluationMode[]
).map((value) => ({ value, label: PORTFOLIO_EVALUATION_MODE_LABEL[value] }))

const taskStatusOptions = (
  Object.keys(PORTFOLIO_EVALUATION_TASK_STATUS_LABEL) as PortfolioEvaluationTaskStatus[]
).map((value) => ({ value, label: PORTFOLIO_EVALUATION_TASK_STATUS_LABEL[value] }))

const columns: ColumnsType = [
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName' },
  { title: '模式', dataIndex: 'evaluationMode', key: 'evaluationMode', width: 100 },
  { title: '工作组', dataIndex: 'workgroupId', key: 'workgroupId', width: 100 },
  { title: '时间窗', key: 'timeWindow', width: 180 },
  { title: '状态', dataIndex: 'taskStatus', key: 'taskStatus', width: 88 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 72 },
]

function evaluationModeLabel(mode: PortfolioEvaluationMode): string {
  return strictEnumLabel(PORTFOLIO_EVALUATION_MODE_LABEL, mode, '多元评价模式')
}

function taskStatusLabel(status: PortfolioEvaluationTaskStatus): string {
  return strictEnumLabel(PORTFOLIO_EVALUATION_TASK_STATUS_LABEL, status, '多元评价任务状态')
}

function taskStatusTone(status: PortfolioEvaluationTaskStatus) {
  return strictEnumTone(PORTFOLIO_EVALUATION_TASK_STATUS_TONE, status, '多元评价任务状态')
}

function workgroupName(id?: string) {
  if (!id) {
    return '—'
  }
  return workgroups.value.find((item) => item.id === id)?.workgroupName ?? id
}

async function loadWorkgroups() {
  try {
    const page = await evaluationWorkgroupApi.page({ pageNum: 1, pageSize: 100, enabled: true })
    workgroups.value = page.list ?? []
  } catch (error) {
    showUserError(error)
  }
}

async function loadPage() {
  loading.value = true
  try {
    const page = await portfolioEvaluationTaskApi.page({
      pageNum: query.pageNum,
      pageSize: query.pageSize,
      taskStatus: query.taskStatus || undefined,
    })
    rows.value = readPageList(page, '加载评价任务失败')
    total.value = readPageTotal(page)
  } catch (error) {
    showUserError(error)
  } finally {
    loading.value = false
  }
}

async function createTask() {
  if (!form.taskName.trim()) {
    message.warning('请填写任务名称')
    return
  }
  if (!form.workgroupId) {
    message.warning('请选择评价工作组')
    return
  }
  if (!form.startTime) {
    message.warning('请填写开始时间')
    return
  }
  if (!form.endTime) {
    message.warning('请填写结束时间')
    return
  }
  try {
    await portfolioEvaluationTaskApi.create({
      taskName: form.taskName.trim(),
      evaluationMode: form.evaluationMode,
      workgroupId: form.workgroupId,
      startTime: form.startTime,
      endTime: form.endTime,
    })
    message.success('评价任务已创建')
    form.taskName = ''
    form.workgroupId = ''
    form.startTime = ''
    form.endTime = ''
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

async function publishTask(id: string) {
  try {
    await portfolioEvaluationTaskApi.publish({ id })
    message.success('任务已发布')
    await loadPage()
  } catch (error) {
    showUserError(error)
  }
}

async function exportExcel() {
  try {
    const result = await portfolioEvaluationTaskApi.exportExcel()
    await downloadPortfolioExcelExport(result)
    message.success('评价任务已导出')
  } catch (error) {
    showUserError(error)
  }
}

onMounted(async () => {
  await loadWorkgroups()
  await loadPage()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title layout="workbench" title="多元评价任务">
        <template #actions>
          <UiButton @click="exportExcel"> 导出 Excel </UiButton>
        </template>
      </ContextBar>
    </template>
    <UiCard>
      <div class="form-row">
        <input v-model="form.taskName" class="input input--wide" placeholder="任务名称" />
        <a-select
          v-model:value="form.evaluationMode"
          placeholder="评价模式"
          style="width: 120px"
          :options="evaluationModeOptions"
        />
        <a-select v-model:value="form.workgroupId" placeholder="评价工作组" style="width: 200px">
          <a-select-option v-for="wg in workgroups" :key="wg.id" :value="wg.id">
            {{ wg.workgroupName }}
          </a-select-option>
        </a-select>
        <a-date-picker
          v-model:value="form.startTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          show-time
          placeholder="开始时间"
        />
        <a-date-picker
          v-model:value="form.endTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          show-time
          placeholder="结束时间"
        />
        <UiButton variant="primary" @click="createTask"> 创建任务 </UiButton>
      </div>
      <div class="filter-row">
        <a-select
          v-model:value="query.taskStatus"
          allow-clear
          placeholder="任务状态"
          style="width: 120px"
          :options="taskStatusOptions"
          @change="loadPage"
        />
        <UiButton @click="loadPage"> 查询 </UiButton>
      </div>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无评价任务" />
      <UiDataTable :columns="columns" :data-source="rows" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'evaluationMode'">
            {{ evaluationModeLabel(record.evaluationMode) }}
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <UiTag :tone="taskStatusTone(record.taskStatus)">
              {{ taskStatusLabel(record.taskStatus) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'workgroupId'">
            {{ workgroupName(record.workgroupId) }}
          </template>
          <template v-else-if="column.key === 'timeWindow'">
            <span v-if="record.startTime || record.endTime">
              {{ record.startTime ?? '—' }} ~ {{ record.endTime ?? '—' }}
            </span>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a
              v-if="record.taskStatus !== 'PUBLISHED' && record.taskStatus !== 'CLOSED'"
              @click="publishTask(record.id)"
            >发布</a>
          </template>
        </template>
      </UiDataTable>
      <a-pagination
        v-model:current="query.pageNum"
        :total="total"
        :page-size="query.pageSize"
        style="margin-top: 12px"
        @change="loadPage"
      />
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.form-row,
.filter-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--ant-color-border);
  border-radius: 4px;
}
.input--wide {
  flex: 1;
  min-width: 200px;
}
</style>
