<!--
  审核评估问题选择器
  数据源：POST /api/quality/audit-evaluation/issues/page
  可选过滤：programId / trainingPlanId / qualityCourseId / status / issueSource / severity / auditYear
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { AuditIssueVO } from '@/apis/quality/audit-issue'
import type { AuditIssueStatus } from '@/apis/quality/types'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import { onMounted, ref, watch } from 'vue'
import { auditIssueApi } from '@/apis/quality/audit-issue'
import { AUDIT_ISSUE_STATUS_COLOR, AUDIT_ISSUE_STATUS_LABEL } from '@/apis/quality/types'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import { requireAllPages } from './page-contract'

interface Props {
  value?: string | null
  programId?: string | null
  trainingPlanId?: string | null
  qualityCourseId?: string | null
  status?: AuditIssueStatus
  auditYear?: string | null
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择审核问题',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  "change": [value: string | null, option?: AuditIssueVO]
}>()

const options = ref<AuditIssueVO[]>([])
const loading = ref(false)
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => [
    props.programId,
    props.trainingPlanId,
    props.qualityCourseId,
    props.status,
    props.auditYear,
  ],
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    options.value = await requireAllPages(
      (pageNum) =>
        auditIssueApi.page({
          pageNum,
          pageSize: 100,
          programId: props.programId || undefined,
          trainingPlanId: props.trainingPlanId || undefined,
          qualityCourseId: props.qualityCourseId || undefined,
          status: props.status,
          auditYear: props.auditYear || undefined,
        }),
      '审核评估问题',
    )
  } catch (e) {
    showUserError(e, '审核问题列表加载失败')
  } finally {
    loading.value = false
  }
}

function auditIssueStatusLabel(value: AuditIssueStatus): string {
  return strictEnumLabel(AUDIT_ISSUE_STATUS_LABEL, value, '审核评估问题状态')
}

function auditIssueStatusColor(value: AuditIssueStatus): BadgeTone {
  return strictEnumTone(AUDIT_ISSUE_STATUS_COLOR, value, '审核评估问题状态')
}

function handleChange(val: SelectValue) {
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
      :label="`${opt.issueCode} · ${opt.issueTitle}`"
    >
      <span class="dp-selector-option-code">{{ opt.issueCode }}</span>
      {{ opt.issueTitle }}
      <UiTag :tone="auditIssueStatusColor(opt.status)" class="dp-selector-option-tag-gap">
        {{ auditIssueStatusLabel(opt.status) }}
      </UiTag>
    </a-select-option>
  </a-select>
</template>

<style scoped>
.text-xs {
  font-size: 12px;
}

.text-gray-500 {
  color: rgba(0, 0, 0, 0.45);
}

.mr-1 {
  margin-right: 4px;
}

.ml-1 {
  margin-left: 4px;
}
</style>
