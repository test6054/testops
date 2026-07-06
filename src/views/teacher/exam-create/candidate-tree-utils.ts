import type { ClassStudentTreeNode } from '@/apis/edu/class'
import { ExamClassStudentTreeNodeTypeCode } from '@/types/enums/exam-class-student-tree-node-type-enum'

export function flattenClassOptions(tree: ClassStudentTreeNode[]): Array<{ label: string, value: string }> {
  const options: Array<{ label: string, value: string }> = []
  const walk = (nodes: ClassStudentTreeNode[]): void => {
    for (const node of nodes) {
      if (node.nodeType === ExamClassStudentTreeNodeTypeCode.CLASS) {
        options.push({ label: node.name, value: node.originalId })
      }
      if (node.children?.length) {
        walk(node.children)
      }
    }
  }
  walk(tree)
  return options
}
