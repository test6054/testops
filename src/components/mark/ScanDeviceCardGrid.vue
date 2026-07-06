<script lang="ts" setup>
import type { ExamScannerDeviceVO } from '@/apis/mark/exam-mark-scanner'
import { isScannerDeviceOnline } from '@/apis/mark/exam-mark-scanner'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { formatDateTimeWithSeconds } from '@/utils/format'

defineOptions({ name: 'ScanDeviceCardGrid' })

const props = defineProps<{
  devices: ExamScannerDeviceVO[]
  loading?: boolean
  selectedDeviceId?: string
}>()

const emit = defineEmits<{
  select: [device: ExamScannerDeviceVO]
}>()

function deviceOnline(device: ExamScannerDeviceVO): boolean {
  return isScannerDeviceOnline(device)
}

function heartbeatLabel(device: ExamScannerDeviceVO): string {
  if (!device.lastHeartbeatTime) {
    return '无心跳记录'
  }
  return formatDateTimeWithSeconds(device.lastHeartbeatTime)
}

function handleSelect(device: ExamScannerDeviceVO): void {
  emit('select', device)
}
</script>

<template>
  <WorkbenchSurfaceCard class="scan-device-grid" :class="{ 'scan-device-grid--loading': loading }">
    <template #head>
      <span class="scan-device-grid__title">扫描设备</span>
      <span class="scan-device-grid__meta">{{ devices.length }} 台</span>
    </template>
    <div v-if="devices.length === 0" class="scan-device-grid__empty">暂无扫描设备</div>
    <div v-else class="scan-device-grid__list">
      <button
        v-for="device in devices"
        :key="device.scannerDeviceId"
        type="button"
        class="scan-device-grid__card"
        :class="{
          'scan-device-grid__card--online': deviceOnline(device),
          'scan-device-grid__card--selected': selectedDeviceId === device.scannerDeviceId,
        }"
        @click="handleSelect(device)"
      >
        <div class="scan-device-grid__card-head">
          <span
            class="scan-device-grid__pulse"
            :class="{ 'scan-device-grid__pulse--online': deviceOnline(device) }"
          />
          <span class="scan-device-grid__name">{{ device.deviceName }}</span>
          <UiTag :tone="deviceOnline(device) ? 'green' : 'orange'" size="sm">
            {{ deviceOnline(device) ? '在线' : '离线' }}
          </UiTag>
        </div>
        <div class="scan-device-grid__id">{{ device.scannerDeviceId }}</div>
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
    color: var(--dp-text-muted, #64748b);
  }

  &__empty {
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
    color: var(--dp-text-muted, #64748b);
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
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface, #fff);
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
  }

  &__card-head {
    display: flex;
    align-items: center;
    gap: 8px;
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
    color: var(--dp-text-primary, #0f172a);
  }

  &__id {
    font-size: 12px;
    font-family: var(--dp-font-mono, ui-monospace, monospace);
    color: var(--dp-text-muted, #64748b);
  }

  &__stats {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 4px;
  }

  &__stat-label {
    font-size: 11px;
    color: var(--dp-text-muted, #64748b);
  }

  &__stat-value {
    font-size: 18px;
    font-weight: 700;
    font-family: var(--dp-font-mono, ui-monospace, monospace);
    color: var(--dp-text-primary, #0f172a);
  }

  &__stat-version {
    font-size: 13px;
    font-weight: 500;
    color: var(--dp-text-secondary, #475569);
  }

  &__heartbeat {
    font-size: 11px;
    color: var(--dp-text-muted, #64748b);
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
