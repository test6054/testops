<template>
  <UiPopoverPanel
    v-model:open="open"
    title="表格列设置"
    description="统一列显示项、固定字段和保存动作，不再页面内手写 popover 结构。"
    :trigger="['click']"
    :max-width="props.width"
  >
    <slot>
      <UiButton size="sm" variant="outline">
        <template #icon>
          <SettingOutlined />
        </template>
        列设置
      </UiButton>
    </slot>

    <template #content>
      <div class="ui-column-setting-popover__body">
        <div v-for="item in props.columns" :key="item.key" class="ui-column-setting-popover__item">
          <UiCheckbox
            :model-value="isChecked(item.key) || !!item.fixed"
            :disabled="item.fixed"
            @update:model-value="handleColumnCheckedChange(item.key)"
          >
            {{ item.title }}
          </UiCheckbox>
          <UiTag v-if="item.fixed" size="sm" variant="outline" tone="gray">必选</UiTag>
        </div>
      </div>
    </template>

    <template #footer>
      <UiActionLink text="重置" @click="handleReset" />
      <UiButton size="sm" variant="outline" @click="open = false">取消</UiButton>
      <UiButton size="sm" :loading="saving" @click="handleSave">保存</UiButton>
    </template>
  </UiPopoverPanel>
</template>

<script lang="ts" setup>
import type { UiColumnSettingItem } from './types'
import { SettingOutlined } from '@ant-design/icons-vue'
import { ref, watch } from 'vue'
import UiButton from './Button.vue'
import UiTag from './Tag.vue'
import UiActionLink from './UiActionLink.vue'
import UiCheckbox from './UiCheckbox.vue'
import UiPopoverPanel from './UiPopoverPanel.vue'

defineOptions({
  name: 'UiColumnSettingPopover',
})

const modelValue = defineModel<string[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    columns?: UiColumnSettingItem[]
    width?: number
    saveHandler?: (columns: string[]) => Promise<void>
  }>(),
  {
    columns: () => [],
    width: 280,
    saveHandler: undefined,
  },
)

const emit = defineEmits<{
  (e: 'save', value: string[]): void
  (e: 'reset', value: string[]): void
}>()

const open = ref(false)
const saving = ref(false)
const localChecked = ref<Set<string>>(new Set())

const isChecked = (key: string) => localChecked.value.has(key)

const getDefaultCheckedKeys = () => {
  return props.columns.filter((item) => !item.fixed).map((item) => item.key)
}

const getOrderedResult = () => {
  return props.columns
    .filter((item) => item.fixed || localChecked.value.has(item.key))
    .map((item) => item.key)
}

const syncFromModelValue = () => {
  const currentKeySet = new Set(props.columns.map((item) => item.key))
  const fixedKeySet = new Set(props.columns.filter((item) => item.fixed).map((item) => item.key))
  const validKeys = modelValue.value.filter((key) => currentKeySet.has(key))

  if (!validKeys.length) {
    localChecked.value = new Set(getDefaultCheckedKeys())
    return
  }

  localChecked.value = new Set(validKeys.filter((key) => !fixedKeySet.has(key)))
}

watch(open, (value) => {
  if (value) syncFromModelValue()
})

const handleToggle = (key: string, checked: boolean) => {
  const next = new Set(localChecked.value)
  if (checked) next.add(key)
  else next.delete(key)
  localChecked.value = next
}

const handleColumnCheckedChange = (key: string) => {
  return (checked: boolean) => handleToggle(key, checked)
}

const handleReset = () => {
  const result = props.columns.map((item) => item.key)
  localChecked.value = new Set(getDefaultCheckedKeys())
  modelValue.value = result
  emit('reset', result)
}

const handleSave = async () => {
  const result = getOrderedResult()
  saving.value = true
  try {
    modelValue.value = result
    emit('save', result)
    if (props.saveHandler) await props.saveHandler(result)
    open.value = false
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ui-column-setting-popover__body {
  display: grid;
  gap: 8px;
}

.ui-column-setting-popover__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-control-inner, 4px);
  background: var(--dp-gray-50, #f8fafc);
}
</style>
