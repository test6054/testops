<template>
  <div class="archive-volume-history-import">
    <p class="archive-volume-history-import__hint">
      上传 Excel 批量补录历史纸质档案卷。请先下载模板，按格式填写后导入。
    </p>
    <UiFormActions align="between">
      <UiButton size="sm" variant="outline" @click="importModalOpen = true">
        Excel 历史补录
      </UiButton>
    </UiFormActions>
    <UiAlertStrip
      v-if="lastResult"
      :tone="resultTone(lastResult.batchStatus)"
      :title="`批次 ${lastResult.batchNo}`"
      :description="resultDescription(lastResult)"
      dense
      class="archive-volume-history-import__result"
    />
    <UiPlatformExcelImportModal
      v-model:open="importModalOpen"
      :scene-key="ExcelImportSceneKey.MARK_PAPER_ARCHIVE_HISTORY"
      entity-label="历史纸质档案"
      @success="handleImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  ArchiveExternalImportResultVO,
  ArchiveImportBatchStatusCode,
} from '@/apis/mark/archive-volume'
import type { ExcelImportResult } from '@/apis/platform/types'
import type { UiAlertStripTone } from '@/components/ui-guide/ui/types'
import { ref } from 'vue'
import { ARCHIVE_IMPORT_BATCH_STATUS_LABEL } from '@/apis/mark/archive-volume'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiFormActions from '@/components/ui-guide/ui/UiFormActions.vue'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeHistoryImportPanel' })

const importModalOpen = ref(false)
const lastResult = ref<ArchiveExternalImportResultVO | null>(null)
const lastFailureSummaries = ref<string[]>([])

function resultTone(status: ArchiveImportBatchStatusCode): UiAlertStripTone {
  if (status === 'SUCCESS') {
    return 'success'
  }
  if (status === 'PARTIAL_FAILED') {
    return 'warning'
  }
  return 'danger'
}

function resultDescription(result: ArchiveExternalImportResultVO): string {
  const statusLabel = strictEnumLabel(
    ARCHIVE_IMPORT_BATCH_STATUS_LABEL,
    result.batchStatus,
    '归档导入批次状态',
  )
  let text = `${statusLabel}：成功 ${result.successCount} 条，失败 ${result.failureCount} 条，共 ${result.totalCount} 条`
  if (lastFailureSummaries.value.length > 0) {
    text += `；${lastFailureSummaries.value.join('；')}`
  }
  return text
}

function handleImportSuccess(result: ExcelImportResult): void {
  if (!result.batchId) {
    return
  }
  lastResult.value = {
    batchId: result.batchId,
    batchNo: result.batchNo ?? result.batchId,
    batchStatus: (result.batchStatus ?? 'SUCCESS') as ArchiveImportBatchStatusCode,
    totalCount: result.totalRows ?? 0,
    successCount: result.successRows ?? 0,
    failureCount: result.errorRows ?? 0,
  }
  lastFailureSummaries.value = (result.diagnostics ?? [])
    .filter(row => row.valid === false)
    .map(row => `第 ${row.rowIndex} 行：${row.invalidReason ?? '导入失败'}`)
}
</script>

<style scoped lang="scss">
.archive-volume-history-import {
  &__hint {
    margin: 0 0 12px;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }

  &__result {
    margin-top: 12px;
  }
}
</style>
