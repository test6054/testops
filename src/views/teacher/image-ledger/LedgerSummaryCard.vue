<template>
  <a-spin :spinning="loading">
    <UiEmpty v-if="!ledger" description="暂未生成账本" />
    <div v-else class="ledger-summary">
      <!-- 顶栏：状态 + 进度环 + 操作 -->
      <div class="ledger-summary__hero">
        <div class="ledger-summary__hero-left">
          <UiRingProgress
            :percent="scanPercent"
            size="lg"
            :color="scanRingColor"
            label="扫描进度"
          />
          <div class="ledger-summary__hero-meta">
            <div class="ledger-summary__hero-status">
              <UiTag :tone="statusTone" size="sm">{{ statusLabel }}</UiTag>
              <span class="ledger-summary__hero-time">
                最近对账：{{ formatDateTime(ledger.balancedTime) }}
              </span>
            </div>
            <UiProgressBarNew
              :percent="scanPercent"
              size="sm"
              :color="scanRingColor"
              :label="`已扫 ${ledger.scannedPageCount} / ${ledger.expectedPageCount} 页`"
              class="ledger-summary__scan-bar"
            />
            <div v-if="ledger.diagnostic" class="ledger-summary__diagnostic">
              <ExclamationCircleOutlined style="color: var(--ant-color-warning)" />
              <span>{{ ledgerDiagnosticText(ledger.diagnostic) }}</span>
            </div>
          </div>
        </div>
        <div class="ledger-summary__hero-right">
          <UiButton
            variant="primary"
            size="sm"
            :loading="balancing"
            :disabled="!ledger"
            @click="$emit('balance')"
          >
            执行整体对账
          </UiButton>
        </div>
      </div>

      <!-- KPI 分组 1：影像收录 -->
      <UiStatPanel title="影像收录" :items="scanMetrics" :columns="4" variant="grid" compact />

      <!-- KPI 分组 2：试卷重构与绑定 -->
      <UiStatPanel
        title="试卷重构与绑定"
        :items="bindMetrics"
        :columns="3"
        variant="grid"
        compact
      />

      <!-- KPI 分组 3：偏差与异常 -->
      <UiStatPanel
        title="偏差与异常"
        :items="deviationMetrics"
        :columns="3"
        variant="grid"
        compact
      />
    </div>
  </a-spin>
</template>

<script lang="ts" setup>
import type { ImageLedgerDetailVO } from '@/apis/mark/image-ledger'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import { computed } from 'vue'
import { LEDGER_STATUS_COLOR, LEDGER_STATUS_LABEL } from '@/apis/mark/image-ledger'
import {
  UiButton,
  UiEmpty,
  UiProgressBarNew,
  UiRingProgress,
  UiStatPanel,
  UiTag,
} from '@/components/ui-guide/ui'
import { getUserErrorMessage } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'LedgerSummaryCard' })
const props = defineProps<{
  ledger: ImageLedgerDetailVO | null
  loading: boolean
  balancing: boolean
}>()
defineEmits<{ (e: 'balance'): void }>()

const statusLabel = computed(() => {
  return strictEnumLabel(LEDGER_STATUS_LABEL, props.ledger?.ledgerStatus, '影像账本状态')
})

const statusTone = computed(() => {
  return strictEnumTone(LEDGER_STATUS_COLOR, props.ledger?.ledgerStatus, '影像账本状态')
})

const scanPercent = computed(() => {
  const ledger = props.ledger
  if (!ledger) return 0
  const expected = ledger.expectedPageCount
  const scanned = ledger.scannedPageCount
  if (expected <= 0) return 0
  return Math.min(Math.round((scanned / expected) * 100), 100)
})

const scanRingColor = computed(() => {
  if (scanPercent.value >= 100) return '#16a34a'
  if (scanPercent.value >= 60) return '#3b82f6'
  return '#f59e0b'
})

/** 将影像账本诊断转为扫描交付处置提示，避免展示底层对账细节。 */
function ledgerDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    '影像账本对账发现异常，请进入扫描异常队列处理',
  )
}

const scanMetrics = computed(() => {
  const ledger = props.ledger
  if (!ledger) return []
  return [
    {
      label: '应考人数',
      value: ledger.expectedCandidateCount,
      unit: '人',
      tone: 'blue' as const,
    },
    {
      label: '应有页数',
      value: ledger.expectedPageCount,
      unit: '页',
      tone: 'blue' as const,
    },
    {
      label: '已扫描页',
      value: ledger.scannedPageCount,
      unit: '页',
      tone: scanPercent.value >= 100 ? ('green' as const) : ('orange' as const),
    },
    {
      label: '扫描完成率',
      value: `${scanPercent.value}`,
      unit: '%',
      tone: scanPercent.value >= 100 ? ('green' as const) : ('blue' as const),
    },
  ]
})

const bindMetrics = computed(() => {
  const ledger = props.ledger
  if (!ledger) return []
  return [
    {
      label: '已重构试卷',
      value: ledger.reconstructedPaperCount,
      unit: '份',
      tone: 'blue' as const,
    },
    {
      label: '已绑定试卷',
      value: ledger.boundPaperCount,
      unit: '份',
      tone: 'green' as const,
    },
    {
      label: '未匹配考生',
      value: ledger.missingCandidateCount,
      unit: '人',
      tone: ledger.missingCandidateCount > 0 ? ('red' as const) : ('green' as const),
    },
  ]
})

const deviationMetrics = computed(() => {
  const ledger = props.ledger
  if (!ledger) return []
  return [
    {
      label: '重复影像页',
      value: ledger.duplicatePageCount,
      unit: '页',
      tone: ledger.duplicatePageCount > 0 ? ('orange' as const) : ('green' as const),
    },
    {
      label: '待处置重复',
      value: ledger.pendingDuplicateCount,
      unit: '条',
      tone: ledger.pendingDuplicateCount > 0 ? ('red' as const) : ('green' as const),
    },
    { label: '账本编号', value: ledger.ledgerId, tone: 'gray' as const },
  ]
})
</script>

<style lang="scss" scoped>
.ledger-summary {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ledger-summary__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 20px;
  background: var(--dp-surface-subtle, #f8fafc);
  border-radius: var(--dp-radius-panel, 8px);
}

.ledger-summary__hero-left {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
  min-width: 0;
}

.ledger-summary__hero-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.ledger-summary__hero-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ledger-summary__hero-time {
  font-size: 12px;
  color: var(--dp-text-muted, #64748b);
}

.ledger-summary__scan-bar {
  max-width: 400px;
}

.ledger-summary__diagnostic {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--dp-text-secondary, #475569);
}

.ledger-summary__hero-right {
  flex-shrink: 0;
}
</style>
