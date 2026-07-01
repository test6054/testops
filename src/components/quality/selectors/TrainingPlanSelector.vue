<!--
  培养方案选择器
  数据源：POST /api/quality/training-plans/page
  可传 programId 过滤，默认只显示 CONFIRMED 且 enabled=true 的方案
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { TrainingPlanVO } from '@/apis/quality/training-plan'
import { trainingPlanApi } from '@/apis/quality/training-plan'
import { onMounted, ref, watch } from 'vue'
import { showUserError } from '@/utils/error-handler'
import { requireAllPages } from './page-contract'

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
  change: [value: string | null, option?: TrainingPlanVO]
}>()

const options = ref<TrainingPlanVO[]>([])
const loading = ref(false)
// a-select v-model:value 不接受 null，外部 emit 仍保持 string | null。
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.programId,
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    options.value = await requireAllPages(
      (pageNum) =>
        trainingPlanApi.page({
          pageNum,
          pageSize: 100,
          programId: props.programId || undefined,
          enabled: props.onlyEnabled ? true : undefined,
          confirmationStatus: props.onlyConfirmed ? 'CONFIRMED' : undefined,
        }),
      '培养方案',
    )
  } catch (e) {
    showUserError(e, '培养方案列表加载失败')
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
      <span class="dp-selector-option-code">{{ opt.planCode }}</span>
      {{ opt.planName }}
      <span v-if="opt.schoolYear" class="dp-selector-option-meta">({{ opt.schoolYear }})</span>
    </a-select-option>
  </a-select>
</template>
