<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type { AchievementComputeReadinessItemVO } from '@/apis/quality/achievement'
import { achievementApi } from '@/apis/quality/achievement'
import type {
  AchievementResultQueryRequest,
  AchievementResultVO,
} from '@/apis/quality/achievement-result'
import { achievementResultApi } from '@/apis/quality/achievement-result'
/**
 * 质量评价 - 达成度评价驾驶舱
 *
 * 状态机：DRAFT -> CALCULATED -> SUBMITTED -> CONFIRMED / RETURNED / ARCHIVED
 *
 * 后端契约（AchievementCalculationController + AchievementResultController + AchievementAuditController）：
 * - compute-course-goal              需 qualityCourseId + courseGoalId
 * - compute-requirement              毕业要求 / 观测点合并，需 trainingPlanId
 * - compute-program                  专业汇总
 * - compute-training-objective       培养目标
 * - compute-civic-goal-aggregate     课程思政独立汇总
 * - compute-complex-engineering-aggregate 复杂工程问题专项
 */
import type { BadgeTone, FilterField, UiTableRowActionItem } from '@/components/ui-guide/ui/types'
import type { SemesterCode } from '@/types/enums/semester-enum'
import { formatSemester, SemesterOptions } from '@/types/enums/semester-enum'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
  WorkbenchStageStatus,
} from '@/types/workbench'
import DownloadOutlined from '@ant-design/icons-vue/DownloadOutlined'
import { message } from 'ant-design-vue'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ExportBusinessType } from '@/apis/edu/export'
import { achievementAuditApi } from '@/apis/quality/achievement-audit'
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
import {
  ClassSelector,
  CourseGoalSelector,
  CourseSelector,
  ProgramSelector,
  TrainingObjectiveSelector,
} from '@/components/quality/selectors'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiEmpty from '@/components/ui-guide/ui/Empty.vue'
import UiFilterBar from '@/components/ui-guide/ui/FilterBar.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiDataTable from '@/components/ui-guide/ui/UiDataTable.vue'
import UiDrawer from '@/components/ui-guide/ui/UiDrawer.vue'
import UiTableActions from '@/components/ui-guide/ui/UiTableActions.vue'
import AuditTimelineDrawer from '@/components/workbench/AuditTimelineDrawer.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageRail from '@/components/workbench/StageRail.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import TaskResultPanel from '@/components/workbench/TaskResultPanel.vue'
import { promptInputAsync } from '@/composables/usePromptInputDialog'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityTableExport } from '@/composables/useQualityTableExport'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError } from '@/utils/error-handler'
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

function auditEventLabel(event: string | undefined): string {
  if (!event) return '-'
  if (event === AchievementAuditStatusCode.CALCULATED) return '达成度计算'
  const auditStatus = event as AchievementAuditStatusCode
  if (Object.prototype.hasOwnProperty.call(AchievementAuditStatusDescription, auditStatus)) {
    return auditStatusLabel(auditStatus)
  }
  return event
}

function auditStatusLabelMaybe(value: AchievementAuditStatusCode | undefined): string {
  return value ? auditStatusLabel(value) : '-'
}

