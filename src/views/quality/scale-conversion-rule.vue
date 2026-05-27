<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 量表换算规则
 *
 * 后端：/api/quality/scale-conversion-rules
 * 用于间接评价跨量表归一：原始量表值 → 0~1 分值。
 * conversionMap 字段为 JSON 字符串：{ 原始值: 换算分值 }
 */
import type {
  ScaleConversionRuleQueryPayload,
  ScaleConversionRuleSavePayload,
  ScaleConversionRuleVO,
  ScaleType,
} from '@/apis/quality'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { isScaleType, SCALE_TYPE_LABEL, scaleConversionRuleApi } from '@/apis/quality'
import { UiButton, UiDataTable, UiSearchForm } from '@/components/ui-guide/ui'
import { ContextBar, SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'

const list = ref<ScaleConversionRuleVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<ScaleConversionRuleQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  scaleType: undefined,
  enabled: undefined,
})

const scaleTypeOptions: { value: ScaleType, label: string }[] = [
  { value: 'FIVE_LEVEL', label: SCALE_TYPE_LABEL.FIVE_LEVEL },
  { value: 'FOUR_LEVEL', label: SCALE_TYPE_LABEL.FOUR_LEVEL },
  { value: 'TEN_POINT', label: SCALE_TYPE_LABEL.TEN_POINT },
  { value: 'PERCENTAGE', label: SCALE_TYPE_LABEL.PERCENTAGE },
  { value: 'CUSTOM', label: SCALE_TYPE_LABEL.CUSTOM },
]

