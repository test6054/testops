<template>
  <WorkbenchSurfaceCard flush class="archive-volume-history-import">
    <template #head>
      <div class="archive-volume-history-import__section-head">
        <h3 class="archive-volume-history-import__section-title">历史档案数字化</h3>
        <p class="archive-volume-history-import__section-subtitle">
          历史纸质卷数字化 · 批量导入归档任务与材料
        </p>
      </div>
    </template>
    <template #toolbar>
      <UiButton size="sm" variant="outline" @click="importModalOpen = true">
        Excel 批量导入
      </UiButton>
    </template>
    <UiAlertStrip
      tone="info"
      title="导入流程"
      description="1. 下载 MARK_PAPER_ARCHIVE_HISTORY 模板；2. 按模板填写历史纸质档案任务与材料信息；3. 上传 Excel，平台按批次返回成功/失败条数；4. 失败行见批次诊断明细，修正后重新导入。"
      dense
      class="archive-volume-history-import__flow"
    />
    <UiAlertStrip
      v-if="lastResult"
      :tone="archiveImportResultTone(lastResult.batchStatus)"
      :title="`批次 ${lastResult.batchNo}`"
      :description="buildArchiveImportResultDescription(lastResult, lastFailureSummaries)"
      dense
      class="archive-volume-history-import__result"
    />
    <UiPlatformExcelImportModal
      v-model:open="importModalOpen"
      :scene-key="ExcelImportSceneKey.MARK_PAPER_ARCHIVE_HISTORY"
      entity-label="历史纸质档案"
      @success="handleImportSuccess"
    />
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type { ArchiveExternalImportResultVO } from '@/apis/mark/archive-volume'
import type { ExcelImportResult } from '@/apis/platform/types'
import { ref } from 'vue'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import {
  archiveImportResultTone,
  buildArchiveImportFailureSummaries,
  buildArchiveImportResultDescription,
  buildMissingBatchImportFailure,
  mapExcelImportResultToArchiveBatch,
} from '@/utils/archive-import-result-ui'

defineOptions({ name: 'ArchiveVolumeHistoryImportPanel' })

const emit = defineEmits<{
  imported: []
}>()

const importModalOpen = ref(false)
const lastResult = ref<ArchiveExternalImportResultVO | null>(null)
const lastFailureSummaries = ref<string[]>([])

function handleImportSuccess(result: ExcelImportResult): void {
  importModalOpen.value = false
  const mapped = mapExcelImportResultToArchiveBatch(result)
  if (!mapped) {
    const failure = buildMissingBatchImportFailure()
    lastResult.value = failure.result
    lastFailureSummaries.value = failure.failureSummaries
    return
  }
  lastResult.value = mapped
  lastFailureSummaries.value = buildArchiveImportFailureSummaries(result)
  if (mapped.successCount > 0) {
    emit('imported')
  }
}
</script>

<style scoped lang="scss">
.archive-volume-history-import {
  &__section-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--dp-text-primary);
  }

  &__section-subtitle {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--dp-text-muted);
  }

  &__flow {
    margin-top: var(--dp-space-2);
  }

  &__result {
    margin-top: var(--dp-space-3);
  }
}
</style>
