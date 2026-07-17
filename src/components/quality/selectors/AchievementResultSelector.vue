<!--
  达成度结果选择�?  数据源：POST /api/quality/achievement-results/page
  常用过滤：targetType / auditStatus / trainingPlanId / qualityCourseId / schoolYear
-->
<script setup lang="ts">
import type { AchievementResultVO } from '@/apis/quality/achievement-result'
import type { AchievementAuditStatusCode, AchievementTargetTypeCode } from '@/apis/quality/types'
import type { UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { computed, onMounted, ref, watch } from 'vue'
import { achievementResultApi } from '@/apis/quality/achievement-result'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  AchievementAuditStatusDescription,
  AchievementTargetTypeDescription,
} from '@/apis/quality/types'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
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


const selectOptions = computed<UiSelectOption[]>(() =>
  filteredOptions.value.map((opt) => ({
    value: opt.id,
    label: labelOf(opt),
  })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleSearch(val: string) {
  searchText.value = val
}

function handleChange(val: UiOptionValue | UiOptionValue[] | undefined) {
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
    :filter-option="false"
    @search="handleSearch"
    :options="selectOptions"
    @update:model-value="handleChange"
  >
    <template #option="{ value: optionValue }">
      <template v-for="opt in filteredOptions" :key="opt.id">
        <template v-if="opt.id === optionValue">
          {{ labelOf(opt) }}
          <span v-if="opt.qualityCourseId" class="dp-selector-option-meta">
            · {{ qualityCourseText(opt) }}
          </span>
          <span v-if="opt.schoolYear" class="dp-selector-option-meta">
            ({{ opt.schoolYear }}<span v-if="opt.semester">/{{ formatSemester(opt.semester) }}</span>)
          </span>
          <UiTag
            v-if="opt.auditStatus"
            :tone="auditStatusColor(opt.auditStatus)"
            size="sm"
            class="dp-selector-option-tag-gap"
          >
            {{ auditStatusLabel(opt.auditStatus) }}
          </UiTag>
        </template>
      </template>
    </template>
  </UiSelect>
</template>
