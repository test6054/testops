import type { PortfolioCockpitAskResultPayload } from '@/apis/portfolio/types'

const COCKPIT_PAYLOAD_ERROR = '驾驶舱问数结果数据异常'

/** 解析 COCKPIT_ASK 正式结果 draftMarkdown JSON 载荷。 */
export function parsePortfolioCockpitAskPayload(
  draftMarkdown: string | undefined,
): PortfolioCockpitAskResultPayload {
  if (typeof draftMarkdown !== 'string' || !draftMarkdown.trim()) {
    throw new Error(COCKPIT_PAYLOAD_ERROR)
  }
  try {
    return JSON.parse(draftMarkdown)
  } catch {
    throw new Error(COCKPIT_PAYLOAD_ERROR)
  }
}
