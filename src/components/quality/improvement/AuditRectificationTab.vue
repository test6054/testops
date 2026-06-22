<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { QualityAuditEvidenceItem } from '@/apis/quality/audit-evidence'
import type { AuditIssueVO } from '@/apis/quality/audit-issue'
import type {
  AuditRectificationQueryRequest,
  AuditRectificationSaveRequest,
  AuditRectificationVO,
} from '@/apis/quality/audit-rectification'
import type { AuditRectificationStatus } from '@/apis/quality/types'
import type { FilterField } from '@/components/ui-guide/ui/types'
import type { QualitySelectorChangeValue, WorkbenchSignalRefreshHandler } from '@/composables/quality/improvement'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { auditIssueApi } from '@/apis/quality/audit-issue'
import { auditRectificationApi } from '@/apis/quality/audit-rectification'
import {
  AUDIT_RECTIFICATION_STATUS_COLOR,
  AUDIT_RECTIFICATION_STATUS_LABEL,
} from '@/apis/quality/types'
import ImprovementWorkbenchPanel from '@/components/quality/improvement/ImprovementWorkbenchPanel.vue'
import {
  ArchiveSelector,
  AuditIssueSelector,
  ReportSelector,
  TeacherSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import {
  refreshWorkbenchSignalsAfterMutation,
  selectedId,
} from '@/composables/quality/improvement'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { assertQualityScopeFresh, beginQualityScopeRequest, isQualityScopeStaleError } from '@/composables/useScopeRequestGuard'
import { showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'
import { promptModal } from '@/views/quality/_helpers'

defineOptions({ name: 'AuditRectificationTab' })

const props = defineProps<{
  onLoadError?: (error: Error | null) => void
  onWorkbenchRefresh?: WorkbenchSignalRefreshHandler
}>()

const rectColumns: ColumnsType = [
  { title: '编码', dataIndex: 'rectificationCode', key: 'rectificationCode', width: 140 },
  { title: '标题', key: 'rectTitle' },
  { title: '责任人', key: 'ownerRef', width: 140 },
  { title: '截止', dataIndex: 'dueDate', key: 'dueDate', width: 110 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '操作', key: 'actions', width: 340, fixed: 'right' },
]

function rectificationStatusLabel(value: AuditRectificationStatus): string {
  return strictEnumLabel(AUDIT_RECTIFICATION_STATUS_LABEL, value, '整改任务状态')
}

function rectificationStatusColor(value: AuditRectificationStatus) {
  return strictEnumTone(AUDIT_RECTIFICATION_STATUS_COLOR, value, '整改任务状态')
}

const rectList = ref<AuditRectificationVO[]>([])
const rectTotal = ref(0)
const rectLoading = ref(false)
const rectIssuesCache = ref<Map<string, AuditIssueVO>>(new Map())
const rectQuery = reactive<AuditRectificationQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  auditIssueId: undefined,
  ownerUserId: undefined,
  status: undefined,
  keyword: '',
})
const rectStatusOptions: AuditRectificationStatus[] = [
  'PLANNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'VERIFIED',
  'RETURNED',
  'CLOSED',
]

const rectFilterForm = reactive({
  status: undefined as AuditRectificationStatus | undefined,
  auditIssueId: undefined as string | undefined,
  keyword: '',
})

const rectFilterFields: FilterField[] = [
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: rectStatusOptions.map((status) => ({
      value: status,
      label: rectificationStatusLabel(status),
    })),
  },
  {
    key: 'auditIssueId',
    type: 'custom',
    label: '关联问题',
    width: 220,
    minWidth: 200,
    maxWidth: 280,
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '编码/标题',
    width: 160,
    triggerSearchOnChange: false,
  },
]

function syncRectFilterToQuery() {
  rectQuery.status = rectFilterForm.status
  rectQuery.auditIssueId = rectFilterForm.auditIssueId
  rectQuery.keyword = rectFilterForm.keyword
}

function handleRectFilterSearch() {
  rectQuery.pageNum = 1
  syncRectFilterToQuery()
  loadList()
}

