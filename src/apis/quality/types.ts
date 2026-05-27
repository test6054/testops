/**
 * 教学质量评价 API 共享类型 - 对应 edu-quality 模块
 *
 * 后端约束：
 * - 业务写操作与复杂查询使用 POST + DTO；模板下载、公开问卷读取等只读资源可使用 GET；禁止 PUT / DELETE / PATCH
 * - 租户与操作人由 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 全部以 string 表达到前端，避免 JS Number 精度丢失
 */

/** 达成度计算目标类型 - 对应 AchievementTargetTypeEnum */
export type AchievementTargetType
  = | 'COURSE_GOAL'
    | 'REQUIREMENT_INDICATOR'
    | 'GRADUATION_REQUIREMENT'
    | 'TRAINING_OBJECTIVE'
    | 'PROGRAM_SUMMARY'
    | 'CIVIC_GOAL_AGGREGATE'
    | 'COMPLEX_ENGINEERING_AGGREGATE'

export const ACHIEVEMENT_TARGET_TYPE_LABEL: Record<AchievementTargetType, string> = {
  COURSE_GOAL: '课程目标',
  REQUIREMENT_INDICATOR: '毕业要求观测点',
  GRADUATION_REQUIREMENT: '毕业要求',
  TRAINING_OBJECTIVE: '培养目标',
  PROGRAM_SUMMARY: '专业级汇总',
  CIVIC_GOAL_AGGREGATE: '课程思政独立汇总',
  COMPLEX_ENGINEERING_AGGREGATE: '复杂工程问题专项汇总',
}

/** 达成度审核状态 - AchievementAuditStatusEnum */
export type AchievementAuditStatus
  = | 'DRAFT'
    | 'CALCULATED'
    | 'SUBMITTED'
    | 'CONFIRMED'
    | 'RETURNED'
    | 'ARCHIVED'

export const ACHIEVEMENT_AUDIT_STATUS_LABEL: Record<AchievementAuditStatus, string> = {
  DRAFT: '起草中',
  CALCULATED: '已计算',
  SUBMITTED: '已提交',
  CONFIRMED: '已确认',
  RETURNED: '已退回',
  ARCHIVED: '已归档',
}

export const ACHIEVEMENT_AUDIT_STATUS_COLOR: Record<AchievementAuditStatus, string> = {
  DRAFT: 'default',
  CALCULATED: 'cyan',
  SUBMITTED: 'blue',
  CONFIRMED: 'green',
  RETURNED: 'orange',
  ARCHIVED: 'gold',
}

/** 达成度结论 - AchievementStatusEnum */
export type AchievementStatus
  = | 'ACHIEVED'
    | 'PARTIALLY_ACHIEVED'
    | 'NOT_ACHIEVED'
    | 'INSUFFICIENT_EVIDENCE'

export const ACHIEVEMENT_STATUS_LABEL: Record<AchievementStatus, string> = {
  ACHIEVED: '已达成',
  PARTIALLY_ACHIEVED: '部分达成',
  NOT_ACHIEVED: '未达成',
  INSUFFICIENT_EVIDENCE: '证据不足',
}

/** 达成度明细类型 - AchievementDetailTypeEnum */
export type AchievementDetailType
  = | 'ASSESSMENT_ITEM'
    | 'COURSE_GOAL'
    | 'INDICATOR'
    | 'REQUIREMENT'

export const ACHIEVEMENT_DETAIL_TYPE_LABEL: Record<AchievementDetailType, string> = {
  ASSESSMENT_ITEM: '考核环节',
  COURSE_GOAL: '课程目标',
  INDICATOR: '毕业要求观测点',
  REQUIREMENT: '毕业要求',
}

/** 达成度人工复核决定 - ManualReviewDecisionEnum */
export type ManualReviewDecision = 'CONFIRMED' | 'RETURNED' | 'ARCHIVED'

export const MANUAL_REVIEW_DECISION_LABEL: Record<ManualReviewDecision, string> = {
  CONFIRMED: '复核通过',
  RETURNED: '退回修改',
  ARCHIVED: '归档保留',
}

export const MANUAL_REVIEW_DECISION_COLOR: Record<ManualReviewDecision, string> = {
  CONFIRMED: 'green',
  RETURNED: 'orange',
  ARCHIVED: 'gold',
}

export const ACHIEVEMENT_STATUS_COLOR: Record<AchievementStatus, string> = {
  ACHIEVED: 'green',
  PARTIALLY_ACHIEVED: 'orange',
  NOT_ACHIEVED: 'red',
  INSUFFICIENT_EVIDENCE: 'default',
}

/** AI 任务状态 - AiTaskStatusEnum */
export type AiTaskStatus
  = | 'PENDING'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELLED'

export const AI_TASK_STATUS_LABEL: Record<AiTaskStatus, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  SUCCEEDED: '已完成',
  FAILED: '已失败',
  CANCELLED: '已取消',
}

export const AI_TASK_STATUS_COLOR: Record<AiTaskStatus, string> = {
  PENDING: 'default',
  PROCESSING: 'blue',
  SUCCEEDED: 'green',
  FAILED: 'red',
  CANCELLED: 'orange',
}

/** AI 任务类型 - AiTaskTypeEnum */
export type AiTaskType
  = | 'SYLLABUS_PARSE'
    | 'TRAINING_PLAN_PARSE'
    | 'ACHIEVEMENT_DIAGNOSIS'
    | 'COURSE_REPORT_GENERATE'
    | 'PROGRAM_REPORT_GENERATE'
    | 'IMPROVEMENT_SUGGESTION_GENERATE'
    | 'MATERIAL_QA'
    | 'INDIRECT_RESPONSE_DOC_PARSE'

