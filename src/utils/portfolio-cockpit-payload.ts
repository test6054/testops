import type { PortfolioCockpitAskResultPayload } from '@/apis/portfolio/types'
import { assertUserFacing, throwUserFacing } from '@/utils/contract-guard'

const COCKPIT_PAYLOAD_ERROR = '驾驶舱问数结果数据异常，请刷新后重试'

/** 解析 COCKPIT_ASK 正式结果 draftMarkdown JSON 载荷。 */
export function parsePortfolioCockpitAskPayload(draftMarkdown: string | undefined): PortfolioCockpitAskResultPayload {
  if (typeof draftMarkdown !== 'string' || !draftMarkdown.trim()) {
    throwUserFacing(COCKPIT_PAYLOAD_ERROR)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(draftMarkdown)
  }
  catch {
    throwUserFacing(COCKPIT_PAYLOAD_ERROR)
  }
  const record = parsed as PortfolioCockpitAskResultPayload
  assertUserFacing(record && typeof record === 'object', COCKPIT_PAYLOAD_ERROR)
  if (record.teacherRows !== undefined) {
    assertUserFacing(Array.isArray(record.teacherRows), COCKPIT_PAYLOAD_ERROR)
  }
  return record
}
