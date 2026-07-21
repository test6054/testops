import type { PortfolioIntakeReassignRouteQuery, PortfolioMaterialVO } from '@/apis/portfolio/types'
import {
  PortfolioArchiveRecordStatusCode,
  PortfolioMaterialIntakeStageCode,
  PortfolioMaterialStatusCode
} from '@/apis/portfolio/types'

/** 材料库行是否可进入 Intake 重分类：仅 ACTIVE + 已绑定 DRAFT/RETURNED 档案且异步处理未阻塞。 */
export function canReassignPortfolioMaterial(row: PortfolioMaterialVO): boolean {
  if (row.status !== PortfolioMaterialStatusCode.ACTIVE) {
    return false
  }
  if (!row.archiveRecordId) {
    return false
  }
  const recordStatus = row.recordStatus
  if (
    recordStatus !== PortfolioArchiveRecordStatusCode.DRAFT
    && recordStatus !== PortfolioArchiveRecordStatusCode.RETURNED
  ) {
    return false
  }
  return !isReassignBlockedByIntakeStage(row.intakeStage)
}

function isReassignBlockedByIntakeStage(stage: PortfolioMaterialIntakeStageCode | undefined): boolean {
  return (
    stage === PortfolioMaterialIntakeStageCode.OCR_PENDING
    || stage === PortfolioMaterialIntakeStageCode.AI_PROCESSING
  )
}

/** 材料库「重分类」行操作跳转 Intake 采集页 query。 */
export function buildPortfolioIntakeReassignQuery(
  row: PortfolioMaterialVO,
  teacherId: string,
): PortfolioIntakeReassignRouteQuery & Record<string, string> {
  const query: PortfolioIntakeReassignRouteQuery & Record<string, string> = {
    teacherId,
    materialId: row.id,
  }
  if (row.archiveRecordId) {
    query.recordId = row.archiveRecordId
  }
  if (row.categoryId) {
    query.categoryId = row.categoryId
  }
  return query
}

export function isEditableArchiveRecordStatus(
  status: PortfolioArchiveRecordStatusCode | undefined,
): boolean {
  return (
    status === PortfolioArchiveRecordStatusCode.DRAFT
    || status === PortfolioArchiveRecordStatusCode.RETURNED
  )
}

export function isActiveMaterialStatus(status: PortfolioMaterialStatusCode): boolean {
  return status === PortfolioMaterialStatusCode.ACTIVE
}

/** Intake 页分类选择器与已绑定档案分类不一致，须先走 reassignCategory。 */
export function hasPendingPortfolioCategoryChange(
  selectedCategoryId: string | undefined,
  boundCategoryId: string | undefined,
  archiveRecordId: string | undefined,
): boolean {
  if (!archiveRecordId || !selectedCategoryId || !boundCategoryId) {
    return false
  }
  return selectedCategoryId !== boundCategoryId
}
