<!--
  专业大类选择器（全局专业大类 MajorCategory）
  数据源：GET /api/course-catalog/major-categories/list
  业务含义：在 edu-quality 中，programId 指向 edu-user 的专业大类（MajorCategory）
-->
<script setup lang="ts">
import type { MajorCategoryVO } from '@/apis/quality/user-catalog'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { majorCategoryCatalogApi } from '@/apis/quality/user-catalog'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import { showUserError } from '@/utils/error-handler'

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
  "change": [value: string | null, option?: MajorCategoryVO]
}>()

const options = ref<MajorCategoryVO[]>([])
const loading = ref(false)
// a-select v-model:value 不接受 null，外部 emit 仍保持 string | null。
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
    options.value = await majorCategoryCatalogApi.listAll()
  } catch (e) {
    showUserError(e, '专业大类列表加载失败')
  } finally {
    loading.value = false
  }
}


const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: opt.majorCategoryName,
  })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleChange(val: UiOptionValue | UiOptionValue[] | undefined) {
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
  <UiSelect
    v-model="internalValue"
    class="dp-quality-selector"
    :style="controlStyle"
    size="sm"
    :placeholder="placeholder"
    :allow-clear="allowClear"
    :disabled="disabled"
    :loading="loading"
    allow-search
    option-filter-prop="label"
    :options="selectOptions"
    @update:model-value="handleChange"
  >
    <template #option="{ value: optionValue }">
      <template v-for="opt in options" :key="opt.id">
        <template v-if="opt.id === optionValue">
          {{ opt.majorCategoryName }}
          <span v-if="opt.courseCount != null" class="dp-selector-option-meta">({{ opt.courseCount }} 课)</span>
        </template>
      </template>
    </template>
  </UiSelect>
</template>
