<!--
  院系选择器
  数据源：GET /api/tenant-admin/departments/list
  业务含义：当前租户下的所有院系
-->
<script setup lang="ts">
import type { TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'

interface Props {
  value?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择院系',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  'change': [value: string | null, option?: TenantSchoolDepartmentDto]
}>()

const options = ref<TenantSchoolDepartmentDto[]>([])
const loading = ref(false)
const internalValue = ref<string | null>(props.value ?? null)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

async function loadOptions() {
  loading.value = true
  try {
    options.value = await departmentCatalogApi.list() || []
  } catch (e) {
    console.error('[DepartmentSelector] 加载院系列表失败', e)
    message.error('加载院系列表失败')
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
      :label="opt.deptName"
    >
      {{ opt.deptName }}
      <span v-if="opt.deptCode" class="text-gray-400 ml-1">({{ opt.deptCode }})</span>
    </a-select-option>
  </a-select>
</template>