function canRecomputeRecord(record: AchievementResultVO): boolean {
  return (
    record.auditStatus === AchievementAuditStatusCode.RETURNED ||
    isResultStale(record) ||
    record.auditStatus === AchievementAuditStatusCode.DRAFT ||
    record.auditStatus === AchievementAuditStatusCode.CALCULATED
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
const triggerLoading = ref<string>('')
const { exporting: achievementExporting, exportExcel: exportAchievementExcel } =
  useQualityTableExport()

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
  programId: string
}

const triggerForm = reactive<AchievementTriggerForm>({
  trainingPlanId: qualityStore.currentTrainingPlanId,
  qualityCourseId: '',
  courseGoalId: '',
  trainingObjectiveId: '',
  schoolYear: qualityStore.currentSchoolYear || '',
  semester: qualityStore.currentSemester,
  programId: qualityStore.currentProgramId,
})

function handleQualityCourseChange(value: string | null) {
  triggerForm.qualityCourseId = value ?? ''
  triggerForm.courseGoalId = ''
}

function handleProgramChange(value: string | null) {
  triggerForm.programId = value ?? ''
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

const targetTypeOptions: Array<{ value: AchievementTargetTypeCode; label: string }> = [
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
const auditStatusOptions: Array<{ value: AchievementAuditStatusCode; label: string }> = [
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
const achievementStatusOptions: Array<{ value: AchievementStatusCode; label: string }> = [
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
  loadList()
}

function handleReset() {
  resetQuery()
}

const trainingPlanRequired = computed(() => !qualityStore.currentTrainingPlanId)
const programRequired = computed(
  () => !qualityStore.currentProgramId && !triggerForm.programId.trim(),
)

async function loadList() {
  if (!qualityStore.currentTrainingPlanId) return
  loading.value = true
  try {
    const page = await achievementResultApi.page({
      ...query,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      qualityCourseId: query.qualityCourseId || undefined,
      classId: query.classId || undefined,
      schoolYear: query.schoolYear || undefined,
      semester: query.semester || undefined,
      targetType: query.targetType || undefined,
      auditStatus: query.auditStatus || undefined,
      achievementStatus: query.achievementStatus || undefined,
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
    showUserError(error, '达成度结果加载失败')
  } finally {
    loading.value = false
  }
}

async function handleScopeChange(): Promise<void> {
  await loadList()
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

useQualityScopedLoader(handleScopeChange, {
  watchScope: true,
  immediate: false,
  reloadOnActivated: false,
})

function handlePageChange(page: { current: number; pageSize: number }) {
  query.pageNum = page.current
  query.pageSize = page.pageSize
  loadList()
}

const columns: ColumnsType = [
  { title: '目标类型', dataIndex: 'targetType', key: 'targetType', width: 160 },
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
  { title: '操作', key: 'actions', width: 320, fixed: 'right' },
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
  loadList()
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
type AchievementComputeResult =
  | Awaited<ReturnType<typeof achievementApi.computeCourseGoal>>
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
        message.warning('课程目标计算必须先选择质量评价课程')
        return Promise.reject(new Error('missing courseGoalId'))
      }
      if (!triggerForm.courseGoalId?.trim()) {
        message.warning('课程目标计算必须先选择课程目标')
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
        programId: triggerForm.programId || qualityStore.currentProgramId,
        trainingPlanId: qualityStore.currentTrainingPlanId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      }),
  },
  {
    key: 'TRAINING_OBJECTIVE',
    label: '培养目标',
    handler: () => {
      if (!triggerForm.trainingObjectiveId?.trim()) {
        message.warning('培养目标计算必须先选择培养目标')
        return Promise.reject(new Error('missing trainingObjectiveId'))
      }
      return achievementApi.computeTrainingObjective({
        programId: triggerForm.programId || qualityStore.currentProgramId,
        trainingPlanId: qualityStore.currentTrainingPlanId,
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
        trainingPlanId: qualityStore.currentTrainingPlanId,
        programId: triggerForm.programId || qualityStore.currentProgramId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      }),
  },
  {
    key: 'CIVIC_GOAL_AGGREGATE',
    label: '课程思政',
    handler: () =>
      achievementApi.computeCivicGoalAggregate({
        programId: triggerForm.programId || qualityStore.currentProgramId,
        trainingPlanId: qualityStore.currentTrainingPlanId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      }),
  },
  {
    key: 'COMPLEX_ENGINEERING',
    label: '复杂工程',
    handler: () =>
      achievementApi.computeComplexEngineeringAggregate({
        programId: triggerForm.programId || qualityStore.currentProgramId,
        trainingPlanId: qualityStore.currentTrainingPlanId,
        schoolYear: triggerForm.schoolYear,
        semester: triggerForm.semester || undefined,
      }),
  },
]

async function handleTrigger(key: string, handler: () => Promise<AchievementComputeResult>) {
  if (!qualityStore.currentTrainingPlanId) {
    message.warning('请先在顶部选择培养方案')
    return
  }
  if (programRequired.value) {
    message.warning('请先在顶部选择专业')
    return
  }
  const readiness = readinessByKind.value.get(key)
  if (readiness && !readiness.ready) {
    message.warning(readiness.blockingReasons[0] || '当前步骤尚未就绪')
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
    message.success(count > 0 ? `计算完成，生成 / 更新 ${count} 条结果` : '计算完成')
    await loadList()
    if (triggerVisible.value) {
      await loadComputeReadiness()
    }
  } catch (err) {
    // 计算被用户取消（如未填 courseGoalId）静默忽略
    if (
      err instanceof Error &&
      (err.message === 'cancelled' ||
        err.message === 'missing courseGoalId' ||
        err.message === 'missing trainingObjectiveId')
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
  message.success('流转成功')
  await loadList()
}

/* ========== 阶段轨与信号指标带 ========== */

const auditBuckets = computed(() => {
  const buckets: Record<AchievementAuditStatusCode, number> = {
    [AchievementAuditStatusCode.DRAFT]: 0,
    [AchievementAuditStatusCode.CALCULATED]: 0,
    [AchievementAuditStatusCode.SUBMITTED]: 0,
    [AchievementAuditStatusCode.CONFIRMED]: 0,
    [AchievementAuditStatusCode.RETURNED]: 0,
    [AchievementAuditStatusCode.ARCHIVED]: 0,
  }
  for (const r of list.value) {
    buckets[r.auditStatus] += 1
  }
  return buckets
})

const stages = computed<WorkbenchStage[]>(() => {
  const b = auditBuckets.value
  const order: Array<{ key: AchievementAuditStatusCode; title: string }> = [
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
  const b = auditBuckets.value
  const notAchieved = list.value.filter(
    (r) => r.achievementStatus === AchievementStatusCode.NOT_ACHIEVED,
  ).length
  const partial = list.value.filter(
    (r) => r.achievementStatus === AchievementStatusCode.PARTIALLY_ACHIEVED,
  ).length
  const achieved = list.value.filter(
    (r) => r.achievementStatus === AchievementStatusCode.ACHIEVED,
  ).length
  const stale = list.value.filter((r) => isResultStale(r)).length
  return [
    {
      key: 'total',
      label: '本页结果',
      value: list.value.length,
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
    .sort((a, b) => (a.readiness?.stageOrder ?? 99) - (b.readiness?.stageOrder ?? 99)),
)

async function loadComputeReadiness() {
  if (!qualityStore.currentTrainingPlanId) {
    computeReadinessItems.value = []
    return
  }
  readinessLoading.value = true
  try {
    computeReadinessItems.value = await achievementApi.computeReadiness({
      programId: triggerForm.programId || qualityStore.currentProgramId,
      trainingPlanId: qualityStore.currentTrainingPlanId,
      qualityCourseId: triggerForm.qualityCourseId || undefined,
      courseGoalId: triggerForm.courseGoalId || undefined,
      trainingObjectiveId: triggerForm.trainingObjectiveId || undefined,
      schoolYear: triggerForm.schoolYear || undefined,
      semester: triggerForm.semester || undefined,
    })
  } finally {
    readinessLoading.value = false
  }
}

function openTriggerDrawer() {
  if (!qualityStore.currentTrainingPlanId) {
    message.warning('请先在顶部选择培养方案')
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
    message.warning('当前目标类型不支持在此页重算')
    return
  }
  if (record.programId) {
    triggerForm.programId = record.programId
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
  for (const to of nextStatuses(record.auditStatus)) {
    actions.push({
      key: `transit:${to}`,
      label: `→ ${auditStatusLabel(to)}`,
      tone: to === AchievementAuditStatusCode.RETURNED ? 'danger' : 'primary',
    })
  }
  actions.push({ key: 'audit', label: '审计' })
  return actions
}

function handleAchievementAction(key: string, record: AchievementResultVO): void {
  if (key === 'detail') {
    goDetail(record)
    return
  }
  if (key === 'recompute') {
    void handleRecomputeRecord(record)
    return
  }
  if (key === 'audit') {
    void openAuditDrawer(record)
    return
  }
  if (key.startsWith('transit:')) {
    const target = key.slice('transit:'.length) as AchievementAuditStatusCode
    void handleTransit(record, target)
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
    const audits = await achievementAuditApi.listByResult(record.id)
    auditEvents.value = audits.map((a) => ({
      id: a.id,
      operatorName: a.auditorNickName,
      operationType: a.auditEvent,
      operationLabel:
        a.auditEvent === AchievementAuditStatusCode.CALCULATED
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
        r.auditStatus === AchievementAuditStatusCode.RETURNED ||
        r.achievementStatus === AchievementStatusCode.NOT_ACHIEVED ||
        isResultStale(r),
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

function handleResultAction(actionEvent: { item: TaskResultItem; action: { key: string } }) {
  const record = list.value.find((r) => r.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'detail') goDetail(record)
}

watch(
  () => [
    triggerForm.qualityCourseId,
    triggerForm.courseGoalId,
    triggerForm.trainingObjectiveId,
    triggerForm.programId,
    triggerForm.schoolYear,
    triggerForm.semester,
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
    triggerForm.programId = qualityStore.currentProgramId
    triggerForm.qualityCourseId = ''
    triggerForm.courseGoalId = ''
    triggerForm.trainingObjectiveId = ''
    query.qualityCourseId = ''
    loadList()
  },
)

onMounted(async () => {
  await applyRouteScopeQuery()
  triggerForm.trainingPlanId = qualityStore.currentTrainingPlanId
  triggerForm.programId = qualityStore.currentProgramId
  query.trainingPlanId = qualityStore.currentTrainingPlanId
  if (qualityStore.currentTrainingPlanId) {
    await loadList()
    await loadComputeReadiness()
  }
})

onActivated(async () => {
  if (!qualityStore.currentTrainingPlanId) {
    return
  }
  query.trainingPlanId = qualityStore.currentTrainingPlanId
  triggerForm.trainingPlanId = qualityStore.currentTrainingPlanId
  await Promise.all([loadList(), loadComputeReadiness()])
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <QualityPageContextBar>
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

    <UiEmpty v-if="trainingPlanRequired" description="请选择培养方案" class="achievement__empty" />

    <template v-else>
      <StageRail :stages="stages" compact class="achievement__stages" />
      <SignalBand :metrics="signals" compact class="achievement__signals" />

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
          <a-space>
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
            <UiButton size="sm" :disabled="trainingPlanRequired" @click="openTriggerDrawer">
              触发达成度计算
            </UiButton>
          </a-space>
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
                      record.finalValue !== null &&
                      record.thresholdValue !== null &&
                      record.finalValue >= record.thresholdValue
                        ? 'achievement__value--ok'
                        : 'achievement__value--bad',
                    ]"
                    >{{ formatValue(record.finalValue) }}</span
                  >
                  <span class="achievement__threshold">
                    / {{ formatValue(record.thresholdValue) }}</span
                  >
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
      <a-form layout="vertical" :model="triggerForm">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="质量评价课程（课程目标计算需要）">
              <CourseSelector
                :value="triggerForm.qualityCourseId || null"
                :training-plan-id="qualityStore.currentTrainingPlanId || null"
                placeholder="选择质量评价课程"
                @change="handleQualityCourseChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="专业（与上下文不一致时覆盖）">
              <ProgramSelector
                :value="triggerForm.programId || null"
                placeholder="选择专业覆盖上下文"
                @change="handleProgramChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="学年">
              <a-input v-model:value="triggerForm.schoolYear" placeholder="例：2024-2025" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="学期">
              <a-select
                v-model:value="triggerForm.semester"
                :options="SemesterOptions"
                placeholder="学期"
                allow-clear
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="课程目标">
              <CourseGoalSelector
                :value="triggerForm.courseGoalId || null"
                :quality-course-id="triggerForm.qualityCourseId || null"
                placeholder="选择课程目标"
                @change="handleCourseGoalChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="培养目标">
              <TrainingObjectiveSelector
                :value="triggerForm.trainingObjectiveId || null"
                :training-plan-id="qualityStore.currentTrainingPlanId || null"
                placeholder="选择培养目标"
                @change="handleTrainingObjectiveChange"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <h4 class="achievement__section-title">计算入口（按依赖顺序）</h4>
      <p v-if="readinessLoading" class="achievement__readiness-hint">正在检查计算就绪状态…</p>
      <div class="achievement__trigger-chain">
        <div
          v-for="step in orderedTriggerSteps"
          :key="step.key"
          class="achievement__trigger-step"
          :class="{ 'achievement__trigger-step--blocked': step.readiness && !step.readiness.ready }"
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
            variant="outline"
            size="sm"
            :loading="triggerLoading === step.key"
            :disabled="
              trainingPlanRequired ||
              programRequired ||
              (step.readiness != null && !step.readiness.ready)
            "
            @click="handleTrigger(step.key, step.handler)"
          >
            计算{{ step.label }}
          </UiButton>
        </div>
      </div>
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
    margin-top: 32px;
  }

  &__stages {
    margin-bottom: 16px;
  }

  &__signals {
    margin-bottom: 12px;
  }

  &__result-panel {
    margin-bottom: 16px;
  }

  &__panel {
    background: var(--dp-surface);
    border: 1px solid var(--dp-border);
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
    color: var(--dp-text-primary);
  }

  &__panel-actions {
    display: flex;
    align-items: center;
    gap: 8px;
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
    margin-bottom: 12px;
  }

  &__section-title {
    margin: 16px 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__trigger-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }

  &__trigger-chain {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__trigger-step {
    padding: 12px;
    border: 1px solid var(--dp-border);
    border-radius: 8px;
    background: var(--dp-surface);

    &--blocked {
      border-color: var(--ant-color-warning-border);
      background: var(--ant-color-warning-bg);
    }
  }

  &__trigger-step-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__trigger-step-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dp-text-primary);
  }

  &__trigger-blockers {
    margin: 0 0 8px;
    padding-left: 18px;
    font-size: 12px;
    color: var(--dp-text-secondary);
    line-height: 1.5;
  }

  &__readiness-hint {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--dp-text-muted);
  }

  &__value--success {
    color: var(--ant-color-success);
    font-weight: 600;
  }

  &__value--error {
    color: var(--ant-color-error);
    font-weight: 600;
  }

  &__value--ok {
    color: var(--ant-color-success);
    font-weight: 600;
  }

  &__value--bad {
    color: var(--ant-color-error);
    font-weight: 600;
  }

  &__threshold {
    color: var(--dp-text-muted);
  }

  &__achievement-cell {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--dp-space-1);
  }

  &__validity {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  &__validity-time {
    font-size: 12px;
    color: var(--dp-text-muted);
    line-height: 1.4;
  }
}
</style>
