<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { UploadRequestOption } from 'ant-design-vue/es/vc-upload/interface'
import type { FileSystemNodeResponseDTO } from '@/apis/edu/file-management'
import type { AiTaskVO } from '@/apis/quality/ai-task'
import type {
  PortfolioAiTaskType,
  PortfolioCandidateFieldVO,
} from '@/apis/portfolio/types'
import type { AiTaskStatus } from '@/apis/quality/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { uploadFile } from '@/apis/edu/file-management'
import { aiTaskApi } from '@/apis/quality/ai-task'
import {
  AI_TASK_STATUS_COLOR,
  AI_TASK_STATUS_LABEL,
} from '@/apis/quality/types'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import {
  PORTFOLIO_AI_TASK_TYPE_LABEL,
  PORTFOLIO_AI_TASK_TYPE_OPTIONS,
  PORTFOLIO_CANDIDATE_CONFIRM_STATUS_LABEL,
  PORTFOLIO_CANDIDATE_CONFIRM_STATUS_TONE,
  PORTFOLIO_TEMPLATE_CODE_CERTIFICATE,
  PORTFOLIO_TEMPLATE_CODE_DOCUMENT,
} from '@/apis/portfolio/types'
import { TeacherSelector } from '@/components/quality/selectors'
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
import { showUserError } from '@/utils/error-handler'
import { readPageList } from '@/utils/page-result'
import { containsPortfolioPiiPlaceholder } from '@/utils/portfolio-pii-placeholder'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

const PORTFOLIO_EXTRACT_TASK_TYPES: PortfolioAiTaskType[] = [
  'PORTFOLIO_CERTIFICATE_OCR',
  'PORTFOLIO_DOCUMENT_PARSE',
]

const route = useRoute()
const router = useRouter()

const selectedTeacherId = ref<string>((route.query.teacherId as string) || '')
const submitTaskType = ref<PortfolioAiTaskType>('PORTFOLIO_CERTIFICATE_OCR')
const uploadingMaterial = ref(false)
const submitting = ref(false)
const uploadedMaterial = ref<FileSystemNodeResponseDTO | null>(null)

const tasksLoading = ref(false)
const taskRows = ref<AiTaskVO[]>([])
const activeTaskId = ref<string>('')

const candidatesLoading = ref(false)
const candidateRows = ref<PortfolioCandidateFieldVO[]>([])
const correctedValues = reactive<Record<string, string>>({})
const confirmingId = ref<string>('')

const activeTask = computed(() =>
  taskRows.value.find(item => item.id === activeTaskId.value) ?? null)

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

function portfolioTaskTypeLabel(taskType: string): string {
  if (taskType in PORTFOLIO_AI_TASK_TYPE_LABEL) {
    return PORTFOLIO_AI_TASK_TYPE_LABEL[taskType as PortfolioAiTaskType]
  }
  return taskType
}

function aiTaskStatusLabel(value: AiTaskStatus): string {
  return strictEnumLabel(AI_TASK_STATUS_LABEL, value, 'AI 任务状态')
}

