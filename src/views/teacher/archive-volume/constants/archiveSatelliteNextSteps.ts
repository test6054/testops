export type ArchiveSatelliteNextStepsVariant
  = | 'list'
    | 'remediation'
    | 'statistics'
    | 'eval-campaign'
    | 'readiness-matrix'
    | 'ledger'
    | 'audit'
    | 'search'
    | 'settings'
    | 'create-offline'
    | 'create-supplement'

export interface ArchiveSatelliteNextStep {
  key: string
  icon: string
  label: string
  description: string
  routeName: string
  routeQuery?: Record<string, string>
}

export const ARCHIVE_SATELLITE_NEXT_STEPS: Record<ArchiveSatelliteNextStepsVariant, ArchiveSatelliteNextStep[]> = {
  "list": [
    {
      key: 'exam-list',
      icon: '考',
      label: '考试列表',
      description: '查看关联考试的进行中状态',
      routeName: 'TeacherExamList',
    },
    {
      key: 'eval-campaign',
      icon: '评',
      label: '评估迎评',
      description: '归档质量与评估整改全链路',
      routeName: 'TeacherArchiveVolumeEvalCampaign',
    },
    {
      key: 'ai-analysis',
      icon: 'AI',
      label: '教学质量分析',
      description: '跨考试维度的 AI 洞察报告',
      routeName: 'TeacherAiAnalysisCenter',
    },
  ],
  "remediation": [
    {
      key: 'eval-campaign',
      icon: '评',
      label: '评估迎评',
      description: '迎评批次与卷就绪度检查',
      routeName: 'TeacherArchiveVolumeEvalCampaign',
    },
    {
      key: 'readiness-matrix',
      icon: '矩',
      label: '就绪度矩阵',
      description: '院系课程跨学期入库与完整性概览',
      routeName: 'TeacherArchiveVolumeReadinessMatrix',
    },
    {
      key: 'statistics',
      icon: '统',
      label: '迎评统计',
      description: '院系完成率与缺项材料分布',
      routeName: 'TeacherArchiveVolumeStatistics',
    },
  ],
  "statistics": [
    {
      key: 'eval-campaign',
      icon: '评',
      label: '评估迎评',
      description: '查看迎评批次与卷就绪度',
      routeName: 'TeacherArchiveVolumeEvalCampaign',
    },
    {
      key: 'readiness-matrix',
      icon: '矩',
      label: '就绪度矩阵',
      description: '院系课程跨学期入库与完整性概览',
      routeName: 'TeacherArchiveVolumeReadinessMatrix',
    },
    {
      key: 'list',
      icon: '归',
      label: '归档卷列表',
      description: '查看历史归档与五维状态',
      routeName: 'TeacherArchiveVolumeList',
    },
  ],
  'eval-campaign': [
    {
      key: 'ai-analysis',
      icon: 'AI',
      label: 'AI 质量分析',
      description: '基于归档数据生成教学质量分析报告',
      routeName: 'TeacherAiAnalysisCenter',
    },
    {
      key: 'audit',
      icon: '审',
      label: '归档审计',
      description: '追溯操作日志与事件记录',
      routeName: 'TeacherArchiveVolumeAudit',
    },
    {
      key: 'list',
      icon: '归',
      label: '归档卷列表',
      description: '查看历史归档与五维状态',
      routeName: 'TeacherArchiveVolumeList',
    },
  ],
  'readiness-matrix': [
    {
      key: 'eval-campaign',
      icon: '评',
      label: '评估迎评',
      description: '迎评批次与单卷就绪度明细',
      routeName: 'TeacherArchiveVolumeEvalCampaign',
    },
    {
      key: 'statistics',
      icon: '统',
      label: '迎评统计',
      description: '院系完成率与缺项材料分布',
      routeName: 'TeacherArchiveVolumeStatistics',
    },
    {
      key: 'list',
      icon: '归',
      label: '归档卷列表',
      description: '进入督导抽查与整改任务',
      routeName: 'TeacherArchiveVolumeList',
      routeQuery: { tab: 'supervision' },
    },
  ],
  "ledger": [
    {
      key: 'audit',
      icon: '审',
      label: '归档审计',
      description: '查阅审批与状态变更事件',
      routeName: 'TeacherArchiveVolumeAudit',
    },
    {
      key: 'search',
      icon: '搜',
      label: '材料检索',
      description: '跨卷定位归档材料 OCR 全文',
      routeName: 'TeacherArchiveVolumeSearch',
    },
    {
      key: 'list',
      icon: '归',
      label: '归档卷列表',
      description: '返回卷列表处理待办',
      routeName: 'TeacherArchiveVolumeList',
    },
  ],
  "audit": [
    {
      key: 'ledger',
      icon: '账',
      label: '查阅台账',
      description: '租户级查阅利用记录',
      routeName: 'TeacherArchiveVolumeLedger',
    },
    {
      key: 'list',
      icon: '归',
      label: '归档卷列表',
      description: '查看历史归档与五维状态',
      routeName: 'TeacherArchiveVolumeList',
    },
    {
      key: 'eval-campaign',
      icon: '评',
      label: '评估迎评',
      description: '归档质量与评估整改全链路',
      routeName: 'TeacherArchiveVolumeEvalCampaign',
    },
  ],
  "search": [
    {
      key: 'list',
      icon: '归',
      label: '归档卷列表',
      description: '返回列表查看卷详情',
      routeName: 'TeacherArchiveVolumeList',
    },
    {
      key: 'statistics',
      icon: '统',
      label: '迎评统计',
      description: '院系完成率与缺项分布',
      routeName: 'TeacherArchiveVolumeStatistics',
    },
    {
      key: 'eval-campaign',
      icon: '评',
      label: '评估迎评',
      description: '迎评批次与卷就绪度',
      routeName: 'TeacherArchiveVolumeEvalCampaign',
    },
  ],
  "settings": [
    {
      key: 'list',
      icon: '归',
      label: '归档卷列表',
      description: '返回列表处理日常归档',
      routeName: 'TeacherArchiveVolumeList',
    },
    {
      key: 'statistics',
      icon: '统',
      label: '迎评统计',
      description: '查看归档完成与缺项情况',
      routeName: 'TeacherArchiveVolumeStatistics',
    },
    {
      key: 'eval-campaign',
      icon: '评',
      label: '评估迎评',
      description: '迎评批次与就绪度检查',
      routeName: 'TeacherArchiveVolumeEvalCampaign',
    },
  ],
  'create-offline': [
    {
      key: 'list',
      icon: '归',
      label: '归档卷列表',
      description: '创建完成后返回列表查看',
      routeName: 'TeacherArchiveVolumeList',
    },
    {
      key: 'settings',
      icon: '配',
      label: '归档配置',
      description: '目录模板与职责授权',
      routeName: 'TeacherArchiveVolumeSettings',
    },
    {
      key: 'statistics',
      icon: '统',
      label: '迎评统计',
      description: '查看院系归档完成率',
      routeName: 'TeacherArchiveVolumeStatistics',
    },
  ],
  'create-supplement': [
    {
      key: 'list',
      icon: '归',
      label: '归档卷列表',
      description: '补录建卷完成后返回列表',
      routeName: 'TeacherArchiveVolumeList',
    },
    {
      key: 'create-offline',
      icon: '离',
      label: '线下纯归档',
      description: '无线上考试绑定的纯纸质建卷',
      routeName: 'TeacherArchiveVolumeCreateOffline',
    },
    {
      key: 'settings',
      icon: '配',
      label: '归档配置',
      description: '目录模板与职责授权',
      routeName: 'TeacherArchiveVolumeSettings',
    },
  ],
}
