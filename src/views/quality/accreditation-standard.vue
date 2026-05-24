<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
/**
 * 认证标准配置
 *
 * 后端：/api/quality/accreditation-standards
 * 权限：通常由系统管理员或平台运维维护；该页面只做 CRUD。
 */
import type {
  AccreditationStandardQueryPayload,
  AccreditationStandardSavePayload,
  AccreditationStandardVO,
  AccreditationType,
} from '@/apis/quality'
import {
  ACCREDITATION_TYPE_LABEL,
  accreditationStandardApi,
  isAccreditationType,
} from '@/apis/quality'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { UiButton, UiDataTable, UiSearchForm } from '@/components/ui-guide/ui'
import { SignalBand, StageWorkbenchShell } from '@/components/workbench'
import { confirmAsync } from '@/composables/useConfirmDialog'

const list = ref<AccreditationStandardVO[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive<AccreditationStandardQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editor = reactive<AccreditationStandardSavePayload>({
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
  label: ACCREDITATION_TYPE_LABEL[value],
}))

const columns: ColumnsType = [
  { title: '编码', dataIndex: 'standardCode', key: 'standardCode', width: 140 },
  { title: '名称', dataIndex: 'standardName', key: 'standardName' },
  { title: '认证类型', dataIndex: 'accreditationType', key: 'accreditationType', width: 180 },
  { title: '标准年份', dataIndex: 'standardYear', key: 'standardYear', width: 100 },
  { title: '文号', dataIndex: 'documentNumber', key: 'documentNumber', width: 160 },
  { title: '状态', key: 'enabled', width: 120 },
  { title: '操作', key: 'actions', width: 180, fixed: 'right' },
]

const filterFields: FilterField[] = [
  {
    key: 'accreditationType',
    label: '认证类型',
    type: 'select',
    placeholder: '认证类型',
    allowClear: true,
    options: accreditationOptions,
    width: 220,
  },
  {
    key: 'enabled',
    label: '状态',
    type: 'select',
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
    label: '关键字',
    type: 'input',
    placeholder: '编码/名称',
    width: 200,
    inputPrefixIcon: 'search',
  },
]

const filterModel = ref<Record<string, unknown>>({
  accreditationType: undefined,
  enabled: undefined,
  keyword: '',
})

function accreditationTypeLabel(value: AccreditationType): string {
  return ACCREDITATION_TYPE_LABEL[value]
}

async function loadList() {
  loading.value = true
  try {
    const page = await accreditationStandardApi.page({
      ...query,
      keyword: query.keyword?.trim() || undefined,
    })
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
  const accTypeRaw = filterModel.value.accreditationType
  query.accreditationType = isAccreditationType(accTypeRaw) ? accTypeRaw : undefined
  const enabledRaw = filterModel.value.enabled
  query.enabled = enabledRaw === 'enabled' ? true : enabledRaw === 'disabled' ? false : undefined
  query.keyword = typeof filterModel.value.keyword === 'string' ? filterModel.value.keyword : ''
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleResetSearch() {
  filterModel.value = { accreditationType: undefined, enabled: undefined, keyword: '' }
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
    await loadList()
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
      await loadList()
    },
  })
}

/* ========== 信号指标：认证标准库健康度 ========== */

const signals = computed<SignalMetric[]>(() => {
  const enabled = list.value.filter((s) => s.enabled).length
  const disabled = list.value.filter((s) => !s.enabled).length
  const pilot = list.value.filter((s) => s.isPilotOnly).length
  const types = new Set(list.value.map((s) => s.accreditationType)).size
  return [
    { key: 'total', label: '当前页记录', value: list.value.length, tone: 'blue' },
    { key: 'all-total', label: '认证标准总数', value: total.value, tone: 'blue' },
    { key: 'enabled', label: '启用', value: enabled, tone: enabled > 0 ? 'green' : 'gray' },
    { key: 'disabled', label: '停用', value: disabled, tone: disabled > 0 ? 'orange' : 'gray' },
    { key: 'pilot', label: '仅试点', value: pilot, tone: pilot > 0 ? 'orange' : 'gray' },
    { key: 'types', label: '覆盖认证类型', value: types, tone: 'blue' },
  ]
})

onMounted(() => loadList())
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="as__context">
        <div class="as__context-info">
          <h2 class="as__title">认证标准库</h2>
        </div>
      </div>
    </template>

    <SignalBand :metrics="signals" compact class="as__signals" />

    <section class="as__panel">
      <header class="as__panel-header">
        <h3 class="as__panel-title">认证标准台账</h3>
        <div class="as__panel-actions">
          <UiButton variant="primary" size="sm" @click="openCreate"> 新建认证标准 </UiButton>
        </div>
      </header>

      <UiSearchForm
        v-model="filterModel"
        :fields="filterFields"
        :show-labels="false"
        class="as__search-form"
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
          <template v-if="column.key === 'accreditationType'">
            {{ accreditationTypeLabel(text) }}
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled ? 'green' : 'default'">
              {{ record.enabled ? '启用' : '停用' }}
            </a-tag>
            <a-tag v-if="record.isPilotOnly" color="orange">试点</a-tag>
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
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 240px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

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
