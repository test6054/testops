import type { PageResult } from '@/types'
import http from '@/config/axios'

export interface PortfolioNationalTeacherInboundRecord {
  teacherNumber: string
  teacherName?: string
  title?: string
  employmentStatus?: string
}

/** 对齐后端 PortfolioIntegrationExcelImportContextDto */
export interface PortfolioIntegrationExcelImportContextDto {
  fileName?: string
  defaultRecordType?: string
  defaultCategoryCode?: string
  defaultLevelCode?: string
  commit?: boolean
  confirmManualConflicts?: boolean
  expectedConfigUpdateToken?: string
  nodeId?: string
  confirmationStatus?: string
}

/** 对齐后端 PortfolioIntegrationConnectionConfigDto */
export interface PortfolioIntegrationConnectionConfigDto {
  jdbcUrl?: string
  username?: string
  password?: string
  querySql?: string
  incremental?: boolean
  initialWatermark?: string
  endpointUrl?: string
  soapAction?: string
  requestEnvelope?: string
  recordElementLocalName?: string
  readTimeoutSeconds?: number
  excelImportSceneKey?: string
  sourceFileNodeId?: string
  importContext?: PortfolioIntegrationExcelImportContextDto
  batchSize?: number
  syncDirection?: string
  inboundRecords?: PortfolioNationalTeacherInboundRecord[]
}

export interface PortfolioIntegrationDatasourceVO {
  id: string
  channelCode: string
  pathwayCode: string
  datasourceName: string
  enabled: boolean
  sourcePriority: number
  connectionConfig?: PortfolioIntegrationConnectionConfigDto
  /** JDBC 通路是否已配置密码 */
  passwordConfigured?: boolean
  lastSyncTime?: string
}

export const PORTFOLIO_INTEGRATION_PASSWORD_MASK = '********'

export const PORTFOLIO_EXCEL_IMPORT_SCENE_OPTIONS = [
  { value: 'PORTFOLIO_SCIENTIFIC_RESEARCH_FACT', label: '科研权威事实导入' },
  { value: 'PORTFOLIO_DEVELOPMENT_RECORD', label: '发展记录导入' },
  { value: 'PORTFOLIO_DEVELOPMENT_PLAN_HISTORY', label: '发展计划历史导入' },
  { value: 'PORTFOLIO_DUAL_TEACHER', label: '双师认定导入' },
  { value: 'PORTFOLIO_EXTERNAL_TEACHER', label: '外聘教师导入' },
  { value: 'PORTFOLIO_INDICATOR_DEFINITION', label: '指标定义导入' },
] as const

export interface PortfolioIntegrationFieldMappingVO {
  id: string
  datasourceConfigId: string
  sourceFieldCode: string
  targetFieldCode: string
  targetCategoryCode?: string
  dictionaryCode?: string
  transformType?: string
  transformExpr?: string
  enabled: boolean
}

export interface PortfolioIntegrationSyncTaskVO {
  id: string
  datasourceConfigId: string
  channelCode: string
  pathwayCode: string
  taskStatus: string
  triggerType: string
  successCount: number
  failedCount: number
  skippedCount: number
  errorSummary?: string
  startedTime?: string
  finishedTime?: string
}

export interface PortfolioIntegrationHealthChannelVO {
  channelCode: string
  pathwayCode: string
  healthStatus: string
  lastSuccessTime?: string
  lastFailureTime?: string
  slaBreach: boolean
  maturityScore?: string
  sampleSize72h: number
  failureCount72h: number
}

export interface PortfolioIntegrationHealthDashboardVO {
  computedTime: string
  channels: PortfolioIntegrationHealthChannelVO[]
}

export interface PortfolioIntegrationChannelPathwayOption {
  pathwayCode: string
  pathwayLabel: string
  configurable?: boolean
  executable?: boolean
}

export interface PortfolioIntegrationChannelPathwayMatrixChannelRow {
  channelCode: string
  channelLabel: string
  teacherCvChannel?: boolean
  pathways?: PortfolioIntegrationChannelPathwayOption[]
}

export interface PortfolioIntegrationChannelPathwayMatrixVO {
  channels?: PortfolioIntegrationChannelPathwayMatrixChannelRow[]
}

export interface PortfolioIdentityUnmatchedVO {
  id: string
  syncTaskId?: string
  channelCode: string
  externalTeacherCode?: string
  externalName?: string
  matchHints?: string[]
  status: string
  resolvedTeacherId?: string
  resolveRemark?: string
}

