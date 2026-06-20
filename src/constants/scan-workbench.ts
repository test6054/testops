import type { RouteRecordName } from 'vue-router'

export type ScanWorkbenchTabKey = 'batches' | 'monitor' | 'ledger' | 'ocr'

/** 考试内扫描子页 Tab；设备维护在 L0「扫描设备」菜单，不在此列 */
export const SCAN_WORKBENCH_TAB_ITEMS: Array<{ key: ScanWorkbenchTabKey, label: string }> = [
  { key: 'batches', label: '录入与批次' },
  { key: 'monitor', label: '扫描监控' },
  { key: 'ledger', label: '影像账本' },
  { key: 'ocr', label: 'OCR 配置' },
]

export const SCAN_WORKBENCH_ROUTE_BY_TAB: Record<ScanWorkbenchTabKey, string> = {
  batches: 'TeacherExamWorkspaceScanBatches',
  monitor: 'TeacherExamWorkspaceScanMonitor',
  ledger: 'TeacherExamWorkspaceScanLedger',
  ocr: 'TeacherExamWorkspaceScanOcr',
}

export const SCAN_WORKBENCH_TAB_BY_ROUTE: Partial<Record<RouteRecordName, ScanWorkbenchTabKey>> = {
  TeacherExamWorkspaceScanBatches: 'batches',
  TeacherExamWorkspaceScanMonitor: 'monitor',
  TeacherExamWorkspaceScanLedger: 'ledger',
  TeacherExamWorkspaceScanOcr: 'ocr',
}

export function resolveScanWorkbenchTab(routeName: RouteRecordName | null | undefined): ScanWorkbenchTabKey {
  if (!routeName) {
    return 'batches'
  }
  return SCAN_WORKBENCH_TAB_BY_ROUTE[routeName] ?? 'batches'
}

/** 扫描子页嵌入考试工作台 layout 时不重复渲染 StageWorkbenchShell */
export function isScanWorkspaceEmbedded(
  route: Pick<{ meta: { layout?: unknown, workspacePhase?: unknown } }, 'meta'>,
): boolean {
  return route.meta.layout === 'ExamWorkspace' && route.meta.workspacePhase === 'scan'
}
