/**
 * 阅卷考试范围与考生名册 API - 对接 /api/mark/exams/scope/* 与 candidates 查询接口。
 */
import type { PageResult } from '@/types'
import type { UserDto } from '@/types/api-types.d'
import http from '@/config/axios'
import { assertUserFacingText } from '@/utils/contract-guard'
import { readAllPages } from '@/utils/page-result'
import { strictEnumLabel } from '@/utils/strict-enum'

const STUDENT_TREE_DATA_ERROR = '班级学生树数据异常，请刷新后重试'

/** 考生状态编码 - 与后端 CandidateStatus 枚举完全一致 */
export type CandidateStatusCode = 'ACTIVE' | 'ABSENT'

/** 考生状态文案 - 与后端 CandidateStatus 枚举完全一致 */
export const CANDIDATE_STATUS_LABEL: Record<CandidateStatusCode, string> = {
  ACTIVE: '正常',
  ABSENT: '缺考',
}

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
}

/** 考试范围全量保存请求 - 对应 ExamScopeSaveRequest */
export interface ExamScopeSaveRequest {
  examId: string
  classIds: string[]
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
}

/** 名册可选班级 */
export interface ExamClassOptionVO {
  classId: string
  className: string
  departmentId?: string
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
  nodeType: 'DEPARTMENT' | 'CLASS' | 'STUDENT'
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

const EXAM_CLASS_STUDENT_TREE_NODE_TYPE_LABEL: Record<
  ExamClassStudentTreeNodeVO['nodeType'],
  string
> = {
  DEPARTMENT: '院系',
  CLASS: '班级',
  STUDENT: '学生',
}

/** 班级学生树节点合同校验，确保树选择器可以直接消费节点层级与可选状态。 */
function validateExamClassStudentTreeNodeContract(node: ExamClassStudentTreeNodeVO): void {
  assertUserFacingText(node.id, STUDENT_TREE_DATA_ERROR)
  assertUserFacingText(node.name, STUDENT_TREE_DATA_ERROR)
  assertUserFacingText(node.originalId, STUDENT_TREE_DATA_ERROR)
  strictEnumLabel(EXAM_CLASS_STUDENT_TREE_NODE_TYPE_LABEL, node.nodeType, '树节点类型')
  if (typeof node.selectable !== 'boolean' || typeof node.isLeaf !== 'boolean') {
    throw new TypeError(STUDENT_TREE_DATA_ERROR)
  }
  node.children?.forEach(validateExamClassStudentTreeNodeContract)
}

/** 考试学生树查询请求 */
export interface ExamStudentTreeRequest {
  examId: string
  classIds?: string[]
}

/** 分页查询考试考生名单 */
export interface ExamCandidatePageQueryRequest {
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

/** 查询名册可选班级。 */
export function listExamClassOptions(examId: string): Promise<ExamClassOptionVO[]> {
  return http.post<ExamClassOptionVO[]>('/api/mark/exams/scope/class-options', { examId })
}

/** 预览考生名册绑定行。 */
export function previewExamCandidates(
  request: ExamCandidatePreviewRequest,
): Promise<ExamCandidateVO[]> {
  return http    .post<ExamCandidateVO[]>('/api/mark/exams/scope/candidates/preview', request)
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
  return http
    .post<ExamClassStudentTreeNodeVO[]>('/api/mark/exams/scope/student-tree', request)
    .then((nodes) => {
      nodes.forEach(validateExamClassStudentTreeNodeContract)
      return nodes
    })
}

/** 分页查询考试考生名单。 */
export function pageExamCandidates(
  request: ExamCandidatePageQueryRequest,
): Promise<PageResult<ExamCandidateVO>> {
  return http.post<PageResult<ExamCandidateVO>>('/api/mark/exams/candidates', request)
}

const EXAM_CANDIDATE_PAGE_SIZE = 100

/** 查询考试当前考生名单，按后端分页合同自动拉全。 */
export async function listExamCandidates(examId: string): Promise<ExamCandidateVO[]> {
  return readAllPages(
    (pageNum) => pageExamCandidates({
      examId,
      pageNum,
      pageSize: EXAM_CANDIDATE_PAGE_SIZE,
    }),
    '考试考生名单加载失败，请稍后重试',
  )
}