export const AI_TASK_TYPE_LABEL: Record<AiTaskType, string> = {
  SYLLABUS_PARSE: '课程大纲解析',
  TRAINING_PLAN_PARSE: '培养方案解析',
  ACHIEVEMENT_DIAGNOSIS: '达成度诊断',
  COURSE_REPORT_GENERATE: '课程目标达成报告生成',
  PROGRAM_REPORT_GENERATE: '专业质量分析报告生成',
  IMPROVEMENT_SUGGESTION_GENERATE: '改进建议生成',
  MATERIAL_QA: '材料问答',
  INDIRECT_RESPONSE_DOC_PARSE: '间接评价答卷文档解析',
}

/** AI 任务业务类型 - AiTaskSubmitRequest.businessType */
export type AiTaskBusinessType
  = | 'ACHIEVEMENT_RESULT'
    | 'QUALITY_COURSE'
    | 'TRAINING_PLAN'
    | 'REPORT'
    | 'INDIRECT_FORM'

export const AI_TASK_BUSINESS_TYPE_LABEL: Record<AiTaskBusinessType, string> = {
  ACHIEVEMENT_RESULT: '达成度计算结果',
  QUALITY_COURSE: '质量评价课程',
  TRAINING_PLAN: '培养方案',
  REPORT: '质量报告',
  INDIRECT_FORM: '间接评价问卷',
}

/** AI 输出校验结果 - AiOutputValidationEnum */
export type AiOutputValidation = 'PASSED' | 'REJECTED' | 'WARN'

export const AI_OUTPUT_VALIDATION_LABEL: Record<AiOutputValidation, string> = {
  PASSED: '通过',
  REJECTED: '拒绝',
  WARN: '警告',
}

export const AI_OUTPUT_VALIDATION_COLOR: Record<AiOutputValidation, string> = {
  PASSED: 'green',
  REJECTED: 'red',
  WARN: 'orange',
}

/** AI 人工干预状态 - AiManualHandlingStatusEnum */
export type AiManualHandlingStatus
  = | 'NONE'
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'RESOLVED'
    | 'IGNORED'

export const AI_MANUAL_HANDLING_STATUS_LABEL: Record<AiManualHandlingStatus, string> = {
  NONE: '无需干预',
  PENDING: '待处置',
  IN_PROGRESS: '处置中',
  RESOLVED: '已解决',
  IGNORED: '已忽略',
}

/** AI 模型健康状态 - edu-common AiHealthStatus */
export type AiHealthStatus = 'UNKNOWN' | 'HEALTHY' | 'FAILED'

export const AI_HEALTH_STATUS_LABEL: Record<AiHealthStatus, string> = {
  UNKNOWN: '未知',
  HEALTHY: '健康',
  FAILED: '失败',
}

export const AI_HEALTH_STATUS_COLOR: Record<AiHealthStatus, string> = {
  UNKNOWN: 'default',
  HEALTHY: 'green',
  FAILED: 'red',
}

/** 成绩批次状态 - ScoreBatchStatusEnum */
export type ScoreBatchStatus
  = | 'PENDING'
    | 'PARSING'
    | 'PREVIEW_READY'
    | 'VALIDATED'
    | 'CONFIRMED'
    | 'FAILED'
    | 'CANCELLED'

export const SCORE_BATCH_STATUS_LABEL: Record<ScoreBatchStatus, string> = {
  PENDING: '待处理',
  PARSING: '解析中',
  PREVIEW_READY: '预览就绪',
  VALIDATED: '已校验',
  CONFIRMED: '已确认',
  FAILED: '失败',
  CANCELLED: '已取消',
}

export const SCORE_BATCH_STATUS_COLOR: Record<ScoreBatchStatus, string> = {
  PENDING: 'default',
  PARSING: 'blue',
  PREVIEW_READY: 'orange',
  VALIDATED: 'cyan',
  CONFIRMED: 'green',
  FAILED: 'red',
  CANCELLED: 'default',
}

/** 持续改进任务状态 - ImprovementTaskStatusEnum */
export type ImprovementTaskStatus
  = | 'OPEN'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'REVIEWED'
    | 'CLOSED'
    | 'RETURNED'

export const IMPROVEMENT_TASK_STATUS_LABEL: Record<ImprovementTaskStatus, string> = {
  OPEN: '已开启',
  IN_PROGRESS: '进行中',
  SUBMITTED: '已提交整改证据',
  REVIEWED: '已复评',
  CLOSED: '已闭环',
  RETURNED: '已退回',
}

export const IMPROVEMENT_TASK_STATUS_COLOR: Record<ImprovementTaskStatus, string> = {
  OPEN: 'orange',
  IN_PROGRESS: 'blue',
  SUBMITTED: 'cyan',
  REVIEWED: 'purple',
  CLOSED: 'green',
  RETURNED: 'red',
}

/** 报告状态 - ReportStatusEnum */
export type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'CONFIRMED' | 'ARCHIVED'

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  DRAFT: '起草中',
  SUBMITTED: '已提交',
  RETURNED: '已退回',
  CONFIRMED: '已确认',
  ARCHIVED: '已归档',
}

export const REPORT_STATUS_COLOR: Record<ReportStatus, string> = {
  DRAFT: 'default',
  SUBMITTED: 'blue',
  RETURNED: 'orange',
  CONFIRMED: 'green',
  ARCHIVED: 'gold',
}

