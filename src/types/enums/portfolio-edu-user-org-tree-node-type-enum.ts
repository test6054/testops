/** edu-user 组织主数据树节点 - PortfolioOrgTreeNodeTypeConstants */
export enum PortfolioEduUserOrgTreeNodeTypeCode {
  SCHOOL = 'SCHOOL',
  DEPARTMENT = 'DEPARTMENT',
  MAJOR = 'MAJOR',
  CLASS = 'CLASS',
}

export const ALL_PORTFOLIO_EDU_USER_ORG_TREE_NODE_TYPE_CODES: readonly PortfolioEduUserOrgTreeNodeTypeCode[] = [
  PortfolioEduUserOrgTreeNodeTypeCode.SCHOOL,
  PortfolioEduUserOrgTreeNodeTypeCode.DEPARTMENT,
  PortfolioEduUserOrgTreeNodeTypeCode.MAJOR,
  PortfolioEduUserOrgTreeNodeTypeCode.CLASS,
]

export const PortfolioEduUserOrgTreeNodeTypeDescription: Record<PortfolioEduUserOrgTreeNodeTypeCode, string> = {
  [PortfolioEduUserOrgTreeNodeTypeCode.SCHOOL]: '学校',
  [PortfolioEduUserOrgTreeNodeTypeCode.DEPARTMENT]: '院系',
  [PortfolioEduUserOrgTreeNodeTypeCode.MAJOR]: '专业',
  [PortfolioEduUserOrgTreeNodeTypeCode.CLASS]: '班级',
}
