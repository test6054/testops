<!--
  专业选择器（全局专业 Major）
  数据源：GET /api/course-catalog/majors/list
  业务含义：在 edu-quality 中，programId 指向 edu-user 的专业（Major）
-->
<script setup lang="ts">
import type { MajorVO } from '@/apis/quality/user-catalog'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'
import { majorCatalogApi } from '@/apis/quality/user-catalog'

interface Props {
  value?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择专业',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  'change': [value: string | null, option?: MajorVO]
}>()

const options = ref<MajorVO[]>([])
const loading = ref(false)
const internalValue = ref<string | null>(props.value ?? null)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

async function loadOptions() {
  loading.value = true
  try {
    options.value = await majorCatalogApi.listAll() || []
  } catch (e) {
    console.error('[ProgramSelector] 加载专业列表失败', e)
    message.error('加载专业列表失败')
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
      :label="opt.majorName"
    >
      {{ opt.majorName }}
      <span v-if="opt.courseCount != null" class="text-gray-400 ml-1">({{ opt.courseCount }} 课)</span>
    </a-select-option>
  </a-select>
</template>
