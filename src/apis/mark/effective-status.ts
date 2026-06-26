/** 配置生效状态 - 与后端 EffectiveStatus 枚举完全一致 */
export type EffectiveStatusCode = 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'DISCARDED'

/** 配置生效状态文案 - 与后端 EffectiveStatus.message 完全一致 */
export const EFFECTIVE_STATUS_LABEL: Record<EffectiveStatusCode, string> = {
  DRAFT: '草稿',
  ACTIVE: '已生效',
  SUPERSEDED: '已被替换',
  DISCARDED: '已废弃',
}
