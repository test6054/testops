<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ArchiveMaterialTypeCode } from '@/apis/mark/archive-volume'
import type {
  ArchiveTemplateMaterialEditRow,
  ArchiveTemplateSelfCheckEditRow,
} from '@/views/teacher/archive-volume/components/archive-template-editor-types'
import MenuOutlined from '@ant-design/icons-vue/MenuOutlined'
import { computed, ref, watch } from 'vue'
import { ArchiveMaterialTypeDescription } from '@/apis/mark/archive-volume'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiSectionTabs from '@/components/ui-guide/ui/UiSectionTabs.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiSkeletonState from '@/components/ui-guide/ui/UiSkeletonState.vue'
import { useArchiveTemplateDragReorder } from '@/composables/useArchiveTemplateDragReorder'
import {
  ALL_ARCHIVE_MATERIAL_DELIVERY_MODE_CODES,
  ArchiveMaterialDeliveryModeDescription,
} from '@/types/enums/archive-material-delivery-mode-enum'
import { strictEnumLabel } from '@/utils/strict-enum'
import ArchiveTemplateSortableTableShell from '@/views/teacher/archive-volume/components/ArchiveTemplateSortableTableShell.vue'

defineOptions({ name: 'ArchiveTemplateSetEditorDrawer' })

const materialRowsModel = defineModel<ArchiveTemplateMaterialEditRow[]>('materialRows', {
  required: true,
})

const selfCheckRowsModel = defineModel<ArchiveTemplateSelfCheckEditRow[]>('selfCheckRows', {
  required: true,
})

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
  "save": []
  "cancel": []
}>()

const MATERIAL_GROUP_FALLBACK = '材料目录'

interface MaterialGroupTab {
  tabKey: string
  groupName: string
  displayName: string
  items: ArchiveTemplateMaterialEditRow[]
}

const EDITOR_TAB_SELF_CHECK = 'self-check'

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
  const dragCol: ColumnsType<ArchiveTemplateMaterialEditRow>[number] = {
    title: '',
    key: 'drag',
    width: 44,
    align: 'center',
  }
  if (props.mode === 'platform') {
    return [
      dragCol,
      { title: '材料类型', key: 'materialType', width: 140 },
      { title: '目录编码', key: 'catalogCode', width: 120 },
      { title: '目录名称', key: 'catalogName' },
      { title: '分组', key: 'categoryGroup', width: 120 },
      { title: '交付', key: 'deliveryMode', width: 120 },
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
    { title: '交付', key: 'deliveryMode', width: 120 },
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
const editorTabItems = computed(() => {
  const items = groupedMaterialTabs.value.map((group) => ({
    key: group.tabKey,
    label: materialGroupTabLabel(group),
  }))
  items.push({
    key: EDITOR_TAB_SELF_CHECK,
    label: `自查项（${selfCheckRowsModel.value.length}）`,
  })
  return items
})

const deliveryModeOptions = ALL_ARCHIVE_MATERIAL_DELIVERY_MODE_CODES.map((code) => ({
  value: code,
  label: ArchiveMaterialDeliveryModeDescription[code],
}))

function materialTypeLabel(code: ArchiveMaterialTypeCode) {
  return strictEnumLabel(ArchiveMaterialTypeDescription, code, 'materialType')
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
    <UiSkeletonState v-if="loading" variant="card" compact />
    <template v-else>
      <p class="archive-template-editor__tip">拖拽左侧手柄调整材料与自查项顺序</p>
      <slot name="meta" />

      <div
        v-if="groupedMaterialTabs.length > 0 || selfCheckRowsModel.length > 0"
        class="archive-template-editor__tabs-wrap"
      >
        <UiSectionTabs
          v-model="editorActiveTab"
          :items="editorTabItems"
          compact
          divided
          class="archive-template-editor__tabs"
        />
        <div
          v-for="group in groupedMaterialTabs"
          v-show="editorActiveTab === group.tabKey"
          :key="group.tabKey"
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
                <UiInput
                  size="sm" v-model="record.catalogCode"
                />
              </template>
              <template v-else-if="column.key === 'catalogName'">
                <UiInput
                  size="sm" v-model="record.catalogName"
                />
              </template>
              <template v-else-if="column.key === 'categoryGroup'">
                <UiInput
                  size="sm"
                  v-model="record.categoryGroup"
                  :placeholder="MATERIAL_GROUP_FALLBACK"
                />
              </template>
              <template v-else-if="column.key === 'requiredFlag'">
                <UiCheckbox v-model="record.requiredFlag">必交</UiCheckbox>
              </template>
              <template v-else-if="column.key === 'delayAllowedFlag'">
                <UiCheckbox v-model="record.delayAllowedFlag">允许延迟</UiCheckbox>
              </template>
              <template v-else-if="column.key === 'deliveryMode'">
                <UiSelect
                  size="sm"
                  v-model="record.deliveryMode"
                  :options="deliveryModeOptions"
                  style="width: 100%"
                />
              </template>
            </template>
          </ArchiveTemplateSortableTableShell>
        </div>
        <div v-show="editorActiveTab === EDITOR_TAB_SELF_CHECK">
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
                <UiInput
                  size="sm" v-model="selfCheckRowsModel[index].itemText"
                />
              </template>
              <template v-else-if="column.key === 'requiredFlag'">
                <UiCheckbox v-model="selfCheckRowsModel[index].requiredFlag">
                  必查
                </UiCheckbox>
              </template>
            </template>
          </ArchiveTemplateSortableTableShell>
        </div>
      </div>
      <p v-else class="archive-template-editor__empty">{{ emptyDescription }}</p>
    </template>

    <template #footer>
      <UiButton size="sm" variant="outline" :disabled="saving" @click="handleClose">取消</UiButton>
      <UiButton size="sm" variant="primary" :loading="saving" @click="handleSave">
        {{
          saveLabel
        }}
      </UiButton>
    </template>
  </UiDrawer>
</template>

<style scoped>
.archive-template-editor__tip {
  margin: 0 0 16px;
  color: var(--dp-text-secondary);
  font-size: 13px;
}

:deep(.archive-template-editor__meta) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-bottom: 12px;
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
  margin-bottom: 8px;
}

.archive-template-editor__tabs :deep(.ant-table) {
  font-size: 13px;
}

.archive-template-editor__drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: var(--dp-radius-control);
  background: transparent;
  color: var(--dp-text-secondary);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.archive-template-editor__drag-handle:hover {
  background: var(--dp-gray-100);
  color: var(--dp-text-primary);
}

.archive-template-editor__drag-handle:active {
  cursor: grabbing;
}

.archive-template-editor__empty {
  margin: 0;
  color: var(--dp-text-secondary);
  font-size: 14px;
}
</style>
