<template>
  <a-card title="账本概览" :bordered="false" size="small">
    <template #extra>
      <a-button type="primary" :loading="balancing" :disabled="!ledger" @click="$emit('balance')">
        执行整体对账
      </a-button>
    </template>
    <a-spin :spinning="loading">
      <a-empty v-if="!ledger" description="暂未生成账本。" />
      <a-descriptions v-else :column="3" size="small" bordered>
        <a-descriptions-item label="账本状态">
          <a-tag :color="LEDGER_STATUS_COLOR[ledger.ledgerStatus || ''] || 'default'">
            {{ LEDGER_STATUS_LABEL[ledger.ledgerStatus || ''] || ledger.ledgerStatus || '-' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="最近对账">{{ fmt(ledger.balancedTime) }}</a-descriptions-item>
        <a-descriptions-item label="账本ID">{{ ledger.ledgerId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="应考人数">{{
          ledger.expectedCandidateCount ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="应有页数">{{
          ledger.expectedPageCount ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="已扫描页">{{
          ledger.scannedPageCount ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="已重构试卷">{{
          ledger.reconstructedPaperCount ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="已绑定试卷">{{
          ledger.boundPaperCount ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="未匹配考生">{{
          ledger.missingCandidateCount ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="重复影像页">{{
          ledger.duplicatePageCount ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="待处置重复">{{
          ledger.pendingDuplicateCount ?? 0
        }}</a-descriptions-item>
        <a-descriptions-item label="对账诊断" :span="3">{{
          ledger.diagnostic || '无'
        }}</a-descriptions-item>
      </a-descriptions>
    </a-spin>
  </a-card>
</template>

<script lang="ts" setup>
import type { ImageLedgerDetailVO } from '@/apis/mark/image-ledger'
import { LEDGER_STATUS_COLOR, LEDGER_STATUS_LABEL } from '@/apis/mark/image-ledger'
import dayjs from 'dayjs'

defineOptions({ name: 'LedgerSummaryCard' })
defineProps<{ ledger: ImageLedgerDetailVO | null; loading: boolean; balancing: boolean }>()
defineEmits<{ (e: 'balance'): void }>()

function fmt(v?: string): string {
  if (!v) return '-'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}
</script>
