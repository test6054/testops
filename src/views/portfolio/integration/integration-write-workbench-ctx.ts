import type { ColumnsType } from 'ant-design-vue/es/table'
import type { ComputedRef, InjectionKey, Reactive, Ref } from 'vue'
import type {
  PortfolioConflictTicketVO,
  PortfolioIdentityUnmatchedVO,
  PortfolioIntegrationHealthDashboardVO,
  PortfolioIntegrationMessageInboxVO,
  PortfolioIntegrationPayloadFieldDto,
  PortfolioNationalReportIssueVO,
} from '@/apis/portfolio/integration'
import type { PortfolioConflictTicketStatusEnum } from '@/types/enums/portfolio-conflict-ticket-status-enum'
import type { PortfolioIdentityUnmatchedStatusEnum } from '@/types/enums/portfolio-identity-unmatched-status-enum'
import type { PortfolioNationalReportIssueStatusCode } from '@/types/enums/portfolio-national-report-issue-status-enum'

interface IntegrationWriteLoadState {
  unmatched: boolean
  conflicts: boolean
  nationalIssues: boolean
  failedMessages: boolean
  health: boolean
}

interface IntegrationWriteLoadError {
  unmatched: string
  conflicts: string
  nationalIssues: string
  failedMessages: string
  health: string
}

interface IntegrationWritePageQuery {
  pageNum: number
  pageSize: number
}

interface IntegrationWriteNationalIssueQuery extends IntegrationWritePageQuery {
  status?: PortfolioNationalReportIssueStatusCode
}

interface IntegrationWriteMessageEnqueueForm {
  datasourceConfigId: string
  messageKey: string
  teacherNumber: string
  teacherCode: string
  teacherName: string
  externalRecordKey: string
  fields: PortfolioIntegrationPayloadFieldDto[]
}

interface IntegrationWriteMessageEnvelope {
  teacherNumber: string
  teacherCode: string
  teacherName: string
  externalRecordKey: string
}

interface IntegrationWriteSelectOption {
  value: string
  label: string
}

export interface IntegrationWriteWorkbenchContext {
  activeTab: Ref<string>
  writing: ComputedRef<boolean>
  operationKey: Ref<string>
  loadState: Reactive<IntegrationWriteLoadState>
  loadError: Reactive<IntegrationWriteLoadError>
  unmatched: Ref<PortfolioIdentityUnmatchedVO[]>
  unmatchedQuery: Reactive<IntegrationWritePageQuery>
  unmatchedTotal: Ref<number>
  unmatchedColumns: ColumnsType
  conflicts: Ref<PortfolioConflictTicketVO[]>
  conflictQuery: Reactive<IntegrationWritePageQuery>
  conflictTotal: Ref<number>
  conflictColumns: ColumnsType
  nationalIssues: Ref<PortfolioNationalReportIssueVO[]>
  nationalIssueQuery: Reactive<IntegrationWriteNationalIssueQuery>
  nationalIssueTotal: Ref<number>
  nationalIssueColumns: ColumnsType
  failedMessages: Ref<PortfolioIntegrationMessageInboxVO[]>
  failedMessageQuery: Reactive<IntegrationWritePageQuery>
  failedMessageTotal: Ref<number>
  failedMessageColumns: ColumnsType
  failedMessageDatasourceId: Ref<string>
  failedMessageDrawerOpen: Ref<boolean>
  selectedFailedMessage: Ref<PortfolioIntegrationMessageInboxVO | null>
  payloadFieldEdits: Ref<PortfolioIntegrationPayloadFieldDto[]>
  requeueMessage: Ref<string>
  messageEnqueueForm: Reactive<IntegrationWriteMessageEnqueueForm>
  requeueEnvelope: Reactive<IntegrationWriteMessageEnvelope>
  health: Ref<PortfolioIntegrationHealthDashboardVO | null>
  datasourceOptions: ComputedRef<IntegrationWriteSelectOption[]>
  messageDatasourceOptions: ComputedRef<IntegrationWriteSelectOption[]>
  teacherOptions: ComputedRef<IntegrationWriteSelectOption[]>
  identityResolveRowId: Ref<string>
  identityResolveTeacherId: Ref<string>
  identityResolveTeacherNumber: Ref<string>
  onUnmatchedPageChange: (page: { current: number, pageSize: number }) => void
  onConflictPageChange: (page: { current: number, pageSize: number }) => void
  onNationalIssuePageChange: (page: { current: number, pageSize: number }) => void
  onFailedMessagePageChange: (page: { current: number, pageSize: number }) => void
  searchNationalIssues: () => void
  loadFailedMessages: () => Promise<void>
  changeFailedMessageDatasource: () => void
  fixNationalReportIssue: (row: PortfolioNationalReportIssueVO) => Promise<void>
  exportNationalReportForIssue: (row: PortfolioNationalReportIssueVO) => Promise<void>
  retransmitNationalReportIssues: () => Promise<void>
  openFailedMessageFix: (row: PortfolioIntegrationMessageInboxVO) => void
  requeueFailedMessage: (
    row: PortfolioIntegrationMessageInboxVO,
    corrected?: boolean,
  ) => Promise<void>
  enqueueInboundMessage: () => Promise<void>
  addRequeuePayloadField: () => void
  removeRequeuePayloadField: (index: number) => void
  addEnqueuePayloadField: () => void
  removeEnqueuePayloadField: (index: number) => void
  resolveIdentityUnmatched: (
    row: PortfolioIdentityUnmatchedVO,
    action: PortfolioIdentityUnmatchedStatusEnum,
  ) => Promise<void>
  resolveConflict: (
    row: PortfolioConflictTicketVO,
    action: PortfolioConflictTicketStatusEnum,
  ) => Promise<void>
  loadTeachers: (keyword?: string) => Promise<void>
  handleTeacherSearch: (value: string) => void
  needsTeacherNumber: (row: PortfolioIdentityUnmatchedVO) => boolean
}

/** IntegrationWriteWorkbench 向次要面板提供的运行时上下文 */
export const INTEGRATION_WRITE_WORKBENCH_CTX: InjectionKey<IntegrationWriteWorkbenchContext>
  = Symbol('INTEGRATION_WRITE_WORKBENCH_CTX')