// UiSearchForm 状态仓库：enabled 在表单使用字符串，@search 时映射回 query.enabled (boolean | undefined)
const filterModel = ref<Record<string, unknown>>({
  scaleType: undefined,
  enabled: undefined,
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ScaleConversionRuleSavePayload>({
  ruleCode: '',
  ruleName: '',
  scaleType: 'FIVE_LEVEL',
  conversionMap: '',
  description: '',
  enabled: true,
})
const editorJsonValid = computed(() => {
  if (!editor.conversionMap.trim()) return false
  try {
    JSON.parse(editor.conversionMap)
    return true
  } catch {
    return false
  }
})
const submitting = ref(false)

const filterFields: FilterField[] = [
  {
    key: 'scaleType',
    label: '量表类型',
    type: 'select',
    placeholder: '量表类型',
    allowClear: true,
    options: scaleTypeOptions,
    width: 180,
  },
  {
    key: 'enabled',
    label: '状态',
    type: 'select',
    placeholder: '状态',
    allowClear: true,
    width: 130,
    options: [
      { value: 'true', label: '启用' },
      { value: 'false', label: '停用' },
    ],
  },
]

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'ruleCode', key: 'ruleCode', width: 140 },
  { title: '名称', dataIndex: 'ruleName', key: 'ruleName' },
  { title: '量表类型', dataIndex: 'scaleType', key: 'scaleType', width: 140 },
  { title: '说明', dataIndex: 'description', key: 'description' },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 90 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

async function loadList() {
  loading.value = true
  try {
    const page = await scaleConversionRuleApi.page({ ...query })
    list.value = page.list
    total.value = page.total
  } finally {
    loading.value = false
  }
}

function handlePageChange(payload: { current: number, pageSize: number }) {
  query.pageNum = payload.current
  query.pageSize = payload.pageSize
  loadList()
}

function syncFilterToQuery() {
  const scaleTypeRaw = filterModel.value.scaleType
  query.scaleType = isScaleType(scaleTypeRaw) ? scaleTypeRaw : undefined
  const enabledRaw = filterModel.value.enabled
  if (enabledRaw === 'true') query.enabled = true
  else if (enabledRaw === 'false') query.enabled = false
  else query.enabled = undefined
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleResetSearch() {
  filterModel.value = { scaleType: undefined, enabled: undefined }
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    ruleCode: '',
    ruleName: '',
    scaleType: 'FIVE_LEVEL',
    conversionMap: JSON.stringify({ 1: 0, 2: 0.25, 3: 0.5, 4: 0.75, 5: 1 }, null, 2),
    description: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ScaleConversionRuleVO) {
  editorMode.value = 'edit'
  Object.assign(editor, {
    ...record,
    conversionMap: prettyJson(record.conversionMap),
  })
  editorVisible.value = true
}

function prettyJson(s: string): string {
  if (!s) return ''
  return JSON.stringify(JSON.parse(s), null, 2)
}

async function submitEditor() {
  if (!editor.ruleCode.trim() || !editor.ruleName.trim()) {
    message.error('请填写编码与名称')
    return
  }
  if (!editorJsonValid.value) {
    message.error('换算映射不是合法 JSON')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await scaleConversionRuleApi.create(editor)
    else await scaleConversionRuleApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: ScaleConversionRuleVO) {
  await confirmAsync({
    title: `删除换算规则 ${record.ruleCode}？`,
    type: 'error',
    onOk: async () => {
      await scaleConversionRuleApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

function scaleTypeLabel(value: unknown): string {
  if (isScaleType(value)) return SCALE_TYPE_LABEL[value]
  throw new Error(`量表类型不符合前后端契约：${String(value)}`)
}

/* ========== 信号指标：量表换算规则库健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const enabled = list.value.filter((r) => r.enabled).length
  const disabled = list.value.filter((r) => !r.enabled).length
  const byScale: Record<string, number> = {}
  for (const r of list.value) {
    byScale[r.scaleType] = (byScale[r.scaleType] || 0) + 1
  }
  return [
    { key: 'page', label: '当前页记录', value: list.value.length, tone: 'blue' },
    { key: 'all-total', label: '规则总数', value: total.value, tone: 'blue' },
    { key: 'enabled', label: '启用', value: enabled, tone: enabled > 0 ? 'green' : 'gray' },
    { key: 'disabled', label: '停用', value: disabled, tone: disabled > 0 ? 'orange' : 'gray' },
    { key: 'scale-types', label: '覆盖量表类型', value: Object.keys(byScale).length, tone: 'blue' },
  ]
})

onMounted(() => loadList())
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="量表换算规则库" />
    </template>

    <SignalBand :metrics="signals" compact class="scr__signals" />

    <section class="scr__panel">
      <header class="scr__panel-header">
        <h3 class="scr__panel-title">换算规则台账</h3>
        <div class="scr__panel-actions">
          <UiButton variant="primary" size="sm" @click="openCreate"> 新建换算规则 </UiButton>
        </div>
      </header>

      <UiSearchForm
        v-model="filterModel"
        :fields="filterFields"
        :show-labels="false"
        class="scr__search-form"
        @search="handleSearch"
        @reset="handleResetSearch"
      />

      <UiDataTable
        v-model:current="query.pageNum"
        v-model:page-size="query.pageSize"
        :columns="columns"
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :total="total"
        flat
        @page-change="handlePageChange"
      >
        <template #bodyCell="{ column, record, text }">
          <template v-if="column.key === 'scaleType'">
            {{ scaleTypeLabel(text) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '启用' : '停用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <UiButton variant="ghost" size="sm" @click="openEdit(record)"> 编辑 </UiButton>
              <UiButton variant="ghost" status="danger" size="sm" @click="handleDelete(record)">
                删除
              </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建量表换算规则' : '编辑量表换算规则'"
      :confirm-loading="submitting"
      width="640px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.ruleCode" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="量表类型" required>
              <a-select v-model:value="editor.scaleType" :options="scaleTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="状态">
              <a-switch v-model:checked="editor.enabled" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="名称" required>
          <a-input v-model:value="editor.ruleName" />
        </a-form-item>
        <a-form-item
          label="换算映射（JSON）"
          required
          :validate-status="editorJsonValid ? 'success' : 'error'"
          :help="editorJsonValid ? '' : '请输入合法 JSON，键为原始量表值，值为 0~1 分值'"
        >
          <a-textarea v-model:value="editor.conversionMap" :rows="8" class="scr__monospace" />
        </a-form-item>
        <a-form-item label="说明">
          <a-textarea v-model:value="editor.description" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.scr {
  &__signals {
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__panel {
    background: var(--dp-surface, #fff);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    padding: 16px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__filter {
    width: 130px;

    &--md {
      width: 180px;
    }
  }

  &__monospace {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
}
</style>
