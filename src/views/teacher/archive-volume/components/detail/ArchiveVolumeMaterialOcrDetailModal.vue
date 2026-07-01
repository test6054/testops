<template>
  <a-modal v-model:open="open" title="文档 OCR 详情" width="720px" :footer="null" destroy-on-close>
    <a-spin :spinning="loading">
      <template v-if="detail">
        <div class="archive-ocr-detail__meta">
          <span>任务状态：{{ taskStatusLabel(detail.taskStatus) }}</span>
          <span v-if="detail.pageRange">页范围：{{ detail.pageRange }}</span>
          <span v-if="detail.ocrProvider">供应商：{{ detail.ocrProvider }}</span>
        </div>
        <p v-if="detail.taskDiagnostic" class="archive-ocr-detail__diagnostic">
          {{ detail.taskDiagnostic }}
        </p>
        <a-tabs v-if="detail.pages?.length">
          <a-tab-pane
            v-for="page in detail.pages"
            :key="`${page.pageNo}-${page.pageResultId}`"
            :tab="`第 ${page.pageNo} 页`"
          >
            <UiTag size="sm" :tone="pageStatusTone(page.status)">{{
              pageStatusLabel(page.status)
            }}</UiTag>
            <p v-if="page.diagnostic" class="archive-ocr-detail__page-diagnostic">
              {{ page.diagnostic }}
            </p>
            <pre class="archive-ocr-detail__text">{{
              page.recognizedText || '（无识别文本）'
            }}</pre>
          </a-tab-pane>
        </a-tabs>
        <pre v-else-if="detail.fullText" class="archive-ocr-detail__text">{{
          detail.fullText
        }}</pre>
        <p v-else class="archive-ocr-detail__empty">暂无 OCR 页级证据</p>
      </template>
      <p v-else-if="!loading" class="archive-ocr-detail__empty">该材料未绑定文档采集 OCR</p>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import type {
  DocumentMaterialOcrDetailVO,
  DocumentOcrPageResultStatusCode,
  DocumentOcrTaskStatusCode,
} from '@/apis/mark/archive-volume'
import {
  DOCUMENT_OCR_PAGE_RESULT_STATUS_LABEL,
  getArchiveMaterialDocumentOcrDetail,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { ref, watch } from 'vue'
import { PAPER_ARCHIVE_OCR_STATUS_LABEL } from '@/apis/mark/paper-archive'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  materialId?: string
}>()

const loading = ref(false)
const detail = ref<DocumentMaterialOcrDetailVO | null>(null)

watch(
  [open, () => props.materialId],
  async ([visible, materialId]) => {
    if (!visible || !materialId) {
      detail.value = null
      return
    }
    loading.value = true
    try {
      detail.value = await getArchiveMaterialDocumentOcrDetail(materialId)
    } catch (error) {
      detail.value = null
      showUserError(error, '加载 OCR 详情失败')
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

function taskStatusLabel(code?: DocumentOcrTaskStatusCode) {
  if (!code) return '—'
  return strictEnumLabel(PAPER_ARCHIVE_OCR_STATUS_LABEL, code, 'taskStatus')
}

function pageStatusLabel(code?: DocumentOcrPageResultStatusCode) {
  if (!code) return '—'
  return strictEnumLabel(DOCUMENT_OCR_PAGE_RESULT_STATUS_LABEL, code, 'pageOcrStatus')
}

function pageStatusTone(code?: DocumentOcrPageResultStatusCode): BadgeTone {
  if (!code) return 'gray'
  if (code === 'COMPLETED') return 'green'
  if (code === 'SKIPPED') return 'gray'
  return 'red'
}
</script>

<style scoped>
.archive-ocr-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--nybc-text-secondary, #666);
}
.archive-ocr-detail__diagnostic,
.archive-ocr-detail__page-diagnostic {
  margin: 8px 0;
  color: var(--nybc-danger, #cf1322);
  font-size: 13px;
}
.archive-ocr-detail__text {
  margin-top: 12px;
  padding: 12px;
  background: var(--nybc-bg-subtle, #fafafa);
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 360px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
}
.archive-ocr-detail__empty {
  margin: 16px 0;
  color: var(--nybc-text-secondary, #666);
  font-size: 13px;
}
</style>
