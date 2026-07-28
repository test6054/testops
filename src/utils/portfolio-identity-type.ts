import type { PortfolioTeacherIdentityTypeCode } from '@/types/enums/portfolio-teacher-identity-type-enum'
import { PortfolioTeacherIdentityTypeDescription } from '@/apis/portfolio/enums'
import { strictEnumLabel } from '@/utils/strict-enum'

/**
 * 教师身份类型展示唯一真源：PortfolioTeacherIdentityTypeDescription。
 * 禁止消费后端 identityTypeLabel 双轨字段，禁止英文枚举码兜底。
 */
export function portfolioIdentityTypeDisplay(
  identityType: PortfolioTeacherIdentityTypeCode | undefined | null,
): string {
  if (!identityType) {
    throw new Error('枚举合同不同步：教师身份类型缺失')
  }
  return strictEnumLabel(
    PortfolioTeacherIdentityTypeDescription,
    identityType,
    '教师身份类型',
  )
}
