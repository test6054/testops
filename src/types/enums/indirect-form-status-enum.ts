/** 间接评价问卷状态 - IndirectFormStatusEnum */
export enum IndirectFormStatusCode {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export const ALL_INDIRECT_FORM_STATUS_CODES: readonly IndirectFormStatusCode[] = [
  IndirectFormStatusCode.DRAFT,
  IndirectFormStatusCode.PUBLISHED,
  IndirectFormStatusCode.CLOSED,
  IndirectFormStatusCode.ARCHIVED,
]

export const IndirectFormStatusDescription: Record<IndirectFormStatusCode, string> = {
  [IndirectFormStatusCode.DRAFT]: '草稿',
  [IndirectFormStatusCode.PUBLISHED]: '已发布',
  [IndirectFormStatusCode.CLOSED]: '已关闭',
  [IndirectFormStatusCode.ARCHIVED]: '已归档',
}
