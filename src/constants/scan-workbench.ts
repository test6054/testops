export type ScanWorkbenchTabKey = 'batches' | 'monitor' | 'ledger' | 'devices' | 'ocr'

export const SCAN_WORKBENCH_TAB_ITEMS: Array<{ key: ScanWorkbenchTabKey, label: string }> = [
  { key: 'batches', label: '录入与批次' },
  { key: 'monitor', label: '扫描监控' },
  { key: 'ledger', label: '影像账本' },
  { key: 'devices', label: '扫描设备' },
  { key: 'ocr', label: 'OCR 配置' },
]

export const SCAN_WORKBENCH_ROUTE_BY_TAB: Record<ScanWorkbenchTabKey, string> = {
  batches: 'TeacherExamWorkspaceScanBatches',
  monitor: 'TeacherExamWorkspaceScanMonitor',
  ledger: 'TeacherExamWorkspaceScanLedger',
  devices: 'TeacherExamWorkspaceScanDevices',
  ocr: 'TeacherExamWorkspaceScanOcr',
}

export const SCAN_WORKBENCH_TAB_BY_ROUTE: Partial<Record<string, ScanWorkbenchTabKey>> = {
  TeacherExamWorkspaceScanBatches: 'batches',
  TeacherExamWorkspaceScanMonitor: 'monitor',
  TeacherExamWorkspaceScanLedger: 'ledger',
  TeacherExamWorkspaceScanDevices: 'devices',
  TeacherExamWorkspaceScanOcr: 'ocr',
}

export function resolveScanWorkbenchTab(routeName: string | number | null | undefined): ScanWorkbenchTabKey {
  if (!routeName) {
    return 'batches'
  }
  return SCAN_WORKBENCH_TAB_BY_ROUTE[String(routeName)] ?? 'batches'
}
