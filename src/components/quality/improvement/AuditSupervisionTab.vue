<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { QualityAuditEvidenceItem } from '@/apis/quality/audit-evidence'
import type {
  AuditSupervisionConclusion,
  AuditSupervisionFindingItem,
  AuditSupervisionQueryRequest,
  AuditSupervisionSaveRequest,
  AuditSupervisionScope,
  AuditSupervisionVO,
} from '@/apis/quality/audit-supervision'
import { auditSupervisionApi } from '@/apis/quality/audit-supervision'
import type { AuditSupervisionType } from '@/apis/quality/types'
import { AUDIT_SUPERVISION_TYPE_LABEL } from '@/apis/quality/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type {
  QualitySelectorChangeValue,
  WorkbenchSignalRefreshHandler,
} from '@/composables/quality/improvement'
import { refreshWorkbenchSignalsAfterMutation, selectedId } from '@/composables/quality/improvement'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
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
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import {
  assertQualityScopeFresh,
  beginQualityScopeRequest,
  isQualityScopeStaleError,
} from '@/composables/useScopeRequestGuard'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError, toUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone } from '@/utils/strict-enum'

defineOptions({ name: 'AuditSupervisionTab' })

const props = defineProps<{
  onLoadError?: (error: Error | null) => void
  onWorkbenchRefresh?: WorkbenchSignalRefreshHandler
}>()

const qualityStore = useQualityStore()

const supColumns: ColumnsType = [
  { title: '编码', dataIndex: 'supervisionCode', key: 'supervisionCode', width: 140 },
  { title: '标题', key: 'supTitle' },
  { title: '类型', dataIndex: 'supervisionType', key: 'supervisionType', width: 110 },
  { title: '范围', dataIndex: 'supervisionScope', key: 'supervisionScope', width: 100 },
  { title: '督导时间', dataIndex: 'supervisedTime', key: 'supervisedTime', width: 160 },
  { title: '结论', dataIndex: 'conclusion', key: 'conclusion', width: 110 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const supervisionTypeOptions: Array<{ value: AuditSupervisionType; label: string }> = [
  { value: 'DAILY', label: AUDIT_SUPERVISION_TYPE_LABEL.DAILY },
  { value: 'SPECIAL', label: AUDIT_SUPERVISION_TYPE_LABEL.SPECIAL },
  { value: 'PRE_AUDIT', label: AUDIT_SUPERVISION_TYPE_LABEL.PRE_AUDIT },
  { value: 'SITE_VISIT', label: AUDIT_SUPERVISION_TYPE_LABEL.SITE_VISIT },
]
const supScopeOptions = [
  { value: 'COURSE', label: '课程' },
  { value: 'PROGRAM', label: '专业' },
  { value: 'TRAINING_PLAN', label: '培养方案' },
  { value: 'COMPREHENSIVE', label: '综合' },
]
const supScopeLabelMap: Record<AuditSupervisionScope, string> = {
  COURSE: '课程',
  PROGRAM: '专业',
  TRAINING_PLAN: '培养方案',
  COMPREHENSIVE: '综合',
}
const supConclusionOptions: Array<{
  value: AuditSupervisionConclusion
  label: string
  color: string
}> = [
  { value: 'PASS', label: '通过', color: 'green' },
  { value: 'NEEDS_IMPROVEMENT', label: '需改进', color: 'orange' },
  { value: 'FAIL', label: '不通过', color: 'red' },
]
const supConclusionLabelMap: Record<AuditSupervisionConclusion, string> = {
  PASS: '通过',
  NEEDS_IMPROVEMENT: '需改进',
  FAIL: '不通过',
}
const supConclusionColorMap: Record<AuditSupervisionConclusion, BadgeTone> = {
  PASS: 'green',
  NEEDS_IMPROVEMENT: 'orange',
  FAIL: 'red',
}

function supervisionTypeLabel(value: AuditSupervisionType): string {
  return strictEnumLabel(AUDIT_SUPERVISION_TYPE_LABEL, value, '督导类型')
}

function supervisionScopeLabel(value: AuditSupervisionScope): string {
  return strictEnumLabel(supScopeLabelMap, value, '督导范围')
}

function supervisionConclusionLabel(value: AuditSupervisionConclusion): string {
  return strictEnumLabel(supConclusionLabelMap, value, '督导结论')
}

function supervisionConclusionColor(value: AuditSupervisionConclusion): BadgeTone {
  return strictEnumTone(supConclusionColorMap, value, '督导结论')
}

const supList = ref<AuditSupervisionVO[]>([])
const supTotal = ref(0)
const supLoading = ref(false)
const supQuery = reactive<AuditSupervisionQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  supervisionType: undefined,
  conclusion: undefined,
  keyword: '',
})

