<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AchievementComputeReadinessItemVO } from '@/apis/quality/achievement'
import type {
  AchievementResultQueryRequest,
  AchievementResultSignalSummaryVO,
  AchievementResultVO,
} from '@/apis/quality/achievement-result'
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type {
  AchievementAuditEventCode} from '@/types/enums/achievement-audit-event-enum';
import type { SemesterCode } from '@/types/enums/semester-enum'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
  WorkbenchStageStatus,
} from '@/types/workbench'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'

import message from 'ant-design-vue/es/message'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ExportBusinessType } from '@/apis/edu/export'
import { achievementApi } from '@/apis/quality/achievement'
import { achievementAuditApi } from '@/apis/quality/achievement-audit'
import { achievementResultApi } from '@/apis/quality/achievement-result'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_COLOR,
  AchievementAuditStatusCode,
  AchievementAuditStatusDescription,
  AchievementStatusCode,
  AchievementStatusDescription,
  AchievementTargetTypeCode,
  AchievementTargetTypeDescription,
} from '@/apis/quality/types'
import QualityPageContextBar from '@/components/quality/QualityPageContextBar.vue'
import QualityPlanGateStrip from '@/components/quality/QualityPlanGateStrip.vue'
import {
  ClassSelector,
  CourseGoalSelector,
  CourseSelector,
  TrainingObjectiveSelector,
} from '@/components/quality/selectors'
import { loadBoundedPlanAggregate } from '@/components/quality/selectors/page-contract'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiCol from '@/components/ui-guide/ui/UiCol.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiForm from '@/components/ui-guide/ui/UiForm.vue'
import UiFormItem from '@/components/ui-guide/ui/UiFormItem.vue'
import UiRow from '@/components/ui-guide/ui/UiRow.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import AuditTimelineDrawer from '@/components/workbench/AuditTimelineDrawer.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageRail from '@/components/workbench/StageRail.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import TaskResultPanel from '@/components/workbench/TaskResultPanel.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityTableExport } from '@/composables/useQualityTableExport'
import { beginQualityScopeRequest } from '@/composables/useScopeRequestGuard'
import { useUiTableLoadError } from '@/composables/useUiTableLoadError'
import { useQualityStore } from '@/stores/modules/quality'
import {
  AchievementAuditEventDescription,
} from '@/types/enums/achievement-audit-event-enum'
import { ConfirmationStatusCode } from '@/types/enums/confirmation-status-enum'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import { showFormValidationMessage, showUserError } from '@/utils/error-handler'
import { formatScore } from '@/utils/format'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'

function targetTypeLabel(value: AchievementTargetTypeCode): string {
  return strictEnumLabel(AchievementTargetTypeDescription, value, '达成目标类型')
}

function auditStatusLabel(value: AchievementAuditStatusCode): string {
  return strictEnumLabel(AchievementAuditStatusDescription, value, '达成审核状态')
}

function auditStatusColor(value: AchievementAuditStatusCode): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成审核状态')
}

function achievementStatusLabel(value: AchievementStatusCode): string {
  return strictEnumLabel(AchievementStatusDescription, value, '达成状态')
}

function achievementStatusColor(value: AchievementStatusCode): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_STATUS_COLOR, value, '达成状态')
}

function isResultStale(record: AchievementResultVO): boolean {
  return record.staleFlag === true
}

function auditEventLabel(event: AchievementAuditEventCode | undefined): string {
  if (!event) return '-'
  return strictEnumLabel(AchievementAuditEventDescription, event, '达成审核事件')
}

function auditStatusLabelMaybe(value: AchievementAuditStatusCode | undefined): string {
  return value ? auditStatusLabel(value) : '-'
}

function canRecomputeRecord(record: AchievementResultVO): boolean {
  return (
    record.auditStatus === AchievementAuditStatusCode.RETURNED
    || isResultStale(record)
    || record.auditStatus === AchievementAuditStatusCode.DRAFT
    || record.auditStatus === AchievementAuditStatusCode.CALCULATED
  )
}

function resultValidityLabel(record: AchievementResultVO): string {
  return isResultStale(record) ? '已过期' : '有效'
}

function resultValidityColor(record: AchievementResultVO): BadgeTone {
  return isResultStale(record) ? 'red' : 'green'
}

const router = useRouter()
const route = useRoute()
const qualityStore = useQualityStore()

const list = ref<AchievementResultVO[]>([])
const total = ref(0)
const loading = ref(false)
const { loadError, beginLoad, failLoad, okLoad } = useUiTableLoadError()
const triggerLoading = ref<string>('')
const { exporting: achievementExporting, exportExcel: exportAchievementExcel }
  = useQualityTableExport()

const query = reactive<AchievementResultQueryRequest & Record<string, unknown>>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  targetType: undefined,
  auditStatus: undefined,
  achievementStatus: undefined,
  qualityCourseId: '',
  classId: '',
  schoolYear: '',
  semester: undefined,
})

interface AchievementTriggerForm {
  trainingPlanId: string
  qualityCourseId: string
  courseGoalId: string
  trainingObjectiveId: string
  schoolYear: string
  semester: SemesterCode | undefined
}

const triggerForm = reactive<AchievementTriggerForm>({
  trainingPlanId: qualityStore.currentTrainingPlanId,
  qualityCourseId: '',
  courseGoalId: '',
  trainingObjectiveId: '',
  schoolYear: qualityStore.currentSchoolYear || '',
  semester: qualityStore.currentSemester,
})

function handleQualityCourseChange(value: string | null) {
  triggerForm.qualityCourseId = value ?? ''
  triggerForm.courseGoalId = ''
}

function handleQueryQualityCourseChange(value: string | null) {
  query.qualityCourseId = value ?? ''
}

function handleQueryClassChange(value: string | null) {
  query.classId = value ?? ''
}

function handleCourseGoalChange(value: string | null) {
  triggerForm.courseGoalId = value ?? ''
}

function handleTrainingObjectiveChange(value: string | null) {
  triggerForm.trainingObjectiveId = value ?? ''
}

/** 计算合同专业 ID：仅取质量工作范围，禁止表单/培养方案反推兜底 */
function requireScopeProgramId(): string {
  const programId = qualityStore.currentProgramId?.trim()
  if (!programId) {
    showFormValidationMessage('请先在顶部选择专业')
    throw new Error('missing programId')
  }
  return programId
}

/** 计算合同培养方案 ID：仅取质量工作范围 */
function requireScopeTrainingPlanId(): string {
  const trainingPlanId = qualityStore.currentTrainingPlanId?.trim()
  if (!trainingPlanId) {
    showFormValidationMessage('请先在顶部选择培养方案')
    throw new Error('missing trainingPlanId')
  }
  return trainingPlanId
}

