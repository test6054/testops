/**
 * 学期枚举常量
 * 与后端 SemesterEnum.java 保持一致
 *
 * @description 定义学期相关的常量和工具函数
 * @author 庆之
 * @version 1.0
 */

/**
 * 学期代码枚举
 * 注意：后端返回的是字符串类型 "1" 或 "2"
 */
export enum SemesterCode {
  /** 秋季学期 */
  AUTUMN = '1',
  /** 春季学期 */
  SPRING = '2'
}

/**
 * 学期描述文本
 */
export const SemesterDescription: Record<string, string> = {
  [SemesterCode.AUTUMN]: '秋季学期',
  [SemesterCode.SPRING]: '春季学期'
}

/**
 * 学期选项列表（用于 Select 组件）
 */
export const SemesterOptions: Array<{ value: SemesterCode, label: string }> = [
  {value: SemesterCode.AUTUMN, label: SemesterDescription[SemesterCode.AUTUMN]},
  {value: SemesterCode.SPRING, label: SemesterDescription[SemesterCode.SPRING]}
]

/**
 * 根据学期代码获取描述文本
 *
 * @param code 学期代码 "1" 或 "2"
 * @returns 学期描述文本，如 "秋季学期"
 */
export function getSemesterDescription(code: string | null | undefined): string {
  if (!code || !SemesterDescription[code]) {
    throw new Error(`学期编码不符合前后端契约：${String(code)}`)
  }
  return SemesterDescription[code]
}

/**
 * 验证学期代码是否有效
 *
 * @param code 学期代码
 * @returns 是否为有效的学期代码
 */
export function isValidSemesterCode(code: string | null | undefined): boolean {
  return code === SemesterCode.AUTUMN || code === SemesterCode.SPRING
}

/**
 * 学期代码宽容格式化：
 * - 已知码（"1" / "2"）返回对应描述
 * - 空值返回空串
 * - 未知码原样返回（用于历史数据兼容展示，不抛错）
 *
 * @param value 学期代码或任意展示值
 */
export function formatSemester(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return SemesterDescription[value] ?? value
}
