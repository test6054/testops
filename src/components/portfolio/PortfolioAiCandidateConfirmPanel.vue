<template>
  <UiCard title="智能候选字段确认" class="portfolio-ai-candidate-panel">
    <UiAlertStrip v-if="!taskId" tone="info" title="尚未关联智能抽取任务" />
    <template v-else>
      <UiAlertStrip
        v-if="taskStatus && taskStatus !== AiTaskStatusCode.COMPLETED"
        tone="warning"
        title="智能抽取尚未完成，完成后方可确认候选字段"
      />
      <UiAlertStrip
        v-else-if="manualFillPendingCount > 0"
        tone="warning"
        :title="`有 ${manualFillPendingCount} 个字段含脱敏占位符，请补全真实值后再确认`"
      />
      <UiAlertStrip
        v-if="batchProgress"
        :tone="batchProgress.failedIds.length ? 'warning' : 'info'"
        :title="`批量确认进度 ${batchProgress.done}/${batchProgress.total}`"
        :description="
          batchProgress.failedIds.length
            ? `失败 ${batchProgress.failedIds.length} 项，可仅重试失败项`
            : undefined
        "
      />
      <div
        v-if="taskStatus === AiTaskStatusCode.COMPLETED && !readonly"
        class="portfolio-ai-candidate-panel__actions"
      >
        <UiButton
          variant="primary"
          size="sm"
          :loading="confirming"
          :disabled="confirming"
          @click="confirmAllEligible"
        >
          确认全部可自动通过项
        </UiButton>
        <UiButton
          v-if="batchProgress?.failedIds.length"
          size="sm"
          variant="outline"
          :loading="confirming"
          :disabled="confirming"
          @click="retryFailedBatch"
        >
          仅重试失败项（{{ batchProgress.failedIds.length }}）
        </UiButton>
      </div>
      <UiDataTable
        row-key="id"
        pagination-mode="none"
        :columns="candidateColumns"
        :data-source="candidateRows"
        :loading="loading"
        :show-pagination="false"
        :sticky-header="false"
        flat
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'fieldLabel'">
            <div>{{ record.fieldLabel }}</div>
            <div class="portfolio-ai-candidate-panel__field-code">{{ record.fieldCode }}</div>
          </template>
          <template v-else-if="column.key === 'candidateValue'">
            <template
              v-if="
                rowNeedsManualFill(record)
                  && record.confirmStatus !== PortfolioCandidateConfirmStatusCode.CONFIRMED
              "
            >
              <UiInput
                size="sm"
                v-model="correctedValues[record.id]"
                :disabled="readonly || confirming"
                placeholder="补全真实值（不可含 [姓名] 等占位符）"
              />
              <div class="portfolio-ai-candidate-panel__placeholder-hint">
                智能识别：{{ record.candidateValue }}
              </div>
            </template>
            <span v-else>{{ record.candidateValue }}</span>
          </template>
          <template v-else-if="column.key === 'confirmStatus'">
            <UiTag :tone="candidateStatusTone(record)">
              {{ candidateStatusLabel(record) }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'evidenceRef'">
            {{ formatPortfolioArchiveEvidenceRef(record.evidenceRef) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="[
                {
                  key: 'confirm',
                  label: '确认',
                  disabled: !canConfirmRow(record) || confirming,
                },
                {
                  key: 'reject',
                  label: '驳回',
                  tone: 'danger',
                  hidden:
                    record.confirmStatus === PortfolioCandidateConfirmStatusCode.CONFIRMED
                    || record.confirmStatus === PortfolioCandidateConfirmStatusCode.REJECTED,
                  disabled: readonly || confirming,
                },
              ]"
              split
              @action="(key) => handleCandidateRowAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
      <UiEmpty
        size="sm"
        v-if="!loading && taskStatus === AiTaskStatusCode.COMPLETED && candidateRows.length === 0"
        description="暂无候选字段"
      />
    </template>
  </UiCard>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioCandidateFieldVO } from '@/apis/portfolio/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import {
  PortfolioCandidateConfirmStatusCode,
  PortfolioCandidateConfirmStatusDescription,
} from '@/apis/portfolio/enums'
import { PORTFOLIO_CANDIDATE_CONFIRM_STATUS_TONE } from '@/apis/portfolio/types'
import { AiTaskStatusCode } from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePolling } from '@/composables/usePolling'
import { showUserError } from '@/utils/error-handler'
import { formatPortfolioArchiveEvidenceRef } from '@/utils/portfolio-archive-evidence'
import { containsPortfolioPiiPlaceholder } from '@/utils/portfolio-pii-placeholder'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'PortfolioAiCandidateConfirmPanel' })

const props = defineProps<{
  taskId?: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirmed'): void
}>()

