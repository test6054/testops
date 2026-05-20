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
                最近对账：{{ fmt(ledger.balancedTime) }}
              </span>
            </div>
            <UiProgressBarNew
              :percent="scanPercent"
              size="sm"
              :color="scanRingColor"
              :label="`已扫 ${ledger.scannedPageCount ?? 0} / ${ledger.expectedPageCount ?? 0} 页`"
              class="ledger-summary__scan-bar"
            />
            <div v-if="ledger.diagnostic" class="ledger-summary__diagnostic">
              <ExclamationCircleOutlined style="color: var(--ant-color-warning)" />
              <span>{{ ledger.diagnostic }}</span>
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
import dayjs from 'dayjs'
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

defineOptions({ name: 'LedgerSummaryCard' })
const props = defineProps<{
  ledger: ImageLedgerDetailVO | null
  loading: boolean
  balancing: boolean
}>()
defineEmits<{ (e: 'balance'): void }>()

const statusLabel = computed(() => {
  const code = props.ledger?.ledgerStatus
  if (!code) return '未对账'
  return LEDGER_STATUS_LABEL[code] || code
})

const statusTone = computed(() => {
  return LEDGER_STATUS_COLOR[props.ledger?.ledgerStatus || ''] || 'gray'
})

const scanPercent = computed(() => {
  const expected = props.ledger?.expectedPageCount ?? 0
  const scanned = props.ledger?.scannedPageCount ?? 0
  if (expected <= 0) return 0
  return Math.min(Math.round((scanned / expected) * 100), 100)
})

const scanRingColor = computed(() => {
  if (scanPercent.value >= 100) return '#16a34a'
  if (scanPercent.value >= 60) return '#3b82f6'
  return '#f59e0b'
})

const scanMetrics = computed(() => [
  {
    label: '应考人数',
    value: props.ledger?.expectedCandidateCount ?? 0,
    unit: '人',
    tone: 'blue' as const,
  },
  {
    label: '应有页数',
    value: props.ledger?.expectedPageCount ?? 0,
    unit: '页',
    tone: 'blue' as const,
  },
  {
    label: '已扫描页',
    value: props.ledger?.scannedPageCount ?? 0,
    unit: '页',
    tone: scanPercent.value >= 100 ? ('green' as const) : ('orange' as const),
  },
  {
    label: '扫描完成率',
    value: `${scanPercent.value}`,
    unit: '%',
    tone: scanPercent.value >= 100 ? ('green' as const) : ('blue' as const),
  },
])

const bindMetrics = computed(() => [
  {
    label: '已重构试卷',
    value: props.ledger?.reconstructedPaperCount ?? 0,
    unit: '份',
    tone: 'blue' as const,
  },
  {
    label: '已绑定试卷',
    value: props.ledger?.boundPaperCount ?? 0,
    unit: '份',
    tone: 'green' as const,
  },
  {
    label: '未匹配考生',
    value: props.ledger?.missingCandidateCount ?? 0,
    unit: '人',
    tone: (props.ledger?.missingCandidateCount ?? 0) > 0 ? ('red' as const) : ('green' as const),
  },
])

const deviationMetrics = computed(() => [
  {
    label: '重复影像页',
    value: props.ledger?.duplicatePageCount ?? 0,
    unit: '页',
    tone: (props.ledger?.duplicatePageCount ?? 0) > 0 ? ('orange' as const) : ('green' as const),
  },
  {
    label: '待处置重复',
    value: props.ledger?.pendingDuplicateCount ?? 0,
    unit: '条',
    tone: (props.ledger?.pendingDuplicateCount ?? 0) > 0 ? ('red' as const) : ('green' as const),
  },
  { label: '账本 ID', value: props.ledger?.ledgerId ?? '-', tone: 'gray' as const },
])

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}
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
