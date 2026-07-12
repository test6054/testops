<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AuditIssueQueryRequest,
  AuditIssueSaveRequest,
  AuditIssueVO,
} from '@/apis/quality/audit-issue'
import {
  AUDIT_ISSUE_SEVERITY_OPTIONS,
  AUDIT_ISSUE_SEVERITY_TONE,
  AUDIT_ISSUE_SOURCE_OPTIONS,
  auditIssueApi,
  AuditIssueSeverityCode,
  AuditIssueSeverityDescription,
  AuditIssueSourceCode,
  AuditIssueSourceDescription,
} from '@/apis/quality/audit-issue'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { WorkbenchSignalRefreshHandler } from '@/composables/quality/improvement'
import { refreshWorkbenchSignalsAfterMutation, selectedId } from '@/composables/quality/improvement'
import type { QualityScopeRequestToken } from '@/composables/useScopeRequestGuard'
import {
  assertQualityScopeFresh,
  beginQualityScopeRequest,
  isQualityScopeStaleError,
} from '@/composables/useScopeRequestGuard'
import { message } from 'ant-design-vue'
import { reactive, ref } from 'vue'
import { auditRectificationApi } from '@/apis/quality/audit-rectification'
import {
  AUDIT_ISSUE_STATUS_COLOR,
  AuditIssueStatusCode,
  AuditIssueStatusDescription,
} from '@/apis/quality/types'
import ImprovementWorkbenchPanel from '@/components/quality/improvement/ImprovementWorkbenchPanel.vue'
import {
  AchievementResultSelector,
  CourseGoalSelector,
  CourseSelector,
  ProgramSelector,
  RequirementIndicatorSelector,
  TeacherSelector,
  TrainingPlanSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError, toUserError } from '@/utils/error-handler'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'

defineOptions({ name: 'AuditIssueTab' })

const props = defineProps<{
  onLoadError?: (error: Error | null) => void
  onWorkbenchRefresh?: WorkbenchSignalRefreshHandler
}>()

const qualityStore = useQualityStore()

const issueColumns: ColumnsType = [
  { title: '编码', dataIndex: 'issueCode', key: 'issueCode', width: 140, fixed: 'left' },
  { title: '标题', key: 'issueTitle' },
  { title: '来源', dataIndex: 'issueSource', key: 'issueSource', width: 120 },
  { title: '严重度', dataIndex: 'severity', key: 'severity', width: 90 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
  { title: '年度', dataIndex: 'auditYear', key: 'auditYear', width: 80 },
  { title: '操作', key: 'actions', width: 260 },
]

const issueStatusOptions: AuditIssueStatusCode[] = [
  AuditIssueStatusCode.OPEN,
  AuditIssueStatusCode.IN_RECTIFICATION,
  AuditIssueStatusCode.RECTIFIED,
  AuditIssueStatusCode.VERIFIED,
  AuditIssueStatusCode.CLOSED,
]

function issueStatusLabel(value: AuditIssueStatusCode): string {
  return strictEnumLabel(AuditIssueStatusDescription, value, '审核问题状态')
}

function issueStatusColor(value: AuditIssueStatusCode): BadgeTone {
  return strictEnumTone(AUDIT_ISSUE_STATUS_COLOR, value, '审核问题状态')
}

function issueSourceLabel(value: AuditIssueSourceCode): string {
  return strictEnumLabel(AuditIssueSourceDescription, value, '审核问题来源')
}

function severityLabel(value: AuditIssueSeverityCode): string {
  return strictEnumLabel(AuditIssueSeverityDescription, value, '审核问题严重度')
}

function severityColor(value: AuditIssueSeverityCode): BadgeTone {
  return strictEnumTone(AUDIT_ISSUE_SEVERITY_TONE, value, '审核问题严重度')
}

const issueList = ref<AuditIssueVO[]>([])
const issueTotal = ref(0)
const issueLoading = ref(false)
const issueQuery = reactive<AuditIssueQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  programId: undefined,
  trainingPlanId: undefined,
  qualityCourseId: undefined,
  issueSource: undefined,
  severity: undefined,
  status: undefined,
  auditYear: undefined,
  keyword: '',
})

