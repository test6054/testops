<template>
  <UiDrawer
    :open="props.open"
    :title="props.title"
    :width="props.width"
    :placement="props.placement"
    :confirm-loading="props.confirmLoading"
    :ok-text="props.okText"
    :cancel-text="props.cancelText"
    :hide-footer="false"
    @update:open="handleOpenChange"
    @close="emit('cancel')"
  >
    <div class="ui-tree-selection-drawer">
      <div
        v-if="$slots.aside"
        class="ui-tree-selection-drawer__aside"
        :style="{ width: props.asideWidth }"
      >
        <slot name="aside" />
      </div>

      <div class="ui-tree-selection-drawer__main">
        <UiSearchBox
          v-model="keyword"
          :placeholder="props.searchPlaceholder"
          @search="handleSearch"
          @clear="handleClear"
        />

        <div v-if="$slots['content-top'] || props.showStats" class="ui-tree-selection-drawer__top">
          <slot name="content-top">
            <div class="ui-tree-selection-drawer__stats">
              <span>{{ props.selectionLabel }}</span>
              <strong>{{ props.selectedCount }}</strong>
              <span>{{ props.selectionSuffix }}</span>
            </div>
          </slot>
        </div>

        <div class="ui-tree-selection-drawer__body">
          <slot name="content-body-before" />

          <a-spin :spinning="props.loading" style="width: 100%">
            <a-tree
              v-if="props.treeData.length"
              class="ui-tree-selection-drawer__tree"
              :tree-data="props.treeData"
              :checked-keys="props.checkedKeys"
              :selected-keys="props.selectedKeys"
              :default-expand-all="props.defaultExpandAll"
              :default-expanded-keys="props.defaultExpandedKeys"
              :checkable="props.checkable"
              :selectable="props.selectable"
              :field-names="props.fieldNames"
              v-bind="props.treeProps"
              @check="handleCheck"
              @select="handleSelect"
            >
              <template #title="nodeData">
                <slot name="node-title" v-bind="nodeData">
                  {{ resolveNodeTitle(nodeData) }}
                </slot>
              </template>
            </a-tree>

            <UiEmpty :title="props.emptyTitle" :description="props.emptyDescription" />
          </a-spin>

          <slot name="content-body-after" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="ui-tree-selection-drawer__footer">
        <div class="ui-tree-selection-drawer__footer-left">
          <slot name="footer-left" />
        </div>

        <div class="ui-tree-selection-drawer__footer-right">
          <UiButton variant="outline" @click="emit('cancel')">
            {{ props.cancelText }}
          </UiButton>
          <UiButton
            :loading="props.confirmLoading"
            :disabled="props.confirmDisabled"
            @click="emit('confirm')"
          >
            {{ props.okText }}
          </UiButton>
        </div>
      </div>
    </template>
  </UiDrawer>
</template>

<script lang="ts" setup>
import type { Key } from 'ant-design-vue/es/vc-tree/interface'
import type { CheckInfo } from 'ant-design-vue/es/vc-tree/props'
import type { UiTreeNode } from './types'
import { computed } from 'vue'
import UiButton from './Button.vue'
import UiEmpty from './Empty.vue'
import UiSearchBox from './SearchBox.vue'
import UiDrawer from './UiDrawer.vue'

defineOptions({
  name: 'UiTreeSelectionDrawer',
})

const keyword = defineModel<string>('keyword', { default: '' })

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    width?: number | string
    placement?: 'left' | 'right' | 'top' | 'bottom'
    asideWidth?: string
    searchPlaceholder?: string
    loading?: boolean
    treeData?: UiTreeNode[]
    checkedKeys?: Key[] | { checked: Key[], halfChecked: Key[] }
    selectedKeys?: Array<string | number>
    defaultExpandAll?: boolean
    defaultExpandedKeys?: Array<string | number>
    checkable?: boolean
    selectable?: boolean
    fieldNames?: { title: string, key: string, children: string }
    treeProps?: Record<string, unknown>
    showStats?: boolean
    selectedCount?: number
    selectionLabel?: string
    selectionSuffix?: string
    confirmLoading?: boolean
    confirmDisabled?: boolean
    okText?: string
    cancelText?: string
    emptyTitle?: string
    emptyDescription?: string
  }>(),
  {
    width: 1120,
    placement: 'right',
    asideWidth: '320px',
    searchPlaceholder: '请输入关键词搜索',
    loading: false,
    treeData: () => [],
    checkedKeys: undefined,
    selectedKeys: () => [],
    defaultExpandAll: false,
    defaultExpandedKeys: () => [],
    checkable: true,
    selectable: true,
    fieldNames: () => ({
      title: 'title',
      key: 'key',
      children: 'children',
    }),
    treeProps: () => ({}),
    showStats: true,
    selectedCount: 0,
    selectionLabel: '已选择',
    selectionSuffix: '项',
    confirmLoading: false,
    confirmDisabled: false,
    okText: '确定',
    cancelText: '取消',
    emptyTitle: '当前没有可展示的内容',
    emptyDescription: '当前没有可选择内容。',
  },
)

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'search', value: string): void
  (e: 'clear'): void
  (e: 'check', checkedKeys: Key[] | { checked: Key[], halfChecked: Key[] }, info: CheckInfo): void
  (e: 'select', selectedKeys: Key[], info: unknown): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const titleField = computed(() => props.fieldNames.title || 'title')

const resolveNodeTitle = (nodeData: UiTreeNode) => {
  const value = Reflect.get(nodeData, titleField.value)
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

const handleSearch = () => {
  emit('search', keyword.value)
}

const handleClear = () => {
  emit('clear')
}

function handleOpenChange(value: boolean): void {
  emit('update:open', value)
}

const handleCheck = (
  checkedKeys: Key[] | { checked: Key[], halfChecked: Key[] },
  info: CheckInfo,
) => {
  emit('check', checkedKeys, info)
}

const handleSelect = (selectedKeys: Key[], info: unknown) => {
  emit('select', selectedKeys, info)
}
</script>

<style scoped>
.ui-tree-selection-drawer {
  display: flex;
  gap: 18px;
  min-height: calc(100vh - 220px);
}

.ui-tree-selection-drawer__aside {
  flex-shrink: 0;
}

.ui-tree-selection-drawer__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ui-tree-selection-drawer__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ui-tree-selection-drawer__stats {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--dp-text-secondary);
}

.ui-tree-selection-drawer__stats strong {
  font-size: 16px;
  color: var(--dp-text-primary);
}

.ui-tree-selection-drawer__body {
  min-height: 0;
  flex: 1;
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-panel);
  background: var(--dp-surface);
  padding: 16px;
  overflow: auto;
}

.ui-tree-selection-drawer__tree :deep(.ant-tree-list-holder-inner) {
  gap: 2px;
}

.ui-tree-selection-drawer__tree :deep(.ant-tree-node-content-wrapper) {
  border-radius: var(--dp-radius-control-inner);
}

.ui-tree-selection-drawer__tree :deep(.ant-tree-node-content-wrapper:hover) {
  background: var(--dp-blue-50);
}

.ui-tree-selection-drawer__footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.ui-tree-selection-drawer__footer-left {
  min-width: 0;
  flex: 1;
}

.ui-tree-selection-drawer__footer-right {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

@media (max-width: 1080px) {
  .ui-tree-selection-drawer {
    flex-direction: column;
    min-height: auto;
  }

  .ui-tree-selection-drawer__aside {
    width: 100% !important;
  }
}
</style>
