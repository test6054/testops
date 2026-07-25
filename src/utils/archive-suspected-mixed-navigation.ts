import type { RouteLocationRaw } from 'vue-router'
import type { ArchiveDutyGrantResponse } from '@/apis/mark/archive-config'
import { listMyArchiveDutyGrants } from '@/apis/mark/archive-config'
import { pageSuspectedMixedScanBatches } from '@/apis/mark/archive-volume'
import { canViewArchiveDepartmentQueueFromGrants } from '@/utils/archive-department-queue-access'

/** 卷详情混扫复核 Tab，与后端 navigationSummary.tabKey 一致 */
export const ARCHIVE_VOLUME_SCAN_REVIEW_TAB = 'scan-review'

export const TEACHER_ARCHIVE_VOLUME_SUSPECTED_MIXED_SCAN_ROUTE = {
  name: 'TeacherArchiveVolumeSuspectedMixedScan',
} as const

export function buildArchiveVolumeScanReviewRoute(volumeId: string): RouteLocationRaw {
  return {
    name: 'TeacherArchiveVolumeDetail',
    params: { volumeId },
    query: { tab: ARCHIVE_VOLUME_SCAN_REVIEW_TAB },
  }
}

export function buildSuspectedMixedScanQueueRoute(): RouteLocationRaw {
  return TEACHER_ARCHIVE_VOLUME_SUSPECTED_MIXED_SCAN_ROUTE
}

interface FetchArchiveMixedPendingTotalOptions {
  /** 已加载的职责授权，避免重复请求 duty-grants/my */
  grants?: ArchiveDutyGrantResponse[]
}

/**
 * 归档域混扫待办总数（单一来源：suspected-mixed/page）。
 * 无院系归档可见范围时不请求分页接口，直接返回 0。
 */
export async function fetchArchiveSuspectedMixedPendingTotal(
  options?: FetchArchiveMixedPendingTotalOptions,
): Promise<number> {
  const grants = options?.grants ?? await listMyArchiveDutyGrants()
  if (canViewArchiveDepartmentQueueFromGrants(grants) !== true) {
    return 0
  }
  const page = await pageSuspectedMixedScanBatches(
    { pageNum: 1, pageSize: 1 },
    { showErrorMessage: false },
  )
  return page.total
}
