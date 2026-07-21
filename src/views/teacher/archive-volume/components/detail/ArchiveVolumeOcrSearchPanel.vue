<template>
  <WorkbenchSurfaceCard flush embedded class="archive-volume-ocr-search">
    <template #head>
      <div class="archive-volume-ocr-search__head">
        <div class="archive-volume-ocr-search__head-main">
          <span class="archive-volume-ocr-search__title">卷内内容检索</span>
          <span class="archive-volume-ocr-search__hint">卷内文字识别全文检索</span>
        </div>
        <UiButton
          class="archive-volume-ocr-search__global"
          variant="outline"
          size="sm"
          @click="goGlobalSearch"
        >
          全局检索
        </UiButton>
      </div>
    </template>

    <template #toolbar>
      <div class="archive-volume-ocr-search__search">
        <UiInput
          v-model="keyword"
          class="archive-volume-ocr-search__search-input"
          size="md"
          clearable
          placeholder="搜索本卷文字识别全文：答卷内容、标准答案、分析报告…"
          @press-enter="handleSearch"
        />
        <UiButton
          class="archive-volume-ocr-search__search-btn"
          variant="primary"
          size="md"
          :loading="loading"
          @click="handleSearch"
        >
          检索
        </UiButton>
      </div>
    </template>

    <div v-if="searched" class="archive-volume-ocr-search__results">
      <p class="archive-volume-ocr-search__result-meta">{{ hitPageTotal }} 条匹配 · 当前归档任务</p>
      <UiEmpty
        size="sm"
        v-if="!loading && hits.length === 0 && !hitsLoadFailed"
        description="本卷无匹配结果"
      >
        <UiButton variant="outline" size="sm" @click="goGlobalSearch">切换全局检索</UiButton>
      </UiEmpty>
      <UiDataTable
        v-else
        v-model:current="hitPageNum"
        v-model:page-size="hitPageSize"
        pagination-mode="server"
        :columns="hitColumns"
        :data-source="hitsLoadFailed ? [] : hits"
        :loading="loading"
        :total="hitPageTotal"
        :show-header="false"
        flat
        row-key="materialId"
        :load-error="hitsLoadFailed"
        @page-change="loadHits"
      >
        <template #bodyCell="{ record }">
          <div class="archive-volume-ocr-search__hit-item">
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
                查看文字识别
              </UiTextAction>
            </div>
          </div>
        </template>
      </UiDataTable>
    </div>

    <div v-else class="archive-volume-ocr-search__empty">
      <UiAlertStrip v-if="materialStatsLoadFailed" tone="warning" title="文字识别统计加载失败">
        <template #actions>
          <UiButton size="sm" variant="outline" @click="loadMaterialStats">重新加载</UiButton>
        </template>
      </UiAlertStrip>
      <div class="archive-volume-ocr-search__overview-head">
        <span class="archive-volume-ocr-search__overview-title">材料文字识别状态</span>
        <UiButton
          size="sm"
          v-if="canMaintainMaterial === true && pendingOcrCount > 0"
          variant="ghost"
          :loading="batchOcrSubmitting"
          @click="handleBatchOcr"
        >
          批量文字识别
        </UiButton>
      </div>
      <UiDataTable
        v-model:current="overviewPageNum"
        v-model:page-size="overviewPageSize"
        pagination-mode="server"
        :columns="overviewColumns"
        :data-source="overviewLoadFailed ? [] : ocrMaterials"
        :loading="overviewLoading"
        :total="overviewPageTotal"
        :sticky-header="false"
        flat
        row-key="materialId"
        size="middle"
        empty-description="暂无可检索材料"
        :load-error="overviewLoadFailed"
        @page-change="loadOcrMaterials"
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
            <UiTableActions
              v-if="canViewMaterialOcrMaterial(record) || canTriggerMaterialOcr(record)"
              :items="[
                { key: 'view', label: '查看文本', hidden: !canViewMaterialOcrMaterial(record) },
                {
                  key: 'trigger',
                  label: triggeringMaterialIds.has(record.materialId) ? '提交中' : '触发文字识别',
                  hidden: !canTriggerMaterialOcr(record),
                  disabled: triggeringMaterialIds.has(record.materialId),
                },
              ]"
              split
              @action="(key) => handleOcrMaterialRowAction(key, record)"
            />
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
import type {
  ArchiveVolumeMaterialResponse,
  ArchiveVolumeMaterialStatsResponse,
  ArchiveVolumeSearchResponse,
} from '@/apis/mark/archive-volume'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ARCHIVE_MATERIAL_OCR_STATUS_TONE,
  ArchiveMaterialOcrStatusCode,
  ArchiveMaterialOcrStatusDescription,
} from '@/apis/mark/archive-ocr-status'
import {
  ArchiveMaterialTypeDescription,
  batchTriggerArchiveVolumeMaterialOcr,
  getArchiveVolumeMaterialStats,
  pageArchiveVolumeMaterials,
  searchArchiveVolumes,
  triggerArchiveVolumeMaterialOcr,
} from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { highlightArchiveSearchSnippet } from '@/utils/archive-search-snippet'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import ArchiveVolumeMaterialOcrDetailModal from '@/views/teacher/archive-volume/components/detail/ArchiveVolumeMaterialOcrDetailModal.vue'