interface IssueFilterForm {
  issueSource?: AuditIssueSourceCode
  severity?: AuditIssueSeverityCode
  status?: AuditIssueStatusCode
  auditYear: string
  keyword: string
}

const issueFilterForm = reactive<IssueFilterForm>({
  auditYear: '',
  keyword: '',
})

const issueFilterFields: FilterField[] = [
  {
    key: 'severity',
    type: 'select',
    label: '严重度',
    placeholder: '严重度',
    allowClear: true,
    width: 120,
    options: AUDIT_ISSUE_SEVERITY_OPTIONS,
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '状态',
    allowClear: true,
    width: 120,
    options: issueStatusOptions.map((status) => ({
      value: status,
      label: issueStatusLabel(status),
    })),
  },
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '编码 / 标题',
    width: 180,
    triggerSearchOnChange: false,
  },
]

function syncIssueFilterToQuery() {
  issueQuery.issueSource = issueFilterForm.issueSource
  issueQuery.severity = issueFilterForm.severity
  issueQuery.status = issueFilterForm.status
  issueQuery.auditYear = issueFilterForm.auditYear || undefined
  issueQuery.keyword = issueFilterForm.keyword
}

function handleIssueFilterSearch() {
  issueQuery.pageNum = 1
  syncIssueFilterToQuery()
  loadList()
}

const issueTransitMap: Record<AuditIssueStatusCode, AuditIssueStatusCode[]> = {
  [AuditIssueStatusCode.OPEN]: [AuditIssueStatusCode.IN_RECTIFICATION],
  [AuditIssueStatusCode.IN_RECTIFICATION]: [AuditIssueStatusCode.RECTIFIED],
  [AuditIssueStatusCode.RECTIFIED]: [AuditIssueStatusCode.VERIFIED],
  [AuditIssueStatusCode.VERIFIED]: [AuditIssueStatusCode.CLOSED],
  [AuditIssueStatusCode.CLOSED]: [],
}

const issueEditorVisible = ref(false)
const issueEditorMode = ref<'create' | 'edit'>('create')
const issueEditor = reactive<AuditIssueSaveRequest>({
  programId: '',
  trainingPlanId: '',
  qualityCourseId: '',
  requirementIndicatorId: '',
  courseGoalId: '',
  achievementResultId: '',
  issueCode: '',
  issueTitle: '',
  issueDescription: '',
  issueSource: AuditIssueSourceCode.SELF_AUDIT,
  severity: AuditIssueSeverityCode.MINOR,
  auditRound: '',
  auditYear: '',
  raisedUserId: '',
  raisedTime: '',
})
const issueEditorSubmitting = ref(false)
const issueRectificationCount = ref<Map<string, number>>(new Map())

function hasLinkedRectification(issueId: string): boolean {
  return (issueRectificationCount.value.get(issueId) ?? 0) > 0
}

async function refreshIssueRectificationCounts(scope: QualityScopeRequestToken) {
  const issueIds = issueList.value.map((issue) => issue.id)
  if (issueIds.length === 0) {
    issueRectificationCount.value = new Map()
    return
  }
  const response = await auditRectificationApi.countByIssueIds(issueIds)
  assertQualityScopeFresh(scope)
  const countMap = new Map<string, number>()
  for (const item of response.items) {
    countMap.set(item.auditIssueId, item.rectificationCount)
  }
  assertQualityScopeFresh(scope)
  issueRectificationCount.value = countMap
}

async function loadList(options?: { refreshSignals?: boolean }) {
  const scope = beginQualityScopeRequest()
  issueLoading.value = true
  try {
    const page = await auditIssueApi.page({
      ...issueQuery,
      programId: issueQuery.programId || qualityStore.currentProgramId || undefined,
      trainingPlanId: issueQuery.trainingPlanId || qualityStore.currentTrainingPlanId || undefined,
      keyword: issueQuery.keyword?.trim() || undefined,
    })
    assertQualityScopeFresh(scope)
    issueList.value = page.list
    issueQuery.pageNum = page.pageNum
    issueQuery.pageSize = page.pageSize
    issueTotal.value = page.total
    if (issueList.value.length === 0 && issueTotal.value > 0 && issueQuery.pageNum > 1) {
      issueQuery.pageNum -= 1
      await loadList(options)
      return
    }
    await refreshIssueRectificationCounts(scope)
    if (options?.refreshSignals) {
      await refreshWorkbenchSignalsAfterMutation(
        scope,
        props.onWorkbenchRefresh,
        props.onLoadError,
        '工作台指标加载失败',
      )
    }
  } catch (error) {
    if (isQualityScopeStaleError(error) || scope.isStale()) {
      return
    }
    const err = toUserError(error, '审核评估问题加载失败')
    props.onLoadError?.(err)
    showUserError(error, '审核评估问题加载失败')
    throw err
  } finally {
    issueLoading.value = false
  }
}

