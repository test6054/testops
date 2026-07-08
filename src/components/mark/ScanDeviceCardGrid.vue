<script lang="ts" setup>
import type { ExamScanMonitorDeviceResponse } from '@/apis/mark/exam-progress'
import { ScannerEndpointOnlineStatusCode } from '@/apis/mark/exam-mark-scanner'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ScanBatchStatusDescription } from '@/types/enums/scan-batch-status-enum'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ScanDeviceCardGrid' })

defineProps<{
  devices: ExamScanMonitorDeviceResponse[]
  loading?: boolean
  selectedDeviceId?: string
}>()

const emit = defineEmits<{
  select: [device: ExamScanMonitorDeviceResponse]
}>()

function deviceOnline(device: ExamScanMonitorDeviceResponse): boolean {
  return device.endpointOnlineStatus === ScannerEndpointOnlineStatusCode.ONLINE
}

function heartbeatLabel(device: ExamScanMonitorDeviceResponse): string {
  if (!device.lastHeartbeatTime) {
    return '无心跳记录'
  }
  return formatDateTimeWithSeconds(device.lastHeartbeatTime)
}

function activeBatchLabel(device: ExamScanMonitorDeviceResponse): string | null {
  if (!device.activeScanBatchStatus) {
    return null
  }
  const statusLabel = strictEnumLabel(
    ScanBatchStatusDescription,
    device.activeScanBatchStatus,
    '扫描批次状态',
  )
  const pageCount = device.activeScanBatchPageCount ?? 0
  const batchNo = device.activeScanBatchNo || device.activeScanBatchId
  return [batchNo, statusLabel, `${pageCount} 页`].filter(Boolean).join(' · ')
}

function handleSelect(device: ExamScanMonitorDeviceResponse): void {
  emit('select', device)
}
</script>

<template>
  <WorkbenchSurfaceCard class="scan-device-grid" :class="{ 'scan-device-grid--loading': loading }">
    <template #head>
      <span class="scan-device-grid__title">本考试扫描端</span>
      <span class="scan-device-grid__meta">{{ devices.length }} 台</span>
    </template>
    <div v-if="devices.length === 0" class="scan-device-grid__empty">当前无扫描端参与本考试</div>
    <div v-else class="scan-device-grid__list">
      <button
        v-for="device in devices"
        :key="device.scannerDeviceId"
        type="button"
        class="scan-device-grid__card"
        :class="{
          'scan-device-grid__card--online': deviceOnline(device),
          'scan-device-grid__card--offline': !deviceOnline(device),
          'scan-device-grid__card--selected': selectedDeviceId === device.scannerDeviceId,
        }"
        @click="handleSelect(device)"
      >
        <div class="scan-device-grid__card-head">
          <span
            class="scan-device-grid__pulse"
            :class="{ 'scan-device-grid__pulse--online': deviceOnline(device) }"
          />
          <span class="scan-device-grid__name">{{
            device.deviceName || device.scannerDeviceId
          }}</span>
          <UiTag :tone="deviceOnline(device) ? 'green' : 'orange'" size="sm">
            {{ deviceOnline(device) ? '在线' : '离线' }}
          </UiTag>
          <UiTag v-if="device.kioskBoundToCurrentExam" tone="blue" size="sm">一体机</UiTag>
        </div>
        <div class="scan-device-grid__id">{{ device.scannerDeviceId }}</div>
        <div v-if="activeBatchLabel(device)" class="scan-device-grid__batch">
          {{ activeBatchLabel(device) }}
        </div>
        <div class="scan-device-grid__stats">
          <div>
            <div class="scan-device-grid__stat-label">待上传页</div>
            <div class="scan-device-grid__stat-value">{{ device.pendingUploadPageCount ?? 0 }}</div>
          </div>
          <div>
            <div class="scan-device-grid__stat-label">Agent 版本</div>
            <div class="scan-device-grid__stat-version">{{ device.agentVersion ?? '—' }}</div>
          </div>
        </div>
        <div class="scan-device-grid__heartbeat">最后心跳 {{ heartbeatLabel(device) }}</div>
      </button>
    </div>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.scan-device-grid {
  &--loading {
    opacity: 0.7;
    pointer-events: none;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
  }

  &__meta {
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__empty {
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
    color: var(--dp-text-muted);
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    text-align: left;
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    background: var(--dp-surface);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &:hover {
      border-color: var(--ant-color-primary, #1677ff);
    }

    &--selected {
      border-color: var(--ant-color-primary, #1677ff);
      box-shadow: 0 0 0 1px var(--ant-color-primary, #1677ff);
    }

    &--online {
      background: var(--ant-color-success-bg, #f0fdf4);
    }

    &--offline {
      background: var(--ant-color-warning-bg, #fffbeb);
    }
  }

  &__card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ant-color-warning, #f59e0b);
    flex-shrink: 0;

    &--online {
      background: var(--ant-color-success, #16a34a);
      animation: scan-device-pulse 2s ease-in-out infinite;
    }
  }

  &__name {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__id {
    font-size: 12px;
    font-family: var(--dp-font-mono);
    color: var(--dp-text-muted);
  }

  &__batch {
    font-size: 12px;
    color: var(--dp-text-secondary);
  }

  &__stats {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 4px;
  }

  &__stat-label {
    font-size: 11px;
    color: var(--dp-text-muted);
  }

  &__stat-value {
    font-size: 18px;
    font-weight: 700;
    font-family: var(--dp-font-mono);
    color: var(--dp-text-primary);
  }

  &__stat-version {
    font-size: 13px;
    font-weight: 500;
    color: var(--dp-text-secondary);
  }

  &__heartbeat {
    font-size: 11px;
    color: var(--dp-text-muted);
  }
}

@keyframes scan-device-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@media (max-width: 1100px) {
  .scan-device-grid__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .scan-device-grid__list {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
