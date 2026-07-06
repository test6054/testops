/** ExperienceCaseStatus */
export enum ExperienceCaseStatusCode {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  DEPRECATED = 'DEPRECATED',
}

export const ALL_EXPERIENCE_CASE_STATUS_CODES: readonly ExperienceCaseStatusCode[] = [
  ExperienceCaseStatusCode.DRAFT,
  ExperienceCaseStatusCode.CONFIRMED,
  ExperienceCaseStatusCode.DEPRECATED,
]

export const ExperienceCaseStatusDescription: Record<ExperienceCaseStatusCode, string> = {
  [ExperienceCaseStatusCode.DRAFT]: '草稿',
  [ExperienceCaseStatusCode.CONFIRMED]: '已确认',
  [ExperienceCaseStatusCode.DEPRECATED]: '已废弃',
}

