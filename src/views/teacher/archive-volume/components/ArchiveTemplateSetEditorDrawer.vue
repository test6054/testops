<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import MenuOutlined from '@ant-design/icons-vue/MenuOutlined'
import { computed, ref, watch } from 'vue'
import { ARCHIVE_MATERIAL_TYPE_LABEL } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import { useArchiveTemplateDragReorder } from '@/composables/useArchiveTemplateDragReorder'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveTemplateSortableTableShell from '@/views/teacher/archive-volume/components/ArchiveTemplateSortableTableShell.vue'

defineOptions({ name: 'ArchiveTemplateSetEditorDrawer' })

/** 归档模板材料编辑行（平台 / 租户共用） */
export interface ArchiveTemplateMaterialEditRow {
  rowKey: string
  materialType: ArchiveMaterialTypeCode
  catalogCode?: string
  catalogName: string
  requiredFlag: boolean
  sortOrder?: number
  /** 平台模板可编辑分组 */
  categoryGroup?: string
  /** 租户模板允许延迟提交 */
  delayAllowedFlag?: boolean
}

/** 归档模板自查项编辑行（平台 sortOrder / 租户 itemOrder） */
export interface ArchiveTemplateSelfCheckEditRow {
  rowKey: string
  itemText: string
  requiredFlag: boolean
  sortOrder?: number
  itemOrder?: number
}

interface MaterialGroupTab {
  tabKey: string
  groupName: string
  displayName: string
  items: ArchiveTemplateMaterialEditRow[]
}

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    loading?: boolean
    saving?: boolean
    mode: 'platform' | 'tenant'
    materialRows: ArchiveTemplateMaterialEditRow[]
    selfCheckRows: ArchiveTemplateSelfCheckEditRow[]
    /** 租户模式：材料项分组映射（来自 fork 源平台模板） */
    categoryGroupMap?: Map<string, string>
    emptyDescription?: string
    saveLabel?: string
  }>(),
  {
    loading: false,
    saving: false,
    emptyDescription: '暂无材料项与自查项',
    saveLabel: '保存',
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: []
  cancel: []
}>()

const MATERIAL_GROUP_FALLBACK = '材料目录'
const EDITOR_TAB_SELF_CHECK = 'self-check'

const materialRowsModel = defineModel<ArchiveTemplateMaterialEditRow[]>('materialRows', { required: true })
const selfCheckRowsModel = defineModel<ArchiveTemplateSelfCheckEditRow[]>('selfCheckRows', { required: true })

const editorActiveTab = ref<string>(EDITOR_TAB_SELF_CHECK)
const materialGroupLists = ref<Record<string, ArchiveTemplateMaterialEditRow[]>>({})

const {
  applyMaterialGroupOrder,
  applySelfCheckOrder,
  normalizeMaterialSortOrders,
  normalizeSelfCheckSortOrders,
} = useArchiveTemplateDragReorder(materialRowsModel, selfCheckRowsModel, {
  resolveMaterialGroup: resolveMaterialGroupName,
  selfCheckOrderField: props.mode === 'tenant' ? 'itemOrder' : 'sortOrder',
})

const materialColumns = computed<ColumnsType<ArchiveTemplateMaterialEditRow>>(() => {
  const dragCol = { title: '', key: 'drag', width: 44, align: 'center' as const }
  if (props.mode === 'platform') {
    return [
      dragCol,
      { title: '材料类型', key: 'materialType', width: 140 },
      { title: '目录编码', key: 'catalogCode', width: 120 },
      { title: '目录名称', key: 'catalogName' },
      { title: '分组', key: 'categoryGroup', width: 120 },
      { title: '必交', key: 'requiredFlag', width: 80, align: 'center' },
    ]
  }
  return [
    dragCol,
    { title: '材料类型', key: 'materialType', width: 140 },
    { title: '目录名称', key: 'catalogName', width: 160 },
    { title: '目录编码', key: 'catalogCode', width: 120 },
    { title: '必交', key: 'requiredFlag', width: 72 },
    { title: '延迟', key: 'delayAllowedFlag', width: 72 },
  ]
})

