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
  AccreditationType,
} from '@/apis/quality'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ACCREDITATION_TYPE_LABEL, accreditationStandardApi } from '@/apis/quality'
import { UiButton, UiCard, UiDataTable, UiFilterBar, UiTag, UiTextAction } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { readPageList, readPageTotal } from '@/utils/page-result'
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
  accreditationType: 'ENGINEERING_ACCREDITATION',
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
  accreditationType?: AccreditationType
  enabled?: 'enabled' | 'disabled'
  keyword: string
}

const ACCREDITATION_TYPES: AccreditationType[] = [
  'ENGINEERING_ACCREDITATION',
  'TEACHER_ACCREDITATION',
  'MEDICAL_HEALTH_ACCREDITATION',
  'ART_DESIGN_QUALITY_EVALUATION',
  'ECONOMICS_FINANCE_QUALITY_EVALUATION',
  'LAW_QUALITY_EVALUATION',
  'AGRICULTURE_ACCREDITATION',
  'GENERAL_QUALITY_EVALUATION',
]

const accreditationOptions = ACCREDITATION_TYPES.map((value) => ({
  value,
  label: strictEnumLabel(ACCREDITATION_TYPE_LABEL, value, '认证类型'),
}))

const columns: ColumnsType<AccreditationStandardVO> = [
  { title: '编码', dataIndex: 'standardCode', key: 'standardCode', width: 140 },
  { title: '名称', dataIndex: 'standardName', key: 'standardName' },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 180 },
  { title: '标准年份', dataIndex: 'standardYear', key: 'standardYear', width: 100 },
  { title: '文号', dataIndex: 'documentNumber', key: 'documentNumber', width: 160 },
  { title: '状态', key: 'enabled', width: 120 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
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

function accreditationTypeLabel(value: AccreditationType): string {
  return strictEnumLabel(ACCREDITATION_TYPE_LABEL, value, '认证类型')
}

async function loadList() {
  loading.value = true
  try {
    const page = await accreditationStandardApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
    list.value = readPageList(page, '认证标准加载失败，请稍后重试')
    total.value = readPageTotal(page, '认证标准加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function loadSummary() {
  summary.value = await accreditationStandardApi.summary()
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
  Object.assign(editor, record)
  editorVisible.value = true
}

async function submitEditor() {
  if (!editor.standardCode.trim() || !editor.standardName.trim() || !editor.accreditationType) {
    message.error('请填写编码、名称、认证类型')
    return
  }
  submitting.value = true
  try {
    if (editorMode.value === 'create') await accreditationStandardApi.create(editor)
    else await accreditationStandardApi.update(editor)
    message.success('已保存')
    editorVisible.value = false
    await loadPageData()
  } finally {
    submitting.value = false
  }
}

async function handleDelete(record: AccreditationStandardVO) {
  void confirmAsync({
    title: `删除认证标准 ${record.standardCode}？`,
    content: '若已被任一专业实例或观测点引用，删除会失败。',
    type: 'error',
    onOk: async () => {
      await accreditationStandardApi.delete(record.id)
      message.success('已删除')
      await loadPageData()
    },
  })
}

/* ========== 信号指标：认证标准库健康度 ==========
 * 说明：启用 / 停用 / 试点 / 覆盖类型 使用后端全局聚合口径；当前页记录仅反映本页可见行数。
 */
const signals = computed<SignalMetric[]>(() => {
  return [
    { key: 'page-total', label: '当前页记录', value: list.value.length, tone: 'blue' },
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


onMounted(() => loadPageData())
</script>

<template>
  <StageWorkbenchShell>
    <SignalBand :metrics="signals" compact class="as__signals" />

    <UiCard class="detail-table-card as__table-card">
      <template #title>认证标准台账</template>
      <template #extra>
        <UiButton variant="primary" size="sm" @click="openCreate">新建认证标准</UiButton>
      </template>

      <UiFilterBar
        v-model="filterModel"
        :fields="filterFields"
        show-labels
        search-text="查询"
        @search="handleSearch"
        @reset="handleResetSearch"
      />

      <UiDataTable
        class="student-detail-table__data-table"
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
            <div class="operations-cell" @click.stop>
              <UiTextAction @click="openEdit(record)">编辑</UiTextAction>
              <UiTextAction tone="danger" @click="handleDelete(record)">删除</UiTextAction>
            </div>
          </template>
        </template>
      </UiDataTable>
    </UiCard>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建认证标准' : '编辑认证标准'"
      :confirm-loading="submitting"
      width="720px"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="编码" required>
              <a-input v-model:value="editor.standardCode" />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="名称" required>
              <a-input v-model:value="editor.standardName" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="认证类型" required>
              <a-select v-model:value="editor.accreditationType" :options="accreditationOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="标准年份">
              <a-input v-model:value="editor.standardYear" placeholder="如 2024" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="级别 / 文号">
              <a-input v-model:value="editor.documentNumber" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="颁发机构">
          <a-input v-model:value="editor.issuingAuthority" />
        </a-form-item>
        <a-form-item label="来源链接">
          <a-input v-model:value="editor.sourceUrl" />
        </a-form-item>
        <a-form-item label="摘要">
          <a-textarea v-model:value="editor.summary" :rows="4" />
        </a-form-item>
        <a-space>
          <a-checkbox v-model:checked="editor.enabled">启用</a-checkbox>
          <a-checkbox v-model:checked="editor.isPilotOnly">仅试点适用</a-checkbox>
        </a-space>
      </a-form>
    </a-modal>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.as {
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
      width: 200px;
    }

    &--lg {
      width: 220px;
    }
  }
}
</style>
