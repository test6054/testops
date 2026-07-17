<!--
  毕业要求选择器
  数据源：POST /api/quality/graduation-requirements/page
-->
<script setup lang="ts">
import type { GraduationRequirementVO } from '@/apis/quality/graduation-requirement'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { graduationRequirementApi } from '@/apis/quality/graduation-requirement'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
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
  placeholder: '请选择毕业要求',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: GraduationRequirementVO]
}>()

const options = ref<GraduationRequirementVO[]>([])
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
      graduationRequirementApi.page({
        pageNum,
        pageSize,
        trainingPlanId: props.trainingPlanId!,
        keyword: (keyword ?? searchText.value)?.trim() || undefined,
      }),
    )
  } catch (e) {
    showUserError(e, '毕业要求列表加载失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: `${opt.requirementCode} · ${opt.requirementName}`,
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
  if (props.trainingPlanId) {
    loadOptions()
  }
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
      <template v-for="opt in options" :key="opt.id">
        <template v-if="opt.id === optionValue">
          <span class="dp-selector-option-code">{{ opt.requirementCode }}</span>
          {{ opt.requirementName }}
        </template>
      </template>
    </template>
  </UiSelect>
</template>
