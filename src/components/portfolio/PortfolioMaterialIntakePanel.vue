<template>
  <div class="portfolio-intake-panel">
    <SignalBand v-if="signalMetrics.length" :metrics="signalMetrics" variant="inline" compact />

    <UiCard title="材料来源" class="portfolio-intake-panel__section">
      <div class="portfolio-intake-panel__upload-grid">
        <div>
          <div class="portfolio-intake-panel__label">材料标题</div>
          <a-input v-model:value="materialTitle" :disabled="readOnly" placeholder="材料标题" />
        </div>
        <div>
          <div class="portfolio-intake-panel__label">材料文件</div>
          <UiPlatformFileField
            v-model:file-node-id="fileNodeId"
            v-model:file-name="fileName"
            :scene-key="FileUploadSceneKey.PORTFOLIO_MATERIAL"
            :disabled="readOnly"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            button-text="选择材料文件"
            tip="支持 PDF / Word / 图片扫描件"
          />
        </div>
      </div>
      <div v-if="!readOnly" class="portfolio-intake-panel__actions">
        <UiButton variant="outline" :loading="scanOpening" @click="openScan"> 一体机扫描 </UiButton>
        <UiButton v-if="showRegisterStart" :loading="starting" @click="handleStart">
          登记并开始处理
        </UiButton>
        <UiButton v-if="showRetryAi" variant="outline" :loading="retryingAi" @click="handleRetryAi">
          重新 AI 抽取
        </UiButton>
      </div>
    </UiCard>

    <UiCard title="智能反馈" class="portfolio-intake-panel__section">
      <UiAlertStrip
        v-if="status?.latestRejectReason"
        tone="warning"
        :title="`审核退回：${status.latestRejectReason}`"
      />
      <UiAlertStrip
        v-else-if="status?.stage === PortfolioMaterialIntakeStageCode.AI_FAILED"
        tone="error"
        title="AI 抽取失败"
        description="请直接在下方补全字段并保存草稿（手工补采）；仅当需要重新识别材料时再点「重新 AI 抽取」。"
      />
      <UiAlertStrip v-else-if="status?.stage" :tone="stageTone" :title="stageLabel" />
      <p v-if="status?.ocrStatus" class="portfolio-intake-panel__meta">
        OCR 状态：{{ status.ocrStatus }}
      </p>
    </UiCard>

    <UiCard title="分类与字段" class="portfolio-intake-panel__section">
      <div class="portfolio-intake-panel__category-row">
        <div class="portfolio-intake-panel__label">档案分类</div>
        <PortfolioCategoryTreePicker
          v-model:model-value="categoryIdModel"
          :teacher-id="targetTeacherId ?? undefined"
          :readonly="readOnly || reassigning"
        />
        <UiButton
          v-if="reassignAllowed"
          variant="outline"
          size="sm"
          :loading="reassigning"
          :disabled="!reassignReady"
          @click="handleReassign"
        >
          重分类
        </UiButton>
      </div>
      <UiAlertStrip
        v-if="clearedFieldsHint"
        tone="warning"
        title="重分类已清空以下字段"
        :description="clearedFieldsHint"
      />
      <PortfolioAiCandidateConfirmPanel
        v-if="taskId"
        :task-id="taskId"
        :readonly="aiCandidateReadOnly"
        @confirmed="refreshStatus"
      />
      <div v-if="editableFields.length" class="portfolio-intake-panel__fields">
        <div
          v-for="field in editableFields"
          :key="field.fieldCode"
          class="portfolio-intake-panel__field-row"
        >
          <div class="portfolio-intake-panel__label">
            {{ field.fieldLabel }}
            <UiTag v-if="field.required" tone="orange" size="sm">必填</UiTag>
          </div>
          <a-select
            v-if="field.fieldType === 'SEMESTER'"
            v-model:value="fieldValues[field.fieldCode]"
            :disabled="readOnly"
            :options="SemesterOptions"
            allow-clear
            placeholder="请选择学期"
            class="portfolio-intake-panel__field-control"
          />
          <a-input
            v-else
            v-model:value="fieldValues[field.fieldCode]"
            :disabled="readOnly"
            :placeholder="field.fieldLabel"
            class="portfolio-intake-panel__field-control"
          />
        </div>
      </div>
      <UiEmpty v-else-if="categoryIdModel && !loading" description="请先登记材料并选择分类" />
    </UiCard>

    <UiCard title="归档动作" class="portfolio-intake-panel__section">
      <p v-if="archiveActionHint" class="portfolio-intake-panel__meta">{{ archiveActionHint }}</p>
      <div v-if="!readOnly" class="portfolio-intake-panel__actions">
        <UiButton variant="outline" :loading="saving" @click="saveDraft"> 保存草稿 </UiButton>
        <UiButton :loading="submitting" @click="handleSubmit"> 提交审核 </UiButton>
      </div>
    </UiCard>
    <ScanDispatchResultDialog
      v-model:open="dispatchResultOpen"
      :payload="dispatchResult"
      :task-kind="ScanTaskKindCode.PORTFOLIO_COLLECT"
    />
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiAlertStripTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import type { ScanDispatchResultPayload } from '@/views/teacher/archive-volume/components/ScanDispatchResultDialog.vue'
import ScanDispatchResultDialog from '@/views/teacher/archive-volume/components/ScanDispatchResultDialog.vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { buildScanDispatchKioskUrl, createScanDispatch } from '@/apis/mark/scanner-dispatch'
import { PortfolioCollectModeCode, ScanTaskKindCode } from '@/apis/mark/scanner-work-order'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PortfolioArchiveRecordStatusCode,
  PortfolioMaterialIntakeStageCode,
  PortfolioMaterialIntakeStageDescription,
} from '@/apis/portfolio/enums'
import {
  PORTFOLIO_MATERIAL_INTAKE_STAGE_TONE,
  PORTFOLIO_TEMPLATE_CODE_CERTIFICATE,
} from '@/apis/portfolio/types'
import UiPlatformFileField from '@/components/platform/UiPlatformFileField.vue'
import PortfolioAiCandidateConfirmPanel from '@/components/portfolio/PortfolioAiCandidateConfirmPanel.vue'
import PortfolioCategoryTreePicker from '@/components/portfolio/PortfolioCategoryTreePicker.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  buildPortfolioIntakeScanReturnTo,
  usePortfolioIntake,
} from '@/composables/usePortfolioIntake'
import { usePortfolioPageScope } from '@/composables/usePortfolioPageScope'
import { SemesterOptions } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'PortfolioMaterialIntakePanel' })

