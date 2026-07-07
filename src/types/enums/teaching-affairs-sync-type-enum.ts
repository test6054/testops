/** 教务同步任务类型 */
export enum TeachingAffairsSyncTypeCode {
  ROSTER_IMPORT = 'ROSTER_IMPORT',
  GRADE_EXPORT = 'GRADE_EXPORT',
  GRADE_CORRECTION = 'GRADE_CORRECTION',
  GRADE_WITHDRAW = 'GRADE_WITHDRAW',
}

export const ALL_TEACHING_AFFAIRS_SYNC_TYPE_CODES: readonly TeachingAffairsSyncTypeCode[] = [
  TeachingAffairsSyncTypeCode.ROSTER_IMPORT,
  TeachingAffairsSyncTypeCode.GRADE_EXPORT,
  TeachingAffairsSyncTypeCode.GRADE_CORRECTION,
  TeachingAffairsSyncTypeCode.GRADE_WITHDRAW,
]

export const TeachingAffairsSyncTypeDescription: Record<TeachingAffairsSyncTypeCode, string> = {
  [TeachingAffairsSyncTypeCode.ROSTER_IMPORT]: '名单导入',
  [TeachingAffairsSyncTypeCode.GRADE_EXPORT]: '成绩回写',
  [TeachingAffairsSyncTypeCode.GRADE_CORRECTION]: '成绩更正',
  [TeachingAffairsSyncTypeCode.GRADE_WITHDRAW]: '成绩撤销',
}

