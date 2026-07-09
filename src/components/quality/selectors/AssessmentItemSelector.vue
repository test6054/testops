<!--
  考核环节选择器
  数据源：POST /api/quality/assessment-items/page
-->
<script setup lang="ts">
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { AssessmentItemVO } from '@/apis/quality/assessment-item'
import { computed, onMounted, ref, watch } from 'vue'
import { assessmentItemApi } from '@/apis/quality/assessment-item'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { loadSelectorFirstPage, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS } from './page-contract'

interface Props {
  value?: string | null
  qualityCourseId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
  processOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择考核环节',
  allowClear: true,
  disabled: false,
  width: '100%',
  processOnly: false,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: AssessmentItemVO]
}>()

const options = ref<AssessmentItemVO[]>([])
const loading = ref(false)
const searchText = ref('')
const internalValue = ref<string | undefined>(props.value ?? undefined)

const effectiveDisabled = computed(() => props.disabled || !props.qualityCourseId)
const effectivePlaceholder = computed(() =>
  props.qualityCourseId ? props.placeholder : '请先选择质量评价课程',
)

const filteredOptions = computed(() =>
  props.processOnly ? options.value.filter((o) => o.isProcessOriented) : options.value,
)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.qualityCourseId,
  (id) => {
    if (id) {
      loadOptions()
    } else {
      options.value = []
      internalValue.value = undefined
      emit('update:value', null)
    }
  },
)

async function loadOptions(keyword?: string) {
  if (!props.qualityCourseId) return
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      assessmentItemApi.page({
        pageNum,
        pageSize,
        qualityCourseId: props.qualityCourseId!,
        keyword: (keyword ?? searchText.value)?.trim() || undefined,
      }),
    )
  } catch (e) {
    showUserError(e, '考核环节列表加载失败')
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

function handleChange(val: SelectValue, _option: DefaultOptionType | DefaultOptionType[]) {
  const next: string | null = typeof val === 'string' ? val : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => o.id === next)
  emit('update:value', next)
  emit('change', next, option)
}

onMounted(() => {
  if (props.qualityCourseId) loadOptions()
})

defineExpose({ reload: loadOptions })
</script>

<template>
  <a-select
    :value="internalValue"
    :placeholder="effectivePlaceholder"
    :allow-clear="allowClear"
    :disabled="effectiveDisabled"
    :loading="loading"
    :style="{ width: typeof width === 'number' ? `${width}px` : width }"
    show-search
    :filter-option="false"
    @search="handleSearch"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in filteredOptions"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.itemCode} · ${opt.itemName}`"
    >
      <span class="dp-selector-option-code">{{ opt.itemCode }}</span>
      {{ opt.itemName }}
      <UiTag v-if="opt.isProcessOriented" tone="green" class="dp-selector-option-tag-gap">
        过程
      </UiTag>
      <span class="dp-selector-option-meta">满分 {{ opt.fullScore }}</span>
    </a-select-option>
  </a-select>
</template>
