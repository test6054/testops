<template>
  <UiSkeletonState v-if="loading" variant="card" :card-count="3" compact />
  <UiAlertStrip
    v-else-if="!ledger"
    tone="info"
    size="sm"
    dense
    inline
    :show-icon="false"
    class="ledger-summary__gate"
  >
    <template #default>
      <span class="ledger-summary__gate-row">
        <UiTag tone="blue" size="sm">待建立账本</UiTag>
        <span>尚未建立影像账本，执行整体对账后将汇总扫描收录与绑定进度</span>
      </span>
    </template>
  </UiAlertStrip>
  <div v-else class="ledger-summary">
    <!-- 顶栏：状态 + 进度环 + 操作 -->
    <div class="ledger-summary__hero">
      <div class="ledger-summary__hero-left">
        <MarkGaugeBlock v-bind="scanGaugeBlockProps">
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
              :label="scanProgressLabel"
              class="ledger-summary__scan-bar"
              aria-label="页级扫描进度"
            />
            <div v-if="ledger.diagnostic" class="ledger-summary__diagnostic">
              <ExclamationCircleOutlined style="color: var(--dp-warning)" />
              <span>{{ ledgerDiagnosticText(ledger.diagnostic) }}</span>
            </div>
          </div>
        </MarkGaugeBlock>
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

    <!-- KPI 分组 -->
    <section class="ledger-summary__group">
      <h3 class="ledger-summary__group-title">影像收录</h3>
      <SignalBand :metrics="scanSignalMetrics" compact variant="inline" />
    </section>
    <section class="ledger-summary__group">
      <h3 class="ledger-summary__group-title">试卷重构与绑定</h3>
      <SignalBand :metrics="bindSignalMetrics" compact variant="inline" />
    </section>
    <section class="ledger-summary__group">
      <h3 class="ledger-summary__group-title">偏差与异常</h3>
      <SignalBand :metrics="deviationSignalMetrics" compact variant="inline" />
    </section>
  </div>
</template>

<script lang="ts" setup>
import type { ImageLedgerDetailResponse } from '@/apis/mark/image-ledger'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import ExclamationCircleOutlined from '@ant-design/icons-vue/ExclamationCircleOutlined'
import { computed } from 'vue'
import { LEDGER_STATUS_TONE, LedgerStatusDescription } from '@/apis/mark/image-ledger'
import MarkGaugeBlock from '@/components/chart/MarkGaugeBlock.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiProgressBarNew from '@/components/ui-guide/ui/UiProgressBar.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import { useChartOption } from '@/hooks/modules/useChartOption'
import { getUserErrorMessage } from '@/utils/error-handler'
import { formatDateTime } from '@/utils/format'
import { formatGaugeAriaLabel } from '@/utils/mark-chart-accessibility'
import { buildGaugeChartOption } from '@/utils/mark-echarts-options'
import { toneToColor } from '@/utils/score-tone'
import { toSignalMetrics } from '@/utils/stat-metric-helpers'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'LedgerSummaryCard' })
const props = defineProps<{
  ledger: ImageLedgerDetailResponse | null
  loading: boolean
  balancing: boolean
}>()
defineEmits<{ (e: 'balance'): void }>()

const statusLabel = computed(() => {
  if (!props.ledger) return ''
  return strictEnumLabel(LedgerStatusDescription, props.ledger.ledgerStatus, '影像账本状态')
})

const statusTone = computed(() => {
  if (!props.ledger) return 'gray'
  return strictEnumTone(LEDGER_STATUS_TONE, props.ledger.ledgerStatus, '影像账本状态')
})

const scanPercent = computed(() => {
  const ledger = props.ledger
  if (!ledger) return 0
  const expected = ledger.expectedPageCount
  const scanned = ledger.scannedPageCount
  if (expected <= 0) return 0
  return Math.min(Math.round((scanned / expected) * 100), 100)
})

const scanProgressLabel = computed(() => {
  const ledger = props.ledger
  if (!ledger) return ''
  return `已扫 ${ledger.scannedPageCount} / ${ledger.expectedPageCount} 页`
})

function formatLedgerMetric(value: number | null | undefined): string | number {
  return value ?? '—'
}

/** 扫描完成率环色：100% 完成绿 / ≥60% 推进蓝 / 其余推进橙 */
const scanRingColor = computed(() => {
  const tone: BadgeTone
    = scanPercent.value >= 100 ? 'green' : scanPercent.value >= 60 ? 'blue' : 'orange'
  return toneToColor(tone)
})

const { chartOption: scanGaugeOption } = useChartOption(() =>
  buildGaugeChartOption(scanPercent.value, {
    label: '扫描进度',
    color: scanRingColor.value,
    size: 'md',
  }),
)

