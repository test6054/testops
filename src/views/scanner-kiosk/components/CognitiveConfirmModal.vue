<script setup lang="ts">
import type { ScanDispatchTicketVO } from '@/apis/mark/scanner-dispatch'
import type { PortfolioCollectModeCode } from '@/types/enums/portfolio-collect-mode-enum'
import { computed, onUnmounted, ref, watch } from 'vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import { PortfolioCollectModeDescription } from '@/types/enums/portfolio-collect-mode-enum'
import { ScanTaskKindCode } from '@/types/enums/scan-task-kind-enum'
import { isScannerKioskBrowserPage } from '@/utils/kiosk-auth'

const props = defineProps<{
  open: boolean
  ticket: ScanDispatchTicketVO | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  "confirm": []
  "cancel": []
}>()

function portfolioCollectModeLabel(value: PortfolioCollectModeCode | undefined): string {
  if (!value) {
    throw new Error(`档案袋采集模式缺少展示映射：${String(value)}`)
  }
  return PortfolioCollectModeDescription[value]
}

const previewUrl = ref('')
const previewLoading = ref(false)
const previewError = ref(false)
let previewObjectUrl = ''

const isPortfolio = computed(() => props.ticket?.taskKind === ScanTaskKindCode.PORTFOLIO_COLLECT)
const cabinetLocation = computed(
  () => props.ticket?.archiveSnapshot?.physicalStorageLocation?.trim() ?? '',
)
const hasCabinet = computed(() => cabinetLocation.value.length > 0)
const hasMaterialType = computed(() => Boolean(props.ticket?.archiveSnapshot?.materialType))
const previewFileId = computed(() => props.ticket?.archiveSnapshot?.previewFileId?.trim() ?? '')
const portfolioSnapshot = computed(() => props.ticket?.portfolioSnapshot)
const hasPortfolioTeacher = computed(() => Boolean(portfolioSnapshot.value?.teacherId))
const canConfirm = computed(() => {
  if (isPortfolio.value) {
    return hasPortfolioTeacher.value && Boolean(portfolioSnapshot.value?.collectMode)
  }
  return hasCabinet.value && hasMaterialType.value
})

function revokePreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = ''
  }
  previewUrl.value = ''
}

async function loadPreview() {
  revokePreviewUrl()
  previewError.value = false
  const fileId = previewFileId.value
  if (!fileId || isPortfolio.value || isScannerKioskBrowserPage()) {
    return
  }
  previewLoading.value = true
  try {
    const { getImageBlobUrl } = await import('@/apis/edu/file-management')
    previewObjectUrl = await getImageBlobUrl(fileId)
    previewUrl.value = previewObjectUrl
  } catch {
    previewError.value = true
  } finally {
    previewLoading.value = false
  }
}

