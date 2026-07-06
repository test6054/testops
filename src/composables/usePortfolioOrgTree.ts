import type { PortfolioOrgTreeNodeVO } from '@/apis/portfolio/types'
import { ref } from 'vue'
import { PortfolioEduUserOrgTreeNodeTypeCode, PortfolioOrgUnitTypeCode } from '@/apis/portfolio/enums'
import { portfolioOrgApi } from '@/apis/portfolio/org'
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

export function flattenDepartmentOptions(
  roots: PortfolioOrgTreeNodeVO[],
): PortfolioOrgFlatOption[] {
  const result: PortfolioOrgFlatOption[] = []
  walkTree(roots, (node, label) => {
    if (node.nodeType === PortfolioEduUserOrgTreeNodeTypeCode.DEPARTMENT && node.id) {
      result.push({ value: node.id, label })
    }
  })
  return result
}

export function flattenPortfolioOrgOptions(
  roots: PortfolioOrgTreeNodeVO[],
): PortfolioOrgFlatOption[] {
  const result: PortfolioOrgFlatOption[] = []
  walkTree(roots, (node, label) => {
    if (
      node.portfolioOrgId
      && isPortfolioUnitNode(node.nodeType)
    ) {
      result.push({ value: node.portfolioOrgId, label })
    }
  })
  return result
}

export function isPortfolioUnitNode(
  nodeType?: PortfolioOrgTreeNodeVO['nodeType'],
): nodeType is PortfolioOrgUnitTypeCode {
  return nodeType === PortfolioOrgUnitTypeCode.MAJOR_GROUP
    || nodeType === PortfolioOrgUnitTypeCode.TEACHING_RESEARCH_OFFICE
    || nodeType === PortfolioOrgUnitTypeCode.CAMPUS
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
