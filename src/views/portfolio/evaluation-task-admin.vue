<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioEvaluationTaskStatusCode } from '@/apis/portfolio/enums'
import {
  PORTFOLIO_EVALUATION_MODE_OPTIONS,
  PORTFOLIO_EVALUATION_TASK_STATUS_OPTIONS,
  PORTFOLIO_EVALUATION_TASK_STATUS_TONE,
  PortfolioEvaluationModeCode,
  PortfolioEvaluationModeDescription,
  PortfolioEvaluationTaskStatusDescription,
} from '@/apis/portfolio/enums'
import type { PortfolioEvaluationSubjectTeacherOptionVO } from '@/apis/portfolio/teacher-platform'
import { portfolioEvaluationTaskApi } from '@/apis/portfolio/teacher-platform'
import type { PortfolioEvaluationMaterialPreviewVO } from '@/apis/portfolio/types'
import type { EvaluationWorkgroupVO } from '@/apis/quality/evaluation-workgroup'
import { evaluationWorkgroupApi } from '@/apis/quality/evaluation-workgroup'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { portfolioEvaluationNoticeApi } from '@/apis/portfolio/evaluation-notice'
import { QUALITY_SELECTOR_PAGE_SIZE } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { useQueryTable } from '@/composables/useQueryTable'
import { showUserError } from '@/utils/error-handler'
import { loadAllPages } from '@/utils/load-all-pages'
import { downloadPortfolioExcelExport } from '@/utils/portfolio-excel-export'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const workgroups = ref<EvaluationWorkgroupVO[]>([])
const previewTeacherOptions = ref<Array<{ value: string; label: string }>>([])
const previewOpen = ref(false)
const previewLoading = ref(false)
const previewTaskId = ref('')
const previewTeacherId = ref('')
const preview = ref<PortfolioEvaluationMaterialPreviewVO | null>(null)
const previewRequestToken = ref(0)

const categoryColumns = [
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName' },
  { title: '完成', key: 'completed', width: 100 },
]
interface PortfolioEvaluationTaskForm {
  taskName: string
  evaluationMode: PortfolioEvaluationModeCode
  workgroupId: string
  startTime: string
  endTime: string
}

type PortfolioEvaluationTaskStatusFilter = '' | PortfolioEvaluationTaskStatusCode

const form = reactive<PortfolioEvaluationTaskForm>({
  taskName: '',
  evaluationMode: PortfolioEvaluationModeCode.BY_PERSON,
  workgroupId: '',
  startTime: '',
  endTime: '',
})
const {
  loading,
  rows,
  pageNum,
  pageSize,
  pageTotal,
  filters: query,
  loadPage,
  search,
  handlePageChange,
} = useQueryTable(
  (params) =>
    portfolioEvaluationTaskApi.page({
      ...params,
      taskStatus: params.taskStatus || undefined,
    }),
  {
    defaultFilters: () => ({ taskStatus: '' as PortfolioEvaluationTaskStatusFilter }),
    immediate: false,
  },
)

const evaluationModeOptions = PORTFOLIO_EVALUATION_MODE_OPTIONS

const taskStatusOptions = PORTFOLIO_EVALUATION_TASK_STATUS_OPTIONS

const columns: ColumnsType = [
  { title: '任务名称', dataIndex: 'taskName', key: 'taskName' },
  { title: '模式', dataIndex: 'evaluationMode', key: 'evaluationMode', width: 100 },
  { title: '工作组', dataIndex: 'workgroupId', key: 'workgroupId', width: 100 },
  { title: '时间窗', key: 'timeWindow', width: 180 },
  { title: '状态', dataIndex: 'taskStatus', key: 'taskStatus', width: 88 },
  { title: '创建时间', dataIndex: 'createTime', key: 'createTime', width: 160 },
  { title: '操作', key: 'actions', width: 140 },
]

function evaluationModeLabel(mode: PortfolioEvaluationModeCode): string {
  return strictEnumLabel(PortfolioEvaluationModeDescription, mode, '多元评价模式')
}

function taskStatusLabel(status: PortfolioEvaluationTaskStatusCode): string {
  return strictEnumLabel(PortfolioEvaluationTaskStatusDescription, status, '多元评价任务状态')
}

function taskStatusTone(status: PortfolioEvaluationTaskStatusCode) {
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
    workgroups.value = await loadAllPages(
      ({ pageNum, pageSize }) =>
        evaluationWorkgroupApi.page({
          pageNum,
          pageSize,
        }),
      QUALITY_SELECTOR_PAGE_SIZE,
    )
  } catch (error) {
    showUserError(error)
  }
}

/** 材料预览必须限定在当前评价任务参评教师范围内，避免误用全局教师名册第一页导致错人预览。 */
function buildPreviewTeacherOptions(rows: PortfolioEvaluationSubjectTeacherOptionVO[]) {
  return rows.map((item) => ({
    value: item.teacherUserId,
    label: item.fullName?.trim() ? item.fullName : item.teacherUserId,
  }))
}

