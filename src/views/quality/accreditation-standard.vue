<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 认证标准配置
 *
 * 后端：/api/quality/accreditation-standards
 * 权限：通常由系统管理员或平台运维维护；该页面只做 CRUD。
 */
import type {
  AccreditationStandardQueryRequest,
  AccreditationStandardSaveRequest,
  AccreditationStandardSummaryVO,
  AccreditationStandardVO,
} from '@/apis/quality/accreditation-standard'
import type { FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import message from 'ant-design-vue/es/message'
import { computed, onActivated, onMounted, reactive, ref } from 'vue'
import { accreditationStandardApi } from '@/apis/quality/accreditation-standard'
import {
  AccreditationTypeCode,
  AccreditationTypeDescription,
  ALL_ACCREDITATION_TYPE_CODES,
} from '@/apis/quality/types'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCheckbox from '@/components/ui-guide/ui/UiCheckbox.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import WorkbenchContextGateStrip from '@/components/workbench/WorkbenchContextGateStrip.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const list = ref<AccreditationStandardVO[]>([])
const total = ref(0)
const loading = ref(false)
const summary = ref<AccreditationStandardSummaryVO>({
  totalCount: 0,
  enabledCount: 0,
  disabledCount: 0,
  pilotOnlyCount: 0,
  accreditationTypeCount: 0,
})
const query = reactive<AccreditationStandardQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<AccreditationStandardSaveRequest>({
  standardCode: '',
  standardName: '',
  accreditationType: AccreditationTypeCode.ENGINEERING_ACCREDITATION,
  standardYear: '',
  issuingAuthority: '',
  documentNumber: '',
  sourceUrl: '',
  summary: '',
  enabled: true,
  isPilotOnly: false,
})
const submitting = ref(false)

interface AccreditationStandardFilterModel {
  accreditationType?: AccreditationTypeCode
  enabled?: 'enabled' | 'disabled'
  keyword: string
}

const accreditationOptions = ALL_ACCREDITATION_TYPE_CODES.map((value) => ({
  value,
  label: strictEnumLabel(AccreditationTypeDescription, value, '认证类型'),
}))

const columns: ColumnsType<AccreditationStandardVO> = [
  { title: '编码', dataIndex: 'standardCode', key: 'standardCode', width: 140, fixed: 'left' },
  { title: '名称', dataIndex: 'standardName', key: 'standardName' },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 180 },
  { title: '标准年份', dataIndex: 'standardYear', key: 'standardYear', width: 100 },
  { title: '文号', dataIndex: 'documentNumber', key: 'documentNumber', width: 160 },
  { title: '状态', key: 'enabled', width: 120 },
  { title: '操作', key: 'actions', width: 180 },
]

const filterModel = ref<AccreditationStandardFilterModel>({
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

const filterFields: FilterField[] = [
  {
    key: 'accreditationType',
    type: 'select',
    label: '认证类型',
    placeholder: '认证类型',
    allowClear: true,
    width: 220,
    options: accreditationOptions,
  },
  {
    key: 'enabled',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 130,
    options: [
      { value: 'enabled', label: '启用' },
      { value: 'disabled', label: '停用' },
    ],
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '编码/名称',
    allowClear: true,
    width: 200,
    triggerSearchOnChange: false,
  },
]

function accreditationTypeLabel(value: AccreditationTypeCode): string {
  return strictEnumLabel(AccreditationTypeDescription, value, '认证类型')
}

async function loadList() {
  loading.value = true
  try {
    const page = await accreditationStandardApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
    }
  } catch (error) {
    showUserError(error, '认证标准加载失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadSummary() {
  try {
    summary.value = await accreditationStandardApi.summary()
  } catch (error) {
    showUserError(error, '认证标准统计加载失败')
  }
}

async function loadPageData() {
  await Promise.all([loadList(), loadSummary()])
}

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

function syncFilterToQuery() {
  query.accreditationType = filterModel.value.accreditationType
  query.enabled
    = filterModel.value.enabled === 'enabled'
      ? true
      : filterModel.value.enabled === 'disabled'
        ? false
        : undefined
  query.keyword = filterModel.value.keyword
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleResetSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    standardCode: '',
    standardName: '',
    accreditationType: 'ENGINEERING_ACCREDITATION',
    standardYear: '',
    issuingAuthority: '',
    documentNumber: '',
    sourceUrl: '',
    summary: '',
    enabled: true,
    isPilotOnly: false,
  })
  editorVisible.value = true
}

function openEdit(record: AccreditationStandardVO) {
  editorMode.value = 'edit'
  Object.assign(editor, {
    id: record.id,
    standardCode: record.standardCode,
    standardName: record.standardName,
    accreditationType: record.accreditationType,
    standardYear: record.standardYear,
    issuingAuthority: record.issuingAuthority,
    documentNumber: record.documentNumber,
    sourceUrl: record.sourceUrl,
    summary: record.summary,
    enabled: record.enabled,
    isPilotOnly: record.isPilotOnly,
  })
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.standardCode.trim() || !editor.standardName.trim() || !editor.accreditationType) {
    void message.error('请填写编码、名称、认证类型')
    return
  }
  submitting.value = true
  try {
    const request: AccreditationStandardSaveRequest = {
      id: editor.id,
      standardCode: editor.standardCode.trim(),
      standardName: editor.standardName.trim(),
      accreditationType: editor.accreditationType,
      standardYear: editor.standardYear?.trim() || undefined,
      issuingAuthority: editor.issuingAuthority?.trim() || undefined,
      documentNumber: editor.documentNumber?.trim() || undefined,
      sourceUrl: editor.sourceUrl?.trim() || undefined,
      summary: editor.summary?.trim() || undefined,
      enabled: editor.enabled,
      isPilotOnly: editor.isPilotOnly,
    }
    if (editorMode.value === 'create') await accreditationStandardApi.create(request)
    else await accreditationStandardApi.update(request)
    void message.success('已保存')
    editorVisible.value = false
    await loadPageData()
  } finally {
    submitting.value = false
  }
}