const emit = defineEmits<{
  (e: 'submitted', recordId: string): void
}>()

const route = useRoute()
const { targetTeacherId } = usePortfolioPageScope()

const fileNodeId = ref<string>()
const fileName = ref<string>()
const materialTitle = ref('')
const scanOpening = ref(false)
const dispatchResultOpen = ref(false)
const dispatchResult = ref<ScanDispatchResultPayload | null>(null)
const starting = ref(false)
const retryingAi = ref(false)
const intakeScopeToken = ref(0)

const {
  loading,
  saving,
  submitting,
  reassigning,
  status,
  categoryId,
  materialId,
  archiveRecordId,
  taskId,
  fieldValues,
  readOnly,
  aiCandidateReadOnly,
  demoMode,
  refreshStatus,
  startIntake,
  saveDraft,
  submitIntake,
  reassignCategory,
  clearScanCommittedQuery,
  resetIntakeContext,
} = usePortfolioIntake(targetTeacherId)

const categoryIdModel = computed({
  get: () => categoryId.value,
  set: (value: string) => {
    categoryId.value = value
  },
})

const editableFields = computed(() =>
  (status.value?.targetFields ?? []).filter((item) => !item.readonly),
)

const materialRegistered = computed(() => Boolean(materialId.value || status.value?.materialId))

const showRegisterStart = computed(() => {
  return !(
    status.value?.stage === PortfolioMaterialIntakeStageCode.AI_FAILED && materialRegistered.value
  )
})

