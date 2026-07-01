<template>
  <div class="archive-volume-external-import">
    <p class="archive-volume-external-import__hint">
      上传 Excel 批量建卷并登记材料。请先下载模板，按「导入数据」表填写后上传。
    </p>
    <a-form layout="vertical">
      <a-form-item label="来源系统" required>
        <a-input
          v-model:value="form.sourceSystem"
          placeholder="如 TEACHING_AFFAIRS / HISTORY_BACKFILL"
        />
      </a-form-item>
      <a-form-item label="导入类型" required>
        <a-select
          v-model:value="form.importType"
          :options="importTypeOptions"
          disabled
          style="width: 100%"
        />
      </a-form-item>
    </a-form>
    <UiFormActions align="between">
      <UiButton
        size="sm"
        variant="outline"
        :disabled="!form.sourceSystem.trim()"
        @click="importModalOpen = true"
      >
        Excel 批量导入
      </UiButton>
    </UiFormActions>
    <UiAlertStrip
      v-if="lastResult"
      :tone="resultTone(lastResult.batchStatus)"
      :title="`批次 ${lastResult.batchNo}`"
      :description="resultDescription(lastResult)"
      dense
      class="archive-volume-external-import__result"
    />
    <UiPlatformExcelImportModal
      v-model:open="importModalOpen"
      :scene-key="ExcelImportSceneKey.MARK_ARCHIVE_EXTERNAL"
      entity-label="归档卷外部数据"
      :context="importContext"
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
import { computed, ref } from 'vue'
import {
  ARCHIVE_EXTERNAL_IMPORT_TYPE_LABEL,
  ARCHIVE_IMPORT_BATCH_STATUS_LABEL,
} from '@/apis/mark/archive-volume'
import { ExcelImportSceneKey } from '@/apis/platform/scene-keys'
import UiPlatformExcelImportModal from '@/components/platform/UiPlatformExcelImportModal.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiFormActions from '@/components/ui-guide/ui/UiFormActions.vue'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeExternalImportPanel' })

const importModalOpen = ref(false)
const lastResult = ref<ArchiveExternalImportResultVO | null>(null)
const lastFailureSummaries = ref<string[]>([])

const form = ref({
  sourceSystem: '',
  importType: 'VOLUME_MATERIAL',
})

const importTypeOptions = [
  {
    value: 'VOLUME_MATERIAL',
    label: strictEnumLabel(
      ARCHIVE_EXTERNAL_IMPORT_TYPE_LABEL,
      'VOLUME_MATERIAL',
      '归档外部导入类型',
    ),
  },
]

const importContext = computed(() => ({
  sourceSystem: form.value.sourceSystem.trim(),
  importType: form.value.importType,
}))

function handleImportSuccess(result: ExcelImportResult) {
  importModalOpen.value = false
  lastResult.value = {
    batchId: result.batchId ?? '',
    batchNo: result.batchNo ?? '',
    batchStatus: (result.batchStatus ?? 'SUCCESS') as ArchiveImportBatchStatusCode,
    totalCount: result.totalRows ?? 0,
    successCount: result.successRows ?? 0,
    failureCount: result.errorRows ?? 0,
  }
  lastFailureSummaries.value = (result.diagnostics ?? [])
    .filter((row) => !row.valid)
    .map((row) => `第 ${row.rowIndex} 行：${row.invalidReason ?? '导入失败'}`)
}

function resultTone(status: ArchiveImportBatchStatusCode): UiAlertStripTone {
  if (status === 'SUCCESS') {
    return 'success'
  }
  if (status === 'PARTIAL_FAILED') {
    return 'warning'
  }
  return 'error'
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
</script>

<style scoped lang="scss">
.archive-volume-external-import {
  &__hint {
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--dp-text-secondary);
  }

  &__result {
    margin-top: 12px;
  }
}
</style>
