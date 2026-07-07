<!--
  培养目标选择器
  数据源：POST /api/quality/training-objectives/list-by-plan
  必传 trainingPlanId；当 trainingPlanId 缺失时组件禁用并提示
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { TrainingObjectiveVO } from '@/apis/quality/training-objective'
import { computed, onMounted, ref, watch } from 'vue'
import { trainingObjectiveApi } from '@/apis/quality/training-objective'
import { showUserError } from '@/utils/error-handler'

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
// a-select v-model:value 不接受 null，外部 emit 仍保持 string | null。
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

async function loadOptions() {
  if (!props.trainingPlanId) {
    options.value = []
    return
  }
  loading.value = true
  try {
    options.value = await trainingObjectiveApi.listByPlan(props.trainingPlanId)
  } catch (e) {
    showUserError(e, '培养目标列表加载失败')
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
      :label="`${opt.objectiveCode} · ${opt.objectiveName}`"
    >
      <span class="dp-selector-option-code">{{ opt.objectiveCode }}</span>
      {{ opt.objectiveName }}
    </a-select-option>
  </a-select>
</template>
