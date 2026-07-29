<script lang="ts" setup>
import type { ExamScanMonitorDeviceResponse } from '@/apis/mark/exam-progress'
import { computed } from 'vue'
import { ScannerEndpointOnlineStatusCode } from '@/apis/mark/exam-mark-scanner'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { ScanBatchStatusDescription } from '@/types/enums/scan-batch-status-enum'
import { ScannerEndpointOnlineStatusDescription } from '@/types/enums/scanner-endpoint-online-status-enum'
import { formatDateTimeWithSeconds } from '@/utils/format'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ScanDeviceCardGrid' })

const props = defineProps<{
  devices: ExamScanMonitorDeviceResponse[]
  loading?: boolean
  /** 设备列表接口失败；与真实空列表互斥展示 */
  loadFailed?: boolean
  selectedDeviceId?: string
}>()

const emit = defineEmits<{
  select: [device: ExamScanMonitorDeviceResponse]
}>()

function deviceOnline(device: ExamScanMonitorDeviceResponse): boolean {
  return device.endpointOnlineStatus === ScannerEndpointOnlineStatusCode.ONLINE
}

function deviceOnlineStatusLabel(device: ExamScanMonitorDeviceResponse): string {
  if (device.endpointOnlineStatus == null) {
    return '状态不可用'
  }
  return strictEnumLabel(
    ScannerEndpointOnlineStatusDescription,
    device.endpointOnlineStatus,
    '扫描端在线状态',
  )
}

/** 离线与有在途批次优先，便于监控页先处置风险端。 */
const sortedDevices = computed(() => {
  const list = [...props.devices]
  list.sort((left, right) => {
    const leftRisk = Number(!deviceOnline(left)) * 2 + Number(Boolean(left.activeScanBatchId))
    const rightRisk = Number(!deviceOnline(right)) * 2 + Number(Boolean(right.activeScanBatchId))
    if (leftRisk !== rightRisk) {
      return rightRisk - leftRisk
    }
    const leftName = left.deviceName || left.scannerDeviceId
    const rightName = right.deviceName || right.scannerDeviceId
    return leftName.localeCompare(rightName, 'zh-CN')
  })
  return list
})

function heartbeatLabel(device: ExamScanMonitorDeviceResponse): string {
  if (!device.lastHeartbeatTime) {
    return '无心跳'
  }
  return formatDateTimeWithSeconds(device.lastHeartbeatTime)
}

function activeBatchLabel(device: ExamScanMonitorDeviceResponse): string {
  if (!device.activeScanBatchStatus && !device.activeScanBatchId && !device.activeScanBatchNo) {
    return '无在途批次'
  }
  const statusLabel = device.activeScanBatchStatus
    ? strictEnumLabel(
        ScanBatchStatusDescription,
        device.activeScanBatchStatus,
        '扫描批次状态',
      )
    : '—'
  const pageCount
    = device.activeScanBatchPageCount == null ? '—' : `${device.activeScanBatchPageCount} 页`
  const batchNo = device.activeScanBatchNo || device.activeScanBatchId || '—'
  return `${batchNo} · ${statusLabel} · ${pageCount}`
}

function pendingUploadLabel(device: ExamScanMonitorDeviceResponse): string {
  return device.pendingUploadPageCount == null ? '—' : String(device.pendingUploadPageCount)
}

function handleSelect(device: ExamScanMonitorDeviceResponse): void {
  emit('select', device)
}
</script>

