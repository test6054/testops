<script setup lang="ts">
import type { SelectValue } from 'ant-design-vue/es/select'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  ScaleConversionRuleItemSaveRequest,
  ScaleConversionRuleItemVO,
  ScaleConversionRuleQueryRequest,
  ScaleConversionRuleSaveRequest,
  ScaleConversionRuleSignalSummaryVO,
  ScaleConversionRuleVO,
} from '@/apis/quality/scale-conversion-rule'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { scaleConversionRuleApi } from '@/apis/quality/scale-conversion-rule'
import { ALL_SCALE_TYPE_CODES, ScaleTypeCode, ScaleTypeDescription } from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiSwitch from '@/components/ui-guide/ui/Switch.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiInputNumber from '@/components/ui-guide/ui/UiInputNumber.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const list = ref<ScaleConversionRuleVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<ScaleConversionRuleQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  scaleType: undefined,
  enabled: undefined,
})

const scaleTypeOptions: { value: ScaleTypeCode, label: string }[] = ALL_SCALE_TYPE_CODES.map(
  (value) => ({
    value,
    label: strictEnumLabel(ScaleTypeDescription, value, '量表类型'),
  }),
)

interface ScaleConversionRuleFilterModel {
  [key: string]: unknown
  scaleType?: ScaleTypeCode
  enabled?: 'true' | 'false'
}

const filterForm = reactive<ScaleConversionRuleFilterModel>({
  scaleType: undefined,
  enabled: undefined,
})

const filterModel = computed<Record<string, unknown>>({
  get: () => filterForm,
  set: (value) => {
    Object.assign(filterForm, value)
  },
})

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'scaleType',
    type: 'select',
    placeholder: '量表类型',
    allowClear: true,
    width: 180,
    options: scaleTypeOptions,
  },
  {
    key: 'enabled',
    type: 'select',
    placeholder: '状态',
    allowClear: true,
    width: 130,
    options: [
      { value: 'true', label: '启用' },
      { value: 'false', label: '停用' },
    ],
  },
])

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<ScaleConversionRuleSaveRequest>({
  ruleCode: '',
  ruleName: '',
  scaleType: ScaleTypeCode.FIVE_LEVEL,
  items: [],
  description: '',
  enabled: true,
})
const submitting = ref(false)

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'ruleCode', key: 'ruleCode', width: 140, fixed: 'left' },
  { title: '名称', dataIndex: 'ruleName', key: 'ruleName', width: 180 },
  { title: '量表类型', dataIndex: 'scaleType', key: 'scaleType', width: 140 },
  { title: '换算条目', dataIndex: 'items', key: 'items', width: 360 },
  { title: '说明', dataIndex: 'description', key: 'description' },
  { title: '状态', dataIndex: 'enabled', key: 'enabled', width: 90 },
  { title: '操作', key: 'actions', width: 180 },
]

function defaultItemsByScaleType(scaleType: ScaleTypeCode): ScaleConversionRuleItemSaveRequest[] {
  if (scaleType === ScaleTypeCode.FIVE_LEVEL) {
    return [
      { sourceValue: '非常符合', normalizedScore: 1, sortOrder: 1 },
      { sourceValue: '比较符合', normalizedScore: 0.75, sortOrder: 2 },
      { sourceValue: '一般', normalizedScore: 0.5, sortOrder: 3 },
      { sourceValue: '比较不符合', normalizedScore: 0.25, sortOrder: 4 },
      { sourceValue: '非常不符合', normalizedScore: 0, sortOrder: 5 },
    ]
  }
  if (scaleType === ScaleTypeCode.FOUR_LEVEL) {
    return [
      { sourceValue: '优秀', normalizedScore: 1, sortOrder: 1 },
      { sourceValue: '良好', normalizedScore: 0.75, sortOrder: 2 },
      { sourceValue: '中等', normalizedScore: 0.5, sortOrder: 3 },
      { sourceValue: '较差', normalizedScore: 0.25, sortOrder: 4 },
    ]
  }
  if (scaleType === ScaleTypeCode.TEN_POINT) {
    return [
      { sourceValue: '10', normalizedScore: 1, sortOrder: 1 },
      { sourceValue: '8', normalizedScore: 0.8, sortOrder: 2 },
      { sourceValue: '6', normalizedScore: 0.6, sortOrder: 3 },
      { sourceValue: '4', normalizedScore: 0.4, sortOrder: 4 },
    ]
  }
  if (scaleType === ScaleTypeCode.PERCENTAGE) {
    return [
      { sourceValue: '100', normalizedScore: 1, sortOrder: 1 },
      { sourceValue: '90', normalizedScore: 0.9, sortOrder: 2 },
      { sourceValue: '80', normalizedScore: 0.8, sortOrder: 3 },
      { sourceValue: '60', normalizedScore: 0.6, sortOrder: 4 },
    ]
  }
  return [{ sourceValue: '', normalizedScore: 1, sortOrder: 1 }]
}

