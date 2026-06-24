import type { PortfolioOrgTreeNodeVO, PortfolioOrgTreeNodeType } from '@/apis/portfolio/types'
import { ref } from 'vue'
import { portfolioOrgApi } from '@/apis/portfolio/org'
import { PORTFOLIO_PORTFOLIO_UNIT_NODE_TYPES } from '@/apis/portfolio/types'
import { showUserError } from '@/utils/error-handler'

export interface PortfolioOrgFlatOption {
  value: string
  label: string
}

function walkTree(
  nodes: PortfolioOrgTreeNodeVO[],
  visitor: (node: PortfolioOrgTreeNodeVO, label: string) => void,
  prefix = '',
) {
  for (const node of nodes) {
    const label = prefix ? `${prefix} / ${node.name}` : node.name
    visitor(node, label)
    if (node.children?.length) {
      walkTree(node.children, visitor, label)
    }
  }
}

export function flattenDepartmentOptions(roots: PortfolioOrgTreeNodeVO[]): PortfolioOrgFlatOption[] {
  const result: PortfolioOrgFlatOption[] = []
  walkTree(roots, (node, label) => {
    if (node.nodeType === 'DEPARTMENT' && node.id) {
      result.push({ value: node.id, label })
    }
  })
  return result
}

export function flattenPortfolioOrgOptions(roots: PortfolioOrgTreeNodeVO[]): PortfolioOrgFlatOption[] {
  const result: PortfolioOrgFlatOption[] = []
  walkTree(roots, (node, label) => {
    if (node.portfolioOrgId && PORTFOLIO_PORTFOLIO_UNIT_NODE_TYPES.includes(node.nodeType as PortfolioOrgTreeNodeType)) {
      result.push({ value: node.portfolioOrgId, label })
    }
  })
  return result
}

export function isPortfolioUnitNode(nodeType?: string) {
  return PORTFOLIO_PORTFOLIO_UNIT_NODE_TYPES.includes(nodeType as PortfolioOrgTreeNodeType)
}

export function usePortfolioOrgTree() {
  const loading = ref(false)
  const treeRoots = ref<PortfolioOrgTreeNodeVO[]>([])

  async function loadTree(includeClasses = false) {
    loading.value = true
    try {
      treeRoots.value = await portfolioOrgApi.tree({ includeClasses })
    } catch (error) {
      showUserError(error, '加载组织树失败')
      treeRoots.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    treeRoots,
    loadTree,
    departmentOptions: () => flattenDepartmentOptions(treeRoots.value),
    portfolioOrgOptions: () => flattenPortfolioOrgOptions(treeRoots.value),
  }
}