defineOptions({ name: 'ArchiveVolumeOcrSearchPanel' })

const props = defineProps<{
  volumeId: string
  canRegisterMaterial: boolean
  /** MVR-185：批量 OCR 可不在收材窗口 */
  canMaintainMaterial?: boolean
}>()

const emit = defineEmits<{
  "refreshed": [options?: { silent?: boolean }]
  'navigate-materials': []
}>()

const router = useRouter()
const keyword = ref('')
const loading = ref(false)
const hitsLoadFailed = ref(false)
const batchOcrSubmitting = ref(false)
const triggeringMaterialIds = reactive(new Set<string>())
const searched = ref(false)
const hits = ref<ArchiveVolumeSearchResponse[]>([])
const hitPageNum = ref(1)
const hitPageSize = ref(10)
const hitPageTotal = ref(0)
const overviewPageNum = ref(1)
const overviewPageSize = ref(20)
const overviewPageTotal = ref(0)
const overviewLoading = ref(false)
const overviewLoadFailed = ref(false)
const ocrMaterials = ref<ArchiveVolumeMaterialResponse[]>([])
const materialStats = ref<ArchiveVolumeMaterialStatsResponse | null>(null)
const materialStatsLoadFailed = ref(false)
const ocrDetailOpen = ref(false)
const ocrDetailMaterialId = ref('')
const ocrDetailInitialPageNo = ref<number>()

const hitColumns: ColumnsType<ArchiveVolumeSearchResponse> = [{ title: '匹配', key: 'hit' }]

const overviewColumns: ColumnsType<ArchiveVolumeMaterialResponse> = [
  { title: '材料', dataIndex: 'fileName', key: 'fileName', width: 220, fixed: 'left' },
  { title: '类型', key: 'materialType', width: 120 },
  { title: '文字识别状态', key: 'ocrStatus', width: 120 },
  { title: '操作', key: 'actions', width: 120 },
]

const pendingOcrCount = computed(() => materialStats.value?.ocrOverview.pendingOcrCount ?? 0)

async function loadMaterialStats(): Promise<void> {
  if (!props.volumeId) {
    materialStats.value = null
    materialStatsLoadFailed.value = false
    return
  }
  try {
    materialStats.value = await getArchiveVolumeMaterialStats({ volumeId: props.volumeId })
    materialStatsLoadFailed.value = false
  } catch (error) {
    materialStats.value = null
    materialStatsLoadFailed.value = true
    showUserError(error, '加载文字识别统计失败')
  }
}

async function loadOcrMaterials(): Promise<void> {
  if (!props.volumeId) {
    ocrMaterials.value = []
    overviewPageTotal.value = 0
    overviewLoadFailed.value = false
    return
  }
  overviewLoading.value = true
  try {
    const result = await pageArchiveVolumeMaterials({
      volumeId: props.volumeId,
      ocrOverviewOnly: true,
      pageNum: overviewPageNum.value,
      pageSize: overviewPageSize.value,
    })
    ocrMaterials.value = result.list
    overviewPageTotal.value = result.total
    overviewLoadFailed.value = false
  } catch (error) {
    overviewLoadFailed.value = true
    showUserError(error, '加载文字识别材料失败')
  } finally {
    overviewLoading.value = false
  }
}

async function reloadOverviewData(): Promise<void> {
  await Promise.all([loadMaterialStats(), loadOcrMaterials()])
}

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
  return (
    record.ocrStatus === ArchiveMaterialOcrStatusCode.COMPLETED
    || record.ocrStatus === ArchiveMaterialOcrStatusCode.FAILED
    || record.ocrStatus === ArchiveMaterialOcrStatusCode.RUNNING
  )
}