const scanGaugeAriaLabel = computed(() => {
  const ledger = props.ledger
  const detail = ledger
    ? `已扫 ${ledger.scannedPageCount} / ${ledger.expectedPageCount} 页`
    : scanProgressLabel.value
  return formatGaugeAriaLabel('扫描进度', scanPercent.value, detail)
})

const scanGaugeBlockProps = computed(
  (): {
    option: typeof scanGaugeOption.value
    ariaLabel: string
    layout: 'inline'
  } => ({
    option: scanGaugeOption.value,
    ariaLabel: scanGaugeAriaLabel.value,
    layout: 'inline',
  }),
)

/** 将影像账本诊断转为扫描交付处置提示，避免展示底层对账细节。 */
function ledgerDiagnosticText(diagnostic?: string): string {
  return getUserErrorMessage(
    { message: diagnostic },
    '影像账本对账发现异常，请进入扫描异常队列处理',
  )
}

const scanSignalMetrics = computed((): SignalMetric[] => {
  const ledger = props.ledger
  if (!ledger) return []
  return toSignalMetrics([
    {
      key: 'expectedCandidates',
      label: '应考人数',
      value: formatLedgerMetric(ledger.expectedCandidateCount),
      unit: '人',
      tone: 'blue',
    },
    {
      key: 'expectedPages',
      label: '应有页数',
      value: formatLedgerMetric(ledger.expectedPageCount),
      unit: '页',
      tone: 'blue',
    },
    {
      key: 'scannedPages',
      label: '已扫描页',
      value: formatLedgerMetric(ledger.scannedPageCount),
      unit: '页',
      tone: scanPercent.value >= 100 ? 'green' : 'orange',
    },
    {
      key: 'scanPercent',
      label: '扫描完成率',
      value: `${scanPercent.value}`,
      unit: '%',
      tone: scanPercent.value >= 100 ? 'green' : 'blue',
    },
  ])
})

const bindSignalMetrics = computed((): SignalMetric[] => {
  const ledger = props.ledger
  if (!ledger) return []
  return toSignalMetrics([
    {
      key: 'reconstructed',
      label: '已重构试卷',
      value: formatLedgerMetric(ledger.reconstructedPaperCount),
      unit: '份',
      tone: 'blue',
    },
    {
      key: 'bound',
      label: '已绑定试卷',
      value: formatLedgerMetric(ledger.boundPaperCount),
      unit: '份',
      tone: 'green',
    },
    {
      key: 'missingCandidate',
      label: '未匹配考生',
      value: formatLedgerMetric(ledger.missingCandidateCount),
      unit: '人',
      tone:
        typeof ledger.missingCandidateCount === 'number' && ledger.missingCandidateCount > 0
          ? 'red'
          : 'green',
    },
  ])
})

const deviationSignalMetrics = computed((): SignalMetric[] => {
  const ledger = props.ledger
  if (!ledger) return []
  return toSignalMetrics([
    {
      key: 'duplicatePages',
      label: '重复影像页',
      value: formatLedgerMetric(ledger.duplicatePageCount),
      unit: '页',
      tone:
        typeof ledger.duplicatePageCount === 'number' && ledger.duplicatePageCount > 0
          ? 'orange'
          : 'green',
    },
    {
      key: 'pendingDuplicate',
      label: '待处置重复',
      value: formatLedgerMetric(ledger.pendingDuplicateCount),
      unit: '条',
      tone:
        typeof ledger.pendingDuplicateCount === 'number' && ledger.pendingDuplicateCount > 0
          ? 'red'
          : 'green',
    },
    { key: 'ledgerId', label: '账本编号', value: ledger.ledgerId, tone: 'gray' },
  ])
})
</script>

<style lang="scss" scoped>
.ledger-summary {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
}

.ledger-summary__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dp-space-3, 12px);
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px);
  background: var(--dp-surface-subtle);
  border-radius: var(--dp-radius-panel);
}

.ledger-summary__hero-left {
  display: flex;
  align-items: center;
  gap: var(--dp-space-3, 12px);
  flex: 1;
  min-width: 0;
}

.ledger-summary__hero-meta {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-2, 8px);
  flex: 1;
  min-width: 0;
}

.ledger-summary__hero-status {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2, 8px);
}

.ledger-summary__hero-time {
  font-size: 12px;
  color: var(--dp-text-muted);
}

.ledger-summary__scan-bar {
  max-width: 400px;
}

.ledger-summary__diagnostic {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}

.ledger-summary__hero-right {
  flex-shrink: 0;
}

.ledger-summary__group-title {
  margin: 0 0 8px;
  font-size: var(--dp-type-table-head-size);
  font-weight: var(--dp-type-table-head-weight);
  color: var(--dp-text-primary);
}

.ledger-summary__gate { margin: var(--dp-space-2) 0; }
.ledger-summary__gate-row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
}
</style>
