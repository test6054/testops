<!--
  考核环节选择器
  数据源：POST /api/quality/assessment-items/list-by-course
  必传 qualityCourseId
-->
<script setup lang="ts">
import type { AssessmentItemVO } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { assessmentItemApi } from '@/apis/quality'

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
  'change': [value: string | null, option?: AssessmentItemVO]
}>()

const options = ref<AssessmentItemVO[]>([])
const loading = ref(false)
const internalValue = ref<string | null>(props.value ?? null)

const effectiveDisabled = computed(() => props.disabled || !props.qualityCourseId)
const effectivePlaceholder = computed(() =>
  props.qualityCourseId ? props.placeholder : '请先选择质量评价课程',
)

const filteredOptions = computed(() =>
  props.processOnly ? options.value.filter(o => o.isProcessOriented) : options.value,
)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

watch(() => props.qualityCourseId, (id) => {
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
  if (!props.qualityCourseId) return
  loading.value = true
  try {
    options.value = await assessmentItemApi.listByCourse(props.qualityCourseId) || []
  } catch (e) {
    console.error('[AssessmentItemSelector] 加载考核环节列表失败', e)
    message.error('加载考核环节列表失败')
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
      <span class="font-mono text-xs text-gray-500 mr-1">{{ opt.itemCode }}</span>
      {{ opt.itemName }}
      <a-tag v-if="opt.isProcessOriented" color="green" class="ml-1">过程</a-tag>
      <span class="text-gray-400 ml-1">满分 {{ opt.fullScore }}</span>
    </a-select-option>
  </a-select>
</template>