const candidateColumns: ColumnsType = [
  { title: '字段', key: 'fieldLabel', width: 140, fixed: 'left' },
  { title: '候选值', key: 'candidateValue', width: 220 },
  { title: '证据引用', key: 'evidenceRef', width: 180 },
  { title: '状态', key: 'confirmStatus', width: 120 },
  { title: '操作', key: 'actions', width: 160 },
]

const loading = ref(false)
const confirming = ref(false)
const candidateRows = ref<PortfolioCandidateFieldVO[]>([])
const correctedValues = reactive<Record<string, string>>({})
const taskStatus = ref<AiTaskStatusCode>()
const candidateRequestToken = ref(0)
const candidateContextToken = ref(0)
const batchProgress = ref<{
  total: number
  done: number
  failedIds: string[]
} | null>(null)

const manualFillPendingCount = computed(
  () =>
    candidateRows.value.filter(
      (item) =>
        item.confirmStatus !== PortfolioCandidateConfirmStatusCode.CONFIRMED
        && item.confirmStatus !== PortfolioCandidateConfirmStatusCode.REJECTED
        && (item.manualFillRequired
          || item.confirmStatus === PortfolioCandidateConfirmStatusCode.NEEDS_MANUAL_FILL),
    ).length,
)

const pendingTaskPolling = computed(
  () =>
    taskStatus.value === AiTaskStatusCode.PENDING
    || taskStatus.value === AiTaskStatusCode.PROCESSING,
)

function resetCandidateContext() {
  candidateContextToken.value += 1
  candidateRequestToken.value += 1
  loading.value = false
  confirming.value = false
  batchProgress.value = null
  candidateRows.value = []
  taskStatus.value = undefined
  for (const key of Object.keys(correctedValues)) {
    delete correctedValues[key]
  }
}

