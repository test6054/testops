<template>
  <WorkbenchSurfaceCard flush class="archive-volume-ocr-search">
    <template #head>
      <div class="archive-volume-ocr-search__head">
        <div class="archive-volume-ocr-search__head-main">
          <span class="archive-volume-ocr-search__title">卷内内容检索</span>
          <span class="archive-volume-ocr-search__hint">卷内 OCR 全文检索 · 可跳转全局检索</span>
        </div>
        <UiButton variant="ghost" size="sm" @click="goGlobalSearch">
          全局检索
        </UiButton>
      </div>
    </template>

    <div class="archive-volume-ocr-search__toolbar">
      <a-input
        v-model:value="keyword"
        allow-clear
        placeholder="搜索本卷 OCR 全文：答卷内容、标准答案、分析报告..."
        @press-enter="handleSearch"
      />
      <UiButton variant="primary" size="sm" :loading="loading" @click="handleSearch">
        检索
      </UiButton>
    </div>

    <div v-if="quickKeywords.length" class="archive-volume-ocr-search__quick">
      <span class="archive-volume-ocr-search__quick-label">快捷</span>
      <UiTextAction
        v-for="item in quickKeywords"
        :key="item"
        tone="primary"
        @click="applyQuickKeyword(item)"
      >
        {{ item }}
      </UiTextAction>
    </div>

    <div v-if="searched" class="archive-volume-ocr-search__results">
      <p class="archive-volume-ocr-search__result-meta">
        {{ pagination.total }} 条匹配 · 当前归档卷
      </p>
      <UiEmpty
        v-if="!loading && hits.length === 0"
        description="本卷无匹配结果"
      >
        <UiTextAction tone="primary" @click="goGlobalSearch">切换全局检索</UiTextAction>
      </UiEmpty>
      <ul v-else class="archive-volume-ocr-search__hit-list">
        <li
          v-for="record in hits"
          :key="`${record.materialId}-${record.snippet}`"
          class="archive-volume-ocr-search__hit-item"
        >
          <div class="archive-volume-ocr-search__hit-head">
            <UiTag tone="gray" size="sm">{{ materialTypeLabel(record.materialType) }}</UiTag>
            <span class="archive-volume-ocr-search__file-name">{{ record.fileName || '—' }}</span>
            <span v-if="record.studentNo" class="archive-volume-ocr-search__student">
              {{ record.studentNo }} {{ record.studentName }}
            </span>
            <span v-if="record.matchPageNo" class="archive-volume-ocr-search__page-no">
              P{{ record.matchPageNo }}
            </span>
          </div>
          <div
            v-if="record.snippet"
            class="archive-search-snippet-block"
            v-html="highlightSnippet(record.snippet)"
          />
          <div class="archive-volume-ocr-search__hit-actions">
            <UiTextAction tone="primary" @click="emit('navigate-materials')">
              定位材料
            </UiTextAction>
            <UiTextAction
              v-if="canViewMaterialOcr(record)"
              tone="primary"
              @click="openMaterialOcrPreview(record)"
            >
              {{ record.matchPageNo ? `预览第 ${record.matchPageNo} 页原文` : '预览原文' }}
            </UiTextAction>
            <UiTextAction
              v-if="canViewMaterialOcr(record)"
              tone="primary"
              @click="openMaterialOcr(record.materialId)"
            >
              查看 OCR
            </UiTextAction>
          </div>
        </li>
      </ul>
      <div v-if="pagination.total > pagination.pageSize" class="archive-volume-ocr-search__pager">
        <a-pagination
          v-model:current="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          size="small"
          show-size-changer
          @change="loadHits"
        />
      </div>
    </div>

    <div v-else class="archive-volume-ocr-search__empty">
      <UiEmpty description="输入关键词搜索本卷所有 OCR 识别文本" />
      <div class="archive-volume-ocr-search__overview-head">
        <span class="archive-volume-ocr-search__overview-title">材料 OCR 状态</span>
        <UiButton
          v-if="canRegisterMaterial && pendingOcrMaterials.length > 0"
          size="sm"
          variant="ghost"
          :loading="batchOcrSubmitting"
          @click="handleBatchOcr"
        >
          批量 OCR
        </UiButton>
      </div>
      <UiDataTable
        pagination-mode="none"
        :columns="overviewColumns"
        :data-source="ocrMaterials"
        :show-pagination="false"
        flat
        row-key="materialId"
        size="middle"
        empty-description="暂无可检索材料"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'materialType'">
            {{ materialTypeLabel(record.materialType) }}
          </template>
          <template v-else-if="column.key === 'ocrStatus'">
            <UiTag
              v-if="record.ocrStatus"
              :tone="materialOcrStatusTone(record.ocrStatus)"
              size="sm"
            >
              {{ materialOcrStatusLabel(record.ocrStatus) }}
            </UiTag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTextAction
              v-if="canViewMaterialOcrMaterial(record)"
              tone="primary"
              @click="openMaterialOcr(record.materialId)"
            >
              查看文本
            </UiTextAction>
            <UiTextAction
              v-else-if="canTriggerMaterialOcr(record)"
              tone="primary"
              @click="confirmTriggerOcr(record)"
            >
              触发 OCR
            </UiTextAction>
            <span v-else class="archive-volume-ocr-search__muted">—</span>
          </template>
        </template>
      </UiDataTable>
    </div>

    <ArchiveVolumeMaterialOcrDetailModal
      v-model:open="ocrDetailOpen"
      :material-id="ocrDetailMaterialId"
      :initial-page-no="ocrDetailInitialPageNo"
    />
  </WorkbenchSurfaceCard>
