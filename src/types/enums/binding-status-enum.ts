/** 扫描绑定状态 */
export enum BindingStatusCode {
  UNBOUND = 'UNBOUND',
  BOUND = 'BOUND',
  CONFLICT = 'CONFLICT',
  DISCARDED = 'DISCARDED',
}

export const ALL_BINDING_STATUS_CODES: readonly BindingStatusCode[] = [
  BindingStatusCode.UNBOUND,
  BindingStatusCode.BOUND,
  BindingStatusCode.CONFLICT,
  BindingStatusCode.DISCARDED,
]

export const BindingStatusDescription: Record<BindingStatusCode, string> = {
  [BindingStatusCode.UNBOUND]: '未绑定',
  [BindingStatusCode.BOUND]: '已绑定',
  [BindingStatusCode.CONFLICT]: '冲突',
  [BindingStatusCode.DISCARDED]: '已废弃',
}