function handleIssuePageChange(page: { current: number; pageSize: number }) {
  issueQuery.pageNum = page.current
  issueQuery.pageSize = page.pageSize
  loadList()
}

function resetIssueQuery() {
  issueQuery.pageNum = 1
  issueQuery.programId = undefined
  issueQuery.trainingPlanId = undefined
  issueQuery.qualityCourseId = undefined
  syncIssueFilterToQuery()
  loadList()
}

function openIssueCreate() {
  issueEditorMode.value = 'create'
  Object.assign(issueEditor, {
    id: undefined,
    programId: qualityStore.currentProgramId || '',
    trainingPlanId: qualityStore.currentTrainingPlanId || '',
    qualityCourseId: '',
    requirementIndicatorId: '',
    courseGoalId: '',
    achievementResultId: '',
    issueCode: '',
    issueTitle: '',
    issueDescription: '',
    issueSource: AuditIssueSourceCode.SELF_AUDIT,
    severity: AuditIssueSeverityCode.MINOR,
    auditRound: '',
    auditYear: new Date().getFullYear().toString(),
    raisedUserId: '',
    raisedTime: '',
  })
  issueEditorVisible.value = true
}

function openIssueEdit(record: AuditIssueVO) {
  if (!canEditAuditIssue(record.status)) {
    message.error('当前状态不允许编辑审核问题')
    return
  }
  issueEditorMode.value = 'edit'
  Object.assign(issueEditor, {
    id: record.id,
    programId: record.programId || '',
    trainingPlanId: record.trainingPlanId || '',
    qualityCourseId: record.qualityCourseId || '',
    requirementIndicatorId: record.requirementIndicatorId || '',
    courseGoalId: record.courseGoalId || '',
    achievementResultId: record.achievementResultId || '',
    issueCode: record.issueCode,
    issueTitle: record.issueTitle,
    issueDescription: record.issueDescription || '',
    issueSource: record.issueSource,
    severity: record.severity,
    auditRound: record.auditRound || '',
    auditYear: record.auditYear || '',
    raisedUserId: record.raisedUserId || '',
    raisedTime: record.raisedTime || '',
  })
  issueEditorVisible.value = true
}

async function submitIssueEditor() {
  if (issueEditorMode.value === 'edit' && issueEditor.id) {
    const current = issueList.value.find((item) => item.id === issueEditor.id)
    if (current && !canEditAuditIssue(current.status)) {
      message.error('当前状态不允许编辑审核问题')
      return
    }
  }
  if (
    !issueEditor.issueCode.trim() ||
    !issueEditor.issueTitle.trim() ||
    !issueEditor.issueSource ||
    !issueEditor.severity
  ) {
    message.error('请填写编码、标题、来源、严重程度')
    return
  }
  issueEditorSubmitting.value = true
  try {
    const request: AuditIssueSaveRequest = {
      ...issueEditor,
      programId: issueEditor.programId || undefined,
      trainingPlanId: issueEditor.trainingPlanId || undefined,
      qualityCourseId: issueEditor.qualityCourseId || undefined,
      requirementIndicatorId: issueEditor.requirementIndicatorId || undefined,
      courseGoalId: issueEditor.courseGoalId || undefined,
      achievementResultId: issueEditor.achievementResultId || undefined,
      issueCode: issueEditor.issueCode.trim(),
      issueTitle: issueEditor.issueTitle.trim(),
      issueDescription: issueEditor.issueDescription || undefined,
      auditRound: issueEditor.auditRound || undefined,
      auditYear: issueEditor.auditYear || undefined,
      raisedUserId: issueEditor.raisedUserId || undefined,
      raisedTime: issueEditor.raisedTime || undefined,
    }
    if (issueEditorMode.value === 'create') {
      await auditIssueApi.create(request)
      message.success('已登记')
    } else {
      await auditIssueApi.update(request)
      message.success('已保存')
    }
    issueEditorVisible.value = false
    await loadList({ refreshSignals: true })
  } finally {
    issueEditorSubmitting.value = false
  }
}

