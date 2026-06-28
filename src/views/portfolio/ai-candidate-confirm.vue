<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  PortfolioAiExtractTaskType,
  PortfolioAiJobTaskVO,
  PortfolioAiTaskType,
  PortfolioCandidateFieldVO,
  PortfolioMaterialType,
  PortfolioTeacherSummaryVO,
} from '@/apis/portfolio/types'
import type { AiTaskStatus } from '@/apis/quality/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import { portfolioTeacherApi } from '@/apis/portfolio/teacher'
import {
  PORTFOLIO_AI_EXTRACT_TASK_TYPE_OPTIONS,
  PORTFOLIO_AI_TASK_TYPE_LABEL,
  PORTFOLIO_CANDIDATE_CONFIRM_STATUS_LABEL,
  PORTFOLIO_CANDIDATE_CONFIRM_STATUS_TONE,
  PORTFOLIO_TEMPLATE_CODE_CERTIFICATE,
  PORTFOLIO_TEMPLATE_CODE_DOCUMENT,
} from '@/apis/portfolio/types'
import {
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
} from '@/apis/quality/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import UiAlert from '@/components/ui-guide/ui/Alert.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePolling } from '@/composables/usePolling'
import { usePortfolioPageScope, usePortfolioScopedLoader } from '@/composables/usePortfolioPageScope'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { containsPortfolioPiiPlaceholder } from '@/utils/portfolio-pii-placeholder'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