</template>

<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {ArchiveMaterialOcrStatusCode} from '@/apis/mark/archive-ocr-status';
import type {
  ArchiveVolumeMaterialResponse,
  ArchiveVolumeSearchResponse,
} from '@/apis/mark/archive-volume'
import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_MATERIAL_OCR_STATUS_TONE,
  
  ArchiveMaterialOcrStatusDescription
} from '@/apis/mark/archive-ocr-status'
import {
  ArchiveMaterialTypeCode,
  ArchiveMaterialTypeDescription,
  searchArchiveVolumes,
  triggerArchiveVolumeMaterialOcr,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { highlightArchiveSearchSnippet } from '@/utils/archive-search-snippet'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeMaterialOcrDetailModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailModal.vue'

defineOptions({ name: 'ArchiveVolumeOcrSearchPanel' })

const props = defineProps<{
  volumeId: string
  materials: ArchiveVolumeMaterialResponse[]
  canRegisterMaterial: boolean
}>()

const emit = defineEmits<{
  "refreshed": [options?: { silent?: boolean }]
  'navigate-materials': []
}>()

const SEARCHABLE_MATERIAL_TYPES: ArchiveMaterialTypeCode[] = [
  ArchiveMaterialTypeCode.STUDENT_EXAM_PAPER,
  ArchiveMaterialTypeCode.ANSWER_SHEET,
  ArchiveMaterialTypeCode.ANSWER_RUBRIC_A,
  ArchiveMaterialTypeCode.ANSWER_RUBRIC_B,
  ArchiveMaterialTypeCode.EXAM_ANALYSIS,
  ArchiveMaterialTypeCode.BLANK_EXAM_PAPER_A,
  ArchiveMaterialTypeCode.BLANK_EXAM_PAPER_B,
]

const router = useRouter()
const keyword = ref('')
const loading = ref(false)
const batchOcrSubmitting = ref(false)
const searched = ref(false)
const hits = ref<ArchiveVolumeSearchResponse[]>([])
const pagination = reactive({ pageNum: 1, pageSize: 10, total: 0 })
const ocrDetailOpen = ref(false)
const ocrDetailMaterialId = ref('')
const ocrDetailInitialPageNo = ref<number>()

const quickKeywords = ['水准测量', '高程计算', '评分标准', '达成度']

const overviewColumns: ColumnsType<ArchiveVolumeMaterialResponse> = [
  { title: '材料', dataIndex: 'fileName', key: 'fileName', width: 220 },
  { title: '类型', key: 'materialType', width: 120 },
  { title: 'OCR 状态', key: 'ocrStatus', width: 120 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' },
]

const ocrMaterials = computed(() =>
  props.materials.filter(
    (item) => Boolean(item.fileId) && SEARCHABLE_MATERIAL_TYPES.includes(item.materialType),
  ),
)

const pendingOcrMaterials = computed(() =>
  ocrMaterials.value.filter((item) => canTriggerMaterialOcr(item)),
)

function materialTypeLabel(code: ArchiveVolumeMaterialResponse['materialType']) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function materialOcrStatusLabel(code: ArchiveMaterialOcrStatusCode) {
  return strictEnumLabel(ArchiveMaterialOcrStatusDescription, code, 'ocrStatus')
}

function materialOcrStatusTone(code: ArchiveMaterialOcrStatusCode) {
  return strictEnumTone(ARCHIVE_MATERIAL_OCR_STATUS_TONE, code, 'ocrStatus')
}

function highlightSnippet(snippet: string): string {
  return highlightArchiveSearchSnippet(snippet, keyword.value)
}

function canViewMaterialOcr(record: ArchiveVolumeSearchResponse): boolean {
  return record.ocrStatus === 'COMPLETED'
    || record.ocrStatus === 'FAILED'
    || record.ocrStatus === 'RUNNING'
}

function canViewMaterialOcrMaterial(record: ArchiveVolumeMaterialResponse): boolean {
  return record.ocrStatus === 'COMPLETED'
    || record.ocrStatus === 'FAILED'
    || record.ocrStatus === 'RUNNING'
}

function canTriggerMaterialOcr(record: ArchiveVolumeMaterialResponse): boolean {
  return props.canRegisterMaterial
    && Boolean(record.fileId)
    && (record.ocrStatus === 'PENDING'
      || record.ocrStatus === 'FAILED'
      || !record.ocrStatus)
}

function openMaterialOcr(materialId: string, pageNo?: number): void {
  ocrDetailMaterialId.value = materialId
  ocrDetailInitialPageNo.value = pageNo
  ocrDetailOpen.value = true
}

function openMaterialOcrPreview(record: ArchiveVolumeSearchResponse): void {
  openMaterialOcr(record.materialId, record.matchPageNo)
}

function applyQuickKeyword(value: string): void {
  keyword.value = value
  void handleSearch()
}

async function loadHits(): Promise<void> {
  const trimmed = keyword.value.trim()
  if (!trimmed) {
    hits.value = []
    pagination.total = 0
    searched.value = false
    return
  }
  loading.value = true
  try {
    const result = await searchArchiveVolumes({
      volumeId: props.volumeId,
      keyword: trimmed,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
    })
    hits.value = readPageList(result, '卷内检索结果异常')
    pagination.total = readPageTotal(result)
    searched.value = true
  } catch (error) {
    showUserError(error, '卷内检索失败')
    hits.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  if (!keyword.value.trim()) {
    message.warning('请输入检索关键词')
    return
  }
  pagination.pageNum = 1
  void loadHits()
}

function goGlobalSearch(): void {
  void router.push({
    name: 'TeacherArchiveVolumeSearch',
    query: { volumeId: props.volumeId },
  })
}

async function handleBatchOcr(): Promise<void> {
  const targets = pendingOcrMaterials.value
  if (targets.length === 0) {
    message.warning('没有可触发 OCR 的材料')
    return
  }
  const confirmed = await confirmAsync({
    title: '批量触发 OCR？',
    content: `将为 ${targets.length} 份材料入队 OCR 识别。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
  })
  if (!confirmed) return
  batchOcrSubmitting.value = true
  try {
    for (const material of targets) {
      await triggerArchiveVolumeMaterialOcr(material.materialId)
    }
    message.success(`已入队 ${targets.length} 份材料`)
    emit('refreshed', { silent: true })
  } catch (error) {
    showUserError(error, '批量 OCR 触发失败')
  } finally {
    batchOcrSubmitting.value = false
  }
}

function confirmTriggerOcr(material: ArchiveVolumeMaterialResponse): void {
  void confirmAsync({
    title: '触发 OCR 识别？',
    content: `材料「${material.fileName ?? material.materialId}」将进入 OCR 队列。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
    onOk: async () => {
      try {
        await triggerArchiveVolumeMaterialOcr(material.materialId)
        message.success('已入队，等待识别')
        emit('refreshed', { silent: true })
      } catch (error) {
        showUserError(error, 'OCR 触发失败')
      }
    },
  })
}
</script>

<style scoped lang="scss">
.archive-volume-ocr-search {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-2, 8px);
  }

  &__head-main {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: var(--dp-space-2, 8px);
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__hint {
    font-size: 11px;
    font-family: var(--dp-font-mono, ui-monospace, monospace);
    color: var(--dp-text-muted, #64748b);
  }

  &__toolbar {
    display: flex;
    gap: var(--dp-space-2, 8px);
    margin-bottom: var(--dp-space-3, 12px);
  }

  &__quick {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-2, 8px);
    margin-bottom: var(--dp-space-3, 12px);
  }

  &__quick-label {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__result-meta {
    margin: 0 0 var(--dp-space-2, 8px);
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__hit-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__hit-item {
    padding: var(--dp-space-3, 12px) 0;
    border-top: 1px solid var(--dp-border-light, #eef0f3);

    &:first-child {
      border-top: none;
      padding-top: 0;
    }
  }

  &__hit-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--dp-space-2, 8px);
    margin-bottom: 6px;
  }

  &__file-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--dp-text-primary, #0f172a);
  }

  &__student {
    font-size: 11px;
    color: var(--dp-text-muted, #64748b);
  }

  &__page-no {
    margin-left: auto;
    font-size: 10px;
    color: var(--dp-text-muted, #94a3b8);
    font-family: var(--dp-font-mono, ui-monospace, monospace);
  }

  &__hit-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-3, 12px);
    margin-top: 6px;
    font-size: 12px;
  }

  &__pager {
    margin-top: var(--dp-space-3, 12px);
    display: flex;
    justify-content: flex-end;
  }

  &__overview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--dp-space-2, 8px);
    padding-top: var(--dp-space-3, 12px);
    border-top: 1px solid var(--dp-border-subtle, #e2e8f0);
  }

  &__overview-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__muted {
    color: var(--dp-text-muted, #64748b);
    font-size: 12px;
  }
}

:deep(.archive-search-snippet-mark) {
  background: color-mix(in srgb, var(--dp-primary, #2563eb) 18%, transparent);
  color: var(--dp-primary, #2563eb);
  font-weight: 600;
  padding: 0 2px;
  border-radius: 2px;
}
</style>
