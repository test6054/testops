<!--
  材料归档选择器
  数据源：POST /api/quality/archives/page
  常用过滤：businessType / archiveCategory / archiveOfficeConfirmed
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ArchiveVO } from '@/apis/quality/archive'
import type { ArchiveBusinessTypeCode } from '@/apis/quality/types'
import { onMounted, ref, watch } from 'vue'
import { archiveApi } from '@/apis/quality/archive'
import { ArchiveBusinessTypeDescription } from '@/apis/quality/types'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { requireAllPages } from './page-contract'

interface Props {
  value?: string | null
  businessType?: ArchiveBusinessTypeCode | null
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
  "change": [value: string | null, option?: ArchiveVO]
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
    options.value = await requireAllPages(
      (pageNum) =>
        archiveApi.page({
          pageNum,
          pageSize: 100,
          businessType: props.businessType || undefined,
          archiveCategory: props.archiveCategory || undefined,
          archiveOfficeConfirmed: props.onlyConfirmed ? true : undefined,
        }),
      '材料归档',
    )
  } catch (e) {
    showUserError(e, '质量档案列表加载失败')
  } finally {
    loading.value = false
  }
}

function archiveBusinessTypeLabel(value: ArchiveBusinessTypeCode): string {
  return strictEnumLabel(ArchiveBusinessTypeDescription, value, '归档业务类型')
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
      <span class="dp-selector-option-code">{{ opt.archiveCode }}</span>
      <span v-if="opt.fileName">{{ opt.fileName }}</span>
      <span v-if="opt.businessType" class="dp-selector-option-meta">
        · {{ archiveBusinessTypeLabel(opt.businessType) }}
      </span>
    </a-select-option>
  </a-select>
</template>

<style scoped>
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
