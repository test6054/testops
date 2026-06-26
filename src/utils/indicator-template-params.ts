/** 规则模板参数（对应后端 PortfolioIndicatorSeedTemplateParamsDto） */
export interface PortfolioIndicatorTemplateParams {
  passValue?: number
  standardScore?: number
  minValue?: number
  maxValue?: number
  targetRatio?: number
  cumulativeCap?: number
  capScore?: number
  addScore?: number
  subScore?: number
  weight?: number
}

const PARAM_LABEL: Record<keyof PortfolioIndicatorTemplateParams, string> = {
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
  return PARAM_LABEL[key]
}

export function parseTemplateParamsJson(json: string): PortfolioIndicatorTemplateParams {
  if (!json.trim()) {
    return {}
  }
  const raw = JSON.parse(json) as Record<string, unknown>
  const params: PortfolioIndicatorTemplateParams = {}
  for (const key of Object.keys(PARAM_LABEL) as (keyof PortfolioIndicatorTemplateParams)[]) {
    const value = raw[key]
    if (value === null || value === undefined || value === '') {
      continue
    }
    const num = Number(value)
    if (!Number.isNaN(num)) {
      params[key] = num
    }
  }
  return params
}

/** 序列化模板参数；空对象返回 "{}" 以兼容后端契约 */
export function serializeTemplateParams(params: PortfolioIndicatorTemplateParams): string {
  const payload: Record<string, number> = {}
  for (const key of Object.keys(PARAM_LABEL) as (keyof PortfolioIndicatorTemplateParams)[]) {
    const value = params[key]
    if (value !== undefined && value !== null && !Number.isNaN(value)) {
      payload[key] = value
    }
  }
  return JSON.stringify(payload)
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