function aiTaskStatusTone(value: AiTaskStatus): BadgeTone {
  return strictEnumTone(AI_TASK_STATUS_COLOR, value, 'AI 任务状态')
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

function resolveSubmitContract(taskType: PortfolioAiTaskType) {
  if (taskType === 'PORTFOLIO_CERTIFICATE_OCR') {
    return {
      materialType: 'CERTIFICATE' as const,
      templateCode: PORTFOLIO_TEMPLATE_CODE_CERTIFICATE,
    }
  }
  return {
    materialType: 'DOCUMENT' as const,
    templateCode: PORTFOLIO_TEMPLATE_CODE_DOCUMENT,
  }
}

function isPortfolioExtractTask(task: AiTaskVO): boolean {
  return PORTFOLIO_EXTRACT_TASK_TYPES.includes(task.taskType as PortfolioAiTaskType)
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

async function loadTasks() {
  if (!selectedTeacherId.value) {
    taskRows.value = []
    activeTaskId.value = ''
    candidateRows.value = []
    return
  }
  tasksLoading.value = true
  try {
    const page = await aiTaskApi.page({
      pageNum: 1,
      pageSize: 50,
      businessType: 'PORTFOLIO_MATERIAL',
      businessId: selectedTeacherId.value,
    })
    const rows = readPageList(page, '加载档案袋 AI 任务失败').filter(isPortfolioExtractTask)
    taskRows.value = rows
    if (activeTaskId.value && !rows.some(item => item.id === activeTaskId.value)) {
      activeTaskId.value = ''
      candidateRows.value = []
    }
    const routeTaskId = route.query.taskId as string | undefined
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

async function selectTask(task: AiTaskVO) {
  activeTaskId.value = task.id
  await router.replace({
    query: {
      ...route.query,
      teacherId: selectedTeacherId.value,
      taskId: task.id,
    },
  })
  await loadCandidates(task.id)
}

async function handleTeacherChange(value: string | string[] | null) {
  const teacherId = typeof value === 'string' ? value : ''
  selectedTeacherId.value = teacherId
  activeTaskId.value = ''
  candidateRows.value = []
  await router.replace({
    query: {
      ...route.query,
      teacherId: teacherId || undefined,
      taskId: undefined,
    },
  })
  await loadTasks()
}

async function handleMaterialUpload(options: UploadRequestOption): Promise<void> {
  uploadingMaterial.value = true
  try {
    const { file } = options
    if (!(file instanceof File)) {
      message.error('无效的材料文件')
      options.onError?.(new Error('无效的材料文件'))
      return
    }
    const uploaded = await uploadFile(file, { businessType: 'QUALITY_AI_TASK_MATERIAL' })
    uploadedMaterial.value = uploaded
    message.success(`已上传材料：${uploaded.nodeName}`)
    options.onSuccess?.({})
  } catch (error) {
    options.onError?.(error instanceof Error ? error : new Error(String(error)))
  } finally {
    uploadingMaterial.value = false
  }
}

async function submitExtractTask() {
  if (!selectedTeacherId.value) {
    message.error('请先选择教师')
    return
  }
  if (!uploadedMaterial.value?.id) {
    message.error('请先上传材料文件')
    return
  }
  submitting.value = true
  try {
    const contract = resolveSubmitContract(submitTaskType.value)
    const result = await portfolioAiJobApi.submit({
      taskType: submitTaskType.value,
      teacherId: selectedTeacherId.value,
      fileNodeId: uploadedMaterial.value.id,
      materialType: contract.materialType,
      templateCode: contract.templateCode,
    })
    message.success('已提交 AI 抽取任务')
    uploadedMaterial.value = null
    await loadTasks()
    if (result.taskId) {
      activeTaskId.value = result.taskId
      await selectTask({ id: result.taskId, status: result.status as AiTaskStatus } as AiTaskVO)
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

watch(
  () => route.query.teacherId,
  (value) => {
    const next = (value as string) || ''
    if (next !== selectedTeacherId.value) {
      selectedTeacherId.value = next
      loadTasks()
    }
  },
)

onMounted(async () => {
  await loadTasks()
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
        <div class="portfolio-ai-confirm__teacher">
          <span class="portfolio-ai-confirm__teacher-label">目标教师</span>
          <TeacherSelector
            :value="selectedTeacherId || null"
            width="280px"
            placeholder="选择需确认档案的教师"
            @update:value="handleTeacherChange"
          />
        </div>
      </div>
    </template>

    <UiCard v-if="selectedTeacherId" title="提交 AI 抽取" class="portfolio-ai-confirm__card">
      <div class="portfolio-ai-confirm__submit-grid">
        <div>
          <div class="portfolio-ai-confirm__field-label">抽取类型</div>
          <a-select
            v-model:value="submitTaskType"
            :options="PORTFOLIO_AI_TASK_TYPE_OPTIONS"
            style="width: 100%"
          />
        </div>
        <div>
          <div class="portfolio-ai-confirm__field-label">材料文件</div>
          <a-upload-dragger
            :multiple="false"
            :show-upload-list="true"
            :custom-request="handleMaterialUpload"
            :disabled="uploadingMaterial"
          >
            <p>点击或拖拽上传 PDF / Word / 图片扫描件</p>
            <p v-if="uploadedMaterial" class="portfolio-ai-confirm__upload-hint">
              已选：{{ uploadedMaterial.nodeName }}
            </p>
          </a-upload-dragger>
        </div>
      </div>
      <div class="portfolio-ai-confirm__submit-actions">
        <UiButton
          type="primary"
          :loading="submitting"
          :disabled="uploadingMaterial"
          @click="submitExtractTask"
        >
          提交抽取任务
        </UiButton>
      </div>
    </UiCard>

    <UiCard title="抽取任务" class="portfolio-ai-confirm__card">
      <UiEmpty v-if="!selectedTeacherId" description="请先选择教师" />
      <UiDataTable
        v-else
        row-key="id"
        :columns="taskColumns"
        :data-source="taskRows"
        :loading="tasksLoading"
        :pagination="false"
        :row-class-name="(record: AiTaskVO) => record.id === activeTaskId ? 'portfolio-ai-confirm__row-active' : ''"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'taskType'">
            {{ portfolioTaskTypeLabel(record.taskType) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <UiTag :tone="aiTaskStatusTone(record.status)">
              {{ aiTaskStatusLabel(record.status) }}
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
          <UiButton size="small" @click="confirmAllEligible">
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
