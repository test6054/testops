/** 准入规则树节点类型 */
export enum PfEligibilityNodeTypeCode {
  LEAF = 'LEAF',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  AUDIT_GATE = 'AUDIT_GATE',
}

export const ALL_PF_ELIGIBILITY_NODE_TYPE_CODES: readonly PfEligibilityNodeTypeCode[] = [
  PfEligibilityNodeTypeCode.LEAF,
  PfEligibilityNodeTypeCode.AND,
  PfEligibilityNodeTypeCode.OR,
  PfEligibilityNodeTypeCode.NOT,
  PfEligibilityNodeTypeCode.AUDIT_GATE,
]

export const PfEligibilityNodeTypeDescription: Record<PfEligibilityNodeTypeCode, string> = {
  [PfEligibilityNodeTypeCode.LEAF]: '叶子条件',
  [PfEligibilityNodeTypeCode.AND]: '与',
  [PfEligibilityNodeTypeCode.OR]: '或',
  [PfEligibilityNodeTypeCode.NOT]: '非',
  [PfEligibilityNodeTypeCode.AUDIT_GATE]: '审核门禁',
}
