import type {
  AccreditationCockpitVO,
  AccreditationCyclePhase,
  AccreditationCycleVO,
} from '@/apis/quality'
import type { WorkbenchStage } from '@/types/workbench'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ACCREDITATION_CYCLE_PHASE_LABEL, accreditationApi } from '@/apis/quality'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError } from '@/utils/error-handler'
import { strictEnumLabel } from '@/utils/strict-enum'

const PHASE_ORDER: AccreditationCyclePhase[] = [
  'SELF_EVALUATION',
  'SELF_ASSESSMENT_REVIEW',
  'ONSITE_VISIT',
  'CONCLUSION',
  'MAINTENANCE',
]

const PHASE_TAB: Record<AccreditationCyclePhase, string> = {
  SELF_EVALUATION: 'cycle',
  SELF_ASSESSMENT_REVIEW: 'cycle',
  ONSITE_VISIT: 'onsite',
  CONCLUSION: 'cycle',
  MAINTENANCE: 'cycle',
}

export function useAccreditationWorkbench() {
  const router = useRouter()
  const qualityStore = useQualityStore()
  const cockpit = ref<AccreditationCockpitVO>()
  const cockpitLoading = ref(false)

  const programId = computed(() => qualityStore.currentProgramId)
  const trainingPlanId = computed(() => qualityStore.currentTrainingPlanId)
  const activeCycle = computed(() => cockpit.value?.activeCycle)
  const activeCycleId = computed(() => activeCycle.value?.id)
  const hasScope = computed(() => !!programId.value && !!trainingPlanId.value)

  const phaseStages = computed<WorkbenchStage[]>(() => {
    const cycle = activeCycle.value
    if (!cycle) {
      return PHASE_ORDER.map((key) => ({
        key,
        title: strictEnumLabel(ACCREDITATION_CYCLE_PHASE_LABEL, key, '认证周期阶段'),
        status: 'pending' as const,
      }))
    }
    const currentIdx = PHASE_ORDER.indexOf(cycle.currentPhase)
    return PHASE_ORDER.map((key, idx) => {
      let status: WorkbenchStage['status'] = 'pending'
      if (idx < currentIdx) status = 'completed'
      else if (idx === currentIdx)
        status = cycle.cycleStatus === 'CLOSED' && key !== 'MAINTENANCE' ? 'warning' : 'active'
      const stage: WorkbenchStage = {
        key,
        title: strictEnumLabel(ACCREDITATION_CYCLE_PHASE_LABEL, key, '认证周期阶段'),
        status,
      }
      if (key === 'SELF_EVALUATION' && cycle.applicationRecordedAt) {
        stage.statusText = '已登记申请'
      }
      if (key === 'SELF_ASSESSMENT_REVIEW' && cycle.selfAssessmentSubmittedAt) {
        stage.statusText = cycle.selfAssessmentReviewDecision || '审阅中'
      }
      if (key === 'ONSITE_VISIT' && cycle.onsiteVisitStart) {
        stage.dateRange = `${cycle.onsiteVisitStart} ~ ${cycle.onsiteVisitEnd || ''}`
      }
      if (key === 'CONCLUSION' && cycle.conclusionType) {
        stage.statusText = cycle.conclusionType
        stage.status = 'completed'
      }
      if (key === 'MAINTENANCE' && cycle.currentPhase === 'MAINTENANCE') {
        stage.status = 'active'
        if (cycle.conditionalDueDate) {
          stage.statusText = `改进截止 ${cycle.conditionalDueDate}`
        }
      }
      return stage
    })
  })

  const metrics = computed(() => {
    const c = cockpit.value
    if (!c) return []
    return [
      { key: 'annual', label: '年度评价计划', value: String(c.annualPlanCount) },
      { key: 'coverage', label: '年度覆盖率', value: `${c.annualCoverageRate ?? 0}%` },
      { key: 'onsite', label: '现场考查计划', value: String(c.onsiteVisitPlanCount) },
      {
        key: 'checklist',
        label: '考查清单完成率',
        value: `${c.onsiteChecklistCompletionRate ?? 0}%`,
      },
      { key: 'support', label: '师资档案', value: c.supportProfileConfirmed ? '已确认' : '未确认' },
    ]
  })

  async function reloadCockpit() {
    if (!trainingPlanId.value) {
      cockpit.value = undefined
      return
    }
    cockpitLoading.value = true
    try {
      cockpit.value = await accreditationApi.cockpit(trainingPlanId.value)
    } catch (e) {
      showUserError(e)
    } finally {
      cockpitLoading.value = false
    }
  }

  function handleProgramChange(id: string | null) {
    if (id) qualityStore.setProgram(id)
    else qualityStore.reset()
  }

  function handleTrainingPlanChange(id: string | null) {
    if (id) {
      qualityStore.setTrainingPlan(id)
    } else {
      qualityStore.currentTrainingPlanId = ''
      qualityStore.requirementOptions = []
      qualityStore.qualityCourseOptions = []
    }
  }

  function tabForPhase(phase: AccreditationCyclePhase) {
    return PHASE_TAB[phase] || 'cycle'
  }

  function goReport() {
    router.push({ name: 'QualityReport' })
  }

  function goAiProgramReport() {
    router.push({
      name: 'QualityAiTask',
      query: {
        taskType: 'PROGRAM_REPORT_GENERATE',
        trainingPlanId: trainingPlanId.value || undefined,
        programId: programId.value || undefined,
        openSubmit: '1',
      },
    })
  }

  function goArchive() {
    router.push({ name: 'QualityArchive' })
  }

  function goCourseMatrix() {
    router.push({ name: 'QualityCourseMatrix' })
  }

  function goImprovement() {
    router.push({ name: 'QualityImprovementWorkbench' })
  }

  watch(trainingPlanId, reloadCockpit)

  return {
    qualityStore,
    cockpit,
    cockpitLoading,
    programId,
    trainingPlanId,
    activeCycle,
    activeCycleId,
    hasScope,
    phaseStages,
    metrics,
    reloadCockpit,
    handleProgramChange,
    handleTrainingPlanChange,
    tabForPhase,
    goReport,
    goAiProgramReport,
    goArchive,
    goCourseMatrix,
    goImprovement,
  }
}

export function canRecordApplication(row: AccreditationCycleVO) {
  return row.currentPhase === 'SELF_EVALUATION' && row.cycleStatus === 'ACTIVE'
}

export function canSubmitSelfAssessment(row: AccreditationCycleVO) {
  return (
    row.cycleStatus === 'ACTIVE'
    && (row.currentPhase === 'SELF_EVALUATION'
      || (row.currentPhase === 'SELF_ASSESSMENT_REVIEW'
        && row.selfAssessmentReviewDecision === 'SUPPLEMENT_REQUIRED'))
  )
}

export function canReview(row: AccreditationCycleVO) {
  return row.currentPhase === 'SELF_ASSESSMENT_REVIEW' && row.cycleStatus === 'ACTIVE'
}

export function canConclusion(row: AccreditationCycleVO) {
  return (
    row.cycleStatus === 'ACTIVE'
    && (row.currentPhase === 'ONSITE_VISIT' || row.currentPhase === 'CONCLUSION')
  )
}

export function canEditCycle(row: AccreditationCycleVO) {
  return row.cycleStatus === 'ACTIVE' && row.currentPhase !== 'MAINTENANCE'
}

export function canDeleteCycle(row: AccreditationCycleVO) {
  return row.currentPhase === 'SELF_EVALUATION' && !row.conclusionRegisteredAt
}
