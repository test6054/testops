import type { PfEligibilityRuleTreeNodeDto } from '@/apis/portfolio/indicator-types'

const LOGIC_NODE_TYPES = new Set(['AND', 'OR', 'NOT'])

/** 校验合取树是否具备最小可保存结构 */
export function validateEligibilityTree(root: PfEligibilityRuleTreeNodeDto): string | null {
  if (!root.nodeType) {
    return '根节点缺少类型'
  }
  if (LOGIC_NODE_TYPES.has(root.nodeType)) {
    if (!root.children?.length) {
      return '逻辑节点至少需要一个子节点'
    }
    for (const child of root.children) {
      const childError = validateEligibilityTree(child)
      if (childError) {
        return childError
      }
    }
    return null
  }
  if (root.nodeType === 'LEAF') {
    if (!root.fieldKey?.trim()) {
      return '叶子节点缺少字段键'
    }
    return null
  }
  if (root.nodeType === 'AUDIT_GATE') {
    if (!root.fieldKey?.trim()) {
      return '审核门禁缺少字段键'
    }
    if (!root.auditStatus?.trim()) {
      return '审核门禁缺少审核状态'
    }
    return null
  }
  const nodeTypeLabel: Record<string, string> = {
    AND: '合取',
    OR: '析取',
    NOT: '否定',
    LEAF: '叶子',
    AUDIT_GATE: '审核门禁',
  }
  return `不支持的节点类型：${nodeTypeLabel[root.nodeType] ?? '未知'}`
}
