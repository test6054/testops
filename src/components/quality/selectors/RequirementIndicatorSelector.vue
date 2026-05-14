<!--
  毕业要求观测点选择器
  数据源：POST /api/quality/requirement-indicators/list-by-requirement
  必传 requirementId
-->
<script setup lang="ts">
import type { RequirementIndicatorVO } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { requirementIndicatorApi } from '@/apis/quality'

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
  'change': [value: string | null, option?: RequirementIndicatorVO]
}>()

const options = ref<RequirementIndicatorVO[]>([])
const loading = ref(false)
const internalValue = ref<string | null>(props.value ?? null)

const effectiveDisabled = computed(() => props.disabled || !props.requirementId)
const effectivePlaceholder = computed(() =>
  props.requirementId ? props.placeholder : '请先选择毕业要求',
)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

watch(() => props.requirementId, (id) => {
  if (id) {
    loadOptions()
  }
  else {
    options.value = []
    internalValue.value = null
    emit('update:value', null)
  }
})

async function loadOptions() {
  if (!props.requirementId) return
  loading.value = true
  try {
    options.value = await requirementIndicatorApi.listByRequirement(props.requirementId) || []
  } catch (e) {
    console.error('[RequirementIndicatorSelector] 加载观测点列表失败', e)
    message.error('加载观测点列表失败')
  } finally {
    loading.value = false
  }
}

function handleChange(val: string | null) {
  internalValue.value = val
  const option = options.value.find(o => o.id === val)
  emit('update:value', val)
  emit('change', val, option)
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
      <span class="font-mono text-xs text-gray-500 mr-1">{{ opt.indicatorCode }}</span>
      {{ opt.indicatorName }}
      <span v-if="opt.requirementWeight != null" class="text-gray-400 ml-1">
        (权重 {{ (opt.requirementWeight * 100).toFixed(0) }}%)
      </span>
    </a-select-option>
  </a-select>
</template>