export interface PortfolioConflictTicketVO {
  id: string
  syncTaskId?: string
  channelCode: string
  fieldCode: string
  teacherId: string
  externalValue?: string
  localValue?: string
  externalSourcePriority: number
  localSourcePriority: number
  ticketStatus: string
  resolveRemark?: string
}

export interface PortfolioIntegrationPayloadFieldDto {
  fieldCode: string
  fieldValue: string
}

export interface PortfolioIntegrationMessageInboxVO {
  id: string
  datasourceConfigId: string
  channelCode: string
  messageKey: string
  payloadFields: PortfolioIntegrationPayloadFieldDto[]
  processStatus: string
  processMessage?: string
  retryCount: number
  processedTime?: string
  createTime?: string
}

export interface PortfolioIntegrationCleanLogVO {
  id: string
  syncTaskId: string
  datasourceConfigId: string
  channelCode: string
  sourceFieldCode: string
  targetFieldCode: string
  rawValue?: string
  cleanedValue?: string
  transformType?: string
  cleanAction?: string
  detailMessage?: string
  createTime?: string
}

export interface PortfolioCourseCodeMapVO {
  id: string
  sourceSystemCode: string
  sourceCourseCode: string
  sourceCourseName?: string
  canonicalCourseCode: string
  canonicalCourseName: string
  enabled: boolean
  remark?: string
  updateTime?: string
}

export interface PortfolioIntegrationDictEntryVO {
  id: string
  dictionaryCode: string
  sourceValue: string
  targetValue: string
  enabled: boolean
  remark?: string
  updateTime?: string
}

export interface PortfolioNationalReportIssueVO {
  id: string
  syncTaskId?: string
  teacherUserId: string
  teacherNumber?: string
  teacherName?: string
  issueCodes?: string
  issueDetails?: string[]
  status: string
  statusLabel?: string
  fixedTime?: string
  fixRemark?: string
  createTime?: string
  /** 生命周期状态编码 ACTIVE/SEALED/TEMP_HOLD 等 */
  lifecycleStatus?: string
  /** 生命周期状态中文标签 */
  lifecycleStatusLabel?: string
  /** 是否禁止档案写 */
  archiveWriteForbidden?: boolean
  /** 评价参评 hold（TEMP_HOLD/SEALED 等；与档案写禁分离） */
  evaluationHeld?: boolean
  /** 是否计入当前在岗结构 */
  countsInCurrentFacultyStructure?: boolean

}

export interface PortfolioNationalReportBatchVO {
  id: string
  syncTaskId: string
  successCount: number
  failedCount: number
  packageJson?: string
  reportStatus?: string
  artifactFileNodeId?: string
  artifactFileName?: string
  exportedTime?: string
  maskMode?: number
  parentSyncTaskId?: string
  createTime?: string
}

export interface PortfolioArchiveBagExportResultVO {
  fileNodeId: string
  fileName: string
  rowCount?: number
}

const BASE = '/api/portfolio/integration'

