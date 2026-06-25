<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
import type {
  AchievementComputeReadinessItemVO,
} from '@/apis/quality/achievement'
import type {
  AchievementResultQueryRequest,
  AchievementResultVO,
} from '@/apis/quality/achievement-result'
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
import type {
  AchievementAuditStatus,
  AchievementStatus,
  AchievementTargetType,
} from '@/apis/quality/types'
import type { BadgeTone, FilterField } from '@/components/ui-guide/ui/types'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
  WorkbenchStageStatus,
} from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  achievementApi,
} from '@/apis/quality/achievement'
import {
  achievementAuditApi,
} from '@/apis/quality/achievement-audit'
import { achievementResultApi } from '@/apis/quality/achievement-result'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_AUDIT_STATUS_LABEL,
  ACHIEVEMENT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_LABEL,
  ACHIEVEMENT_TARGET_TYPE_LABEL,
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
import UiTextAction from '@/components/ui-guide/ui/UiTextAction.vue'
import AuditTimelineDrawer from '@/components/workbench/AuditTimelineDrawer.vue'
import SignalBand from '@/components/workbench/SignalBand.vue'
import StageRail from '@/components/workbench/StageRail.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import TaskResultPanel from '@/components/workbench/TaskResultPanel.vue'
import { useQualityScopedLoader } from '@/composables/useQualityPageScope'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError } from '@/utils/error-handler'
import { readPageList, readPageTotal } from '@/utils/page-result'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'
import { promptModal } from './_helpers'

function targetTypeLabel(value: AchievementTargetType): string {
  return strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, value, '达成目标类型')
}

function auditStatusLabel(value: AchievementAuditStatus): string {
  return strictEnumLabel(ACHIEVEMENT_AUDIT_STATUS_LABEL, value, '达成审核状态')
}

function auditStatusColor(value: AchievementAuditStatus): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成审核状态')
}

function achievementStatusLabel(value: AchievementStatus): string {
  return strictEnumLabel(ACHIEVEMENT_STATUS_LABEL, value, '达成状态')
}

function achievementStatusColor(value: AchievementStatus): BadgeTone {
  return strictEnumTone(ACHIEVEMENT_STATUS_COLOR, value, '达成状态')
}

function isResultStale(record: AchievementResultVO): boolean {
  return record.staleFlag === true
}

function auditEventLabel(event: AchievementAuditStatus): string {
  if (event === 'CALCULATED') return '达成度计算'
  return auditStatusLabel(event)
}

function canRecomputeRecord(record: AchievementResultVO): boolean {
  return record.auditStatus === 'RETURNED'
    || isResultStale(record)
    || record.auditStatus === 'DRAFT'
    || record.auditStatus === 'CALCULATED'
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

const query = reactive<AchievementResultQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  trainingPlanId: qualityStore.currentTrainingPlanId,
  targetType: undefined,
  auditStatus: undefined,
  achievementStatus: undefined,
  qualityCourseId: '',
  classId: '',
  schoolYear: '',
  semester: '',
})

