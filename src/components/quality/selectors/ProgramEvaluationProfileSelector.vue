<!--
  专业评价口径选择器
  数据源：POST /api/quality/program-evaluation-profiles/page
  - 必传 programId 时按专业过滤；不传时返回当前租户全部启用口径
  - 显示「认证类型 + 评价方法 + 评价周期」三段语义，便于教师识别
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type {
  AccreditationType,
  EvaluationMethod,
  ProgramEvaluationProfileVO,
} from '@/apis/quality'
import { onMounted, ref, watch } from 'vue'
import {
  ACCREDITATION_TYPE_LABEL,
  EVALUATION_METHOD_LABEL,
  programEvaluationProfileApi,
} from '@/apis/quality'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { requireAllPages } from './page-contract'

interface Props {
  value?: string | null
  /** 按专业大类过滤 */
  programId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
  /** 是否仅显示启用 */
  onlyEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择评价口径',
  allowClear: true,
  disabled: false,
  width: '100%',
  onlyEnabled: true,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: ProgramEvaluationProfileVO]
}>()

const options = ref<ProgramEvaluationProfileVO[]>([])
const loading = ref(false)
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
    const all = await requireAllPages(
      (pageNum) =>
        programEvaluationProfileApi.page({
          pageNum,
          pageSize: 100,
          enabled: props.onlyEnabled ? true : undefined,
        }),
      '专业评价口径',
    )
    options.value = props.programId ? all.filter((p) => p.programId === props.programId) : all
  } catch (e) {
    showUserError(e, '评价口径列表加载失败')
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

function accreditationTypeLabel(value: AccreditationType) {
  return strictEnumLabel(ACCREDITATION_TYPE_LABEL, value, '认证类型')
}

function evaluationMethodLabel(value: EvaluationMethod) {
  return strictEnumLabel(EVALUATION_METHOD_LABEL, value, '评价方法')
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
      :label="`${opt.programName} · ${accreditationTypeLabel(opt.accreditationType)}`"
    >
      <span>{{ opt.programName }}</span>
      <span class="text-gray-400 ml-1">
        ·
        {{ accreditationTypeLabel(opt.accreditationType) }}
      </span>
      <span class="text-gray-400 ml-1">
        ·
        {{ evaluationMethodLabel(opt.evaluationMethod) }}
      </span>
    </a-select-option>
  </a-select>
</template>

<style scoped>
.text-gray-400 {
  color: rgba(0, 0, 0, 0.45);
}

.ml-1 {
  margin-left: 4px;
}
</style>
