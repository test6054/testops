import type { ClassStudentTreeNode } from '@/apis/edu/class'
import type { ExamCreateCandidateRow } from './useExamCreate'

export interface ClassStudentSelectionInfo {
  id: string
  name: string
  classId?: string
  className?: string
  studentNumber?: string
}

export function flattenClassOptions(tree: ClassStudentTreeNode[]): Array<{ label: string, value: string }> {
  const options: Array<{ label: string, value: string }> = []
  const walk = (nodes: ClassStudentTreeNode[]): void => {
    for (const node of nodes) {
      if (node.nodeType === 'CLASS') {
        options.push({ label: node.name, value: node.originalId })
      }
      node.children?.forEach(walk)
    }
  }
  walk(tree)
  return options
}

/** 从班级学生树中收集指定班级下的全部学生。 */
export function collectStudentsByClassIds(
  tree: ClassStudentTreeNode[],
  classIds: string[],
): ExamCreateCandidateRow[] {
  const classIdSet = new Set(classIds)
  const rows: ExamCreateCandidateRow[] = []
  const seen = new Set<string>()

  const walk = (nodes: ClassStudentTreeNode[], classContext?: ClassStudentTreeNode): void => {
    for (const node of nodes) {
      let nextClass = classContext
      if (node.nodeType === 'CLASS') {
        nextClass = node
      }
      if (node.nodeType === 'STUDENT' && nextClass && classIdSet.has(nextClass.originalId)) {
        const studentUserId = node.originalId
        if (!seen.has(studentUserId)) {
          seen.add(studentUserId)
          rows.push({
            studentUserId,
            classId: nextClass.originalId,
            className: nextClass.name,
            studentNo: node.studentNumber ?? '',
            studentName: node.name,
          })
        }
      }
      if (node.children?.length) {
        walk(node.children, nextClass)
      }
    }
  }
  walk(tree)
  return rows
}

/** 合并考生行，按 studentUserId 去重。 */
export function mergeCandidateRows(
  existing: ExamCreateCandidateRow[],
  incoming: ExamCreateCandidateRow[],
): ExamCreateCandidateRow[] {
  const map = new Map<string, ExamCreateCandidateRow>()
  for (const row of existing) {
    map.set(row.studentUserId, row)
  }
  for (const row of incoming) {
    map.set(row.studentUserId, row)
  }
  return [...map.values()]
}

/** 将班级学生树勾选结果映射为考生行；班级或姓名缺失时返回 null。 */
export function mapSelectedStudentsToCandidateRows(
  studentsInfo: ClassStudentSelectionInfo[],
): ExamCreateCandidateRow[] | null {
  const rows: ExamCreateCandidateRow[] = []
  for (const item of studentsInfo) {
    if (!item.classId || !item.name) {
      return null
    }
    rows.push({
      studentUserId: item.id,
      classId: item.classId,
      className: item.className ?? '',
      studentName: item.name,
      studentNo: item.studentNumber ?? '',
    })
  }
  return rows
}
