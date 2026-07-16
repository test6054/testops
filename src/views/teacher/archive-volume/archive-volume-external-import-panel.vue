<template>
  <WorkbenchSurfaceCard flush class="archive-volume-external-import">
    <template #head>
      <div class="archive-volume-external-import__section-head">
        <h3 class="archive-volume-external-import__section-title">外部表格文件批量导入</h3>
        <p class="archive-volume-external-import__section-subtitle">
          教务系统等外部来源 · 批量创建归档任务并登记材料
        </p>
      </div>
    </template>
    <template #toolbar>
      <UiButton size="sm" variant="outline" @click="openImportModal"> 表格文件批量导入 </UiButton>
    </template>
    <UiAlertStrip
      tone="info"
      title="导入流程"
      description="填写来源系统后下载导入模板。同一归档卷包含多份材料时，各行填写相同的「同卷标识」；系统按归档卷校验并导入，任一材料失败时整卷不入库。"
      dense
      class="archive-volume-external-import__flow"
    />
    <a-form layout="vertical" class="archive-volume-external-import__form">
      <div class="archive-volume-external-import__grid">
        <a-form-item label="来源系统" required>
          <a-input
            v-model:value="form.sourceSystem"
            placeholder="如 TEACHING_AFFAIRS"
            @change="sourceSystemError = ''"
          />
        </a-form-item>
        <a-form-item label="导入类型" required>
          <a-select v-model:value="form.importType" :options="importTypeOptions" disabled />
        </a-form-item>
      </div>
    </a-form>
    <UiAlertStrip
      v-if="sourceSystemError"
      tone="error"
      class="archive-volume-external-import__error"
      :title="sourceSystemError"
    />
    <UiAlertStrip
      v-if="lastResult"
      :tone="archiveImportResultTone(lastResult.batchStatus)"
      :title="`批次 ${lastResult.batchNo}`"
      :description="buildArchiveImportResultDescription(lastResult, lastFailureSummaries)"
      dense
      class="archive-volume-external-import__result"
    />
    <UiPlatformExcelImportModal
      v-model:open="importModalOpen"
      :scene-key="ExcelImportSceneKey.MARK_ARCHIVE_EXTERNAL"
      entity-label="归档任务外部数据"
      :context="importContext"
      :requirements="importRequirements"
      @success="handleImportSuccess"
    />
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type { ArchiveExternalImportResultVO } from '@/apis/mark/archive-volume'
import type { ExcelImportResult } from '@/apis/platform/types'
import { computed, ref } from 'vue'
import {
  ArchiveExternalImportTypeCode,
  ArchiveExternalImportTypeDescription,
} from '@/apis/mark/archive-volume'
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
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveVolumeExternalImportPanel' })

const emit = defineEmits<{
  imported: []
}>()

const importModalOpen = ref(false)
const sourceSystemError = ref('')
const lastResult = ref<ArchiveExternalImportResultVO | null>(null)
const lastFailureSummaries = ref<string[]>([])

const form = ref({
  sourceSystem: '',
  importType: ArchiveExternalImportTypeCode.VOLUME_MATERIAL,
})

const importTypeOptions = [
  {
    value: ArchiveExternalImportTypeCode.VOLUME_MATERIAL,
    label: strictEnumLabel(
      ArchiveExternalImportTypeDescription,
      ArchiveExternalImportTypeCode.VOLUME_MATERIAL,
      '归档外部导入类型',
    ),
  },
]

const importRequirements = [
  '「院系ID」必填；院系名称和教学班名称由系统根据编号核验并写入。',
  '同一归档卷的多行材料须填写相同的「同卷标识」，且学年、课程、院系、模板、密级和保管期限保持一致。',
  '系统按归档卷整组导入；组内任一材料校验失败时，不创建该卷及其材料，并清理本次临时文件。',
]

const importContext = computed(() => ({
  sourceSystem: form.value.sourceSystem.trim(),
  importType: form.value.importType,
}))

function openImportModal(): void {
  if (!form.value.sourceSystem.trim()) {
    sourceSystemError.value = '请先填写来源系统后再导入'
    return
  }
  sourceSystemError.value = ''
  importModalOpen.value = true
}

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
.archive-volume-external-import {
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

  &__form {
    margin-top: var(--dp-space-3);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 var(--dp-space-3);
  }

  &__error {
    margin-top: var(--dp-space-2);
  }

  &__result {
    margin-top: var(--dp-space-3);
  }
}

@media (max-width: 520px) {
  .archive-volume-external-import__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