const showRetryAi = computed(
  () =>
    !demoMode.value &&
    status.value?.stage === PortfolioMaterialIntakeStageCode.AI_FAILED &&
    Boolean(categoryId.value),
)

const reassignBlocked = computed(() => {
  if (!status.value) {
    return false
  }
  return (
    status.value.stage === PortfolioMaterialIntakeStageCode.OCR_PENDING ||
    status.value.stage === PortfolioMaterialIntakeStageCode.AI_PROCESSING
  )
})

const reassignAllowed = computed(() => {
  if (!status.value?.archiveRecordId || reassignBlocked.value || readOnly.value) {
    return false
  }
  const recordStatus = status.value.recordStatus
  return (
    recordStatus === PortfolioArchiveRecordStatusCode.DRAFT ||
    recordStatus === PortfolioArchiveRecordStatusCode.RETURNED
  )
})

const reassignReady = computed(
  () =>
    reassignAllowed.value &&
    Boolean(categoryIdModel.value) &&
    categoryIdModel.value !== status.value?.categoryId,
)

const clearedFieldsHint = computed(() => {
  const items = status.value?.clearedFieldsFromReassign ?? []
  if (!items.length) {
    return ''
  }
  return items
    .map((item) => {
      const label = item.fieldLabel?.trim() || item.fieldCode
      const previous = item.fieldValue?.trim() ? `原值「${item.fieldValue.trim()}」` : '原值为空'
      return `${label}（${previous}）`
    })
    .join('；')
})

const stageLabel = computed(() => {
  if (!status.value?.stage) {
    return '尚未开始采集'
  }
  return strictEnumLabel(
    PortfolioMaterialIntakeStageDescription,
    status.value.stage,
    '材料采集阶段',
  )
})

/** BadgeTone 与 UiAlertStrip 四色语义不一致，展示前映射到 alert strip 合同。 */
const BADGE_TONE_TO_ALERT_STRIP: Record<BadgeTone, UiAlertStripTone> = {
  gray: 'info',
  blue: 'info',
  green: 'success',
  red: 'error',
  orange: 'warning',
  yellow: 'warning',
  purple: 'info',
}

const stageTone = computed((): UiAlertStripTone => {
  if (!status.value?.stage) {
    return 'info'
  }
  const badgeTone = strictEnumTone(
    PORTFOLIO_MATERIAL_INTAKE_STAGE_TONE,
    status.value.stage,
    '材料采集阶段',
  )
  return BADGE_TONE_TO_ALERT_STRIP[badgeTone]
})

const signalMetrics = computed((): SignalMetric[] => {
  if (!status.value) {
    return []
  }
  const metrics: SignalMetric[] = []
  if (status.value.missingFieldCount !== undefined) {
    metrics.push({
      key: 'missing',
      label: '缺项字段',
      value: String(status.value.missingFieldCount),
      unit: '项',
      tone: status.value.missingFieldCount > 0 ? 'orange' : 'green',
    })
  }
  if (status.value.pendingCandidateCount !== undefined) {
    metrics.push({
      key: 'candidate',
      label: '待确认 AI 字段',
      value: String(status.value.pendingCandidateCount),
      unit: '项',
      tone: status.value.pendingCandidateCount > 0 ? 'blue' : 'green',
    })
  }
  return metrics
})