const supFilterForm = reactive({
  supervisionType: undefined as AuditSupervisionType | undefined,
  conclusion: undefined as AuditSupervisionConclusion | undefined,
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
    options: supConclusionOptions.map((item) => ({ value: item.value, label: item.label })),
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

const supFindingTypeOptions = [
  { value: 'PROCESS', label: '过程执行' },
  { value: 'MATERIAL', label: '材料支撑' },
  { value: 'OUTCOME', label: '结果达成' },
  { value: 'GOVERNANCE', label: '治理闭环' },
  { value: 'OTHER', label: '其他' },
]
const supFindingSeverityOptions = [
  { value: 'MINOR', label: '轻微' },
  { value: 'MAJOR', label: '严重' },
  { value: 'CRITICAL', label: '重大' },
]

const supEditorVisible = ref(false)
const supEditorMode = ref<'create' | 'edit'>('create')
type AuditSupervisionEditorState = AuditSupervisionSaveRequest & {
  findingItems: AuditSupervisionFindingItem[]
  evidenceItems: QualityAuditEvidenceItem[]
}

const supEditor = reactive<AuditSupervisionEditorState>({
  auditIssueId: '',
  rectificationId: '',
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  supervisionCode: '',
  supervisionTitle: '',
  supervisionType: 'DAILY',
  supervisionScope: 'COURSE',
  supervisorUserId: '',
  supervisedTime: '',
  summary: '',
  findingItems: [],
  conclusion: undefined,
  archiveId: '',
  evidenceItems: [],
})
const supEditorSubmitting = ref(false)

const auditEvidenceTypeOptions = [
  { value: 'COURSE_ARCHIVE', label: '课程归档' },
  { value: 'ASSESSMENT_REPORT', label: '评价报告' },
  { value: 'REVIEW_RECORD', label: '复核记录' },
  { value: 'SUPPORTING_FILE', label: '支撑材料' },
  { value: 'OTHER', label: '其他' },
]

function addSupervisionFindingItem() {
  supEditor.findingItems.push({
    findingType: 'PROCESS',
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
    evidenceType: 'REVIEW_RECORD',
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
  try {
    const page = await auditSupervisionApi.page({
      ...supQuery,
      programId: supQuery.programId || qualityStore.currentProgramId || undefined,
      keyword: supQuery.keyword?.trim() || undefined,
    })
    assertQualityScopeFresh(scope)
    supList.value = readPageList(page, '督导复查记录加载失败，请稍后重试')
    supQuery.pageNum = page.pageNum
    supQuery.pageSize = page.pageSize
    supTotal.value = readPageTotal(page, '督导复查记录加载失败，请稍后重试')
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
        '工作台指标加载失败，请稍后重试',
      )
    }
  } catch (error) {
    if (isQualityScopeStaleError(error) || scope.isStale()) {
      return
    }
    const err = toUserError(error, '督导复查记录加载失败')
    props.onLoadError?.(err)
    showUserError(error, '督导复查记录加载失败')
    throw err
  } finally {
    supLoading.value = false
  }
}

function handleSupPageChange(page: { current: number; pageSize: number }) {
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
    supervisionType: 'DAILY',
    supervisionScope: 'COURSE',
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
    findingItems: record.findingItems?.map((item) => ({ ...item })) || [],
    conclusion: record.conclusion || '',
    archiveId: record.archiveId || '',
    evidenceItems: record.evidenceItems?.map((item) => ({ ...item })) || [],
  })
  supEditorVisible.value = true
}

async function submitSupEditor() {
  if (
    !supEditor.supervisionCode.trim() ||
    !supEditor.supervisionTitle.trim() ||
    !supEditor.supervisionType
  ) {
    message.error('请填写编码、标题、督导类型')
    return
  }
  for (const [index, item] of supEditor.findingItems.entries()) {
    if (!item.findingTitle?.trim()) {
      message.error(`第 ${index + 1} 条发现缺少标题`)
      return
    }
  }
  for (const [index, item] of supEditor.evidenceItems.entries()) {
    if (!item.evidenceTitle?.trim()) {
      message.error(`第 ${index + 1} 条证据缺少标题`)
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
      message.success('已创建')
    } else {
      await auditSupervisionApi.update(request)
      message.success('已保存')
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
      message.success('已删除')
      await loadList({ refreshSignals: true })
    },
  })
}

