interface PasswordChangeAwareUserInfo {
  forcePasswordChange?: boolean
  currentLoginProviderType?: string
}

const EXEMPT_PROVIDER_TYPES = new Set(['cas', 'wechat'])

/**
 * 判断当前登录来源是否豁免强制改密。
 * 当前业务约定：CAS 与微信登录不执行强制改密拦截。
 *
 * @param userInfo 当前用户信息
 * @return 是否属于豁免登录来源
 */
export function isForcePasswordChangeExemptLogin(
  userInfo?: PasswordChangeAwareUserInfo | null,
): boolean {
  const providerType = userInfo?.currentLoginProviderType?.trim().toLowerCase()
  if (!providerType) {
    return false
  }
  return EXEMPT_PROVIDER_TYPES.has(providerType)
}

/**
 * 判断当前登录态是否需要执行强制改密。
 *
 * @param userInfo 当前用户信息
 * @return 是否需要执行强制改密
 */
export function shouldEnforcePasswordChange(
  userInfo?: PasswordChangeAwareUserInfo | null,
): boolean {
  return userInfo?.forcePasswordChange === true && !isForcePasswordChangeExemptLogin(userInfo)
}
