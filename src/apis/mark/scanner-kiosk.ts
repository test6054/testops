import http from '@/config/axios'

export type ScannerKioskScanMode = 'DIRECT' | 'SUPPLEMENT' | 'ARCHIVE'

export interface ExamScannerKioskContextRequest {
  examId: string
  scannerDeviceId?: string
  scannerStationId?: string
  scanMode: ScannerKioskScanMode
}

export interface ExamScannerKioskExamVO {
  examId: string
  examName: string
  courseName?: string
  examNo: string
  status: string
  statusMessage: string
  examStartTime?: string
  examEndTime?: string
}

export interface ExamScannerKioskDeviceVO {
  scannerDeviceId: string
  scannerStationId: string
  scannerStationName?: string
  deviceName: string
  status: string
  onlineStatus: string
  scannerConnected: boolean
  pendingJobCount: number
  pendingUploadPageCount: number
  diagnosticStatus: string
  diagnosticMessage: string
  lastHeartbeatAt?: string
}

export interface ExamScannerKioskPolicyVO {
  dpi: number
  colorMode: 'COLOR' | 'GRAY' | 'LINEART'
  duplexMode: 'SIMPLEX' | 'DUPLEX'
  blankPageDetectionEnabled: boolean
  kioskLockEnabled: boolean
}

export interface ExamScannerKioskBatchVO {
  scanBatchId: string
  batchNo: string
  batchExternalNo: string
  scannerDeviceId: string
  scanMode: ScannerKioskScanMode
  targetPageNo?: number
  supplementReason?: string
  pageCount: number
  status: string
  statusMessage: string
  diagnostic?: string
  scanStartTime?: string
  scanEndTime?: string
}

export interface ExamScannerKioskContextVO {
  exam: ExamScannerKioskExamVO
  classIds: string[]
  device?: ExamScannerKioskDeviceVO
  policy?: ExamScannerKioskPolicyVO
  latestBatch?: ExamScannerKioskBatchVO
  scannedPages: number
  paperInstances: number
  boundPaperInstances: number
  scanBatchCount: number
  attentionCount: number
  scanMode: ScannerKioskScanMode
  canStartScan: boolean
  canStartSupplementScan: boolean
  blockReason?: string
  supplementBlockReason?: string
}

export function getScannerKioskContext(payload: ExamScannerKioskContextRequest) {
  return http.post<ExamScannerKioskContextVO>('/api/mark/scanner/kiosk/context', payload)
}
