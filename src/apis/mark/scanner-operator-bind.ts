import http from '@/config/axios'

/** 一体机工位绑定专职扫描员请求 */
export interface ExamScannerDeviceBindOperatorRequest {
  scannerDeviceId: string
  scannerStationId: string
  /** 专职扫描员用户 ID（字符串语义） */
  boundOperatorUserId: string
}

/** 绑定结果视图 */
export interface ExamScannerDeviceBindOperatorResponse {
  scannerDeviceId: string
  scannerStationId: string
  boundOperatorUserId: string
}

/**
 * 绑定一体机工位专职扫描员（push_token 或教师 JWT）。
 * POST /api/mark/scanner/kiosk/bind-operator
 */
export function bindScannerOperator(
  request: ExamScannerDeviceBindOperatorRequest,
): Promise<ExamScannerDeviceBindOperatorResponse> {
  return http.post<ExamScannerDeviceBindOperatorResponse>(
    '/api/mark/scanner/kiosk/bind-operator',
    request,
  )
}
