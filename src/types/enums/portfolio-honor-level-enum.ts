import { strictEnumLabel } from '@/utils/strict-enum'

export enum PortfolioHonorLevelCode {
  NATIONAL = 'NATIONAL',
  PROVINCIAL = 'PROVINCIAL',
  MUNICIPAL = 'MUNICIPAL',
  SCHOOL = 'SCHOOL',
  OTHER = 'OTHER',
}

export const ALL_PORTFOLIO_HONOR_LEVEL_CODES: readonly PortfolioHonorLevelCode[] = [
  PortfolioHonorLevelCode.NATIONAL,
  PortfolioHonorLevelCode.PROVINCIAL,
  PortfolioHonorLevelCode.MUNICIPAL,
  PortfolioHonorLevelCode.SCHOOL,
  PortfolioHonorLevelCode.OTHER,
]

export const PortfolioHonorLevelDescription: Record<PortfolioHonorLevelCode, string> = {
  [PortfolioHonorLevelCode.NATIONAL]: '国家级',
  [PortfolioHonorLevelCode.PROVINCIAL]: '省级',
  [PortfolioHonorLevelCode.MUNICIPAL]: '市级',
  [PortfolioHonorLevelCode.SCHOOL]: '校级',
  [PortfolioHonorLevelCode.OTHER]: '其他',
}

export const PortfolioHonorLevelOptions = ALL_PORTFOLIO_HONOR_LEVEL_CODES.map((value) => ({
  value,
  label: strictEnumLabel(PortfolioHonorLevelDescription, value, '荣誉等级'),
}))

/** 校验职称条件中的荣誉级别编码，拒绝未知文本阈值。 */
export function isPortfolioHonorLevelCode(value: string): value is PortfolioHonorLevelCode {
  return ALL_PORTFOLIO_HONOR_LEVEL_CODES.map(String).includes(value)
}
