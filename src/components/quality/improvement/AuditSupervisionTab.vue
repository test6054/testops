<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AuditEvidenceItemRequest } from '@/apis/quality/audit-evidence'
import type {
  AuditSupervisionConclusionCode,
  AuditSupervisionFindingItemRequest,
  AuditSupervisionQueryRequest,
  AuditSupervisionSaveRequest,
  AuditSupervisionVO,
} from '@/apis/quality/audit-supervision'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type {
  QualitySelectorChangeValue,
  WorkbenchSignalRefreshHandler,
} from '@/composables/quality/improvement'
import message from 'ant-design-vue/es/message'
import { reactive, ref } from 'vue'
import {
  AUDIT_SUPERVISION_CONCLUSION_OPTIONS,
  AUDIT_SUPERVISION_CONCLUSION_TONE,
  AUDIT_SUPERVISION_SCOPE_OPTIONS,
  auditSupervisionApi,
  AuditSupervisionConclusionDescription,
  AuditSupervisionScopeCode,
  AuditSupervisionScopeDescription,
} from '@/apis/quality/audit-supervision'
import { AuditSupervisionTypeCode, AuditSupervisionTypeDescription } from '@/apis/quality/types'
import ImprovementWorkbenchPanel from '@/components/quality/improvement/ImprovementWorkbenchPanel.vue'
import {
  ArchiveSelector,
  AuditIssueSelector,
  AuditRectificationSelector,
  CourseSelector,
  ProgramSelector,
  ReportSelector,
  TeacherSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiTextarea from '@/components/ui-guide/ui/Textarea.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDialog from '@/components/ui-guide/ui/UiDialog.vue'
import UiDivider from '@/components/ui-guide/ui/UiDivider.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { refreshWorkbenchSignalsAfterMutation, selectedId } from '@/composables/quality/improvement'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  assertQualityScopeFresh,
  beginQualityScopeRequest,
  isQualityScopeStaleError,
} from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useQualityStore } from '@/stores/modules/quality'
import {
  ALL_AUDIT_EVIDENCE_TYPE_CODES,
  AuditEvidenceTypeCode,
  AuditEvidenceTypeDescription,
} from '@/types/enums/audit-evidence-type-enum'
import {
  ALL_AUDIT_SUPERVISION_FINDING_TYPE_CODES,
  AuditSupervisionFindingTypeCode,
  AuditSupervisionFindingTypeDescription,
} from '@/types/enums/audit-supervision-finding-type-enum'
import { showFormValidationMessage, showUserError, toUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AuditSupervisionTab' })

const props = defineProps<{
  onLoadError?: (error: Error | null) => void
  onWorkbenchRefresh?: WorkbenchSignalRefreshHandler
}>()

const qualityStore = useQualityStore()

const supColumns: ColumnsType = [
  {
    title: '编码',
    dataIndex: 'supervisionCode',
    key: 'supervisionCode',
    width: 140,
    fixed: 'left',
  },
  { title: '标题', key: 'supTitle' },
  { title: '类型', dataIndex: 'supervisionType', key: 'supervisionType', width: 110 },
  { title: '范围', dataIndex: 'supervisionScope', key: 'supervisionScope', width: 100 },
  { title: '督导时间', dataIndex: 'supervisedTime', key: 'supervisedTime', width: 160 },
  { title: '结论', dataIndex: 'conclusion', key: 'conclusion', width: 110 },
  { title: '操作', key: 'actions', width: 160 },
]

const supervisionTypeOptions: Array<{ value: AuditSupervisionTypeCode, label: string }> = [
  { value: AuditSupervisionTypeCode.DAILY, label: AuditSupervisionTypeDescription.DAILY },
  { value: AuditSupervisionTypeCode.SPECIAL, label: AuditSupervisionTypeDescription.SPECIAL },
  {
    value: AuditSupervisionTypeCode.ACCREDITATION_PRE,
    label: AuditSupervisionTypeDescription.ACCREDITATION_PRE,
  },
  {
    value: AuditSupervisionTypeCode.ACCREDITATION_AUDIT,
    label: AuditSupervisionTypeDescription.ACCREDITATION_AUDIT,
  },
]
function supervisionTypeLabel(value: AuditSupervisionTypeCode): string {
  return strictEnumLabel(AuditSupervisionTypeDescription, value, '督导类型')
}

function supervisionScopeLabel(value: AuditSupervisionScopeCode): string {
  return strictEnumLabel(AuditSupervisionScopeDescription, value, '督导范围')
}

function supervisionConclusionLabel(value: AuditSupervisionConclusionCode): string {
  return strictEnumLabel(AuditSupervisionConclusionDescription, value, '督导结论')
}

function supervisionConclusionColor(value: AuditSupervisionConclusionCode): BadgeTone {
  return strictEnumTone(AUDIT_SUPERVISION_CONCLUSION_TONE, value, '督导结论')
}

const supList = ref<AuditSupervisionVO[]>([])
const supTotal = ref(0)
const supLoading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const supQuery = reactive<AuditSupervisionQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  supervisionType: undefined,
  conclusion: undefined,
  keyword: '',
})

