/**
 * 班级管理API
 * 对接后端 /api/user/admin/classes 接口
 */

// UserQueryDto 从 admin-user.ts 导入，避免重复定义
import type { UserQueryDto } from './admin-user'
import type { ExtendedAxiosRequestConfig } from '@/config/axios/types'
import type { IdRequest, PageResult, QueryDto } from '@/types'
import type { UserDto } from '@/types/api-types.d'
import type { ExamClassStudentTreeNodeTypeCode } from '@/types/enums/exam-class-student-tree-node-type-enum'
import http from '@/config/axios'


/** 班级信息DTO - 与后端ClassInfoDto完全对齐 */
export interface ClassInfoDto {
  /** 班级ID */
  id?: string
  /** 班级名称 */
  className?: string
  /** 专业 ID（关联 t_majors.id） */
  majorId?: string
  /** 专业名称（联表填充，仅用于展示） */
  majorName?: string
  /** 租户ID */
  tenantId?: string
  /** 部门ID */
  departmentId?: string
  /** 班主任用户ID */
  headTeacherUserId?: string
  /** 班主任姓名 */
  headTeacherName?: string
  /** 部门名称 */
  departmentName?: string
  /** 学生数量 */
  studentCount?: number
  /** 创建时间 */
  createTime?: string
  /** 更新时间 */
  updateTime?: string
  /** 关联的教师列表 */
  teachers?: Array<{
    id?: string
    userName?: string
    nickName?: string
  }>
  /** 是否可以分配为班主任（用于教师分配场景） */
  canAssignAsHeadTeacher?: boolean
  /** 关系ID（用于已分配班级场景） */
  relationId?: string
  /** 关系类型（用于已分配班级场景） */
  relationType?: string
  /** 关系类型描述（用于已分配班级场景） */
  relationTypeDesc?: string
  /** 分配时间（用于已分配班级场景） */
  assignTime?: string
}

/** 班级查询条件 - 与后端ClassInfoQuery完全对齐 */
export interface ClassInfoQuery extends QueryDto {
  /** 班级名称（模糊查询） */
  className?: string
  /** 部门ID */
  departmentId?: string
  /** 专业 ID（关联 t_majors.id） */
  majorId?: string
}

/** 学生分配班级请求 */
export interface StudentAssignClassRequestDto {
  /** 班级ID */
  targetId: string
  /** 学生ID列表 */
  sourceIds: string[]
}

/** 学生移除班级请求 */
export interface StudentRemoveFromClassRequestDto {
  /** 班级ID（可选，如果不提供则从所有班级移除） */
  targetId: string
  /** 学生ID列表 */
  sourceIds: string[]
}

/**
 * 班级学生树节点接口
 * 与后端 ClassStudentTreeNodeDTO 完全对应
 * 用于实训任务分配时选择班级或学生
 */
export interface ClassStudentTreeNode {
  /** 节点ID（带前缀：dept_1, class_1, student_1） */
  id: string
  /** 节点名称 */
  name: string
  /** 节点类型：DEPARTMENT, CLASS, STUDENT */
  nodeType: ExamClassStudentTreeNodeTypeCode
  /** 原始ID（用于提交后端） */
  originalId: string
  /** 父节点ID */
  parentId: string | null
  /** 专业 ID（班级节点专属，关联 t_majors.id） */
  majorId?: string
  /** 专业名称（班级节点专属，联表填充） */
  majorName?: string
  /** 学号（学生节点专属） */
  studentNumber?: string
  /** 学生数量（院系和班级节点） */
  studentCount?: number
  /** 班级数量（院系节点专属） */
  classCount?: number
  /** 是否可选择 */
  selectable: boolean
  /** 是否为叶子节点 */
  isLeaf: boolean
  /** 子节点列表 */
  children?: ClassStudentTreeNode[]
}

