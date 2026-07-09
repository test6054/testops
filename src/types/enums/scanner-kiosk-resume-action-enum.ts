/** 扫描一体机续处理动作 */
export enum ScannerKioskResumeActionCode {
  NONE = 'NONE',
  RESUME_SCANNING = 'RESUME_SCANNING',
  RETRY_PAGE_REGISTER = 'RETRY_PAGE_REGISTER',
  VIEW_REGISTER_EXCEPTION = 'VIEW_REGISTER_EXCEPTION',
}

export const ALL_SCANNER_KIOSK_RESUME_ACTION_CODES: readonly ScannerKioskResumeActionCode[] = [
  ScannerKioskResumeActionCode.NONE,
  ScannerKioskResumeActionCode.RESUME_SCANNING,
  ScannerKioskResumeActionCode.RETRY_PAGE_REGISTER,
  ScannerKioskResumeActionCode.VIEW_REGISTER_EXCEPTION,
]

export const ScannerKioskResumeActionDescription: Record<ScannerKioskResumeActionCode, string> = {
  [ScannerKioskResumeActionCode.NONE]: '无续处理',
  [ScannerKioskResumeActionCode.RESUME_SCANNING]: '继续扫描',
  [ScannerKioskResumeActionCode.RETRY_PAGE_REGISTER]: '重试页登记',
  [ScannerKioskResumeActionCode.VIEW_REGISTER_EXCEPTION]: '查看登记异常',
}