async function openMaterialPreview(taskId: string) {
  const currentToken = ++previewRequestToken.value
  previewTaskId.value = taskId
  previewTeacherId.value = ''
  previewTeacherOptions.value = []
  preview.value = null
  previewOpen.value = true
  previewLoading.value = true
  try {
    const fillContext = await portfolioEvaluationTaskApi.fillContext({ id: taskId })
    if (currentToken !== previewRequestToken.value || previewTaskId.value !== taskId) {
      return
    }
    previewTeacherOptions.value = buildPreviewTeacherOptions(
      fillContext.subjectTeacherOptions ?? [],
    )
    previewTeacherId.value = previewTeacherOptions.value[0]?.value ?? ''
    if (!previewTeacherId.value) {
      preview.value = null
      return
    }
    await loadMaterialPreview()
  } catch (error) {
    if (currentToken !== previewRequestToken.value || previewTaskId.value !== taskId) {
      return
    }
    previewTeacherOptions.value = []
    previewTeacherId.value = ''
    preview.value = null
    showUserError(error, '加载任务参评教师失败')
  } finally {
    if (currentToken === previewRequestToken.value && previewTaskId.value === taskId) {
      previewLoading.value = false
    }
  }
}

async function loadMaterialPreview() {
  const currentToken = ++previewRequestToken.value
  if (!previewTaskId.value || !previewTeacherId.value) {
    message.warning('请选择教师后再预览材料')
    return
  }
  const taskId = previewTaskId.value
  const teacherId = previewTeacherId.value
  previewLoading.value = true
  try {
    const nextPreview = await portfolioEvaluationNoticeApi.materialPreview({
      evaluationTaskId: taskId,
      teacherId,
    })
    if (
      currentToken !== previewRequestToken.value ||
      previewTaskId.value !== taskId ||
      previewTeacherId.value !== teacherId
    ) {
      return
    }
    preview.value = nextPreview
  } catch (error) {
    if (
      currentToken !== previewRequestToken.value ||
      previewTaskId.value !== taskId ||
      previewTeacherId.value !== teacherId
    ) {
      return
    }
    preview.value = null
    showUserError(error, '加载材料预览失败')
  } finally {
    if (
      currentToken === previewRequestToken.value &&
      previewTaskId.value === taskId &&
      previewTeacherId.value === teacherId
    ) {
      previewLoading.value = false
    }
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
          @change="search"
        />
        <UiButton @click="search"> 查询 </UiButton>
      </div>
      <UiEmpty v-if="!loading && rows.length === 0" description="当前筛选无评价任务" />
      <UiDataTable
        v-model:current="pageNum"
        v-model:page-size="pageSize"
        pagination-mode="server"
        :total="pageTotal"
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        row-key="id"
        @page-change="handlePageChange"
      >
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
            <UiTableActions
              :items="[
                {
                  key: 'publish',
                  label: '发布',
                  hidden: record.taskStatus === 'PUBLISHED' || record.taskStatus === 'CLOSED',
                },
                { key: 'preview', label: '材料预览' },
              ]"
              split
              @action="
                (key) =>
                  key === 'preview' ? openMaterialPreview(record.id) : publishTask(record.id)
              "
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>
    <a-modal v-model:open="previewOpen" title="评价材料预览" width="720px" :footer="null">
      <div class="evaluation-task-admin__preview-bar">
        <a-select
          v-model:value="previewTeacherId"
          placeholder="选择教师"
          :options="previewTeacherOptions"
          style="width: 240px"
          option-label-prop="label"
        />
        <UiButton variant="primary" :loading="previewLoading" @click="loadMaterialPreview"
          >加载预览</UiButton
        >
      </div>
      <template v-if="preview">
        <p class="evaluation-task-admin__preview-meta">
          任务：{{ preview.taskName }} · 完整度 {{ preview.completenessPercent }}% · 必填分类
          {{ preview.requiredCategoryDone }} / {{ preview.requiredCategoryTotal }}
        </p>
        <UiDataTable
          v-if="preview.categories?.length"
          row-key="categoryId"
          size="small"
          pagination-mode="none"
          :columns="categoryColumns"
          :data-source="preview.categories"
          :show-pagination="false"
          :sticky-header="false"
          flat
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'completed'">
              <UiTag :tone="record.completed ? 'green' : 'orange'">
                {{ record.completed ? '已完成' : '未完成' }}
              </UiTag>
            </template>
          </template>
        </UiDataTable>
        <UiEmpty v-else description="暂无分类明细" />
      </template>
    </a-modal>
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
.evaluation-task-admin__preview-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.evaluation-task-admin__preview-meta {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--nybc-text-secondary, #666);
}
</style>
