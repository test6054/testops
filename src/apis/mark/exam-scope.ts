/**
 * 阅卷考试范围与考生名册 API - 对接 /api/mark/exams/scope/* 与 candidates 查询接口。
 */
import type { PageResult } from '@/types'
import type { UserDto } from '@/types/api-types.d'
import type { CandidateStatusCode } from '@/types/enums/candidate-status-enum'
import type { ExamClassStudentTreeNodeTypeCode } from '@/types/enums/exam-class-student-tree-node-type-enum'
import http from '@/config/axios'
import { readAllPages } from '@/utils/page-result'

export {
  ALL_CANDIDATE_STATUS_CODES,
  CandidateStatusCode,
  CandidateStatusDescription,
} from '@/types/enums/candidate-status-enum'

/** 考生名册项 - 对应 ExamCandidateRosterRequest */
export interface ExamCandidateRosterRequest {
  classId: string
  studentUserId: string
}

/** 考生响应 - 对应 ExamCandidateResponse */
export interface ExamCandidateVO {
  candidateRosterId: string
  classId?: string
  className?: string
  studentUserId: string
  studentNo: string
  studentName: string
  status: CandidateStatusCode
  /** 是否允许从名册移除 */
  removable?: boolean
  /** 不可移除原因 */
  removalBlockReason?: string
}

/** 考试范围全量保存请求 - 对应 ExamScopeSaveRequest */
export interface ExamScopeSaveRequest {
  examId: string
  classIds: string[]
  /** 参考班级维护上下文院系 ID */
  referenceDepartmentId?: string
  candidates: ExamCandidateRosterRequest[]
}

/** 增量合并考生名册 */
export interface ExamCandidateMergeRequest {
  examId: string
  candidates: ExamCandidateRosterRequest[]
}

/** 增量移除考生名册 */
export interface ExamCandidateRemoveRequest {
  examId: string
  studentUserIds: string[]
}

/** 增量保存考试班级范围 */
export interface ExamClassScopeSaveRequest {
  examId: string
  classIds?: string[]
  /** 参考班级维护上下文院系 ID */
  referenceDepartmentId?: string
}

/** 预览考生名册绑定行（不落库） */
export interface ExamCandidatePreviewRequest {
  examId: string
  classIds?: string[]
  candidates: ExamCandidateRosterRequest[]
}

/** 名册班级学生分页 */
export interface ExamClassStudentsPageRequest {
  examId: string
  classId: string
  keyword?: string
  pageNum: number
  pageSize: number
}

/** 名册班级学生树节点（与 user 侧 ClassStudentTreeNode 对齐） */
export interface ExamClassStudentTreeNodeVO {
  id: string
  name: string
  nodeType: ExamClassStudentTreeNodeTypeCode
  originalId: string
  parentId: string | null
  majorId?: string
  majorName?: string
  studentNumber?: string
  studentCount?: number
  classCount?: number
  selectable: boolean
  isLeaf: boolean
  children?: ExamClassStudentTreeNodeVO[]
}

/** 考试学生树查询请求 */
export interface ExamStudentTreeRequest {
  examId: string
  classIds?: string[]
}

/** 考试考生名单查询请求 - 对应 ExamCandidateQueryRequest */
export interface ExamCandidateQueryRequest {
  examId: string
  /** 班级 ID 过滤 */
  classId?: string
  /** 学号或姓名关键词 */
  keyword?: string
  pageNum: number
  pageSize: number
}

/** 全量保存考试班级范围与考生名册。 */
export function saveExamScope(request: ExamScopeSaveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scope/save', request)
}

/** 增量合并考生名册。 */
export function mergeExamCandidates(request: ExamCandidateMergeRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scope/candidates/merge', request)
}

/** 增量移除考生名册。 */
export function removeExamCandidates(request: ExamCandidateRemoveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scope/candidates/remove', request)
}

/** 增量保存考试班级范围。 */
export function saveExamClassScope(request: ExamClassScopeSaveRequest): Promise<boolean> {
  return http.post<boolean>('/api/mark/exams/scope/class-scope/save', request)
}

/** 预览考生名册绑定行。 */
export function previewExamCandidates(
  request: ExamCandidatePreviewRequest,
): Promise<ExamCandidateVO[]> {
  return http.post<ExamCandidateVO[]>('/api/mark/exams/scope/candidates/preview', request)
}

/** 分页查询名册班级学生。 */
export function listExamClassStudents(
  request: ExamClassStudentsPageRequest,
): Promise<PageResult<UserDto>> {
  return http.post<PageResult<UserDto>>('/api/mark/exams/scope/class-students/page', request)
}

/** 查询考试班级学生树。 */
export function listExamStudentTree(
  request: ExamStudentTreeRequest,
): Promise<ExamClassStudentTreeNodeVO[]> {
  return http.post<ExamClassStudentTreeNodeVO[]>('/api/mark/exams/scope/student-tree', request)
}

/** 分页查询考试考生名单。 */
export function pageExamCandidates(
  request: ExamCandidateQueryRequest,
): Promise<PageResult<ExamCandidateVO>> {
  return http.post<PageResult<ExamCandidateVO>>('/api/mark/exams/candidates', request)
}

const EXAM_CANDIDATE_PAGE_SIZE = 100

/** 查询考试当前考生名单，按后端分页合同自动拉全。 */
export async function listExamCandidates(examId: string): Promise<ExamCandidateVO[]> {
  return readAllPages(
    (pageNum) =>
      pageExamCandidates({
        examId,
        pageNum,
        pageSize: EXAM_CANDIDATE_PAGE_SIZE,
      }),
    '考试考生名单加载失败，请稍后重试',
  )
}
