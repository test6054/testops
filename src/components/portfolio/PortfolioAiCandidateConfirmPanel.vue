<template>
  <UiCard title="AI 候选字段确认" class="portfolio-ai-candidate-panel">
    <UiAlertStrip v-if="!taskId" tone="info" title="尚未关联 AI 抽取任务" />
    <template v-else>
      <UiAlertStrip
        v-if="taskStatus && taskStatus !== AiTaskStatusCode.SUCCEEDED"
        tone="warning"
        title="AI 抽取尚未完成，完成后方可确认候选字段"
      />
      <UiAlertStrip
        v-else-if="manualFillPendingCount > 0"
        tone="warning"
        :title="`有 ${manualFillPendingCount} 个字段含脱敏占位符，请补全真实值后再确认`"
      />
      <div
        v-if="taskStatus === AiTaskStatusCode.SUCCEEDED && !readonly"
        class="portfolio-ai-candidate-panel__actions"
      >
        <UiButton size="sm" :loading="confirming" @click="confirmAllEligible">
          确认全部可自动通过项
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
                rowNeedsManualFill(record) &&
                record.confirmStatus !== PortfolioCandidateConfirmStatusCode.CONFIRMED
              "
            >
              <a-input
                v-model:value="correctedValues[record.id]"
                placeholder="补全真实值（不可含 [姓名] 等占位符）"
              />
              <div class="portfolio-ai-candidate-panel__placeholder-hint">
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
                    record.confirmStatus === PortfolioCandidateConfirmStatusCode.CONFIRMED ||
                    record.confirmStatus === PortfolioCandidateConfirmStatusCode.REJECTED,
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
        v-if="!loading && taskStatus === AiTaskStatusCode.SUCCEEDED && candidateRows.length === 0"
        description="暂无候选字段"
      />
    </template>
  </UiCard>
</template>

<script lang="ts" setup>
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { PortfolioCandidateFieldVO } from '@/apis/portfolio/types'
import { PORTFOLIO_CANDIDATE_CONFIRM_STATUS_TONE } from '@/apis/portfolio/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'
import { portfolioAiJobApi } from '@/apis/portfolio/ai-job'
import {
  PortfolioCandidateConfirmStatusCode,
  PortfolioCandidateConfirmStatusDescription,
} from '@/apis/portfolio/enums'
import { AiTaskStatusCode } from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePolling } from '@/composables/usePolling'
import { showUserError } from '@/utils/error-handler'
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
  { title: '证据引用', dataIndex: 'evidenceRef', key: 'evidenceRef' },
  { title: '状态', key: 'confirmStatus', width: 120 },
  { title: '操作', key: 'actions', width: 160 },
]

const loading = ref(false)
const confirming = ref(false)
const candidateRows = ref<PortfolioCandidateFieldVO[]>([])
const correctedValues = reactive<Record<string, string>>({})
const taskStatus = ref<AiTaskStatusCode>()
const candidateRequestToken = ref(0)

const manualFillPendingCount = computed(
  () =>
    candidateRows.value.filter(
      (item) =>
        item.manualFillRequired ||
        item.confirmStatus === PortfolioCandidateConfirmStatusCode.NEEDS_MANUAL_FILL,
    ).length,
)

const pendingTaskPolling = computed(
  () =>
    taskStatus.value === AiTaskStatusCode.PENDING ||
    taskStatus.value === AiTaskStatusCode.PROCESSING,
)

function resetCandidateContext() {
  candidateRequestToken.value += 1
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
    Boolean(row.manualFillRequired) ||
    row.confirmStatus === PortfolioCandidateConfirmStatusCode.NEEDS_MANUAL_FILL
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
    row.confirmStatus === PortfolioCandidateConfirmStatusCode.CONFIRMED ||
    row.confirmStatus === PortfolioCandidateConfirmStatusCode.REJECTED
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
  const requestToken = candidateRequestToken.value
  if (!props.taskId) {
    if (candidateRequestToken.value === requestToken) {
      candidateRows.value = []
      taskStatus.value = undefined
    }
    return
  }
  loading.value = true
  try {
    const detail = await portfolioAiJobApi.get(props.taskId)
    if (candidateRequestToken.value !== requestToken) {
      return
    }
    taskStatus.value = detail.status
    if (detail.status !== 'SUCCEEDED') {
      candidateRows.value = []
      return
    }
    const rows = (await portfolioAiJobApi.listCandidates(props.taskId)) ?? []
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
    showUserError(error, '加载候选字段失败')
  } finally {
    if (candidateRequestToken.value === requestToken) {
      loading.value = false
    }
  }
}

async function confirmCandidate(row: PortfolioCandidateFieldVO) {
  if (!canConfirmRow(row)) {
    message.error('请先补全真实候选值后再确认')
    return
  }
  confirming.value = true
  try {
    await portfolioAiJobApi.confirm({
      candidateFieldId: row.id,
      aiTaskId: row.aiTaskId,
      confirmStatus: PortfolioCandidateConfirmStatusCode.CONFIRMED,
      correctedCandidateValue: rowNeedsManualFill(row) ? correctedValueFor(row).trim() : undefined,
    })
    message.success(`已确认字段：${row.fieldLabel}`)
    await loadCandidates()
    emit('confirmed')
  } catch (error) {
    showUserError(error, '确认候选字段失败')
  } finally {
    confirming.value = false
  }
}

async function rejectCandidate(row: PortfolioCandidateFieldVO) {
  void confirmAsync({
    title: '驳回该候选字段？',
    content: `字段「${row.fieldLabel}」将标记为已驳回，不会进入入档链。`,
    type: 'warning',
    onOk: async () => {
      confirming.value = true
      try {
        await portfolioAiJobApi.confirm({
          candidateFieldId: row.id,
          aiTaskId: row.aiTaskId,
          confirmStatus: PortfolioCandidateConfirmStatusCode.REJECTED,
        })
        message.success(`已驳回字段：${row.fieldLabel}`)
        await loadCandidates()
        emit('confirmed')
      } catch (error) {
        showUserError(error, '驳回候选字段失败')
      } finally {
        confirming.value = false
      }
    },
  })
}

function handleCandidateRowAction(key: string, row: PortfolioCandidateFieldVO) {
  if (key === 'confirm') void confirmCandidate(row)
  else if (key === 'reject') void rejectCandidate(row)
}

async function confirmAllEligible() {
  const eligible = candidateRows.value.filter(canConfirmRow)
  if (eligible.length === 0) {
    message.info('没有可自动确认的字段')
    return
  }
  confirming.value = true
  try {
    for (const row of eligible) {
      await portfolioAiJobApi.confirm({
        candidateFieldId: row.id,
        aiTaskId: row.aiTaskId,
        confirmStatus: PortfolioCandidateConfirmStatusCode.CONFIRMED,
        correctedCandidateValue: rowNeedsManualFill(row)
          ? correctedValueFor(row).trim()
          : undefined,
      })
    }
    message.success(`已确认 ${eligible.length} 个字段`)
    await loadCandidates()
    emit('confirmed')
  } catch (error) {
    showUserError(error, '批量确认候选字段失败')
    await loadCandidates()
  } finally {
    confirming.value = false
  }
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
  margin-bottom: var(--dp-space-3);
}

.portfolio-ai-candidate-panel__field-code {
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}

.portfolio-ai-candidate-panel__placeholder-hint {
  margin-top: var(--dp-space-1);
  color: var(--dp-text-muted);
  font-size: var(--dp-font-size-xs);
}
</style>
