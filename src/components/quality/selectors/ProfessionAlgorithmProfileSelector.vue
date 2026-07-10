<!--
  专业算法实例选择器
  数据源：POST /api/quality/profession-algorithm-profiles/page
  - 必传 programId 时按专业过滤；不传时返回当前租户全部启用实例
  - 显示「实例编码 + 实例名称 + 认证类型」三段语义
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ProfessionAlgorithmProfileVO } from '@/apis/quality/profession-algorithm-profile'
import type { AccreditationTypeCode } from '@/apis/quality/types'
import { onMounted, ref, watch } from 'vue'
import { professionAlgorithmProfileApi } from '@/apis/quality/profession-algorithm-profile'
import { AccreditationTypeDescription } from '@/apis/quality/types'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { loadSelectorFirstPage, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS } from './page-contract'

interface Props {
  value?: string | null
  /** 按专业大类过滤 */
  programId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
  /** 是否仅显示启用 */
  onlyEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择专业算法实例',
  allowClear: true,
  disabled: false,
  width: '100%',
  onlyEnabled: true,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: ProfessionAlgorithmProfileVO]
}>()

const options = ref<ProfessionAlgorithmProfileVO[]>([])
const loading = ref(false)
const searchText = ref('')
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.programId,
  () => loadOptions(),
)

async function loadOptions(keyword?: string) {
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      professionAlgorithmProfileApi.page({
        pageNum,
        pageSize,
        programId: props.programId || undefined,
        enabled: props.onlyEnabled ? true : undefined,
        keyword: (keyword ?? searchText.value)?.trim() || undefined,
      }),
    )
  } catch (e) {
    showUserError(e, '专业算法实例列表加载失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadOptions(val), QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

function handleChange(val: SelectValue) {
  const next: string | null = typeof val === 'string' ? val : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => o.id === next)
  emit('update:value', next)
  emit('change', next, option)
}

function accreditationTypeLabel(value: AccreditationTypeCode) {
  return strictEnumLabel(AccreditationTypeDescription, value, '认证类型')
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
    :filter-option="false"
    @search="handleSearch"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.profileCode} · ${opt.profileName}`"
    >
      <span class="dp-selector-option-code">{{ opt.profileCode }}</span>
      {{ opt.profileName }}
      <span class="dp-selector-option-meta">
        ·
        {{ accreditationTypeLabel(opt.accreditationType) }}
      </span>
    </a-select-option>
  </a-select>
</template>