const archiveActionHint = computed(() => {
  if (!status.value) {
    return '请先登记材料'
  }
  if (
    status.value.recordStatus === PortfolioArchiveRecordStatusCode.PENDING_CONFIRM ||
    (status.value.pendingCandidateCount ?? 0) > 0
  ) {
    return '请先确认 AI 候选字段后再保存或提交'
  }
  if (
    status.value.stage === PortfolioMaterialIntakeStageCode.OCR_PENDING ||
    status.value.stage === PortfolioMaterialIntakeStageCode.AI_PROCESSING
  ) {
    return '材料处理中，请等待完成后再保存或提交'
  }
  if (status.value.stage === PortfolioMaterialIntakeStageCode.AI_FAILED) {
    return '请补全下方字段后保存草稿（手工补采）；需重新识别时再点「重新 AI 抽取」'
  }
  if (status.value.recordStatus === PortfolioArchiveRecordStatusCode.OFFICIAL) {
    return '材料已审核通过，可在档案页查看正式记录'
  }
  if (status.value.recordStatus === PortfolioArchiveRecordStatusCode.RETURNED) {
    if (status.value.stage === PortfolioMaterialIntakeStageCode.READY_TO_SUBMIT) {
      return '审核已退回，字段已补全，请重新提交审核'
    }
    return '审核已退回，请修改字段后保存并重新提交'
  }
  if (
    status.value.stage === PortfolioMaterialIntakeStageCode.SUBMITTED ||
    status.value.stage === PortfolioMaterialIntakeStageCode.UNDER_REVIEW
  ) {
    return '材料已提交，可在审核进度页查看状态'
  }
  if (status.value.stage === PortfolioMaterialIntakeStageCode.FIELDS_INCOMPLETE) {
    return '请补全必填字段后保存草稿或提交审核'
  }
  if (status.value.stage === PortfolioMaterialIntakeStageCode.READY_TO_SUBMIT) {
    return '字段已齐全，可保存草稿或提交审核'
  }
  if (status.value.stage === PortfolioMaterialIntakeStageCode.CATEGORY_PENDING) {
    return '请先选择档案分类并登记材料'
  }
  if (status.value.stage === PortfolioMaterialIntakeStageCode.UPLOADED) {
    return '材料已登记，请补全字段后保存或提交'
  }
  return '当前不可操作'
})

/** 切换教师或采集上下文时先清空本地材料源与扫描派单状态，避免上一位教师材料残留到当前页。 */
function resetLocalIntakeSourceContext() {
  intakeScopeToken.value += 1
  resetIntakeContext()
  materialTitle.value = ''
  fileNodeId.value = undefined
  fileName.value = undefined
  dispatchResultOpen.value = false
  dispatchResult.value = null
}

async function handleStart() {
  if (!fileNodeId.value) {
    message.error('请先上传材料文件')
    return
  }
  starting.value = true
  try {
    await startIntake({
      fileNodeId: fileNodeId.value,
      materialTitle: materialTitle.value.trim() || fileName.value,
      fileName: fileName.value,
      demoMode: demoMode.value,
    })
  } finally {
    starting.value = false
  }
}

async function handleRetryAi() {
  if (!categoryId.value) {
    message.warning('请先选择档案分类')
    return
  }
  void confirmAsync({
    title: '重新 AI 抽取？',
    content: '将新建一次 AI 识别任务；若字段已手工填写，请先保存草稿。',
    type: 'warning',
    onOk: async () => {
      retryingAi.value = true
      try {
        await startIntake({ submitAi: true })
      } finally {
        retryingAi.value = false
      }
    },
  })
}

async function openScan() {
  if (!targetTeacherId.value) {
    message.error('请先选择教师')
    return
  }
  const requestToken = intakeScopeToken.value
  scanOpening.value = true
  try {
    const query: Record<string, string> = {
      teacherId: targetTeacherId.value,
    }
    if (categoryId.value) {
      query.categoryId = categoryId.value
    }
    if (materialIdFromRoute()) {
      query.materialId = materialIdFromRoute()
    }
    if (archiveRecordId.value) {
      query.recordId = archiveRecordId.value
    }
    const created = await createScanDispatch({
      taskKind: ScanTaskKindCode.PORTFOLIO_COLLECT,
      collectMode: PortfolioCollectModeCode.AI_SUBMIT,
      teacherId: targetTeacherId.value,
      taskType: 'PORTFOLIO_CERTIFICATE_OCR',
      templateCode: PORTFOLIO_TEMPLATE_CODE_CERTIFICATE,
      archiveRecordId: archiveRecordId.value || undefined,
    })
    if (intakeScopeToken.value !== requestToken) {
      return
    }
    const ticket = created.ticket
    if (!ticket?.ticketId) {
      showUserError(new Error('创建档案袋派单失败'), '创建档案袋扫描派单失败')
      return
    }
    dispatchResult.value = {
      ticketId: ticket.ticketId,
      kioskUrl: buildScanDispatchKioskUrl(ticket, buildPortfolioIntakeScanReturnTo(query)),
      status: ticket.status,
      taskKind: ScanTaskKindCode.PORTFOLIO_COLLECT,
      contextLabel: ticket.portfolioSnapshot?.categoryName ?? materialTitle.value,
    }
    dispatchResultOpen.value = true
  } catch (error) {
    if (intakeScopeToken.value !== requestToken) {
      return
    }
    showUserError(error, '创建档案袋扫描派单失败')
  } finally {
    if (intakeScopeToken.value === requestToken) {
      scanOpening.value = false
    }
  }
}

