<!--
  考核环节选择器
  数据源：POST /api/quality/assessment-items/list-by-course
  必传 qualityCourseId
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { AssessmentItemVO } from '@/apis/quality'
import { computed, onMounted, ref, watch } from 'vue'
import { assessmentItemApi } from '@/apis/quality'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { requireArrayResult } from './page-contract'

interface Props {
  value?: string | null
  qualityCourseId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
  /** 只显示过程性评价节点的环节 */
  processOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择考核环节',
  allowClear: true,
  disabled: false,
  width: '100%',
  processOnly: false,
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: AssessmentItemVO]
}>()

const options = ref<AssessmentItemVO[]>([])
const loading = ref(false)
// a-select v-model:value 不接受 null，外部 emit 仍保持 string | null。
const internalValue = ref<string | undefined>(props.value ?? undefined)

const effectiveDisabled = computed(() => props.disabled || !props.qualityCourseId)
const effectivePlaceholder = computed(() =>
  props.qualityCourseId ? props.placeholder : '请先选择质量评价课程',
)

const filteredOptions = computed(() =>
  props.processOnly ? options.value.filter((o) => o.isProcessOriented) : options.value,
)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => props.qualityCourseId,
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
  if (!props.qualityCourseId) return
  loading.value = true
  try {
    options.value = requireArrayResult(
      await assessmentItemApi.listByCourse(props.qualityCourseId),
      '考核环节',
    )
  } catch (e) {
    showUserError(e, '考核环节列表加载失败')
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
  if (props.qualityCourseId) loadOptions()
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
      v-for="opt in filteredOptions"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.itemCode} · ${opt.itemName}`"
    >
      <span class="text-xs text-gray-500 mr-1">{{ opt.itemCode }}</span>
      {{ opt.itemName }}
      <UiTag v-if="opt.isProcessOriented" tone="green" class="ml-1">过程</UiTag>
      <span class="text-gray-400 ml-1">满分 {{ opt.fullScore }}</span>
    </a-select-option>
  </a-select>
</template>