async function handleIssueDelete(record: AuditIssueVO) {
  void confirmAsync({
    title: `删除问题 ${record.issueCode}？`,
    type: 'error',
    onOk: async () => {
      await auditIssueApi.delete(record.id)
      message.success('已删除')
      await loadList({ refreshSignals: true })
    },
  })
}

function canEditAuditIssue(status: AuditIssueStatusCode): boolean {
  return status === AuditIssueStatusCode.OPEN || status === AuditIssueStatusCode.IN_RECTIFICATION
}

function nextAuditIssueStatuses(status: AuditIssueStatusCode): AuditIssueStatusCode[] {
  return strictEnumValue(issueTransitMap, status, '审核问题状态')
}

async function changeIssueStatus(record: AuditIssueVO, target: AuditIssueStatusCode) {
  await auditIssueApi.transitStatus({ id: record.id, targetStatus: target })
  message.success(`已切换到「${issueStatusLabel(target)}」`)
  await loadList({ refreshSignals: true })
}

function buildAuditIssueActions(record: AuditIssueVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [
    {
      key: 'edit',
      label: '编辑',
      disabled: !canEditAuditIssue(record.status),
    },
  ]
  for (const status of nextAuditIssueStatuses(record.status)) {
    actions.push({
      key: status,
      label: issueStatusLabel(status),
      tone: 'primary',
    })
  }
  if (record.status === AuditIssueStatusCode.OPEN && !hasLinkedRectification(record.id)) {
    actions.push({ key: 'delete', label: '删除', tone: 'danger' })
  }
  return actions
}

function handleAuditIssueAction(key: string, record: AuditIssueVO): void {
  switch (key) {
    case 'edit':
      openIssueEdit(record)
      return
    case 'delete':
      void handleIssueDelete(record)
      return
    case AuditIssueStatusCode.OPEN:
    case AuditIssueStatusCode.IN_RECTIFICATION:
    case AuditIssueStatusCode.RECTIFIED:
    case AuditIssueStatusCode.VERIFIED:
    case AuditIssueStatusCode.CLOSED:
      void changeIssueStatus(record, key)
  }
}

function handleIssueProgramChange(value: string | null | undefined) {
  issueEditor.programId = selectedId(value)
  issueEditor.qualityCourseId = ''
  issueEditor.requirementIndicatorId = ''
}

function handleIssueTrainingPlanChange(value: string | null | undefined) {
  issueEditor.trainingPlanId = selectedId(value)
}

function handleIssueCourseChange(value: string | null | undefined) {
  issueEditor.qualityCourseId = selectedId(value)
}

function handleIssueRequirementIndicatorChange(value: string | null | undefined) {
  issueEditor.requirementIndicatorId = selectedId(value)
}

function handleIssueCourseGoalChange(value: string | null | undefined) {
  issueEditor.courseGoalId = selectedId(value)
}

function handleIssueAchievementResultChange(value: string | null | undefined) {
  issueEditor.achievementResultId = selectedId(value)
}

function handleIssueRaisedByChange(value: string | string[] | null | undefined) {
  issueEditor.raisedUserId = Array.isArray(value) ? '' : selectedId(value)
}

defineExpose({
  loadList,
})
</script>