const rectEditorVisible = ref(false)
const rectEditorMode = ref<'create' | 'edit'>('create')
const rectEditor = reactive<AuditRectificationSaveRequest>({
  auditIssueId: '',
  rectificationCode: '',
  rectificationTitle: '',
  rectificationAction: '',
  ownerUserId: '',
  ownerRole: '',
  dueDate: '',
})
const rectEditorSubmitting = ref(false)
const rectEvidenceEditorVisible = ref(false)
const rectEvidenceEditorSubmitting = ref(false)
const rectEvidenceEditorRecord = ref<AuditRectificationVO | null>(null)
const rectEvidenceEditor = reactive<{
  progressRemark: string
  evidenceItems: QualityAuditEvidenceItem[]
}>({
  progressRemark: '',
  evidenceItems: [],
})

const auditEvidenceTypeOptions = [
  { value: 'COURSE_ARCHIVE', label: '课程归档' },
  { value: 'ASSESSMENT_REPORT', label: '评价报告' },
  { value: 'REVIEW_RECORD', label: '复核记录' },
  { value: 'SUPPORTING_FILE', label: '支撑材料' },
  { value: 'OTHER', label: '其他' },
]

async function loadList(options?: { refreshSignals?: boolean }) {
  const scope = beginQualityScopeRequest()
  rectLoading.value = true
  try {
    const page = await auditRectificationApi.page({
      ...rectQuery,
      keyword: rectQuery.keyword?.trim() || undefined,
    })
    assertQualityScopeFresh(scope)
    rectList.value = readPageList(page, '整改任务加载失败，请稍后重试')
    rectQuery.pageNum = page.pageNum
    rectQuery.pageSize = page.pageSize
    rectTotal.value = readPageTotal(page, '整改任务加载失败，请稍后重试')
    if (rectList.value.length === 0 && rectTotal.value > 0 && rectQuery.pageNum > 1) {
      rectQuery.pageNum -= 1
      await loadList(options)
      return
    }
    const issueIds = Array.from(new Set(rectList.value.map((r) => r.auditIssueId).filter(Boolean)))
    for (const id of issueIds) {
      if (rectIssuesCache.value.has(id)) continue
      const issue = await auditIssueApi.detail(id)
      assertQualityScopeFresh(scope)
      rectIssuesCache.value.set(id, issue)
    }
    if (options?.refreshSignals) {
      await refreshWorkbenchSignalsAfterMutation(
        scope,
        props.onWorkbenchRefresh,
        props.onLoadError,
        '工作台指标加载失败，请稍后重试',
      )
    }
  } catch (error) {
    if (isQualityScopeStaleError(error) || scope.isStale()) {
      return
    }
    const err = toUserError(error, '整改任务加载失败')
    props.onLoadError?.(err)
    showUserError(error, '整改任务加载失败')
    throw err
  } finally {
    rectLoading.value = false
  }
}

function rectIssueCode(value: string | null | undefined): string {
  if (value == null || value === '') return '-'
  const issue = rectIssuesCache.value.get(value)
  return issue?.issueCode?.trim() || '—'
}

function handleRectPageChange(page: { current: number, pageSize: number }) {
  rectQuery.pageNum = page.current
  rectQuery.pageSize = page.pageSize
  loadList()
}

function resetRectQuery() {
  rectQuery.pageNum = 1
  rectQuery.ownerUserId = undefined
  syncRectFilterToQuery()
  loadList()
}

function openRectCreate() {
  rectEditorMode.value = 'create'
  Object.assign(rectEditor, {
    id: undefined,
    auditIssueId: '',
    rectificationCode: '',
    rectificationTitle: '',
    rectificationAction: '',
    ownerUserId: '',
    ownerRole: '',
    dueDate: '',
  })
  rectEditorVisible.value = true
}

function openRectEdit(record: AuditRectificationVO) {
  if (!canEditAuditRectification(record.status)) {
    message.error('当前状态不允许编辑整改任务')
    return
  }
  rectEditorMode.value = 'edit'
  Object.assign(rectEditor, {
    id: record.id,
    auditIssueId: record.auditIssueId,
    rectificationCode: record.rectificationCode,
    rectificationTitle: record.rectificationTitle,
    rectificationAction: record.rectificationAction,
    ownerUserId: record.ownerUserId,
    ownerRole: record.ownerRole || '',
    dueDate: record.dueDate,
  })
  rectEditorVisible.value = true
}

