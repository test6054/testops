<script setup lang="ts">
import type { ColumnsType } from 'ant-design-vue/es/table'
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
  AchievementResultQueryRequest,
  AchievementResultVO,
  AchievementStatus,
  AchievementTargetType,
} from '@/apis/quality'
import {
  ACHIEVEMENT_AUDIT_STATUS_COLOR,
  ACHIEVEMENT_AUDIT_STATUS_LABEL,
  ACHIEVEMENT_STATUS_COLOR,
  ACHIEVEMENT_STATUS_LABEL,
  ACHIEVEMENT_TARGET_TYPE_LABEL,
  achievementApi,
  achievementAuditApi,
} from '@/apis/quality'
import type { BadgeTone } from '@/components/ui-guide/ui/types'
import type {
  AuditTimelineEvent,
  SignalMetric,
  TaskResultItem,
  WorkbenchStage,
  WorkbenchStageStatus,
} from '@/types/workbench'
import { message } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ClassSelector,
  CourseGoalSelector,
  CourseSelector,
  ProgramSelector,
  TrainingObjectiveSelector,
} from '@/components/quality/selectors'
import { UiButton, UiDataTable, UiDrawer, UiEmpty } from '@/components/ui-guide/ui'
import {
  AuditTimelineDrawer,
  SignalBand,
  StageRail,
  StageWorkbenchShell,
  TaskResultPanel,
} from '@/components/workbench'
import { useQualityStore } from '@/stores/modules/quality'
import { strictEnumLabel, strictEnumTone, strictEnumValue } from '@/utils/strict-enum'
import { promptModal } from './_helpers'

function targetTypeLabel(value: AchievementTargetType): string {
  return strictEnumLabel(ACHIEVEMENT_TARGET_TYPE_LABEL, value, '达成目标类型')
}

function auditStatusLabel(value: AchievementAuditStatus): string {
  return strictEnumLabel(ACHIEVEMENT_AUDIT_STATUS_LABEL, value, '达成审核状态')
}

function auditStatusColor(value: AchievementAuditStatus): string {
  return strictEnumTone(ACHIEVEMENT_AUDIT_STATUS_COLOR, value, '达成审核状态')
}

function achievementStatusLabel(value: AchievementStatus): string {
  return strictEnumLabel(ACHIEVEMENT_STATUS_LABEL, value, '达成状态')
}

function achievementStatusColor(value: AchievementStatus): string {
  return strictEnumTone(ACHIEVEMENT_STATUS_COLOR, value, '达成状态')
}

const router = useRouter()
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