/** 报告三格式导出状态 - ReportExportStatusEnum */
export type ReportExportStatus = 'IDLE' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export const REPORT_EXPORT_STATUS_LABEL: Record<ReportExportStatus, string> = {
  IDLE: '未导出',
  PENDING: '待导出',
  PROCESSING: '导出中',
  COMPLETED: '已导出',
  FAILED: '导出失败',
}

export const REPORT_EXPORT_STATUS_COLOR: Record<ReportExportStatus, string> = {
  IDLE: 'default',
  PENDING: 'processing',
  PROCESSING: 'processing',
  COMPLETED: 'green',
  FAILED: 'red',
}

/** 报告类型 - ReportTypeEnum */
export type ReportType
  = | 'COURSE_ACHIEVEMENT'
    | 'PROGRAM_QUALITY'
    | 'IMPROVEMENT'
    | 'AUDIT_EVALUATION_RECTIFICATION'

export const REPORT_TYPE_LABEL: Record<ReportType, string> = {
  COURSE_ACHIEVEMENT: '课程目标达成情况评价报告',
  PROGRAM_QUALITY: '专业质量分析报告',
  IMPROVEMENT: '持续改进报告',
  AUDIT_EVALUATION_RECTIFICATION: '审核评估整改报告',
}

/** 归档业务类型 - ArchiveBusinessTypeEnum */
export type ArchiveBusinessType
  = | 'TRAINING_PLAN'
    | 'GRADUATION_REQUIREMENT'
    | 'COURSE_GOAL'
    | 'SCORE_BATCH'
    | 'ACHIEVEMENT_RESULT'
    | 'AI_RESULT'
    | 'REPORT'
    | 'IMPROVEMENT_TASK'
    | 'EXPERT_PACKAGE'
    | 'AUDIT_RECTIFICATION'

export const ARCHIVE_BUSINESS_TYPE_LABEL: Record<ArchiveBusinessType, string> = {
  TRAINING_PLAN: '培养方案',
  GRADUATION_REQUIREMENT: '毕业要求',
  COURSE_GOAL: '课程目标',
  SCORE_BATCH: '成绩导入批次',
  ACHIEVEMENT_RESULT: '达成度计算结果',
  AI_RESULT: 'AI 结果',
  REPORT: '报告',
  IMPROVEMENT_TASK: '持续改进任务',
  EXPERT_PACKAGE: '行业专家评审材料包',
  AUDIT_RECTIFICATION: '审核评估整改材料',
}

/** 专家材料包类型 */
export type ExpertPackageType = 'REQUIREMENT' | 'PROGRAM_ACCREDITATION'

export const EXPERT_PACKAGE_TYPE_LABEL: Record<ExpertPackageType, string> = {
  REQUIREMENT: '按毕业要求整包',
  PROGRAM_ACCREDITATION: '按专业认证整包',
}

/** 课程目标支撑等级 - 对应 SupportLevelEnum */
export type SupportLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export const SUPPORT_LEVEL_LABEL: Record<SupportLevel, string> = {
  HIGH: '强支撑 H',
  MEDIUM: '中支撑 M',
  LOW: '弱支撑 L',
}

export const SUPPORT_LEVEL_COLOR: Record<SupportLevel, string> = {
  HIGH: 'red',
  MEDIUM: 'orange',
  LOW: 'blue',
}

export const SUPPORT_LEVEL_DEFAULT_FACTOR: Record<SupportLevel, number> = {
  HIGH: 1.0,
  MEDIUM: 0.8,
  LOW: 0.6,
}

/** 认证类型 - AccreditationTypeEnum */
export type AccreditationType
  = | 'ENGINEERING_ACCREDITATION'
    | 'TEACHER_ACCREDITATION'
    | 'MEDICAL_HEALTH_ACCREDITATION'
    | 'ART_DESIGN_QUALITY_EVALUATION'
    | 'ECONOMICS_FINANCE_QUALITY_EVALUATION'
    | 'LAW_QUALITY_EVALUATION'
    | 'AGRICULTURE_ACCREDITATION'
    | 'GENERAL_QUALITY_EVALUATION'

export const ACCREDITATION_TYPE_LABEL: Record<AccreditationType, string> = {
  ENGINEERING_ACCREDITATION: '工程教育专业认证',
  TEACHER_ACCREDITATION: '师范类专业认证',
  MEDICAL_HEALTH_ACCREDITATION: '医学健康类专业认证',
  ART_DESIGN_QUALITY_EVALUATION: '艺术与设计类专业质量评价',
  ECONOMICS_FINANCE_QUALITY_EVALUATION: '财经类专业质量评价',
  LAW_QUALITY_EVALUATION: '法学类专业质量评价',
  AGRICULTURE_ACCREDITATION: '农学类专业认证或质量评价',
  GENERAL_QUALITY_EVALUATION: '普通高等学校教学质量评价',
}

/** 评价方法 - EvaluationMethodEnum */
export type EvaluationMethod
  = | 'DIRECT_ONLY'
    | 'DIRECT_INDIRECT_WEIGHTED'
    | 'MANUAL_REVIEW_CONFIRMED'

export const EVALUATION_METHOD_LABEL: Record<EvaluationMethod, string> = {
  DIRECT_ONLY: '仅直接评价',
  DIRECT_INDIRECT_WEIGHTED: '直接评价与间接评价加权',
  MANUAL_REVIEW_CONFIRMED: '人工审核确认',
}