async function submitRectEditor() {
  if (rectEditorMode.value === 'edit' && rectEditor.id) {
    const current = rectList.value.find((item) => item.id === rectEditor.id)
    if (current && !canEditAuditRectification(current.status)) {
      message.error('当前状态不允许编辑整改任务')
      return
    }
  }
  if (
    !rectEditor.auditIssueId
    || !rectEditor.rectificationCode.trim()
    || !rectEditor.rectificationTitle.trim()
    || !rectEditor.ownerUserId
    || !rectEditor.dueDate
  ) {
    message.error('请填写关联问题、编码、标题、责任人、截止日期')
    return
  }
  rectEditorSubmitting.value = true
  try {
    const request: AuditRectificationSaveRequest = {
      ...rectEditor,
      rectificationCode: rectEditor.rectificationCode.trim(),
      rectificationTitle: rectEditor.rectificationTitle.trim(),
      ownerRole: rectEditor.ownerRole || undefined,
    }
    if (rectEditorMode.value === 'create') {
      await auditRectificationApi.create(request)
      message.success('已创建')
    } else {
      await auditRectificationApi.update(request)
      message.success('已保存')
    }
    rectEditorVisible.value = false
    await loadList({ refreshSignals: true })
  } finally {
    rectEditorSubmitting.value = false
  }
}

async function handleRectDelete(record: AuditRectificationVO) {
  void confirmAsync({
    title: `删除整改任务 ${record.rectificationCode}？`,
    type: 'error',
    onOk: async () => {
      await auditRectificationApi.delete(record.id)
      message.success('已删除')
      await loadList({ refreshSignals: true })
    },
  })
}

function canEditAuditRectification(status: AuditRectificationStatus): boolean {
  return status === 'PLANNED' || status === 'IN_PROGRESS' || status === 'RETURNED'
}

function addRectEvidenceItem() {
  rectEvidenceEditor.evidenceItems.push({
    evidenceType: 'REVIEW_RECORD',
    evidenceTitle: '',
    evidenceCode: '',
    archiveId: '',
    fileNodeId: '',
    reportId: '',
    remark: '',
  })
}

function removeRectEvidenceItem(index: number) {
  rectEvidenceEditor.evidenceItems.splice(index, 1)
}

async function submitRectEvidenceEditor() {
  const record = rectEvidenceEditorRecord.value
  if (!record) return
  if (!rectEvidenceEditor.progressRemark.trim()) {
    message.error('请填写提交说明')
    return
  }
  if (!rectEvidenceEditor.evidenceItems.length) {
    message.error('请至少新增一条整改证据')
    return
  }
  for (const [index, item] of rectEvidenceEditor.evidenceItems.entries()) {
    if (!item.evidenceTitle?.trim()) {
      message.error(`第 ${index + 1} 条证据缺少标题`)
      return
    }
  }
  rectEvidenceEditorSubmitting.value = true
  try {
    await auditRectificationApi.updateProgress({
      id: record.id,
      targetStatus: 'SUBMITTED',
      progressRemark: rectEvidenceEditor.progressRemark.trim(),
      evidenceItems: rectEvidenceEditor.evidenceItems.map((item) => ({
        evidenceType: item.evidenceType || undefined,
        evidenceTitle: item.evidenceTitle?.trim(),
        evidenceCode: item.evidenceCode?.trim() || undefined,
        archiveId: item.archiveId || undefined,
        fileNodeId: item.fileNodeId || undefined,
        reportId: item.reportId || undefined,
        remark: item.remark?.trim() || undefined,
      })),
    })
    message.success('已提交复核')
    rectEvidenceEditorVisible.value = false
    rectEvidenceEditorRecord.value = null
    await loadList({ refreshSignals: true })
  } finally {
    rectEvidenceEditorSubmitting.value = false
  }
}

async function advanceRectProgress(
  record: AuditRectificationVO,
  target: 'IN_PROGRESS' | 'SUBMITTED',
) {
  if (target === 'SUBMITTED') {
    rectEvidenceEditorRecord.value = record
    rectEvidenceEditor.progressRemark = ''
    rectEvidenceEditor.evidenceItems.splice(0, rectEvidenceEditor.evidenceItems.length, {
      evidenceType: 'REVIEW_RECORD',
      evidenceTitle: '',
      evidenceCode: '',
      archiveId: '',
      fileNodeId: '',
      reportId: '',
      remark: '',
    })
    rectEvidenceEditorVisible.value = true
    return
  }
  const remark = await promptModal({
    title: '开始实施',
    placeholder: '请填写进展说明',
    required: false,
  })
  if (remark === null) return
  await auditRectificationApi.updateProgress({
    id: record.id,
    targetStatus: target,
    progressRemark: remark ?? undefined,
  })
  message.success('已更新')
  await loadList({ refreshSignals: true })
}

