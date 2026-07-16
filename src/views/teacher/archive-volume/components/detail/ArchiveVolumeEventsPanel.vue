<template>
  <WorkbenchSurfaceCard class="archive-volume-events-panel">
    <template #head>
      <div class="archive-volume-events-panel__head">
        <h3 class="archive-volume-events-panel__title">审计事件</h3>
        <div class="archive-volume-events-panel__actions">
          <span class="archive-volume-events-panel__count">当前显示 {{ events.length }} 条</span>
          <UiButton
            size="sm"
            variant="ghost"
            :loading="exporting"
            :disabled="events.length === 0"
            @click="handleExport"
          >
            导出
          </UiButton>
        </div>
      </div>
    </template>
    <ArchiveVolumeEventsTimeline :events="events" />
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type { ArchiveVolumeDetailResponse } from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { ref } from 'vue'
import { downloadFile } from '@/apis/edu/file-management'
import { exportArchiveVolumeEvents } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { showUserError } from '@/utils/error-handler'
import ArchiveVolumeEventsTimeline from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeEventsTimeline.vue'

defineOptions({ name: 'ArchiveVolumeEventsPanel' })

const props = defineProps<{
  volumeId: string
  events: ArchiveVolumeDetailResponse['events']
}>()

const exporting = ref(false)

async function handleExport() {
  exporting.value = true
  try {
    const result = await exportArchiveVolumeEvents(props.volumeId)
    if (!result.exportFileId) {
      showUserError(null, '导出未返回文件编号')
      return
    }
    await downloadFile({ nodeId: result.exportFileId })
    message.success(`审计日志已导出，共 ${result.eventCount ?? 0} 条`)
  } catch (error) {
    showUserError(error, '导出审计日志失败')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.archive-volume-events-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dp-space-2);
  width: 100%;
}

.archive-volume-events-panel__actions {
  display: flex;
  align-items: center;
  gap: var(--dp-space-2);
}

.archive-volume-events-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--dp-font-weight-title);
}

.archive-volume-events-panel__count {
  font-size: 12px;
  color: var(--dp-text-secondary);
}
</style>
