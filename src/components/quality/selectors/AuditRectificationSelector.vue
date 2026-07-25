<!--
  审核评估整改任务选择�?  数据源：POST /api/quality/audit-evaluation/rectifications/page
  常用过滤：auditIssueId / ownerUserId / status
-->
<script setup lang="ts">
import type { AuditRectificationVO } from '@/apis/quality/audit-rectification'
import type { AuditRectificationStatusCode } from '@/apis/quality/types'
import type { BadgeTone, UiOptionValue, UiSelectOption } from '@/components/ui-guide/ui/types'
import { computed, onMounted, ref, watch } from 'vue'
import { auditRectificationApi } from '@/apis/quality/audit-rectification'
import {
  AUDIT_RECTIFICATION_STATUS_COLOR,
  AuditRectificationStatusDescription,
} from '@/apis/quality/types'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import { loadSelectorFirstPage, QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS } from './page-contract'

interface Props {
  value?: string | null
  auditIssueId?: string | null
  ownerUserId?: string | null
  status?: AuditRectificationStatusCode
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
  "change": [value: string | null, option?: AuditRectificationVO]
}>()

const options = ref<AuditRectificationVO[]>([])
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
  () => [props.auditIssueId, props.ownerUserId, props.status],
  () => loadOptions(),
)

async function loadOptions(keyword?: string) {
  loading.value = true
  try {
    options.value = await loadSelectorFirstPage((pageNum, pageSize) =>
      auditRectificationApi.page({
        pageNum,
        pageSize,
        auditIssueId: props.auditIssueId || undefined,
        ownerUserId: props.ownerUserId || undefined,
        status: props.status,
        keyword: (keyword ?? searchText.value)?.trim() || undefined,
      }),
    )
  } catch (e) {
    showUserError(e, '整改任务列表加载失败')
  } finally {
    loading.value = false
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const selectOptions = computed<UiSelectOption[]>(() =>
  options.value.map((opt) => ({
    value: opt.id,
    label: `${opt.rectificationCode} · ${opt.rectificationTitle}`,
  })),
)

const controlStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

function handleSearch(val: string) {
  searchText.value = val
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadOptions(val), QUALITY_SELECTOR_SEARCH_DEBOUNCE_MS)
}

function auditRectificationStatusLabel(value: AuditRectificationStatusCode): string {
  return strictEnumLabel(AuditRectificationStatusDescription, value, '审核评估整改状态')
}

function auditRectificationStatusColor(value: AuditRectificationStatusCode): BadgeTone {
  return strictEnumTone(AUDIT_RECTIFICATION_STATUS_COLOR, value, '审核评估整改状态')
}

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
    :filter-option="false"
    @search="handleSearch"
    :options="selectOptions"
    @update:model-value="handleChange"
  >
    <template #option="{ value: optionValue }">
      <template v-for="opt in options" :key="opt.id">
        <template v-if="opt.id === optionValue">
          <span class="dp-selector-option-code">{{ opt.rectificationCode }}</span>
          {{ opt.rectificationTitle }}
          <UiTag :tone="auditRectificationStatusColor(opt.status)" class="dp-selector-option-tag-gap">
            {{ auditRectificationStatusLabel(opt.status) }}
          </UiTag>
        </template>
      </template>
    </template>
  </UiSelect>
</template>

<style scoped>
.text-xs {
  font-size: var(--dp-font-size-xs);
}

.text-gray-500 {
  color: var(--dp-text-tertiary);
}

.mr-1 {
  margin-right: 4px;
}

.ml-1 {
  margin-left: 4px;
}
</style>
