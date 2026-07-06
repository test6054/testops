/** 配置生效状态 */
export enum EffectiveStatusCode {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  DISCARDED = 'DISCARDED',
}

export const ALL_EFFECTIVE_STATUS_CODES: readonly EffectiveStatusCode[] = [
  EffectiveStatusCode.DRAFT,
  EffectiveStatusCode.ACTIVE,
  EffectiveStatusCode.SUPERSEDED,
  EffectiveStatusCode.DISCARDED,
]

export const EffectiveStatusDescription: Record<EffectiveStatusCode, string> = {
  [EffectiveStatusCode.DRAFT]: '草稿',
  [EffectiveStatusCode.ACTIVE]: '已生效',
  [EffectiveStatusCode.SUPERSEDED]: '已被替换',
  [EffectiveStatusCode.DISCARDED]: '已废弃',
}