const selfCheckColumns: ColumnsType<ArchiveTemplateSelfCheckEditRow> = [
  { title: '', key: 'drag', width: 44, align: 'center' },
  { title: '自查项', key: 'itemText' },
  { title: '必查', key: 'requiredFlag', width: 80, align: 'center' },
]

const groupedMaterialTabs = computed<MaterialGroupTab[]>(() => {
  const groups = new Map<string, ArchiveTemplateMaterialEditRow[]>()
  for (const item of materialRowsModel.value) {
    const groupName = resolveMaterialGroupName(item)
    const bucket = groups.get(groupName) ?? []
    bucket.push(item)
    groups.set(groupName, bucket)
  }
  return [...groups.entries()]
    .map(([groupName, items]) => {
      const sortedItems = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      const minSort = sortedItems[0]?.sortOrder ?? 0
      return {
        tabKey: `group-${groupName}`,
        groupName,
        displayName: groupName,
        items: sortedItems,
        minSort,
      }
    })
    .sort((a, b) => a.minSort - b.minSort || a.displayName.localeCompare(b.displayName, 'zh-CN'))
    .map(({ tabKey, groupName, displayName, items }) => ({ tabKey, groupName, displayName, items }))
})

function materialKey(materialType: ArchiveMaterialTypeCode, catalogCode?: string) {
  return `${materialType}:${catalogCode ?? ''}`
}

function resolveMaterialGroupName(item: ArchiveTemplateMaterialEditRow): string {
  if (props.mode === 'platform') {
    return item.categoryGroup?.trim() || MATERIAL_GROUP_FALLBACK
  }
  return props.categoryGroupMap?.get(materialKey(item.materialType, item.catalogCode)) ?? '未分组'
}

function materialGroupTabLabel(group: MaterialGroupTab) {
  return `${group.displayName}（${group.items.length}）`
}

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ARCHIVE_MATERIAL_TYPE_LABEL, code, 'materialType')
}

function syncMaterialGroupLists() {
  const next: Record<string, ArchiveTemplateMaterialEditRow[]> = {}
  for (const group of groupedMaterialTabs.value) {
    next[group.groupName] = [...group.items]
  }
  materialGroupLists.value = next
}

function resolveEditorDefaultTab() {
  if (groupedMaterialTabs.value.length > 0) {
    editorActiveTab.value = groupedMaterialTabs.value[0].tabKey
    return
  }
  editorActiveTab.value = EDITOR_TAB_SELF_CHECK
}

function handleMaterialGroupSorted(groupName: string) {
  const ordered = materialGroupLists.value[groupName] ?? []
  applyMaterialGroupOrder(groupName, ordered)
}

function handleSelfCheckSorted() {
  applySelfCheckOrder([...selfCheckRowsModel.value])
}

function handleClose() {
  emit('cancel')
}

function handleSave() {
  normalizeMaterialSortOrders()
  normalizeSelfCheckSortOrders()
  emit('save')
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resolveEditorDefaultTab()
      syncMaterialGroupLists()
    }
  },
)

watch(
  () => materialRowsModel.value.length,
  () => {
    if (props.open) {
      syncMaterialGroupLists()
      if (groupedMaterialTabs.value.length > 0 && editorActiveTab.value === EDITOR_TAB_SELF_CHECK) {
        resolveEditorDefaultTab()
      }
    }
  },
)

defineExpose({
  resolveEditorDefaultTab,
  normalizeMaterialSortOrders,
  normalizeSelfCheckSortOrders,
})
</script>