function buildAccreditationStandardActions(
  _record: AccreditationStandardVO,
): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleAccreditationStandardAction(key: string, record: AccreditationStandardVO): void {
  switch (key) {
    case 'edit':
      openEdit(record)
      break
    case 'delete':
      void handleDelete(record)
      break
  }
}

async function handleDelete(record: AccreditationStandardVO) {
  void confirmAsync({
    title: `删除认证标准 ${record.standardCode}？`,
    content: '若已被任一专业实例或观测点引用，删除会失败。',
    type: 'error',
    onOk: async () => {
      await accreditationStandardApi.delete(record.id)
      void message.success('已删除')
      await loadPageData()
    },
  })
}

/* ========== 信号指标：认证标准库健康度 ========== */
const signals = computed<SignalMetric[]>(() => {
  return [
    { key: 'all-total', label: '认证标准总数', value: summary.value.totalCount, tone: 'blue' },
    {
      key: 'enabled',
      label: '全局启用',
      value: summary.value.enabledCount,
      tone: summary.value.enabledCount > 0 ? 'green' : 'gray',
    },
    {
      key: 'disabled',
      label: '全局停用',
      value: summary.value.disabledCount,
      tone: summary.value.disabledCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'pilot',
      label: '全局仅试点',
      value: summary.value.pilotOnlyCount,
      tone: summary.value.pilotOnlyCount > 0 ? 'orange' : 'gray',
    },
    {
      key: 'types',
      label: '全局覆盖认证类型',
      value: summary.value.accreditationTypeCount,
      tone: 'blue',
    },
  ]
})

onMounted(() => {
  void loadPageData()
})

onActivated(() => {
  void loadPageData()
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar layout="workbench" show-title title="认证标准台账" />
    </template>

    <SignalBand
      :metrics="signals"
      variant="panel"
      compact
      class="accreditation-standard__signals"
    />

    <UiCard class="detail-table-card accreditation-standard__table-card">
      <template #title>认证标准台账</template>
      <template #extra>
        <UiButton variant="primary" size="sm" @click="openCreate">新建认证标准</UiButton>
      </template>

      <UiFilterBar
        variant="plain"
        v-model="filterModel"
        :fields="filterFields"
        show-labels
        search-text="查询"
        @search="handleSearch"
        @reset="handleResetSearch"
      />

      <WorkbenchContextGateStrip
        v-if="!loading && total === 0"
        tag="未配置"
        body="尚未配置认证标准条目"
        cta-label="新建认证标准"
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
          <template v-if="column.key === 'accreditationType'">
            {{ accreditationTypeLabel(record.accreditationType) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <UiTag :tone="record.enabled ? 'green' : 'gray'" size="sm">
              {{ record.enabled ? '启用' : '停用' }}
            </UiTag>
            <UiTag v-if="record.isPilotOnly" tone="orange" size="sm">试点</UiTag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <UiTableActions
              :items="buildAccreditationStandardActions(record)"
              split
              @action="(key) => handleAccreditationStandardAction(key, record)"
            />
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <UiDialog
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建认证标准' : '编辑认证标准'"
      :confirm-loading="submitting"
      :width="720"
      @ok="submitEditor"
    >
      <UiForm layout="vertical" :model="editor">
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="编码" required>
              <UiInput size="sm" v-model="editor.standardCode" :disabled="editorMode === 'edit'" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="16">
            <UiFormItem label="名称" required>
              <UiInput size="sm" v-model="editor.standardName" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="认证类型" required>
              <UiSelect
                size="sm"
                v-model="editor.accreditationType"
                :options="accreditationOptions"
                :disabled="editorMode === 'edit'"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="标准年份">
              <UiInput size="sm" v-model="editor.standardYear" placeholder="如 2024" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="6">
            <UiFormItem label="级别 / 文号">
              <UiInput size="sm" v-model="editor.documentNumber" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="颁发机构">
          <UiInput size="sm" v-model="editor.issuingAuthority" />
        </UiFormItem>
        <UiFormItem label="来源链接">
          <UiInput size="sm" v-model="editor.sourceUrl" />
        </UiFormItem>
        <UiFormItem label="摘要">
          <UiTextarea size="sm" v-model="editor.summary" :rows="4" />
        </UiFormItem>
        <div class="dp-space" style="--dp-space-component: 8px">
          <UiCheckbox v-model="editor.enabled">启用</UiCheckbox>
          <UiCheckbox v-model="editor.isPilotOnly">仅试点适用</UiCheckbox>
        </div>
      </UiForm>
    </UiDialog>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.accreditation-standard {
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
    font-size: 15px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: var(--dp-space-component-tight);
    flex-wrap: wrap;
  }

  &__filter {
    width: 130px;

    &--md {
      width: 200px;
    }

    &--lg {
      width: 220px;
    }
  }
}
</style>
