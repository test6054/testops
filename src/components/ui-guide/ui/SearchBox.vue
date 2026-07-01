<template>
  <div class="dp-search-box">
    <a-input
      v-model:value="localValue"
      :placeholder="placeholder"
      :allow-clear="allowClear"
      :disabled="disabled"
      :size="size"
      v-bind="$attrs"
      @press-enter="handleSearch"
    >
      <template #prefix>
        <SearchOutlined />
      </template>
    </a-input>
  </div>
</template>

<script lang="ts" setup>
import type { SizeType } from 'ant-design-vue/es/config-provider'
import SearchOutlined from '@ant-design/icons-vue/SearchOutlined'
import { ref, watch } from 'vue'

defineOptions({
  name: 'UiSearchBox',
  inheritAttrs: false,
})

const modelValue = defineModel<string>()

const {
  placeholder = '请输入搜索内容',
  allowClear = true,
  disabled = false,
  size = 'middle',
} = defineProps<{
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  size?: SizeType
}>()

const emit = defineEmits<{
  (e: 'search', value: string): void
  (e: 'clear'): void
}>()

// 本地值，用于双向绑定（解决中文输入问题）
const localValue = ref(modelValue.value || '')

// 同步外部值到本地
watch(modelValue, (val) => {
  localValue.value = val || ''
})

// 同步本地值到外部
watch(localValue, (val, oldVal) => {
  modelValue.value = val
  if (val === '' && oldVal) {
    emit('clear')
  }
})

/**
 * 处理回车搜索
 */
const handleSearch = () => {
  emit('search', localValue.value || '')
}
</script>

<style>
.dp-search-box {
  min-width: 0;
}

.dp-search-box .ant-input-affix-wrapper {
  min-height: 36px;
  border-radius: var(--dp-radius-control, 4px);
  border: 1px solid var(--dp-border, #e5e7eb);
  background-color: var(--dp-bg-control, #f3f4f6);
  font-size: 14px;
  color: var(--dp-text-primary, #0f172a);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.dp-search-box .ant-input-affix-wrapper:hover {
  border-color: var(--dp-blue-600, #2563eb);
}

.dp-search-box .ant-input-affix-wrapper-focused {
  border-color: var(--dp-blue-600, #2563eb);
  box-shadow: 0 0 0 3px var(--dp-focus-ring, rgba(37, 99, 235, 0.25));
}

.dp-search-box .ant-input {
  background-color: transparent;
  color: var(--dp-text-primary, #0f172a);
}

.dp-search-box .ant-input::placeholder {
  color: var(--dp-text-muted, #6b7280);
}

.dp-search-box .ant-input-prefix {
  color: var(--dp-text-muted, #6b7280);
  margin-right: 8px;
}

.dp-search-box .ant-input-affix-wrapper-disabled {
  background: var(--dp-bg-control-disabled, #eef2f7);
}
</style>