async function verifyRect(record: AuditRectificationVO, decision: 'APPROVED' | 'REJECTED') {
  const remark = await promptModal({
    title: decision === 'APPROVED' ? '复核通过' : '复核退回',
    placeholder: '请填写复核说明',
    required: decision === 'REJECTED',
    emptyErrorMessage: '退回必须填写原因',
    okType: decision === 'REJECTED' ? 'danger' : 'primary',
  })
  if (decision === 'REJECTED' && !remark) return
  await auditRectificationApi.verify({
    id: record.id,
    decision,
    remark: remark ?? undefined,
  })
  message.success('已复核')
  await loadList({ refreshSignals: true })
}

async function closeRect(record: AuditRectificationVO) {
  void confirmAsync({
    title: `闭环整改任务 ${record.rectificationCode}？`,
    content: '闭环后该任务不可再修改',
    type: 'warning',
    onOk: async () => {
      await auditRectificationApi.close(record.id)
      message.success('已闭环')
      await loadList({ refreshSignals: true })
    },
  })
}

function handleRectQueryAuditIssueChange(value: string | null | undefined) {
  rectFilterForm.auditIssueId = value ?? undefined
}

function handleRectEditorAuditIssueChange(value: string | null | undefined) {
  rectEditor.auditIssueId = selectedId(value)
}

function handleRectEditorOwnerChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    showUserError(null, '整改责任人只能单选，请重新选择')
    return
  }
  rectEditor.ownerUserId = value ?? ''
}

function createRectEvidenceArchiveChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleRectEvidenceArchiveChange(index, value)
}

function createRectEvidenceReportChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleRectEvidenceReportChange(index, value)
}

function handleRectEvidenceArchiveChange(index: number, value: QualitySelectorChangeValue) {
  const id = Array.isArray(value) ? '' : selectedId(value)
  rectEvidenceEditor.evidenceItems[index].archiveId = id
}

function handleRectEvidenceReportChange(index: number, value: QualitySelectorChangeValue) {
  const id = Array.isArray(value) ? '' : selectedId(value)
  rectEvidenceEditor.evidenceItems[index].reportId = id
}

defineExpose({
  loadList,
})
</script>

