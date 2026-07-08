<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ArchivePlatformMaterialItemResponse,
  ArchivePlatformTemplatePreviewResponse,
} from '@/apis/mark/archive-platform-template'
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import {
  ArchiveExamFormDescription,
  ArchiveMaterialTypeDescription,
} from '@/apis/mark/archive-volume'
import type { SignalMetric } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import {
  archiveTemplateScopeLabel,
  archiveTemplateScopeTone,
} from '@/apis/mark/archive-template-scope'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import WorkbenchSurfaceCard from '@/components/workbench/WorkbenchSurfaceCard.vue'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'ArchiveTemplateSetPreviewDrawer' })

const props = withDefaults(
  defineProps<{
    open: boolean
    loading?: boolean
    preview: ArchivePlatformTemplatePreviewResponse | null
    /** 租户预览：材料分组来自 fork 源平台模板 */
    categoryGroupMap?: Map<string, string>
    forkSourceSetCode?: string
  }>(),
  {
    loading: false,
    categoryGroupMap: () => new Map(),
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
}>()

const EDITOR_TAB_SELF_CHECK = 'self-check'
const MATERIAL_GROUP_FALLBACK = '未分组'

const previewActiveTab = ref<string>(EDITOR_TAB_SELF_CHECK)

interface MaterialPreviewRow extends ArchivePlatformMaterialItemResponse {
  rowKey: string
  indexNo: number
  groupName: string
}

interface SelfCheckPreviewRow {
  rowKey: string
  indexNo: number
  itemText: string
  requiredFlag?: boolean
}

interface MaterialGroupTab {
  tabKey: string
  groupName: string
  items: MaterialPreviewRow[]
}

function materialKey(materialType: ArchiveMaterialTypeCode, catalogCode?: string) {
  return `${materialType}:${catalogCode ?? ''}`
}

function resolveGroupName(item: ArchivePlatformMaterialItemResponse): string {
  if (item.categoryGroup?.trim()) return item.categoryGroup.trim()
  const mapped = props.categoryGroupMap.get(materialKey(item.materialType, item.catalogCode))
  return mapped?.trim() || MATERIAL_GROUP_FALLBACK
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
}

function examFormLabel(code?: ArchivePlatformTemplatePreviewResponse['templateSet']['examForm']) {
  if (!code) return '—'
  return strictEnumLabel(ArchiveExamFormDescription, code, 'examForm')
}

const materialPreviewRows = computed<MaterialPreviewRow[]>(() => {
  const items = props.preview?.materialItems ?? []
  return [...items]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item, index) => ({
      ...item,
      rowKey: materialKey(item.materialType, item.catalogCode),
      indexNo: index + 1,
      groupName: resolveGroupName(item),
    }))
})

const selfCheckPreviewRows = computed<SelfCheckPreviewRow[]>(() => {
  const items = props.preview?.selfCheckItems ?? []
  return [...items]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item, index) => ({
      rowKey: `self-check-${index}`,
      indexNo: index + 1,
      itemText: item.itemText,
      requiredFlag: item.requiredFlag,
    }))
})

