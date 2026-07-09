<!--
  达成度结果选择�?  数据源：POST /api/quality/achievement-results/page
  常用过滤：targetType / auditStatus / trainingPlanId / qualityCourseId / schoolYear
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { AchievementResultVO } from '@/apis/quality/achievement-result'
import type { AchievementAuditStatusCode, AchievementTargetTypeCode } from '@/apis/quality/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { Tag } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { achievementResultApi } from '@/apis/quality/achievement-result'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  AchievementAuditStatusDescription,
  AchievementTargetTypeDescription,
} from '@/apis/quality/types'
import { formatSemester } from '@/types/enums/semester-enum'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import { loadSelectorFirstPage } from './page-contract'

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择达成度结果',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: AchievementResultVO]
}>()

const AuditStatusTag = Tag

interface Props {
  value?: string | null
  targetType?: AchievementTargetTypeCode
  auditStatus?: AchievementAuditStatusCode
  trainingPlanId?: string | null
  qualityCourseId?: string | null
  classId?: string | null
  programId?: string | null
  schoolYear?: string | null
  semester?: SemesterCode | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const options = ref<AchievementResultVO[]>([])
const loading = ref(false)
const searchText = ref('')
// a-select v-model:value 不接受 null，对外 emit 仍保持 string | null。
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => [
    props.targetType,
    props.auditStatus,
    props.trainingPlanId,
    props.qualityCourseId,
    props.classId,
    props.programId,
    props.schoolYear,
    props.semester,
  ],
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage(
      (pageNum, pageSize) =>
        achievementResultApi.page({
          pageNum,
          pageSize,
          targetType: props.targetType,
          auditStatus: props.auditStatus,
          trainingPlanId: props.trainingPlanId || undefined,
          qualityCourseId: props.qualityCourseId || undefined,
          classId: props.classId || undefined,
          programId: props.programId || undefined,
          schoolYear: props.schoolYear || undefined,
          semester: props.semester || undefined,
        }),
    )
  } catch (e) {
    showUserError(e, '达成度结果列表加载失败')
  } finally {
    loading.value = false
  }
}

/** 后端无 keyword 参数，仅在首屏条数内做客户端过滤。 */
const filteredOptions = computed(() => {
  const kw = searchText.value?.trim()
  if (!kw) return options.value
  const lower = kw.toLowerCase()
  return options.value.filter((opt) => {
    const targetTypeLabel = achievementTargetTypeLabel(opt.targetType)
    return [
      opt.targetLabel,
      opt.programName,
      opt.trainingPlanName,
      opt.qualityCourseCode,
      opt.qualityCourseName,
      opt.className,
      opt.schoolYear,
      opt.semester != null ? formatSemester(opt.semester) : null,
      targetTypeLabel,
    ].some((v) => v != null && String(v).toLowerCase().includes(lower))
  })
})

function handleSearch(val: string) {
  searchText.value = val
}

function handleChange(val: SelectValue) {
  const next: string | null = typeof val === 'string' ? val : null
  internalValue.value = next ?? undefined
  const option = options.value.find((o) => o.id === next)
  emit('update:value', next)
  emit('change', next, option)
}

function labelOf(opt: AchievementResultVO) {
  const typeLabel = achievementTargetTypeLabel(opt.targetType)
  const statusLabel = auditStatusLabel(opt.auditStatus)
  return `${typeLabel} · ${opt.targetLabel} · ${statusLabel}`
}

function qualityCourseText(opt: AchievementResultVO) {
  if (!opt.qualityCourseId) return ''
  const code = opt.qualityCourseCode?.trim()
  const name = opt.qualityCourseName?.trim()
  if (!code && !name) return '—'
  return [code, name].filter(Boolean).join(' ')
}

function achievementTargetTypeLabel(value: AchievementTargetTypeCode) {
  return strictEnumLabel(AchievementTargetTypeDescription, value, '达成度目标类型')
}

function auditStatusLabel(value: AchievementAuditStatusCode) {
  return strictEnumLabel(AchievementAuditStatusDescription, value, '达成度审核状态')
}

function auditStatusColor(value: AchievementAuditStatusCode) {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成度审核状态')
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
      <span v-if="opt.qualityCourseId" class="dp-selector-option-meta">
        · {{ qualityCourseText(opt) }}
      </span>
      <span v-if="opt.schoolYear" class="dp-selector-option-meta">
        ({{ opt.schoolYear }}<span v-if="opt.semester">/{{ formatSemester(opt.semester) }}</span>)
      </span>
      <AuditStatusTag
        v-if="opt.auditStatus"
        :color="auditStatusColor(opt.auditStatus)"
        class="dp-selector-option-tag-gap"
      >
        {{ auditStatusLabel(opt.auditStatus) }}
      </AuditStatusTag>
    </a-select-option>
  </a-select>
</template>
