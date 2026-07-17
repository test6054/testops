<!--
  考核环节选择器
  数据源：POST /api/quality/assessment-items/page
-->
<script setup lang="ts">
import type { AssessmentItemVO } from '@/apis/quality/assessment-item'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { assessmentItemApi } from '@/apis/quality/assessment-item'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
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

const selectOptions = computed<UiSelectOption[]>(() =>
  filteredOptions.value.map((opt) => ({
    value: opt.id,
    label: `${opt.itemCode} · ${opt.itemName}`,
  })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadOptions(val), QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

function handleChange(val: UiOptionValue | UiOptionValue[] | undefined) {
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
  <UiSelect
    v-model="internalValue"
    class="dp-quality-selector"
    :style="controlStyle"
    size="sm"
    :placeholder="effectivePlaceholder"
    :allow-clear="allowClear"
    :disabled="effectiveDisabled"
    :loading="loading"
    allow-search
    :filter-option="false"
    @search="handleSearch"
    :options="selectOptions"
    @update:model-value="handleChange"
  >
    <template #option="{ value: optionValue }">
      <template v-for="opt in filteredOptions" :key="opt.id">
        <template v-if="opt.id === optionValue">
          <span class="dp-selector-option-code">{{ opt.itemCode }}</span>
          {{ opt.itemName }}
          <UiTag v-if="opt.isProcessOriented" tone="green" class="dp-selector-option-tag-gap">
            过程
          </UiTag>
          <span class="dp-selector-option-meta">满分 {{ opt.fullScore }}</span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>