function handleSupSupervisorChange(value: string | string[] | null) {
  if (Array.isArray(value)) {
    showUserError(null, '督导人只能单选，请重新选择')
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
      v-model="supFilterForm"
      :fields="supFilterFields"
      show-labels
      search-text="查询"
      @search="handleSupFilterSearch"
      @reset="resetSupQuery"
    />

    <UiDataTable
      class="student-detail-table__data-table"
      v-model:current="supQuery.pageNum"
      v-model:page-size="supQuery.pageSize"
      :columns="supColumns"
      :data-source="supList"
      :loading="supLoading"
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
          <div class="operations-cell" @click.stop>
            <UiTextAction @click="openSupEdit(record)">编辑</UiTextAction>
            <UiTextAction tone="danger" @click="handleSupDelete(record)">删除</UiTextAction>
          </div>
        </template>
      </template>
    </UiDataTable>
  </ImprovementWorkbenchPanel>

  <a-modal
    v-model:open="supEditorVisible"
    :title="supEditorMode === 'create' ? '新建督导记录' : '编辑督导记录'"
    :confirm-loading="supEditorSubmitting"
    width="1040px"
    @ok="submitSupEditor"
  >
    <a-form layout="vertical" :model="supEditor">
      <a-row :gutter="12">
        <a-col :span="6">
          <a-form-item label="编码" required>
            <a-input
              v-model:value="supEditor.supervisionCode"
              :disabled="supEditorMode === 'edit'"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="督导类型" required>
            <a-select
              v-model:value="supEditor.supervisionType"
              :options="supervisionTypeOptions"
              :disabled="supEditorMode === 'edit'"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="范围">
            <a-select
              v-model:value="supEditor.supervisionScope"
              :options="supScopeOptions"
              :disabled="supEditorMode === 'edit'"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="督导时间">
            <a-input v-model:value="supEditor.supervisedTime" placeholder="yyyy-MM-dd HH:mm:ss" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="标题" required>
        <a-input v-model:value="supEditor.supervisionTitle" />
      </a-form-item>
      <a-form-item label="督导人">
        <TeacherSelector
          :value="supEditor.supervisorUserId || null"
          @change="handleSupSupervisorChange"
        />
      </a-form-item>
      <a-form-item label="督导摘要">
        <a-textarea v-model:value="supEditor.summary" :rows="3" />
      </a-form-item>
      <a-divider orientation="left">发现明细</a-divider>
      <div class="iwb-tab__detail-toolbar">
        <a-button type="primary" @click="addSupervisionFindingItem">新增发现</a-button>
      </div>
      <div v-for="(item, index) in supEditor.findingItems" :key="index" class="iwb-tab__detail-row">
        <div class="iwb-tab__detail-row-head">
          <span class="iwb-tab__detail-row-title">发现 {{ index + 1 }}</span>
          <a-button danger size="small" @click="removeSupervisionFindingItem(index)">
            删除
          </a-button>
        </div>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="类型">
              <a-select v-model:value="item.findingType" :options="supFindingTypeOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="10">
            <a-form-item label="标题" required>
              <a-input v-model:value="item.findingTitle" />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="严重程度">
              <a-select v-model:value="item.severity" :options="supFindingSeverityOptions" />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="责任单位">
              <a-input v-model:value="item.responsibleUnit" />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="问题描述">
              <a-textarea v-model:value="item.findingDescription" :rows="2" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="改进措施">
              <a-textarea v-model:value="item.improvementSuggestion" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </div>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="结论">
            <a-select v-model:value="supEditor.conclusion" allow-clear>
              <a-select-option v-for="c in supConclusionOptions" :key="c.value" :value="c.value">
                {{ c.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="关联归档">
            <ArchiveSelector
              :value="supEditor.archiveId || null"
              @change="handleSupArchiveChange"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-divider orientation="left">关联业务对象（可选）</a-divider>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="关联问题">
            <AuditIssueSelector
              :value="supEditor.auditIssueId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupAuditIssueChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="关联整改任务">
            <AuditRectificationSelector
              :value="supEditor.rectificationId || null"
              :audit-issue-id="supEditor.auditIssueId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupRectificationChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="所属专业">
            <ProgramSelector
              :value="supEditor.programId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupProgramChange"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="培养方案">
            <TrainingPlanSelector
              :value="supEditor.trainingPlanId || null"
              :program-id="supEditor.programId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupTrainingPlanChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="质量评价课程">
            <CourseSelector
              :value="supEditor.qualityCourseId || null"
              :program-id="supEditor.programId || null"
              :training-plan-id="supEditor.trainingPlanId || null"
              :disabled="supEditorMode === 'edit'"
              @change="handleSupCourseChange"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-divider orientation="left">证据明细</a-divider>
      <div class="iwb-tab__detail-toolbar">
        <a-button type="primary" @click="addSupervisionEvidenceItem">新增证据</a-button>
      </div>
      <div
        v-for="(item, index) in supEditor.evidenceItems"
        :key="index"
        class="iwb-tab__detail-row"
      >
        <div class="iwb-tab__detail-row-head">
          <span class="iwb-tab__detail-row-title">证据 {{ index + 1 }}</span>
          <a-button danger size="small" @click="removeSupervisionEvidenceItem(index)">
            删除
          </a-button>
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
                @change="createSupEvidenceArchiveChangeHandler(index)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="关联报告">
              <ReportSelector
                :value="item.reportId || null"
                @change="createSupEvidenceReportChangeHandler(index)"
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

  &__muted {
    color: var(--dp-text-muted, #94a3b8);
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
