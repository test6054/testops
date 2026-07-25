import type { PortfolioAgeBandCode } from '@/types/enums/portfolio-age-band-enum'
import type { PortfolioMetricRecomputeStatusCode } from '@/types/enums/portfolio-metric-recompute-status-enum'
import type { PortfolioRetirementWindowCode } from '@/types/enums/portfolio-retirement-window-enum'
import type { PortfolioTenureBandCode } from '@/types/enums/portfolio-tenure-band-enum'
import {
  ALL_PORTFOLIO_AGE_BAND_CODES,
  PortfolioAgeBandDescription,
} from '@/types/enums/portfolio-age-band-enum'
import { PortfolioMetricRecomputeStatusDescription } from '@/types/enums/portfolio-metric-recompute-status-enum'
import {
  ALL_PORTFOLIO_RETIREMENT_WINDOW_CODES,
  PortfolioRetirementWindowDescription,
} from '@/types/enums/portfolio-retirement-window-enum'
import {
  ALL_PORTFOLIO_TENURE_BAND_CODES,
  PortfolioTenureBandDescription,
} from '@/types/enums/portfolio-tenure-band-enum'
import { strictEnumLabel } from '@/utils/strict-enum'

function isAgeBandCode(code: string): code is PortfolioAgeBandCode {
  return (ALL_PORTFOLIO_AGE_BAND_CODES as readonly string[]).includes(code)
}

function isTenureBandCode(code: string): code is PortfolioTenureBandCode {
  return (ALL_PORTFOLIO_TENURE_BAND_CODES as readonly string[]).includes(code)
}

function isRetirementWindowCode(code: string): code is PortfolioRetirementWindowCode {
  return (ALL_PORTFOLIO_RETIREMENT_WINDOW_CODES as readonly string[]).includes(code)
}

/** 校验年龄分档协议编码；非法值显式失败。 */
export function requirePortfolioAgeBandCode(code: string): PortfolioAgeBandCode {
  if (!isAgeBandCode(code)) {
    throw new Error(`枚举合同不同步：年龄分档=${code}`)
  }
  return code
}

/** 校验来校年限分档协议编码；非法值显式失败。 */
export function requirePortfolioTenureBandCode(code: string): PortfolioTenureBandCode {
  if (!isTenureBandCode(code)) {
    throw new Error(`枚举合同不同步：来校年限分档=${code}`)
  }
  return code
}

/** 校验退休窗口分档协议编码；非法值显式失败。 */
export function requirePortfolioRetirementWindowCode(code: string): PortfolioRetirementWindowCode {
  if (!isRetirementWindowCode(code)) {
    throw new Error(`枚举合同不同步：退休窗口分档=${code}`)
  }
  return code
}

/** 年龄分档展示文案，真源为前端枚举表（与后端 PortfolioAgeBandEnum 同步）。 */
export function portfolioAgeBandLabel(code: string): string {
  return strictEnumLabel(PortfolioAgeBandDescription, requirePortfolioAgeBandCode(code), '年龄分档')
}

/** 来校年限分档展示文案。 */
export function portfolioTenureBandLabel(code: string): string {
  return strictEnumLabel(PortfolioTenureBandDescription, requirePortfolioTenureBandCode(code), '来校年限分档')
}

/** 退休窗口分档展示文案。 */
export function portfolioRetirementWindowLabel(code: string): string {
  return strictEnumLabel(
    PortfolioRetirementWindowDescription,
    requirePortfolioRetirementWindowCode(code),
    '退休窗口分档',
  )
}

/** 指标快照重算状态展示文案。 */
export function portfolioMetricRecomputeStatusLabel(code: PortfolioMetricRecomputeStatusCode): string {
  return strictEnumLabel(PortfolioMetricRecomputeStatusDescription, code, '指标快照重算状态')
}
