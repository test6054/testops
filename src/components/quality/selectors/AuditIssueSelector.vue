<!--
  审核评估问题选择器
  数据源：POST /api/quality/audit-evaluation/issues/page
  可选过滤：programId / trainingPlanId / qualityCourseId / status / issueSource / severity / auditYear
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { AuditIssueStatus, AuditIssueVO } from '@/apis/quality'
import { AUDIT_ISSUE_STATUS_COLOR, AUDIT_ISSUE_STATUS_LABEL, auditIssueApi } from '@/apis/quality'
import { message } from 'ant-design-vue'
import { onMounted, ref, watch } from 'vue'

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
  change: [value: string | null, option?: AuditIssueVO]
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
    const res = await auditIssueApi.page({
      pageNum: 1,
      pageSize: 200,
      programId: props.programId || undefined,
      trainingPlanId: props.trainingPlanId || undefined,
      qualityCourseId: props.qualityCourseId || undefined,
      status: props.status,
      auditYear: props.auditYear || undefined,
    })
    options.value = res.list || []
  } catch (e) {
    console.error('[AuditIssueSelector] 加载审核问题列表失败', e)
    message.error('加载审核问题列表失败')
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
      <span class="font-mono text-xs text-gray-500 mr-1">{{ opt.issueCode }}</span>
      {{ opt.issueTitle }}
      <a-tag :color="AUDIT_ISSUE_STATUS_COLOR[opt.status]" class="ml-1">
        {{ AUDIT_ISSUE_STATUS_LABEL[opt.status] || opt.status }}
      </a-tag>
    </a-select-option>
  </a-select>
</template>

<style scoped>
.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

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