interface SupFilterForm {
  supervisionType?: AuditSupervisionTypeCode
  conclusion?: AuditSupervisionConclusionCode
  keyword: string
}

const supFilterForm = reactive<SupFilterForm>({
  keyword: '',
})

const supFilterFields: FilterField[] = [
  {
    key: 'supervisionType',
    type: 'select',
    label: '类型',
    placeholder: '类型',
    allowClear: true,
    width: 120,
    options: supervisionTypeOptions,
  },
  {
    key: 'conclusion',
    type: 'select',
    label: '结论',
    placeholder: '结论',
    allowClear: true,
    width: 120,
    options: AUDIT_SUPERVISION_CONCLUSION_OPTIONS.map((item) => ({
      value: item.value,
      label: item.label,
    })),
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

function syncSupFilterToQuery() {
  supQuery.supervisionType = supFilterForm.supervisionType
  supQuery.conclusion = supFilterForm.conclusion
  supQuery.keyword = supFilterForm.keyword
}

function handleSupFilterSearch() {
  supQuery.pageNum = 1
  syncSupFilterToQuery()
  loadList()
}

const supFindingTypeOptions = ALL_AUDIT_SUPERVISION_FINDING_TYPE_CODES.map((value) => ({
  value,
  label: AuditSupervisionFindingTypeDescription[value],
}))
const supFindingSeverityOptions = [
  { value: 'MINOR', label: '轻微' },
  { value: 'MAJOR', label: '严重' },
  { value: 'CRITICAL', label: '重大' },
]

const supEditorVisible = ref(false)
const supEditorMode = ref<'create' | 'edit'>('create')
type AuditSupervisionEditorState = AuditSupervisionSaveRequest & {
  findingItems: AuditSupervisionFindingItemRequest[]
  evidenceItems: AuditEvidenceItemRequest[]
}

const supEditor = reactive<AuditSupervisionEditorState>({
  auditIssueId: '',
  rectificationId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  supervisionCode: '',
  supervisionTitle: '',
  supervisionType: AuditSupervisionTypeCode.DAILY,
  supervisionScope: AuditSupervisionScopeCode.COURSE,
  supervisorUserId: '',
  supervisedTime: '',
  summary: '',
  findingItems: [],
  conclusion: undefined,
  archiveId: '',
  evidenceItems: [],
})
const supEditorSubmitting = ref(false)

const auditEvidenceTypeOptions = ALL_AUDIT_EVIDENCE_TYPE_CODES.map((value) => ({
  value,
  label: AuditEvidenceTypeDescription[value],
}))

function addSupervisionFindingItem() {
  supEditor.findingItems.push({
    findingType: AuditSupervisionFindingTypeCode.PROCESS,
    findingTitle: '',
    findingDescription: '',
    severity: 'MINOR',
    responsibleUnit: '',
    improvementSuggestion: '',
  })
}

function removeSupervisionFindingItem(index: number) {
  supEditor.findingItems.splice(index, 1)
}

function addSupervisionEvidenceItem() {
  supEditor.evidenceItems.push({
    evidenceType: AuditEvidenceTypeCode.REVIEW_RECORD,
    evidenceTitle: '',
    evidenceCode: '',
    archiveId: '',
    fileNodeId: '',
    reportId: '',
    remark: '',
  })
}

function removeSupervisionEvidenceItem(index: number) {
  supEditor.evidenceItems.splice(index, 1)
}

async function loadList(options?: { refreshSignals?: boolean }) {
  const scope = beginQualityScopeRequest()
  supLoading.value = true
  beginLoad()
  try {
    const page = await auditSupervisionApi.page({
      ...supQuery,
      programId: supQuery.programId || qualityStore.currentProgramId || undefined,
      keyword: supQuery.keyword?.trim() || undefined,
    })
    assertQualityScopeFresh(scope)
    supList.value = page.list
    supQuery.pageNum = page.pageNum
    supQuery.pageSize = page.pageSize
    supTotal.value = page.total
    if (supList.value.length === 0 && supTotal.value > 0 && supQuery.pageNum > 1) {
      supQuery.pageNum -= 1
      await loadList(options)
      return
    }
    if (options?.refreshSignals) {
      await refreshWorkbenchSignalsAfterMutation(
        scope,
        props.onWorkbenchRefresh,
        props.onLoadError,
        '工作台指标加载失败',
      )
    }
    okLoad()
  } catch (error) {
    if (isQualityScopeStaleError(error) || scope.isStale()) {
      return
    }
    failLoad()
    const err = toUserError(error, '督导复查记录加载失败')
    props.onLoadError?.(err)
    showUserError(error, '督导复查记录加载失败')
    throw err
  } finally {
    supLoading.value = false
  }
}

function handleSupPageChange(page: { current: number, pageSize: number }) {
  supQuery.pageNum = page.current
  supQuery.pageSize = page.pageSize
  loadList()
}

function resetSupQuery() {
  supQuery.pageNum = 1
  supQuery.programId = undefined
  syncSupFilterToQuery()
  loadList()
}

function openSupCreate() {
  supEditorMode.value = 'create'
  Object.assign(supEditor, {
    id: undefined,
    auditIssueId: '',
    rectificationId: '',
    programId: qualityStore.currentProgramId || '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    supervisionCode: '',
    supervisionTitle: '',
    supervisionType: AuditSupervisionTypeCode.DAILY,
    supervisionScope: AuditSupervisionScopeCode.COURSE,
    supervisorUserId: '',
    supervisedTime: '',
    summary: '',
    findingItems: [],
    conclusion: '',
    archiveId: '',
    evidenceItems: [],
  })
  supEditorVisible.value = true
}

function openSupEdit(record: AuditSupervisionVO) {
  supEditorMode.value = 'edit'
  Object.assign(supEditor, {
    id: record.id,
    auditIssueId: record.auditIssueId || '',
    rectificationId: record.rectificationId || '',
    programId: record.programId || '',
    trainingPlanId: record.trainingPlanId || '',
    qualityCourseId: record.qualityCourseId || '',
    supervisionCode: record.supervisionCode,
    supervisionTitle: record.supervisionTitle,
    supervisionType: record.supervisionType,
    supervisionScope: record.supervisionScope || '',
    supervisorUserId: record.supervisorUserId || '',
    supervisedTime: record.supervisedTime || '',
    summary: record.summary || '',
    findingItems:
      record.findingItems?.map((item) => ({
        findingType: item.findingType,
        findingTitle: item.findingTitle,
        findingDescription: item.findingDescription,
        severity: item.severity,
        responsibleUnit: item.responsibleUnit,
        improvementSuggestion: item.improvementSuggestion,
      })) || [],
    conclusion: record.conclusion || '',
    archiveId: record.archiveId || '',
    evidenceItems:
      record.evidenceItems?.map((item) => ({
        evidenceType: item.evidenceType,
        evidenceTitle: item.evidenceTitle,
        evidenceCode: item.evidenceCode,
        archiveId: item.archiveId,
        fileNodeId: item.fileNodeId,
        reportId: item.reportId,
        remark: item.remark,
      })) || [],
  })
  supEditorVisible.value = true
}

async function submitSupEditor() {
  if (
    !supEditor.supervisionCode.trim()
    || !supEditor.supervisionTitle.trim()
    || !supEditor.supervisionType
  ) {
    void message.error('请填写编码、标题、督导类型')
    return
  }
  for (const [index, item] of supEditor.findingItems.entries()) {
    if (!item.findingTitle?.trim()) {
      void message.error(`第 ${index + 1} 条发现缺少标题`)
      return
    }
  }
  for (const [index, item] of supEditor.evidenceItems.entries()) {
    if (!item.evidenceTitle?.trim()) {
      void message.error(`第 ${index + 1} 条证据缺少标题`)
      return
    }
  }
  supEditorSubmitting.value = true
  try {
    const request: AuditSupervisionSaveRequest = {
      id: supEditor.id,
      supervisionCode: supEditor.supervisionCode.trim(),
      supervisionTitle: supEditor.supervisionTitle.trim(),
      supervisionType: supEditor.supervisionType,
      auditIssueId: supEditor.auditIssueId || undefined,
      rectificationId: supEditor.rectificationId || undefined,
      programId: supEditor.programId || undefined,
      trainingPlanId: supEditor.trainingPlanId || undefined,
      qualityCourseId: supEditor.qualityCourseId || undefined,
      supervisionScope: supEditor.supervisionScope || undefined,
      supervisorUserId: supEditor.supervisorUserId || undefined,
      supervisedTime: supEditor.supervisedTime || undefined,
      summary: supEditor.summary || undefined,
      findingItems: supEditor.findingItems.map((item) => ({
        findingType: item.findingType || undefined,
        findingTitle: item.findingTitle?.trim(),
        findingDescription: item.findingDescription?.trim() || undefined,
        severity: item.severity || undefined,
        responsibleUnit: item.responsibleUnit?.trim() || undefined,
        improvementSuggestion: item.improvementSuggestion?.trim() || undefined,
      })),
      conclusion: supEditor.conclusion || undefined,
      archiveId: supEditor.archiveId || undefined,
      evidenceItems: supEditor.evidenceItems.map((item) => ({
        evidenceType: item.evidenceType || undefined,
        evidenceTitle: item.evidenceTitle?.trim(),
        evidenceCode: item.evidenceCode?.trim() || undefined,
        archiveId: item.archiveId || undefined,
        fileNodeId: item.fileNodeId || undefined,
        reportId: item.reportId || undefined,
        remark: item.remark?.trim() || undefined,
      })),
    }
    if (supEditorMode.value === 'create') {
      await auditSupervisionApi.create(request)
      void message.success('已创建')
    } else {
      await auditSupervisionApi.update(request)
      void message.success('已保存')
    }
    supEditorVisible.value = false
    await loadList({ refreshSignals: true })
  } finally {
    supEditorSubmitting.value = false
  }
}

async function handleSupDelete(record: AuditSupervisionVO) {
  void confirmAsync({
    title: `删除督导记录 ${record.supervisionCode}？`,
    type: 'error',
    onOk: async () => {
      await auditSupervisionApi.delete(record.id)
      void message.success('已删除')
      await loadList({ refreshSignals: true })
    },
  })
}

function buildAuditSupervisionActions(_record: AuditSupervisionVO): UiTableRowActionItem[] {
  return [
    { key: 'edit', label: '编辑' },
    { key: 'delete', label: '删除', tone: 'danger' },
  ]
}

function handleAuditSupervisionAction(key: string, record: AuditSupervisionVO): void {
  switch (key) {
    case 'edit':
      openSupEdit(record)
      break
    case 'delete':
      void handleSupDelete(record)
      break
  }
}

function handleSupSupervisorChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    showFormValidationMessage('督导人只能单选，请重新选择')
    return
  }
  supEditor.supervisorUserId = value ?? ''
}

