import type { ArchiveFourPropertyCheckVO } from '@/apis/mark/archive-volume'
import {
  ALL_ARCHIVE_FOUR_PROPERTY_DIMENSION_CODES,
  ArchiveFourPropertyDimensionCode,
  ArchiveFourPropertyDimensionDescription,
} from '@/types/enums/archive-four-property-dimension-enum'

export type ArchiveFourPropertyDimensionKey = ArchiveFourPropertyDimensionCode

export interface ArchiveFourPropertyDimensionView {
  key: ArchiveFourPropertyDimensionKey
  label: string
  passed: boolean
  description: string
}

/** 解析四性检测 diagnostic JSON，按维度聚合诊断说明。 */
export function buildFourPropertyDimensionViews(
  check: ArchiveFourPropertyCheckVO | null | undefined,
): ArchiveFourPropertyDimensionView[] {
  const messages = parseDiagnosticMessages(check?.diagnostic)
  return ALL_ARCHIVE_FOUR_PROPERTY_DIMENSION_CODES.map((key) => ({
    key,
    label: ArchiveFourPropertyDimensionDescription[key],
    passed: resolveDimensionPassed(check, key),
    description: messages.get(key) ?? (resolveDimensionPassed(check, key) ? '检测通过' : '未通过'),
  }))
}

export function countFourPropertyPassed(
  views: ArchiveFourPropertyDimensionView[],
): { passed: number, total: number } {
  const passed = views.filter((item) => item.passed).length
  return { passed, total: views.length }
}

/** 提取安全性维度诊断文案，供详情顶栏展示。 */
export function resolveSecurityDiagnosticMessage(
  check: ArchiveFourPropertyCheckVO | null | undefined,
): string {
  const message = parseDiagnosticMessages(check?.diagnostic).get(ArchiveFourPropertyDimensionCode.SECURITY)
  if (message) return message
  return '密级标记待确认，请完成定密确认后重新执行四性检测'
}

function resolveDimensionPassed(
  check: ArchiveFourPropertyCheckVO | null | undefined,
  key: ArchiveFourPropertyDimensionCode,
): boolean {
  if (!check) return false
  if (key === ArchiveFourPropertyDimensionCode.AUTHENTICITY) return check.authenticityPassed === true
  if (key === ArchiveFourPropertyDimensionCode.RELIABILITY) return check.reliabilityPassed === true
  if (key === ArchiveFourPropertyDimensionCode.INTEGRITY) return check.integrityPassed === true
  if (key === ArchiveFourPropertyDimensionCode.SECURITY) return check.securityPassed === true
  return check.usabilityPassed === true
}

function parseDiagnosticMessages(diagnostic?: string): Map<ArchiveFourPropertyDimensionCode, string> {
  const result = new Map<ArchiveFourPropertyDimensionCode, string>()
  if (!diagnostic?.trim()) {
    return result
  }
  try {
    const payload = JSON.parse(diagnostic)
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items)) {
      return result
    }
    for (const item of payload.items ?? []) {
      if (!item || typeof item !== 'object' || typeof item.message !== 'string') {
        continue
      }
      const dimension = resolveDiagnosticDimension(item.dimension)
      if (!dimension || !item.message.trim()) {
        continue
      }
      result.set(dimension, item.message.trim())
    }
  } catch {
    return result
  }
  return result
}

function resolveDiagnosticDimension(value: unknown): ArchiveFourPropertyDimensionCode | undefined {
  if (value === ArchiveFourPropertyDimensionCode.AUTHENTICITY) return ArchiveFourPropertyDimensionCode.AUTHENTICITY
  if (value === ArchiveFourPropertyDimensionCode.RELIABILITY) return ArchiveFourPropertyDimensionCode.RELIABILITY
  if (value === ArchiveFourPropertyDimensionCode.INTEGRITY) return ArchiveFourPropertyDimensionCode.INTEGRITY
  if (value === ArchiveFourPropertyDimensionCode.USABILITY) return ArchiveFourPropertyDimensionCode.USABILITY
  if (value === ArchiveFourPropertyDimensionCode.SECURITY) return ArchiveFourPropertyDimensionCode.SECURITY
  return undefined
}