/** 聚合函数 - AggregationFunctionEnum */
export type AggregationFunction
  = | 'WEIGHTED_SUM'
    | 'MINIMUM'
    | 'WEIGHTED_MINIMUM_MIXED'
    | 'DIRECT_INDIRECT_WEIGHTED'

export const AGGREGATION_FUNCTION_LABEL: Record<AggregationFunction, string> = {
  WEIGHTED_SUM: '加权平均',
  MINIMUM: '取最小值',
  WEIGHTED_MINIMUM_MIXED: '加权与最小值混合',
  DIRECT_INDIRECT_WEIGHTED: '直接间接加权',
}

/** 评价工作组层级 - WorkgroupLevelEnum */
export type WorkgroupLevel = 'UNIVERSITY' | 'COLLEGE' | 'PROGRAM' | 'INDUSTRY'

export const WORKGROUP_LEVEL_LABEL: Record<WorkgroupLevel, string> = {
  UNIVERSITY: '学校级',
  COLLEGE: '学院级',
  PROGRAM: '专业级',
  INDUSTRY: '行业企业专家组',
}

/** 审核评估问题状态 - AuditIssueStatusEnum */
export type AuditIssueStatus
  = | 'OPEN'
    | 'IN_RECTIFICATION'
    | 'RECTIFIED'
    | 'VERIFIED'
    | 'CLOSED'

export const AUDIT_ISSUE_STATUS_LABEL: Record<AuditIssueStatus, string> = {
  OPEN: '待整改',
  IN_RECTIFICATION: '整改中',
  RECTIFIED: '已整改',
  VERIFIED: '已复核',
  CLOSED: '已闭环',
}

export const AUDIT_ISSUE_STATUS_COLOR: Record<AuditIssueStatus, string> = {
  OPEN: 'orange',
  IN_RECTIFICATION: 'blue',
  RECTIFIED: 'cyan',
  VERIFIED: 'purple',
  CLOSED: 'green',
}

/** 审核评估整改任务状态 - AuditRectificationStatusEnum */
export type AuditRectificationStatus
  = | 'PLANNED'
    | 'IN_PROGRESS'
    | 'SUBMITTED'
    | 'VERIFIED'
    | 'RETURNED'
    | 'CLOSED'

export const AUDIT_RECTIFICATION_STATUS_LABEL: Record<AuditRectificationStatus, string> = {
  PLANNED: '已规划',
  IN_PROGRESS: '进行中',
  SUBMITTED: '已提交',
  VERIFIED: '复核通过',
  RETURNED: '已退回',
  CLOSED: '已闭环',
}

export const AUDIT_RECTIFICATION_STATUS_COLOR: Record<AuditRectificationStatus, string> = {
  PLANNED: 'default',
  IN_PROGRESS: 'blue',
  SUBMITTED: 'cyan',
  VERIFIED: 'purple',
  RETURNED: 'orange',
  CLOSED: 'green',
}

/** 督导复查类型 */
export type AuditSupervisionType
  = | 'DAILY'
    | 'SPECIAL'
    | 'PRE_AUDIT'
    | 'SITE_VISIT'

export const AUDIT_SUPERVISION_TYPE_LABEL: Record<AuditSupervisionType, string> = {
  DAILY: '日常督导',
  SPECIAL: '专项检查',
  PRE_AUDIT: '认证预审',
  SITE_VISIT: '认证现场检查',
}

/** 量表类型 - ScaleTypeEnum */
export type ScaleType
  = | 'FIVE_LEVEL'
    | 'FOUR_LEVEL'
    | 'TEN_POINT'
    | 'PERCENTAGE'
    | 'CUSTOM'

export const SCALE_TYPE_LABEL: Record<ScaleType, string> = {
  FIVE_LEVEL: '五级量表',
  FOUR_LEVEL: '四级量表',
  TEN_POINT: '十分量表',
  PERCENTAGE: '百分量表',
  CUSTOM: '自定义量表',
}

/** 考核环节类型 - AssessmentItemTypeEnum */
export type AssessmentItemType
  = | 'FINAL_EXAM'
    | 'HOMEWORK'
    | 'EXPERIMENT'
    | 'COURSE_DESIGN'
    | 'INTERNSHIP'
    | 'DISSERTATION'
    | 'PROCESS_NODE'
    | 'PROJECT_MILESTONE'
    | 'CASE_STUDY'
    | 'DEFENSE'
    | 'WORK_PORTFOLIO'
    | 'FIELD_TRIAL'
    | 'CLINICAL_PRACTICE'

export const ASSESSMENT_ITEM_TYPE_LABEL: Record<AssessmentItemType, string> = {
  FINAL_EXAM: '期末考试',
  HOMEWORK: '作业',
  EXPERIMENT: '实验',
  COURSE_DESIGN: '课程设计',
  INTERNSHIP: '实习实训',
  DISSERTATION: '毕业论文或设计',
  PROCESS_NODE: '过程性评价节点',
  PROJECT_MILESTONE: '项目里程碑',
  CASE_STUDY: '案例研讨',
  DEFENSE: '答辩',
  WORK_PORTFOLIO: '作品集',
  FIELD_TRIAL: '田间或现场试验',
  CLINICAL_PRACTICE: '临床实习与轮转',
}

/** 五育维度标签 */
export type CivicDimension = 'MORAL' | 'INTELLECTUAL' | 'PHYSICAL' | 'AESTHETIC' | 'LABOR'

export const CIVIC_DIMENSION_LABEL: Record<CivicDimension, string> = {
  MORAL: '德',
  INTELLECTUAL: '智',
  PHYSICAL: '体',
  AESTHETIC: '美',
  LABOR: '劳',
}

