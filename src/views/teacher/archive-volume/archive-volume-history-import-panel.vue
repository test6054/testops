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
        表格文件批量导入
      </UiButton>
    </template>
    <UiAlertStrip
      tone="info"
      title="导入流程"
      description="下载导入模板后按归档卷填写。同一归档卷包含多份材料时，各行填写相同的「同卷标识」；任一材料失败时整卷不入库。"
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
      :requirements="importRequirements"
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
const importRequirements = [
  '「院系ID」必填；院系名称和教学班名称由系统根据编号核验并写入。',
  '同一归档卷的多行材料须填写相同的「同卷标识」，卷级信息保持一致；非永久保管时须填写「保管年限」。',
  '系统按归档卷整组导入；组内任一材料校验失败时，不创建该卷及其材料，并清理本次临时文件。',
]

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
