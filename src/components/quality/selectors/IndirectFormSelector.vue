<!--
  间接评价问卷选择器
  数据源：POST /api/quality/indirect-forms/page
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type {
  AchievementTargetType,
  IndirectEvaluationFormVO,
  IndirectFormType,
} from '@/apis/quality'
import { INDIRECT_FORM_TYPE_LABEL, indirectFormApi } from '@/apis/quality'
import { computed, onMounted, ref, watch } from 'vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'
import { requirePageList } from './page-contract'

interface Props {
  value?: string | null
  formType?: IndirectFormType | null
  targetType?: AchievementTargetType
  targetId?: string | null
  programId?: string | null
  enabled?: boolean
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择间接评价问卷',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  change: [value: string | null, option?: IndirectEvaluationFormVO]
}>()

const options = ref<IndirectEvaluationFormVO[]>([])
const loading = ref(false)
const searchText = ref('')
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => [props.formType, props.targetType, props.targetId, props.programId, props.enabled],
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    const res = await indirectFormApi.page({
      pageNum: 1,
      pageSize: 100,
      formType: props.formType || undefined,
      targetType: props.targetType,
      targetId: props.targetId || undefined,
      programId: props.programId || undefined,
      enabled: props.enabled,
    })
    options.value = requirePageList(res, '间接评价问卷')
  } catch (e) {
    showUserError(e, '间接评价问卷列表加载失败')
  } finally {
    loading.value = false
  }
}

const filteredOptions = computed(() => {
  const keyword = searchText.value.trim().toLowerCase()
  if (!keyword) return options.value
  return options.value.filter((opt) =>
    [opt.formCode, opt.formName, opt.formType].some(
      (item) => item != null && String(item).toLowerCase().includes(keyword),
    ),
  )
})

function handleSearch(value: string): void {
  searchText.value = value
}

function handleChange(value: SelectValue): void {
  const next: string | null = typeof value === 'string' ? value : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => o.id === next)
  emit('update:value', next)
  emit('change', next, option)
}

function formTypeLabel(value: IndirectFormType): string {
  return strictEnumLabel(INDIRECT_FORM_TYPE_LABEL, value, '间接评价问卷类型')
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
    :filter-option="false"
    @search="handleSearch"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in filteredOptions"
      :key="opt.id"
      :value="opt.id"
      :label="`${opt.formCode} · ${opt.formName}`"
    >
      <span class="text-xs text-gray-500 mr-1">{{ opt.formCode }}</span>
      {{ opt.formName }}
      <span v-if="opt.formType" class="text-gray-400 ml-1"
        >· {{ formTypeLabel(opt.formType) }}</span
      >
    </a-select-option>
  </a-select>
</template>