function handleSupArchiveChange(value: string | null | undefined) {
  supEditor.archiveId = selectedId(value)
}

function handleSupAuditIssueChange(value: string | null | undefined) {
  supEditor.auditIssueId = selectedId(value)
}

function handleSupRectificationChange(value: string | null | undefined) {
  supEditor.rectificationId = selectedId(value)
}

function handleSupProgramChange(value: string | null | undefined) {
  supEditor.programId = selectedId(value)
  supEditor.qualityCourseId = ''
}

function handleSupTrainingPlanChange(value: string | null | undefined) {
  supEditor.trainingPlanId = selectedId(value)
}

function handleSupCourseChange(value: string | null | undefined) {
  supEditor.qualityCourseId = selectedId(value)
}

function createSupEvidenceArchiveChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleSupEvidenceArchiveChange(index, value)
}

function createSupEvidenceReportChangeHandler(index: number) {
  return (value: QualitySelectorChangeValue) => handleSupEvidenceReportChange(index, value)
}

function handleSupEvidenceArchiveChange(index: number, value: QualitySelectorChangeValue) {
  supEditor.evidenceItems[index].archiveId = Array.isArray(value) ? '' : selectedId(value)
}

function handleSupEvidenceReportChange(index: number, value: QualitySelectorChangeValue) {
  supEditor.evidenceItems[index].reportId = Array.isArray(value) ? '' : selectedId(value)
}

