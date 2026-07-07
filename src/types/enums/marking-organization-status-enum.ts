/** 阅卷组织状态 */
export enum MarkingOrganizationStatusCode {
  ORG_DRAFT = 'ORG_DRAFT',
  ORG_CONFIGURED = 'ORG_CONFIGURED',
  TRIAL_MARKING = 'TRIAL_MARKING',
  FORMAL_MARKING = 'FORMAL_MARKING',
  QUALITY_REVIEW = 'QUALITY_REVIEW',
  CLOSED = 'CLOSED',
}

export const ALL_MARKING_ORGANIZATION_STATUS_CODES: readonly MarkingOrganizationStatusCode[] = [
  MarkingOrganizationStatusCode.ORG_DRAFT,
  MarkingOrganizationStatusCode.ORG_CONFIGURED,
  MarkingOrganizationStatusCode.TRIAL_MARKING,
  MarkingOrganizationStatusCode.FORMAL_MARKING,
  MarkingOrganizationStatusCode.QUALITY_REVIEW,
  MarkingOrganizationStatusCode.CLOSED,
]
export const MarkingOrganizationStatusDescription: Record<MarkingOrganizationStatusCode, string> = {
  [MarkingOrganizationStatusCode.ORG_DRAFT]: '草稿',
  [MarkingOrganizationStatusCode.ORG_CONFIGURED]: '已配置',
  [MarkingOrganizationStatusCode.TRIAL_MARKING]: '试评中',
  [MarkingOrganizationStatusCode.FORMAL_MARKING]: '正评中',
  [MarkingOrganizationStatusCode.QUALITY_REVIEW]: '质量复核中',
  [MarkingOrganizationStatusCode.CLOSED]: '已关闭',
}
