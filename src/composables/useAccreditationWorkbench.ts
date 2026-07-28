import type { AccreditationCockpitVO, AccreditationCycleVO } from '@/apis/quality/accreditation'
import type { SignalMetric, WorkbenchStage } from '@/types/workbench'
import dayjs from 'dayjs'
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AccreditationCyclePhaseCode,
  AccreditationCyclePhaseDescription,
  AccreditationCycleStatusCode,
} from '@/apis/quality/accreditation'
import { useAccreditationCockpit } from '@/composables/useAccreditationCockpit'
import { useQualityStore } from '@/stores/modules/quality'
import { AccreditationConclusionTypeCode } from '@/types/enums/accreditation-conclusion-type-enum'
import { SelfAssessmentReviewDecisionCode } from '@/types/enums/self-assessment-review-decision-enum'
import { SelfAssessmentReviewStatusCode } from '@/types/enums/self-assessment-review-status-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

const PHASE_ORDER: AccreditationCyclePhaseCode[] = [
  AccreditationCyclePhaseCode.SELF_EVALUATION,
  AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW,
  AccreditationCyclePhaseCode.ONSITE_VISIT,
  AccreditationCyclePhaseCode.CONCLUSION,
  AccreditationCyclePhaseCode.MAINTENANCE,
]

const PHASE_TAB: Record<AccreditationCyclePhaseCode, string> = {
  [AccreditationCyclePhaseCode.SELF_EVALUATION]: 'cycle',
  [AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW]: 'cycle',
  [AccreditationCyclePhaseCode.ONSITE_VISIT]: 'onsite',
  [AccreditationCyclePhaseCode.CONCLUSION]: 'cycle',
  [AccreditationCyclePhaseCode.MAINTENANCE]: 'cycle',
}

