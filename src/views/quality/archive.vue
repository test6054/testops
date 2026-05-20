<script setup lang="ts">
/**
 * 质量评价 - 材料归档与专家包导出台
 *
 * 后端契约（ArchiveController）：
 * - GET /quality/archive/page  分页查询
 * - GET /quality/archive/{id}  详情
 * - POST /quality/archive/create / update / delete  手工台帐补登
 * - POST /quality/archive/expert-package/export  专家材料包异步导出，返回 archiveId
 */
import type {
  ArchiveQueryPayload,
  ArchiveSavePayload,
  ArchiveVO,
  ExpertPackageExportPayload,
} from '@/apis/quality'
import {
  ARCHIVE_BUSINESS_TYPE_LABEL,
  archiveApi,
  EXPERT_PACKAGE_TYPE_LABEL,
  isArchiveBusinessType,
} from '@/apis/quality'
import type { AuditTimelineEvent, SignalMetric } from '@/types/workbench'
import { message } from 'ant-design-vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { computed, onMounted, reactive, ref } from 'vue'
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { FilterField } from '@/components/ui-guide/ui/types'
import { UiButton, UiDataTable, UiDrawer, UiEmpty, UiSearchForm } from '@/components/ui-guide/ui'
import {
  AuditTimelineDrawer,
  ContextBar,
  SignalBand,
  StageWorkbenchShell,
} from '@/components/workbench'
import { getOperationLogPage } from '@/apis/edu/operation-logs'

/* ========== 状态守卫 helper：禁用 as 类型断言 ========== */

function archiveBusinessTypeLabel(value: unknown): string {
  if (isArchiveBusinessType(value)) return ARCHIVE_BUSINESS_TYPE_LABEL[value]
  return typeof value === 'string' && value ? value : '-'
}

function archiveBusinessTypeColor(value: unknown): string {
  if (!isArchiveBusinessType(value)) return 'default'
  if (value === 'EXPERT_PACKAGE') return 'gold'
  if (value === 'REPORT') return 'cyan'
  if (value === 'GRADUATION_REQUIREMENT') return 'purple'
  return 'blue'
}

function isExpertPackageRecord(value: unknown): boolean {
  return isArchiveBusinessType(value) && value === 'EXPERT_PACKAGE'
}

const list = ref<ArchiveVO[]>([])
const total = ref(0)
const loading = ref(false)

const query = reactive<ArchiveQueryPayload>({
  pageNum: 1,
  pageSize: 10,
  businessType: undefined,
  archiveCategory: '',
  archiveOfficeConfirmed: undefined,
  keyword: '',
})

const businessTypeOptions = Object.entries(ARCHIVE_BUSINESS_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}))

const filterFields: FilterField[] = [
  {
    key: 'businessType',
    label: '业务类型',
    type: 'select',
    placeholder: '业务类型',
    allowClear: true,
    options: businessTypeOptions,
    width: 180,
  },
  { key: 'archiveCategory', label: '归档分类', type: 'input', placeholder: '归档分类', width: 130 },
  {
    key: 'keyword',
    label: '关键字',
    type: 'input',
    placeholder: '关键字',
    width: 180,
    inputPrefixIcon: 'search',
  },
]

const filterModel = ref<Record<string, unknown>>({
  businessType: undefined,
  archiveCategory: '',
  keyword: '',
})

const exportVisible = ref(false)
const exportSubmitting = ref(false)
const exportForm = reactive<ExpertPackageExportPayload>({
  packageType: 'REQUIREMENT',
  targetId: '',
  archiveCode: '',
  retentionYears: 20,
  archiveCategory: '',
  notes: '',
  recipientUserIds: [],
})
const recipientInput = ref('')

const detailVisible = ref(false)
const detailRecord = ref<ArchiveVO | null>(null)
const detailLoading = ref(false)

const editorVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editorSubmitting = ref(false)
const editor = reactive<ArchiveSavePayload>({
  archiveCode: '',
  businessType: 'TRAINING_PLAN',
  businessId: '',
  fileId: '',
  archiveCategory: '',
  retentionPolicyCode: '',
  retentionYears: undefined,
  digitalStatus: '',
  notes: '',
})

