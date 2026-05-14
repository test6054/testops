<script setup lang="ts">
/**
 * 材料归档 + 专家材料包导出
 *
 * 功能：
 * - 列表分页查归档记录（按业务类型 / 归档分类 / 关键字筛选）
 * - 触发专家材料包导出（REQUIREMENT / PROGRAM_ACCREDITATION），打 ZIP -> edu-storage 上传 -> 落归档 -> edu-message 通知
 * - 详情抽屉
 */
import type {
  ArchiveBusinessType,
  ArchiveQueryPayload,
  ArchiveSavePayload,
  ArchiveVO,
  ExpertPackageExportPayload,
} from '@/apis/quality'
import { message, Modal } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import {
  ARCHIVE_BUSINESS_TYPE_LABEL,
  archiveApi,
  EXPERT_PACKAGE_TYPE_LABEL,
} from '@/apis/quality'

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

const businessTypeOptions = Object.entries(ARCHIVE_BUSINESS_TYPE_LABEL).map(([value, label]) => ({ value, label }))

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
  }
  finally {
    loading.value = false
  }
}

function handlePageChange(page: number, pageSize: number) {
  query.pageNum = page
  query.pageSize = pageSize
  loadList()
}

function resetQuery() {
  query.pageNum = 1
  query.businessType = undefined
  query.archiveCategory = ''
  query.archiveOfficeConfirmed = undefined
  query.keyword = ''
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
    message.error('请填写目标 ID（按毕业要求时为 graduation_requirement_id；按专业认证时为 training_plan_id）')
    return
  }
  const recipients = recipientInput.value
    .split(',')
    .map(s => s.trim())
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
  }
  finally {
    exportSubmitting.value = false
  }
}

async function openDetail(record: ArchiveVO) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detailRecord.value = await archiveApi.detail(record.id)
  }
  finally {
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
  }
  finally {
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
    }
    else {
      await archiveApi.update(payload)
      message.success('已更新归档记录')
    }
    editorVisible.value = false
    await loadList()
  }
  finally {
    editorSubmitting.value = false
  }
}

function handleDelete(record: ArchiveVO) {
  Modal.confirm({
    title: `删除归档 ${record.archiveCode}？`,
    content: '删除后文件本身保留在 edu-storage，仅删除归档台账记录。',
    okType: 'danger',
    onOk: async () => {
      await archiveApi.delete(record.id)
      message.success('已删除')
      await loadList()
    },
  })
}

onMounted(loadList)
</script>

<template>
  <div class="archive-page">
    <a-card title="材料归档" :bordered="false">
      <template #extra>
        <a-space>
          <a-select
            v-model:value="query.businessType"
            placeholder="业务类型"
            style="width: 160px"
            allow-clear
            :options="businessTypeOptions"
          />
          <a-input v-model:value="query.archiveCategory" placeholder="归档分类" style="width: 120px" />
          <a-input v-model:value="query.keyword" placeholder="关键字" style="width: 180px" @press-enter="loadList" />
          <a-button type="primary" @click="loadList">
            查询
          </a-button>
          <a-button @click="resetQuery">
            重置
          </a-button>
          <a-button type="primary" @click="openExport">
            导出专家材料包
          </a-button>
        </a-space>
      </template>

      <a-table
        :data-source="list"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{
          current: query.pageNum,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (n: number) => `共 ${n} 条`,
          onChange: handlePageChange,
        }"
      >
        <a-table-column title="归档编码" data-index="archiveCode" />
        <a-table-column title="业务类型" data-index="businessType" width="160">
          <template #default="{ text }">
            <a-tag :color="text === 'EXPERT_PACKAGE' ? 'gold' : 'blue'">
              {{ ARCHIVE_BUSINESS_TYPE_LABEL[text as ArchiveBusinessType] || text }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="业务 ID" data-index="businessId" width="120" />
        <a-table-column title="文件 ID" data-index="fileId" width="120" />
        <a-table-column title="分类" data-index="archiveCategory" />
        <a-table-column title="保管年限" data-index="retentionYears" width="100">
          <template #default="{ text }">
            {{ text ?? '-' }} 年
          </template>
        </a-table-column>
        <a-table-column title="档案室确认" data-index="archiveOfficeConfirmed" width="110">
          <template #default="{ text }">
            <a-tag :color="text ? 'green' : 'default'">
              {{ text ? '已确认' : '未确认' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="归档时间" data-index="archivedAt" width="170" />
        <a-table-column title="操作" width="220" fixed="right">
          <template #default="{ record }">
            <a-space>
              <a-button type="link" size="small" @click="openDetail(record)">
                详情
              </a-button>
              <a-button type="link" size="small" @click="openEdit(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
                删除
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="exportVisible"
      title="导出专家材料包"
      :confirm-loading="exportSubmitting"
      @ok="submitExport"
    >
      <a-alert
        type="info"
        show-icon
        message="REQUIREMENT 整包：targetId 为毕业要求 ID；PROGRAM_ACCREDITATION 整包：targetId 为培养方案 ID。导出后会自动落 t_quality_archive 并通过 edu-message 推送站内信。"
        style="margin-bottom: 12px"
      />
      <a-form layout="vertical" :model="exportForm">
        <a-form-item label="材料包类型" required>
          <a-radio-group v-model:value="exportForm.packageType">
            <a-radio v-for="(label, value) in EXPERT_PACKAGE_TYPE_LABEL" :key="value" :value="value">
              {{ label }}
            </a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="目标 ID" required>
          <a-input
            v-model:value="exportForm.targetId"
            :placeholder="exportForm.packageType === 'REQUIREMENT' ? 'graduation_requirement_id' : 'training_plan_id'"
          />
        </a-form-item>
        <a-form-item label="归档编码">
          <a-input v-model:value="exportForm.archiveCode" placeholder="可选；为空时自动生成 EP-{REQ|PROG}-{id}-{timestamp}" />
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
    </a-modal>

    <a-modal
      v-model:open="editorVisible"
      :title="editorMode === 'create' ? '新建归档记录' : '编辑归档记录'"
      :confirm-loading="editorSubmitting"
      width="700px"
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
                style="width: 100%"
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
    </a-modal>

    <a-drawer
      v-model:open="detailVisible"
      title="归档详情"
      width="520"
      :loading="detailLoading"
    >
      <a-descriptions v-if="detailRecord" :column="1" size="small" bordered>
        <a-descriptions-item label="归档编码">
          {{ detailRecord.archiveCode }}
        </a-descriptions-item>
        <a-descriptions-item label="业务类型">
          <a-tag>{{ ARCHIVE_BUSINESS_TYPE_LABEL[detailRecord.businessType as ArchiveBusinessType] || detailRecord.businessType }}</a-tag>
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
          {{ detailRecord.archiveOfficeConfirmed ? '已确认' : '未确认' }}
        </a-descriptions-item>
        <a-descriptions-item label="归档时间">
          {{ detailRecord.archivedAt || '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="备注">
          {{ detailRecord.notes || '-' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </div>
</template>

<style scoped lang="scss">
.archive-page {
  padding: 16px;
}
</style>