const targetTypeOptions: Array<{ value: AchievementTargetType; label: string }> = [
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
const auditStatusOptions: Array<{ value: AchievementAuditStatus; label: string }> = [
  { value: 'DRAFT', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.DRAFT },
  { value: 'CALCULATED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.CALCULATED },
  { value: 'SUBMITTED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.SUBMITTED },
  { value: 'CONFIRMED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.CONFIRMED },
  { value: 'RETURNED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.RETURNED },
  { value: 'ARCHIVED', label: ACHIEVEMENT_AUDIT_STATUS_LABEL.ARCHIVED },
]
const achievementStatusOptions: Array<{ value: AchievementStatus; label: string }> = [
  { value: 'ACHIEVED', label: ACHIEVEMENT_STATUS_LABEL.ACHIEVED },
  { value: 'PARTIALLY_ACHIEVED', label: ACHIEVEMENT_STATUS_LABEL.PARTIALLY_ACHIEVED },
  { value: 'NOT_ACHIEVED', label: ACHIEVEMENT_STATUS_LABEL.NOT_ACHIEVED },
  { value: 'INSUFFICIENT_EVIDENCE', label: ACHIEVEMENT_STATUS_LABEL.INSUFFICIENT_EVIDENCE },
]

const trainingPlanRequired = computed(() => !qualityStore.currentTrainingPlanId)
const programRequired = computed(
  () => !qualityStore.currentProgramId && !triggerForm.programId.trim(),
)

async function loadList() {
  if (!qualityStore.currentTrainingPlanId) return
  loading.value = true
  try {
    const page = await achievementApi.page({
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
    total.value = Number(page.total)
  } finally {
    loading.value = false
  }
}

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
  { title: '达成值 / 阈值', key: 'achievementValue', width: 160 },
  { title: '样本（有效 / 总量）', key: 'sample', width: 120 },
  { title: '达成结论', dataIndex: 'achievementStatus', key: 'achievementStatus', width: 120 },
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

const auditTransitMap: Record<AchievementAuditStatus, AchievementAuditStatus[]> = {
  DRAFT: ['CALCULATED'],
  CALCULATED: ['DRAFT', 'SUBMITTED'],
  SUBMITTED: ['CONFIRMED', 'RETURNED'],
  CONFIRMED: ['ARCHIVED', 'RETURNED'],
  RETURNED: ['CALCULATED'],
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
  await achievementApi.updateAuditStatus({
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
  const order: Array<{ key: AchievementAuditStatus; title: string }> = [
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
    { key: 'returned', label: '已驳回', value: b.RETURNED, tone: b.RETURNED > 0 ? 'red' : 'gray' },
  ]
})

/* ========== 触发计算抽屉 ========== */

const triggerVisible = ref(false)

function openTriggerDrawer() {
  if (!qualityStore.currentTrainingPlanId) {
    message.warning('请先在顶部选择培养方案')
    return
  }
  triggerVisible.value = true
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
      operationLabel: `${auditStatusLabel(a.auditStatusFrom)} → ${auditStatusLabel(a.auditStatusTo)}`,
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
    .filter((r) => r.auditStatus === 'RETURNED' || r.achievementStatus === 'NOT_ACHIEVED')
    .slice(0, 5)
    .map((r) => ({
      id: r.id,
      title: `${targetTypeLabel(r.targetType)} · ${r.targetLabel}`,
      statusLabel: r.auditStatus === 'RETURNED' ? '已驳回' : '未达成',
      statusTone: abnormalTone,
      description:
        r.auditStatus === 'RETURNED'
          ? `审核驳回，需修正后重新提交`
          : `达成值 ${formatValue(r.finalValue)} < 阈值 ${formatValue(r.thresholdValue)}`,
      actions: [{ key: 'detail', label: '查看详情' }],
    }))
})

function handleResultAction(actionEvent: { item: TaskResultItem; action: { key: string } }) {
  const record = list.value.find((r) => r.id === actionEvent.item.id)
  if (record && actionEvent.action.key === 'detail') goDetail(record)
}

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
})
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <div class="achievement__context">
        <div class="achievement__context-info">
          <h2 class="achievement__title">达成度评价驾驶舱</h2>
        </div>
        <div class="achievement__context-actions">
          <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
            刷新
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :disabled="trainingPlanRequired"
            @click="openTriggerDrawer"
          >
            触发达成度计算
          </UiButton>
        </div>
      </div>
    </template>

    <UiEmpty
      v-if="trainingPlanRequired"
      description="尚未选择培养方案，请前往工作台首页选择培养方案后再回来"
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

      <section class="achievement__panel">
        <header class="achievement__panel-header">
          <h3 class="achievement__panel-title">达成度结果</h3>
          <div class="achievement__panel-actions">
            <a-select
              v-model:value="query.targetType"
              placeholder="目标类型"
              class="achievement__filter achievement__filter--lg"
              allow-clear
              :options="targetTypeOptions"
            />
            <a-select
              v-model:value="query.auditStatus"
              placeholder="审核状态"
              class="achievement__filter"
              allow-clear
              :options="auditStatusOptions"
            />
            <a-select
              v-model:value="query.achievementStatus"
              placeholder="达成结论"
              class="achievement__filter"
              allow-clear
              :options="achievementStatusOptions"
            />
            <CourseSelector
              :value="query.qualityCourseId || null"
              :training-plan-id="qualityStore.currentTrainingPlanId || null"
              placeholder="关联课程"
              class="achievement__filter achievement__filter--course"
              @change="handleQueryQualityCourseChange"
            />
            <ClassSelector
              :value="query.classId || null"
              placeholder="关联班级"
              class="achievement__filter achievement__filter--class"
              @change="handleQueryClassChange"
            />
            <a-input
              v-model:value="query.schoolYear"
              placeholder="学年"
              class="achievement__filter achievement__filter--xs"
            />
            <a-input
              v-model:value="query.semester"
              placeholder="学期"
              class="achievement__filter achievement__filter--xxs"
            />
            <UiButton variant="ghost" size="sm" @click="resetQuery"> 重置 </UiButton>
            <UiButton variant="outline" size="sm" :loading="loading" @click="loadList">
              查询
            </UiButton>
          </div>
        </header>

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
            </template>
            <template v-else-if="column.key === 'sample'">
              {{ record.sampleValid }} / {{ record.sampleTotal }}
            </template>
            <template v-else-if="column.key === 'achievementStatus'">
              <a-tag :color="achievementStatusColor(record.achievementStatus)">
                {{ achievementStatusLabel(record.achievementStatus) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'auditStatus'">
              <a-tag :color="auditStatusColor(record.auditStatus)">
                {{ auditStatusLabel(record.auditStatus) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space wrap>
                <UiButton variant="ghost" size="sm" @click="goDetail(record)"> 详情 </UiButton>
                <UiButton
                  v-for="to in nextStatuses(record.auditStatus)"
                  :key="to"
                  :variant="to === 'RETURNED' ? 'ghost' : 'outline'"
                  :status="to === 'RETURNED' ? 'danger' : 'normal'"
                  size="sm"
                  @click="handleTransit(record, to)"
                >
                  -> {{ auditStatusLabel(to) }}
                </UiButton>
                <UiButton variant="ghost" size="sm" @click="openAuditDrawer(record)">
                  审计
                </UiButton>
              </a-space>
            </template>
          </template>
        </UiDataTable>
      </section>
    </template>

    <UiDrawer v-model:open="triggerVisible" title="触发达成度计算" :width="720" :hide-footer="true">
      <a-alert
        type="info"
        show-icon
        message="确定性计算"
        description="计算口径以专业评价口径与培养方案为准；计算后结果进入草稿或已计算状态，需人工提交进入审核闭环。"
        class="achievement__editor-alert"
      />
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
      <h4 class="achievement__section-title">计算入口</h4>
      <div class="achievement__trigger-grid">
        <UiButton
          v-for="btn in triggerButtons"
          :key="btn.key"
          variant="outline"
          :loading="triggerLoading === btn.key"
          :disabled="trainingPlanRequired"
          @click="handleTrigger(btn.key, btn.handler)"
        >
          {{ btn.label }}
        </UiButton>
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
  &__context {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__context-info {
    flex: 1;
    min-width: 320px;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--dp-text-primary, #0f172a);
  }

  &__context-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

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

  &__value--success {
    color: var(--ant-color-success, #16a34a);
    font-weight: 600;
  }

  &__value--error {
    color: var(--ant-color-error, #dc2626);
    font-weight: 600;
  }

  &__threshold {
    color: var(--dp-text-muted, #64748b);
  }
}
</style>
