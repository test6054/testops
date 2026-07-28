/**
 * 数据集成中心五路由 owner（P1-235）。
 * cockpit 只展示 readiness；写操作落在各 owner 路由，不共享全页写锁。
 */
export type PortfolioIntegrationOwner
  = | 'cockpit'
    | 'connection'
    | 'sync'
    | 'identity'
    | 'report'
    | 'dictionary'

export const PORTFOLIO_INTEGRATION_OWNER_ROUTE: Record<
  Exclude<PortfolioIntegrationOwner, 'cockpit'>,
  string
> = {
  connection: 'PortfolioIntegrationConnection',
  sync: 'PortfolioIntegrationSync',
  identity: 'PortfolioIntegrationIdentity',
  report: 'PortfolioIntegrationReport',
  dictionary: 'PortfolioIntegrationDictionary',
}

export const PORTFOLIO_INTEGRATION_COCKPIT_ROUTE = 'PortfolioIntegrationDashboard'

export const PORTFOLIO_INTEGRATION_OWNER_TITLE: Record<PortfolioIntegrationOwner, string> = {
  cockpit: '数据集成中心',
  connection: '连接与映射',
  sync: '同步运行',
  identity: '身份与冲突',
  report: '上报与异常',
  dictionary: '字典与健康',
}

export const PORTFOLIO_INTEGRATION_OWNER_SUBTITLE: Record<PortfolioIntegrationOwner, string> = {
  cockpit: '治理总览：按阻断信号进入独立 owner',
  connection: '数据源、字段映射与课程编码对照',
  sync: '同步任务与清洗日志',
  identity: '身份待匹配与冲突处置',
  report: '全国上报待修正与异常消息重放',
  dictionary: '字段字典与渠道健康',
}