async function loadList() {
  loading.value = true
  try {
    const page = await archiveApi.page({
      ...query,
      businessType: query.businessType || undefined,
      archiveCategory: query.archiveCategory?.trim() || undefined,
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
  const businessTypeRaw = filterModel.value.businessType
  query.businessType = isArchiveBusinessType(businessTypeRaw) ? businessTypeRaw : undefined
  query.archiveCategory =
    typeof filterModel.value.archiveCategory === 'string' ? filterModel.value.archiveCategory : ''
  query.keyword = typeof filterModel.value.keyword === 'string' ? filterModel.value.keyword : ''
}

function handleSearch() {
  query.pageNum = 1
  syncFilterToQuery()
  loadList()
}

function handleResetSearch() {
  filterModel.value = { businessType: undefined, archiveCategory: '', keyword: '' }
  query.pageNum = 1
  query.archiveOfficeConfirmed = undefined
  syncFilterToQuery()
  loadList()
}

function openExport() {
  Object.assign(exportForm, {
    packageType: 'REQUIREMENT',
    targetId: '',
    archiveCode: '',
    retentionYears: 20,
    archiveCategory: '',
    notes: '',
    recipientUserIds: [],
  })
  recipientInput.value = ''
  exportVisible.value = true
}

async function submitExport() {
  if (!exportForm.targetId.trim()) {
    message.error(
      '请填写目标 ID（按毕业要求时为 graduation_requirement_id；按专业认证时为 training_plan_id）',
    )
    return
  }
  const recipients = recipientInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  exportSubmitting.value = true
  try {
    const archiveId = await archiveApi.exportExpertPackage({
      ...exportForm,
      targetId: exportForm.targetId.trim(),
      archiveCode: exportForm.archiveCode?.trim() || undefined,
      archiveCategory: exportForm.archiveCategory?.trim() || undefined,
      notes: exportForm.notes?.trim() || undefined,
      recipientUserIds: recipients.length ? recipients : undefined,
    })
    message.success(`导出成功，归档 ID = ${archiveId}`)
    exportVisible.value = false
    await loadList()
  } finally {
    exportSubmitting.value = false
  }
}

async function openDetail(record: ArchiveVO) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await archiveApi.detail(record.id)
  } finally {
    detailLoading.value = false
  }
}

function openCreate() {
  editorMode.value = 'create'
  Object.assign(editor, {
    id: undefined,
    archiveCode: '',
    businessType: 'TRAINING_PLAN',
    businessId: '',
    fileId: '',
    archiveCategory: '',
    retentionPolicyCode: '',
    retentionYears: undefined,
    digitalStatus: '',
    notes: '',
  })
  editorVisible.value = true
}

async function openEdit(record: ArchiveVO) {
  editorMode.value = 'edit'
  detailLoading.value = true
  try {
    const detail = await archiveApi.detail(record.id)
    Object.assign(editor, {
      id: detail.id,
      archiveCode: detail.archiveCode,
      businessType: detail.businessType,
      businessId: detail.businessId,
      fileId: detail.fileId,
      archiveCategory: detail.archiveCategory || '',
      retentionPolicyCode: detail.retentionPolicyCode || '',
      retentionYears: detail.retentionYears,
      digitalStatus: detail.digitalStatus || '',
      notes: detail.notes || '',
    })
    editorVisible.value = true
  } finally {
    detailLoading.value = false
  }
}

async function submitEditor() {
  if (!editor.archiveCode.trim()) {
    message.error('请填写归档编码')
    return
  }
  if (!editor.businessType || !editor.businessId?.trim() || !editor.fileId?.trim()) {
    message.error('请填写业务类型、业务 ID 与归档文件 ID')
    return
  }
  editorSubmitting.value = true
  try {
    const payload: ArchiveSavePayload = {
      ...editor,
      archiveCode: editor.archiveCode.trim(),
      businessId: editor.businessId.trim(),
      fileId: editor.fileId.trim(),
      archiveCategory: editor.archiveCategory?.trim() || undefined,
      retentionPolicyCode: editor.retentionPolicyCode?.trim() || undefined,
      digitalStatus: editor.digitalStatus?.trim() || undefined,
      notes: editor.notes?.trim() || undefined,
    }
    if (editorMode.value === 'create') {
      await archiveApi.create(payload)
      message.success('已新建归档记录')
    } else {
      await archiveApi.update(payload)
      message.success('已更新归档记录')
    }
    editorVisible.value = false
    await loadList()
  } finally {
    editorSubmitting.value = false
  }
}

function handleDelete(record: ArchiveVO) {
  void confirmAsync({
    title: `删除归档 ${record.archiveCode}？`,
    content: '删除后文件本身保留在 edu-storage，仅删除归档台帐记录。',
    type: 'error',
    onOk: async () => {
      await archiveApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

/* ========== 信号指标 ========== */

const signals = computed<SignalMetric[]>(() => {
  const totalCount = list.value.length
  const confirmed = list.value.filter((r) => r.archiveOfficeConfirmed).length
  const pending = totalCount - confirmed
  const expertPackages = list.value.filter((r) => isExpertPackageRecord(r.businessType)).length
  const reports = list.value.filter((r) => r.businessType === 'REPORT').length
  return [
    { key: 'total', label: '本页归档', value: totalCount, tone: 'blue' },
    { key: 'confirmed', label: '已确认', value: confirmed, tone: confirmed > 0 ? 'green' : 'gray' },
    { key: 'pending', label: '待确认', value: pending, tone: pending > 0 ? 'orange' : 'gray' },
    {
      key: 'expert',
      label: '专家材料包',
      value: expertPackages,
      tone: expertPackages > 0 ? 'gold' : 'gray',
    },
    { key: 'report', label: '报告归档', value: reports, tone: reports > 0 ? 'cyan' : 'gray' },
    { key: 'overall', label: '总台帐', value: total.value, tone: 'gray' },
  ]
})

const columns: ColumnsType = [
  { title: '归档编码', dataIndex: 'archiveCode', key: 'archiveCode' },
  { title: '业务类型', dataIndex: 'businessType', key: 'businessType', width: 160 },
  { title: '业务 ID', dataIndex: 'businessId', key: 'businessId', width: 120 },
  { title: '文件 ID', dataIndex: 'fileId', key: 'fileId', width: 120 },
  { title: '分类', dataIndex: 'archiveCategory', key: 'archiveCategory' },
  { title: '保管年限', dataIndex: 'retentionYears', key: 'retentionYears', width: 100 },
  {
    title: '档案室确认',
    dataIndex: 'archiveOfficeConfirmed',
    key: 'archiveOfficeConfirmed',
    width: 110,
  },
  { title: '归档时间', dataIndex: 'archivedAt', key: 'archivedAt', width: 170 },
  { title: '操作', key: 'actions', width: 280, fixed: 'right' },
]

const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

async function openAuditDrawer(record: ArchiveVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const page = await getOperationLogPage({
      pageNum: 1,
      pageSize: 50,
      module: 'ARCHIVE',
      category: 'QUALITY',
      description: record.id,
    })
    auditEvents.value = page.list.map((log) => ({
      id: log.id,
      operatorName: log.userDto?.nickName || log.userDto?.userName || '-',
      operationType: log.type,
      operationLabel: log.detail || log.type,
      time: log.createTime,
      targetType: log.module,
      targetId: log.bizId || undefined,
      beforeValue: log.changeDetails ? JSON.parse(log.changeDetails)?.before : undefined,
      afterValue: log.changeDetails ? JSON.parse(log.changeDetails)?.after : undefined,
    }))
  } catch {
    auditEvents.value = []
  } finally {
    auditLoading.value = false
  }
}

onMounted(loadList)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar title="质量评价 - 材料归档">
        <template #actions>
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
            刷新
          </UiButton>
          <UiButton variant="primary" size="sm" @click="openCreate"> 补登台帐 </UiButton>
          <UiButton variant="primary" size="sm" @click="openExport"> 导出专家材料包 </UiButton>
        </template>
      </ContextBar>
    </template>

    <SignalBand :metrics="signals" compact class="archive__signals" />

    <section class="archive__panel">
      <header class="archive__panel-header">
        <h3 class="archive__panel-title">归档列表</h3>
      </header>

      <UiSearchForm
        v-model="filterModel"
        :fields="filterFields"
        :show-labels="false"
        class="archive__search-form"
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
          <template v-if="column.key === 'businessType'">
            <a-tag :color="archiveBusinessTypeColor(text)">
              {{ archiveBusinessTypeLabel(text) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'archiveCategory'">
            {{ text || '-' }}
          </template>
          <template v-else-if="column.key === 'retentionYears'"> {{ text ?? '-' }} 年 </template>
          <template v-else-if="column.key === 'archiveOfficeConfirmed'">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '已确认' : '未确认' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'archivedAt'">
            {{ text || '-' }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <UiButton variant="ghost" size="sm" @click="openDetail(record)"> 详情 </UiButton>
              <UiButton variant="ghost" size="sm" @click="openEdit(record)"> 编辑 </UiButton>
              <UiButton variant="danger-ghost" size="sm" @click="handleDelete(record)">
                删除
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="openAuditDrawer(record)"> 审计 </UiButton>
            </a-space>
          </template>
        </template>
      </UiDataTable>
    </section>

    <UiDrawer
      v-model:open="exportVisible"
      title="导出专家材料包"
      :width="560"
      :confirm-loading="exportSubmitting"
      :hide-footer="false"
      ok-text="触发导出"
      @ok="submitExport"
    >
      <a-alert
        type="info"
        show-icon
        message="REQUIREMENT 整包：targetId 为毕业要求 ID；PROGRAM_ACCREDITATION 整包：targetId 为培养方案 ID。导出后会自动落 t_quality_archive 并通过 edu-message 推送站内信。"
        class="archive__alert"
      />
      <a-form layout="vertical" :model="exportForm">
        <a-form-item label="材料包类型" required>
          <a-radio-group v-model:value="exportForm.packageType">
            <a-radio
              v-for="(label, value) in EXPERT_PACKAGE_TYPE_LABEL"
              :key="value"
              :value="value"
            >
              {{ label }}
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="目标 ID" required>
          <a-input
            v-model:value="exportForm.targetId"
            :placeholder="
              exportForm.packageType === 'REQUIREMENT'
                ? 'graduation_requirement_id'
                : 'training_plan_id'
            "
          />
        </a-form-item>
        <a-form-item label="归档编码">
          <a-input
            v-model:value="exportForm.archiveCode"
            placeholder="可选；为空时自动生成 EP-{REQ|PROG}-{id}-{timestamp}"
          />
        </a-form-item>
        <a-form-item label="保管年限">
          <a-input-number v-model:value="exportForm.retentionYears" :min="1" :max="50" />
        </a-form-item>
        <a-form-item label="归档分类">
          <a-input v-model:value="exportForm.archiveCategory" placeholder="默认 EXPERT_PACKAGE" />
        </a-form-item>
        <a-form-item label="通知接收人 user_id">
          <a-input v-model:value="recipientInput" placeholder="多个用逗号分隔，例如：1, 5" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="exportForm.notes" :rows="2" placeholder="可选" />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建归档记录' : '编辑归档记录'"
      :width="720"
      :confirm-loading="editorSubmitting"
      :hide-footer="false"
      ok-text="保存"
      @ok="submitEditor"
    >
      <a-form layout="vertical" :model="editor">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="归档编码" required>
              <a-input v-model:value="editor.archiveCode" placeholder="例：EP-REQ-1-2026" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="业务类型" required>
              <a-select v-model:value="editor.businessType" :options="businessTypeOptions" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="业务对象 ID" required>
              <a-input v-model:value="editor.businessId" placeholder="对应业务类型的实体主键" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归档文件 ID" required>
              <a-input v-model:value="editor.fileId" placeholder="edu-storage 中的文件节点 ID" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="归档分类">
              <a-input v-model:value="editor.archiveCategory" placeholder="例：EXPERT_PACKAGE" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="保管期编码">
              <a-input v-model:value="editor.retentionPolicyCode" placeholder="可选" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="保管年限">
              <a-input-number
                v-model:value="editor.retentionYears"
                :min="1"
                :max="50"
                class="archive__number-full"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="电子化保管状态">
          <a-input v-model:value="editor.digitalStatus" placeholder="例：FULL_DIGITAL / HYBRID" />
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea v-model:value="editor.notes" :rows="2" />
        </a-form-item>
      </a-form>
    </UiDrawer>

    <UiDrawer v-model:open="detailVisible" title="归档详情" :width="560" :hide-footer="true">
      <UiEmpty v-if="!detailRecord && !detailLoading" description="详情数据未加载" size="sm" />
      <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="归档编码">
          {{ detailRecord.archiveCode }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型">
          <a-tag :color="archiveBusinessTypeColor(detailRecord.businessType)">
            {{ archiveBusinessTypeLabel(detailRecord.businessType) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="业务 ID">
          {{ detailRecord.businessId }}
        </a-descriptions-item>
        <a-descriptions-item label="文件 ID">
          {{ detailRecord.fileId }}
        </a-descriptions-item>
        <a-descriptions-item label="分类">
          {{ detailRecord.archiveCategory || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="保管年限">
          {{ detailRecord.retentionYears ?? '-' }} 年
        </a-descriptions-item>
        <a-descriptions-item label="保管期编码">
          {{ detailRecord.retentionPolicyCode || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="档案室确认">
          <a-tag :color="detailRecord.archiveOfficeConfirmed ? 'green' : 'default'">
            {{ detailRecord.archiveOfficeConfirmed ? '已确认' : '未确认' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="归档时间">
          {{ detailRecord.archivedAt || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="备注">
          {{ detailRecord.notes || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </UiDrawer>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="归档操作审计"
      show-diff
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.archive {
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
    width: 180px;

    &--xs {
      width: 130px;
    }
  }

  &__alert {
    margin-bottom: 16px;
  }

  &__number-full {
    width: 100%;
  }
}
</style>
