/**
 * 试卷母版身份填涂区类型；须与 edu-common PaperMasterIdentityAreaType 逐值一致。
 */
import { strictEnumLabel } from '@/utils/strict-enum'

export enum PaperMasterIdentityAreaTypeCode {
  STUDENT_NO = 'STUDENT_NO',
  CLASS_NAME = 'CLASS_NAME',
  STUDENT_NAME = 'STUDENT_NAME',
  HEADER_IDENTITY_STRIP = 'HEADER_IDENTITY_STRIP',
}

export const ALL_PAPER_MASTER_IDENTITY_AREA_TYPE_CODES: readonly PaperMasterIdentityAreaTypeCode[] = [
  PaperMasterIdentityAreaTypeCode.STUDENT_NO,
  PaperMasterIdentityAreaTypeCode.CLASS_NAME,
  PaperMasterIdentityAreaTypeCode.STUDENT_NAME,
  PaperMasterIdentityAreaTypeCode.HEADER_IDENTITY_STRIP,
]

/** 教师制卷身份完备性要求的三字段；不含扫描派生页眉带。 */
export const PAPER_MASTER_STUDENT_IDENTITY_AREA_TYPE_CODES: readonly PaperMasterIdentityAreaTypeCode[] = [
  PaperMasterIdentityAreaTypeCode.STUDENT_NO,
  PaperMasterIdentityAreaTypeCode.CLASS_NAME,
  PaperMasterIdentityAreaTypeCode.STUDENT_NAME,
]

export const PaperMasterIdentityAreaTypeDescription: Record<PaperMasterIdentityAreaTypeCode, string> = {
  [PaperMasterIdentityAreaTypeCode.STUDENT_NO]: '学号填涂区',
  [PaperMasterIdentityAreaTypeCode.CLASS_NAME]: '班级名称填涂区',
  [PaperMasterIdentityAreaTypeCode.STUDENT_NAME]: '学生姓名填涂区',
  [PaperMasterIdentityAreaTypeCode.HEADER_IDENTITY_STRIP]: '页眉身份识别带',
}

export const PaperMasterIdentityAreaTypeOptions: Array<{ value: PaperMasterIdentityAreaTypeCode, label: string }> = [
  {
    value: PaperMasterIdentityAreaTypeCode.STUDENT_NO,
    label: strictEnumLabel(
      PaperMasterIdentityAreaTypeDescription,
      PaperMasterIdentityAreaTypeCode.STUDENT_NO,
      '身份填涂区类型',
    ),
  },
  {
    value: PaperMasterIdentityAreaTypeCode.CLASS_NAME,
    label: strictEnumLabel(
      PaperMasterIdentityAreaTypeDescription,
      PaperMasterIdentityAreaTypeCode.CLASS_NAME,
      '身份填涂区类型',
    ),
  },
  {
    value: PaperMasterIdentityAreaTypeCode.STUDENT_NAME,
    label: strictEnumLabel(
      PaperMasterIdentityAreaTypeDescription,
      PaperMasterIdentityAreaTypeCode.STUDENT_NAME,
      '身份填涂区类型',
    ),
  },
]

export function getPaperMasterIdentityAreaTypeDescription(code: PaperMasterIdentityAreaTypeCode): string {
  return strictEnumLabel(PaperMasterIdentityAreaTypeDescription, code, '身份填涂区类型')
}

export function requirePaperMasterIdentityAreaTypeCode(value: unknown): PaperMasterIdentityAreaTypeCode {
  if (typeof value !== 'string') {
    throw new TypeError('身份填涂区类型契约异常')
  }
  const code = ALL_PAPER_MASTER_IDENTITY_AREA_TYPE_CODES.find(item => item === value)
  if (!code) {
    throw new Error('身份填涂区类型契约异常')
  }
  return code
}
