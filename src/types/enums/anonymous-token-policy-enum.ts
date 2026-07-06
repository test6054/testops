/** 匿名令牌策略 */
export enum AnonymousTokenPolicyCode {
  NONE = 'NONE',
  PER_EXAM = 'PER_EXAM',
  PER_GROUP = 'PER_GROUP',
}

export const ALL_ANONYMOUS_TOKEN_POLICY_CODES: readonly AnonymousTokenPolicyCode[] = [
  AnonymousTokenPolicyCode.NONE,
  AnonymousTokenPolicyCode.PER_EXAM,
  AnonymousTokenPolicyCode.PER_GROUP,
]
export const AnonymousTokenPolicyDescription: Record<AnonymousTokenPolicyCode, string> = {
  [AnonymousTokenPolicyCode.NONE]: '不匿名',
  [AnonymousTokenPolicyCode.PER_EXAM]: '考试级匿名',
  [AnonymousTokenPolicyCode.PER_GROUP]: '题组级匿名',
}