function materialIdFromRoute(): string {
  return typeof route.query.materialId === 'string' ? route.query.materialId : ''
}

function syncMaterialSourceFromStatus() {
  if (!status.value) {
    return
  }
  if (!materialTitle.value.trim() && status.value.materialTitle?.trim()) {
    materialTitle.value = status.value.materialTitle.trim()
  }
  if (!fileNodeId.value && status.value.fileNodeId) {
    fileNodeId.value = status.value.fileNodeId
  }
  if (!fileName.value && status.value.materialTitle?.trim()) {
    fileName.value = status.value.materialTitle.trim()
  }
}

/** 路由 query 是采集上下文真源；缺省字段也必须显式清空，避免复用组件时残留旧材料。 */
function syncIntakeContextFromRoute() {
  categoryId.value = typeof route.query.categoryId === 'string' ? route.query.categoryId : ''
  materialId.value = typeof route.query.materialId === 'string' ? route.query.materialId : ''
  archiveRecordId.value = typeof route.query.recordId === 'string' ? route.query.recordId : ''
  taskId.value = typeof route.query.taskId === 'string' ? route.query.taskId : ''
}

async function handleReassign() {
  if (!categoryIdModel.value) {
    message.warning('请选择目标分类')
    return
  }
  void confirmAsync({
    title: '确认重分类？',
    content: '切换分类将重置部分字段值，并失效已有 AI 候选字段，请确认后继续。',
    type: 'warning',
    onOk: async () => {
      await reassignCategory(categoryIdModel.value)
    },
  })
}

async function handleSubmit() {
  const result = await submitIntake()
  if (result?.archiveRecordId) {
    emit('submitted', result.archiveRecordId)
  }
}

watch(
  () => [
    route.query.materialId,
    route.query.recordId,
    route.query.taskId,
    route.query.categoryId,
    targetTeacherId.value,
  ],
  () => {
    resetLocalIntakeSourceContext()
    syncIntakeContextFromRoute()
    void refreshStatus().then(() => {
      syncMaterialSourceFromStatus()
    })
  },
  { immediate: true },
)

watch(
  () => route.query.scanCommitted,
  async (value) => {
    if (value === '1') {
      await clearScanCommittedQuery()
    }
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.portfolio-intake-panel__section {
  margin: var(--dp-space-4);
}

.portfolio-intake-panel__upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--dp-space-4);
}

.portfolio-intake-panel__label {
  margin-bottom: var(--dp-space-1);
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.portfolio-intake-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-2);
  margin-top: var(--dp-space-4);
}

.portfolio-intake-panel__meta {
  margin: var(--dp-space-2) 0 0;
  color: var(--dp-text-secondary);
  font-size: var(--dp-font-size-sm);
}

.portfolio-intake-panel__category-row {
  display: grid;
  gap: var(--dp-space-2);
  margin-bottom: var(--dp-space-4);
}

.portfolio-intake-panel__fields {
  display: grid;
  gap: var(--dp-space-3);
  margin-top: var(--dp-space-4);
}

@media (max-width: 960px) {
  .portfolio-intake-panel__upload-grid {
    grid-template-columns: 1fr;
  }
}
</style>
