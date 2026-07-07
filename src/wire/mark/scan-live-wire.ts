import type { ScanLiveEventVO } from '@/apis/mark/scan-live'

/**
 * 解析扫描实时 SSE wire 消息；不变量：SSE data 必须为 ScanLiveEventResponse JSON。
 */
export function readScanLiveEvent(data: string): ScanLiveEventVO {
  return JSON.parse(data)
}
