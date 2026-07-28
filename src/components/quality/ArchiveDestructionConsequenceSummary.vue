<script setup lang="ts">
import type { ArchiveVO } from '@/apis/quality/archive'
import type { QualityArchiveDestructionLedgerExportDecisionCode } from '@/types/enums/quality-archive-destruction-ledger-export-decision-enum'
import { computed } from 'vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDescriptions from '@/components/ui-guide/ui/UiDescriptions.vue'
import UiDescriptionsItem from '@/components/ui-guide/ui/UiDescriptionsItem.vue'
import {
  QualityArchiveDestructionLedgerExportDecisionDescription,
} from '@/types/enums/quality-archive-destruction-ledger-export-decision-enum'
import {
  QUALITY_ARCHIVE_DESTRUCTION_STATUS_TONE,
  QualityArchiveDestructionStatusCode,
  QualityArchiveDestructionStatusDescription,
} from '@/types/enums/quality-archive-destruction-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  archive: ArchiveVO
  /** 申请抽屉内尚未提交的清册决议预览 */
  pendingLedgerDecision?: QualityArchiveDestructionLedgerExportDecisionCode
  pendingLedgerSkipReason?: string
}>()

const fileCountText = computed(() => {
  if (typeof props.archive.destructionTargetFileCount === 'number') {
    return String(props.archive.destructionTargetFileCount)
  }
  return props.archive.fileId ? '1' : '0'
})

const ledgerStatusText = computed(() => {
  if (props.pendingLedgerDecision) {
    const label
      = QualityArchiveDestructionLedgerExportDecisionDescription[props.pendingLedgerDecision]
    if (props.pendingLedgerSkipReason?.trim()) {
      return `${label}（待提交：${props.pendingLedgerSkipReason.trim()}）`
    }
    return `${label}（待提交）`
  }
  if (props.archive.ledgerExportDecision) {
    const label = strictEnumLabel(
      QualityArchiveDestructionLedgerExportDecisionDescription,
      props.archive.ledgerExportDecision,
      '清册导出决议',
    )
    const parts = [label]
    if (props.archive.ledgerExportTime) {
      parts.push(props.archive.ledgerExportTime)
    }
    if (props.archive.ledgerFileId) {
      parts.push(`清册文件 ${props.archive.ledgerFileId}`)
    }
    if (props.archive.ledgerSkipReason) {
      parts.push(`跳过原因：${props.archive.ledgerSkipReason}`)
    }
    return parts.join(' · ')
  }
  if (props.archive.destructionHistoryPresent) {
    return '清册决议缺失'
  }
  return '尚未申请销毁'
})

const approverText = computed(() => {
  const status = props.archive.destructionStatus
  if (status === QualityArchiveDestructionStatusCode.REQUESTED) {
    return '待审批（须非申请人）'
  }
  if (props.archive.destructionApprovedUserId) {
    return `用户 ${props.archive.destructionApprovedUserId}`
  }
  if (
    status === QualityArchiveDestructionStatusCode.APPROVED
    || status === QualityArchiveDestructionStatusCode.EXECUTING
    || status === QualityArchiveDestructionStatusCode.EXECUTED
    || status === QualityArchiveDestructionStatusCode.SUPERVISED
    || status === QualityArchiveDestructionStatusCode.FAILED
  ) {
    return '审批人未记录'
  }
  return '—'
})

const executionDetailText = computed(() => {
  const parts: string[] = []
  if (typeof props.archive.storageCleanupAttempts === 'number') {
    parts.push(`清理尝试 ${props.archive.storageCleanupAttempts} 次`)
  }
  if (props.archive.storageCleanupError) {
    parts.push(props.archive.storageCleanupError)
  }
  if (props.archive.destructionExecuteUserId) {
    parts.push(`执行发起人 ${props.archive.destructionExecuteUserId}`)
  }
  if (props.archive.destructionWitnessUserId) {
    parts.push(`监销人 ${props.archive.destructionWitnessUserId}`)
  }
  return parts.length > 0 ? parts.join(' · ') : '无异步清理明细'
})

const statusTone = computed(
  () => QUALITY_ARCHIVE_DESTRUCTION_STATUS_TONE[props.archive.destructionStatus],
)
</script>

<template>
  <div class="archive-destruction-consequence">
    <p class="archive-destruction-consequence__title">不可逆后果摘要</p>
    <UiDescriptions :column="1" size="small" bordered>
      <UiDescriptionsItem label="材料编号">
        {{ archive.archiveCode }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="文件数">
        {{ fileCountText }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="清册状态">
        {{ ledgerStatusText }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="当前审批人">
        {{ approverText }}
      </UiDescriptionsItem>
      <UiDescriptionsItem label="异步执行状态">
        <span class="archive-destruction-consequence__exec">
          <UiTag :tone="statusTone" size="sm">
            {{
              strictEnumLabel(
                QualityArchiveDestructionStatusDescription,
                archive.destructionStatus,
                '销毁状态',
              )
            }}
          </UiTag>
          <span>{{ executionDetailText }}</span>
        </span>
      </UiDescriptionsItem>
    </UiDescriptions>
  </div>
</template>

<style scoped>
.archive-destruction-consequence {
  margin-bottom: var(--dp-space-block);
}

.archive-destruction-consequence__title {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: 13px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.archive-destruction-consequence__exec {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dp-space-component-tight);
}
</style>