/** AI 供应商类型 - edu-common AiProviderType */
export type AiProviderType = 'OPENAI' | 'DEEPSEEK' | 'QWEN'

export const AI_PROVIDER_TYPE_LABEL: Record<AiProviderType, string> = {
  OPENAI: 'OpenAI',
  DEEPSEEK: 'DeepSeek',
  QWEN: '通义千问',
}

/** 外部数据源类型 - ExternalSourceTypeEnum */
export type ExternalSourceType
  = | 'POSTGRESQL'
    | 'MYSQL'
    | 'ORACLE'
    | 'SQLSERVER'
    | 'DM'
    | 'KINGBASE'

export const EXTERNAL_SOURCE_TYPE_LABEL: Record<ExternalSourceType, string> = {
  POSTGRESQL: 'PostgreSQL',
  MYSQL: 'MySQL',
  ORACLE: 'Oracle',
  SQLSERVER: 'SQL Server',
  DM: '达梦',
  KINGBASE: '人大金仓',
}

/** 外部拔取任务状态 - ExternalPullTaskStatusEnum */
export type ExternalPullTaskStatus
  = | 'PENDING'
    | 'RUNNING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELLED'

export const EXTERNAL_PULL_TASK_STATUS_LABEL: Record<ExternalPullTaskStatus, string> = {
  PENDING: '待处理',
  RUNNING: '执行中',
  SUCCEEDED: '成功',
  FAILED: '失败',
  CANCELLED: '已取消',
}

export const EXTERNAL_PULL_TASK_STATUS_COLOR: Record<ExternalPullTaskStatus, string> = {
  PENDING: 'default',
  RUNNING: 'blue',
  SUCCEEDED: 'green',
  FAILED: 'red',
  CANCELLED: 'orange',
}

/** 外部数据拔取审计事件 - ExternalPullAuditEventEnum */
export type ExternalPullAuditEvent
  = | 'SQL_SAFETY_CHECK'
    | 'FIELD_WHITELIST_CHECK'
    | 'MASK_PREVIEW_CHECK'
    | 'QUERY_TIMEOUT'
    | 'ROW_LIMIT_EXCEEDED'
    | 'TASK_FAILED'
    | 'TASK_SUCCEEDED'
    | 'MANUAL_REJECT'
    | 'MANUAL_CONFIRM'
    | 'TASK_CANCELLED'

export const EXTERNAL_PULL_AUDIT_EVENT_LABEL: Record<ExternalPullAuditEvent, string> = {
  SQL_SAFETY_CHECK: 'SQL 安全检测',
  FIELD_WHITELIST_CHECK: '字段白名单校验',
  MASK_PREVIEW_CHECK: '脱敏预览检查',
  QUERY_TIMEOUT: '查询超时',
  ROW_LIMIT_EXCEEDED: '返回行数超限',
  TASK_FAILED: '任务执行失败',
  TASK_SUCCEEDED: '任务执行完成',
  MANUAL_REJECT: '人工驳回',
  MANUAL_CONFIRM: '人工确认',
  TASK_CANCELLED: '任务取消',
}

/** 外部数据拔取审计检查状态 */
export type ExternalPullAuditCheckStatus = 'PASSED' | 'REJECTED' | 'WARNING'

export const EXTERNAL_PULL_AUDIT_CHECK_STATUS_LABEL: Record<ExternalPullAuditCheckStatus, string> = {
  PASSED: '通过',
  REJECTED: '拒绝',
  WARNING: '预警',
}

/** 外部拔取结果确认状态 - ExternalPullConfirmationStatusEnum */
export type ExternalPullConfirmationStatus = 'PREVIEW' | 'CONFIRMED' | 'REJECTED'

export const EXTERNAL_PULL_CONFIRMATION_STATUS_LABEL: Record<ExternalPullConfirmationStatus, string> = {
  PREVIEW: '预览中',
  CONFIRMED: '已确认',
  REJECTED: '已驳回',
}

export const EXTERNAL_PULL_CONFIRMATION_STATUS_COLOR: Record<ExternalPullConfirmationStatus, string> = {
  PREVIEW: 'orange',
  CONFIRMED: 'green',
  REJECTED: 'red',
}

/** SQL 安全检测状态 - SqlSafetyStatusEnum */
export type SqlSafetyStatus = 'PASSED' | 'REJECTED' | 'ERROR'

export const SQL_SAFETY_STATUS_LABEL: Record<SqlSafetyStatus, string> = {
  PASSED: '通过',
  REJECTED: '拒绝',
  ERROR: '检测异常',
}

export const SQL_SAFETY_STATUS_COLOR: Record<SqlSafetyStatus, string> = {
  PASSED: 'green',
  REJECTED: 'red',
  ERROR: 'orange',
}

/**
 * 通用配置 / 数据确认状态 - 对应 ConfirmationStatusEnum
 *  覆盖培养方案、专业算法实例、过程性评价节点、达成度计算输入等场景
 */
export type ConfirmationStatus = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'RETURNED'

export const CONFIRMATION_STATUS_LABEL: Record<ConfirmationStatus, string> = {
  DRAFT: '起草',
  SUBMITTED: '已提交',
  CONFIRMED: '已确认',
  RETURNED: '已退回',
}

export const CONFIRMATION_STATUS_COLOR: Record<ConfirmationStatus, string> = {
  DRAFT: 'default',
  SUBMITTED: 'blue',
  CONFIRMED: 'green',
  RETURNED: 'orange',
}