function canViewMaterialOcrMaterial(record: ArchiveVolumeMaterialResponse): boolean {
  return (
    record.ocrStatus === ArchiveMaterialOcrStatusCode.COMPLETED
    || record.ocrStatus === ArchiveMaterialOcrStatusCode.FAILED
    || record.ocrStatus === ArchiveMaterialOcrStatusCode.RUNNING
  )
}

function canTriggerMaterialOcr(record: ArchiveVolumeMaterialResponse): boolean {
  return (
    props.canMaintainMaterial === true
    && Boolean(record.fileId)
    && (record.ocrStatus === ArchiveMaterialOcrStatusCode.PENDING
      || record.ocrStatus === ArchiveMaterialOcrStatusCode.FAILED
      || !record.ocrStatus)
  )
}

function openMaterialOcr(materialId: string, pageNo?: number): void {
  ocrDetailMaterialId.value = materialId
  ocrDetailInitialPageNo.value = pageNo
  ocrDetailOpen.value = true
}

function openMaterialOcrPreview(record: ArchiveVolumeSearchResponse): void {
  openMaterialOcr(record.materialId, record.matchPageNo)
}

async function loadHits(): Promise<void> {
  const trimmed = keyword.value.trim()
  if (!trimmed) {
    hits.value = []
    hitPageTotal.value = 0
    searched.value = false
    hitsLoadFailed.value = false
    return
  }
  loading.value = true
  try {
    const result = await searchArchiveVolumes({
      volumeId: props.volumeId,
      keyword: trimmed,
      pageNum: hitPageNum.value,
      pageSize: hitPageSize.value,
    })
    hits.value = result.list
    hitPageTotal.value = result.total
    hitPageNum.value = result.pageNum
    hitPageSize.value = result.pageSize
    searched.value = true
    hitsLoadFailed.value = false
  } catch (error) {
    showUserError(error, '卷内检索失败')
    hits.value = []
    hitPageTotal.value = 0
    searched.value = true
    hitsLoadFailed.value = true
  } finally {
    loading.value = false
  }
}

function handleSearch(): void {
  if (!keyword.value.trim()) {
    showFormValidationMessage('请输入检索关键词')
    return
  }
  hitPageNum.value = 1
  void loadHits()
}

function goGlobalSearch(): void {
  void router.push({
    name: 'TeacherArchiveVolumeSearch',
    query: { volumeId: props.volumeId },
  })
}

