<!--
  培养目标选择器
  数据源：POST /api/quality/training-objectives/page
-->
<script setup lang="ts">
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'
import type { TrainingObjectiveVO } from '@/apis/quality/training-objective'
import { computed, onMounted, ref, watch } from 'vue'
import { trainingObjectiveApi } from '@/apis/quality/training-objective'
import { showUserError } from '@/utils/error-handler'
import { loadSelectorFirstPage, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS } from './page-contract'

interface Props {
  value?: string | null
  trainingPlanId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择培养目标',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: TrainingObjectiveVO]
}>()

const options = ref<TrainingObjectiveVO[]>([])
const loading = ref(false)
const searchText = ref('')
const internalValue = ref<string | undefined>(props.value ?? undefined)

const effectiveDisabled = computed(() => props.disabled || !props.trainingPlanId)
const effectivePlaceholder = computed(() =>
  props.trainingPlanId ? props.placeholder : '请先选择培养方案',
)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.trainingPlanId,
  (planId) => {
    if (planId) {
      loadOptions()
    } else {
      options.value = []
      internalValue.value = undefined
      emit('update:value', null)
    }
  },
)

async function loadOptions(keyword?: string) {
  if (!props.trainingPlanId) {
    options.value = []
    return
  }
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      trainingObjectiveApi.page({
        pageNum,
        pageSize,
        trainingPlanId: props.trainingPlanId!,
        keyword: (keyword ?? searchText.value)?.trim() || undefined,
      }),
    )
  } catch (e) {
    showUserError(e, '培养目标列表加载失败')
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
  if (props.trainingPlanId) {
    loadOptions()
  }
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
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.objectiveCode} · ${opt.objectiveName}`"
    >
      <span class="dp-selector-option-code">{{ opt.objectiveCode }}</span>
      {{ opt.objectiveName }}
    </a-select-option>
  </a-select>
</template>