/** 数据接入模式 - 对应 DataSourceModeEnum */
export type DataSourceMode
  = | 'EXCEL_IMPORT'
    | 'EXTERNAL_AI_CONNECTOR'
    | 'READ_ONLY_DATABASE_PULL'
    | 'MANUAL_CONFIRMATION'
    | 'EDU_MARK_EXAM'
    | 'EDU_MARK_FINAL_SCORE'

export const DATA_SOURCE_MODE_LABEL: Record<DataSourceMode, string> = {
  EXCEL_IMPORT: 'Excel 异步导入',
  EXTERNAL_AI_CONNECTOR: '外部 AI 解析草稿',
  READ_ONLY_DATABASE_PULL: '只读数据库主动拔取',
  MANUAL_CONFIRMATION: '人工录入与确认',
  EDU_MARK_EXAM: '阅卷中心考试环节',
  EDU_MARK_FINAL_SCORE: '阅卷中心最终成绩',
}

/** 过程性评价节点类型 - 对应 ProcessNodeTypeEnum */
export type ProcessNodeType
  = | 'CLASS_INTERACTION'
    | 'STAGE_HOMEWORK'
    | 'PROJECT_MILESTONE'
    | 'LAB_RECORD'
    | 'PRACTICE_LOG'
    | 'WORK_ITERATION'
    | 'CASE_DISCUSSION'
    | 'INTERNSHIP_EVALUATION'

export const PROCESS_NODE_TYPE_LABEL: Record<ProcessNodeType, string> = {
  CLASS_INTERACTION: '课堂互动',
  STAGE_HOMEWORK: '阶段作业',
  PROJECT_MILESTONE: '项目里程碑',
  LAB_RECORD: '实验记录',
  PRACTICE_LOG: '实践日志',
  WORK_ITERATION: '作品迭代',
  CASE_DISCUSSION: '案例研讨',
  INTERNSHIP_EVALUATION: '实习过程评价',
}

/** 间接评价应答人类型 - 对应 RespondentTypeEnum */
export type RespondentType
  = | 'STUDENT'
    | 'GRADUATE'
    | 'EMPLOYER'
    | 'TEACHER'
    | 'EXPERT'
    | 'SUPERVISOR'

export const RESPONDENT_TYPE_LABEL: Record<RespondentType, string> = {
  STUDENT: '在校学生',
  GRADUATE: '毕业生',
  EMPLOYER: '用人单位',
  TEACHER: '任课教师',
  EXPERT: '校外专家',
  SUPERVISOR: '教学督导',
}

/** 间接评价问卷类型 - 对应 IndirectFormTypeEnum */
export type IndirectFormType
  = | 'STUDENT_SELF'
    | 'GRADUATE_TRACKING'
    | 'EMPLOYER_FEEDBACK'
    | 'TEACHER_EVALUATION'
    | 'EXPERT_EVALUATION'
    | 'SUPERVISOR_EVALUATION'

export const INDIRECT_FORM_TYPE_LABEL: Record<IndirectFormType, string> = {
  STUDENT_SELF: '学生自评',
  GRADUATE_TRACKING: '毕业生跟踪',
  EMPLOYER_FEEDBACK: '用人单位反馈',
  TEACHER_EVALUATION: '教师评价',
  EXPERT_EVALUATION: '行业或校外专家评价',
  SUPERVISOR_EVALUATION: '教学督导评价',
}

// ─── 类型守卫 ──────────────────────────────────────────────────
// 视图层从 a-table slot/通用 record 字段解析后端字符串字段时，
// 必须通过下列守卫将 string 收窄到具体枚举字面量再访问 LABEL/COLOR Record。
// 严禁使用 `as keyof typeof` 类型断言把任意 string 强行变成枚举类型。

export function isAchievementStatus(value: unknown): value is AchievementStatus {
  return (
    value === 'ACHIEVED'
    || value === 'PARTIALLY_ACHIEVED'
    || value === 'NOT_ACHIEVED'
    || value === 'INSUFFICIENT_EVIDENCE'
  )
}

export function isAchievementAuditStatus(value: unknown): value is AchievementAuditStatus {
  return (
    value === 'DRAFT'
    || value === 'CALCULATED'
    || value === 'SUBMITTED'
    || value === 'CONFIRMED'
    || value === 'RETURNED'
    || value === 'ARCHIVED'
  )
}

export function isAchievementTargetType(value: unknown): value is AchievementTargetType {
  return (
    value === 'COURSE_GOAL'
    || value === 'REQUIREMENT_INDICATOR'
    || value === 'GRADUATION_REQUIREMENT'
    || value === 'TRAINING_OBJECTIVE'
    || value === 'PROGRAM_SUMMARY'
    || value === 'CIVIC_GOAL_AGGREGATE'
    || value === 'COMPLEX_ENGINEERING_AGGREGATE'
  )
}

export function isAiTaskStatus(value: unknown): value is AiTaskStatus {
  return (
    value === 'PENDING'
    || value === 'PROCESSING'
    || value === 'SUCCEEDED'
    || value === 'FAILED'
    || value === 'CANCELLED'
  )
}

export function isAiTaskType(value: unknown): value is AiTaskType {
  return (
    value === 'SYLLABUS_PARSE'
    || value === 'TRAINING_PLAN_PARSE'
    || value === 'ACHIEVEMENT_DIAGNOSIS'
    || value === 'COURSE_REPORT_GENERATE'
    || value === 'PROGRAM_REPORT_GENERATE'
    || value === 'IMPROVEMENT_SUGGESTION_GENERATE'
    || value === 'MATERIAL_QA'
    || value === 'INDIRECT_RESPONSE_DOC_PARSE'
  )
}