export const portfolioIntegrationApi = {
  saveDatasource(data: {
    id?: string
    channelCode: string
    pathwayCode: string
    datasourceName: string
    enabled: boolean
    connectionConfig?: PortfolioIntegrationConnectionConfigDto
  }) {
    return http.post<number>(`${BASE}/datasource/save`, data)
  },
  pageDatasource(data: {
    pageNum: number
    pageSize: number
    channelCode?: string
    pathwayCode?: string
    enabled?: boolean
  }) {
    return http.post<PageResult<PortfolioIntegrationDatasourceVO>>(`${BASE}/datasource/page`, data)
  },
  saveFieldMapping(data: {
    id?: string
    datasourceConfigId: string
    sourceFieldCode: string
    targetFieldCode: string
    targetCategoryCode?: string
    dictionaryCode?: string
    transformType?: string
    transformExpr?: string
    enabled: boolean
  }) {
    return http.post<number>(`${BASE}/mapping/save`, data)
  },
  listFieldMappings(data: { datasourceConfigId: string }) {
    return http.post<PortfolioIntegrationFieldMappingVO[]>(`${BASE}/mapping/list`, data)
  },
  triggerSync(data: { datasourceConfigId: string }) {
    return http.post<PortfolioIntegrationSyncTaskVO>(`${BASE}/sync/trigger`, data)
  },
  pageSyncLog(data: {
    pageNum: number
    pageSize: number
    channelCode?: string
    taskStatus?: string
  }) {
    return http.post<PageResult<PortfolioIntegrationSyncTaskVO>>(`${BASE}/sync/log/page`, data)
  },
  pageIdentityUnmatched(data: { pageNum: number, pageSize: number, status?: string }) {
    return http.post<PageResult<PortfolioIdentityUnmatchedVO>>(
      `${BASE}/identity/unmatched/page`,
      data,
    )
  },
  pageConflict(data: { pageNum: number, pageSize: number, ticketStatus?: string }) {
    return http.post<PageResult<PortfolioConflictTicketVO>>(`${BASE}/conflict/page`, data)
  },
  resolveConflict(data: { conflictTicketId: string, action: string, resolveRemark?: string }) {
    return http.post<void>(`${BASE}/conflict/resolve`, data)
  },
  resolveIdentityUnmatched(data: {
    identityUnmatchedId: string
    action: string
    resolvedTeacherId?: string
    resolvedTeacherNumber?: string
    resolveRemark?: string
  }) {
    return http.post<void>(`${BASE}/identity/unmatched/resolve`, data)
  },
  enqueueMessage(data: {
    datasourceConfigId: string
    messageKey: string
    payloadFields: PortfolioIntegrationPayloadFieldDto[]
  }) {
    return http.post<string>(`${BASE}/message/enqueue`, data)
  },
  pageFailedMessages(data: { pageNum: number, pageSize: number, datasourceConfigId: string }) {
    return http.post<PageResult<PortfolioIntegrationMessageInboxVO>>(
      `${BASE}/message/failed/page`,
      data,
    )
  },
  requeueFailedMessage(data: {
    messageInboxId: string
    processMessage?: string
    fieldCorrections?: PortfolioIntegrationPayloadFieldDto[]
    triggerSync?: boolean
  }) {
    return http.post<void>(`${BASE}/message/requeue`, data)
  },
  pageCleanLog(data: { pageNum: number, pageSize: number, datasourceConfigId?: string }) {
    return http.post<PageResult<PortfolioIntegrationCleanLogVO>>(`${BASE}/clean-log/page`, data)
  },
  pageCourseCodeMap(data: {
    pageNum: number
    pageSize: number
    sourceSystemCode?: string
    keyword?: string
  }) {
    return http.post<PageResult<PortfolioCourseCodeMapVO>>(`${BASE}/course-code-map/page`, data)
  },
  saveCourseCodeMap(data: {
    id?: string
    sourceSystemCode: string
    sourceCourseCode: string
    sourceCourseName?: string
    canonicalCourseCode: string
    canonicalCourseName: string
    enabled: boolean
    remark?: string
  }) {
    return http.post<string>(`${BASE}/course-code-map/save`, data)
  },
  deleteCourseCodeMap(id: string) {
    return http.post<void>(`${BASE}/course-code-map/delete`, { id })
  },
  pageDictEntry(data: { pageNum: number, pageSize: number, dictionaryCode?: string }) {
    return http.post<PageResult<PortfolioIntegrationDictEntryVO>>(`${BASE}/dict-entry/page`, data)
  },
  saveDictEntry(data: {
    id?: string
    dictionaryCode: string
    sourceValue: string
    targetValue: string
    enabled: boolean
    remark?: string
  }) {
    return http.post<string>(`${BASE}/dict-entry/save`, data)
  },
  deleteDictEntry(id: string) {
    return http.post<void>(`${BASE}/dict-entry/delete`, { id })
  },

  pageNationalReportIssues(data: {
    pageNum: number
    pageSize: number
    status?: string
    teacherUserId?: string
  }) {
    return http.post<PageResult<PortfolioNationalReportIssueVO>>(
      `${BASE}/national-report/issue/page`,
      data,
    )
  },
  fixNationalReportIssue(data: { issueId: string, fixRemark?: string }) {
    return http.post<void>(`${BASE}/national-report/issue/fix`, data)
  },
  getNationalReportBatch(id: string) {
    return http.post<PortfolioNationalReportBatchVO>(`${BASE}/national-report/batch/get`, { id })
  },
  exportNationalReportPackage(data: { syncTaskId: string, maskMode?: boolean }) {
    return http.post<PortfolioArchiveBagExportResultVO>(
      `${BASE}/national-report/package/export`,
      data,
    )
  },
  retransmitNationalReportIssues(data: { datasourceConfigId: string, sourceSyncTaskId?: string }) {
    return http.post<PortfolioNationalReportBatchVO>(
      `${BASE}/national-report/issue/retransmit`,
      data,
    )
  },
  healthDashboard() {
    return http.post<PortfolioIntegrationHealthDashboardVO>(`${BASE}/health/dashboard`, {})
  },
  channelPathwayMatrix() {
    return http.post<PortfolioIntegrationChannelPathwayMatrixVO>(
      `${BASE}/channel-pathway-matrix`,
      {},
    )
  },
}
