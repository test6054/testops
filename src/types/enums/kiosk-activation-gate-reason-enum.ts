/** 一体机激活门禁原因（由 Agent 健康状态派生） */
export enum KioskActivationGateReasonCode {
  NONE = 'NONE',
  UNBOUND = 'UNBOUND',
  REBIND_REQUIRED = 'REBIND_REQUIRED',
  TOKEN_RESET_REQUIRED = 'TOKEN_RESET_REQUIRED',
}

export const ALL_KIOSK_ACTIVATION_GATE_REASON_CODES: readonly KioskActivationGateReasonCode[] = [
  KioskActivationGateReasonCode.NONE,
  KioskActivationGateReasonCode.UNBOUND,
  KioskActivationGateReasonCode.REBIND_REQUIRED,
  KioskActivationGateReasonCode.TOKEN_RESET_REQUIRED,
]

export const KioskActivationGateReasonDescription: Record<KioskActivationGateReasonCode, string> = {
  [KioskActivationGateReasonCode.NONE]: '可激活',
  [KioskActivationGateReasonCode.UNBOUND]: '设备未绑定',
  [KioskActivationGateReasonCode.REBIND_REQUIRED]: '设备身份已变更，请重新激活',
  [KioskActivationGateReasonCode.TOKEN_RESET_REQUIRED]: '浏览器会话失效，请重新激活',
}

