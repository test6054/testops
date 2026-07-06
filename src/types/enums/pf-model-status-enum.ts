/** 场景模型状态 - PfModelStatusEnum */
export enum PfModelStatusCode {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  FROZEN = 'FROZEN',
}

export const ALL_PF_MODEL_STATUS_CODES: readonly PfModelStatusCode[] = [
  PfModelStatusCode.DRAFT,
  PfModelStatusCode.PUBLISHED,
  PfModelStatusCode.FROZEN,
]

export const PfModelStatusDescription: Record<PfModelStatusCode, string> = {
  [PfModelStatusCode.DRAFT]: '草稿',
  [PfModelStatusCode.PUBLISHED]: '已发布',
  [PfModelStatusCode.FROZEN]: '已冻结',
}
