<template>
  <a-form-item class="dp-form-list" v-bind="formItemBind">
    <div class="dp-form-list__container" :class="{ 'is-disabled': disabled }">
      <TransitionGroup name="dp-form-list" tag="div" class="dp-form-list__items">
        <div
          v-for="(item, index) in list"
          :key="getItemKey(item, index)"
          class="dp-form-list__card"
        >
          <div class="dp-form-list__header">
            <div class="dp-form-list__title">
              <span class="dp-form-list__badge">{{ index + 1 }}</span>
              <div class="dp-form-list__text">
                <slot name="item-title" :index="index" :item="item">
                  {{ resolveItemTitle(index) }}
                </slot>
              </div>
            </div>
            <div class="dp-form-list__actions">
              <UiButton
                v-if="sortable"
                variant="ghost"
                size="sm"
                icon-only
                :disabled="index === 0 || disabled"
                title="上移"
                @click="moveItem(index, -1)"
              >
                <template #icon>
                  <ArrowUpOutlined />
                </template>
              </UiButton>
              <UiButton
                v-if="sortable"
                variant="ghost"
                size="sm"
                icon-only
                :disabled="index === list.length - 1 || disabled"
                title="下移"
                @click="moveItem(index, 1)"
              >
                <template #icon>
                  <ArrowDownOutlined />
                </template>
              </UiButton>
              <UiActionLink danger :disabled="!canRemoveItem" @click="removeItem(index)">
                <template #icon>
                  <DeleteOutlined />
                </template>
                删除
              </UiActionLink>
            </div>
          </div>

          <div class="dp-form-list__body">
            <slot
              :item="item"
              :index="index"
              :update="slotUpdate(index)"
              :remove="() => removeItem(index)"
              :move-up="() => moveItem(index, -1)"
              :move-down="() => moveItem(index, 1)"
            />
          </div>
        </div>
      </TransitionGroup>

      <div v-if="!list.length" class="dp-form-list__empty">
        <slot name="empty">
          <UiEmpty :description="emptyText" />
        </slot>
      </div>

      <UiButton
        class="dp-form-list__add"
        variant="outline"
        block
        :disabled="!canAdd"
        @click="addItem"
      >
        <template #icon>
          <PlusOutlined class="dp-form-list__add-icon" />
        </template>
        {{ addText }}
      </UiButton>
    </div>
  </a-form-item>
</template>

<script generic="T extends Record<string, unknown> = Record<string, unknown>" lang="ts" setup>
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue'
import { cloneDeep } from 'lodash-es'
import { computed } from 'vue'
import UiButton from './Button.vue'
import UiEmpty from './Empty.vue'
import UiActionLink from './UiActionLink.vue'

defineOptions({ name: 'UiFormList' })

const modelValue = defineModel<T[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    label?: string
    description?: string
    field?: string
    itemTitle?: string | ((index: number) => string)
    addText?: string
    min?: number
    max?: number
    disabled?: boolean
    sortable?: boolean
    rowKey?: string | ((item: T, index: number) => string | number)
    createItem?: () => T
    emptyText?: string
    formItemProps?: Record<string, unknown>
  }>(),
  {
    itemTitle: '列表项',
    addText: '添加一行',
    min: 0,
    sortable: true,
    emptyText: '暂无数据，点击添加一行',
    formItemProps: () => ({}),
  },
)

const emit = defineEmits<{
  add: [item: T, index: number]
  remove: [item: T, index: number]
  reorder: [payload: { from: number; to: number }]
}>()

const list = computed(() => modelValue.value || [])

const minItems = computed(() => props.min ?? 0)

const canAdd = computed(() => {
  if (props.disabled) return false
  if (props.max === undefined) return true
  return list.value.length < props.max
})

const canRemoveItem = computed(() => {
  if (props.disabled) return false
  return list.value.length > minItems.value
})

const formItemBind = computed(() => ({
  label: props.label,
  name: props.field,
  extra: props.description,
  ...props.formItemProps,
}))

const resolveItemTitle = (index: number) => {
  if (typeof props.itemTitle === 'function') return props.itemTitle(index)
  if (props.itemTitle) return `${props.itemTitle} ${index + 1}`
  return `列表项 ${index + 1}`
}

const getItemKey = (item: T, index: number): string | number => {
  if (typeof props.rowKey === 'function') return props.rowKey(item, index)
  if (props.rowKey && item[props.rowKey] !== undefined) return item[props.rowKey] as string | number
  return index
}

