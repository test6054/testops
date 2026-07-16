/**
 * 质量评价路由 meta 契约真源（与 quality.ts 叶子路由同步）。
 */
import type { QualityGate, QualityScopeProfile } from '@/constants/quality-scope-profile'
import { PLAN_DIMENSION_PROFILES } from '@/constants/quality-scope-profile'

export interface QualityRouteContractEntry {
  name: string
  scopeProfile: QualityScopeProfile
  qualityGate?: QualityGate
}

/** 质量评价叶子路由 scopeProfile / qualityGate 契约表 */
export const QUALITY_ROUTE_CONTRACT: QualityRouteContractEntry[] = [
  { name: 'QualityDashboard', scopeProfile: 'plan-period' },
  { name: 'QualityAccreditationCockpit', scopeProfile: 'accreditation' },
  { name: 'QualityRationalityAudit', scopeProfile: 'plan-period' },
  { name: 'QualityTrainingPlanWorkbench', scopeProfile: 'none' },
  { name: 'QualityTrainingPlanReviewQueue', scopeProfile: 'none' },
  { name: 'QualityCourseMatrix', scopeProfile: 'plan' },
  { name: 'QualityIngestHub', scopeProfile: 'plan-period', qualityGate: 'plan-confirmed' },
  { name: 'QualityIngestScoreBatch', scopeProfile: 'plan-course', qualityGate: 'plan-confirmed' },
  { name: 'QualityIngestScoreRecord', scopeProfile: 'plan-course', qualityGate: 'plan-confirmed' },
  { name: 'QualityIngestProcessEvaluation', scopeProfile: 'plan-course', qualityGate: 'plan-confirmed' },
  { name: 'QualityIngestIndirectEvaluation', scopeProfile: 'plan-course', qualityGate: 'plan-confirmed' },
  { name: 'QualityIngestExternalPull', scopeProfile: 'plan-course', qualityGate: 'plan-confirmed' },
  { name: 'QualityAchievement', scopeProfile: 'plan-period', qualityGate: 'plan-confirmed' },
  { name: 'QualityAchievementDetail', scopeProfile: 'plan-period', qualityGate: 'plan-confirmed' },
  { name: 'QualityImprovementWorkbench', scopeProfile: 'plan', qualityGate: 'plan-confirmed' },
  { name: 'QualityReport', scopeProfile: 'plan-period', qualityGate: 'plan-confirmed' },
  { name: 'QualityArchive', scopeProfile: 'accreditation' },
  { name: 'QualityAiTask', scopeProfile: 'plan-period' },
  { name: 'QualityAccreditationStandard', scopeProfile: 'none' },
  { name: 'QualityProfessionAlgorithmTemplate', scopeProfile: 'none' },
  { name: 'QualityScaleConversionRule', scopeProfile: 'none' },
  { name: 'QualityAiModelProfile', scopeProfile: 'none' },
  { name: 'QualityAiMaskMapping', scopeProfile: 'none' },
  { name: 'QualityProgramEvaluationProfile', scopeProfile: 'accreditation' },
  { name: 'QualityProfessionAlgorithmProfile', scopeProfile: 'accreditation' },
  { name: 'QualityEvaluationWorkgroup', scopeProfile: 'accreditation' },
]

export function assertQualityGateScopeProfile(entry: QualityRouteContractEntry): void {
  if (entry.qualityGate !== 'plan-confirmed') {
    return
  }
  if (!PLAN_DIMENSION_PROFILES.includes(entry.scopeProfile)) {
    throw new Error(
      `路由 ${entry.name} 的 qualityGate=plan-confirmed 要求 scopeProfile 含 plan 维度，当前为 ${entry.scopeProfile}`,
    )
  }
}
