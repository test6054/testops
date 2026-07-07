/** 租户续期类型 - 与后端 TenantRenewalRequest.RenewalType 对齐。 */
export enum TenantRenewalTypeCode {
  TRIAL_EXTEND = 'TRIAL_EXTEND',
  FORMAL_RENEW = 'FORMAL_RENEW',
  UPGRADE = 'UPGRADE',
}
