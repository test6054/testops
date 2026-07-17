import type { PortfolioIndicatorTemplateParamsDto } from '@/apis/portfolio/indicator-types'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 表单编辑用参数类型，与后端 PortfolioIndicatorSeedTemplateParamsDto 对齐 */
export type PortfolioIndicatorTemplateParams = PortfolioIndicatorTemplateParamsDto

const PortfolioIndicatorTemplateParamDescription: Record<keyof PortfolioIndicatorTemplateParams, string> = {
  passValue: '达标值',
  standardScore: '标准分',
  minValue: '分段下限',
  maxValue: '分段上限',
  targetRatio: '目标比例',
  cumulativeCap: '累计上限',
  capScore: '封顶分',
  addScore: '加分',
  subScore: '减分',
  weight: '权重',
}

/** 按规则类型展示可编辑参数字段 */
export function templateParamFieldsForRuleType(ruleType: string): (keyof PortfolioIndicatorTemplateParams)[] {
  const type = ruleType.trim().toUpperCase()
  if (type === 'THRESHOLD') {
    return ['passValue', 'standardScore', 'capScore']
  }
  if (type === 'SEGMENT') {
    return ['minValue', 'maxValue', 'standardScore', 'capScore']
  }
  if (type === 'RATIO') {
    return ['targetRatio', 'standardScore', 'capScore']
  }
  if (type === 'CUMULATIVE') {
    return ['cumulativeCap', 'standardScore', 'capScore']
  }
  if (type === 'ADD_SUB') {
    return ['addScore', 'subScore', 'capScore']
  }
  if (type === 'WEIGHT') {
    return ['weight', 'standardScore', 'capScore']
  }
  return ['standardScore', 'capScore', 'passValue', 'minValue', 'maxValue', 'targetRatio', 'weight']
}

export function templateParamLabel(key: keyof PortfolioIndicatorTemplateParams): string {
  return strictEnumLabel(PortfolioIndicatorTemplateParamDescription, key, '指标模板参数')
}

export function defaultTemplateParams(ruleType: string): PortfolioIndicatorTemplateParams {
  const type = ruleType.trim().toUpperCase()
  if (type === 'THRESHOLD') {
    return { passValue: 1, standardScore: 10, capScore: 10 }
  }
  if (type === 'LINEAR_CAP') {
    return { standardScore: 10, capScore: 10 }
  }
  return { standardScore: 10, capScore: 10 }
}
