import type {
  PortfolioArchiveRecordStatus,
  PortfolioMaterialIntakeStage,
  PortfolioMaterialStatus,
  PortfolioMaterialVO,
} from '@/apis/portfolio/types'

/** 材料库行是否可进入 Intake 重分类：仅 ACTIVE + 已绑定 DRAFT/RETURNED 档案且异步处理未阻塞。 */
export function canReassignPortfolioMaterial(row: PortfolioMaterialVO): boolean {
  if (row.status !== 'ACTIVE') {
    return false
  }
  if (!row.archiveRecordId) {
    return false
  }
  const recordStatus = row.recordStatus
  if (recordStatus !== 'DRAFT' && recordStatus !== 'RETURNED') {
    return false
  }
  if (isReassignBlockedByIntakeStage(row.intakeStage)) {
    return false
  }
  return true
}

function isReassignBlockedByIntakeStage(stage: PortfolioMaterialIntakeStage | undefined): boolean {
  return stage === 'OCR_PENDING' || stage === 'AI_PROCESSING'
}

export interface PortfolioIntakeReassignRouteQuery {
  teacherId: string
  materialId: string
  recordId?: string
  categoryId?: string
}

/** 材料库「重分类」行操作跳转 Intake 采集页 query。 */
export function buildPortfolioIntakeReassignQuery(
  row: PortfolioMaterialVO,
  teacherId: string,
): PortfolioIntakeReassignRouteQuery {
  const query: PortfolioIntakeReassignRouteQuery = {
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
  status: PortfolioArchiveRecordStatus | undefined,
): boolean {
  return status === 'DRAFT' || status === 'RETURNED'
}

export function isActiveMaterialStatus(status: PortfolioMaterialStatus | undefined): boolean {
  return status === 'ACTIVE'
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
