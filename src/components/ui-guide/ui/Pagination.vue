<template>
  <div class="ui-pagination">
    <a-pagination
      :current="current"
      :page-size="pageSize"
      :total="props.total"
      :show-size-changer="props.showSizeChanger"
      :show-quick-jumper="props.showQuickJumper"
      :page-size-options="props.pageSizeOptions"
      :show-total="props.showTotal ? renderTotal : undefined"
      v-bind="$attrs"
      @change="handleChange"
      @show-size-change="handleShowSizeChange"
    />
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'UiPagination',
  inheritAttrs: false,
})

const current = defineModel<number>('current', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })

const props = withDefaults(defineProps<{
  total: number
  showSizeChanger?: boolean
  showQuickJumper?: boolean
  showTotal?: boolean
  pageSizeOptions?: string[]
}>(), {
  showSizeChanger: true,
  showQuickJumper: false,
  showTotal: true,
  pageSizeOptions: () => ['10', '20', '50', '100'],
})

const emit = defineEmits<{
  (e: 'change', page: number, size: number): void
}>()

const renderTotal = (total: number) => `共 ${total} 条`

const handleChange = (page: number, size: number) => {
  current.value = page
  pageSize.value = size
  emit('change', page, size)
}

const handleShowSizeChange = (page: number, size: number) => {
  current.value = page
  pageSize.value = size
  emit('change', page, size)
}
</script>

<style scoped>
.ui-pagination {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.ui-pagination :deep(.ant-pagination) {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-xs);
  color: var(--dp-text-secondary);
  font-family: var(--dp-font-family);
}

.ui-pagination :deep(.ant-pagination-item),
.ui-pagination :deep(.ant-pagination-prev),
.ui-pagination :deep(.ant-pagination-next) {
  min-width: 32px;
  height: 32px;
  border-radius: var(--dp-radius-control);
  border-color: transparent;
  background: transparent;
  transition: all var(--dp-duration-fast) var(--dp-ease-default);
}

.ui-pagination :deep(.ant-pagination-item:hover),
.ui-pagination :deep(.ant-pagination-prev:hover),
.ui-pagination :deep(.ant-pagination-next:hover) {
  background: var(--dp-gray-100);
  border-color: transparent;
}

.ui-pagination :deep(.ant-pagination-item a) {
  color: var(--dp-text-secondary);
}

.ui-pagination :deep(.ant-pagination-item:hover a) {
  color: var(--dp-text-primary);
}

.ui-pagination :deep(.ant-pagination-item-active) {
  border-color: transparent;
  background: var(--dp-blue-50);
}

.ui-pagination :deep(.ant-pagination-item-active:hover) {
  background: var(--dp-blue-100);
}

.ui-pagination :deep(.ant-pagination-item-active a) {
  color: var(--dp-blue-700);
  font-weight: 700;
}
</style>
