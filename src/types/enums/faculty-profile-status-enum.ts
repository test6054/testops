/** 师资队伍档案状态 - FacultyProfileStatusEnum */
export enum FacultyProfileStatusCode {
  ACTIVE = 'ACTIVE',
}

export const ALL_FACULTY_PROFILE_STATUS_CODES: readonly FacultyProfileStatusCode[] = [
  FacultyProfileStatusCode.ACTIVE,
]

export const FacultyProfileStatusDescription: Record<FacultyProfileStatusCode, string> = {
  [FacultyProfileStatusCode.ACTIVE]: '启用',
}
