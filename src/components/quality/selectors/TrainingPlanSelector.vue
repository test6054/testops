<!--
  培养方案选择器
  数据源：POST /api/quality/training-plans/page
  可传 programId 过滤，默认只显示 CONFIRMED 且 enabled=true 的方案
-->
<script setup lang="ts">
import type { TrainingPlanVO } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'
import { trainingPlanApi } from '@/apis/quality'

interface Props {
  value?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
  /** 按专业过滤 */
  programId?: string | null
  /** 是否仅显示已确认 */
  onlyConfirmed?: boolean
  /** 是否仅显示启用 */
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
  'change': [value: string | null, option?: TrainingPlanVO]
}>()

const options = ref<TrainingPlanVO[]>([])
const loading = ref(false)
const internalValue = ref<string | null>(props.value ?? null)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

watch(
  () => props.programId,
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    const res = await trainingPlanApi.page({
      pageNum: 1,
      pageSize: 200,
      programId: props.programId || undefined,
      enabled: props.onlyEnabled ? true : undefined,
      confirmationStatus: props.onlyConfirmed ? 'CONFIRMED' : undefined,
    })
    options.value = res.list || []
  } catch (e) {
    console.error('[TrainingPlanSelector] 加载培养方案列表失败', e)
    message.error('加载培养方案列表失败')
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
    option-filter-prop="label"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.planCode} · ${opt.planName}`"
    >
      <span class="font-mono text-xs text-gray-500 mr-1">{{ opt.planCode }}</span>
      {{ opt.planName }}
      <span v-if="opt.schoolYear" class="text-gray-400 ml-1">({{ opt.schoolYear }})</span>
    </a-select-option>
  </a-select>
</template>
