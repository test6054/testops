/**
 * 管理员用户管理API
 * 对接后端 AdminUserController 接口
 */

import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'


/** 管理员重置密码请求 */
export interface AdminResetPasswordRequest {
  /** 用户ID */
  userId: string
  /** 新密码 */
  newPassword: string
}
/** 管理员删除用户请求 - 使用IdRequest格式 */
export interface AdminDeleteUserRequest {
  /** 用户ID */
  id: string
}

/** 管理员创建用户请求 - 与后端AdminCreateUserRequestDto保持一致 */
export interface AdminCreateUserRequest {
  /** 用户名 */
  userName: string
  /** 初始密码 */
  password?: string
  /** 真实姓名 */
  name: string
  /** 邮箱 */
  email: string
  /** 手机号 */
  mobile?: string
  /** 主要业务角色 (如 SCH_STU, SCH_TECH 等) */
  role: string
  /** 用户状态 */
  userStatus?: string
  /** 所属部门/院系ID（必填，通过departmentId可以确定租户和学校信息） */
  departmentId?: string
  /** 租户ID */
  tenantId?: string

  // --- 学生特定字段 ---
  /** 学号 */
  studentNumber?: string
  /** 所属班级ID */
  classId?: string
  /** 班级名称（用于导入时自动创建班级） */
  className?: string
  /** 入学年份 */
  enrollmentYear?: number
  /** 预计毕业年份 */
  graduationYear?: number
  /** 学生ID */
  studentId?: string

  // --- 教师特定字段 ---
  /** 工号 */
  teacherNumber?: string
  /** 院系/部门 */
  department?: string
  /** 职称/职务 */
  title?: string
  /** 专业 ID（学生创建时从班级信息中推导） */
  majorId?: string
  // --- 企业助教特定字段 ---
  /** 所属公司ID */
  companyId?: string
  /** 企业内职位 */
  corporatePosition?: string
}

/** 管理员更新用户请求 - 与后端AdminUpdateUserRequestDto保持一致 */
export interface AdminUpdateUserRequest {
  /** 用户ID */
  userId: string
  /** 用户名 */
  userName?: string
  /** 密码 */
  password?: string
  /** 真实姓名 */
  nickName?: string
  /** 邮箱 */
  email?: string
  /** 手机号 */
  mobile?: string
  /** 主要业务角色 */
  role?: string

  // --- 部门信息 ---
  /** 所属部门/院系ID */
  departmentId?: string

  // --- 学生特定字段 ---
  /** 学号 */
  studentNumber?: string
  /** 所属班级ID */
  classId?: string
  /** 入学年份 */
  enrollmentYear?: number
  /** 预计毕业年份 */
  graduationYear?: number

  // --- 教师特定字段 ---
  /** 工号 */
  teacherNumber?: string
  /** 院系/部门 */
  department?: string
  /** 职称/职务 */
  title?: string

  // --- 企业助教特定字段 ---
  /** 所属公司ID */
  companyId?: string
  /** 企业内职位 */
  corporatePosition?: string

}

/** 用户详情请求 */
export interface UserDetailRequest {
  /** 用户ID */
  id: string
}
/** 角色分配请求 */
export interface AssignRolesRequest {
  /** 用户ID */
  userId: string
  /** 目标角色键 */
  targetRoleKey: string
  /** 学生详细信息 */
  studentDetail?: {
    studentNumber?: string
    enrollmentYear?: number
    majorId?: string
    classId?: string
  }
  /** 教师详细信息 */
  teacherDetail?: {
    teacherNumber?: string
    department?: string
    position?: string
    title?: string
  }
  /** 企业助教详细信息 */
  corporateUserDetail?: {
    companyName?: string
    position?: string
    department?: string
  }
}

/** 用户状态变更请求 */
export interface ChangeUserStatusRequest {
  /** 用户ID */
  userId: string
  /** 目标状态 */
  targetStatus: string
}


/** 用户列表项DTO - 与后端 UserListItemDto 完全对应 */
export interface UserListItemDto {
  /** 用户ID */
  id: string
  /** 用户名 */
  userName: string
  /** 昵称 */
  nickName: string
  /** 邮箱 */
  email?: string
  /** 手机号 */
  mobile?: string
  /** 角色键 */
  roleKey?: string
  /** 头像URL */
  avatarUrl?: string
  /** 院系/部门 */
  department?: string
  /** 班级名称 */
  className?: string
  /** 班级ID */
  classId?: string
  /** 部门ID */
  departmentId?: string
  /** 公司名称 */
  companyName?: string
  /** 职位 */
  title?: string
  /** 学号/工号 */
  identifierNumber?: string
  /** 用户状态 */
  status: string
  /** 创建时间 */
  createTime: string
  /** 最后登录时间 */
  lastLoginTime?: string
  /** 租户ID */
  tenantId?: string
  /** 租户名称 */
  tenantName?: string
  /** 学校ID */
  schoolId?: string
  /** 学校名称 */
  schoolName?: string
  /** 院系名称 */
  departmentName?: string
}