export function isImprovementTaskStatus(value: unknown): value is ImprovementTaskStatus {
  return (
    value === 'OPEN'
    || value === 'IN_PROGRESS'
    || value === 'SUBMITTED'
    || value === 'REVIEWED'
    || value === 'CLOSED'
    || value === 'RETURNED'
  )
}

export function isScoreBatchStatus(value: unknown): value is ScoreBatchStatus {
  return (
    value === 'PENDING'
    || value === 'PARSING'
    || value === 'PREVIEW_READY'
    || value === 'VALIDATED'
    || value === 'CONFIRMED'
    || value === 'FAILED'
    || value === 'CANCELLED'
  )
}

export function isReportStatus(value: unknown): value is ReportStatus {
  return (
    value === 'DRAFT'
    || value === 'SUBMITTED'
    || value === 'RETURNED'
    || value === 'CONFIRMED'
    || value === 'ARCHIVED'
  )
}

export function isReportExportStatus(value: unknown): value is ReportExportStatus {
  return (
    value === 'IDLE'
    || value === 'PENDING'
    || value === 'PROCESSING'
    || value === 'COMPLETED'
    || value === 'FAILED'
  )
}

export function isReportType(value: unknown): value is ReportType {
  return (
    value === 'COURSE_ACHIEVEMENT'
    || value === 'PROGRAM_QUALITY'
    || value === 'IMPROVEMENT'
    || value === 'AUDIT_EVALUATION_RECTIFICATION'
  )
}

export function isExternalPullTaskStatus(value: unknown): value is ExternalPullTaskStatus {
  return (
    value === 'PENDING'
    || value === 'RUNNING'
    || value === 'SUCCEEDED'
    || value === 'FAILED'
    || value === 'CANCELLED'
  )
}

export function isExternalPullAuditEvent(value: unknown): value is ExternalPullAuditEvent {
  return (
    value === 'SQL_SAFETY_CHECK'
    || value === 'FIELD_WHITELIST_CHECK'
    || value === 'MASK_PREVIEW_CHECK'
    || value === 'QUERY_TIMEOUT'
    || value === 'ROW_LIMIT_EXCEEDED'
    || value === 'TASK_FAILED'
    || value === 'TASK_SUCCEEDED'
    || value === 'MANUAL_REJECT'
    || value === 'MANUAL_CONFIRM'
    || value === 'TASK_CANCELLED'
  )
}

export function isExternalPullAuditCheckStatus(value: unknown): value is ExternalPullAuditCheckStatus {
  return value === 'PASSED' || value === 'REJECTED' || value === 'WARNING'
}

export function isExternalPullConfirmationStatus(value: unknown): value is ExternalPullConfirmationStatus {
  return value === 'PREVIEW' || value === 'CONFIRMED' || value === 'REJECTED'
}

export function isAuditIssueStatus(value: unknown): value is AuditIssueStatus {
  return (
    value === 'OPEN'
    || value === 'IN_RECTIFICATION'
    || value === 'RECTIFIED'
    || value === 'VERIFIED'
    || value === 'CLOSED'
  )
}

export function isAuditRectificationStatus(value: unknown): value is AuditRectificationStatus {
  return (
    value === 'PLANNED'
    || value === 'IN_PROGRESS'
    || value === 'SUBMITTED'
    || value === 'VERIFIED'
    || value === 'RETURNED'
    || value === 'CLOSED'
  )
}

export function isConfirmationStatus(value: unknown): value is ConfirmationStatus {
  return (
    value === 'DRAFT'
    || value === 'SUBMITTED'
    || value === 'CONFIRMED'
    || value === 'RETURNED'
  )
}

export function isSupportLevel(value: unknown): value is SupportLevel {
  return value === 'HIGH' || value === 'MEDIUM' || value === 'LOW'
}

export function isAiOutputValidation(value: unknown): value is AiOutputValidation {
  return value === 'PASSED' || value === 'REJECTED' || value === 'WARN'
}

export function isAiHealthStatus(value: unknown): value is AiHealthStatus {
  return value === 'UNKNOWN' || value === 'HEALTHY' || value === 'FAILED'
}

export function isSqlSafetyStatus(value: unknown): value is SqlSafetyStatus {
  return value === 'PASSED' || value === 'REJECTED' || value === 'ERROR'
}

export function isAccreditationType(value: unknown): value is AccreditationType {
  return (
    value === 'ENGINEERING_ACCREDITATION'
    || value === 'TEACHER_ACCREDITATION'
    || value === 'MEDICAL_HEALTH_ACCREDITATION'
    || value === 'ART_DESIGN_QUALITY_EVALUATION'
    || value === 'ECONOMICS_FINANCE_QUALITY_EVALUATION'
    || value === 'LAW_QUALITY_EVALUATION'
    || value === 'AGRICULTURE_ACCREDITATION'
    || value === 'GENERAL_QUALITY_EVALUATION'
  )
}

export function isEvaluationMethod(value: unknown): value is EvaluationMethod {
  return (
    value === 'DIRECT_ONLY'
    || value === 'DIRECT_INDIRECT_WEIGHTED'
    || value === 'MANUAL_REVIEW_CONFIRMED'
  )
}

export function isAggregationFunction(value: unknown): value is AggregationFunction {
  return (
    value === 'WEIGHTED_SUM'
    || value === 'MINIMUM'
    || value === 'WEIGHTED_MINIMUM_MIXED'
    || value === 'DIRECT_INDIRECT_WEIGHTED'
  )
}

