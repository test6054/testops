import type { PageResult, QueryDto } from '@/types'
import type { UserStatusEnum } from '@/types/enums/user-status'
import http from '@/config/axios'

/** 平台教师目录下拉项。 */
export interface TeacherUserInfoDto {
  id: string
  userName: string
  nickName: string
  email?: string
  mobile?: string
  teacherNumber?: string
  department?: string
  title?: string
  status?: UserStatusEnum
}

/** 平台教师目录详情，用于回显选择器中不在当前搜索页的教师。 */
export interface TeacherDetailsDto {
  id: string
  userName: string
  nickName: string
  email?: string
  mobile?: string
  teacherNumber?: string
  department?: string
  title?: string
  schoolId?: string
  schoolName?: string
  departmentId?: string
  departmentName?: string
  role?: string
  status?: UserStatusEnum
  createTime?: string
  studentCount?: number
  classCount?: number
  teacherDetailId?: string
}

/** 平台教师目录查询条件。 */
export interface TeacherQueryRequest extends QueryDto {
  searchText?: string
  departmentId?: string
  status?: UserStatusEnum
  roleKey?: string
  schoolId?: string
  title?: string
}

/** 教师目录真源接口，供考试、质量和归档流程共享。 */
export const teacherCatalogApi = {
  userList: (data: TeacherQueryRequest) =>
    http.post<PageResult<TeacherUserInfoDto>>('/api/admin/teachers/user-list', data),
  batchDetails: (teacherIds: string[]) =>
    http.post<TeacherDetailsDto[]>('/api/admin/teachers/batch-details', teacherIds),
}