async function handleBatchOcr(): Promise<void> {
  // MVR-312：与 canMaintainMaterial / 按钮 v-if 同源二次拦截
  if (props.canMaintainMaterial !== true) {
    void message.warning('当前账号无维护材料识别权限')
    return
  }
  if (pendingOcrCount.value <= 0) {
    showFormValidationMessage('没有可触发文字识别的材料')
    return
  }
  const confirmed = await confirmAsync({
    title: '批量触发文字识别？',
    content: `将为 ${pendingOcrCount.value} 份材料入队文字识别。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
  })
  if (!confirmed) return
  batchOcrSubmitting.value = true
  try {
    const result = await batchTriggerArchiveVolumeMaterialOcr(props.volumeId)
    if (result.triggeredCount > 0) {
      void message.success(`已入队 ${result.triggeredCount} 份材料`)
    } else {
      void message.info('未新增入队材料，材料状态已变化并已刷新')
    }
    emit('refreshed', { silent: true })
    await reloadOverviewData()
  } catch (error) {
    showUserError(error, '批量文字识别触发失败')
  } finally {
    batchOcrSubmitting.value = false
  }
}

function confirmTriggerOcr(material: ArchiveVolumeMaterialResponse): void {
  // MVR-421：与 canTriggerMaterialOcr 同源二次闸（维护权∧fileId∧PENDING/FAILED/空态）
  if (!canTriggerMaterialOcr(material)) {
    void message.warning(
      props.canMaintainMaterial !== true
        ? '当前账号无维护材料识别权限'
        : '当前材料不可触发文字识别（无文件或识别状态不允许）',
    )
    return
  }
  if (triggeringMaterialIds.has(material.materialId)) return
  void confirmAsync({
    title: '触发文字识别？',
    content: `材料「${material.fileName ?? material.materialId}」将进入文字识别队列。`,
    type: 'info',
    okText: '入队',
    cancelText: '取消',
    onOk: async () => {
      if (triggeringMaterialIds.has(material.materialId)) return
      triggeringMaterialIds.add(material.materialId)
      try {
        await triggerArchiveVolumeMaterialOcr(material.materialId)
        void message.success('已入队，等待识别')
        emit('refreshed', { silent: true })
        await reloadOverviewData()
      } catch (error) {
        showUserError(error, '文字识别触发失败')
      } finally {
        triggeringMaterialIds.delete(material.materialId)
      }
    },
  })
}

function handleOcrMaterialRowAction(key: string, material: ArchiveVolumeMaterialResponse) {
  if (key === 'view') openMaterialOcr(material.materialId)
  else if (key === 'trigger') confirmTriggerOcr(material)
}

watch(
  () => props.volumeId,
  () => {
    overviewPageNum.value = 1
    void reloadOverviewData()
  },
)

onMounted(() => {
  void reloadOverviewData()
})
</script>

<style scoped lang="scss">
.archive-volume-ocr-search {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-3);
    width: 100%;
    min-width: 0;
  }

  &__head-main {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: var(--dp-space-2);
    min-width: 0;
    flex: 1;
  }

  &__title {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--dp-text-primary);
    letter-spacing: -0.01em;
  }

  &__hint {
    font-size: 12px;
    line-height: 1.4;
    color: var(--dp-text-muted);
  }

  &__global {
    flex-shrink: 0;
    margin-left: auto;
  }

  &__search {
    display: flex;
    align-items: center;
    gap: var(--dp-space-2);
    width: 100%;
    min-width: 0;
    padding: var(--dp-space-2) var(--dp-space-3);
    border-radius: var(--dp-radius-panel, 8px);
    background: color-mix(
      in srgb,
      var(--dp-primary) 4%,
      var(--dp-surface-subtle, var(--dp-bg-layout))
    );
    border: 1px solid color-mix(in srgb, var(--dp-primary) 10%, transparent);
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;

    &:focus-within {
      border-color: color-mix(in srgb, var(--dp-primary) 32%, transparent);
      background: color-mix(
        in srgb,
        var(--dp-primary) 6%,
        var(--dp-surface-subtle, var(--dp-bg-layout))
      );
    }
  }

  &__search-input {
    flex: 1;
    min-width: 0;
  }

  &__search-btn {
    flex-shrink: 0;
  }

  &__results,
  &__empty {
    padding: var(--dp-space-3) var(--dp-space-4);
  }

  &__result-meta {
    margin: 0 0 var(--dp-space-2);
    font-size: 12px;
    color: var(--dp-text-muted);
    font-variant-numeric: tabular-nums;
  }

  &__hit-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__hit-item {
    padding: var(--dp-space-3);
    margin-bottom: var(--dp-space-2);
    border: 1px solid var(--dp-border-light);
    border-radius: var(--dp-radius-panel, 8px);
    background: var(--dp-surface);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.15s ease;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      border-color: color-mix(in srgb, var(--dp-primary) 28%, var(--dp-border-light));
      box-shadow: var(--dp-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.06));
      transform: translateY(-1px);
    }
  }

  &__hit-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--dp-space-2);
    margin-bottom: 6px;
  }

  &__file-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--dp-text-primary);
  }

  &__student {
    font-size: 11px;
    color: var(--dp-text-muted);
  }

  &__page-no {
    margin-left: auto;
    font-size: 10px;
    color: var(--dp-text-muted);
    font-family: var(--dp-font-mono);
    padding: 1px 5px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--dp-text-muted) 8%, transparent);
  }

  &__hit-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--dp-space-3);
    margin-top: 6px;
    font-size: 12px;
  }

  &__pager {
    margin-top: var(--dp-space-3);
    display: flex;
    justify-content: flex-end;
  }

  &__overview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--dp-space-3);
    padding: var(--dp-space-2) var(--dp-space-3);
    border-radius: var(--dp-radius-control, 6px);
    background: var(--dp-surface-subtle, var(--dp-bg-layout));
    border: 1px solid var(--dp-border-subtle);
  }

  &__overview-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__muted {
    color: var(--dp-text-muted);
    font-size: 12px;
  }
}

:deep(.archive-search-snippet-block) {
  padding: var(--dp-space-2) var(--dp-space-3);
  border-radius: var(--dp-radius-control-inner, 4px);
  background: color-mix(in srgb, var(--dp-text-muted) 5%, transparent);
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-text-secondary);
  margin-bottom: 4px;
}

:deep(.archive-search-snippet-mark) {
  background: color-mix(in srgb, var(--dp-primary) 18%, transparent);
  color: var(--dp-primary);
  font-weight: 600;
  padding: 0 2px;
  border-radius: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .archive-volume-ocr-search__hit-item {
    transition: none;

    &:hover {
      transform: none;
    }
  }

  .archive-volume-ocr-search__search {
    transition: none;
  }
}
</style>
