/** 成绩复核窗口策略状态 */
export enum ReviewWindowPolicyStatusCode {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export const ALL_REVIEW_WINDOW_POLICY_STATUS_CODES: readonly ReviewWindowPolicyStatusCode[] = [
  ReviewWindowPolicyStatusCode.DRAFT,
  ReviewWindowPolicyStatusCode.ACTIVE,
  ReviewWindowPolicyStatusCode.CLOSED,
]

export const ReviewWindowPolicyStatusDescription: Record<ReviewWindowPolicyStatusCode, string> = {
  [ReviewWindowPolicyStatusCode.DRAFT]: '草稿',
  [ReviewWindowPolicyStatusCode.ACTIVE]: '已开放',
  [ReviewWindowPolicyStatusCode.CLOSED]: '已关闭',
}

