<!--
  学生选择器
  数据源：POST /api/user/admin/classes/students（按班级分页 + 姓名/学号搜索）
  必传 classId；当 classId 缺失时组件禁用
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { UserDto } from '@/types/api-types.d'
import { computed, onMounted, ref, watch } from 'vue'
import { getStudentsByClass } from '@/apis/edu/class'
import { listExamClassStudents } from '@/apis/mark/exam-scope'
import { showUserError } from '@/utils/error-handler'
import { readAllPages } from '@/utils/page-result'
import { requirePageList } from './page-contract'

interface Props {
  value?: string | null
  classId?: string | null
  examId?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择学生',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: UserDto]
}>()

const options = ref<UserDto[]>([])
const loading = ref(false)
const searchText = ref('')
// a-select v-model:value 不接受 null，外部 emit 仍保持 string | null。
const internalValue = ref<string | undefined>(props.value ?? undefined)

const effectiveDisabled = computed(() => props.disabled || !props.classId)
const effectivePlaceholder = computed(() => (props.classId ? props.placeholder : '请先选择班级'))

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => [props.classId, props.examId] as const,
  () => {
    if (props.classId) {
      loadOptions()
    } else {
      options.value = []
      internalValue.value = undefined
      emit('update:value', null)
    }
  },
)

async function loadOptions(keyword?: string) {
  if (!props.classId) return
  loading.value = true
  try {
    if (props.examId) {
      options.value = await readAllPages(
        (pageNum) =>
          listExamClassStudents({
            examId: props.examId!,
            classId: props.classId!,
            pageNum,
            pageSize: 100,
            keyword: keyword ?? searchText.value ?? undefined,
          }),
        '学生列表加载失败',
      )
    } else {
      const page = await getStudentsByClass({
        pageNum: 1,
        pageSize: 50,
        keyword: keyword ?? searchText.value ?? undefined,
        classId: props.classId,
      })
      options.value = requirePageList(page, '学生')
    }
  } catch (e) {
    showUserError(e, '学生列表加载失败')
  } finally {
    loading.value = false
  }
}

function studentDisplayName(opt: UserDto): string {
  return opt.nickName
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadOptions(val), 300)
}

function handleChange(val: SelectValue) {
  const next: string | null = typeof val === 'string' ? val : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => String(o.id) === next)
  emit('update:value', next)
  emit('change', next, option)
}

onMounted(() => {
  if (props.classId) loadOptions()
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
    :filter-option="false"
    @search="handleSearch"
    @change="handleChange"
  >
    <a-select-option
      v-for="opt in options"
      :key="opt.id"
      :value="String(opt.id)"
      :label="studentDisplayName(opt)"
    >
      {{ studentDisplayName(opt) }}
      <span v-if="opt.studentNumber" class="text-gray-400 ml-1 text-xs">({{ opt.studentNumber }})</span>
    </a-select-option>
  </a-select>
</template>