function candidateStatusLabel(row: PortfolioCandidateFieldVO): string {
  return strictEnumLabel(
    PortfolioCandidateConfirmStatusDescription,
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

function rowNeedsManualFill(row: PortfolioCandidateFieldVO): boolean {
  return (
    Boolean(row.manualFillRequired)
    || row.confirmStatus === PortfolioCandidateConfirmStatusCode.NEEDS_MANUAL_FILL
  )
}

function correctedValueFor(row: PortfolioCandidateFieldVO): string {
  return correctedValues[row.id] ?? ''
}

function canConfirmRow(row: PortfolioCandidateFieldVO): boolean {
  if (props.readonly) {
    return false
  }
  if (
    row.confirmStatus === PortfolioCandidateConfirmStatusCode.CONFIRMED
    || row.confirmStatus === PortfolioCandidateConfirmStatusCode.REJECTED
  ) {
    return false
  }
  if (rowNeedsManualFill(row)) {
    const corrected = correctedValueFor(row).trim()
    return corrected.length > 0 && !containsPortfolioPiiPlaceholder(corrected)
  }
  return row.confirmStatus === PortfolioCandidateConfirmStatusCode.PENDING_CONFIRM
}

async function loadCandidates() {
  const requestToken = ++candidateRequestToken.value
  const requestTaskId = props.taskId
  if (!requestTaskId) {
    if (candidateRequestToken.value === requestToken) {
      candidateRows.value = []
      taskStatus.value = undefined
    }
    return
  }
  loading.value = true
  try {
    const detail = await portfolioAiJobApi.get(requestTaskId)
    if (candidateRequestToken.value !== requestToken) {
      return
    }
    taskStatus.value = detail.status
    if (detail.status !== AiTaskStatusCode.COMPLETED) {
      candidateRows.value = []
      return
    }
    const rows = (await portfolioAiJobApi.listCandidates(requestTaskId)) ?? []
    if (candidateRequestToken.value !== requestToken) {
      return
    }
    candidateRows.value = rows
    for (const row of rows) {
      if (!correctedValues[row.id]) {
        correctedValues[row.id] = rowNeedsManualFill(row) ? '' : row.candidateValue
      }
    }
  } catch (error) {
    if (candidateRequestToken.value !== requestToken) {
      return
    }
    candidateRows.value = []
    taskStatus.value = undefined
    showUserError(error, '加载候选字段失败')
  } finally {
    if (candidateRequestToken.value === requestToken) {
      loading.value = false
    }
  }
}

async function confirmCandidate(row: PortfolioCandidateFieldVO) {
  if (confirming.value || !canConfirmRow(row)) {
    void message.error('请先补全真实候选值后再确认')
    return
  }
  const contextToken = candidateContextToken.value
  confirming.value = true
  try {
    await portfolioAiJobApi.confirm({
      candidateFieldId: row.id,
      aiTaskId: row.aiTaskId,
      confirmStatus: PortfolioCandidateConfirmStatusCode.CONFIRMED,
      correctedCandidateValue: rowNeedsManualFill(row) ? correctedValueFor(row).trim() : undefined,
    })
    if (candidateContextToken.value !== contextToken) {
      return
    }
    void message.success(`已确认字段：${row.fieldLabel}`)
    await loadCandidates()
    if (candidateContextToken.value !== contextToken) {
      return
    }
    emit('confirmed')
  } catch (error) {
    if (candidateContextToken.value !== contextToken) {
      return
    }
    showUserError(error, '确认候选字段失败')
  } finally {
    if (candidateContextToken.value === contextToken) {
      confirming.value = false
    }
  }
}

async function rejectCandidate(row: PortfolioCandidateFieldVO) {
  if (
    confirming.value
    || props.readonly
    || row.confirmStatus === PortfolioCandidateConfirmStatusCode.CONFIRMED
    || row.confirmStatus === PortfolioCandidateConfirmStatusCode.REJECTED
  ) {
    return
  }
  void confirmAsync({
    title: '驳回该候选字段？',
    content: `字段「${row.fieldLabel}」将标记为已驳回，不会进入入档链。`,
    type: 'warning',
    onOk: async () => {
      const contextToken = candidateContextToken.value
      confirming.value = true
      try {
        await portfolioAiJobApi.confirm({
          candidateFieldId: row.id,
          aiTaskId: row.aiTaskId,
          confirmStatus: PortfolioCandidateConfirmStatusCode.REJECTED,
        })
        if (candidateContextToken.value !== contextToken) {
          return
        }
        void message.success(`已驳回字段：${row.fieldLabel}`)
        await loadCandidates()
        if (candidateContextToken.value !== contextToken) {
          return
        }
        emit('confirmed')
      } catch (error) {
        if (candidateContextToken.value !== contextToken) {
          return
        }
        showUserError(error, '驳回候选字段失败')
      } finally {
        if (candidateContextToken.value === contextToken) {
          confirming.value = false
        }
      }
    },
  })
}

function handleCandidateRowAction(key: string, row: PortfolioCandidateFieldVO) {
  if (key === 'confirm') void confirmCandidate(row)
  else if (key === 'reject') void rejectCandidate(row)
}

async function confirmCandidateBatch(rows: PortfolioCandidateFieldVO[]) {
  if (confirming.value || props.readonly || rows.length === 0) {
    return
  }
  const contextToken = candidateContextToken.value
  const failedIds: string[] = []
  let done = 0
  batchProgress.value = { total: rows.length, done: 0, failedIds: [] }
  confirming.value = true
  try {
    for (const row of rows) {
      try {
        await portfolioAiJobApi.confirm({
          candidateFieldId: row.id,
          aiTaskId: row.aiTaskId,
          confirmStatus: PortfolioCandidateConfirmStatusCode.CONFIRMED,
          correctedCandidateValue: rowNeedsManualFill(row)
            ? correctedValueFor(row).trim()
            : undefined,
        })
        if (candidateContextToken.value !== contextToken) {
          return
        }
        done += 1
        batchProgress.value = {
          total: rows.length,
          done,
          failedIds: [...failedIds],
        }
      } catch {
        if (candidateContextToken.value !== contextToken) {
          return
        }
        failedIds.push(row.id)
        batchProgress.value = {
          total: rows.length,
          done,
          failedIds: [...failedIds],
        }
      }
    }
    if (failedIds.length === 0) {
      void message.success(`已确认 ${rows.length} 个字段`)
      batchProgress.value = null
      await loadCandidates()
      if (candidateContextToken.value !== contextToken) {
        return
      }
      emit('confirmed')
      return
    }
    void message.warning(`已确认 ${done} 个字段，失败 ${failedIds.length} 个`)
    await loadCandidates()
  } finally {
    if (candidateContextToken.value === contextToken) {
      confirming.value = false
    }
  }
}

async function confirmAllEligible() {
  const eligible = candidateRows.value.filter(canConfirmRow)
  if (eligible.length === 0) {
    void message.info('没有可自动确认的字段')
    return
  }
  await confirmCandidateBatch(eligible)
}

async function retryFailedBatch() {
  const failedIds = new Set(batchProgress.value?.failedIds ?? [])
  if (failedIds.size === 0) {
    return
  }
  const retryRows = candidateRows.value.filter(
    (row) => failedIds.has(row.id) && canConfirmRow(row),
  )
  if (retryRows.length === 0) {
    void message.info('失败项已不可再确认，请刷新候选列表')
    batchProgress.value = null
    return
  }
  await confirmCandidateBatch(retryRows)
}

usePolling(
  async () => {
    await loadCandidates()
  },
  {
    getOptions: () => ({
      intervalMs: 4000,
      when: pendingTaskPolling.value,
      immediate: false,
    }),
    pauseWhenDocumentHidden: true,
  },
)

watch(
  () => props.taskId,
  () => {
    resetCandidateContext()
    void loadCandidates()
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.portfolio-ai-candidate-panel__actions {
  margin-bottom: var(--dp-space-component);
}

.portfolio-ai-candidate-panel__field-code {
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}

.portfolio-ai-candidate-panel__placeholder-hint {
  margin-top: var(--dp-space-component-xs);
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}
</style>