const groupedMaterialTabs = computed<MaterialGroupTab[]>(() => {
  const groups = new Map<string, MaterialPreviewRow[]>()
  for (const item of materialPreviewRows.value) {
    const bucket = groups.get(item.groupName) ?? []
    bucket.push(item)
    groups.set(item.groupName, bucket)
  }
  return [...groups.entries()]
    .map(([groupName, items]) => ({
      tabKey: `group-${groupName}`,
      groupName,
      items: [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }))
    .sort((a, b) => {
      const minA = a.items[0]?.sortOrder ?? 0
      const minB = b.items[0]?.sortOrder ?? 0
      return minA - minB || a.groupName.localeCompare(b.groupName, 'zh-CN')
    })
})

const requiredMaterialCount = computed(
  () => materialPreviewRows.value.filter((item) => item.requiredFlag).length,
)

const requiredSelfCheckCount = computed(
  () => selfCheckPreviewRows.value.filter((item) => item.requiredFlag).length,
)

const previewSignalMetrics = computed<SignalMetric[]>(() => [
  {
    key: 'materials',
    label: '材料目录',
    value: materialPreviewRows.value.length,
    unit: '项',
    tone: 'blue',
  },
  {
    key: 'required-materials',
    label: '建议必交',
    value: requiredMaterialCount.value,
    unit: '项',
    tone: requiredMaterialCount.value > 0 ? 'orange' : 'gray',
  },
  {
    key: 'self-checks',
    label: '自查项',
    value: selfCheckPreviewRows.value.length,
    unit: '项',
    tone: 'blue',
  },
  {
    key: 'required-self-checks',
    label: '必查项',
    value: requiredSelfCheckCount.value,
    unit: '项',
    tone: requiredSelfCheckCount.value > 0 ? 'orange' : 'gray',
  },
])

const drawerTitle = computed(() => {
  const name = props.preview?.templateSet.setName?.trim()
  return name ? `模板预览：${name}` : '模板预览'
})

const materialColumns: ColumnsType<MaterialPreviewRow> = [
  { title: '序号', dataIndex: 'indexNo', key: 'indexNo', width: 56, align: 'center' },
  { title: '材料类型', key: 'materialType', width: 120 },
  { title: '目录编码', dataIndex: 'catalogCode', key: 'catalogCode', width: 120 },
  { title: '目录名称', dataIndex: 'catalogName', key: 'catalogName', ellipsis: true },
  { title: '必交', key: 'requiredFlag', width: 88, align: 'center' },
]

const selfCheckColumns: ColumnsType<SelfCheckPreviewRow> = [
  { title: '序号', dataIndex: 'indexNo', key: 'indexNo', width: 56, align: 'center' },
  { title: '自查项', dataIndex: 'itemText', key: 'itemText', ellipsis: true },
  { title: '必查', key: 'requiredFlag', width: 88, align: 'center' },
]

function materialGroupTabLabel(group: MaterialGroupTab) {
  return `${group.groupName}（${group.items.length}）`
}

function resolveDefaultTab() {
  if (groupedMaterialTabs.value.length > 0) {
    previewActiveTab.value = groupedMaterialTabs.value[0].tabKey
    return
  }
  previewActiveTab.value = EDITOR_TAB_SELF_CHECK
}

function handleClose() {
  emit('update:open', false)
  emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resolveDefaultTab()
  },
)

watch(
  () => props.preview?.templateSet.setCode,
  () => {
    if (props.open) resolveDefaultTab()
  },
)
</script>