/** 用户详情DTO - 与后端 UserDetailDto 完全对应 */
export interface UserDetailDto {
  /** 用户ID */
  id: string
  /** 用户名 */
  userName: string
  /** 昵称 */
  nickName: string
  /** 邮箱 */
  email?: string
  /** 手机号 */
  mobile?: string
  /** 头像URL */
  avatarUrl?: string
  /** 用户状态 */
  status: string
  /** 角色名称 */
  roleName?: string
  /** 角色显示名称 */
  roleDisplayName?: string
  /** 角色键 */
  roleKey?: string
  /** 租户ID */
  tenantId?: string
  /** 租户名称 */
  tenantName?: string
  /** 是否为租户管理员 */
  isTenantAdmin?: boolean
  /** 最后登录时间 */
  lastLoginTime?: string
  /** 创建时间 */
  createTime?: string
  /** 更新时间 */
  updateTime?: string
  /** 是否已删除 */
  deleted?: boolean
  /** 学号 */
  studentNumber?: string
  /** 专业 ID（关联 t_majors.id） */
  majorId?: string
  /** 专业名称（联表填充） */
  majorName?: string
  /** 入学年份 */
  enrollmentYear?: number
  /** 预计毕业年份 */
  graduationYear?: number
  /** 班级ID */
  classId?: string
  /** 院系ID */
  departmentId?: string
  /** 学校ID */
  schoolId?: string
}

/** 用户查询DTO - 与后端 UserQueryDto 完全对应 */
export interface UserQueryDto extends QueryDto {
  /** 搜索关键词（用于模糊查询用户名、昵称、邮箱） */
  keyword?: string
  /** 用户状态筛选 */
  status?: string
  /** 角色键筛选 */
  roleKey?: string
  /** 部门ID筛选 */
  departmentId?: string
  /** 部门名称筛选（用于教师或企业助教） */
  department?: string
  /** 班级ID筛选 */
  classId?: string
  /** 专业名称筛选（按专业名称精确匹配） */
  majorName?: string
  /** 用户ID列表 */
  userList?: string[]
  /** 租户ID */
  tenantId?: string
}
/** 批量导入结果 */
export interface BatchImportResult {
  /** 总记录数 */
  totalCount: number
  /** 成功导入数 */
  successCount: number
  /** 导入失败数 */
  failCount: number
  /** 导入失败的错误信息 */
  errorMessages: string[]
}


/**
 * 管理员重置用户密码 - 对应后端 POST /api/admin/users/resetPassword
 */
export function adminResetPassword(data: AdminResetPasswordRequest): Promise<void> {
  return http.post<void>('/api/admin/users/resetPassword', data)
}
/**
 * 管理员删除用户 - 对应后端 POST /api/admin/users/delete
 */
export function adminDeleteUser(data: AdminDeleteUserRequest): Promise<void> {
  return http.post<void>('/api/admin/users/delete', data)
}

/**
 * 管理员创建用户 - 对应后端 POST /api/admin/users/create
 */
export function adminCreateUser(data: AdminCreateUserRequest): Promise<void> {
  return http.post<void>('/api/admin/users/create', data)
}

/**
 * 管理员更新用户信息 - 对应后端 POST /api/admin/users/update
 */
export function adminUpdateUser(data: AdminUpdateUserRequest): Promise<void> {
  return http.post<void>('/api/admin/users/update', data)
}

/**
 * 分页查询用户列表 - 对应后端 POST /api/admin/users/page
 */
export function adminGetUserPage(
  data: UserQueryDto,
  config?: Partial<ExtendedAxiosRequestConfig>,
): Promise<PageResult<UserListItemDto>> {
  return http.post<PageResult<UserListItemDto>>('/api/admin/users/page', data, config)
}
/**
 * 获取用户详情 - 对应后端 POST /api/admin/users/detail
 */
export function adminGetUserDetail(data: UserDetailRequest): Promise<UserDetailDto> {
  return http.post<UserDetailDto>('/api/admin/users/detail', data)
}
/**
 * 批量导入用户 - 租户管理员接口
 * 对应后端 POST /api/tenant/admin/users/batchImport
 * 自动使用当前租户ID，确保租户隔离
 */
export function tenantBatchImportUsers(file: File, roleKey: string): Promise<BatchImportResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('roleKey', roleKey)

  return http.post<BatchImportResult>('/api/tenant/admin/users/batchImport', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

/**
 * 分配角色 - 对应后端 POST /api/admin/users/assign-roles
 */
export function adminAssignRoles(data: AssignRolesRequest): Promise<void> {
  return http.post<void>('/api/admin/users/assign-roles', data)
}

/**
 * 变更用户状态 - 对应后端 POST /api/admin/users/changeStatus
 */
export function adminChangeUserStatus(data: ChangeUserStatusRequest): Promise<void> {
  return http.post<void>('/api/admin/users/changeStatus', data)
}


/**
 * 下载用户批量导入Excel模板 - 需要Token认证，Blob下载
 * 对应后端 GET /api/storage/export/jobs/download-import-template
 * @param roleKey 角色键：SCH_STU(学生) 或 SCH_TECH(教师)
 */
export async function downloadUserImportTemplate(roleKey: string): Promise<void> {
  // 使用http.download方法，返回完整的axios响应对象
  const response = await http.download(
    `/api/storage/export/jobs/download-import-template`,
    {roleKey}
  )

  // response是axios响应对象，response.data是Blob
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = roleKey === 'SCH_STU' ? '学生批量导入模板.xlsx' : '教师批量导入模板.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