<template>
  <ImprovementWorkbenchPanel title="整改任务台账">
    <template #extra>
      <UiButton variant="primary" size="sm" @click="openRectCreate">新建整改任务</UiButton>
    </template>

    <UiFilterBar
      v-model="rectFilterForm"
      :fields="rectFilterFields"
      show-labels
      search-text="查询"
      @search="handleRectFilterSearch"
      @reset="resetRectQuery"
    >
      <template #field-auditIssueId>
        <AuditIssueSelector
          :value="rectFilterForm.auditIssueId || null"
          placeholder="关联问题"
          :width="220"
          @change="handleRectQueryAuditIssueChange"
        />
      </template>
    </UiFilterBar>

    <UiDataTable
      class="student-detail-table__data-table"
      v-model:current="rectQuery.pageNum"
      v-model:page-size="rectQuery.pageSize"
      :columns="rectColumns"
      :data-source="rectList"
      :loading="rectLoading"
      row-key="id"
      size="middle"
      :total="rectTotal"
      flat
      @page-change="handleRectPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'rectTitle'">
          <div>{{ record.rectificationTitle }}</div>
          <div v-if="record.auditIssueId" class="iwb-tab__sub-desc">
            关联问题：{{ rectIssueCode(record.auditIssueId) }}
          </div>
        </template>
        <template v-else-if="column.key === 'ownerRef'">
          {{ record.ownerUserName }}
        </template>
        <template v-else-if="column.key === 'status'">
          <UiTag :tone="rectificationStatusColor(record.status)" size="sm">
            {{ rectificationStatusLabel(record.status) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="operations-cell" @click.stop>
            <UiTextAction
              :disabled="!canEditAuditRectification(record.status)"
              @click="openRectEdit(record)"
            >
              编辑
            </UiTextAction>
            <UiTextAction
              v-if="record.status === 'PLANNED'"
              tone="primary"
              @click="advanceRectProgress(record, 'IN_PROGRESS')"
            >
              开始
            </UiTextAction>
            <UiTextAction
              v-if="record.status === 'IN_PROGRESS'"
              tone="primary"
              @click="advanceRectProgress(record, 'SUBMITTED')"
            >
              提交复核
            </UiTextAction>
            <UiTextAction
              v-if="record.status === 'RETURNED'"
              tone="primary"
              @click="advanceRectProgress(record, 'IN_PROGRESS')"
            >
              重新整改
            </UiTextAction>
            <UiTextAction
              v-if="record.status === 'SUBMITTED'"
              tone="primary"
              @click="verifyRect(record, 'APPROVED')"
            >
              通过
            </UiTextAction>
            <UiTextAction
              v-if="record.status === 'SUBMITTED'"
              tone="danger"
              @click="verifyRect(record, 'REJECTED')"
            >
              退回
            </UiTextAction>
            <UiTextAction
              v-if="record.status === 'VERIFIED'"
              tone="primary"
              @click="closeRect(record)"
            >
              闭环
            </UiTextAction>
            <UiTextAction
              v-if="record.status === 'PLANNED'"
              tone="danger"
              @click="handleRectDelete(record)"
            >
              删除
            </UiTextAction>
          </div>
        </template>
      </template>
    </UiDataTable>
  </ImprovementWorkbenchPanel>

  <a-modal
    v-model:open="rectEditorVisible"
    :title="rectEditorMode === 'create' ? '新建整改任务' : '编辑整改任务'"
    :confirm-loading="rectEditorSubmitting"
    width="760px"
    @ok="submitRectEditor"
  >
    <a-form layout="vertical" :model="rectEditor">
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="编码" required>
            <a-input v-model:value="rectEditor.rectificationCode" />
          </a-form-item>
        </a-col>
        <a-col :span="16">
          <a-form-item label="关联问题" required>
            <AuditIssueSelector
              :value="rectEditor.auditIssueId || null"
              placeholder="选择审核评估问题"
              @change="handleRectEditorAuditIssueChange"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="标题" required>
        <a-input v-model:value="rectEditor.rectificationTitle" />
      </a-form-item>
      <a-form-item label="整改措施" required>
        <a-textarea v-model:value="rectEditor.rectificationAction" :rows="4" />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="责任人" required>
            <TeacherSelector
              :value="rectEditor.ownerUserId || null"
              @change="handleRectEditorOwnerChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="角色">
            <a-input v-model:value="rectEditor.ownerRole" placeholder="如 专业负责人" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="截止日期" required>
            <a-input v-model:value="rectEditor.dueDate" placeholder="yyyy-MM-dd" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>

  <a-modal
    v-model:open="rectEvidenceEditorVisible"
    title="提交整改复核"
    :confirm-loading="rectEvidenceEditorSubmitting"
    width="960px"
    @ok="submitRectEvidenceEditor"
  >
    <a-form layout="vertical" :model="rectEvidenceEditor">
      <a-form-item label="提交说明" required>
        <a-textarea v-model:value="rectEvidenceEditor.progressRemark" :rows="3" />
      </a-form-item>
      <a-divider orientation="left">整改证据明细</a-divider>
      <div class="iwb-tab__detail-toolbar">
        <a-button type="primary" @click="addRectEvidenceItem">新增证据</a-button>
      </div>
      <div
        v-for="(item, index) in rectEvidenceEditor.evidenceItems"
        :key="index"
        class="iwb-tab__detail-row"
      >
        <div class="iwb-tab__detail-row-head">
          <span class="iwb-tab__detail-row-title">证据 {{ index + 1 }}</span>
          <a-button danger size="small" @click="removeRectEvidenceItem(index)">删除</a-button>
        </div>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="类型">
              <a-select v-model:value="item.evidenceType" :options="auditEvidenceTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="10">
            <a-form-item label="标题" required>
              <a-input v-model:value="item.evidenceTitle" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="编号">
              <a-input v-model:value="item.evidenceCode" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="8">
            <a-form-item label="关联归档">
              <ArchiveSelector
                :value="item.archiveId || null"
                @change="createRectEvidenceArchiveChangeHandler(index)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="关联报告">
              <ReportSelector
                :value="item.reportId || null"
                @change="createRectEvidenceReportChangeHandler(index)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="文件节点 ID">
              <a-input v-model:value="item.fileNodeId" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注">
          <a-textarea v-model:value="item.remark" :rows="2" />
        </a-form-item>
      </div>
    </a-form>
  </a-modal>
</template>

<style scoped lang="scss">
.iwb-tab {
  &__sub-desc {
    margin-top: 4px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__detail-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  &__detail-row {
    padding: 12px;
    margin-bottom: 12px;
    background: var(--dp-surface-subtle, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__detail-row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__detail-row-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }
}
</style>
