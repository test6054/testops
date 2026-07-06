/** 考试名册班级学生树节点类型 */
export enum ExamClassStudentTreeNodeTypeCode {
  DEPARTMENT = 'DEPARTMENT',
  CLASS = 'CLASS',
  STUDENT = 'STUDENT',
}

export const ALL_EXAM_CLASS_STUDENT_TREE_NODE_TYPE_CODES: readonly ExamClassStudentTreeNodeTypeCode[] = [
  ExamClassStudentTreeNodeTypeCode.DEPARTMENT,
  ExamClassStudentTreeNodeTypeCode.CLASS,
  ExamClassStudentTreeNodeTypeCode.STUDENT,
]

export const ExamClassStudentTreeNodeTypeDescription: Record<ExamClassStudentTreeNodeTypeCode, string> = {
  [ExamClassStudentTreeNodeTypeCode.DEPARTMENT]: '院系',
  [ExamClassStudentTreeNodeTypeCode.CLASS]: '班级',
  [ExamClassStudentTreeNodeTypeCode.STUDENT]: '学生',
}