defineExpose({
  loadList,
})
</script>

<template>
  <ImprovementWorkbenchPanel title="督导复查 / 现场检查">
    <template #extra>
      <UiButton variant="primary" size="sm" @click="openSupCreate">新建督导记录</UiButton>
    </template>

    <UiFilterBar
      variant="plain"
      v-model="supFilterForm"
      :fields="supFilterFields"
      show-labels
      search-text="查询"
      @search="handleSupFilterSearch"
      @reset="resetSupQuery"
    />

    <UiDataTable
      v-model:current="supQuery.pageNum"
      v-model:page-size="supQuery.pageSize"
      :columns="supColumns"
      :data-source="supList"
      :loading="supLoading"
      :load-error="loadError"
      row-key="id"
      size="middle"
      :total="supTotal"
      flat
      @page-change="handleSupPageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'supTitle'">
          <div>{{ record.supervisionTitle }}</div>
          <div v-if="record.summary" class="iwb-tab__sub-desc">
            {{ record.summary.substring(0, 80) }}{{ record.summary.length > 80 ? '…' : '' }}
          </div>
        </template>
        <template v-else-if="column.key === 'supervisionType'">
          <UiTag tone="gray" size="sm">{{ supervisionTypeLabel(record.supervisionType) }}</UiTag>
        </template>
        <template v-else-if="column.key === 'supervisionScope'">
          {{ record.supervisionScope ? supervisionScopeLabel(record.supervisionScope) : '—' }}
        </template>
        <template v-else-if="column.key === 'conclusion'">
          <UiTag
            v-if="record.conclusion"
            :tone="supervisionConclusionColor(record.conclusion)"
            size="sm"
          >
            {{ supervisionConclusionLabel(record.conclusion) }}
          </UiTag>
          <span v-else class="iwb-tab__muted">未形成结论</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="buildAuditSupervisionActions(record)"
            split
            @action="(key) => handleAuditSupervisionAction(key, record)"
          />
        </template>
      </template>
    </UiDataTable>
  </ImprovementWorkbenchPanel>

  <UiDialog
    v-model:open="supEditorVisible"
    :title="supEditorMode === 'create' ? '新建督导记录' : '编辑督导记录'"
    :confirm-loading="supEditorSubmitting"
    width="1040px"
    @ok="submitSupEditor"
  >
    <UiForm layout="vertical" :model="supEditor">
      <UiRow :gutter="12">
        <UiCol :span="6">
          <UiFormItem label="编码" required>
            <UiInput
              size="sm"
              v-model="supEditor.supervisionCode"
              :disabled="supEditorMode === 'edit'"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="6">
          <UiFormItem label="督导类型" required>
            <UiSelect
              size="sm"
              v-model="supEditor.supervisionType"
              :options="supervisionTypeOptions"
              :disabled="supEditorMode === 'edit'"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="6">
          <UiFormItem label="范围">
            <UiSelect
              size="sm"
              v-model="supEditor.supervisionScope"
              :options="AUDIT_SUPERVISION_SCOPE_OPTIONS"
              :disabled="supEditorMode === 'edit'"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="6">
          <UiFormItem label="督导时间">
            <UiInput
              size="sm"
              v-model="supEditor.supervisedTime"
              placeholder="yyyy-MM-dd HH:mm:ss"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiFormItem label="标题" required>
        <UiInput size="sm" v-model="supEditor.supervisionTitle" />
      </UiFormItem>
      <UiFormItem label="督导人">
        <TeacherSelector
          :value="supEditor.supervisorUserId || null"
          @change="handleSupSupervisorChange"
        />
      </UiFormItem>
      <UiFormItem label="督导摘要">
        <UiTextarea size="sm" v-model="supEditor.summary" :rows="3" />
      </UiFormItem>
      <UiDivider orientation="left">发现明细</UiDivider>
      <div class="iwb-tab__detail-toolbar">
        <UiButton size="sm" variant="primary" @click="addSupervisionFindingItem">新增发现</UiButton>
      </div>
      <div v-for="(item, index) in supEditor.findingItems" :key="index" class="iwb-tab__detail-row">
        <div class="iwb-tab__detail-row-head">
          <span class="iwb-tab__detail-row-title">发现 {{ index + 1 }}</span>
          <UiButton
            size="sm"
            status="danger"
            variant="ghost"
            @click="removeSupervisionFindingItem(index)"
          >
            删除
          </UiButton>
        </div>
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="类型">
              <UiSelect size="sm" v-model="item.findingType" :options="supFindingTypeOptions" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="10">
            <UiFormItem label="标题" required>
              <UiInput size="sm" v-model="item.findingTitle" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="4">
            <UiFormItem label="严重程度">
              <UiSelect size="sm" v-model="item.severity" :options="supFindingSeverityOptions" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="4">
            <UiFormItem label="责任单位">
              <UiInput size="sm" v-model="item.responsibleUnit" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="12">
            <UiFormItem label="问题描述">
              <UiTextarea size="sm" v-model="item.findingDescription" :rows="2" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="12">
            <UiFormItem label="改进措施">
              <UiTextarea size="sm" v-model="item.improvementSuggestion" :rows="2" />
            </UiFormItem>
          </UiCol>
        </UiRow>
      </div>
      <UiRow :gutter="12">
        <UiCol :span="12">
          <UiFormItem label="结论">
            <UiSelect
              v-model="supEditor.conclusion"
              allow-clear
              size="sm"
              :options="AUDIT_SUPERVISION_CONCLUSION_OPTIONS"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem label="关联归档">
            <ArchiveSelector
              :value="supEditor.archiveId || null"
              @change="handleSupArchiveChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiDivider orientation="left">关联业务对象（可选）</UiDivider>
      <UiRow :gutter="12">
        <UiCol :span="8">
          <UiFormItem label="关联问题">
            <AuditIssueSelector
              :value="supEditor.auditIssueId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupAuditIssueChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="关联整改任务">
            <AuditRectificationSelector
              :value="supEditor.rectificationId || null"
              :audit-issue-id="supEditor.auditIssueId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupRectificationChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="8">
          <UiFormItem label="所属专业">
            <ProgramSelector
              :value="supEditor.programId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupProgramChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiRow :gutter="12">
        <UiCol :span="12">
          <UiFormItem label="培养方案">
            <TrainingPlanSelector
              :value="supEditor.trainingPlanId || null"
              :program-id="supEditor.programId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupTrainingPlanChange"
            />
          </UiFormItem>
        </UiCol>
        <UiCol :span="12">
          <UiFormItem label="质量评价课程">
            <CourseSelector
              :value="supEditor.qualityCourseId || null"
              :program-id="supEditor.programId || null"
              :training-plan-id="supEditor.trainingPlanId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupCourseChange"
            />
          </UiFormItem>
        </UiCol>
      </UiRow>
      <UiDivider orientation="left">证据明细</UiDivider>
      <div class="iwb-tab__detail-toolbar">
        <UiButton size="sm" variant="primary" @click="addSupervisionEvidenceItem">
          新增证据
        </UiButton>
      </div>
      <div
        v-for="(item, index) in supEditor.evidenceItems"
        :key="index"
        class="iwb-tab__detail-row"
      >
        <div class="iwb-tab__detail-row-head">
          <span class="iwb-tab__detail-row-title">证据 {{ index + 1 }}</span>
          <UiButton
            size="sm"
            status="danger"
            variant="ghost"
            @click="removeSupervisionEvidenceItem(index)"
          >
            删除
          </UiButton>
        </div>
        <UiRow :gutter="12">
          <UiCol :span="6">
            <UiFormItem label="类型">
              <UiSelect size="sm" v-model="item.evidenceType" :options="auditEvidenceTypeOptions" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="10">
            <UiFormItem label="标题" required>
              <UiInput size="sm" v-model="item.evidenceTitle" />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="编号">
              <UiInput size="sm" v-model="item.evidenceCode" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiRow :gutter="12">
          <UiCol :span="8">
            <UiFormItem label="关联归档">
              <ArchiveSelector
                :value="item.archiveId || null"
                @change="createSupEvidenceArchiveChangeHandler(index)"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="关联报告">
              <ReportSelector
                :value="item.reportId || null"
                @change="createSupEvidenceReportChangeHandler(index)"
              />
            </UiFormItem>
          </UiCol>
          <UiCol :span="8">
            <UiFormItem label="文件节点 ID">
              <UiInput size="sm" v-model="item.fileNodeId" />
            </UiFormItem>
          </UiCol>
        </UiRow>
        <UiFormItem label="备注">
          <UiTextarea size="sm" v-model="item.remark" :rows="2" />
        </UiFormItem>
      </div>
    </UiForm>
  </UiDialog>
</template>

<style scoped lang="scss">
.iwb-tab {
  &__sub-desc {
    margin-top: 4px;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__muted {
    color: var(--dp-text-muted);
  }

  &__detail-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  &__detail-row {
    padding: 12px;
    margin-bottom: 12px;
    background: var(--dp-surface-subtle);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
  }

  &__detail-row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__detail-row-title {
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }
}
</style>
