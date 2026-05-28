<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ScaleConversionRuleItem,
  ScaleConversionRuleQueryPayload,
  ScaleConversionRuleSavePayload,
  ScaleConversionRuleVO,
  ScaleType,
} from '@/apis/quality'
import { isScaleType, SCALE_TYPE_LABEL, scaleConversionRuleApi } from '@/apis/quality'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
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

const scaleTypeOptions: { value: ScaleType; label: string }[] = [
  { value: 'FIVE_LEVEL', label: SCALE_TYPE_LABEL.FIVE_LEVEL },
  { value: 'FOUR_LEVEL', label: SCALE_TYPE_LABEL.FOUR_LEVEL },
  { value: 'TEN_POINT', label: SCALE_TYPE_LABEL.TEN_POINT },
  { value: 'PERCENTAGE', label: SCALE_TYPE_LABEL.PERCENTAGE },
  { value: 'CUSTOM', label: SCALE_TYPE_LABEL.CUSTOM },
]

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
  items: [],
  description: '',
  enabled: true,
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
  { title: '名称', dataIndex: 'ruleName', key: 'ruleName', width: 180 },
  { title: '量表类型', dataIndex: 'scaleType', key: 'scaleType', width: 140 },
  { title: '换算条目', dataIndex: 'items', key: 'items', width: 360 },
  { title: '说明', dataIndex: 'description', key: 'description' },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 90 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

function createRuleItem(
  sourceValue = '',
  normalizedScore = 0,
  sortOrder?: number,
): ScaleConversionRuleItem {
  return { sourceValue, normalizedScore, sortOrder }
}

function defaultItemsByScaleType(scaleType: ScaleType): ScaleConversionRuleItem[] {
  if (scaleType === 'FIVE_LEVEL') {
    return [
      createRuleItem('非常符合', 1, 1),
      createRuleItem('比较符合', 0.75, 2),
      createRuleItem('一般', 0.5, 3),
      createRuleItem('比较不符合', 0.25, 4),
      createRuleItem('非常不符合', 0, 5),
    ]
  }
  if (scaleType === 'FOUR_LEVEL') {
    return [
      createRuleItem('优秀', 1, 1),
      createRuleItem('良好', 0.75, 2),
      createRuleItem('中等', 0.5, 3),
      createRuleItem('较差', 0.25, 4),
    ]
  }
  if (scaleType === 'TEN_POINT') {
    return [
      createRuleItem('10', 1, 1),
      createRuleItem('8', 0.8, 2),
      createRuleItem('6', 0.6, 3),
      createRuleItem('4', 0.4, 4),
    ]
  }
  if (scaleType === 'PERCENTAGE') {
    return [
      createRuleItem('100', 1, 1),
      createRuleItem('90', 0.9, 2),
      createRuleItem('80', 0.8, 3),
      createRuleItem('60', 0.6, 4),
    ]
  }
  return [createRuleItem('', 1, 1)]
}

function cloneItems(items: ScaleConversionRuleItem[]): ScaleConversionRuleItem[] {
  return items.map((item, index) => ({
    sourceValue: item.sourceValue,
    normalizedScore: Number(item.normalizedScore),
    sortOrder: item.sortOrder ?? index + 1,
  }))
}

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

function handlePageChange(payload: { current: number; pageSize: number }) {
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
    items: defaultItemsByScaleType('FIVE_LEVEL'),
    description: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ScaleConversionRuleVO) {
  editorMode.value = 'edit'
  if (!Array.isArray(record.items) || !record.items.length) {
    throw new Error(`换算规则缺少条目数据：${record.ruleCode}`)
  }
  Object.assign(editor, {
    id: record.id,
    ruleCode: record.ruleCode,
    ruleName: record.ruleName,
    scaleType: record.scaleType,
    items: cloneItems(record.items),
    description: record.description ?? '',
    enabled: record.enabled,
  })
  editorVisible.value = true
}

function handleScaleTypeChange(value: unknown) {
  if (!isScaleType(value)) {
    throw new Error(`量表类型不符合前后端契约：${String(value)}`)
  }
  editor.scaleType = value
  if (editorMode.value === 'create') {
    editor.items = defaultItemsByScaleType(value)
  }
}

function addItem() {
  editor.items.push(createRuleItem('', 0, editor.items.length + 1))
}

function removeItem(index: number) {
  editor.items.splice(index, 1)
  editor.items.forEach((item, itemIndex) => {
    item.sortOrder = itemIndex + 1
  })
}

function formatScore(value: number): string {
  return Number(value)
    .toFixed(2)
    .replace(/\.?0+$/, '')
}

function formatItems(items: ScaleConversionRuleItem[]): string {
  if (!Array.isArray(items) || !items.length) {
    throw new Error('换算规则缺少条目数据')
  }
  return items
    .map((item) => `${item.sourceValue} -> ${formatScore(Number(item.normalizedScore))}`)
    .join(' · ')
}