export function useAccreditationWorkbench() {
  const router = useRouter()
  const qualityStore = useQualityStore()
  const { cockpit, cockpitLoading, refresh: reloadCockpit } = useAccreditationCockpit()

  const programId = computed(() => qualityStore.currentProgramId)
  const trainingPlanId = computed(() => qualityStore.currentTrainingPlanId)
  const applicationCycle = computed(() => cockpit.value?.applicationCycle)
  const applicationCycleId = computed(() => applicationCycle.value?.id)
  const maintenanceCycle = computed(() => cockpit.value?.maintenanceCycle)
  const maintenanceCycleId = computed(() => maintenanceCycle.value?.id)
  const workflowCycle = computed(() => applicationCycle.value ?? maintenanceCycle.value)
  const hasScope = computed(() => !!programId.value && !!trainingPlanId.value)

  const annualCourseCoverageSummary = computed(() => {
    const coverages = cockpit.value?.annualCourseCoverages || []
    if (!coverages.length) return '无已到期年度'
    return coverages
      .map((item) => `${item.reportYear} ${item.coveredCourseCount}/${item.requiredCourseCount}`)
      .join('，')
  })

  const phaseStages = computed<WorkbenchStage[]>(() => {
    const cycle = workflowCycle.value
    if (!cycle) {
      return PHASE_ORDER.map((key) => ({
        key,
        title: strictEnumLabel(AccreditationCyclePhaseDescription, key, '认证周期阶段'),
        status: 'pending',
      }))
    }
    const currentIdx = PHASE_ORDER.indexOf(cycle.currentPhase)
    return PHASE_ORDER.map((key, idx) => {
      let status: WorkbenchStage['status'] = 'pending'
      if (idx < currentIdx) {
        status = 'completed'
      }
      else if (idx === currentIdx) {
        status
          = cycle.cycleStatus === AccreditationCycleStatusCode.CLOSED && key !== AccreditationCyclePhaseCode.MAINTENANCE
            ? 'warning'
            : 'active'
      }
      const stage: WorkbenchStage = {
        key,
        title: strictEnumLabel(AccreditationCyclePhaseDescription, key, '认证周期阶段'),
        status,
      }
      if (key === AccreditationCyclePhaseCode.SELF_EVALUATION && cycle.applicationRecordedTime) {
        stage.statusText = '已登记申请'
      }
      if (
        key === AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW
        && cycle.selfAssessmentSubmittedTime
      ) {
        stage.statusText = cycle.selfAssessmentReviewDecision || '审阅中'
      }
      if (key === AccreditationCyclePhaseCode.ONSITE_VISIT && cycle.onsiteVisitStart) {
        stage.dateRange = `${cycle.onsiteVisitStart} ~ ${cycle.onsiteVisitEnd || ''}`
      }
      if (key === AccreditationCyclePhaseCode.CONCLUSION && cycle.conclusionType) {
        stage.statusText = cycle.conclusionType
        stage.status = 'completed'
      }
      if (
        key === AccreditationCyclePhaseCode.MAINTENANCE
        && cycle.currentPhase === AccreditationCyclePhaseCode.MAINTENANCE
      ) {
        stage.status = 'active'
        if (cycle.conditionalDueDate) {
          stage.statusText = `改进截止 ${cycle.conditionalDueDate}`
        }
      }
      return stage
    })
  })

  const metrics = computed<SignalMetric[]>(() => {
    const c = cockpit.value
    if (!c) return []
    return [
      { key: 'annual', label: '保持期年度计划', value: String(c.annualPlanCount) },
      { key: 'coverage', label: '保持期年度覆盖率', value: `${c.annualCoverageRate}%` },
      { key: 'onsite', label: '申请期现场计划', value: String(c.onsiteVisitPlanCount) },
      {
        key: 'checklist',
        label: '申请期清单完成率',
        value: `${c.onsiteChecklistCompletionRate}%`,
      },
      {
        key: 'support',
        label: '支持条件档案',
        value: c.supportProfileConfirmed ? '已确认' : '未确认',
        tone: c.supportProfileConfirmed ? 'green' : 'orange',
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
        value: !c.annualReportMaterialsApplicable
          ? '不适用'
          : c.annualReportMaterialsReady ? '就绪' : '未就绪',
        helper: c.annualReportMaterialsApplicable
          ? `材料 ${c.annualReportMaterialCount}，课程覆盖 ${annualCourseCoverageSummary.value}`
          : '认证结论登记并进入保持改进阶段后适用',
        tone: !c.annualReportMaterialsApplicable
          ? 'gray'
          : c.annualReportMaterialsReady ? 'green' : 'orange',
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

  function tabForPhase(phase: AccreditationCyclePhaseCode) {
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
        accreditationCycleId: applicationCycleId.value || undefined,
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
    applicationCycle,
    applicationCycleId,
    maintenanceCycle,
    maintenanceCycleId,
    workflowCycle,
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
  return (
    row.cycleStatus === AccreditationCycleStatusCode.ACTIVE
    && row.currentPhase === AccreditationCyclePhaseCode.SELF_EVALUATION
    && row.cycleStatus === AccreditationCycleStatusCode.ACTIVE
  )
}

export function canSubmitSelfAssessment(row: AccreditationCycleVO) {
  if (row.cycleStatus !== AccreditationCycleStatusCode.ACTIVE) {
    return false
  }
  if (row.currentPhase === AccreditationCyclePhaseCode.SELF_EVALUATION) {
    return !!row.applicationRecordedTime
  }
  return (
    row.currentPhase === AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW
    && row.selfAssessmentReviewDecision === SelfAssessmentReviewDecisionCode.SUPPLEMENT_REQUIRED
  )
}

export function canReview(row: AccreditationCycleVO) {
  return (
    row.currentPhase === AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW
    && row.cycleStatus === AccreditationCycleStatusCode.ACTIVE
    && row.selfAssessmentReviewStatus !== SelfAssessmentReviewStatusCode.DECIDED
  )
}

export function canConclusion(row: AccreditationCycleVO) {
  return (
    row.cycleStatus === AccreditationCycleStatusCode.ACTIVE
    && row.currentPhase === AccreditationCyclePhaseCode.ONSITE_VISIT
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
  return (
    row.cycleStatus === AccreditationCycleStatusCode.ACTIVE
    && row.currentPhase !== AccreditationCyclePhaseCode.MAINTENANCE
  )
}

export function canDeleteCycle(row: AccreditationCycleVO) {
  return (
    row.currentPhase === AccreditationCyclePhaseCode.SELF_EVALUATION
    && !row.applicationRecordedTime
    && !row.selfAssessmentSubmittedTime
    && !row.conclusionRegisteredTime
  )
}

/** 与 SelfAssessmentSectionServiceImpl.assertEditableCycle 对齐：校内自评或补正阶段可编辑章节 */
export function canEditSelfAssessmentSection(cycle: AccreditationCycleVO | undefined) {
  if (!cycle || cycle.cycleStatus !== AccreditationCycleStatusCode.ACTIVE) {
    return false
  }
  if (cycle.currentPhase === AccreditationCyclePhaseCode.SELF_EVALUATION) {
    return true
  }
  return (
    cycle.currentPhase === AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW
    && cycle.selfAssessmentReviewDecision === SelfAssessmentReviewDecisionCode.SUPPLEMENT_REQUIRED
  )
}

/** 结论登记前、自评/审阅/现场考查阶段可维护认证原始资料证据 */
export function canMutateAccreditationEvidence(cycle: AccreditationCycleVO | undefined) {
  if (
    !cycle
    || cycle.cycleStatus !== AccreditationCycleStatusCode.ACTIVE
    || cycle.conclusionRegisteredTime
  ) {
    return false
  }
  return (
    cycle.currentPhase === AccreditationCyclePhaseCode.SELF_EVALUATION
    || cycle.currentPhase === AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW
    || cycle.currentPhase === AccreditationCyclePhaseCode.ONSITE_VISIT
  )
}

/** 与 ExpertPackageBuilder.buildProgramAccreditationPackage 导出前置条件对齐 */
export function canExportExpertPackage(
  cycle: AccreditationCycleVO | undefined,
  cockpit: AccreditationCockpitVO | undefined,
  evidenceCount: number,
) {
  if (
    !cycle
    || cycle.cycleStatus !== AccreditationCycleStatusCode.ACTIVE
    || !cycle.applicationRecordedTime
    || !cycle.selfAssessmentSubmittedTime
  ) {
    return false
  }
  const reviewPackageReady
    = cycle.currentPhase === AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW
      && cycle.selfAssessmentReviewStatus === SelfAssessmentReviewStatusCode.PENDING
      && !cycle.selfAssessmentReviewDecision
      && !cycle.selfAssessmentReviewTime
  const onsitePackageReady
    = cycle.currentPhase === AccreditationCyclePhaseCode.ONSITE_VISIT
      && cycle.selfAssessmentReviewStatus === SelfAssessmentReviewStatusCode.DECIDED
      && cycle.selfAssessmentReviewDecision === SelfAssessmentReviewDecisionCode.ACCEPTED
      && !!cycle.selfAssessmentReviewTime
  const maintenancePackageReady
    = cycle.currentPhase === AccreditationCyclePhaseCode.MAINTENANCE
      && !!cycle.conclusionRegisteredTime
      && (cycle.conclusionType === AccreditationConclusionTypeCode.FULL_6Y
        || cycle.conclusionType === AccreditationConclusionTypeCode.CONDITIONAL_6Y)
      && !!cycle.validFrom
      && !!cycle.validUntil
      && cycle.validUntil >= cycle.validFrom
      && !!cockpit?.annualReportMaterialsReady
  if (!reviewPackageReady && !onsitePackageReady && !maintenancePackageReady) {
    return false
  }
  if (!cockpit?.supportProfileConfirmed) {
    return false
  }
  if ((cockpit.activeFacultyProfileCount ?? 0) <= 0) {
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
  if (!cycle || cycle.cycleStatus !== AccreditationCycleStatusCode.ACTIVE) {
    blockers.push('缺少进行中的认证周期')
    return blockers
  }
  if (!cycle.applicationRecordedTime) {
    blockers.push('须先登记认证申请提交')
  }
  if (!cycle.selfAssessmentSubmittedTime) {
    blockers.push('须先正式提交自评报告')
  }
  if (cycle.currentPhase === AccreditationCyclePhaseCode.SELF_EVALUATION) {
    blockers.push('校内自评尚未提交，不可生成正式专家材料包')
  }
  else if (cycle.currentPhase === AccreditationCyclePhaseCode.SELF_ASSESSMENT_REVIEW) {
    if (cycle.selfAssessmentReviewStatus !== SelfAssessmentReviewStatusCode.PENDING) {
      blockers.push(
        cycle.selfAssessmentReviewDecision === SelfAssessmentReviewDecisionCode.SUPPLEMENT_REQUIRED
          ? '自评补正尚未重新提交，不可生成待审阅专家包'
          : '当前自评审阅状态不可生成待审阅专家包',
      )
    }
  }
  else if (cycle.currentPhase === AccreditationCyclePhaseCode.ONSITE_VISIT) {
    if (
      cycle.selfAssessmentReviewStatus !== SelfAssessmentReviewStatusCode.DECIDED
      || cycle.selfAssessmentReviewDecision !== SelfAssessmentReviewDecisionCode.ACCEPTED
      || !cycle.selfAssessmentReviewTime
    ) {
      blockers.push('现场考查专家包必须基于已受理的正式自评审阅结论')
    }
  }
  else if (cycle.currentPhase === AccreditationCyclePhaseCode.MAINTENANCE) {
    if (!cycle.conclusionRegisteredTime) {
      blockers.push('状态保持专家包缺少认证结论登记')
    }
    if (
      cycle.conclusionType !== AccreditationConclusionTypeCode.FULL_6Y
      && cycle.conclusionType !== AccreditationConclusionTypeCode.CONDITIONAL_6Y
    ) {
      blockers.push('状态保持专家包仅适用于通过或有条件通过的认证周期')
    }
    if (!cycle.validFrom || !cycle.validUntil) {
      blockers.push('认证有效期起止日期不完整')
    }
    else if (cycle.validUntil < cycle.validFrom) {
      blockers.push('认证有效期止早于有效期起')
    }
    if (!cockpit?.annualReportMaterialsReady) {
      blockers.push('年度持续改进报备材料尚未就绪')
    }
  }
  else {
    blockers.push('当前认证阶段不可生成专家材料包')
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
  return blockers
}

/** 年度评价计划须绑定当前有效认证周期；历史周期计划只能查看，不能借新周期继续改写 */
export function canMutateAnnualEvaluationPlan(
  maintenanceCycleId: string | undefined,
  boundCycleId?: string,
) {
  return !!maintenanceCycleId
    && (boundCycleId === undefined || boundCycleId === maintenanceCycleId)
}

/** 与 AnnualReportMaterialServiceImpl.assertAnnualReportCycleReady 对齐 */
export function canMutateAnnualReportMaterial(cycle: AccreditationCycleVO | undefined) {
  if (!cycle || cycle.cycleStatus !== AccreditationCycleStatusCode.ACTIVE) {
    return false
  }
  if (cycle.currentPhase !== AccreditationCyclePhaseCode.MAINTENANCE) {
    return false
  }
  if (!cycle.conclusionRegisteredTime) {
    return false
  }
  if (!cycle.validFrom || !cycle.validUntil
    || dayjs(cycle.validFrom).isAfter(dayjs(), 'day')
    || dayjs(cycle.validUntil).isBefore(dayjs(), 'day')) {
    return false
  }
  return cycle.conclusionType === AccreditationConclusionTypeCode.FULL_6Y || cycle.conclusionType === AccreditationConclusionTypeCode.CONDITIONAL_6Y
}

export function annualReportMaterialPhaseHint(cycle: AccreditationCycleVO | undefined) {
  if (!cycle) return '当前培养方案尚无有效的认证状态保持周期。'
  if (cycle.cycleStatus !== AccreditationCycleStatusCode.ACTIVE)
    return '认证周期未处于有效状态，不可维护年度报备材料。'
  if (cycle.currentPhase !== AccreditationCyclePhaseCode.MAINTENANCE) {
    return '年度报备材料仅允许在保持改进阶段登记；请先完成认证结论登记并进入保持改进。'
  }
  if (!cycle.conclusionRegisteredTime) return '请先登记认证结论后再维护年度报备材料。'
  if (!cycle.validFrom || !cycle.validUntil) return '认证状态保持周期有效期不完整，不可维护年度报备材料。'
  if (dayjs(cycle.validFrom).isAfter(dayjs(), 'day')) return '认证状态保持周期尚未生效，不可维护年度报备材料。'
  if (dayjs(cycle.validUntil).isBefore(dayjs(), 'day')) return '认证状态保持周期已超过有效期，不可继续维护年度报备材料。'
  if (cycle.conclusionType !== AccreditationConclusionTypeCode.FULL_6Y && cycle.conclusionType !== AccreditationConclusionTypeCode.CONDITIONAL_6Y) {
    return '仅通过或有条件通过的认证周期可登记年度报备材料。'
  }
  return ''
}