const targetTypeOptions: Array<{ value: AchievementTargetTypeCode, label: string }> = [
  {
    value: AchievementTargetTypeCode.COURSE_GOAL,
    label: AchievementTargetTypeDescription.COURSE_GOAL,
  },
  {
    value: AchievementTargetTypeCode.REQUIREMENT_INDICATOR,
    label: AchievementTargetTypeDescription.REQUIREMENT_INDICATOR,
  },
  {
    value: AchievementTargetTypeCode.GRADUATION_REQUIREMENT,
    label: AchievementTargetTypeDescription.GRADUATION_REQUIREMENT,
  },
  {
    value: AchievementTargetTypeCode.TRAINING_OBJECTIVE,
    label: AchievementTargetTypeDescription.TRAINING_OBJECTIVE,
  },
  {
    value: AchievementTargetTypeCode.PROGRAM_SUMMARY,
    label: AchievementTargetTypeDescription.PROGRAM_SUMMARY,
  },
  {
    value: AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE,
    label: AchievementTargetTypeDescription.CIVIC_GOAL_AGGREGATE,
  },
  {
    value: AchievementTargetTypeCode.COMPLEX_ENGINEERING_AGGREGATE,
    label: AchievementTargetTypeDescription.COMPLEX_ENGINEERING_AGGREGATE,
  },
]
const auditStatusOptions: Array<{ value: AchievementAuditStatusCode, label: string }> = [
  { value: AchievementAuditStatusCode.DRAFT, label: AchievementAuditStatusDescription.DRAFT },
  {
    value: AchievementAuditStatusCode.CALCULATED,
    label: AchievementAuditStatusDescription.CALCULATED,
  },
  {
    value: AchievementAuditStatusCode.SUBMITTED,
    label: AchievementAuditStatusDescription.SUBMITTED,
  },
  {
    value: AchievementAuditStatusCode.CONFIRMED,
    label: AchievementAuditStatusDescription.CONFIRMED,
  },
  { value: AchievementAuditStatusCode.RETURNED, label: AchievementAuditStatusDescription.RETURNED },
  { value: AchievementAuditStatusCode.ARCHIVED, label: AchievementAuditStatusDescription.ARCHIVED },
]
const achievementStatusOptions: Array<{ value: AchievementStatusCode, label: string }> = [
  { value: AchievementStatusCode.ACHIEVED, label: AchievementStatusDescription.ACHIEVED },
  {
    value: AchievementStatusCode.PARTIALLY_ACHIEVED,
    label: AchievementStatusDescription.PARTIALLY_ACHIEVED,
  },
  { value: AchievementStatusCode.NOT_ACHIEVED, label: AchievementStatusDescription.NOT_ACHIEVED },
  {
    value: AchievementStatusCode.INSUFFICIENT_EVIDENCE,
    label: AchievementStatusDescription.INSUFFICIENT_EVIDENCE,
  },
]

const filterModel = computed<Record<string, unknown>>({
  get: () => query,
  set: (value) => {
    Object.assign(query, value)
  },
})

const filterFields: FilterField[] = [
  {
    key: 'targetType',
    type: 'select',
    label: '目标类型',
    placeholder: '目标类型',
    allowClear: true,
    width: 160,
    options: targetTypeOptions,
  },
  {
    key: 'auditStatus',
    type: 'select',
    label: '审核状态',
    placeholder: '审核状态',
    allowClear: true,
    width: 120,
    options: auditStatusOptions,
  },
  {
    key: 'achievementStatus',
    type: 'select',
    label: '达成结论',
    placeholder: '达成结论',
    allowClear: true,
    width: 120,
    options: achievementStatusOptions,
  },
  {
    key: 'qualityCourseId',
    type: 'custom',
    label: '关联课程',
    width: 180,
  },
  {
    key: 'classId',
    type: 'custom',
    label: '关联班级',
    width: 160,
  },
  {
    key: 'schoolYear',
    type: 'input',
    label: '学年',
    placeholder: '学年',
    width: 120,
  },
  {
    key: 'semester',
    type: 'input',
    label: '学期',
    placeholder: '学期',
    width: 100,
  },
]

function handleSearch() {
  void loadList()
  void loadSignalSummary()
}

function handleReset() {
  resetQuery()
}

const trainingPlanRequired = computed(() => !qualityStore.currentTrainingPlanId)
const trainingPlanUnconfirmed = computed(() => {
  if (trainingPlanRequired.value) {
    return false
  }
  return qualityStore.currentPlan?.confirmationStatus !== ConfirmationStatusCode.CONFIRMED
})
const planGateMode = computed<'need-plan' | 'need-confirm' | null>(() => {
  if (trainingPlanRequired.value) {
    return 'need-plan'
  }
  if (trainingPlanUnconfirmed.value) {
    return 'need-confirm'
  }
  return null
})
const programRequired = computed(() => !qualityStore.currentProgramId?.trim())

async function loadList() {
  if (!qualityStore.currentTrainingPlanId) return
  const scope = beginQualityScopeRequest()
  loading.value = true
  beginLoad()
  try {
    const page = await achievementResultApi.page(buildAchievementListQuery())
    if (scope.isStale()) {
      return
    }
    list.value = page.list
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = page.total
    if (list.value.length === 0 && total.value > 0 && query.pageNum > 1) {
      query.pageNum -= 1
      await loadList()
      return
    }
    okLoad()
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    failLoad()
    showUserError(error, '达成度结果加载失败')
  } finally {
    if (!scope.isStale()) {
      loading.value = false
    }
  }
}

async function handleScopeChange(): Promise<void> {
  await Promise.all([loadList(), loadSignalSummary()])
}

/** 阅卷桥接跳转：按 query 预填质量评价范围 */
async function applyRouteScopeQuery(): Promise<void> {
  const trainingPlanId = route.query.trainingPlanId
  const qualityCourseId = route.query.qualityCourseId
  if (typeof trainingPlanId === 'string' && trainingPlanId) {
    if (qualityStore.currentProgramId) {
      await qualityStore.loadTrainingPlanOptions()
    }
    qualityStore.setTrainingPlan(trainingPlanId)
  }
  if (typeof qualityCourseId === 'string' && qualityCourseId) {
    qualityStore.setQualityCourse(qualityCourseId)
    await qualityStore.loadQualityCourseOptions()
  }
}

async function bootstrapAchievementPage(): Promise<void> {
  await applyRouteScopeQuery()
  triggerForm.trainingPlanId = qualityStore.currentTrainingPlanId
  query.trainingPlanId = qualityStore.currentTrainingPlanId
  if (!qualityStore.currentTrainingPlanId) {
    return
  }
  await handleScopeChange()
}

useQualityScopedLoader(bootstrapAchievementPage, {
  watchScope: true,
  immediate: true,
  reloadOnActivated: true,
})

