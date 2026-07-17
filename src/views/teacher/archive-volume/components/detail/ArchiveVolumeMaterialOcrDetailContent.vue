<template>
  <UiAlertStrip v-if="loadError" tone="error" title="文字识别详情加载失败">
    <template #actions>
      <UiButton size="sm" variant="outline" :loading="loading" @click="loadDetail">
        重新加载
      </UiButton>
    </template>
  </UiAlertStrip>
  <UiSkeletonState v-if="loading && !detail" variant="card" compact />
  <template v-else-if="detail">
    <div class="archive-ocr-detail__meta">
      <span>任务状态：{{ taskStatusLabel(detail.taskStatus) }}</span>
      <span v-if="detail.pageRange">页范围：{{ detail.pageRange }}</span>
      <span v-if="detail.ocrProvider">供应商：{{ detail.ocrProvider }}</span>
    </div>
    <p v-if="detail.taskDiagnostic" class="archive-ocr-detail__diagnostic">
      {{ detail.taskDiagnostic }}
    </p>
    <template v-if="detail.pages?.length">
      <UiSectionTabs
        v-model="activePageKey"
        :items="pageTabItems"
        compact
        divided
      />
      <template v-if="activePage">
        <UiTag size="sm" :tone="pageStatusTone(activePage.status)">
          {{ pageStatusLabel(activePage.status) }}
        </UiTag>
        <p v-if="activePage.diagnostic" class="archive-ocr-detail__page-diagnostic">
          {{ activePage.diagnostic }}
        </p>
        <pre class="archive-ocr-detail__text">{{
          activePage.recognizedText || '（无识别文本）'
        }}</pre>
      </template>
    </template>
    <pre v-else-if="detail.fullText" class="archive-ocr-detail__text">{{
        detail.fullText
    }}</pre>
    <p v-else class="archive-ocr-detail__empty">暂无文字识别页级证据</p>
  </template>
  <p v-else class="archive-ocr-detail__empty">暂无文字识别内容</p>
</template>

<script setup lang="ts">
import type {
  DocumentMaterialOcrDetailResponse,
  DocumentOcrPageResultStatusCode,
  DocumentOcrTaskStatusCode,
} from '@/apis/mark/archive-volume'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { computed, ref, watch } from 'vue'
import {
  DocumentOcrPageResultStatusDescription,
  DocumentOcrTaskStatusDescription,
  getArchiveMaterialDocumentOcrDetail,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const props = defineProps<{
  materialId?: string
  initialPageNo?: number
}>()

const loading = ref(false)
const loadError = ref(false)
const detail = ref<DocumentMaterialOcrDetailResponse | null>(null)
const activePageKey = ref<string>()
const pageTabItems = computed(() => {
  const pages = detail.value?.pages ?? []
  return pages.map((page) => ({
    key: pageTabKey(page.pageNo),
    label: `第 ${page.pageNo} 页`,
  }))
})
const activePage = computed(() => {
  const pages = detail.value?.pages ?? []
  if (!pages.length) return null
  const key = activePageKey.value
  return pages.find((page) => pageTabKey(page.pageNo) === key) ?? pages[0] ?? null
})
let requestSequence = 0

watch(
  () => props.materialId,
  (materialId) => {
    requestSequence += 1
    detail.value = null
    loadError.value = false
    activePageKey.value = undefined
    if (!materialId) {
      return
    }
    void loadDetail()
  },
  { immediate: true },
)

watch(
  () => props.initialPageNo,
  () => {
    syncActivePageKey()
  },
)

async function loadDetail(): Promise<void> {
  const materialId = props.materialId
  if (!materialId) return
  const currentSequence = ++requestSequence
  loading.value = true
  loadError.value = false
  try {
    const response = await getArchiveMaterialDocumentOcrDetail(materialId)
    if (currentSequence !== requestSequence || materialId !== props.materialId) return
    detail.value = response
    syncActivePageKey()
  } catch (error) {
    if (currentSequence !== requestSequence || materialId !== props.materialId) return
    loadError.value = true
    showUserError(error, '加载文字识别详情失败')
  } finally {
    if (currentSequence === requestSequence) {
      loading.value = false
    }
  }
}

function pageTabKey(pageNo?: number): string {
  return pageNo == null ? 'unknown' : String(pageNo)
}

function syncActivePageKey() {
  const pages = detail.value?.pages
  if (!pages?.length) {
    activePageKey.value = undefined
    return
  }
  const target = props.initialPageNo
  if (target != null && pages.some((page) => page.pageNo === target)) {
    activePageKey.value = pageTabKey(target)
    return
  }
  activePageKey.value = pageTabKey(pages[0]?.pageNo)
}

function taskStatusLabel(code?: DocumentOcrTaskStatusCode) {
  if (!code) return '—'
  return strictEnumLabel(DocumentOcrTaskStatusDescription, code, 'taskStatus')
}

function pageStatusLabel(code?: DocumentOcrPageResultStatusCode) {
  if (!code) return '—'
  return strictEnumLabel(DocumentOcrPageResultStatusDescription, code, 'pageOcrStatus')
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
  gap: var(--dp-space-3, 12px);
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--dp-text-secondary);
}
.archive-ocr-detail__diagnostic,
.archive-ocr-detail__page-diagnostic {
  margin: 8px 0;
  color: var(--dp-danger);
  font-size: 13px;
}
.archive-ocr-detail__text {
  margin-top: 12px;
  padding: 12px;
  background: var(--dp-bg-subtle);
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
  color: var(--dp-text-secondary);
  font-size: 13px;
}
</style>
