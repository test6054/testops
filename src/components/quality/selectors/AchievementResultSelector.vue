<!--
  达成度结果选择器
  数据源：POST /api/quality/achievement-results/page
  常用过滤：targetType / auditStatus / trainingPlanId / qualityCourseId / schoolYear
-->
<script setup lang="ts">
import type { AchievementAuditStatus, AchievementResultVO, AchievementTargetType } from '@/apis/quality'
import { message, Tag } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_AUDIT_STATUS_LABEL,
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  achievementApi,
} from '@/apis/quality'

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择达成度结果',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  'change': [value: string | null, option?: AchievementResultVO]
}>()

const AuditStatusTag = Tag

interface Props {
  value?: string | null
  targetType?: AchievementTargetType
  auditStatus?: AchievementAuditStatus
  trainingPlanId?: string | null
  qualityCourseId?: string | null
  classId?: string | null
  programId?: string | null
  schoolYear?: string | null
  semester?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const options = ref<AchievementResultVO[]>([])
const loading = ref(false)
const searchText = ref('')
const internalValue = ref<string | null>(props.value ?? null)

watch(() => props.value, (v) => {
  internalValue.value = v ?? null
})

watch(
  () => [props.targetType, props.auditStatus, props.trainingPlanId, props.qualityCourseId, props.classId, props.programId, props.schoolYear, props.semester],
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    const res = await achievementApi.page({
      pageNum: 1,
      pageSize: 100,
      targetType: props.targetType,
      auditStatus: props.auditStatus,
      trainingPlanId: props.trainingPlanId || undefined,
      qualityCourseId: props.qualityCourseId || undefined,
      classId: props.classId || undefined,
      programId: props.programId || undefined,
      schoolYear: props.schoolYear || undefined,
      semester: props.semester || undefined,
    })
    options.value = res.list || []
  } catch (e) {
    console.error('[AchievementResultSelector] 加载达成度结果列表失败', e)
    message.error('加载达成度结果列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 后端 AchievementResultQueryRequest 不接受关键字参数，这里采用客户端过滤：
 * 对 targetId / qualityCourseId / programId / trainingPlanId / schoolYear / semester / id 进行子串匹配。
 */
const filteredOptions = computed(() => {
  const kw = searchText.value?.trim()
  if (!kw) return options.value
  const lower = kw.toLowerCase()
  return options.value.filter((opt) => {
    const targetTypeLabel = ACHIEVEMENT_TARGET_TYPE_LABEL[opt.targetType] || opt.targetType
    return [
      opt.id,
      opt.targetId,
      opt.programId,
      opt.trainingPlanId,
      opt.qualityCourseId,
      opt.schoolYear,
      opt.semester,
      targetTypeLabel,
    ].some(v => v != null && String(v).toLowerCase().includes(lower))
  })
})

function handleSearch(val: string) {
  searchText.value = val
}

function handleChange(val: string | null) {
  internalValue.value = val
  const option = options.value.find(o => o.id === val)
  emit('update:value', val)
  emit('change', val, option)
}

function labelOf(opt: AchievementResultVO) {
  const typeLabel = ACHIEVEMENT_TARGET_TYPE_LABEL[opt.targetType] || opt.targetType
  return `${typeLabel} #${opt.targetId}`
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
      :label="labelOf(opt)"
    >
      {{ labelOf(opt) }}
      <span v-if="opt.qualityCourseId" class="text-gray-400 ml-1">
        · 课程 #{{ opt.qualityCourseId }}
      </span>
      <span v-if="opt.schoolYear" class="text-gray-400 ml-1">
        ({{ opt.schoolYear }}<span v-if="opt.semester">/{{ opt.semester }}</span>)
      </span>
      <AuditStatusTag
        v-if="opt.auditStatus"
        :color="ACHIEVEMENT_AUDIT_STATUS_COLOR[opt.auditStatus]"
        class="ml-1"
      >
        {{ ACHIEVEMENT_AUDIT_STATUS_LABEL[opt.auditStatus] }}
      </AuditStatusTag>
    </a-select-option>
  </a-select>
</template>