function handlePageChange(page: { current: number, pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  void loadList()
}

const columns: ColumnsType = [
  { title: '目标类型', dataIndex: 'targetType', key: 'targetType', width: 160, fixed: 'left' },
  { title: '目标对象', dataIndex: 'targetLabel', key: 'targetLabel', width: 220 },
  { title: '关联课程', key: 'qualityCourse', width: 180 },
  { title: '关联班级', key: 'className', width: 140 },
  { title: '学年 / 学期', key: 'period', width: 120 },
  {
    title: '达成值 / 阈值',
    key: 'achievementValue',
    width: 160,
    sorter: (a: AchievementResultVO, b: AchievementResultVO) => {
      const av = a.finalValue ?? Number.NEGATIVE_INFINITY
      const bv = b.finalValue ?? Number.NEGATIVE_INFINITY
      return av - bv
    },
  },
  {
    title: '样本（有效 / 总量）',
    key: 'sample',
    width: 120,
    sorter: (a: AchievementResultVO, b: AchievementResultVO) => a.sampleValid - b.sampleValid,
  },
  { title: '达成结论', dataIndex: 'achievementStatus', key: 'achievementStatus', width: 120 },
  { title: '结果有效性', key: 'validity', width: 150 },
  { title: '审核', dataIndex: 'auditStatus', key: 'auditStatus', width: 110 },
  { title: '操作', key: 'actions', width: 320 },
]

function resetQuery() {
  query.pageNum = 1
  query.targetType = undefined
  query.auditStatus = undefined
  query.achievementStatus = undefined
  query.qualityCourseId = ''
  query.classId = ''
  query.schoolYear = ''
  query.semester = undefined
  void loadList()
  void loadSignalSummary()
}

function handleExportAchievement(): void {
  if (trainingPlanRequired.value) {
    return
  }
  void exportAchievementExcel({
    businessType: ExportBusinessType.QUALITY_ACHIEVEMENT_RESULT_EXPORT,
    bizName: '达成度结果',
    queryParams: {
      trainingPlanId: qualityStore.currentTrainingPlanId,
      targetType: query.targetType || undefined,
      auditStatus: query.auditStatus || undefined,
      achievementStatus: query.achievementStatus || undefined,
      qualityCourseId: query.qualityCourseId || undefined,
      classId: query.classId || undefined,
      schoolYear: query.schoolYear || undefined,
      semester: query.semester || undefined,
    },
  })
}

/**
 * 6 类确定性计算入口。后端实际端点：
 *  - compute-course-goal              需要 qualityCourseId + courseGoalId
 *  - compute-requirement              毕业要求 / 观测点合并，需 trainingPlanId
 *  - compute-program                  专业汇总
 *  - compute-training-objective       培养目标
 *  - compute-civic-goal-aggregate     课程思政独立汇总
 *  - compute-complex-engineering-aggregate  复杂工程问题专项
 */
type AchievementComputeResult
  = | Awaited<ReturnType<typeof achievementApi.computeCourseGoal>>
    | Awaited<ReturnType<typeof achievementApi.computeRequirement>>
    | Awaited<ReturnType<typeof achievementApi.computeProgram>>
    | Awaited<ReturnType<typeof achievementApi.computeTrainingObjective>>
    | Awaited<ReturnType<typeof achievementApi.computeCivicGoalAggregate>>
    | Awaited<ReturnType<typeof achievementApi.computeComplexEngineeringAggregate>>

const triggerButtons: Array<{
  key: string
  label: string
  handler: () => Promise<AchievementComputeResult>
}> = [
  {
    key: 'COURSE_GOAL',
    label: '课程目标',
    handler: () => {
      if (!triggerForm.qualityCourseId?.trim()) {
        void message.warning('课程目标计算必须先选择质量评价课程')
        return Promise.reject(new Error('missing courseGoalId'))
      }
      if (!triggerForm.courseGoalId?.trim()) {
        void message.warning('课程目标计算必须先选择课程目标')
        return Promise.reject(new Error('missing courseGoalId'))
      }
      return achievementApi.computeCourseGoal({
        qualityCourseId: triggerForm.qualityCourseId!,
        courseGoalId: triggerForm.courseGoalId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      })
    },
  },
  {
    key: 'REQUIREMENT',
    label: '毕业要求 / 观测点',
    handler: () =>
      achievementApi.computeRequirement({
        programId: requireScopeProgramId(),
        trainingPlanId: requireScopeTrainingPlanId(),
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      }),
  },
  {
    key: 'TRAINING_OBJECTIVE',
    label: '培养目标',
    handler: () => {
      if (!triggerForm.trainingObjectiveId?.trim()) {
        void message.warning('培养目标计算必须先选择培养目标')
        return Promise.reject(new Error('missing trainingObjectiveId'))
      }
      return achievementApi.computeTrainingObjective({
        programId: requireScopeProgramId(),
        trainingPlanId: requireScopeTrainingPlanId(),
        trainingObjectiveId: triggerForm.trainingObjectiveId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      })
    },
  },
  {
    key: 'PROGRAM',
    label: '专业汇总',
    handler: () =>
      achievementApi.computeProgram({
        trainingPlanId: requireScopeTrainingPlanId(),
        programId: requireScopeProgramId(),
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      }),
  },
  {
    key: 'CIVIC_GOAL_AGGREGATE',
    label: '课程思政',
    handler: () =>
      achievementApi.computeCivicGoalAggregate({
        programId: requireScopeProgramId(),
        trainingPlanId: requireScopeTrainingPlanId(),
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      }),
  },
  {
    key: 'COMPLEX_ENGINEERING',
    label: '复杂工程',
    handler: () =>
      achievementApi.computeComplexEngineeringAggregate({
        programId: requireScopeProgramId(),
        trainingPlanId: requireScopeTrainingPlanId(),
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      }),
  },
]

async function confirmComputeImpact(
  key: string,
  readiness: AchievementComputeReadinessItemVO,
): Promise<boolean> {
  const lockedTotal
    = readiness.lockedSubmittedCount
      + readiness.lockedConfirmedCount
      + readiness.lockedArchivedCount
  const aggregateKind
    = key === 'PROGRAM'
      || key === 'CIVIC_GOAL_AGGREGATE'
      || key === 'COMPLEX_ENGINEERING'
      || key === 'REQUIREMENT'
  const needsConfirm
    = aggregateKind
      || readiness.expectedCoverCount > 1
      || readiness.replaceableResultCount > 0
      || lockedTotal > 0
  if (!needsConfirm) {
    return true
  }
  const lines = [
    `目标：${readiness.targetScopeLabel}`,
    `期间：${readiness.dataPeriodLabel}`,
    `口径：${readiness.algorithmProfileLabel}`,
    `预计覆盖 ${readiness.expectedCoverCount} 条结果`,
    `将覆盖删除未锁定结果 ${readiness.replaceableResultCount} 条（已计算 / 已退回 / 已过期）`,
    `已提交锁定 ${readiness.lockedSubmittedCount}、已确认锁定 ${readiness.lockedConfirmedCount}、已归档锁定 ${readiness.lockedArchivedCount}（未过期时禁止重算）`,
  ]
  if (aggregateKind) {
    lines.unshift('本步骤为汇总级计算，与单课程目标计算影响面不同，请确认范围后再执行。')
  }
  return confirmAsync({
    title: `确认计算：${readiness.stageTitle}`,
    content: lines.join('\n'),
    type: lockedTotal > 0 || aggregateKind ? 'warning' : 'info',
    okText: '确认计算',
    width: 520,
  })
}

async function handleTrigger(key: string, handler: () => Promise<AchievementComputeResult>) {
  try {
    requireScopeTrainingPlanId()
    requireScopeProgramId()
  } catch {
    return
  }
  if (readinessPhase.value === 'loading' || readinessPhase.value === 'idle') {
    showFormValidationMessage('计算就绪检查尚未完成，请稍候')
    return
  }
  if (readinessPhase.value === 'error') {
    showFormValidationMessage('计算就绪检查失败；切换范围或关闭抽屉后重新打开再计算')
    return
  }
  const readiness = readinessByKind.value.get(key)
  if (!readiness) {
    showFormValidationMessage('当前计算步骤缺少就绪合同，禁止放行')
    return
  }
  if (!readiness.ready) {
    void message.warning(readiness.blockingReasons[0] || '当前步骤尚未就绪')
    return
  }
  const confirmed = await confirmComputeImpact(key, readiness)
  if (!confirmed) {
    return
  }
  triggerLoading.value = key
  try {
    const result = await handler()
    const count = Array.isArray(result)
      ? result.length
      : result && typeof result === 'object' && 'achievementResultId' in result
        ? 1
        : 0
    void message.success(count > 0 ? `计算完成，生成 / 更新 ${count} 条结果` : '计算完成')
    await Promise.all([loadList(), loadSignalSummary()])
    if (triggerVisible.value) {
      await loadComputeReadiness()
    }
  } catch (err) {
    // 计算被用户取消（如未填 courseGoalId）静默忽略
    if (
      err instanceof Error
      && (err.message === 'cancelled'
        || err.message === 'missing courseGoalId'
        || err.message === 'missing trainingObjectiveId'
        || err.message === 'missing programId'
        || err.message === 'missing trainingPlanId')
    ) {
      return
    }
    throw err
  } finally {
    triggerLoading.value = ''
  }
}

const auditTransitMap: Record<AchievementAuditStatusCode, AchievementAuditStatusCode[]> = {
  [AchievementAuditStatusCode.DRAFT]: [AchievementAuditStatusCode.CALCULATED],
  [AchievementAuditStatusCode.CALCULATED]: [
    AchievementAuditStatusCode.DRAFT,
    AchievementAuditStatusCode.SUBMITTED,
  ],
  [AchievementAuditStatusCode.SUBMITTED]: [
    AchievementAuditStatusCode.CONFIRMED,
    AchievementAuditStatusCode.RETURNED,
  ],
  [AchievementAuditStatusCode.CONFIRMED]: [
    AchievementAuditStatusCode.ARCHIVED,
    AchievementAuditStatusCode.RETURNED,
  ],
  [AchievementAuditStatusCode.RETURNED]: [],
  [AchievementAuditStatusCode.ARCHIVED]: [],
}

function nextStatuses(
  current: AchievementAuditStatusCode | undefined,
): AchievementAuditStatusCode[] {
  if (!current) return []
  return strictEnumValue(auditTransitMap, current, '达成审核状态')
}

async function handleTransit(record: AchievementResultVO, to: AchievementAuditStatusCode) {
  const remark = await promptInputAsync({
    title: `${auditStatusLabel(record.auditStatus)} -> ${auditStatusLabel(to)}`,
    placeholder: '审核备注（驳回时必填）',
    required: to === AchievementAuditStatusCode.RETURNED,
    okType: to === AchievementAuditStatusCode.RETURNED ? 'danger' : 'primary',
    emptyErrorMessage: '驳回必须填写审核备注',
  })
  if (to === AchievementAuditStatusCode.RETURNED && !remark) return
  await achievementResultApi.updateAuditStatus({
    id: record.id,
    auditStatus: to,
    auditRemark: remark || undefined,
  })
  void message.success('流转成功')
  await Promise.all([loadList(), loadSignalSummary()])
}

/* ========== 阶段轨与信号指标带 ========== */

function buildAchievementListQuery(): AchievementResultQueryRequest {
  return {
    ...query,
    trainingPlanId: qualityStore.currentTrainingPlanId,
    qualityCourseId: query.qualityCourseId || undefined,
    classId: query.classId || undefined,
    schoolYear: query.schoolYear || undefined,
    semester: query.semester || undefined,
    targetType: query.targetType || undefined,
    auditStatus: query.auditStatus || undefined,
    achievementStatus: query.achievementStatus || undefined,
  }
}

function buildAchievementAuditBuckets(
  summary: AchievementResultSignalSummaryVO | null,
): Record<AchievementAuditStatusCode, number> {
  const buckets: Record<AchievementAuditStatusCode, number> = {
    [AchievementAuditStatusCode.DRAFT]: 0,
    [AchievementAuditStatusCode.CALCULATED]: 0,
    [AchievementAuditStatusCode.SUBMITTED]: 0,
    [AchievementAuditStatusCode.CONFIRMED]: 0,
    [AchievementAuditStatusCode.RETURNED]: 0,
    [AchievementAuditStatusCode.ARCHIVED]: 0,
  }
  if (!summary) {
    return buckets
  }
  for (const row of summary.auditStatusCounts) {
    buckets[row.status] = row.recordCount
  }
  return buckets
}

function countAchievementStatus(
  summary: AchievementResultSignalSummaryVO | null,
  status: AchievementStatusCode,
): number {
  if (!summary) {
    return 0
  }
  for (const row of summary.achievementStatusCounts) {
    if (row.status === status) {
      return row.recordCount
    }
  }
  return 0
}

const signalSummary = ref<AchievementResultSignalSummaryVO | null>(null)
const signalSummaryLoadFailed = ref(false)

async function loadSignalSummary() {
  if (!qualityStore.currentTrainingPlanId) {
    signalSummary.value = null
    signalSummaryLoadFailed.value = false
    return
  }
  const scope = beginQualityScopeRequest()
  try {
    const summary = await achievementResultApi.signalSummary(buildAchievementListQuery())
    if (scope.isStale()) {
      return
    }
    if (summary.achievementStatusCounts == null || summary.auditStatusCounts == null) {
      throw new Error('达成度 SignalBand 合同缺分组计数')
    }
    signalSummary.value = summary
    signalSummaryLoadFailed.value = false
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    signalSummaryLoadFailed.value = true
    showUserError(error, '达成度工作台指标加载失败')
  }
}

const auditBuckets = computed(() => buildAchievementAuditBuckets(signalSummary.value))

const stages = computed<WorkbenchStage[]>(() => {
  const b = auditBuckets.value
  const order: Array<{ key: AchievementAuditStatusCode, title: string }> = [
    { key: AchievementAuditStatusCode.DRAFT, title: '草稿' },
    { key: AchievementAuditStatusCode.CALCULATED, title: '已计算' },
    { key: AchievementAuditStatusCode.SUBMITTED, title: '已提交' },
    { key: AchievementAuditStatusCode.CONFIRMED, title: '已确认' },
    { key: AchievementAuditStatusCode.ARCHIVED, title: '已归档' },
  ]
  return order.map((stage) => {
    const count = b[stage.key]
    let status: WorkbenchStageStatus = 'pending'
    if (stage.key === AchievementAuditStatusCode.ARCHIVED && count > 0) status = 'completed'
    else if (count > 0) status = 'active'
    return {
      key: stage.key,
      title: stage.title,
      status,
      statusText: `${count} 条`,
    }
  })
})

const signals = computed<SignalMetric[]>(() => {
  const summary = signalSummary.value
  if (!summary || signalSummaryLoadFailed.value) {
    return []
  }
  const b = auditBuckets.value
  const achieved = countAchievementStatus(summary, AchievementStatusCode.ACHIEVED)
  const partial = countAchievementStatus(summary, AchievementStatusCode.PARTIALLY_ACHIEVED)
  const notAchieved = countAchievementStatus(summary, AchievementStatusCode.NOT_ACHIEVED)
  const stale = summary.staleCount
  return [
    {
      key: 'total',
      label: '结果总数',
      value: summary.totalCount,
      tone: 'blue',
      trendPolarity: 'neutral',
    },
    {
      key: 'achieved',
      label: '已达成',
      value: achieved,
      tone: achieved > 0 ? 'green' : 'gray',
      trendPolarity: 'positive',
    },
    {
      key: 'partial',
      label: '部分达成',
      value: partial,
      tone: partial > 0 ? 'orange' : 'gray',
      trendPolarity: 'negative',
    },
    {
      key: 'not-achieved',
      label: '未达成',
      value: notAchieved,
      tone: notAchieved > 0 ? 'red' : 'gray',
      trendPolarity: 'negative',
    },
    {
      key: 'pending-audit',
      label: '待提交',
      value: b[AchievementAuditStatusCode.DRAFT] + b[AchievementAuditStatusCode.CALCULATED],
      tone:
        b[AchievementAuditStatusCode.DRAFT] + b[AchievementAuditStatusCode.CALCULATED] > 0
          ? 'orange'
          : 'gray',
      trendPolarity: 'negative',
    },
    {
      key: 'stale',
      label: '已过期',
      value: stale,
      tone: stale > 0 ? 'red' : 'gray',
      trendPolarity: 'negative',
    },
    {
      key: 'returned',
      label: '已驳回',
      value: b[AchievementAuditStatusCode.RETURNED],
      tone: b[AchievementAuditStatusCode.RETURNED] > 0 ? 'red' : 'gray',
      trendPolarity: 'negative',
    },
  ]
})

/* ========== 触发计算抽屉 ========== */

const triggerVisible = ref(false)
const computeReadinessItems = ref<AchievementComputeReadinessItemVO[]>([])
const readinessLoading = ref(false)
/** idle=未拉；loading=请求中；ready=合同就绪；error=失败（禁止空数组 fail-open） */
const readinessPhase = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')

const readinessByKind = computed(() => {
  const map = new Map<string, AchievementComputeReadinessItemVO>()
  for (const item of computeReadinessItems.value) {
    map.set(item.computeKind, item)
  }
  return map
})

const orderedTriggerSteps = computed(() =>
  triggerButtons
    .map((btn) => ({
      ...btn,
      readiness: readinessByKind.value.get(btn.key),
    }))
    .sort((a, b) => {
      if (a.readiness == null || b.readiness == null) {
        return 0
      }
      return a.readiness.stageOrder - b.readiness.stageOrder
    }),
)

function requireReadinessContract(items: AchievementComputeReadinessItemVO[]): void {
  if (!Array.isArray(items)) {
    throw new TypeError('达成度计算就绪合同必须返回数组')
  }
  for (const item of items) {
    if (!item.computeKind?.trim()) {
      throw new TypeError('达成度计算就绪合同缺字段：computeKind')
    }
    if (!item.stageTitle?.trim()) {
      throw new TypeError(`达成度计算就绪合同缺字段：stageTitle（${item.computeKind}）`)
    }
    if (typeof item.stageOrder !== 'number' || Number.isNaN(item.stageOrder)) {
      throw new TypeError(`达成度计算就绪合同缺字段：stageOrder（${item.computeKind}）`)
    }
    if (typeof item.ready !== 'boolean') {
      throw new TypeError(`达成度计算就绪合同缺字段：ready（${item.computeKind}）`)
    }
    if (!Array.isArray(item.blockingReasons)) {
      throw new TypeError(`达成度计算就绪合同缺字段：blockingReasons（${item.computeKind}）`)
    }
    if (!item.targetScopeLabel?.trim()) {
      throw new TypeError(`达成度计算就绪合同缺字段：targetScopeLabel（${item.computeKind}）`)
    }
    if (!item.dataPeriodLabel?.trim()) {
      throw new TypeError(`达成度计算就绪合同缺字段：dataPeriodLabel（${item.computeKind}）`)
    }
    if (!item.algorithmProfileLabel?.trim()) {
      throw new TypeError(`达成度计算就绪合同缺字段：algorithmProfileLabel（${item.computeKind}）`)
    }
    for (const field of [
      'expectedCoverCount',
      'replaceableResultCount',
      'lockedSubmittedCount',
      'lockedConfirmedCount',
      'lockedArchivedCount',
    ] as const) {
      if (typeof item[field] !== 'number' || Number.isNaN(item[field])) {
        throw new TypeError(`达成度计算就绪合同缺字段：${field}（${item.computeKind}）`)
      }
    }
  }
}

async function loadComputeReadiness() {
  let programId: string
  let trainingPlanId: string
  try {
    programId = requireScopeProgramId()
    trainingPlanId = requireScopeTrainingPlanId()
  } catch {
    computeReadinessItems.value = []
    readinessPhase.value = 'idle'
    return
  }
  const scope = beginQualityScopeRequest()
  readinessLoading.value = true
  readinessPhase.value = 'loading'
  try {
    const items = await achievementApi.computeReadiness({
      programId,
      trainingPlanId,
      qualityCourseId: triggerForm.qualityCourseId || undefined,
      courseGoalId: triggerForm.courseGoalId || undefined,
      trainingObjectiveId: triggerForm.trainingObjectiveId || undefined,
      schoolYear: triggerForm.schoolYear || undefined,
      semester: triggerForm.semester || undefined,
    })
    if (scope.isStale()) {
      return
    }
    requireReadinessContract(items)
    computeReadinessItems.value = items
    readinessPhase.value = 'ready'
  } catch (error) {
    if (scope.isStale()) {
      return
    }
    computeReadinessItems.value = []
    readinessPhase.value = 'error'
    showUserError(error, '达成度计算就绪检查加载失败')
  } finally {
    if (!scope.isStale()) {
      readinessLoading.value = false
    }
  }
}

function openTriggerDrawer() {
  try {
    requireScopeTrainingPlanId()
    requireScopeProgramId()
  } catch {
    return
  }
  triggerVisible.value = true
  void loadComputeReadiness()
}

const targetTypeToComputeKind: Partial<Record<AchievementTargetTypeCode, string>> = {
  [AchievementTargetTypeCode.COURSE_GOAL]: 'COURSE_GOAL',
  [AchievementTargetTypeCode.REQUIREMENT_INDICATOR]: 'REQUIREMENT',
  [AchievementTargetTypeCode.GRADUATION_REQUIREMENT]: 'REQUIREMENT',
  [AchievementTargetTypeCode.TRAINING_OBJECTIVE]: 'TRAINING_OBJECTIVE',
  [AchievementTargetTypeCode.PROGRAM_SUMMARY]: 'PROGRAM',
  [AchievementTargetTypeCode.CIVIC_GOAL_AGGREGATE]: 'CIVIC_GOAL_AGGREGATE',
  [AchievementTargetTypeCode.COMPLEX_ENGINEERING_AGGREGATE]: 'COMPLEX_ENGINEERING',
}

async function handleRecomputeRecord(record: AchievementResultVO) {
  const computeKind = targetTypeToComputeKind[record.targetType]
  if (!computeKind) {
    void message.warning('当前目标类型不支持在此页重算')
    return
  }
  let scopeProgramId: string
  try {
    scopeProgramId = requireScopeProgramId()
    requireScopeTrainingPlanId()
  } catch {
    return
  }
  if (!record.programId?.trim()) {
    showFormValidationMessage('该达成度结果缺少专业合同字段，禁止重算')
    return
  }
  if (record.programId !== scopeProgramId) {
    showFormValidationMessage('当前工作范围专业与该结果不一致，请先切换专业后再重算')
    return
  }
  if (record.trainingPlanId && record.trainingPlanId !== qualityStore.currentTrainingPlanId) {
    showFormValidationMessage('当前工作范围培养方案与该结果不一致，请先切换培养方案后再重算')
    return
  }
  if (record.qualityCourseId) {
    triggerForm.qualityCourseId = record.qualityCourseId
  }
  if (record.targetType === AchievementTargetTypeCode.COURSE_GOAL) {
    triggerForm.courseGoalId = record.targetId
  }
  if (record.targetType === AchievementTargetTypeCode.TRAINING_OBJECTIVE) {
    triggerForm.trainingObjectiveId = record.targetId
  }
  if (record.schoolYear) {
    triggerForm.schoolYear = record.schoolYear
  }
  if (record.semester) {
    triggerForm.semester = record.semester
  }
  const button = triggerButtons.find((item) => item.key === computeKind)
  if (!button) return
  await handleTrigger(button.key, button.handler)
}

function formatValue(value?: number) {
  return formatScore(value, 'achievement', '-')
}

/** 达成值处于阈值 95%–100% 区间时标记「临近临界」 */
function isNearCriticalThreshold(record: AchievementResultVO): boolean {
  if (record.finalValue == null || record.thresholdValue == null) {
    return false
  }
  const threshold = Number(record.thresholdValue)
  const finalValue = Number(record.finalValue)
  if (!Number.isFinite(threshold) || !Number.isFinite(finalValue) || threshold <= 0) {
    return false
  }
  return finalValue >= threshold * 0.95 && finalValue < threshold
}

function goDetail(record: AchievementResultVO) {
  router.push({
    name: 'QualityAchievementDetail',
    params: { resultId: record.id },
  })
}

function buildAchievementActions(record: AchievementResultVO): UiTableRowActionItem[] {
  const actions: UiTableRowActionItem[] = [{ key: 'detail', label: '详情' }]
  if (canRecomputeRecord(record)) {
    actions.push({ key: 'recompute', label: '重新计算', tone: 'primary' })
  }
  if (!isResultStale(record)) {
    for (const to of nextStatuses(record.auditStatus)) {
      actions.push({
        key: to,
        label: `→ ${auditStatusLabel(to)}`,
        tone: to === AchievementAuditStatusCode.RETURNED ? 'danger' : 'primary',
      })
    }
  }
  actions.push({ key: 'audit', label: '审计' })
  return actions
}

function handleAchievementAction(key: string, record: AchievementResultVO): void {
  switch (key) {
    case 'detail':
      goDetail(record)
      return
    case 'recompute':
      void handleRecomputeRecord(record)
      return
    case 'audit':
      void openAuditDrawer(record)
      return
    case AchievementAuditStatusCode.DRAFT:
    case AchievementAuditStatusCode.CALCULATED:
    case AchievementAuditStatusCode.SUBMITTED:
    case AchievementAuditStatusCode.CONFIRMED:
    case AchievementAuditStatusCode.RETURNED:
    case AchievementAuditStatusCode.ARCHIVED:
      void handleTransit(record, key)
  }
}

const auditDrawerOpen = ref(false)
const auditEvents = ref<AuditTimelineEvent[]>([])
const auditLoading = ref(false)

async function openAuditDrawer(record: AchievementResultVO) {
  auditDrawerOpen.value = true
  auditLoading.value = true
  auditEvents.value = []
  try {
    const audits = await loadBoundedPlanAggregate(
      (pageNum, pageSize) =>
        achievementAuditApi.page({
          achievementResultId: record.id,
          pageNum,
          pageSize,
        }),
      '达成度审核流水',
    )
    auditEvents.value = audits.map((a) => ({
      id: a.id,
      operatorName: a.auditorNickName,
      operationType: a.auditEvent,
      operationLabel:
        a.auditEvent
          ? auditEventLabel(a.auditEvent)
          : `${auditStatusLabelMaybe(a.auditStatusFrom)} → ${auditStatusLabelMaybe(a.auditStatusTo)}`,
      time: a.auditedTime,
      detail: a.auditOpinion || a.returnReason || undefined,
      targetType: '达成度结果',
    }))
  } finally {
    auditLoading.value = false
  }
}

const achievementResultItems = computed<TaskResultItem[]>(() => {
  const abnormalTone: BadgeTone = 'red'
  return list.value
    .filter(
      (r) =>
        r.auditStatus === AchievementAuditStatusCode.RETURNED
        || r.achievementStatus === AchievementStatusCode.NOT_ACHIEVED
        || isResultStale(r),
    )
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      title: `${targetTypeLabel(r.targetType)} · ${r.targetLabel}`,
      statusLabel:
        r.auditStatus === AchievementAuditStatusCode.RETURNED
          ? '已驳回'
          : isResultStale(r)
            ? '结果过期'
            : '未达成',
      statusTone: abnormalTone,
      description:
        r.auditStatus === AchievementAuditStatusCode.RETURNED
          ? `审核驳回，需修正后重新提交`
          : isResultStale(r)
            ? `结果已过期，需按最新成绩或配置重新计算`
            : `达成值 ${formatValue(r.finalValue)} < 阈值 ${formatValue(r.thresholdValue)}`,
      actions: [{ key: 'detail', label: '查看详情' }],
    }))
})