<template>
  <UiDrawer
    :open="open"
    :title="drawerTitle"
    width="960"
    hide-footer
    @update:open="emit('update:open', $event)"
    @close="handleClose"
  >
    <UiSkeletonState v-if="loading" variant="card" compact />
    <template v-else-if="preview">
      <SignalBand
        variant="tiles"
        compact
        class="archive-template-preview__signal"
        :metrics="previewSignalMetrics"
      />

      <div class="archive-template-preview__meta">
        <div class="archive-template-preview__field">
          <span class="archive-template-preview__label">模板编码</span>
          <span class="archive-template-preview__value">{{ preview.templateSet.setCode }}</span>
        </div>
        <div class="archive-template-preview__field">
          <span class="archive-template-preview__label">考核形式</span>
          <span class="archive-template-preview__value">{{
            examFormLabel(preview.templateSet.examForm)
          }}</span>
        </div>
        <div class="archive-template-preview__field">
          <span class="archive-template-preview__label">作用域</span>
          <UiTag :tone="archiveTemplateScopeTone(preview.templateSet.templateScope)" size="sm">
            {{ archiveTemplateScopeLabel(preview.templateSet.templateScope) }}
          </UiTag>
        </div>
        <div class="archive-template-preview__field">
          <span class="archive-template-preview__label">发版标签</span>
          <span class="archive-template-preview__value">
            <UiTag v-if="preview.templateSet.releaseTag" tone="blue" size="sm">
              {{ preview.templateSet.releaseTag }}
            </UiTag>
            <template v-else>—</template>
          </span>
        </div>
        <div v-if="forkSourceSetCode" class="archive-template-preview__field">
          <span class="archive-template-preview__label">来源模板</span>
          <span class="archive-template-preview__value">{{ forkSourceSetCode }}</span>
        </div>
        <p
          v-if="preview.templateSet.description?.trim()"
          class="archive-template-preview__desc archive-template-preview__field--wide"
        >
          {{ preview.templateSet.description.trim() }}
        </p>
      </div>

      <div
        v-if="groupedMaterialTabs.length > 0 || selfCheckPreviewRows.length > 0"
        class="archive-template-preview__tabs-wrap"
      >
        <a-tabs v-model:active-key="previewActiveTab" class="archive-template-preview__tabs">
          <a-tab-pane
            v-for="group in groupedMaterialTabs"
            :key="group.tabKey"
            :tab="materialGroupTabLabel(group)"
          >
            <WorkbenchSurfaceCard flush>
              <UiDataTable
                pagination-mode="none"
                :columns="materialColumns"
                :data-source="group.items"
                :show-pagination="false"
                flat
                row-key="rowKey"
                size="small"
                empty-description="该分组暂无材料项"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'materialType'">
                    {{ materialTypeLabel(record.materialType) }}
                  </template>
                  <template v-else-if="column.key === 'catalogCode'">
                    {{ record.catalogCode?.trim() || '—' }}
                  </template>
                  <template v-else-if="column.key === 'requiredFlag'">
                    <UiTag v-if="record.requiredFlag" tone="orange" size="sm">建议必交</UiTag>
                    <span v-else class="archive-template-preview__muted">—</span>
                  </template>
                </template>
              </UiDataTable>
            </WorkbenchSurfaceCard>
          </a-tab-pane>
          <a-tab-pane key="self-check" :tab="`自查项（${selfCheckPreviewRows.length}）`">
            <WorkbenchSurfaceCard flush>
              <UiDataTable
                pagination-mode="none"
                :columns="selfCheckColumns"
                :data-source="selfCheckPreviewRows"
                :show-pagination="false"
                flat
                row-key="rowKey"
                size="small"
                empty-description="暂无自查项"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'requiredFlag'">
                    <UiTag v-if="record.requiredFlag" tone="orange" size="sm">必查</UiTag>
                    <span v-else class="archive-template-preview__muted">—</span>
                  </template>
                </template>
              </UiDataTable>
            </WorkbenchSurfaceCard>
          </a-tab-pane>
        </a-tabs>
      </div>
      <p v-else class="archive-template-preview__empty">该模板套暂无材料目录与自查项</p>
    </template>
  </UiDrawer>
</template>

<style scoped>
.archive-template-preview__signal {
  margin-bottom: var(--dp-space-4);
}

.archive-template-preview__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dp-space-2) var(--dp-space-3);
  margin-bottom: var(--dp-space-4);
  padding: var(--dp-space-4);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface-subtle);
}

.archive-template-preview__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.archive-template-preview__field--wide {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--dp-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.archive-template-preview__label {
  color: var(--dp-text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.archive-template-preview__value {
  color: var(--dp-text-primary);
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
}

.archive-template-preview__desc {
  padding-top: var(--dp-space-1);
  border-top: 1px dashed var(--dp-border);
}

.archive-template-preview__tabs-wrap {
  margin-top: var(--dp-space-1);
}

.archive-template-preview__tabs :deep(.ant-tabs-nav) {
  margin-bottom: var(--dp-space-2);
}

.archive-template-preview__tabs :deep(.ant-table) {
  font-size: 13px;
}

.archive-template-preview__muted {
  color: var(--dp-text-secondary);
}

.archive-template-preview__empty {
  margin: 0;
  color: var(--dp-text-secondary);
  font-size: 14px;
}
</style>
