<!--
  审核评估整改任务选择器
  数据源：POST /api/quality/audit-evaluation/rectifications/page
  常用过滤：auditIssueId / ownerUserId / status
-->
<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { AuditRectificationStatus, AuditRectificationVO } from '@/apis/quality'
import {
  AUDIT_RECTIFICATION_STATUS_COLOR,
  AUDIT_RECTIFICATION_STATUS_LABEL,
  auditRectificationApi,
} from '@/apis/quality'
import { onMounted, ref, watch } from 'vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import { requirePageList } from './page-contract'

interface Props {
  value?: string | null
  auditIssueId?: string | null
  ownerUserId?: string | null
  status?: AuditRectificationStatus
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  width?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请选择整改任务',
  allowClear: true,
  disabled: false,
  width: '100%',
})

const emit = defineEmits<{
  'update:value': [value: string | null]
  change: [value: string | null, option?: AuditRectificationVO]
}>()

const options = ref<AuditRectificationVO[]>([])
const loading = ref(false)
const internalValue = ref<string | undefined>(props.value ?? undefined)

watch(
  () => props.value,
  (v) => {
    internalValue.value = v ?? undefined
  },
)

watch(
  () => [props.auditIssueId, props.ownerUserId, props.status],
  () => loadOptions(),
)

async function loadOptions() {
  loading.value = true
  try {
    const res = await auditRectificationApi.page({
      pageNum: 1,
      pageSize: 200,
      auditIssueId: props.auditIssueId || undefined,
      ownerUserId: props.ownerUserId || undefined,
      status: props.status,
    })
    options.value = requirePageList(res, '审核评估整改任务')
  } catch (e) {
    console.error('[AuditRectificationSelector] 加载整改任务列表失败', e)
    showUserError(e, '整改任务列表加载失败')
  } finally {
    loading.value = false
  }
}

function auditRectificationStatusLabel(value: AuditRectificationStatus): string {
  return strictEnumLabel(AUDIT_RECTIFICATION_STATUS_LABEL, value, '审核评估整改状态')
}

function auditRectificationStatusColor(value: AuditRectificationStatus): string {
  return strictEnumTone(AUDIT_RECTIFICATION_STATUS_COLOR, value, '审核评估整改状态')
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
      :label="`${opt.rectificationCode} · ${opt.rectificationTitle}`"
    >
      <span class="text-xs text-gray-500 mr-1">{{ opt.rectificationCode }}</span>
      {{ opt.rectificationTitle }}
      <a-tag :color="auditRectificationStatusColor(opt.status)" class="ml-1">
        {{ auditRectificationStatusLabel(opt.status) }}
      </a-tag>
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
