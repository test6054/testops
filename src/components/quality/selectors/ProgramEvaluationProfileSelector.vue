<!--
  专业评价口径选择器
  数据源：POST /api/quality/program-evaluation-profiles/page
  - 必传 programId 时按专业过滤；不传时返回当前租户全部启用口径
  - 显示「认证类型 + 评价方法 + 评价周期」三段语义，便于教师识别
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ProgramEvaluationProfileVO } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'
import {
  ACCREDITATION_TYPE_LABEL,
  EVALUATION_METHOD_LABEL,
  programEvaluationProfileApi,
} from '@/apis/quality'

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
    const res = await programEvaluationProfileApi.page({
      pageNum: 1,
      pageSize: 200,
      enabled: props.onlyEnabled ? true : undefined,
    })
    const all = res.list || []
    options.value = props.programId ? all.filter((p) => p.programId === props.programId) : all
  } catch (e) {
    console.error('[ProgramEvaluationProfileSelector] 加载评价口径列表失败', e)
    message.error('加载评价口径列表失败')
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
      :label="`${opt.programName} · ${ACCREDITATION_TYPE_LABEL[opt.accreditationType as keyof typeof ACCREDITATION_TYPE_LABEL] || opt.accreditationType}`"
    >
      <span>{{ opt.programName }}</span>
      <span class="text-gray-400 ml-1">
        ·
        {{
          ACCREDITATION_TYPE_LABEL[
            opt.accreditationType as keyof typeof ACCREDITATION_TYPE_LABEL
          ] || opt.accreditationType
        }}
      </span>
      <span class="text-gray-400 ml-1">
        ·
        {{
          EVALUATION_METHOD_LABEL[opt.evaluationMethod as keyof typeof EVALUATION_METHOD_LABEL] || opt.evaluationMethod
        }}
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
