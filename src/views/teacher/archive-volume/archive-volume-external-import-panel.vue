<template>
  <WorkbenchSurfaceCard flush class="archive-volume-external-import">
    <template #head>
      <div class="archive-volume-external-import__section-head">
        <h3 class="archive-volume-external-import__section-title">外部 Excel 批量建卷</h3>
        <p class="archive-volume-external-import__section-subtitle">
          教务系统等外部来源 · 批量建卷并登记材料
        </p>
      </div>
    </template>
    <template #toolbar>
      <UiButton size="sm" variant="outline" @click="openImportModal">
        Excel 批量导入
      </UiButton>
    </template>
    <UiAlertStrip
      tone="info"
      title="导入流程"
      description="1. 填写来源系统（导入上下文 sourceSystem）；2. 确认导入类型为卷宗材料（VOLUME_MATERIAL）；3. 下载 MARK_ARCHIVE_EXTERNAL 模板，按「导入数据」表填写；4. 上传 Excel，平台返回批次号与成功/失败条数。"
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
          <a-select
            v-model:value="form.importType"
            :options="importTypeOptions"
            disabled
          />
        </a-form-item>
      </div>
    </a-form>
    <a-alert
      v-if="sourceSystemError"
      type="error"
      show-icon
      class="archive-volume-external-import__error"
      :message="sourceSystemError"
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
      entity-label="归档卷外部数据"
      :context="importContext"
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
    margin-top: var(--dp-space-2, 8px);
  }

  &__form {
    margin-top: var(--dp-space-3, 12px);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 var(--dp-space-3, 12px);
  }

  &__error {
    margin-top: var(--dp-space-2, 8px);
  }

  &__result {
    margin-top: var(--dp-space-3, 12px);
  }
}

@media (max-width: 520px) {
  .archive-volume-external-import__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