<template>
  <UiDrawer
    :open="open"
    :title="title"
    width="960"
    :destroy-on-close="true"
    :mask-closable="!saving"
    @update:open="emit('update:open', $event)"
    @close="handleClose"
  >
    <a-spin :spinning="loading">
      <p class="archive-template-editor__tip">拖拽左侧手柄调整材料与自查项顺序</p>
      <slot name="meta" />

      <div
        v-if="groupedMaterialTabs.length > 0 || selfCheckRowsModel.length > 0"
        class="archive-template-editor__tabs-wrap"
      >
        <a-tabs v-model:active-key="editorActiveTab" class="archive-template-editor__tabs">
          <a-tab-pane
            v-for="group in groupedMaterialTabs"
            :key="group.tabKey"
            :tab="materialGroupTabLabel(group)"
          >
            <ArchiveTemplateSortableTableShell
              v-if="materialGroupLists[group.groupName]"
              v-model="materialGroupLists[group.groupName]"
              :columns="materialColumns"
              row-key="rowKey"
              :active="editorActiveTab === group.tabKey"
              @sorted="handleMaterialGroupSorted(group.groupName)"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'drag'">
                  <span
                    class="archive-template-editor__drag-handle"
                    role="button"
                    tabindex="0"
                    aria-label="拖拽排序"
                  >
                    <MenuOutlined />
                  </span>
                </template>
                <template v-else-if="column.key === 'materialType'">
                  {{ materialTypeLabel(record.materialType) }}
                </template>
                <template v-else-if="column.key === 'catalogCode'">
                  <a-input v-model:value="record.catalogCode" />
                </template>
                <template v-else-if="column.key === 'catalogName'">
                  <a-input v-model:value="record.catalogName" />
                </template>
                <template v-else-if="column.key === 'categoryGroup'">
                  <a-input
                    v-model:value="record.categoryGroup"
                    :placeholder="MATERIAL_GROUP_FALLBACK"
                  />
                </template>
                <template v-else-if="column.key === 'requiredFlag'">
                  <a-checkbox v-model:checked="record.requiredFlag">必交</a-checkbox>
                </template>
                <template v-else-if="column.key === 'delayAllowedFlag'">
                  <a-checkbox v-model:checked="record.delayAllowedFlag">允许延迟</a-checkbox>
                </template>
              </template>
            </ArchiveTemplateSortableTableShell>
          </a-tab-pane>
          <a-tab-pane key="self-check" :tab="`自查项（${selfCheckRowsModel.length}）`">
            <ArchiveTemplateSortableTableShell
              v-model="selfCheckRowsModel"
              :columns="selfCheckColumns"
              row-key="rowKey"
              empty-description="暂无自查项"
              :active="editorActiveTab === 'self-check'"
              @sorted="handleSelfCheckSorted"
            >
              <template #bodyCell="{ column, index }">
                <template v-if="column.key === 'drag'">
                  <span
                    class="archive-template-editor__drag-handle"
                    role="button"
                    tabindex="0"
                    aria-label="拖拽排序"
                  >
                    <MenuOutlined />
                  </span>
                </template>
                <template v-else-if="column.key === 'itemText'">
                  <a-input v-model:value="selfCheckRowsModel[index].itemText" />
                </template>
                <template v-else-if="column.key === 'requiredFlag'">
                  <a-checkbox v-model:checked="selfCheckRowsModel[index].requiredFlag">必查</a-checkbox>
                </template>
              </template>
            </ArchiveTemplateSortableTableShell>
          </a-tab-pane>
        </a-tabs>
      </div>
      <p v-else class="archive-template-editor__empty">{{ emptyDescription }}</p>
    </a-spin>

    <template #footer>
      <UiButton size="sm" variant="outline" :disabled="saving" @click="handleClose">取消</UiButton>
      <UiButton size="sm" variant="primary" :loading="saving" @click="handleSave">{{ saveLabel }}</UiButton>
    </template>
  </UiDrawer>
</template>

<style scoped>
.archive-template-editor__tip {
  margin: 0 0 16px;
  color: var(--dp-text-secondary, #64748b);
  font-size: 13px;
}

:deep(.archive-template-editor__meta) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  margin-bottom: 16px;
}

:deep(.archive-template-editor__field) {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

:deep(.archive-template-editor__field--wide) {
  grid-column: 1 / -1;
}

.archive-template-editor__tabs-wrap {
  margin-top: 4px;
}

.archive-template-editor__tabs :deep(.ant-tabs-nav) {
  margin-bottom: 12px;
}

.archive-template-editor__drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: var(--dp-radius-control, 4px);
  background: transparent;
  color: var(--dp-text-secondary, #64748b);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.archive-template-editor__drag-handle:hover {
  background: var(--dp-gray-100, #f3f4f6);
  color: var(--dp-text-primary, #0f172a);
}

.archive-template-editor__drag-handle:active {
  cursor: grabbing;
}

.archive-template-editor__empty {
  margin: 0;
  color: var(--dp-text-secondary, #64748b);
  font-size: 14px;
}
</style>