/** 班级学生树确认选中学生 - ClassStudentTreeSelectorDrawer confirm.studentsInfo 项；id 为后端学生用户 ID */
export interface ClassStudentTreeSelectedStudentVO {
  /** 租户学生用户 ID */
  id: string
  /** 学生姓名 */
  name: string
  /** 班级 ID */
  classId?: string
  /** 班级名称 */
  className?: string
  /** 学号 */
  studentNumber?: string
}

/** 班级学生树确认载荷 */
export interface ClassStudentTreeConfirmPayload {
  students: string[]
  studentsInfo: ClassStudentTreeSelectedStudentVO[]
}


/**
 * 创建新班级
 */
export function createClass(data: ClassInfoDto) {
  return http.post<void>(`/api/user/admin/classes/create`, data)
}

/**
 * 更新班级信息
 * 注意：ID必须包含在请求体中
 */
export function updateClass(data: ClassInfoDto) {
  // 确保data中包含id字段
  if (!data.id) {
    throw new Error('班级信息保存失败，请刷新后重试')
  }
  return http.post<void>(`/api/user/admin/classes/update`, data)
}

/**
 * 删除班级
 */
export function deleteClass(data: IdRequest) {
  return http.post<void>(`/api/user/admin/classes/delete`, data)
}

/**
 * 获取单个班级信息
 */
export function getClassById(data: IdRequest) {
  return http.post<ClassInfoDto>(`/api/user/admin/classes/detail`, data)
}

/**
 * 分页查询班级列表
 */
export function queryClasses(data: ClassInfoQuery) {
  return http.post<PageResult<ClassInfoDto>>(`/api/user/admin/classes/list`, data)
}

/**
 * 获取所有班级列表（不分页）
 */
export function getAllClasses() {
  return http.post<ClassInfoDto[]>(`/api/user/admin/classes/list-all`, {})
}

/**
 * 根据院系筛选班级列表
 * SUPER_ADMIN 可以指定 tenantId 跨租户查询
 * 普通用户只能查询自己租户内的班级
 */
export function getClassesByDepartment(
  data: { tenantId?: string, departmentId?: string },
  config?: ExtendedAxiosRequestConfig,
) {
  return http.post<ClassInfoDto[]>(`/api/user/admin/classes/list-by-department`, data, config)
}


/**
 * 为班级批量分配学生
 */
export function assignStudentsToClass(data: StudentAssignClassRequestDto) {
  return http.post<void>(`/api/user/admin/classes/assign-students`, data)
}

/**
 * 从班级批量移除学生
 */
export function removeStudentsFromClass(data: StudentRemoveFromClassRequestDto) {
  return http.post<void>(`/api/user/admin/classes/remove-students`, data)
}

/**
 * 根据班级查询学生
 */
export function getStudentsByClass(data: UserQueryDto) {
  return http.post<PageResult<UserDto>>(`/api/user/admin/classes/students`, data)
}

/**
 * 查询租户下未分配班级的学生列表
 * 对应后端: POST /api/user/admin/classes/unassigned-students
 */
export function getUnassignedStudents(data: UserQueryDto) {
  return http.post<PageResult<UserDto>>(`/api/user/admin/classes/unassigned-students`, data)
}

/**
 * 获取班级学生树形结构
 * 用于实训任务分配时选择班级或学生
 * GET /api/user/admin/classes/class-student-tree
 */
export function getClassStudentTree(): Promise<ClassStudentTreeNode[]> {
  return http.get<ClassStudentTreeNode[]>('/api/user/admin/classes/class-student-tree')
}

/**
 * 获取可添加到指定实践的学生树形结构
 * 与getClassStudentTree类似，但会过滤掉已经添加到指定实践的学生
 * GET /api/user/admin/classes/available-student-tree
 *
 * @param practiceId 实践ID
 */
export function getAvailableStudentTree(practiceId: string): Promise<ClassStudentTreeNode[]> {
  return http.get<ClassStudentTreeNode[]>('/api/user/admin/classes/available-student-tree', {
    params: {practiceId}
  })
}
