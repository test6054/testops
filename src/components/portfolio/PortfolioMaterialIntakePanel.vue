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
        <UiButton :loading="starting" @click="handleStart"> 登记并开始处理 </UiButton>
      </div>
    </UiCard>

    <UiCard title="智能反馈" class="portfolio-intake-panel__section">
      <UiAlertStrip
        v-if="status?.latestRejectReason"
        tone="warning"
        :title="`审核退回：${status.latestRejectReason}`"
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
          :readonly="readOnly || reassigning"
        />
        <UiButton
          v-if="!readOnly && status?.archiveRecordId && !reassignBlocked"
          variant="outline"
          size="sm"
          :loading="reassigning"
          @click="handleReassign"
        >
          重分类
        </UiButton>
      </div>
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
      <div v-if="!readOnly" class="portfolio-intake-panel__actions">
        <UiButton variant="outline" :loading="saving" @click="saveDraft"> 保存草稿 </UiButton>
        <UiButton :loading="submitting" @click="handleSubmit"> 提交审核 </UiButton>
      </div>
      <UiEmpty v-else :description="archiveActionHint" />
    </UiCard>
  </div>
</template>

<script lang="ts" setup>
import type { BadgeTone, UiAlertStripTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createScanDispatch } from '@/apis/mark/scanner-dispatch'
import { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import {
  PORTFOLIO_MATERIAL_INTAKE_STAGE_LABEL,
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
const router = useRouter()
const { targetTeacherId } = usePortfolioPageScope()

const fileNodeId = ref<string>()
const fileName = ref<string>()
const materialTitle = ref('')
const scanOpening = ref(false)
const starting = ref(false)

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
  fieldReadOnly,
  aiCandidateReadOnly,
  demoMode,
  refreshStatus,
  startIntake,
  saveDraft,
  submitIntake,
  reassignCategory,
  clearScanCommittedQuery,
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

const reassignBlocked = computed(() => {
  if (!status.value) {
    return false
  }
  return status.value.stage === 'OCR_PENDING' || status.value.stage === 'AI_PROCESSING'
})

const stageLabel = computed(() => {
  if (!status.value?.stage) {
    return '尚未开始采集'
  }
  return strictEnumLabel(PORTFOLIO_MATERIAL_INTAKE_STAGE_LABEL, status.value.stage, '材料采集阶段')
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
    status.value.recordStatus === 'PENDING_CONFIRM' ||
    (status.value.pendingCandidateCount ?? 0) > 0
  ) {
    return '请先确认 AI 候选字段后再保存或提交'
  }
  if (status.value.stage === 'OCR_PENDING' || status.value.stage === 'AI_PROCESSING') {
    return '材料处理中，请等待完成后再保存或提交'
  }
  if (status.value.stage === 'SUBMITTED' || status.value.stage === 'UNDER_REVIEW') {
    return '材料已提交，可在审核进度页查看状态'
  }
  return '当前不可编辑'
})

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

async function openScan() {
  if (!targetTeacherId.value) {
    message.error('请先选择教师')
    return
  }
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
      taskKind: 'PORTFOLIO_COLLECT',
      collectMode: 'AI_SUBMIT',
      teacherId: targetTeacherId.value,
      taskType: 'PORTFOLIO_CERTIFICATE_OCR',
      templateCode: PORTFOLIO_TEMPLATE_CODE_CERTIFICATE,
      archiveRecordId: archiveRecordId.value || undefined,
    })
    if (!created.ticket?.ticketId) {
      throw new Error('创建档案袋派单失败')
    }
    void router.push({
      path: `/scanner-kiosk/dispatch/${created.ticket.ticketId}`,
      query: {
        returnTo: buildPortfolioIntakeScanReturnTo(query),
      },
    })
  } catch (error) {
    showUserError(error, '创建档案袋扫描派单失败')
  } finally {
    scanOpening.value = false
  }
}

function materialIdFromRoute(): string {
  return typeof route.query.materialId === 'string' ? route.query.materialId : ''
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
    if (typeof route.query.categoryId === 'string') {
      categoryId.value = route.query.categoryId
    }
    if (typeof route.query.materialId === 'string') {
      materialId.value = route.query.materialId
    }
    if (typeof route.query.recordId === 'string') {
      archiveRecordId.value = route.query.recordId
    }
    if (typeof route.query.taskId === 'string') {
      taskId.value = route.query.taskId
    }
    void refreshStatus()
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
