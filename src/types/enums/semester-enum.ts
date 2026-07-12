/**
 * 学期枚举常量
 * 与后端 SemesterEnum.java 保持一致
 *
 * @description 定义学期相关的常量和工具函数
 * @author 庆之
 * @version 1.0
 */
import { strictEnumLabel } from '@/utils/strict-enum'

/**
 * 学期代码枚举
 * 注意：后端返回的是字符串类型 "1" 或 "2"
 */
export enum SemesterCode {
  /** 秋季学期 */
  AUTUMN = '1',
  /** 春季学期 */
  SPRING = '2',
}

/** 全部合法学期码（显式枚举成员列表，禁止 Object.keys 反射推导）。 */
export const ALL_SEMESTER_CODES: readonly SemesterCode[] = [
  SemesterCode.AUTUMN,
  SemesterCode.SPRING,
]

/**
 * 学期描述文本
 */
export const SemesterDescription: Record<SemesterCode, string> = {
  [SemesterCode.AUTUMN]: '秋季学期',
  [SemesterCode.SPRING]: '春季学期',
}

/**
 * 学期选项列表（用于 Select 组件）
 */
export const SemesterOptions: Array<{ value: SemesterCode, label: string }> = [
  {
    value: SemesterCode.AUTUMN,
    label: strictEnumLabel(SemesterDescription, SemesterCode.AUTUMN, '学期'),
  },
  {
    value: SemesterCode.SPRING,
    label: strictEnumLabel(SemesterDescription, SemesterCode.SPRING, '学期'),
  },
]

/** 校验是否为 SemesterCode 枚举成员（逐值显式比对，禁止宽化承接）。 */
export function isSemesterCode(value: SemesterCode | null | undefined): value is SemesterCode {
  return value === SemesterCode.AUTUMN || value === SemesterCode.SPRING
}

/** 协议边界解析学期码；未知值返回 undefined。 */
export function parseSemesterCode(value: unknown): SemesterCode | undefined {
  if (value === SemesterCode.AUTUMN || value === SemesterCode.SPRING) {
    return value
  }
  return undefined
}

/**
 * 根据学期代码获取描述文本
 *
 * @param code 学期代码 "1" 或 "2"
 * @returns 学期描述文本；空值返回空串
 */
export function getSemesterDescription(code: SemesterCode | null | undefined): string {
  if (code === null || code === undefined) {
    return ''
  }
  return strictEnumLabel(SemesterDescription, code, '学期')
}

/**
 * 学期代码格式化：
 * - 已知码（"1" / "2"）返回对应描述
 * - 可选字段为空时返回空串
 * @param value 学期代码
 */
export function formatSemester(value: SemesterCode | null | undefined): string {
  return getSemesterDescription(value)
}

/** 格式化学年、学期展示文本（flat 字段，非 API 复合对象）。 */
export function formatAcademicYearSemester(
  academicYear?: string | null,
  semester?: SemesterCode | null,
): string {
  const year = academicYear?.trim()
  if (!year && !semester) {
    return ''
  }
  if (!year) {
    return getSemesterDescription(semester)
  }
  if (!semester) {
    return year
  }
  return `${year} · ${getSemesterDescription(semester)}`
}