watch(
  () => ({ open: props.open, previewFileId: previewFileId.value }),
  (previewState) => {
    if (previewState.open) {
      void loadPreview()
    } else {
      revokePreviewUrl()
      previewError.value = false
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  revokePreviewUrl()
})

function handleOk() {
  if (!canConfirm.value) {
    return
  }
  emit('confirm')
}
</script>

<template>
  <a-modal
    :open="open"
    title="认知确认"
    :confirm-loading="loading"
    ok-text="确认并开始扫描"
    cancel-text="取消"
    :ok-button-props="{ disabled: !canConfirm }"
    @update:open="emit('update:open', $event)"
    @ok="handleOk"
    @cancel="emit('cancel')"
  >
    <div v-if="isPortfolio && portfolioSnapshot" class="cognitive-confirm">
      <p class="cognitive-confirm__lead">请核对教师与补采任务后再进纸</p>
      <dl class="cognitive-confirm__facts">
        <div>
          <dt>教师</dt>
          <dd>{{ portfolioSnapshot.teacherName || portfolioSnapshot.teacherId || '—' }}</dd>
        </div>
        <div>
          <dt>分类</dt>
          <dd>{{ portfolioSnapshot.categoryName || portfolioSnapshot.categoryId || '—' }}</dd>
        </div>
        <div>
          <dt>任务</dt>
          <dd>{{ portfolioSnapshot.gapTaskTitle || portfolioSnapshot.taskType || '—' }}</dd>
        </div>
        <div>
          <dt>模式</dt>
          <dd>
            {{ portfolioCollectModeLabel(portfolioSnapshot.collectMode) }}
          </dd>
        </div>
        <div>
          <dt>追溯码</dt>
          <dd>{{ ticket?.traceLabelCode || '—' }}</dd>
        </div>
      </dl>
      <UiButton size="sm" variant="ghost" disabled>无条码门禁 · 屏显确认</UiButton>
    </div>
    <div v-else-if="ticket?.archiveSnapshot" class="cognitive-confirm">
      <p class="cognitive-confirm__lead">请核对柜位与卷信息后再进纸</p>
      <p v-if="!hasCabinet" class="cognitive-confirm__blocker">
        缺少档案柜位，无法进纸。请返回 PC 端补录柜位后重新派单。
      </p>
      <p v-else-if="!hasMaterialType" class="cognitive-confirm__blocker">
        缺少扫描材料类型，无法进纸。请取消派单后重新创建。
      </p>
      <div class="cognitive-confirm__preview">
        <p class="cognitive-confirm__preview-label">材料预览</p>
        <a-skeleton v-if="previewLoading" active :paragraph="false" />
        <img
          v-else-if="previewUrl"
          :src="previewUrl"
          alt="归档材料预览"
          class="cognitive-confirm__thumb"
        />
        <p v-else-if="previewError" class="cognitive-confirm__preview-empty">预览加载失败</p>
        <p v-else class="cognitive-confirm__preview-empty">暂无可预览材料</p>
      </div>
      <dl class="cognitive-confirm__facts">
        <div>
          <dt>卷名</dt>
          <dd>{{ ticket.archiveSnapshot.archiveTitle || '—' }}</dd>
        </div>
        <div>
          <dt>班级</dt>
          <dd>{{ ticket.archiveSnapshot.teachingClassName || '—' }}</dd>
        </div>
        <div>
          <dt>柜位</dt>
          <dd>{{ cabinetLocation || '—' }}</dd>
        </div>
        <div v-if="ticket.archiveSnapshot.physicalLocationNote">
          <dt>说明</dt>
          <dd>{{ ticket.archiveSnapshot.physicalLocationNote }}</dd>
        </div>
        <div>
          <dt>追溯码</dt>
          <dd>{{ ticket.traceLabelCode || '—' }}</dd>
        </div>
      </dl>
      <UiButton size="sm" variant="ghost" disabled>无条码门禁 · 屏显确认</UiButton>
    </div>
  </a-modal>
</template>

<style scoped>
.cognitive-confirm__lead {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--nybc-text-secondary, #595959);
}
.cognitive-confirm__blocker {
  margin: 0 0 12px;
  font-size: 14px;
  color: #dc2626;
}
.cognitive-confirm__preview {
  margin-bottom: 12px;
}
.cognitive-confirm__preview-label {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
.cognitive-confirm__thumb {
  display: block;
  max-width: 100%;
  max-height: 160px;
  border: 1px solid var(--nybc-border, #f0f0f0);
  border-radius: 4px;
  object-fit: contain;
}
.cognitive-confirm__preview-empty {
  margin: 0;
  font-size: 13px;
  color: var(--nybc-text-secondary, #8c8c8c);
}
.cognitive-confirm__facts {
  margin: 0 0 12px;
  display: grid;
  gap: 8px;
}
.cognitive-confirm__facts div {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px;
  font-size: 14px;
}
.cognitive-confirm__facts dt {
  margin: 0;
  color: var(--nybc-text-secondary, #8c8c8c);
}
.cognitive-confirm__facts dd {
  margin: 0;
  font-weight: 500;
}
</style>
