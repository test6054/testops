import type { PfEligibilityRuleTreeNodeDto } from '@/apis/portfolio/indicator-types'
import {
  PfEligibilityNodeTypeCode,
  PfEligibilityNodeTypeDescription,
} from '@/apis/portfolio/indicator-types'
import { strictEnumLabel } from '@/utils/strict-enum'

const LOGIC_NODE_TYPES = new Set<PfEligibilityNodeTypeCode>([
  PfEligibilityNodeTypeCode.AND,
  PfEligibilityNodeTypeCode.OR,
  PfEligibilityNodeTypeCode.NOT,
])

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
  if (root.nodeType === PfEligibilityNodeTypeCode.LEAF) {
    if (!root.fieldKey?.trim()) {
      return '叶子节点缺少字段键'
    }
    return null
  }
  if (root.nodeType === PfEligibilityNodeTypeCode.AUDIT_GATE) {
    if (!root.fieldKey?.trim()) {
      return '审核门禁缺少字段键'
    }
    if (!root.auditStatus) {
      return '审核门禁缺少审核状态'
    }
    return null
  }
  return `不支持的节点类型：${strictEnumLabel(PfEligibilityNodeTypeDescription, root.nodeType, '资格节点类型')}`
}