export function isWorkgroupLevel(value: unknown): value is WorkgroupLevel {
  return (
    value === 'UNIVERSITY'
    || value === 'COLLEGE'
    || value === 'PROGRAM'
    || value === 'INDUSTRY'
  )
}

export function isAssessmentItemType(value: unknown): value is AssessmentItemType {
  return (
    value === 'FINAL_EXAM'
    || value === 'HOMEWORK'
    || value === 'EXPERIMENT'
    || value === 'COURSE_DESIGN'
    || value === 'INTERNSHIP'
    || value === 'DISSERTATION'
    || value === 'PROCESS_NODE'
    || value === 'PROJECT_MILESTONE'
    || value === 'CASE_STUDY'
    || value === 'DEFENSE'
    || value === 'WORK_PORTFOLIO'
    || value === 'FIELD_TRIAL'
    || value === 'CLINICAL_PRACTICE'
  )
}

export function isCivicDimension(value: unknown): value is CivicDimension {
  return (
    value === 'MORAL'
    || value === 'INTELLECTUAL'
    || value === 'PHYSICAL'
    || value === 'AESTHETIC'
    || value === 'LABOR'
  )
}

export function isAiProviderType(value: unknown): value is AiProviderType {
  return value === 'OPENAI' || value === 'DEEPSEEK' || value === 'QWEN'
}

export function isExternalSourceType(value: unknown): value is ExternalSourceType {
  return (
    value === 'POSTGRESQL'
    || value === 'MYSQL'
    || value === 'ORACLE'
    || value === 'SQLSERVER'
    || value === 'DM'
    || value === 'KINGBASE'
  )
}

export function isDataSourceMode(value: unknown): value is DataSourceMode {
  return (
    value === 'EXCEL_IMPORT'
    || value === 'EXTERNAL_AI_CONNECTOR'
    || value === 'READ_ONLY_DATABASE_PULL'
    || value === 'MANUAL_CONFIRMATION'
    || value === 'EDU_MARK_EXAM'
    || value === 'EDU_MARK_FINAL_SCORE'
  )
}

export function isProcessNodeType(value: unknown): value is ProcessNodeType {
  return (
    value === 'CLASS_INTERACTION'
    || value === 'STAGE_HOMEWORK'
    || value === 'PROJECT_MILESTONE'
    || value === 'LAB_RECORD'
    || value === 'PRACTICE_LOG'
    || value === 'WORK_ITERATION'
    || value === 'CASE_DISCUSSION'
    || value === 'INTERNSHIP_EVALUATION'
  )
}

export function isRespondentType(value: unknown): value is RespondentType {
  return (
    value === 'STUDENT'
    || value === 'GRADUATE'
    || value === 'EMPLOYER'
    || value === 'TEACHER'
    || value === 'EXPERT'
    || value === 'SUPERVISOR'
  )
}

export function isIndirectFormType(value: unknown): value is IndirectFormType {
  return (
    value === 'STUDENT_SELF'
    || value === 'GRADUATE_TRACKING'
    || value === 'EMPLOYER_FEEDBACK'
    || value === 'TEACHER_EVALUATION'
    || value === 'EXPERT_EVALUATION'
    || value === 'SUPERVISOR_EVALUATION'
  )
}

export function isScaleType(value: unknown): value is ScaleType {
  return (
    value === 'FIVE_LEVEL'
    || value === 'FOUR_LEVEL'
    || value === 'TEN_POINT'
    || value === 'PERCENTAGE'
    || value === 'CUSTOM'
  )
}

export function isExpertPackageType(value: unknown): value is ExpertPackageType {
  return value === 'REQUIREMENT' || value === 'PROGRAM_ACCREDITATION'
}

export function isArchiveBusinessType(value: unknown): value is ArchiveBusinessType {
  return (
    value === 'TRAINING_PLAN'
    || value === 'GRADUATION_REQUIREMENT'
    || value === 'COURSE_GOAL'
    || value === 'SCORE_BATCH'
    || value === 'ACHIEVEMENT_RESULT'
    || value === 'AI_RESULT'
    || value === 'REPORT'
    || value === 'IMPROVEMENT_TASK'
    || value === 'EXPERT_PACKAGE'
    || value === 'AUDIT_RECTIFICATION'
  )
}

export function isAiTaskBusinessType(value: unknown): value is AiTaskBusinessType {
  return (
    value === 'ACHIEVEMENT_RESULT'
    || value === 'QUALITY_COURSE'
    || value === 'TRAINING_PLAN'
    || value === 'REPORT'
    || value === 'INDIRECT_FORM'
  )
}

export function isAuditSupervisionType(value: unknown): value is AuditSupervisionType {
  return (
    value === 'DAILY' || value === 'SPECIAL' || value === 'PRE_AUDIT' || value === 'SITE_VISIT'
  )
}

export function isManualReviewDecision(value: unknown): value is ManualReviewDecision {
  return value === 'CONFIRMED' || value === 'RETURNED' || value === 'ARCHIVED'
}

export function isAchievementDetailType(value: unknown): value is AchievementDetailType {
  return (
    value === 'ASSESSMENT_ITEM'
    || value === 'COURSE_GOAL'
    || value === 'INDICATOR'
    || value === 'REQUIREMENT'
  )
}

export function isAiManualHandlingStatus(value: unknown): value is AiManualHandlingStatus {
  return (
    value === 'NONE'
    || value === 'PENDING'
    || value === 'IN_PROGRESS'
    || value === 'RESOLVED'
    || value === 'IGNORED'
  )
}
