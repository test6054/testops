/** 字段映射转换类型 - PortfolioFieldMappingTransformTypeEnum */
export enum PortfolioFieldMappingTransformTypeCode {
  NONE = 'NONE',
  TRIM = 'TRIM',
  UPPER = 'UPPER',
  LOWER = 'LOWER',
  SUBSTRING = 'SUBSTRING',
  PREFIX_SUFFIX = 'PREFIX_SUFFIX',
  LOOKUP_COURSE_CODE = 'LOOKUP_COURSE_CODE',
}

export const PortfolioFieldMappingTransformTypeDescription: Record<
  PortfolioFieldMappingTransformTypeCode,
  string
> = {
  [PortfolioFieldMappingTransformTypeCode.NONE]: '无转换',
  [PortfolioFieldMappingTransformTypeCode.TRIM]: '去空白',
  [PortfolioFieldMappingTransformTypeCode.UPPER]: '大写',
  [PortfolioFieldMappingTransformTypeCode.LOWER]: '小写',
  [PortfolioFieldMappingTransformTypeCode.SUBSTRING]: '截取',
  [PortfolioFieldMappingTransformTypeCode.PREFIX_SUFFIX]: '前后缀',
  [PortfolioFieldMappingTransformTypeCode.LOOKUP_COURSE_CODE]: '课程编码归一化',
}

export const PortfolioFieldMappingTransformTypeOptions = [
  PortfolioFieldMappingTransformTypeCode.NONE,
  PortfolioFieldMappingTransformTypeCode.TRIM,
  PortfolioFieldMappingTransformTypeCode.UPPER,
  PortfolioFieldMappingTransformTypeCode.LOWER,
  PortfolioFieldMappingTransformTypeCode.SUBSTRING,
  PortfolioFieldMappingTransformTypeCode.PREFIX_SUFFIX,
  PortfolioFieldMappingTransformTypeCode.LOOKUP_COURSE_CODE,
].map(value => ({
  value,
  label: PortfolioFieldMappingTransformTypeDescription[value],
}))
