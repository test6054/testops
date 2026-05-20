<!--
  材料归档选择器
  数据源：POST /api/quality/archives/page
  常用过滤：businessType / archiveCategory / archiveOfficeConfirmed
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ArchiveVO } from '@/apis/quality'
import { archiveApi } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'

interface Props {
  value?: string | null
  businessType?: string | null
  archiveCategory?: string | null
  /** 仅返回已被档案室确认的归档 */
  onlyConfirmed?: boolean
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择归档',
  allowClear: true,
  disabled: false,
  width: '100%',
  onlyConfirmed: false,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  change: [value: string | null, option?: ArchiveVO]
}>()

const options = ref<ArchiveVO[]>([])
const loading = ref(false)
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => [props.businessType, props.archiveCategory, props.onlyConfirmed],
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    const res = await archiveApi.page({
      pageNum: 1,
      pageSize: 200,
      businessType: props.businessType || undefined,
      archiveCategory: props.archiveCategory || undefined,
      archiveOfficeConfirmed: props.onlyConfirmed ? true : undefined,
    })
    options.value = res.list || []
  } catch (e) {
    console.error('[ArchiveSelector] 加载归档列表失败', e)
    message.error('加载归档列表失败')
  } finally {
    loading.value = false
  }
}

function handleChange(val: SelectValue) {
  const next: string | null = typeof val === 'string' ? val : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => o.id === next)
  emit('update:value', next)
  emit('change', next, option)
}

onMounted(() => {
  loadOptions()
})

defineExpose({ reload: loadOptions })
</script>

<template>
  <a-select
    :value="internalValue"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :disabled="disabled"
    :loading="loading"
    :style="{ width: typeof width === 'number' ? `${width}px` : width }"
    show-search
    option-filter-prop="label"
    @change="handleChange"
  >
    <a-select-option v-for="opt in options" :key="opt.id" :value="opt.id" :label="opt.archiveCode">
      <span class="font-mono text-xs text-gray-500 mr-1">{{ opt.archiveCode }}</span>
      <span v-if="opt.fileName">{{ opt.fileName }}</span>
      <span v-if="opt.businessType" class="text-gray-400 ml-1">· {{ opt.businessType }}</span>
    </a-select-option>
  </a-select>
</template>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.text-xs {
  font-size: 12px;
}

.text-gray-500 {
  color: rgba(0, 0, 0, 0.45);
}

.text-gray-400 {
  color: rgba(0, 0, 0, 0.45);
}

.mr-1 {
  margin-right: 4px;
}

.ml-1 {
  margin-left: 4px;
}
</style>