function readRouteStringParam(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const route = useRoute()
const router = useRouter()
const { targetTeacherId, canPickTeachers, scopeReady } = usePortfolioPageScope()
const { canManageTeacherAi } = usePortfolioTeacherAccess()
const submitTaskType = ref<PortfolioAiExtractTaskType>('PORTFOLIO_CERTIFICATE_OCR')
const materialFileNodeId = ref<string>()
const materialFileName = ref<string>()
const submitting = ref(false)

const tasksLoading = ref(false)
const taskRows = ref<PortfolioAiJobTaskVO[]>([])
const taskPageNum = ref(1)
const taskPageTotal = ref(0)
const activeTaskId = ref<string>(readRouteStringParam(route.query.taskId))

const candidatesLoading = ref(false)
const candidateRows = ref<PortfolioCandidateFieldVO[]>([])
const correctedValues = reactive<Record<string, string>>({})
const confirmingId = ref<string>('')
const teacherOptions = ref<PortfolioTeacherSummaryVO[]>([])
const teacherSearchLoading = ref(false)
const activeTask = computed(() =>
  taskRows.value.find(item => item.id === activeTaskId.value) ?? null)

const canOperateSelectedTeacher = computed(() =>
  Boolean(targetTeacherId.value
    && canManageTeacherAi(
      targetTeacherId.value,
      teacherOptions.value.some(item => item.userId === targetTeacherId.value),
    )),
)

const pendingTaskPolling = computed(() =>
  taskRows.value.some(item =>
    item.status === 'PENDING' || item.status === 'PROCESSING'))

const manualFillPendingCount = computed(() =>
  candidateRows.value.filter(item => item.manualFillRequired
    || item.confirmStatus === 'NEEDS_MANUAL_FILL').length)

const taskColumns: ColumnsType = [
  { title: '任务 ID', dataIndex: 'id', key: 'id', width: 100 },
  { title: '类型', key: 'taskType', width: 160 },
  { title: '状态', key: 'status', width: 110 },
  { title: '提交时间', dataIndex: 'createTime', key: 'createTime', width: 170 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const candidateColumns: ColumnsType = [
  { title: '字段', key: 'fieldLabel', width: 140 },
  { title: '候选值', key: 'candidateValue', width: 220 },
  { title: '证据引用', dataIndex: 'evidenceRef', key: 'evidenceRef' },
  { title: '状态', key: 'confirmStatus', width: 120 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

function portfolioTaskTypeLabel(taskType: PortfolioAiTaskType): string {
  return strictEnumLabel(PORTFOLIO_AI_TASK_TYPE_LABEL, taskType, '档案袋 AI 任务类型')
}

function portfolioAiTaskStatusLabel(value: AiTaskStatus): string {
  return strictEnumLabel(AI_TASK_STATUS_LABEL, value, '档案袋 AI 任务状态')
}

function portfolioAiTaskStatusTone(value: AiTaskStatus): BadgeTone {
  return strictEnumTone(AI_TASK_STATUS_COLOR, value, '档案袋 AI 任务状态')
}

function candidateStatusLabel(row: PortfolioCandidateFieldVO): string {
  return strictEnumLabel(
    PORTFOLIO_CANDIDATE_CONFIRM_STATUS_LABEL,
    row.confirmStatus,
    '候选字段确认状态',
  )
}

function candidateStatusTone(row: PortfolioCandidateFieldVO): BadgeTone {
  return strictEnumTone(
    PORTFOLIO_CANDIDATE_CONFIRM_STATUS_TONE,
    row.confirmStatus,
    '候选字段确认状态',
  )
}

function resolveSubmitContract(taskType: PortfolioAiExtractTaskType): {
  materialType: PortfolioMaterialType
  templateCode: string
} {
  if (taskType === 'PORTFOLIO_CERTIFICATE_OCR') {
    return {
      materialType: 'CERTIFICATE',
      templateCode: PORTFOLIO_TEMPLATE_CODE_CERTIFICATE,
    }
  }
  return {
    materialType: 'DOCUMENT',
    templateCode: PORTFOLIO_TEMPLATE_CODE_DOCUMENT,
  }
}

function openPortfolioScan() {
  if (!targetTeacherId.value) {
    message.error('请先选择教师')
    return
  }
  const contract = resolveSubmitContract(submitTaskType.value)
  void router.push({
    path: '/scanner-kiosk/portfolio/session',
    query: {
      collectMode: 'AI_SUBMIT',
      teacherId: targetTeacherId.value,
      taskType: submitTaskType.value,
      templateCode: contract.templateCode,
      returnTo: route.fullPath,
    },
  })
}

function rowNeedsManualFill(row: PortfolioCandidateFieldVO): boolean {
  return Boolean(row.manualFillRequired) || row.confirmStatus === 'NEEDS_MANUAL_FILL'
}

function correctedValueFor(row: PortfolioCandidateFieldVO): string {
  return correctedValues[row.id] ?? ''
}

function canConfirmRow(row: PortfolioCandidateFieldVO): boolean {
  if (row.confirmStatus === 'CONFIRMED' || row.confirmStatus === 'REJECTED') {
    return false
  }
  if (rowNeedsManualFill(row)) {
    const corrected = correctedValueFor(row).trim()
    return corrected.length > 0 && !containsPortfolioPiiPlaceholder(corrected)
  }
  return row.confirmStatus === 'PENDING_CONFIRM'
}

async function loadTeacherOptions(keyword?: string) {
  if (!canPickTeachers.value) {
    return
  }
  teacherSearchLoading.value = true
  try {
    const page = await portfolioTeacherApi.page({
      pageNum: 1,
      pageSize: 20,
      searchText: keyword?.trim() || undefined,
    })
    teacherOptions.value = readPageList(page, '加载教师名册失败')
  } catch (error) {
    showUserError(error, '加载教师名册失败')
  } finally {
    teacherSearchLoading.value = false
  }
}

async function loadTasks() {
  if (!targetTeacherId.value) {
    taskRows.value = []
    taskPageTotal.value = 0
    activeTaskId.value = ''
    candidateRows.value = []
    return
  }
  if (!canManageTeacherAi(
    targetTeacherId.value,
    teacherOptions.value.some(item => item.userId === targetTeacherId.value),
  )) {
    taskRows.value = []
    taskPageTotal.value = 0
    activeTaskId.value = ''
    candidateRows.value = []
    return
  }
  tasksLoading.value = true
  try {
    const page = await portfolioAiJobApi.page({
      pageNum: taskPageNum.value,
      pageSize: 20,
      teacherId: targetTeacherId.value,
      candidateExtractOnly: true,
    })
    const rows = readPageList(page, '加载档案袋 AI 任务失败')
    taskRows.value = rows
    taskPageTotal.value = readPageTotal(page, '加载档案袋 AI 任务失败')
    if (activeTaskId.value && !rows.some(item => item.id === activeTaskId.value)) {
      activeTaskId.value = ''
      candidateRows.value = []
    }
    const routeTaskId = readRouteStringParam(route.query.taskId)
    if (routeTaskId && rows.some(item => item.id === routeTaskId)) {
      activeTaskId.value = routeTaskId
    }
    if (activeTaskId.value) {
      await loadCandidates(activeTaskId.value)
    }
  } catch (error) {
    showUserError(error, '加载档案袋 AI 任务失败')
  } finally {
    tasksLoading.value = false
  }
}

async function loadCandidates(taskId: string) {
  const task = taskRows.value.find(item => item.id === taskId)
  if (!task || task.status !== 'SUCCEEDED') {
    candidateRows.value = []
    return
  }
  candidatesLoading.value = true
  try {
    const rows = await portfolioAiJobApi.listCandidates(taskId) ?? []
    candidateRows.value = rows
    for (const row of rows) {
      if (!correctedValues[row.id]) {
        correctedValues[row.id] = rowNeedsManualFill(row) ? '' : row.candidateValue
      }
    }
  } catch (error) {
    showUserError(error, '加载候选字段失败')
  } finally {
    candidatesLoading.value = false
  }
}

async function selectTask(task: PortfolioAiJobTaskVO) {
  activeTaskId.value = task.id
  await router.replace({
    query: {
      ...route.query,
      teacherId: targetTeacherId.value,
      taskId: task.id,
    },
  })
  await loadCandidates(task.id)
}

function handleTaskPageChange(page: { current: number, pageSize: number }) {
  taskPageNum.value = page.current
  loadTasks()
}

async function submitExtractTask() {
  if (!targetTeacherId.value) {
    message.error('请先选择教师')
    return
  }
  if (!canOperateSelectedTeacher.value) {
    message.error('无权为该教师提交 AI 抽取任务')
    return
  }
  if (!materialFileNodeId.value) {
    message.error('请先上传材料文件')
    return
  }
  submitting.value = true
  try {
    const contract = resolveSubmitContract(submitTaskType.value)
    const result = await portfolioAiJobApi.submit({
      taskType: submitTaskType.value,
      teacherId: targetTeacherId.value,
      fileNodeId: materialFileNodeId.value,
      materialType: contract.materialType,
      templateCode: contract.templateCode,
    })
    message.success('已提交 AI 抽取任务')
    materialFileNodeId.value = undefined
    materialFileName.value = undefined
    await loadTasks()
    if (result.taskId) {
      const detail = await portfolioAiJobApi.get(result.taskId)
      activeTaskId.value = detail.id
      await selectTask(detail)
    }
  } catch (error) {
    showUserError(error, '提交 AI 抽取失败')
  } finally {
    submitting.value = false
  }
}

async function confirmCandidate(row: PortfolioCandidateFieldVO) {
  if (!canConfirmRow(row)) {
    message.error('请先补全真实候选值后再确认')
    return
  }
  confirmingId.value = row.id
  try {
    await portfolioAiJobApi.confirm({
      candidateFieldId: row.id,
      aiTaskId: row.aiTaskId,
      confirmStatus: 'CONFIRMED',
      correctedCandidateValue: rowNeedsManualFill(row)
        ? correctedValueFor(row).trim()
        : undefined,
    })
    message.success(`已确认字段：${row.fieldLabel}`)
    await loadCandidates(row.aiTaskId)
  } catch (error) {
    showUserError(error, '确认候选字段失败')
  } finally {
    confirmingId.value = ''
  }
}

async function rejectCandidate(row: PortfolioCandidateFieldVO) {
  void confirmAsync({
    title: '驳回该候选字段？',
    content: `字段「${row.fieldLabel}」将标记为已驳回，不会进入入档链。`,
    type: 'warning',
    onOk: async () => {
      confirmingId.value = row.id
      try {
        await portfolioAiJobApi.confirm({
          candidateFieldId: row.id,
          aiTaskId: row.aiTaskId,
          confirmStatus: 'REJECTED',
        })
        message.success(`已驳回字段：${row.fieldLabel}`)
        await loadCandidates(row.aiTaskId)
      } catch (error) {
        showUserError(error, '驳回候选字段失败')
      } finally {
        confirmingId.value = ''
      }
    },
  })
}

async function confirmAllEligible() {
  const eligible = candidateRows.value.filter(canConfirmRow)
  if (eligible.length === 0) {
    message.info('没有可自动确认的字段')
    return
  }
  confirmingId.value = 'batch'
  try {
    for (const row of eligible) {
      await portfolioAiJobApi.confirm({
        candidateFieldId: row.id,
        aiTaskId: row.aiTaskId,
        confirmStatus: 'CONFIRMED',
        correctedCandidateValue: rowNeedsManualFill(row)
          ? correctedValueFor(row).trim()
          : undefined,
      })
    }
    message.success(`已确认 ${eligible.length} 个字段`)
    if (activeTaskId.value) {
      await loadCandidates(activeTaskId.value)
    }
  } catch (error) {
    showUserError(error, '批量确认候选字段失败')
    if (activeTaskId.value) {
      await loadCandidates(activeTaskId.value)
    }
  } finally {
    confirmingId.value = ''
  }
}

usePolling(async () => {
  await loadTasks()
  if (activeTaskId.value) {
    await loadCandidates(activeTaskId.value)
  }
}, {
  getOptions: () => ({
    intervalMs: 4000,
    when: pendingTaskPolling.value,
    immediate: false,
  }),
  pauseWhenDocumentHidden: true,
})

usePortfolioScopedLoader(async () => {
  activeTaskId.value = readRouteStringParam(route.query.taskId)
  candidateRows.value = []
  await loadTasks()
}, () => targetTeacherId.value)

onMounted(async () => {
  if (canPickTeachers.value) {
    await loadTeacherOptions()
  }
  else if (targetTeacherId.value) {
    try {
      const detail = await portfolioTeacherApi.get(targetTeacherId.value)
      teacherOptions.value = [{
        userId: detail.userId,
        nickName: detail.nickName,
        userName: detail.userName,
        teacherNumber: detail.teacherNumber,
      }]
    }
    catch (error) {
      showUserError(error, '加载当前教师信息失败')
    }
  }
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="portfolio-ai-confirm__context">
        <div>
          <h1 class="portfolio-ai-confirm__title">AI 候选字段确认</h1>
          <p class="portfolio-ai-confirm__desc">
            上传材料触发 OCR / 文档抽取后，在此逐项确认或补全候选字段；含脱敏占位符的字段须人工补全后方可确认入档。
          </p>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="canPickTeachers && !scopeReady"
      description="请先在页顶选择目标教师，再提交 AI 抽取或确认候选字段"
    />

    <UiCard v-else-if="targetTeacherId && canOperateSelectedTeacher" title="提交 AI 抽取" class="portfolio-ai-confirm__card">
      <div class="portfolio-ai-confirm__submit-grid">
        <div>
          <div class="portfolio-ai-confirm__field-label">抽取类型</div>
          <a-select
            v-model:value="submitTaskType"
            :options="PORTFOLIO_AI_EXTRACT_TASK_TYPE_OPTIONS"
            style="width: 100%"
          />
        </div>
        <div>
          <div class="portfolio-ai-confirm__field-label">材料文件</div>
          <UiPlatformFileField
            v-model:file-node-id="materialFileNodeId"
            v-model:file-name="materialFileName"
            :scene-key="FileUploadSceneKey.PORTFOLIO_MATERIAL"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            button-text="选择材料文件"
            tip="支持 PDF / Word / 图片扫描件"
          />
        </div>
      </div>
      <div class="portfolio-ai-confirm__submit-actions">
        <UiButton variant="outline" @click="openPortfolioScan">
          一体机扫描
        </UiButton>
        <UiButton
          :loading="submitting"
          @click="submitExtractTask"
        >
          提交抽取任务
        </UiButton>
      </div>
    </UiCard>

    <UiCard title="抽取任务" class="portfolio-ai-confirm__card">
      <UiEmpty v-if="!targetTeacherId" description="请先在页顶选择目标教师" />
      <UiAlert
        v-else-if="!canOperateSelectedTeacher"
        type="warning"
        show-icon
        title="无权查看或操作该教师的 AI 抽取任务"
      />
      <UiDataTable
        v-else
        v-model:current="taskPageNum"
        row-key="id"
        pagination-mode="server"
        :columns="taskColumns"
        :data-source="taskRows"
        :loading="tasksLoading"
        :total="taskPageTotal"
        :page-size="20"
        :row-class-name="(record: PortfolioAiJobTaskVO) => record.id === activeTaskId ? 'portfolio-ai-confirm__row-active' : ''"
        @page-change="handleTaskPageChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'taskType'">
            {{ portfolioTaskTypeLabel(record.taskType) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="portfolioAiTaskStatusTone(record.status)">
              {{ portfolioAiTaskStatusLabel(record.status) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction
              :disabled="record.status !== 'SUCCEEDED'"
              @click="selectTask(record)"
            >
              确认字段
            </UiTextAction>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiCard
      v-if="activeTask"
      title="候选字段确认"
      class="portfolio-ai-confirm__card"
    >
      <UiAlert
        v-if="activeTask.status !== 'SUCCEEDED'"
        type="warning"
        show-icon
        title="任务尚未成功完成，完成后方可确认候选字段"
      />
      <template v-else>
        <UiAlert
          v-if="manualFillPendingCount > 0"
          type="warning"
          show-icon
          :title="`有 ${manualFillPendingCount} 个字段含脱敏占位符，请补全真实值后再确认`"
        />
        <div class="portfolio-ai-confirm__candidate-actions">
          <UiButton size="sm" @click="confirmAllEligible">
            确认全部可自动通过项
          </UiButton>
        </div>
        <UiDataTable
          row-key="id"
          :columns="candidateColumns"
          :data-source="candidateRows"
          :loading="candidatesLoading"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'fieldLabel'">
              <div>{{ record.fieldLabel }}</div>
              <div class="portfolio-ai-confirm__field-code">{{ record.fieldCode }}</div>
            </template>
            <template v-else-if="column.key === 'candidateValue'">
              <template v-if="rowNeedsManualFill(record) && record.confirmStatus !== 'CONFIRMED'">
                <a-input
                  v-model:value="correctedValues[record.id]"
                  placeholder="补全真实值（不可含 [姓名] 等占位符）"
                />
                <div class="portfolio-ai-confirm__placeholder-hint">
                  AI 识别：{{ record.candidateValue }}
                </div>
              </template>
              <span v-else>{{ record.candidateValue }}</span>
            </template>
            <template v-else-if="column.key === 'confirmStatus'">
              <UiTag :tone="candidateStatusTone(record)">
                {{ candidateStatusLabel(record) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTextAction
                :disabled="!canConfirmRow(record) || confirmingId === record.id"
                @click="confirmCandidate(record)"
              >
                确认
              </UiTextAction>
              <UiTextAction
                v-if="record.confirmStatus !== 'CONFIRMED' && record.confirmStatus !== 'REJECTED'"
                tone="danger"
                :disabled="confirmingId === record.id"
                @click="rejectCandidate(record)"
              >
                驳回
              </UiTextAction>
            </template>
          </template>
        </UiDataTable>
        <UiEmpty v-if="!candidatesLoading && candidateRows.length === 0" description="暂无候选字段" />
      </template>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.portfolio-ai-confirm__context {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--dp-space-4);
  padding: var(--dp-space-4) var(--dp-space-4) 0;
}

.portfolio-ai-confirm__title {
  margin: 0;
  font-size: var(--dp-font-size-xl);
  font-weight: var(--dp-font-weight-semibold);
}

.portfolio-ai-confirm__desc {
  margin: var(--dp-space-1) 0 0;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-md);
}

.portfolio-ai-confirm__teacher {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.portfolio-ai-confirm__teacher-label {
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.portfolio-ai-confirm__teacher-readonly {
  color: var(--dp-text-primary);
  font-size: var(--dp-font-size-md);
}

.portfolio-ai-confirm__card {
  margin: var(--dp-space-4);
}

.portfolio-ai-confirm__submit-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--dp-space-4);
}

.portfolio-ai-confirm__field-label {
  margin-bottom: var(--dp-space-1);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.portfolio-ai-confirm__upload-hint {
  margin-top: var(--dp-space-2);
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-sm);
}

.portfolio-ai-confirm__submit-actions {
  margin-top: var(--dp-space-4);
}

.portfolio-ai-confirm__candidate-actions {
  margin-bottom: var(--dp-space-3);
}

.portfolio-ai-confirm__card :deep(.ui-alert) {
  margin-bottom: var(--dp-space-3);
}

.portfolio-ai-confirm__field-code {
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}

.portfolio-ai-confirm__placeholder-hint {
  margin-top: var(--dp-space-1);
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}

:deep(.portfolio-ai-confirm__row-active) td {
  background: var(--dp-surface-subtle);
}
</style>
