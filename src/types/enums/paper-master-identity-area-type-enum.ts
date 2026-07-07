/**
 * 试卷母版身份填涂区类型；须与 edu-common PaperMasterIdentityAreaType 逐值一致。
 */
export enum PaperMasterIdentityAreaTypeCode {
  STUDENT_NO = 'STUDENT_NO',
  CLASS_NAME = 'CLASS_NAME',
  STUDENT_NAME = 'STUDENT_NAME',
}

export const ALL_PAPER_MASTER_IDENTITY_AREA_TYPE_CODES: readonly PaperMasterIdentityAreaTypeCode[] = [
  PaperMasterIdentityAreaTypeCode.STUDENT_NO,
  PaperMasterIdentityAreaTypeCode.CLASS_NAME,
  PaperMasterIdentityAreaTypeCode.STUDENT_NAME,
]

export const PaperMasterIdentityAreaTypeDescription: Record<PaperMasterIdentityAreaTypeCode, string> = {
  [PaperMasterIdentityAreaTypeCode.STUDENT_NO]: '学号填涂区',
  [PaperMasterIdentityAreaTypeCode.CLASS_NAME]: '班级名称填涂区',
  [PaperMasterIdentityAreaTypeCode.STUDENT_NAME]: '学生姓名填涂区',
}

export const PaperMasterIdentityAreaTypeOptions: Array<{ value: PaperMasterIdentityAreaTypeCode, label: string }> = [
  {
    value: PaperMasterIdentityAreaTypeCode.STUDENT_NO,
    label: PaperMasterIdentityAreaTypeDescription[PaperMasterIdentityAreaTypeCode.STUDENT_NO],
  },
  {
    value: PaperMasterIdentityAreaTypeCode.CLASS_NAME,
    label: PaperMasterIdentityAreaTypeDescription[PaperMasterIdentityAreaTypeCode.CLASS_NAME],
  },
  {
    value: PaperMasterIdentityAreaTypeCode.STUDENT_NAME,
    label: PaperMasterIdentityAreaTypeDescription[PaperMasterIdentityAreaTypeCode.STUDENT_NAME],
  },
]

export function getPaperMasterIdentityAreaTypeDescription(code: PaperMasterIdentityAreaTypeCode): string {
  return PaperMasterIdentityAreaTypeDescription[code]
}

export function requirePaperMasterIdentityAreaTypeCode(value: unknown): PaperMasterIdentityAreaTypeCode {
  if (typeof value !== 'string') {
    throw new TypeError('身份填涂区类型契约异常，请刷新后重试')
  }
  const code = ALL_PAPER_MASTER_IDENTITY_AREA_TYPE_CODES.find((item) => item === value)
  if (!code) {
    throw new Error('身份填涂区类型契约异常，请刷新后重试')
  }
  return code
}
