import type { PortfolioArchiveFieldSchema } from '@/apis/portfolio/types'
import { PortfolioArchiveFieldTypeCode } from '@/types/enums/portfolio-archive-field-type-enum'
import { SemesterCode } from '@/types/enums/semester-enum'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/

function fieldDisplayName(field: PortfolioArchiveFieldSchema): string {
  return field.fieldLabel?.trim() || field.fieldCode?.trim() || '字段'
}

function parseNumber(value: string): number | null {
  if (!NUMBER_PATTERN.test(value)) {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** 按已发布模板 schema 校验单字段值；通过返回 null，失败返回中文提示。 */
export function validatePortfolioArchiveFieldValue(
  field: PortfolioArchiveFieldSchema,
  rawValue: string | undefined,
): string | null {
  const value = rawValue?.trim() ?? ''
  const label = fieldDisplayName(field)
  const required = field.required === true

  if (required && !value) {
    return `请填写${label}`
  }
  if (!value) {
    return null
  }

  const fieldType = field.fieldType ?? PortfolioArchiveFieldTypeCode.TEXT
  if (fieldType === PortfolioArchiveFieldTypeCode.NUMBER) {
    const parsed = parseNumber(value)
    if (parsed === null) {
      return `${label}须为有效数值`
    }
    if (field.minValue?.trim()) {
      const min = parseNumber(field.minValue.trim())
      if (min !== null && parsed < min) {
        return `${label}不能小于${field.minValue}`
      }
    }
    if (field.maxValue?.trim()) {
      const max = parseNumber(field.maxValue.trim())
      if (max !== null && parsed > max) {
        return `${label}不能大于${field.maxValue}`
      }
    }
    return null
  }

  if (fieldType === PortfolioArchiveFieldTypeCode.DATE) {
    const patternHint = field.formatPattern?.trim() || 'yyyy-MM-dd'
    if (patternHint === 'yyyy-MM-dd' || patternHint === 'YYYY-MM-DD') {
      if (!DATE_PATTERN.test(value)) {
        return `${label}须为 ${patternHint} 格式日期`
      }
      const [yearText, monthText, dayText] = value.split('-')
      const year = Number(yearText)
      const month = Number(monthText)
      const day = Number(dayText)
      const date = new Date(year, month - 1, day)
      if (
        date.getFullYear() !== year
        || date.getMonth() !== month - 1
        || date.getDate() !== day
      ) {
        return `${label}日期无效`
      }
      return null
    }
    if (value.length < 4) {
      return `${label}须符合日期格式 ${patternHint}`
    }
    return null
  }

  if (fieldType === PortfolioArchiveFieldTypeCode.SEMESTER) {
    if (value !== SemesterCode.AUTUMN && value !== SemesterCode.SPRING) {
      return `${label}须选择有效学期`
    }
    return null
  }

  if (fieldType === PortfolioArchiveFieldTypeCode.ENUM) {
    const options = field.enumOptions ?? []
    if (!options.length) {
      return `${label}枚举选项未配置，无法提交`
    }
    if (!options.some((item) => item.value === value)) {
      return `${label}须选择有效选项`
    }
    return null
  }

  return null
}

/** 批量校验可编辑字段，返回首个失败提示。 */
export function validatePortfolioArchiveFields(
  fields: PortfolioArchiveFieldSchema[],
  values: Record<string, string | undefined>,
): string | null {
  for (const field of fields) {
    if (field.readonly) {
      continue
    }
    const fieldCode = field.fieldCode
    if (!fieldCode) {
      continue
    }
    const error = validatePortfolioArchiveFieldValue(field, values[fieldCode])
    if (error) {
      return error
    }
  }
  return null
}
