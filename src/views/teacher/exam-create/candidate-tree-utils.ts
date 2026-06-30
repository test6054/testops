import type { ClassStudentTreeNode } from '@/apis/edu/class'

export function flattenClassOptions(tree: ClassStudentTreeNode[]): Array<{ label: string, value: string }> {
  const options: Array<{ label: string, value: string }> = []
  const walk = (nodes: ClassStudentTreeNode[]): void => {
    for (const node of nodes) {
      if (node.nodeType === 'CLASS') {
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