const triggerForm = reactive({
  trainingPlanId: qualityStore.currentTrainingPlanId,
  qualityCourseId: '',
  courseGoalId: '',
  trainingObjectiveId: '',
  schoolYear: qualityStore.currentSchoolYear || '',
  semester: qualityStore.currentSemester || '',
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

const targetTypeOptions: Array<{ value: AchievementTargetType, label: string }> = [
  { value: 'COURSE_GOAL', label: ACHIEVEMENT_TARGET_TYPE_LABEL.COURSE_GOAL },
  { value: 'REQUIREMENT_INDICATOR', label: ACHIEVEMENT_TARGET_TYPE_LABEL.REQUIREMENT_INDICATOR },
  { value: 'GRADUATION_REQUIREMENT', label: ACHIEVEMENT_TARGET_TYPE_LABEL.GRADUATION_REQUIREMENT },
  { value: 'TRAINING_OBJECTIVE', label: ACHIEVEMENT_TARGET_TYPE_LABEL.TRAINING_OBJECTIVE },
  { value: 'PROGRAM_SUMMARY', label: ACHIEVEMENT_TARGET_TYPE_LABEL.PROGRAM_SUMMARY },
  { value: 'CIVIC_GOAL_AGGREGATE', label: ACHIEVEMENT_TARGET_TYPE_LABEL.CIVIC_GOAL_AGGREGATE },
  {
    value: 'COMPLEX_ENGINEERING_AGGREGATE',
    label: ACHIEVEMENT_TARGET_TYPE_LABEL.COMPLEX_ENGINEERING_AGGREGATE,
  },
]
const auditStatusOptions: Array<{ value: AchievementAuditStatus, label: string }> = [
  { value: 'DRAFT', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.DRAFT },
  { value: 'CALCULATED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.CALCULATED },
  { value: 'SUBMITTED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.SUBMITTED },
  { value: 'CONFIRMED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.CONFIRMED },
  { value: 'RETURNED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.RETURNED },
  { value: 'ARCHIVED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.ARCHIVED },
]
const achievementStatusOptions: Array<{ value: AchievementStatus, label: string }> = [
  { value: 'ACHIEVED', label: ACHIEVEMENT_STATUS_LABEL.ACHIEVED },
  { value: 'PARTIALLY_ACHIEVED', label: ACHIEVEMENT_STATUS_LABEL.PARTIALLY_ACHIEVED },
  { value: 'NOT_ACHIEVED', label: ACHIEVEMENT_STATUS_LABEL.NOT_ACHIEVED },
  { value: 'INSUFFICIENT_EVIDENCE', label: ACHIEVEMENT_STATUS_LABEL.INSUFFICIENT_EVIDENCE },
]

const filterModel = computed<Record<string, unknown>>({
  get: () => query as Record<string, unknown>,
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
    list.value = readPageList(page, '达成度结果加载失败，请稍后重试')
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
    total.value = readPageTotal(page, '达成度结果加载失败，请稍后重试')
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

useQualityScopedLoader(handleScopeChange, { watchScope: true, immediate: false, reloadOnActivated: false })

function handlePageChange(page: { current: number, pageSize: number }) {
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
  { title: '达成值 / 阈值', key: 'achievementValue', width: 160 },
  { title: '样本（有效 / 总量）', key: 'sample', width: 120 },
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
  query.semester = ''
  loadList()
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
        semester: triggerForm.semester,
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
        semester: triggerForm.semester,
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
        semester: triggerForm.semester,
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
        semester: triggerForm.semester,
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
        semester: triggerForm.semester,
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
        semester: triggerForm.semester,
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
      err instanceof Error
      && (err.message === 'cancelled'
        || err.message === 'missing courseGoalId'
        || err.message === 'missing trainingObjectiveId')
    ) {
      return
    }
    throw err
  } finally {
    triggerLoading.value = ''
  }
}

const auditTransitMap: Record<AchievementAuditStatus, AchievementAuditStatus[]> = {
  DRAFT: ['CALCULATED'],
  CALCULATED: ['DRAFT', 'SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'RETURNED'],
  CONFIRMED: ['ARCHIVED', 'RETURNED'],
  RETURNED: [],
  ARCHIVED: [],
}

function nextStatuses(current: AchievementAuditStatus | undefined): AchievementAuditStatus[] {
  if (!current) return []
  return strictEnumValue(auditTransitMap, current, '达成审核状态')
}

async function handleTransit(record: AchievementResultVO, to: AchievementAuditStatus) {
  const remark = await promptModal({
    title: `${auditStatusLabel(record.auditStatus)} -> ${auditStatusLabel(to)}`,
    placeholder: '审核备注（驳回时必填）',
    required: to === 'RETURNED',
    okType: to === 'RETURNED' ? 'danger' : 'primary',
    emptyErrorMessage: '驳回必须填写审核备注',
  })
  if (to === 'RETURNED' && !remark) return
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
  const buckets: Record<AchievementAuditStatus, number> = {
    DRAFT: 0,
    CALCULATED: 0,
    SUBMITTED: 0,
    CONFIRMED: 0,
    RETURNED: 0,
    ARCHIVED: 0,
  }
  for (const r of list.value) {
    buckets[r.auditStatus] += 1
  }
  return buckets
})

const stages = computed<WorkbenchStage[]>(() => {
  const b = auditBuckets.value
  const order: Array<{ key: AchievementAuditStatus, title: string }> = [
    { key: 'DRAFT', title: '草稿' },
    { key: 'CALCULATED', title: '已计算' },
    { key: 'SUBMITTED', title: '已提交' },
    { key: 'CONFIRMED', title: '已确认' },
    { key: 'ARCHIVED', title: '已归档' },
  ]
  return order.map((stage) => {
    const count = b[stage.key]
    let status: WorkbenchStageStatus = 'pending'
    if (stage.key === 'ARCHIVED' && count > 0) status = 'completed'
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
  const notAchieved = list.value.filter((r) => r.achievementStatus === 'NOT_ACHIEVED').length
  const partial = list.value.filter((r) => r.achievementStatus === 'PARTIALLY_ACHIEVED').length
  const achieved = list.value.filter((r) => r.achievementStatus === 'ACHIEVED').length
  const stale = list.value.filter((r) => isResultStale(r)).length
  return [
    { key: 'total', label: '本页结果', value: list.value.length, tone: 'blue' },
    { key: 'achieved', label: '已达成', value: achieved, tone: achieved > 0 ? 'green' : 'gray' },
    { key: 'partial', label: '部分达成', value: partial, tone: partial > 0 ? 'orange' : 'gray' },
    {
      key: 'not-achieved',
      label: '未达成',
      value: notAchieved,
      tone: notAchieved > 0 ? 'red' : 'gray',
    },
    {
      key: 'pending-audit',
      label: '待提交',
      value: b.DRAFT + b.CALCULATED,
      tone: b.DRAFT + b.CALCULATED > 0 ? 'orange' : 'gray',
    },
    { key: 'stale', label: '已过期', value: stale, tone: stale > 0 ? 'red' : 'gray' },
    { key: 'returned', label: '已驳回', value: b.RETURNED, tone: b.RETURNED > 0 ? 'red' : 'gray' },
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

const targetTypeToComputeKind: Partial<Record<AchievementTargetType, string>> = {
  COURSE_GOAL: 'COURSE_GOAL',
  REQUIREMENT_INDICATOR: 'REQUIREMENT',
  GRADUATION_REQUIREMENT: 'REQUIREMENT',
  TRAINING_OBJECTIVE: 'TRAINING_OBJECTIVE',
  PROGRAM_SUMMARY: 'PROGRAM',
  CIVIC_GOAL_AGGREGATE: 'CIVIC_GOAL_AGGREGATE',
  COMPLEX_ENGINEERING_AGGREGATE: 'COMPLEX_ENGINEERING',
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
  if (record.targetType === 'COURSE_GOAL') {
    triggerForm.courseGoalId = record.targetId
  }
  if (record.targetType === 'TRAINING_OBJECTIVE') {
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
  return value == null ? '-' : value.toFixed(3)
}

function goDetail(record: AchievementResultVO) {
  router.push({
    name: 'QualityAchievementDetail',
    params: { resultId: record.id },
  })
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
      operationLabel: a.auditEvent === 'CALCULATED'
        ? auditEventLabel('CALCULATED')
        : `${auditStatusLabel(a.auditStatusFrom)} → ${auditStatusLabel(a.auditStatusTo)}`,
      time: a.auditedAt,
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
    .filter((r) =>
      r.auditStatus === 'RETURNED'
      || r.achievementStatus === 'NOT_ACHIEVED'
      || isResultStale(r),
    )
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      title: `${targetTypeLabel(r.targetType)} · ${r.targetLabel}`,
      statusLabel: r.auditStatus === 'RETURNED' ? '已驳回' : isResultStale(r) ? '结果过期' : '未达成',
      statusTone: abnormalTone,
      description:
        r.auditStatus === 'RETURNED'
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
  if (!qualityStore.currentTrainingPlanId) {
    await qualityStore.loadTrainingPlanOptions()
    if (qualityStore.trainingPlanOptions.length) {
      qualityStore.setTrainingPlan(qualityStore.trainingPlanOptions[0].id)
    }
  }
  triggerForm.trainingPlanId = qualityStore.currentTrainingPlanId
  triggerForm.programId = qualityStore.currentProgramId
  query.trainingPlanId = qualityStore.currentTrainingPlanId
  await loadList()
  await loadComputeReadiness()
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

    <UiEmpty
      v-if="trainingPlanRequired"
      description="请选择培养方案"
      class="achievement__empty"
    />

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
          <UiButton size="sm" :disabled="trainingPlanRequired" @click="openTriggerDrawer">
            触发达成度计算
          </UiButton>
        </template>

        <UiFilterBar
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
              {{ record.schoolYear }} / {{ record.semester }}
            </template>
            <template v-else-if="column.key === 'achievementValue'">
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
              <div class="operations-cell" @click.stop>
                <UiTextAction @click="goDetail(record)">详情</UiTextAction>
                <UiTextAction
                  v-if="canRecomputeRecord(record)"
                  tone="primary"
                  @click="handleRecomputeRecord(record)"
                >
                  重新计算
                </UiTextAction>
                <UiTextAction
                  v-for="to in nextStatuses(record.auditStatus)"
                  :key="to"
                  :tone="to === 'RETURNED' ? 'danger' : 'primary'"
                  @click="handleTransit(record, to)"
                >
                  -> {{ auditStatusLabel(to) }}
                </UiTextAction>
                <UiTextAction @click="openAuditDrawer(record)">审计</UiTextAction>
              </div>
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
              <a-select v-model:value="triggerForm.semester" placeholder="学期" allow-clear>
                <a-select-option value="1"> 1 </a-select-option>
                <a-select-option value="2"> 2 </a-select-option>
              </a-select>
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
            :disabled="trainingPlanRequired || programRequired || (step.readiness != null && !step.readiness.ready)"
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
    margin-bottom: 16px;
    padding: 16px 20px;
    background: var(--dp-surface-elevated, #f8fafc);
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
  }

  &__result-panel {
    margin-bottom: 16px;
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
    color: var(--dp-text-primary, #0f172a);
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
    border: 1px solid var(--dp-border, #e2e8f0);
    border-radius: 8px;
    background: var(--dp-surface, #fff);

    &--blocked {
      border-color: var(--ant-color-warning-border, #fcd34d);
      background: var(--ant-color-warning-bg, #fffbeb);
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
    color: var(--dp-text-primary, #0f172a);
  }

  &__trigger-blockers {
    margin: 0 0 8px;
    padding-left: 18px;
    font-size: 12px;
    color: var(--dp-text-secondary, #475569);
    line-height: 1.5;
  }

  &__readiness-hint {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
  }

  &__value--success {
    color: var(--ant-color-success, #16a34a);
    font-weight: 600;
  }

  &__value--error {
    color: var(--ant-color-error, #dc2626);
    font-weight: 600;
  }

  &__value--ok {
    color: var(--ant-color-success, #16a34a);
    font-weight: 600;
  }

  &__value--bad {
    color: var(--ant-color-error, #dc2626);
    font-weight: 600;
  }

  &__threshold {
    color: var(--dp-text-muted, #64748b);
  }

  &__validity {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  &__validity-time {
    font-size: 12px;
    color: var(--dp-text-muted, #64748b);
    line-height: 1.4;
  }
}
</style>
