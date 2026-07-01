<!--
  毕业要求观测点选择器
  数据源：POST /api/quality/requirement-indicators/list-by-requirement
  必传 requirementId
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { RequirementIndicatorVO } from '@/apis/quality/requirement-indicator'
import { requirementIndicatorApi } from '@/apis/quality/requirement-indicator'
import { computed, onMounted, ref, watch } from 'vue'
import { showUserError } from '@/utils/error-handler'
import { requireArrayResult } from './page-contract'

interface Props {
  value?: string | null
  requirementId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择观测点',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  change: [value: string | null, option?: RequirementIndicatorVO]
}>()

const options = ref<RequirementIndicatorVO[]>([])
const loading = ref(false)
// a-select v-model:value 不接受 null，外部 emit 仍保持 string | null。
const internalValue = ref<string | undefined>(props.value ?? undefined)

const effectiveDisabled = computed(() => props.disabled || !props.requirementId)
const effectivePlaceholder = computed(() =>
  props.requirementId ? props.placeholder : '请先选择毕业要求',
)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.requirementId,
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

async function loadOptions() {
  if (!props.requirementId) return
  loading.value = true
  try {
    options.value = requireArrayResult(
      await requirementIndicatorApi.listByRequirement(props.requirementId),
      '毕业要求观测点',
    )
  } catch (e) {
    showUserError(e, '观测点列表加载失败')
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
  if (props.requirementId) loadOptions()
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
    option-filter-prop="label"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.indicatorCode} · ${opt.indicatorName}`"
    >
      <span class="dp-selector-option-code">{{ opt.indicatorCode }}</span>
      {{ opt.indicatorName }}
      <span v-if="opt.requirementWeight != null" class="dp-selector-option-meta">
        (权重 {{ (opt.requirementWeight * 100).toFixed(0) }}%)
      </span>
    </a-select-option>
  </a-select>
</template>
