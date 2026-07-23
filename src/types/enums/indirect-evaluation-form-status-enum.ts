/** 间接评价问卷状态 - IndirectEvaluationFormStatusEnum */
export enum IndirectEvaluationFormStatusCode {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export const ALL_INDIRECT_EVALUATION_FORM_STATUS_CODES: readonly IndirectEvaluationFormStatusCode[] = [
  IndirectEvaluationFormStatusCode.DRAFT,
  IndirectEvaluationFormStatusCode.PUBLISHED,
  IndirectEvaluationFormStatusCode.CLOSED,
  IndirectEvaluationFormStatusCode.ARCHIVED,
]

export const IndirectEvaluationFormStatusDescription: Record<IndirectEvaluationFormStatusCode, string> = {
  [IndirectEvaluationFormStatusCode.DRAFT]: '草稿',
  [IndirectEvaluationFormStatusCode.PUBLISHED]: '已发布',
  [IndirectEvaluationFormStatusCode.CLOSED]: '已关闭',
  [IndirectEvaluationFormStatusCode.ARCHIVED]: '已归档',
}