const buildItem = (): T => {
  if (typeof props.createItem === 'function') {
    const result = props.createItem()
    if (result && typeof result === 'object') return cloneDeep(result)
    return result ?? ({} as T)
  }
  return {} as T
}

const updateItem = (index: number, payload: Partial<T> | ((origin: T) => T)) => {
  const next = list.value.slice()
  const current = next[index] ?? ({} as T)
  next[index] = typeof payload === 'function' ? payload(current) : ({ ...current, ...payload } as T)
  modelValue.value = next
}

/** 为模板 slot 提供类型安全的更新回调 */
const slotUpdate = (index: number) => (payload: Partial<T> | ((origin: T) => T)) =>
  updateItem(index, payload)

const addItem = () => {
  if (!canAdd.value) return
  const next = [...list.value, buildItem()]
  modelValue.value = next
  emit('add', next[next.length - 1], next.length - 1)
}

const removeItem = (index: number) => {
  if (!canRemoveItem.value) return
  const next = list.value.slice()
  const removed = next.splice(index, 1)[0]
  modelValue.value = next
  emit('remove', removed, index)
}

const moveItem = (index: number, offset: number) => {
  if (!props.sortable || props.disabled) return
  const target = index + offset
  if (target < 0 || target >= list.value.length) return
  const next = list.value.slice()
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  modelValue.value = next
  emit('reorder', { from: index, to: target })
}
</script>

<style scoped>
.dp-form-list__container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dp-form-list__items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dp-form-list__card {
  border: 1px solid var(--ant-color-border, var(--dp-border, #e5e7eb));
  border-radius: var(--dp-radius-lg, 8px);
  background: linear-gradient(
    180deg,
    var(--ant-color-primary-bg, var(--dp-surface-subtle, #f8fafc)) 0%,
    var(--ant-color-bg-container, var(--dp-surface, #fff)) 56%
  );
  box-shadow: var(--dp-shadow-card, 0 6px 18px rgba(15, 23, 42, 0.04));
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dp-form-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dp-form-list__title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.dp-form-list__badge {
  width: 28px;
  height: 28px;
  border-radius: var(--dp-radius-md, var(--dp-radius-control-inner, 4px));
  background: var(--ant-color-primary-bg, var(--dp-surface-subtle, #f8fafc));
  color: var(--ant-color-primary-active, var(--dp-blue-700, #1d4ed8));
  font-weight: 700;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.dp-form-list__text {
  font-weight: 700;
  font-size: 14px;
  color: var(--ant-color-text, var(--dp-text-primary, #0f172a));
}

.dp-form-list__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dp-form-list__body {
  display: grid;
  gap: 12px;
}

.dp-form-list__empty {
  border: 1px dashed var(--ant-color-border, var(--dp-border, #e5e7eb));
  border-radius: var(--dp-radius-lg, 8px);
  background: var(--ant-color-fill-tertiary, var(--dp-gray-50, #f8fafc));
  padding: 16px;
}

.dp-form-list__add {
  width: 100%;
  border-style: dashed;
  border-color: var(--ant-color-border, currentColor);
  border-radius: var(--dp-radius-lg, 8px);
  background: linear-gradient(
    90deg,
    var(--ant-color-primary-bg, var(--dp-surface-subtle, #f8fafc)) 0%,
    var(--ant-color-bg-container, var(--dp-surface, #fff))
  );
  color: var(--ant-color-primary-active, var(--dp-text-primary, #0f172a));
}

.dp-form-list__add:hover {
  border-color: var(--ant-color-primary);
  color: var(--ant-color-primary);
  background: var(--ant-color-bg-container, var(--dp-surface, #fff));
  box-shadow: var(--dp-shadow-sm, 0 4px 12px rgba(15, 23, 42, 0.08));
}

.dp-form-list__body :deep(.ant-form-item) {
  margin-bottom: 0;
}

.dp-form-list__body :deep(.ant-input),
.dp-form-list__body :deep(.ant-select-selector),
.dp-form-list__body :deep(.ant-picker),
.dp-form-list__body :deep(.ant-input-textarea) {
  border-radius: var(--ant-border-radius, 6px);
}

.dp-form-list-enter-active,
.dp-form-list-leave-active {
  transition: all 0.18s ease;
}

.dp-form-list-enter-from,
.dp-form-list-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.is-disabled {
  opacity: 0.7;
  pointer-events: none;
}
</style>
