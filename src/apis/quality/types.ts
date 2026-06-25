/**
 * 教学质量评价 API 共享类型 - 对应 edu-quality 模块
 *
 * 后端约束：
 * - 业务写操作与复杂查询使用 POST + DTO；模板下载、公开问卷读取等只读资源可使用 GET；禁止 PUT / DELETE / PATCH
 * - 租户与操作人由 UserHold 注入，前端只传业务字段
 * - 后端 Long ID 全部以 string 表达到前端，避免 JS Number 精度丢失
 */
import type { BadgeTone } from '@/components/ui-guide/ui/types'

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

export const ACHIEVEMENT_AUDIT_STATUS_COLOR: Record<AchievementAuditStatus, BadgeTone> = {
  DRAFT: 'gray',
  CALCULATED: 'blue',
  SUBMITTED: 'blue',
  CONFIRMED: 'green',
  RETURNED: 'orange',
  ARCHIVED: 'yellow',
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

export const MANUAL_REVIEW_DECISION_COLOR: Record<ManualReviewDecision, BadgeTone> = {
  CONFIRMED: 'green',
  RETURNED: 'orange',
  ARCHIVED: 'yellow',
}

export const ACHIEVEMENT_STATUS_COLOR: Record<AchievementStatus, BadgeTone> = {
  ACHIEVED: 'green',
  PARTIALLY_ACHIEVED: 'orange',
  NOT_ACHIEVED: 'red',
  INSUFFICIENT_EVIDENCE: 'gray',
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

export const AI_TASK_STATUS_COLOR: Record<AiTaskStatus, BadgeTone> = {
  PENDING: 'gray',
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
    | 'PORTFOLIO_CERTIFICATE_OCR'
    | 'PORTFOLIO_DOCUMENT_PARSE'
    | 'PORTFOLIO_POLICY_MATCH'
    | 'PORTFOLIO_REPORT_GENERATE'

export const AI_TASK_TYPE_LABEL: Record<AiTaskType, string> = {
  SYLLABUS_PARSE: '课程大纲解析',
  TRAINING_PLAN_PARSE: '培养方案解析',
  ACHIEVEMENT_DIAGNOSIS: '达成度诊断',
  COURSE_REPORT_GENERATE: '课程目标达成报告生成',
  PROGRAM_REPORT_GENERATE: '专业质量分析报告生成',
  IMPROVEMENT_SUGGESTION_GENERATE: '改进措施生成',
  MATERIAL_QA: '材料问答',
  INDIRECT_RESPONSE_DOC_PARSE: '间接评价答卷文档解析',
  PORTFOLIO_CERTIFICATE_OCR: '档案袋证书 OCR 抽取',
  PORTFOLIO_DOCUMENT_PARSE: '档案袋文档结构化抽取',
  PORTFOLIO_POLICY_MATCH: '档案袋政策条款匹配',
  PORTFOLIO_REPORT_GENERATE: '档案袋报告初稿生成',
}

/** AI 任务业务类型 - AiTaskSubmitRequest.businessType */
export type AiTaskBusinessType
  = | 'ACHIEVEMENT_RESULT'
    | 'QUALITY_COURSE'
    | 'TRAINING_PLAN'
    | 'REPORT'
    | 'INDIRECT_FORM'
    | 'PORTFOLIO_MATERIAL'
    | 'PORTFOLIO_EVALUATION'

export const AI_TASK_BUSINESS_TYPE_LABEL: Record<AiTaskBusinessType, string> = {
  ACHIEVEMENT_RESULT: '达成度计算结果',
  QUALITY_COURSE: '质量评价课程',
  TRAINING_PLAN: '培养方案',
  REPORT: '质量报告',
  INDIRECT_FORM: '间接评价问卷',
  PORTFOLIO_MATERIAL: '教学档案袋材料',
  PORTFOLIO_EVALUATION: '教学档案袋评价任务',
}

/** AI 输出校验结果 - AiOutputValidationEnum */
export type AiOutputValidation = 'PASSED' | 'REJECTED' | 'WARN'

export const AI_OUTPUT_VALIDATION_LABEL: Record<AiOutputValidation, string> = {
  PASSED: '通过',
  REJECTED: '拒绝',
  WARN: '警告',
}

export const AI_OUTPUT_VALIDATION_COLOR: Record<AiOutputValidation, BadgeTone> = {
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

export const AI_HEALTH_STATUS_COLOR: Record<AiHealthStatus, BadgeTone> = {
  UNKNOWN: 'gray',
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

export const SCORE_BATCH_STATUS_COLOR: Record<ScoreBatchStatus, BadgeTone> = {
  PENDING: 'gray',
  PARSING: 'blue',
  PREVIEW_READY: 'orange',
  VALIDATED: 'blue',
  CONFIRMED: 'green',
  FAILED: 'red',
  CANCELLED: 'gray',
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

export const IMPROVEMENT_TASK_STATUS_COLOR: Record<ImprovementTaskStatus, BadgeTone> = {
  OPEN: 'orange',
  IN_PROGRESS: 'blue',
  SUBMITTED: 'blue',
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

export const REPORT_STATUS_COLOR: Record<ReportStatus, BadgeTone> = {
  DRAFT: 'gray',
  SUBMITTED: 'blue',
  RETURNED: 'orange',
  CONFIRMED: 'green',
  ARCHIVED: 'yellow',
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

export const REPORT_EXPORT_STATUS_COLOR: Record<ReportExportStatus, BadgeTone> = {
  IDLE: 'gray',
  PENDING: 'blue',
  PROCESSING: 'blue',
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

/** 报告类型编码全集，筛选项与后端 ReportTypeEnum 逐值对齐 */
export const REPORT_TYPE_CODES: ReportType[] = [
  'COURSE_ACHIEVEMENT',
  'PROGRAM_QUALITY',
  'IMPROVEMENT',
  'AUDIT_EVALUATION_RECTIFICATION',
]

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

/** 归档业务类型编码全集，筛选项与后端 ArchiveBusinessType 逐值对齐 */
export const ARCHIVE_BUSINESS_TYPE_CODES: ArchiveBusinessType[] = [
  'TRAINING_PLAN',
  'GRADUATION_REQUIREMENT',
  'COURSE_GOAL',
  'SCORE_BATCH',
  'ACHIEVEMENT_RESULT',
  'AI_RESULT',
  'REPORT',
  'IMPROVEMENT_TASK',
  'EXPERT_PACKAGE',
  'AUDIT_RECTIFICATION',
]

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

export const SUPPORT_LEVEL_COLOR: Record<SupportLevel, BadgeTone> = {
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

/** 评价周期 - EvaluationCycleEnum */
export type EvaluationCycle
  = | 'SEMESTER'
    | 'YEAR'
    | 'BIENNIAL'
    | 'TRIENNIAL'
    | 'PROGRAM_CYCLE'

export const EVALUATION_CYCLE_LABEL: Record<EvaluationCycle, string> = {
  SEMESTER: '按学期',
  YEAR: '按学年',
  BIENNIAL: '每两年',
  TRIENNIAL: '每三年',
  PROGRAM_CYCLE: '按培养周期',
}

/** 聚合函数 - AggregationFunctionEnum */
export type AggregationFunction
  = | 'WEIGHTED_SUM'
    | 'MINIMUM'
    | 'DIRECT_INDIRECT_WEIGHTED'

export const AGGREGATION_FUNCTION_LABEL: Record<AggregationFunction, string> = {
  WEIGHTED_SUM: '加权平均',
  MINIMUM: '取最小值',
  DIRECT_INDIRECT_WEIGHTED: '直接间接加权',
}

/** 聚合函数编码全集，与后端 AggregationFunctionEnum 逐值对齐 */
export const AGGREGATION_FUNCTION_CODES: AggregationFunction[] = [
  'WEIGHTED_SUM',
  'MINIMUM',
  'DIRECT_INDIRECT_WEIGHTED',
]

/** 考核评价依据合理性审核状态 - AssessmentRationalityAuditStatusEnum */
export type AssessmentRationalityAuditStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const ASSESSMENT_RATIONALITY_AUDIT_STATUS_LABEL: Record<AssessmentRationalityAuditStatus, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
}

/** 评价工作组层级 - WorkgroupLevelEnum */
export type WorkgroupLevel = 'UNIVERSITY' | 'COLLEGE' | 'PROGRAM' | 'INDUSTRY'

export const WORKGROUP_LEVEL_LABEL: Record<WorkgroupLevel, string> = {
  UNIVERSITY: '学校级',
  COLLEGE: '学院级',
  PROGRAM: '专业级',
  INDUSTRY: '行业企业专家组',
}

/** 评价工作组层级下拉选项，值必须与后端 WorkgroupLevelEnum 完全一致 */
export const WORKGROUP_LEVEL_OPTIONS: Array<{
  label: string
  value: WorkgroupLevel
}> = [
  { value: 'UNIVERSITY', label: WORKGROUP_LEVEL_LABEL.UNIVERSITY },
  { value: 'COLLEGE', label: WORKGROUP_LEVEL_LABEL.COLLEGE },
  { value: 'PROGRAM', label: WORKGROUP_LEVEL_LABEL.PROGRAM },
  { value: 'INDUSTRY', label: WORKGROUP_LEVEL_LABEL.INDUSTRY },
]

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

export const AUDIT_ISSUE_STATUS_COLOR: Record<AuditIssueStatus, BadgeTone> = {
  OPEN: 'orange',
  IN_RECTIFICATION: 'blue',
  RECTIFIED: 'blue',
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

export const AUDIT_RECTIFICATION_STATUS_COLOR: Record<AuditRectificationStatus, BadgeTone> = {
  PLANNED: 'gray',
  IN_PROGRESS: 'blue',
  SUBMITTED: 'blue',
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
export type AiProviderType = 'DEEPSEEK' | 'QWEN'

export const AI_PROVIDER_TYPE_LABEL: Record<AiProviderType, string> = {
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

/** 外部数据源类型下拉选项，值必须与后端 ExternalSourceTypeEnum 完全一致 */
export const EXTERNAL_SOURCE_TYPE_OPTIONS: Array<{
  label: string
  value: ExternalSourceType
}> = [
  { value: 'POSTGRESQL', label: EXTERNAL_SOURCE_TYPE_LABEL.POSTGRESQL },
  { value: 'MYSQL', label: EXTERNAL_SOURCE_TYPE_LABEL.MYSQL },
  { value: 'ORACLE', label: EXTERNAL_SOURCE_TYPE_LABEL.ORACLE },
  { value: 'SQLSERVER', label: EXTERNAL_SOURCE_TYPE_LABEL.SQLSERVER },
  { value: 'DM', label: EXTERNAL_SOURCE_TYPE_LABEL.DM },
  { value: 'KINGBASE', label: EXTERNAL_SOURCE_TYPE_LABEL.KINGBASE },
]

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

export const EXTERNAL_PULL_TASK_STATUS_COLOR: Record<ExternalPullTaskStatus, BadgeTone> = {
  PENDING: 'gray',
  RUNNING: 'blue',
  SUCCEEDED: 'green',
  FAILED: 'red',
  CANCELLED: 'orange',
}

/** 外部拔取任务状态下拉选项，值必须与后端 ExternalPullTaskStatusEnum 完全一致 */
export const EXTERNAL_PULL_TASK_STATUS_OPTIONS: Array<{
  label: string
  value: ExternalPullTaskStatus
}> = [
  { value: 'PENDING', label: EXTERNAL_PULL_TASK_STATUS_LABEL.PENDING },
  { value: 'RUNNING', label: EXTERNAL_PULL_TASK_STATUS_LABEL.RUNNING },
  { value: 'SUCCEEDED', label: EXTERNAL_PULL_TASK_STATUS_LABEL.SUCCEEDED },
  { value: 'FAILED', label: EXTERNAL_PULL_TASK_STATUS_LABEL.FAILED },
  { value: 'CANCELLED', label: EXTERNAL_PULL_TASK_STATUS_LABEL.CANCELLED },
]

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

export const EXTERNAL_PULL_CONFIRMATION_STATUS_COLOR: Record<ExternalPullConfirmationStatus, BadgeTone> = {
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

export const SQL_SAFETY_STATUS_COLOR: Record<SqlSafetyStatus, BadgeTone> = {
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

export const CONFIRMATION_STATUS_COLOR: Record<ConfirmationStatus, BadgeTone> = {
  DRAFT: 'gray',
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
  EDU_MARK_EXAM: '考试阅卷环节',
  EDU_MARK_FINAL_SCORE: '考试阅卷最终成绩',
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

/** 过程性评价节点类型下拉选项，值必须与后端 ProcessNodeTypeEnum 完全一致 */
export const PROCESS_NODE_TYPE_OPTIONS: Array<{
  label: string
  value: ProcessNodeType
}> = [
  { value: 'CLASS_INTERACTION', label: PROCESS_NODE_TYPE_LABEL.CLASS_INTERACTION },
  { value: 'STAGE_HOMEWORK', label: PROCESS_NODE_TYPE_LABEL.STAGE_HOMEWORK },
  { value: 'PROJECT_MILESTONE', label: PROCESS_NODE_TYPE_LABEL.PROJECT_MILESTONE },
  { value: 'LAB_RECORD', label: PROCESS_NODE_TYPE_LABEL.LAB_RECORD },
  { value: 'PRACTICE_LOG', label: PROCESS_NODE_TYPE_LABEL.PRACTICE_LOG },
  { value: 'WORK_ITERATION', label: PROCESS_NODE_TYPE_LABEL.WORK_ITERATION },
  { value: 'CASE_DISCUSSION', label: PROCESS_NODE_TYPE_LABEL.CASE_DISCUSSION },
  { value: 'INTERNSHIP_EVALUATION', label: PROCESS_NODE_TYPE_LABEL.INTERNSHIP_EVALUATION },
]

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

/** 间接评价问卷状态 - 对应后端 form.status */
export type IndirectFormStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED'

export const INDIRECT_FORM_STATUS_LABEL: Record<IndirectFormStatus, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  CLOSED: '已关闭',
  ARCHIVED: '已归档',
}

/** 间接评价问卷访问模式 - 对应后端 accessMode */
export type IndirectFormAccessMode = 'PUBLIC_LINK' | 'AUTHENTICATED' | 'BOTH'

export const INDIRECT_FORM_ACCESS_MODE_LABEL: Record<IndirectFormAccessMode, string> = {
  PUBLIC_LINK: '公开链接',
  AUTHENTICATED: '登录用户',
  BOTH: '公开链接或登录',
}
