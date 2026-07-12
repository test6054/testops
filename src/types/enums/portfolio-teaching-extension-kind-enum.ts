import { strictEnumLabel } from '@/utils/strict-enum'

export enum PortfolioTeachingExtensionKindCode {
  TRAINING = 'TRAINING',
  OTHER = 'OTHER',
}

export const ALL_PORTFOLIO_TEACHING_EXTENSION_KIND_CODES: readonly PortfolioTeachingExtensionKindCode[] =
  [PortfolioTeachingExtensionKindCode.TRAINING, PortfolioTeachingExtensionKindCode.OTHER]

export const PortfolioTeachingExtensionKindDescription: Record<
  PortfolioTeachingExtensionKindCode,
  string
> = {
  [PortfolioTeachingExtensionKindCode.TRAINING]: '培训',
  [PortfolioTeachingExtensionKindCode.OTHER]: '其他活动',
}

export const PortfolioTeachingExtensionKindOptions =
  ALL_PORTFOLIO_TEACHING_EXTENSION_KIND_CODES.map((value) => ({
    value,
    label: strictEnumLabel(PortfolioTeachingExtensionKindDescription, value, '活动大类'),
  }))