function cloneItems(items: ScaleConversionRuleItemVO[]): ScaleConversionRuleItemSaveRequest[] {
  return items.map((item, index) => ({
    sourceValue: item.sourceValue,
    normalizedScore: Number(item.normalizedScore),
    sortOrder: item.sortOrder ?? index + 1,
  }))
}

async function loadList() {
  loading.value = true
  try {
    const listQuery = { ...query }
    const page = await scaleConversionRuleApi.page(listQuery)
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
      return
    }
    try {
      signalSummary.value = await scaleConversionRuleApi.signalSummary(listQuery)
    } catch (error) {
      signalSummary.value = null
      showUserError(error, '量表换算规则状态统计加载失败')
    }
  } catch (error) {
    list.value = []
    total.value = 0
    signalSummary.value = null
    showUserError(error, '量表换算规则加载失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

function syncFilterToQuery() {
  query.scaleType = filterForm.scaleType
  if (filterForm.enabled === 'true') query.enabled = true
  else if (filterForm.enabled === 'false') query.enabled = false
  else query.enabled = undefined
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleReset() {
  Object.assign(filterForm, { scaleType: undefined, enabled: undefined })
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
    scaleType: ScaleTypeCode.FIVE_LEVEL,
    items: defaultItemsByScaleType(ScaleTypeCode.FIVE_LEVEL),
    description: '',
    enabled: true,
  })
  editorVisible.value = true
}

function openEdit(record: ScaleConversionRuleVO) {
  editorMode.value = 'edit'
  if (!Array.isArray(record.items) || !record.items.length) {
    void message.error('换算规则数据异常，请返回后重新打开本页')
    return
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

function handleScaleTypeChange(value: SelectValue) {
  const selected = scaleTypeOptions.find((item) => item.value === value)
  if (!selected) {
    void message.error('量表类型选择无效，请重新选择')
    return
  }
  const scaleType = selected.value
  editor.scaleType = scaleType
  if (editorMode.value === 'create') {
    editor.items = defaultItemsByScaleType(scaleType)
    return
  }
  void message.warning('编辑已有规则时变更量表类型将重置换算项，请确认后重新保存')
  editor.items = defaultItemsByScaleType(scaleType)
}

function addItem() {
  editor.items.push({ sourceValue: '', normalizedScore: 0, sortOrder: editor.items.length + 1 })
}

function removeItem(index: number) {
  if (editor.items.length <= 1) {
    void message.error('量表换算规则至少保留一条换算项')
    return
  }
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

function formatItems(items: ScaleConversionRuleItemVO[]): string {
  if (!Array.isArray(items) || !items.length) {
    return '换算规则数据异常'
  }
  return items
    .map((item) => `${item.sourceValue} -> ${formatScore(Number(item.normalizedScore))}`)
    .join(' · ')
}

function scaleTypeLabel(value: ScaleTypeCode): string {
  return strictEnumLabel(ScaleTypeDescription, value, '量表类型')
}

function validateEditor(): ScaleConversionRuleItemSaveRequest[] | null {
  if (!editor.ruleCode.trim() || !editor.ruleName.trim()) {
    void message.error('请填写编码与名称')
    return null
  }
  if (!editor.items.length) {
    void message.error('请至少新增一条换算条目')
    return null
  }
  const normalizedSourceValues = new Set<string>()
  const items: ScaleConversionRuleItemSaveRequest[] = []
  for (const [index, item] of editor.items.entries()) {
    const sourceValue = item.sourceValue.trim()
    if (!sourceValue) {
      void message.error(`第 ${index + 1} 条原始值不能为空`)
      return null
    }
    if (item.normalizedScore === null || item.normalizedScore === undefined) {
      void message.error(`第 ${index + 1} 条换算分值不能为空`)
      return null
    }
    if (Number.isNaN(Number(item.normalizedScore))) {
      void message.error(`第 ${index + 1} 条换算分值不能为空`)
      return null
    }
    if (normalizedSourceValues.has(sourceValue)) {
      void message.error(`原始值重复：${sourceValue}`)
      return null
    }
    normalizedSourceValues.add(sourceValue)
    items.push({
      sourceValue,
      normalizedScore: Number(item.normalizedScore),
      sortOrder: item.sortOrder ?? index + 1,
    })
  }
  return items
}

async function submitEditor() {
  const items = validateEditor()
  if (!items) {
    return
  }
  submitting.value = true
  try {
    const request: ScaleConversionRuleSaveRequest = {
      id: editor.id,
      ruleCode: editor.ruleCode.trim(),
      ruleName: editor.ruleName.trim(),
      scaleType: editor.scaleType,
      description: editor.description?.trim() ?? '',
      items,
      enabled: editor.enabled,
    }
    if (editorMode.value === 'create') await scaleConversionRuleApi.create(request)
    else await scaleConversionRuleApi.update(request)
    void message.success('已保存')
    editorVisible.value = false
    await loadList()
  } finally {
    submitting.value = false
  }
}

function buildScaleConversionRuleActions(_record: ScaleConversionRuleVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleScaleConversionRuleAction(key: string, record: ScaleConversionRuleVO): void {
  switch (key) {
    case 'edit':
      openEdit(record)
      break
    case 'delete':
      void handleDelete(record)
      break
  }
}

async function handleDelete(record: ScaleConversionRuleVO) {
  await confirmAsync({
    title: `删除换算规则 ${record.ruleCode}？`,
    type: 'error',
    onOk: async () => {
      await scaleConversionRuleApi.delete(record.id)
      void message.success('已删除')
      await loadList()
    },
  })
}

const signalSummary = ref<ScaleConversionRuleSignalSummaryVO | null>(null)

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary) {
    return []
  }
  const enabled = summary.enabledCount ?? 0
  const disabled = summary.disabledCount ?? 0
  return [
    { key: 'all-total', label: '规则总数', value: summary.totalCount ?? 0, tone: 'blue' },
    { key: 'enabled', label: '启用', value: enabled, tone: enabled > 0 ? 'green' : 'gray' },
    { key: 'disabled', label: '停用', value: disabled, tone: disabled > 0 ? 'orange' : 'gray' },
    {
      key: 'scale-types',
      label: '覆盖量表类型',
      value: summary.scaleTypeCoverageCount ?? 0,
      tone: 'blue',
    },
  ]
})

onMounted(() => {
  void loadList()
})

onActivated(() => {
  void loadList()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar show-title title="量表换算规则库" />
    </template>

    <SignalBand :metrics="signals" variant="panel" compact class="scr__signals" />

    <UiCard class="detail-table-card scr__table-card">
      <template #title>换算规则台账</template>
      <template #extra>
        <UiButton variant="primary" size="sm" @click="openCreate">新建换算规则</UiButton>
      </template>

      <UiFilterBar
        variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        @search="handleSearch"
        @reset="handleReset"
      />

      <WorkbenchContextGateStrip
        v-if="!loading && total === 0"
        tag="未配置"
        body="暂无量表换算规则"
        cta-label="新建换算规则"
        @cta="openCreate"
      />
      <UiDataTable
        v-else
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
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'scaleType'">
            {{ scaleTypeLabel(record.scaleType) }}
          </template>
          <template v-else-if="column.key === 'items'">
            <div class="scr__item-summary">
              {{ formatItems(record.items) }}
            </div>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildScaleConversionRuleActions(record)"
              split
              @action="(key) => handleScaleConversionRuleAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDialog
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建量表换算规则' : '编辑量表换算规则'"
      :confirm-loading="submitting"
      width="860px"
      @ok="submitEditor"
    >
      <UiForm layout="vertical" :model="editor">
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="编码" required>
              <UiInput size="sm" v-model="editor.ruleCode" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="量表类型" required>
              <UiSelect
                size="sm"
                v-model="editor.scaleType"
                :options="scaleTypeOptions"
                @change="handleScaleTypeChange"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="状态">
              <UiSwitch size="sm" v-model="editor.enabled" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="名称" required>
          <UiInput size="sm" v-model="editor.ruleName" />
        </UiFormItem>
        <UiFormItem label="换算条目" required>
          <div class="scr__items-header">
            <span class="scr__items-tip">原始值与换算分值按当前业务条目直接维护</span>
            <UiTextAction @click="addItem">新增条目</UiTextAction>
          </div>
          <div v-if="editor.items.length" class="scr__item-list">
            <div v-for="(item, index) in editor.items" :key="index" class="scr__item-row">
              <div class="scr__item-cell scr__item-cell--index">
                {{ index + 1 }}
              </div>
              <div class="scr__item-cell scr__item-cell--value">
                <UiInput size="sm" v-model="item.sourceValue" placeholder="原始值" />
              </div>
              <div class="scr__item-cell scr__item-cell--score">
                <UiInputNumber
                  size="sm"
                  v-model="item.normalizedScore"
                  :min="0"
                  :max="1"
                  :step="0.01"
                  :precision="2"
                  class="scr__number"
                  placeholder="换算分值"
                />
              </div>
              <div class="scr__item-cell scr__item-cell--sort">
                <UiInputNumber
                  size="sm"
                  v-model="item.sortOrder"
                  :min="1"
                  :precision="0"
                  class="scr__number"
                  placeholder="排序"
                />
              </div>
              <div class="scr__item-cell scr__item-cell--action">
                <UiTextAction tone="danger" @click="removeItem(index)">删除</UiTextAction>
              </div>
            </div>
          </div>
          <div v-else class="scr__empty">当前没有换算条目，请新增后再保存。</div>
        </UiFormItem>
        <UiFormItem label="说明">
          <UiTextarea size="sm" v-model="editor.description" :rows="3" />
        </UiFormItem>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.scr {
  &__signals {
    margin-bottom: var(--dp-space-component);
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    padding: var(--dp-space-component);
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
    flex-wrap: wrap;
  }

  &__panel-title {
    margin: 0;
    font-size: var(--dp-font-size-lg);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__item-summary {
    color: var(--dp-text-secondary);
    line-height: 1.6;
    white-space: normal;
    word-break: break-all;
  }

  &__items-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component);
    margin-bottom: var(--dp-space-component);
    flex-wrap: wrap;
  }

  &__items-tip {
    color: var(--dp-text-secondary);
    font-size: var(--dp-font-size-sm);
  }

  &__item-list {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
  }

  &__item-row {
    display: grid;
    grid-template-columns: 48px minmax(180px, 1.5fr) minmax(140px, 0.9fr) minmax(120px, 0.8fr) 88px;
    gap: var(--dp-space-component);
    align-items: center;
    padding: var(--dp-space-component);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface-chrome);
  }

  &__item-cell {
    min-width: 0;
  }

  &__item-cell--index {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    font-size: var(--dp-font-size-sm);
    font-weight: 600;
    color: var(--dp-text-secondary);
  }

  &__number {
    width: 100%;
  }

  &__empty {
    padding: var(--dp-space-component);
    border: 1px dashed var(--dp-border);
    border-radius: var(--dp-radius-panel);
    color: var(--dp-text-secondary);
    background: var(--dp-surface-chrome);
  }
}
</style>