function scaleTypeLabel(value: unknown): string {
  if (isScaleType(value)) return SCALE_TYPE_LABEL[value]
  throw new Error(`量表类型不符合前后端契约：${String(value)}`)
}

function validateEditor(): ScaleConversionRuleItem[] | null {
  if (!editor.ruleCode.trim() || !editor.ruleName.trim()) {
    message.error('请填写编码与名称')
    return null
  }
  if (!editor.items.length) {
    message.error('请至少新增一条换算条目')
    return null
  }
  const normalizedSourceValues = new Set<string>()
  const items = editor.items.map((item, index) => {
    const sourceValue = item.sourceValue.trim()
    if (!sourceValue) {
      throw new Error(`第 ${index + 1} 条原始值不能为空`)
    }
    if (item.normalizedScore === null || item.normalizedScore === undefined) {
      throw new Error(`第 ${index + 1} 条换算分值不能为空`)
    }
    if (Number.isNaN(Number(item.normalizedScore))) {
      throw new Error(`第 ${index + 1} 条换算分值不能为空`)
    }
    if (normalizedSourceValues.has(sourceValue)) {
      throw new Error(`原始值重复：${sourceValue}`)
    }
    normalizedSourceValues.add(sourceValue)
    return {
      sourceValue,
      normalizedScore: Number(item.normalizedScore),
      sortOrder: item.sortOrder ?? index + 1,
    }
  })
  return items
}

async function submitEditor() {
  let items: ScaleConversionRuleItem[] | null = null
  try {
    items = validateEditor()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '换算条目校验失败')
    return
  }
  if (!items) {
    return
  }
  submitting.value = true
  try {
    const payload: ScaleConversionRuleSavePayload = {
      ...editor,
      ruleCode: editor.ruleCode.trim(),
      ruleName: editor.ruleName.trim(),
      description: editor.description?.trim() ?? '',
      items,
    }
    if (editorMode.value === 'create') await scaleConversionRuleApi.create(payload)
    else await scaleConversionRuleApi.update(payload)
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
          <template v-else-if="column.key === 'items'">
            <div class="scr__item-summary">
              {{ formatItems(record.items) }}
            </div>
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
      width="860px"
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
              <a-select
                v-model:value="editor.scaleType"
                :options="scaleTypeOptions"
                @change="handleScaleTypeChange"
              />
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
        <a-form-item label="换算条目" required>
          <div class="scr__items-header">
            <span class="scr__items-tip">原始值与换算分值按当前业务条目直接维护</span>
            <UiButton variant="ghost" size="sm" @click="addItem"> 新增条目 </UiButton>
          </div>
          <div v-if="editor.items.length" class="scr__item-list">
            <div v-for="(item, index) in editor.items" :key="index" class="scr__item-row">
              <div class="scr__item-cell scr__item-cell--index">
                {{ index + 1 }}
              </div>
              <div class="scr__item-cell scr__item-cell--value">
                <a-input v-model:value="item.sourceValue" placeholder="原始值" />
              </div>
              <div class="scr__item-cell scr__item-cell--score">
                <a-input-number
                  v-model:value="item.normalizedScore"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  class="scr__number"
                  placeholder="换算分值"
                />
              </div>
              <div class="scr__item-cell scr__item-cell--sort">
                <a-input-number
                  v-model:value="item.sortOrder"
                  :min="1"
                  :precision="0"
                  class="scr__number"
                  placeholder="排序"
                />
              </div>
              <div class="scr__item-cell scr__item-cell--action">
                <UiButton variant="ghost" status="danger" size="sm" @click="removeItem(index)">
                  删除
                </UiButton>
              </div>
            </div>
          </div>
          <div v-else class="scr__empty">当前没有换算条目，请新增后再保存。</div>
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

  &__item-summary {
    color: var(--dp-text-secondary, #475569);
    line-height: 1.6;
    white-space: normal;
    word-break: break-all;
  }

  &__items-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  &__items-tip {
    color: var(--dp-text-secondary, #64748b);
    font-size: 13px;
  }

  &__item-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__item-row {
    display: grid;
    grid-template-columns: 48px minmax(180px, 1.5fr) minmax(140px, 0.9fr) minmax(120px, 0.8fr) 88px;
    gap: 10px;
    align-items: center;
    padding: 12px;
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface-elevated, #f8fafc);
  }

  &__item-cell {
    min-width: 0;
  }

  &__item-cell--index {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    font-size: 13px;
    font-weight: 600;
    color: var(--dp-text-secondary, #475569);
  }

  &__number {
    width: 100%;
  }

  &__empty {
    padding: 16px;
    border: 1px dashed var(--dp-border, #cbd5e1);
    border-radius: 8px;
    color: var(--dp-text-secondary, #64748b);
    background: var(--dp-surface-elevated, #f8fafc);
  }
}
</style>