<template>
  <WorkbenchSurfaceCard class="scan-device-grid" :class="{ 'scan-device-grid--loading': loading }">
    <template #head>
      <span class="scan-device-grid__title">本考试扫描端</span>
      <span class="scan-device-grid__meta">{{ loadFailed ? '加载失败' : `${devices.length} 台` }}</span>
    </template>
    <div v-if="loadFailed && devices.length === 0" class="scan-device-grid__empty">
      <span>扫描端列表加载失败，不能视为无在线端</span>
    </div>
    <div v-else-if="devices.length === 0" class="scan-device-grid__empty">
      暂无绑定一体机或历史扫描批次关联的扫描端
    </div>
    <ul v-else class="scan-device-grid__list" role="list">
      <li v-for="device in sortedDevices" :key="device.scannerDeviceId">
        <button
          type="button"
          class="scan-device-grid__row"
          :class="{
            'scan-device-grid__row--offline':
              device.endpointOnlineStatus === ScannerEndpointOnlineStatusCode.OFFLINE,
            'scan-device-grid__row--selected': selectedDeviceId === device.scannerDeviceId,
          }"
          :aria-pressed="selectedDeviceId === device.scannerDeviceId"
          @click="handleSelect(device)"
        >
          <span
            class="scan-device-grid__dot"
            :class="{ 'scan-device-grid__dot--online': deviceOnline(device) }"
            aria-hidden="true"
          />
          <span class="scan-device-grid__identity">
            <span class="scan-device-grid__name">{{
              device.deviceName || device.scannerDeviceId
            }}</span>
            <span class="scan-device-grid__meta-line">
              {{ device.scannerIp || '无 IP' }}
              <template v-if="device.kioskBoundToCurrentExam"> · 一体机</template>
            </span>
          </span>
          <UiTag
            class="scan-device-grid__status"
            :tone="deviceOnline(device) ? 'green' : device.endpointOnlineStatus ? 'orange' : 'gray'"
            size="sm"
          >
            {{ deviceOnlineStatusLabel(device) }}
          </UiTag>
          <span class="scan-device-grid__batch" :title="activeBatchLabel(device)">
            {{ activeBatchLabel(device) }}
          </span>
          <span class="scan-device-grid__pending" title="待上传页">
            待传 {{ pendingUploadLabel(device) }}
          </span>
          <span class="scan-device-grid__heartbeat" :title="`最后心跳 ${heartbeatLabel(device)}`">
            {{ heartbeatLabel(device) }}
          </span>
        </button>
      </li>
    </ul>
  </WorkbenchSurfaceCard>
</template>

<style scoped lang="scss">
.scan-device-grid {
  &--loading {
    opacity: 0.7;
    pointer-events: none;
  }

  &__title {
    font-size: var(--dp-font-size-md);
    font-weight: 600;
  }

  &__meta {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--dp-space-component-tight);
    padding: var(--dp-space-component) 0;
    text-align: center;
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-muted);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component-xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: grid;
    grid-template-columns: 8px minmax(0, 1.4fr) auto minmax(0, 1.6fr) auto minmax(120px, 0.8fr);
    align-items: center;
    gap: var(--dp-space-component-tight) var(--dp-space-component);
    width: 100%;
    min-height: 44px;
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    text-align: left;
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-control);
    background: var(--dp-surface);
    cursor: pointer;

    &:hover {
      border-color: var(--dp-color-primary);
    }

    &--selected {
      border-color: var(--dp-color-primary);
    }

    &--offline {
      background: var(--dp-warning-bg);
    }
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--dp-warning);
    flex-shrink: 0;

    &--online {
      background: var(--dp-success);
    }
  }

  &__identity {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    color: var(--dp-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta-line {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__batch,
  &__pending,
  &__heartbeat {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__pending {
    font-variant-numeric: tabular-nums;
  }
}

@media (max-width: 960px) {
  .scan-device-grid__row {
    grid-template-columns: 8px minmax(0, 1fr) auto;
    grid-template-areas:
      'dot identity status'
      'dot batch batch'
      'dot pending heartbeat';
  }

  .scan-device-grid__dot {
    grid-area: dot;
  }

  .scan-device-grid__identity {
    grid-area: identity;
  }

  .scan-device-grid__status {
    grid-area: status;
    justify-self: end;
  }

  .scan-device-grid__batch {
    grid-area: batch;
  }

  .scan-device-grid__pending {
    grid-area: pending;
  }

  .scan-device-grid__heartbeat {
    grid-area: heartbeat;
  }
}
</style>
