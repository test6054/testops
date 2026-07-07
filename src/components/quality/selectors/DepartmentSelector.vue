<!--
  院系选择器
  数据源：GET /api/tenant-admin/departments/list（edu-user 真源）
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { TenantSchoolDepartmentDto } from '@/apis/quality/user-catalog'
import { onMounted, ref, watch } from 'vue'
import { departmentCatalogApi } from '@/apis/quality/user-catalog'
import { showUserError } from '@/utils/error-handler'

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
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

async function loadOptions() {
  loading.value = true
  try {
    options.value = await departmentCatalogApi.list()
  } catch (e) {
    showUserError(e, '院系列表加载失败')
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
  void loadOptions()
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
    <a-select-option v-for="opt in options" :key="opt.id" :value="opt.id" :label="opt.deptName">
      {{ opt.deptName }}
    </a-select-option>
  </a-select>
</template>
