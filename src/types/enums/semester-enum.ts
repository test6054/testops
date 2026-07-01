/**
 * 学期枚举常量
 * 与后端 SemesterEnum.java 保持一致
 *
 * @description 定义学期相关的常量和工具函数
 * @author 庆之
 * @version 1.0
 */
import { throwUserFacing } from '@/utils/contract-guard'

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
  { value: SemesterCode.AUTUMN, label: SemesterDescription[SemesterCode.AUTUMN] },
  { value: SemesterCode.SPRING, label: SemesterDescription[SemesterCode.SPRING] },
]

/**
 * 根据学期代码获取描述文本
 *
 * @param code 学期代码 "1" 或 "2"
 * @returns 学期描述文本；空值返回空串，未知码显式失败
 */
export function getSemesterDescription(code: string | null | undefined): string {
  if (code === null || code === undefined || code === '') {
    return ''
  }
  const label = SemesterDescription[code as SemesterCode]
  if (!label) {
    throwUserFacing('数据异常，请刷新后重试')
  }
  return label
}

/**
 * 验证学期代码是否有效
 *
 * @param code 学期代码
 * @returns 是否为有效的学期代码
 */
export function isValidSemesterCode(code: string | null | undefined): code is SemesterCode {
  return code === SemesterCode.AUTUMN
    || code === SemesterCode.SPRING
}

/**
 * 学期代码格式化：
 * - 已知码（"1" / "2"）返回对应描述
 * - 可选字段为空时返回空串
 * - 未知码显式失败
 *
 * @param value 学期代码或任意展示值
 */
export function formatSemester(value: string | null | undefined): string {
  return getSemesterDescription(value)
}

/**
 * 格式化学年学期筛选项展示文本，值格式 YYYY-YYYY_学期。
 */
export function formatAcademicTermCode(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const separatorIndex = value.lastIndexOf('_')
  if (separatorIndex <= 0 || separatorIndex >= value.length - 1) {
    return value
  }
  const academicYear = value.substring(0, separatorIndex)
  const semester = value.substring(separatorIndex + 1)
  const semesterLabel = getSemesterDescription(semester)
  return `${academicYear} · ${semesterLabel}`
}
