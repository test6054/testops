<!--
  培养方案选择�?  数据源：POST /api/quality/training-plans/page
  可传 programId 过滤，默认只显示 CONFIRMED �?enabled=true 的方�? -->
<script setup lang="ts">
import type { TrainingPlanVO } from '@/apis/quality/training-plan'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { normalizeTrainingPlanId, trainingPlanApi } from '@/apis/quality/training-plan'
import { ConfirmationStatusCode } from '@/apis/quality/types'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { showUserError } from '@/utils/error-handler'
import { loadSelectorFirstPage, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS } from './page-contract'

interface Props {
  value?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
  /** 按专业过�? */
  programId?: string | null
  /** 是否仅显示已确认 */
  onlyConfirmed?: boolean
  /** 是否仅显示启�? */
  onlyEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择培养方案',
  allowClear: true,
  disabled: false,
  width: '100%',
  onlyConfirmed: false,
  onlyEnabled: true,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: TrainingPlanVO]
}>()

const options = ref<TrainingPlanVO[]>([])
const loading = ref(false)
const searchText = ref('')
// a-select v-model:value 不接受 null，对外 emit 仍保持 string | null。
const internalValue = ref<string | undefined>(
  props.value ? normalizeTrainingPlanId(props.value) || undefined : undefined,
)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ? normalizeTrainingPlanId(v) || undefined : undefined
    void ensureSelectedOptionVisible()
  },
)

watch(
  () => props.programId,
  () => loadOptions(),
)

async function ensureSelectedOptionVisible(): Promise<void> {
  const selectedId = internalValue.value
  if (!selectedId || options.value.some((item) => item.id === selectedId)) {
    return
  }
  try {
    const detail = await trainingPlanApi.detail(selectedId)
    options.value = [detail, ...options.value]
    if (detail.id !== selectedId) {
      internalValue.value = detail.id
      emit('update:value', detail.id)
      emit('change', detail.id, detail)
    }
  } catch (e) {
    showUserError(e, '培养方案详情加载失败')
    internalValue.value = undefined
    emit('update:value', null)
    emit('change', null, undefined)
  }
}

async function loadOptions(keyword?: string) {
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      trainingPlanApi.page({
        pageNum,
        pageSize,
        programId: props.programId || undefined,
        enabled: props.onlyEnabled ? true : undefined,
        confirmationStatus: props.onlyConfirmed ? ConfirmationStatusCode.CONFIRMED : undefined,
        keyword: (keyword ?? searchText.value)?.trim() || undefined,
      }),
    )
    await ensureSelectedOptionVisible()
  } catch (e) {
    showUserError(e, '培养方案列表加载失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: `${opt.planCode} · ${opt.planName}`,
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

function normalizeSelectValue(val: UiOptionValue | UiOptionValue[] | undefined): string | null {
  if (val === null || val === undefined) {
    return null
  }
  if (typeof val === 'string') {
    const trimmed = val.trim()
    return trimmed || null
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return String(val)
  }
  return null
}

function handleChange(val: UiOptionValue | UiOptionValue[] | undefined) {
  const next = normalizeSelectValue(val)
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
  <UiSelect
    v-model="internalValue"
    class="dp-quality-selector"
    :style="controlStyle"
    size="sm"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :disabled="disabled"
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
          <span class="dp-selector-option-code">{{ opt.planCode }}</span>
          {{ opt.planName }}
          <span v-if="opt.schoolYear" class="dp-selector-option-meta">({{ opt.schoolYear }})</span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>
