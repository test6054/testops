import type {
  AccreditationCockpitVO,
  AccreditationCyclePhase,
  AccreditationCycleVO,
} from '@/apis/quality/accreditation'
import type { WorkbenchStage } from '@/types/workbench'
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ACCREDITATION_CYCLE_PHASE_LABEL } from '@/apis/quality/accreditation'
import { useAccreditationCockpit } from '@/composables/useAccreditationCockpit'
import { useQualityStore } from '@/stores/modules/quality'
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
  const { cockpit, cockpitLoading, refresh: reloadCockpit } = useAccreditationCockpit()

  const programId = computed(() => qualityStore.currentProgramId)
  const trainingPlanId = computed(() => qualityStore.currentTrainingPlanId)
  const activeCycle = computed(() => cockpit.value?.activeCycle)
  const activeCycleId = computed(() => activeCycle.value?.id)
  const hasScope = computed(() => !!programId.value && !!trainingPlanId.value)

  const annualCourseCoverageSummary = computed(() => {
    const coverages = cockpit.value?.annualCourseCoverages || []
    if (!coverages.length) return '无已到期年度'
    return coverages
      .map((item) => `${item.reportYear} ${item.coveredCourseCount}/${item.requiredCourseCount}`)
      .join('，')
  })

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
      if (key === 'SELF_EVALUATION' && cycle.applicationRecordedTime) {
        stage.statusText = '已登记申请'
      }
      if (key === 'SELF_ASSESSMENT_REVIEW' && cycle.selfAssessmentSubmittedTime) {
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
      {
        key: 'support',
        label: '支持条件档案',
        value: c.supportProfileConfirmed ? '已确认' : '未确认',
        tone: c.supportProfileConfirmed ? ('green' as const) : ('orange' as const),
      },
      {
        key: 'faculty-profile',
        label: '教师档案',
        value: `${c.activeFacultyProfileCount}/${c.facultyProfileCount}`,
        helper: '启用/总数',
      },
      {
        key: 'annual-material',
        label: '年度报备材料',
        value: c.annualReportMaterialsReady ? '就绪' : '未就绪',
        helper: `材料 ${c.annualReportMaterialCount}，课程覆盖 ${annualCourseCoverageSummary.value}`,
        tone: c.annualReportMaterialsReady ? ('green' as const) : ('orange' as const),
      },
    ]
  })

  watch(trainingPlanId, () => {
    void reloadCockpit()
  })

  function handleProgramChange(id: string | null) {
    if (id) qualityStore.setProgram(id)
    else qualityStore.reset()
  }

  function handleTrainingPlanChange(id: string | null) {
    if (id) {
      qualityStore.setTrainingPlan(id)
    } else {
      qualityStore.setTrainingPlan('')
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
  if (row.cycleStatus !== 'ACTIVE') {
    return false
  }
  if (row.currentPhase === 'SELF_EVALUATION') {
    return !!row.applicationRecordedTime
  }
  return (
    row.currentPhase === 'SELF_ASSESSMENT_REVIEW'
    && row.selfAssessmentReviewDecision === 'SUPPLEMENT_REQUIRED'
  )
}

export function canReview(row: AccreditationCycleVO) {
  return (
    row.currentPhase === 'SELF_ASSESSMENT_REVIEW'
    && row.cycleStatus === 'ACTIVE'
    && row.selfAssessmentReviewStatus !== 'DECIDED'
  )
}

export function canConclusion(row: AccreditationCycleVO) {
  return (
    row.cycleStatus === 'ACTIVE'
    && row.currentPhase === 'ONSITE_VISIT'
    && !row.conclusionRegisteredTime
  )
}

export function canRegisterConclusion(
  cycle: AccreditationCycleVO | undefined,
  cockpit: AccreditationCockpitVO | undefined,
) {
  if (!cycle || !canConclusion(cycle)) {
    return false
  }
  return cockpit?.conclusionRegistrationReady === true
}

export function canEditCycle(row: AccreditationCycleVO) {
  return row.cycleStatus === 'ACTIVE' && row.currentPhase !== 'MAINTENANCE'
}

export function canDeleteCycle(row: AccreditationCycleVO) {
  return row.currentPhase === 'SELF_EVALUATION' && !row.conclusionRegisteredTime
}

/** 与 SelfAssessmentSectionServiceImpl.assertEditableCycle 对齐：校内自评或补正阶段可编辑章节 */
export function canEditSelfAssessmentSection(cycle: AccreditationCycleVO | undefined) {
  if (!cycle || cycle.cycleStatus !== 'ACTIVE') {
    return false
  }
  if (cycle.currentPhase === 'SELF_EVALUATION') {
    return true
  }
  return (
    cycle.currentPhase === 'SELF_ASSESSMENT_REVIEW'
    && cycle.selfAssessmentReviewDecision === 'SUPPLEMENT_REQUIRED'
  )
}

/** 结论登记前、自评/审阅/现场考查阶段可维护认证原始资料证据 */
export function canMutateAccreditationEvidence(cycle: AccreditationCycleVO | undefined) {
  if (!cycle || cycle.cycleStatus !== 'ACTIVE' || cycle.conclusionRegisteredTime) {
    return false
  }
  return (
    cycle.currentPhase === 'SELF_EVALUATION'
    || cycle.currentPhase === 'SELF_ASSESSMENT_REVIEW'
    || cycle.currentPhase === 'ONSITE_VISIT'
  )
}

/** 与 ExpertPackageBuilder.buildProgramAccreditationPackage 导出前置条件对齐 */
export function canExportExpertPackage(
  cycle: AccreditationCycleVO | undefined,
  cockpit: AccreditationCockpitVO | undefined,
  evidenceCount: number,
) {
  if (!cycle || cycle.cycleStatus !== 'ACTIVE' || !cycle.conclusionRegisteredTime) {
    return false
  }
  if (!cycle.validFrom || !cycle.validUntil) {
    return false
  }
  if (!cockpit?.supportProfileConfirmed) {
    return false
  }
  if ((cockpit.activeFacultyProfileCount ?? 0) <= 0) {
    return false
  }
  if (!cockpit.annualReportMaterialsReady) {
    return false
  }
  return evidenceCount > 0
}

export function expertPackageExportBlockers(
  cycle: AccreditationCycleVO | undefined,
  cockpit: AccreditationCockpitVO | undefined,
  evidenceCount: number,
): string[] {
  const blockers: string[] = []
  if (!cycle || cycle.cycleStatus !== 'ACTIVE') {
    blockers.push('缺少进行中的认证周期')
    return blockers
  }
  if (!cycle.conclusionRegisteredTime) {
    blockers.push('须先完成认证结论登记后再导出完整专家材料包')
  }
  if (!cycle.validFrom || !cycle.validUntil) {
    blockers.push('认证有效期起止日期不完整')
  }
  if (!cockpit?.supportProfileConfirmed) {
    blockers.push('师资与支持条件档案尚未确认')
  }
  if ((cockpit?.activeFacultyProfileCount ?? 0) <= 0) {
    blockers.push('缺少启用状态的师资队伍档案')
  }
  if (evidenceCount <= 0) {
    blockers.push('缺少已登记的认证原始资料证据')
  }
  if (!cockpit?.annualReportMaterialsReady) {
    blockers.push('年度持续改进报备材料尚未就绪')
  }
  return blockers
}

/** 年度评价计划须绑定当前有效认证周期 */
export function canMutateAnnualEvaluationPlan(activeCycleId: string | undefined) {
  return !!activeCycleId
}

/** 与 AnnualReportMaterialServiceImpl.assertAnnualReportCycleReady 对齐 */
export function canMutateAnnualReportMaterial(cycle: AccreditationCycleVO | undefined) {
  if (!cycle || cycle.cycleStatus !== 'ACTIVE') {
    return false
  }
  if (cycle.currentPhase !== 'MAINTENANCE') {
    return false
  }
  if (!cycle.conclusionRegisteredTime) {
    return false
  }
  return cycle.conclusionType === 'FULL_6Y' || cycle.conclusionType === 'CONDITIONAL_6Y'
}

export function annualReportMaterialPhaseHint(cycle: AccreditationCycleVO | undefined) {
  if (!cycle) return '请先创建认证周期。'
  if (cycle.cycleStatus !== 'ACTIVE') return '认证周期未处于有效状态，不可维护年度报备材料。'
  if (cycle.currentPhase !== 'MAINTENANCE') {
    return '年度报备材料仅允许在保持改进阶段登记；请先完成认证结论登记并进入保持改进。'
  }
  if (!cycle.conclusionRegisteredTime) return '请先登记认证结论后再维护年度报备材料。'
  if (cycle.conclusionType !== 'FULL_6Y' && cycle.conclusionType !== 'CONDITIONAL_6Y') {
    return '仅通过或有条件通过的认证周期可登记年度报备材料。'
  }
  return ''
}