function handleResultAction(actionEvent: { item: TaskResultItem, action: { key: string } }) {
  const record = list.value.find((r) => r.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'detail') goDetail(record)
}

watch(
  () => [
    triggerForm.qualityCourseId,
    triggerForm.courseGoalId,
    triggerForm.trainingObjectiveId,
    triggerForm.schoolYear,
    triggerForm.semester,
    qualityStore.currentProgramId,
    qualityStore.currentTrainingPlanId,
  ],
  () => {
    if (triggerVisible.value) {
      void loadComputeReadiness()
    }
  },
)

watch(
  () => qualityStore.currentTrainingPlanId,
  (value) => {
    triggerForm.trainingPlanId = value
    query.trainingPlanId = value
    triggerForm.qualityCourseId = ''
    triggerForm.courseGoalId = ''
    triggerForm.trainingObjectiveId = ''
    query.qualityCourseId = ''
  },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar show-title title="达成度结果">
        <template #actions>
          <UiButton
            variant="outline"
            size="sm"
            :disabled="trainingPlanRequired"
            :loading="loading"
            @click="handleScopeChange"
          >
            刷新
          </UiButton>
        </template>
      </QualityPageContextBar>
    </template>

    <QualityPlanGateStrip v-if="planGateMode" :mode="planGateMode" class="achievement__empty" />

    <template v-else>
      <StageRail :stages="stages" compact class="achievement__stages" />
      <UiEmpty
        v-if="signalSummaryLoadFailed"
        size="sm"
        title="达成度指标加载失败"
        class="achievement__signals"
      />
      <SignalBand
        v-else
        :metrics="signals"
        variant="panel"
        compact
        class="achievement__signals"
      />

      <TaskResultPanel
        v-if="achievementResultItems.length > 0"
        title="待关注结果"
        :items="achievementResultItems"
        class="achievement__result-panel"
        @action="handleResultAction"
      />

      <UiCard class="detail-table-card achievement__table-card">
        <template #title>达成度结果</template>
        <template #extra>
          <div class="dp-space" style="--dp-space-component: 8px">
            <UiButton
              variant="outline"
              size="sm"
              :loading="achievementExporting"
              :disabled="trainingPlanRequired"
              @click="handleExportAchievement"
            >
              <template #icon><DownloadOutlined /></template>
              导出 Excel
            </UiButton>
            <UiButton
              size="sm"
              variant="primary"
              :disabled="trainingPlanRequired"
              @click="openTriggerDrawer"
            >
              触发达成度计算
            </UiButton>
          </div>
        </template>

        <UiFilterBar
          variant="plain"
          v-model="filterModel"
          :fields="filterFields"
          show-labels
          @search="handleSearch"
          @reset="handleReset"
        >
          <template #field-qualityCourseId>
            <CourseSelector
              :value="query.qualityCourseId || null"
              :training-plan-id="qualityStore.currentTrainingPlanId || null"
              placeholder="关联课程"
              :width="180"
              @change="handleQueryQualityCourseChange"
            />
          </template>
          <template #field-classId>
            <ClassSelector
              :value="query.classId || null"
              placeholder="关联班级"
              :width="160"
              @change="handleQueryClassChange"
            />
          </template>
        </UiFilterBar>

        <UiDataTable
          v-model:current="query.pageNum"
          v-model:page-size="query.pageSize"
          :columns="columns"
          :data-source="list"
          :loading="loading"
          :load-error="loadError"
          row-key="id"
          size="middle"
          :total="total"
          flat
          @page-change="handlePageChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'targetType'">
              {{ targetTypeLabel(record.targetType) }}
            </template>
            <template v-else-if="column.key === 'targetLabel'">
              {{ record.targetLabel }}
            </template>
            <template v-else-if="column.key === 'qualityCourse'">
              <span v-if="record.qualityCourseId">
                {{ record.qualityCourseCode }} {{ record.qualityCourseName }}
              </span>
            </template>
            <template v-else-if="column.key === 'className'">
              <span v-if="record.classId">
                {{ record.className }}
              </span>
            </template>
            <template v-else-if="column.key === 'period'">
              {{ record.schoolYear
              }}<span v-if="record.semester"> / {{ formatSemester(record.semester) }}</span>
            </template>
            <template v-else-if="column.key === 'achievementValue'">
              <div class="achievement__achievement-cell">
                <span>
                  <span
                    class="achievement__value"
                    :class="[
                      record.finalValue !== null
                        && record.thresholdValue !== null
                        && record.finalValue >= record.thresholdValue
                        ? 'achievement__value--ok'
                        : 'achievement__value--bad',
                    ]"
                  >{{ formatValue(record.finalValue) }}</span>
                  <span class="achievement__threshold">
                    / {{ formatValue(record.thresholdValue) }}</span>
                </span>
                <UiTag v-if="isNearCriticalThreshold(record)" tone="orange" size="sm">
                  临近临界
                </UiTag>
              </div>
            </template>
            <template v-else-if="column.key === 'sample'">
              {{ record.sampleValid }} / {{ record.sampleTotal }}
            </template>
            <template v-else-if="column.key === 'achievementStatus'">
              <UiTag :tone="achievementStatusColor(record.achievementStatus)" size="sm">
                {{ achievementStatusLabel(record.achievementStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'validity'">
              <div class="achievement__validity">
                <UiTag :tone="resultValidityColor(record)" size="sm">
                  {{ resultValidityLabel(record) }}
                </UiTag>
                <span v-if="record.staleTime" class="achievement__validity-time">
                  {{ record.staleTime }}
                </span>
              </div>
            </template>
            <template v-else-if="column.key === 'auditStatus'">
              <UiTag :tone="auditStatusColor(record.auditStatus)" size="sm">
                {{ auditStatusLabel(record.auditStatus) }}
              </UiTag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <UiTableActions
                :items="buildAchievementActions(record)"
                split
                @action="(key) => handleAchievementAction(key, record)"
              />
            </template>
          </template>
        </UiDataTable>
      </UiCard>
    </template>

    <UiDrawer v-model:open="triggerVisible" title="触发达成度计算" :width="720" :hide-footer="true">
      <section class="achievement__drawer-section">
        <h4 class="achievement__section-title">1. 范围</h4>
        <p class="achievement__drawer-hint">
          专业与培养方案取自顶部质量工作范围（合同必填，禁止本页覆盖或反推）；学年学期决定计算期间。
        </p>
        <p class="achievement__drawer-algo">
          专业：{{
            qualityStore.currentProgram?.majorCategoryName
              || qualityStore.currentProgramId
              || '未选择'
          }}
          · 培养方案：{{ qualityStore.currentPlan?.planName || qualityStore.currentTrainingPlanId || '未选择' }}
        </p>
        <UiForm layout="vertical" :model="triggerForm">
          <UiRow :gutter="12">
            <UiCol :span="12">
              <UiFormItem label="学年">
                <UiInput size="sm" v-model="triggerForm.schoolYear" placeholder="例：2024-2025" />
              </UiFormItem>
            </UiCol>
            <UiCol :span="12">
              <UiFormItem label="学期">
                <UiSelect
                  size="sm"
                  v-model="triggerForm.semester"
                  :options="SemesterOptions"
                  placeholder="学期"
                  allow-clear
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
        </UiForm>
      </section>

      <section class="achievement__drawer-section">
        <h4 class="achievement__section-title">2. 输入</h4>
        <p class="achievement__drawer-hint">
          课程目标计算需选质量评价课程与课程目标；培养目标计算需选培养目标。
        </p>
        <UiForm layout="vertical" :model="triggerForm">
          <UiRow :gutter="12">
            <UiCol :span="12">
              <UiFormItem label="质量评价课程">
                <CourseSelector
                  :value="triggerForm.qualityCourseId || null"
                  :training-plan-id="qualityStore.currentTrainingPlanId || null"
                  placeholder="选择质量评价课程"
                  @change="handleQualityCourseChange"
                />
              </UiFormItem>
            </UiCol>
            <UiCol :span="12">
              <UiFormItem label="课程目标">
                <CourseGoalSelector
                  :value="triggerForm.courseGoalId || null"
                  :quality-course-id="triggerForm.qualityCourseId || null"
                  placeholder="选择课程目标"
                  @change="handleCourseGoalChange"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
          <UiRow :gutter="12">
            <UiCol :span="12">
              <UiFormItem label="培养目标">
                <TrainingObjectiveSelector
                  :value="triggerForm.trainingObjectiveId || null"
                  :training-plan-id="qualityStore.currentTrainingPlanId || null"
                  placeholder="选择培养目标"
                  @change="handleTrainingObjectiveChange"
                />
              </UiFormItem>
            </UiCol>
          </UiRow>
        </UiForm>
      </section>

      <section class="achievement__drawer-section">
        <h4 class="achievement__section-title">3. 算法口径</h4>
        <p v-if="readinessLoading" class="achievement__readiness-hint">正在解析算法口径…</p>
        <p v-else-if="readinessPhase === 'error'" class="achievement__readiness-hint">
          就绪检查失败，无法展示算法口径；关闭抽屉后重新打开或切换范围后再试
        </p>
        <p v-else-if="orderedTriggerSteps[0]?.readiness" class="achievement__drawer-algo">
          {{ orderedTriggerSteps[0].readiness.algorithmProfileLabel }}
        </p>
        <p v-else class="achievement__drawer-hint">选择范围后将显示专业算法实例口径。</p>
      </section>

      <section class="achievement__drawer-section">
        <h4 class="achievement__section-title">4. 计算影响与执行</h4>
        <p class="achievement__drawer-hint">
          按依赖顺序执行；汇总级步骤与单课程目标不同权，执行前须确认影响面。
        </p>
        <p v-if="readinessLoading" class="achievement__readiness-hint">正在检查计算就绪状态…</p>
        <p v-else-if="readinessPhase === 'error'" class="achievement__readiness-hint">
          计算就绪检查失败；关闭抽屉后重新打开或切换范围后再计算，禁止在失败态放行计算
        </p>
        <div v-else class="achievement__trigger-chain">
          <div
            v-for="step in orderedTriggerSteps"
            :key="step.key"
            class="achievement__trigger-step"
            :class="{
              'achievement__trigger-step--blocked': step.readiness && !step.readiness.ready,
              'achievement__trigger-step--aggregate':
                step.key === 'PROGRAM'
                || step.key === 'CIVIC_GOAL_AGGREGATE'
                || step.key === 'COMPLEX_ENGINEERING'
                || step.key === 'REQUIREMENT',
            }"
          >
            <div class="achievement__trigger-step-head">
              <span class="achievement__trigger-step-title">
                {{ step.readiness?.stageTitle || step.label }}
              </span>
              <UiTag
                v-if="step.readiness"
                :tone="step.readiness.ready ? 'green' : 'orange'"
                size="sm"
              >
                {{ step.readiness.ready ? '可计算' : '未就绪' }}
              </UiTag>
            </div>
            <dl v-if="step.readiness" class="achievement__impact">
              <div>
                <dt>目标</dt>
                <dd>{{ step.readiness.targetScopeLabel }}</dd>
              </div>
              <div>
                <dt>期间</dt>
                <dd>{{ step.readiness.dataPeriodLabel }}</dd>
              </div>
              <div>
                <dt>预计覆盖</dt>
                <dd>{{ step.readiness.expectedCoverCount }} 条</dd>
              </div>
              <div>
                <dt>将覆盖未锁定</dt>
                <dd>{{ step.readiness.replaceableResultCount }} 条</dd>
              </div>
              <div>
                <dt>锁定（禁重算）</dt>
                <dd>
                  提交 {{ step.readiness.lockedSubmittedCount }} /
                  确认 {{ step.readiness.lockedConfirmedCount }} /
                  归档 {{ step.readiness.lockedArchivedCount }}
                </dd>
              </div>
            </dl>
            <ul
              v-if="step.readiness && !step.readiness.ready && step.readiness.blockingReasons.length"
              class="achievement__trigger-blockers"
            >
              <li v-for="(reason, idx) in step.readiness.blockingReasons.slice(0, 3)" :key="idx">
                {{ reason }}
              </li>
              <li v-if="step.readiness.blockingReasons.length > 3">
                另有 {{ step.readiness.blockingReasons.length - 3 }} 项依赖未满足
              </li>
            </ul>
            <UiButton
              :variant="step.key === 'COURSE_GOAL' ? 'primary' : 'outline'"
              size="sm"
              :loading="triggerLoading === step.key"
              :disabled="
                trainingPlanRequired
                  || programRequired
                  || readinessPhase !== 'ready'
                  || (step.readiness != null && !step.readiness.ready)
              "
              @click="handleTrigger(step.key, step.handler)"
            >
              {{ step.key === 'COURSE_GOAL' ? '计算课程目标' : `计算${step.label}` }}
            </UiButton>
          </div>
        </div>
      </section>
    </UiDrawer>

    <AuditTimelineDrawer
      v-model:open="auditDrawerOpen"
      :events="auditEvents"
      :loading="auditLoading"
      title="达成度审核历史"
    />
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.achievement {
  &__empty {
    margin-top: var(--dp-space-component);
  }

  &__stages {
    margin-bottom: var(--dp-space-block);
  }

  &__signals {
    margin-bottom: var(--dp-space-component);
  }

  &__result-panel {
    margin-bottom: var(--dp-space-block);
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
    width: 160px;

    &--lg {
      width: 200px;
    }

    &--xs {
      width: 110px;
    }

    &--course {
      width: 220px;
    }

    &--class {
      width: 180px;
    }

    &--xxs {
      width: 80px;
    }
  }

  &__editor-alert {
    margin-bottom: var(--dp-space-component);
  }

  &__section-title {
    margin: var(--dp-space-block) 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__trigger-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--dp-space-component-tight);
  }

  &__trigger-chain {
    display: flex;
    flex-direction: column;
    gap: var(--dp-space-component);
  }

  &__drawer-section {
    margin-bottom: var(--dp-space-block);
  }

  &__drawer-hint {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
    line-height: 1.5;
  }

  &__drawer-algo {
    margin: 0;
    padding: var(--dp-space-component-tight) var(--dp-space-component);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface-subtle, var(--dp-surface));
    font-size: var(--dp-font-size-sm);
    color: var(--dp-text-primary);
  }

  &__impact {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--dp-space-component-xs);
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);

    div {
      display: grid;
      grid-template-columns: 88px 1fr;
      gap: var(--dp-space-component-tight);
    }

    dt {
      margin: 0;
      color: var(--dp-text-muted);
    }

    dd {
      margin: 0;
      color: var(--dp-text-primary);
    }
  }

  &__trigger-step {
    padding: var(--dp-space-component);
    border: 1px solid var(--dp-border);
    border-radius: var(--dp-radius-panel);
    background: var(--dp-surface);

    &--blocked {
      border-color: var(--dp-warning-border);
      background: var(--dp-warning-bg);
    }

    &--aggregate {
      border-left: 3px solid var(--dp-color-primary);
    }
  }

  &__trigger-step-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--dp-space-component-tight);
    margin-bottom: var(--dp-space-component-tight);
  }

  &__trigger-step-title {
    font-size: var(--dp-font-size-md);
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__trigger-blockers {
    margin: 0 0 var(--dp-space-component-tight);
    padding-left: 18px;
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-secondary);
    line-height: 1.5;
  }

  &__readiness-hint {
    margin: 0 0 var(--dp-space-component-tight);
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
  }

  &__value--success {
    color: var(--dp-success);
    font-weight: 600;
  }

  &__value--error {
    color: var(--dp-error);
    font-weight: 600;
  }

  &__value--ok {
    color: var(--dp-success);
    font-weight: 600;
  }

  &__value--bad {
    color: var(--dp-error);
    font-weight: 600;
  }

  &__threshold {
    color: var(--dp-text-muted);
  }

  &__achievement-cell {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-component-xs);
  }

  &__validity {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--dp-space-component-xs);
  }

  &__validity-time {
    font-size: var(--dp-font-size-xs);
    color: var(--dp-text-muted);
    line-height: 1.4;
  }
}
</style>
