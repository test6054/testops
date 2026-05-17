/**
 * edu-user 真源目录 API - 专供 edu-quality 前端 Selector 使用
 *
 * 设计文档：edu-user 是组织 / 人员 / 专业大类 / 课程 / 班级 / 学生的唯一真源。
 * 本文件封装 quality 页面下拉选择所需的只读查询端点。
 *
 * 后端端点映射：
 * - /api/course-catalog/major-categories/list           GET  全局专业大类列表（含课程数）
 * - /api/course-catalog/courses/authorized-list         GET  租户已授权课程列表
 * - /api/course-catalog/courses/authorized-by-major-category POST 按专业大类过滤租户已授权课程
 * - /api/course-catalog/courses/list                    POST super_admin 全局课程分页
 * - /api/tenant-admin/departments/list                  GET  当前租户院系列表
 * - /api/tenant-admin/departments/majors                GET  当前租户专业列表（MajorVO）
 * - /api/admin/teachers/user-list                       POST 教师用户下拉分页
 *
 * 班级 / 学生查询复用 @/apis/edu/class.ts。
 */
import type { PageResult, QueryDto } from '@/types'
import http from '@/config/axios'

/* ========== 专业大类（全局，由 super_admin 维护） ========== */

export interface MajorCategoryVO {
  id: string
  majorCategoryName: string
  description?: string
  sortOrder?: number
  courseCount?: number
  createTime?: string
  updateTime?: string
}

/* ========== 专业（租户维度，班级所属实体） ========== */

export interface MajorVO {
  id: string
  majorCode?: string
  majorName: string
  departmentId?: string
  departmentName?: string
  description?: string
  status?: string
  createTime?: string
  updateTime?: string
}

/* ========== 课程（全局 + 租户授权） ========== */

export interface CourseListVO {
  id: string
  majorCategoryId?: string
  majorCategoryName?: string
  courseName: string
  courseCode?: string
  description?: string
  authorizedTenantCount?: number
  createTime?: string
  updateTime?: string
}

export interface CourseQueryPayload extends QueryDto {
  courseName?: string
  courseCode?: string
  majorCategoryId?: string
}

/* ========== 院系（租户维度） ========== */

export interface TenantSchoolDepartmentDto {
  id: string
  schoolId?: string
  schoolName?: string
  deptCode?: string
  deptName: string
  tenantId?: string
  status?: string
  createTime?: string
}

/* ========== 教师（下拉选择） ========== */

export interface TeacherUserInfoDto {
  id: string
  userName: string
  nickName?: string
  email?: string
  mobile?: string
  teacherNumber?: string
  department?: string
  title?: string
  status?: string
}

export interface TeacherQueryPayload extends QueryDto {
  searchText?: string
  departmentId?: string
  status?: string
  roleKey?: string
  schoolId?: string
}

/* ========== API 实现 ========== */

export const majorCategoryCatalogApi = {
  /** super_admin 全局专业大类列表（含课程数统计） */
  listAll: () =>
    http.get<MajorCategoryVO[]>('/api/course-catalog/major-categories/list'),
  detail: (id: string) =>
    http.post<MajorCategoryVO>('/api/course-catalog/major-categories/detail', { id }),
}

export const courseCatalogApi = {
  /** super_admin 全局课程分页查询 */
  page: (data: CourseQueryPayload) =>
    http.post<PageResult<CourseListVO>>('/api/course-catalog/courses/list', data),
  detail: (id: string) =>
    http.post<CourseListVO>('/api/course-catalog/courses/detail', { id }),
  /** 当前租户已授权课程全量 */
  authorizedList: () =>
    http.get<CourseListVO[]>('/api/course-catalog/courses/authorized-list'),
  /** 当前租户在指定专业大类下的已授权课程；majorCategoryId 为空时返回全部 */
  authorizedByMajorCategory: (majorCategoryId?: string) =>
    http.post<CourseListVO[]>('/api/course-catalog/courses/authorized-by-major-category', {
      id: majorCategoryId,
    }),
}

export const departmentCatalogApi = {
  /** 当前租户院系列表 */
  list: () =>
    http.get<TenantSchoolDepartmentDto[]>('/api/tenant-admin/departments/list'),
  /** 当前租户的专业列表（MajorVO）；面向班级管理 */
  listTenantMajors: () =>
    http.get<MajorVO[]>('/api/tenant-admin/departments/majors'),
}

export const teacherCatalogApi = {
  /** 教师用户下拉分页（SCH_TECH 角色） */
  userList: (data: TeacherQueryPayload) =>
    http.post<PageResult<TeacherUserInfoDto>>('/api/admin/teachers/user-list', data),
}
