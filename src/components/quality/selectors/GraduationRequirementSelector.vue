<!--
  毕业要求选择器
  数据源：POST /api/quality/graduation-requirements/list-by-plan
  必传 trainingPlanId；当 trainingPlanId 缺失时组件禁用并提示
-->
<script setup lang="ts">
import type { GraduationRequirementVO } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { graduationRequirementApi } from '@/apis/quality'

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
  'change': [value: string | null, option?: GraduationRequirementVO]
}>()

const options = ref<GraduationRequirementVO[]>([])
const loading = ref(false)
const internalValue = ref<string | null>(props.value ?? null)

const effectiveDisabled = computed(() => props.disabled || !props.trainingPlanId)
const effectivePlaceholder = computed(() =>
  props.trainingPlanId ? props.placeholder : '请先选择培养方案',
)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

watch(
  () => props.trainingPlanId,
  (planId) => {
    if (planId) {
      loadOptions()
    } else {
      options.value = []
      internalValue.value = null
      emit('update:value', null)
    }
  },
)

async function loadOptions() {
  if (!props.trainingPlanId) {
    options.value = []
    return
  }
  loading.value = true
  try {
    options.value = await graduationRequirementApi.listByPlan(props.trainingPlanId) || []
  } catch (e) {
    console.error('[GraduationRequirementSelector] 加载毕业要求列表失败', e)
    message.error('加载毕业要求列表失败')
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
    option-filter-prop="label"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.requirementCode} · ${opt.requirementName}`"
    >
      <span class="font-mono text-xs text-gray-500 mr-1">{{ opt.requirementCode }}</span>
      {{ opt.requirementName }}
    </a-select-option>
  </a-select>
</template>
