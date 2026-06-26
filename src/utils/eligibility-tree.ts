import type { PfEligibilityRuleTreeNodeDto } from '@/apis/portfolio/indicator-types'

const LOGIC_NODE_TYPES = new Set(['AND', 'OR', 'NOT'])

/** 将后端 ruleTreeJson 解析为可视化树根节点 */
export function parseEligibilityTreeJson(json: string): PfEligibilityRuleTreeNodeDto {
  if (!json.trim()) {
    return { nodeType: 'AND', children: [] }
  }
  const root = JSON.parse(json) as PfEligibilityRuleTreeNodeDto
  if (!root?.nodeType) {
    throw new Error('资格规则树缺少 nodeType')
  }
  return root
}

/** 将可视化树序列化为后端 ruleTreeJson 契约 */
export function serializeEligibilityTree(root: PfEligibilityRuleTreeNodeDto): string {
  return JSON.stringify(root)
}

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
      return '叶子节点缺少 fieldKey'
    }
    return null
  }
  if (root.nodeType === 'AUDIT_GATE') {
    if (!root.fieldKey?.trim()) {
      return '审核门禁缺少 fieldKey'
    }
    if (!root.auditStatus?.trim()) {
      return '审核门禁缺少 auditStatus'
    }
    return null
  }
  return `不支持的节点类型：${root.nodeType}`
}