<template>
  <ImprovementWorkbenchPanel title="审核评估问题清单">
    <template #extra>
      <UiButton variant="primary" size="sm" @click="openIssueCreate">登记问题</UiButton>
    </template>

    <UiFilterBar
      variant="plain"
      v-model="issueFilterForm"
      :fields="issueFilterFields"
      show-labels
      search-text="查询"
      @search="handleIssueFilterSearch"
      @reset="resetIssueQuery"
    />

    <UiDataTable
      v-model:current="issueQuery.pageNum"
      v-model:page-size="issueQuery.pageSize"
      :columns="issueColumns"
      :data-source="issueList"
      :loading="issueLoading"
      row-key="id"
      size="middle"
      :total="issueTotal"
      flat
      @page-change="handleIssuePageChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'issueTitle'">
          <div>{{ record.issueTitle }}</div>
          <div v-if="record.issueDescription" class="iwb-tab__sub-desc">
            {{ record.issueDescription.substring(0, 80)
            }}{{ record.issueDescription.length > 80 ? '…' : '' }}
          </div>
        </template>
        <template v-else-if="column.key === 'issueSource'">
          {{ issueSourceLabel(record.issueSource) }}
        </template>
        <template v-else-if="column.key === 'severity'">
          <UiTag :tone="severityColor(record.severity)" size="sm">
            {{ severityLabel(record.severity) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'status'">
          <UiTag :tone="issueStatusColor(record.status)" size="sm">
            {{ issueStatusLabel(record.status) }}
          </UiTag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <UiTableActions
            :items="buildAuditIssueActions(record)"
            split
            @action="(key) => handleAuditIssueAction(key, record)"
          />
        </template>
      </template>
    </UiDataTable>
  </ImprovementWorkbenchPanel>

  <a-modal
    v-model:open="issueEditorVisible"
    :title="issueEditorMode === 'create' ? '登记审核评估问题' : '编辑审核评估问题'"
    :confirm-loading="issueEditorSubmitting"
    width="820px"
    @ok="submitIssueEditor"
  >
    <a-form layout="vertical" :model="issueEditor">
      <a-row :gutter="12">
        <a-col :span="6">
          <a-form-item label="编码" required>
            <a-input v-model:value="issueEditor.issueCode" />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="问题来源" required>
            <a-select
              v-model:value="issueEditor.issueSource"
              :options="AUDIT_ISSUE_SOURCE_OPTIONS"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="严重程度" required>
            <a-select
              v-model:value="issueEditor.severity"
              :options="AUDIT_ISSUE_SEVERITY_OPTIONS"
            />
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="审核年度">
            <a-input v-model:value="issueEditor.auditYear" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="标题" required>
        <a-input v-model:value="issueEditor.issueTitle" />
      </a-form-item>
      <a-form-item label="详细描述">
        <a-textarea v-model:value="issueEditor.issueDescription" :rows="4" />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="审核轮次">
            <a-input v-model:value="issueEditor.auditRound" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="提出人">
            <TeacherSelector
              :value="issueEditor.raisedUserId || null"
              placeholder="选择提出人（可选）"
              @change="handleIssueRaisedByChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="提出时间">
            <a-input v-model:value="issueEditor.raisedTime" placeholder="yyyy-MM-dd HH:mm:ss" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-divider orientation="left">关联业务对象（可选）</a-divider>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="所属专业">
            <ProgramSelector
              :value="issueEditor.programId || null"
              @change="handleIssueProgramChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="培养方案">
            <TrainingPlanSelector
              :value="issueEditor.trainingPlanId || null"
              :program-id="issueEditor.programId || null"
              @change="handleIssueTrainingPlanChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="质量评价课程">
            <CourseSelector
              :value="issueEditor.qualityCourseId || null"
              :program-id="issueEditor.programId || null"
              :training-plan-id="issueEditor.trainingPlanId || null"
              @change="handleIssueCourseChange"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="观测点">
            <RequirementIndicatorSelector
              :value="issueEditor.requirementIndicatorId || null"
              :training-plan-id="issueEditor.trainingPlanId || null"
              @change="handleIssueRequirementIndicatorChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="课程目标">
            <CourseGoalSelector
              :value="issueEditor.courseGoalId || null"
              :quality-course-id="issueEditor.qualityCourseId || null"
              @change="handleIssueCourseGoalChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="达成度结果">
            <AchievementResultSelector
              :value="issueEditor.achievementResultId || null"
              :program-id="issueEditor.programId || null"
              :training-plan-id="issueEditor.trainingPlanId || null"
              :quality-course-id="issueEditor.qualityCourseId || null"
              @change="handleIssueAchievementResultChange"
            />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<style scoped lang="scss">
.iwb-tab {
  &__sub-desc {
    margin-top: 4px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }
}
</style>
