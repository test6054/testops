import type { ArchiveVolumeExamGateResponse } from '@/apis/mark/archive-volume'
import type { FinalScoreRiskOverviewResponse } from '@/apis/mark/exam-score'

/**
 * 是否已达到「成绩已全部发布、可关考」口径。
 * 真源：riskOverview 全场 SQL 聚合 + 归档门禁绑定卷发布进度，禁止用分页名单推断。
 */
export function isExamScoresFullyPublished(
  overview: FinalScoreRiskOverviewResponse | null | undefined,
  gate: ArchiveVolumeExamGateResponse | null | undefined,
): boolean {
  if (!overview || overview.totalCandidateCount <= 0) {
    return false
  }
  const awaitingRelease =
    (overview.pendingCount ?? 0) +
    (overview.calculatedCount ?? 0) +
    (overview.confirmedCount ?? 0) +
    (overview.correctedCount ?? 0)
  if (awaitingRelease > 0) {
    return false
  }
  if ((overview.publishedCount ?? 0) <= 0) {
    return false
  }
  // 绑定卷发布进度须来自归档门禁；门禁未返回前不判为可关考，避免闪烁误展示。
  if (!gate) {
    return false
  }
  const gradablePaperCount = gate.gradablePaperCount ?? 0
  if (gradablePaperCount > 0 && gate.allScoresPublished !== true) {
    return false
  }
  return true
}
